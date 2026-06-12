/**
 * Iris coach endpoint: `POST /api/coach` with
 * `{ messages: CoachTurn[], wardrobe: { items, outfits, profile } }` →
 * `{ messages: CoachReply[] }` — one or more structured replies matching the
 * three chat bubble kinds (text / outfit / palette, see `coachReplySchema`).
 *
 * - mock mode (`EXPO_PUBLIC_AI_MOCK=1`) returns the design-handoff
 *   "Quiet luxury" conversation fixture, so no live key is needed;
 * - otherwise it calls `claude-fable-5` with forced tool-use on three tools
 *   (`reply_text`, `propose_outfit`, `show_palette`) so every answer arrives
 *   as structured data, never free prose.
 *
 * Grounding: `propose_outfit` may only reference item IDs present in the
 * request's wardrobe payload. Unknown IDs trigger exactly one retry that
 * feeds the invalid IDs (and the valid ID list) back to the model; whatever
 * survives is filtered against the known-ID set before responding, so a
 * hallucinated ID is never returned to the client.
 *
 * Context discipline: the wardrobe is serialized compactly (id, name,
 * category, swatches, wornCount — never photoUri or notes) into a `system`
 * block carrying `cache_control: { type: 'ephemeral' }`, and conversation
 * history is windowed to the last `MAX_CONTEXT_MESSAGES` (20) turns.
 */

import type Anthropic from '@anthropic-ai/sdk';

import {
  coachReplySchema,
  coachRequestSchema,
  type CoachReply,
  type CoachRequest,
  type CoachResponse,
} from '@/services/ai/schemas';
import { anthropic, hasApiKey, isMockMode, MODELS } from '@/services/ai/server/anthropic';
import { MOCK_COACH_CONVERSATION } from '@/services/ai/server/fixtures';
import { errorResponse, parseJsonBody } from '@/services/ai/server/route-utils';

/** Conversation window — only the most recent turns are sent to Claude. */
const MAX_CONTEXT_MESSAGES = 20;

const IRIS_PERSONA =
  'You are Iris, the AI style coach inside the Wardrobe app. Voice: warm, editorial, ' +
  'concise — quiet luxury, never gushing. You know every piece in the user’s wardrobe ' +
  'and you NEVER invent items: outfit proposals must only use item ids from the wardrobe ' +
  'context below. Answer through the provided tools only. Use reply_text for advice and ' +
  'conversation, propose_outfit when suggesting a complete look (2-4 real item ids, a short ' +
  'evocative name, a vibe score 0-100), and show_palette when discussing colors. You may ' +
  'call several tools in one reply (e.g. a short text plus an outfit).';

/**
 * Tools mirroring the three `coachReplySchema` variants. The zod `safeParse`
 * below remains the enforcement boundary; these schemas are for the model.
 */
const COACH_TOOLS: Anthropic.Tool[] = [
  {
    name: 'reply_text',
    description: 'Send a short conversational text reply to the user.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '2-3 warm, concrete sentences.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'propose_outfit',
    description:
      'Propose one complete outfit built ONLY from item ids that exist in the wardrobe ' +
      'context. Never invent ids.',
    input_schema: {
      type: 'object',
      properties: {
        itemIds: {
          type: 'array',
          items: { type: 'string', description: 'An existing wardrobe item id, e.g. "i2"' },
          minItems: 1,
          description: 'Ids of the wardrobe items composing the look.',
        },
        name: { type: 'string', description: 'Short evocative look name, e.g. "Quiet luxury"' },
        vibe: { type: 'number', description: 'Vibe score from 0 to 100.' },
        note: { type: 'string', description: 'Optional one-sentence styling note.' },
      },
      required: ['itemIds', 'name', 'vibe'],
    },
  },
  {
    name: 'show_palette',
    description: 'Show a small set of color swatches when discussing palette or color pairing.',
    input_schema: {
      type: 'object',
      properties: {
        swatches: {
          type: 'array',
          items: { type: 'string', description: 'Hex color like #A35836' },
          minItems: 1,
          description: 'Hex colors to display as swatches.',
        },
        note: { type: 'string', description: 'Optional one-sentence caption.' },
      },
      required: ['swatches'],
    },
  },
];

/**
 * Compact wardrobe serialization for the system block. Items arrive as
 * `ItemSummary` (id, name, category, swatches, wornCount) — photoUri and
 * notes never reach the wire, keeping the cacheable prompt small.
 */
function serializeWardrobe(wardrobe: CoachRequest['wardrobe']): string {
  const items = wardrobe.items
    .map(
      (item) =>
        `${item.id} | ${item.name} | ${item.category} | ${item.swatches.join(',')} | worn ${item.wornCount}x`,
    )
    .join('\n');
  const outfits = wardrobe.outfits
    .map((outfit) => `${outfit.id} | ${outfit.name} | vibe ${outfit.vibe} | ${outfit.itemIds.join(',')}`)
    .join('\n');
  const palette = wardrobe.profile.palette
    .map((segment) => `${segment.name} ${segment.hex} ${segment.pct}%`)
    .join(', ');

  return (
    `WARDROBE (${wardrobe.items.length} pieces) — id | name | category | swatches | worn:\n${items}\n\n` +
    `SAVED OUTFITS — id | name | vibe | itemIds:\n${outfits}\n\n` +
    `STYLE PROFILE: ${wardrobe.profile.paletteName} — ${wardrobe.profile.tagline}. Palette: ${palette}`
  );
}

/**
 * Windows the history to the last `MAX_CONTEXT_MESSAGES` turns and merges
 * consecutive same-role turns so the Messages API receives alternating roles
 * starting with `user`.
 */
function toAnthropicMessages(turns: CoachRequest['messages']): Anthropic.MessageParam[] {
  const windowed = turns.slice(-MAX_CONTEXT_MESSAGES);
  const firstUserIndex = windowed.findIndex((turn) => turn.from === 'user');
  if (firstUserIndex === -1) return [];

  const messages: Anthropic.MessageParam[] = [];
  for (const turn of windowed.slice(firstUserIndex)) {
    const role = turn.from === 'user' ? 'user' : 'assistant';
    const previous = messages[messages.length - 1];
    if (previous && previous.role === role) {
      previous.content = `${previous.content as string}\n${turn.text}`;
    } else {
      messages.push({ role, content: turn.text });
    }
  }
  return messages;
}

/** Maps a tool_use block to a zod-validated coach reply, or undefined. */
function toCoachReply(block: Anthropic.ToolUseBlock): CoachReply | undefined {
  const kindByTool: Record<string, CoachReply['kind']> = {
    reply_text: 'text',
    propose_outfit: 'outfit',
    show_palette: 'palette',
  };
  const kind = kindByTool[block.name];
  if (!kind) return undefined;

  const input = typeof block.input === 'object' && block.input !== null ? block.input : {};
  const parsed = coachReplySchema.safeParse({ ...input, kind });
  return parsed.success ? parsed.data : undefined;
}

/** Extracts all tool_use blocks from a completion, in order. */
function toolUseBlocks(completion: Anthropic.Message): Anthropic.ToolUseBlock[] {
  return completion.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
}

/** Unknown item IDs referenced by an outfit reply, given the known-ID set. */
function unknownIds(reply: CoachReply, knownIds: Set<string>): string[] {
  if (reply.kind !== 'outfit') return [];
  return reply.itemIds.filter((id) => !knownIds.has(id));
}

/**
 * Final grounding filter: strips unknown IDs from outfit replies and drops
 * outfits left with no valid items. Every `itemIds` value in the response is
 * guaranteed to exist in the request's wardrobe payload.
 */
function filterToKnownIds(replies: CoachReply[], knownIds: Set<string>): CoachReply[] {
  return replies.flatMap((reply): CoachReply[] => {
    if (reply.kind !== 'outfit') return [reply];
    const itemIds = reply.itemIds.filter((id) => knownIds.has(id));
    return itemIds.length > 0 ? [{ ...reply, itemIds }] : [];
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, coachRequestSchema);
  if (!body.ok) return body.response;

  if (isMockMode()) {
    return Response.json(MOCK_COACH_CONVERSATION satisfies CoachResponse);
  }

  if (!hasApiKey()) {
    return errorResponse(
      500,
      'not-configured',
      'ANTHROPIC_API_KEY is not set on the server. Set it in .env or enable EXPO_PUBLIC_AI_MOCK=1.',
    );
  }

  const knownIds = new Set(body.data.wardrobe.items.map((item) => item.id));
  const messages = toAnthropicMessages(body.data.messages);
  if (messages.length === 0) {
    return errorResponse(400, 'invalid-request', 'messages must contain at least one user turn.');
  }

  const requestParams = {
    model: MODELS.chat,
    max_tokens: 1024,
    // Persona + wardrobe context as a cacheable system block: stable across
    // a conversation, so Anthropic prompt caching skips re-reading it.
    system: [
      {
        type: 'text' as const,
        text: `${IRIS_PERSONA}\n\n${serializeWardrobe(body.data.wardrobe)}`,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    tools: COACH_TOOLS,
    tool_choice: { type: 'any' as const },
  };

  try {
    const completion = await anthropic().messages.create({ ...requestParams, messages });
    const blocks = toolUseBlocks(completion);
    if (blocks.length === 0) {
      return errorResponse(502, 'upstream-error', 'Claude returned no tool call.');
    }

    const replyByBlock = blocks.map((block) => toCoachReply(block));
    let replies = replyByBlock.filter((reply): reply is CoachReply => reply !== undefined);
    const invalidByBlock = replyByBlock.map((reply) =>
      reply ? unknownIds(reply, knownIds) : [],
    );

    if (invalidByBlock.some((ids) => ids.length > 0)) {
      // Retry exactly once: answer every tool_use block, flagging the
      // hallucinated IDs and restating the valid ID list.
      const validIdList = [...knownIds].join(', ');
      const retryCompletion = await anthropic().messages.create({
        ...requestParams,
        messages: [
          ...messages,
          { role: 'assistant', content: completion.content },
          {
            role: 'user',
            content: blocks.map((block, index) => {
              const invalid = invalidByBlock[index];
              return invalid.length > 0
                ? {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    is_error: true,
                    content:
                      `These item ids do not exist in the wardrobe: ${invalid.join(', ')}. ` +
                      `Valid item ids are: ${validIdList}. ` +
                      'Reply again with all tools, using only valid item ids.',
                  }
                : { type: 'tool_result' as const, tool_use_id: block.id, content: 'Accepted.' };
            }),
          },
        ],
      });

      const retryReplies = toolUseBlocks(retryCompletion)
        .map((block) => toCoachReply(block))
        .filter((reply): reply is CoachReply => reply !== undefined);
      if (retryReplies.length > 0) {
        replies = retryReplies;
      }
    }

    const grounded = filterToKnownIds(replies, knownIds);
    if (grounded.length === 0) {
      return errorResponse(502, 'upstream-error', 'Claude returned no valid coach reply.');
    }

    const payload: CoachResponse = { messages: grounded };
    return Response.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Claude API error.';
    return errorResponse(502, 'upstream-error', message);
  }
}
