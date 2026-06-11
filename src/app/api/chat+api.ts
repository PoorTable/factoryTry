/**
 * Coach chat endpoint: `POST /api/chat` with `{ message: string }` →
 * `{ reply: string }` (see `chatRequestSchema` / `chatReplySchema`).
 *
 * The sample Claude round-trip for the AI service layer (APP-28):
 * - mock mode (`EXPO_PUBLIC_AI_MOCK=1`) returns the design-handoff
 *   "Quiet luxury" outfit fixture, so no live key is needed;
 * - otherwise it calls `claude-fable-5` via the server-side Anthropic
 *   singleton. The API key never leaves this server context.
 */

import { chatRequestSchema, type ChatReply } from '@/services/ai/schemas';
import { anthropic, hasApiKey, isMockMode, MODELS } from '@/services/ai/server/anthropic';
import { MOCK_OUTFIT_REPLY } from '@/services/ai/server/fixtures';
import { errorResponse, parseJsonBody } from '@/services/ai/server/route-utils';

const STYLIST_SYSTEM_PROMPT =
  'You are Iris, the AI stylist inside the Wardrobe app. Answer in 2-3 warm, concrete ' +
  'sentences, grounding outfit advice in the user’s own garments and palette when possible.';

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, chatRequestSchema);
  if (!body.ok) return body.response;

  if (isMockMode()) {
    return Response.json(MOCK_OUTFIT_REPLY);
  }

  if (!hasApiKey()) {
    return errorResponse(
      500,
      'not-configured',
      'ANTHROPIC_API_KEY is not set on the server. Set it in .env or enable EXPO_PUBLIC_AI_MOCK=1.',
    );
  }

  try {
    const completion = await anthropic().messages.create({
      model: MODELS.chat,
      max_tokens: 1024,
      system: STYLIST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: body.data.message }],
    });

    const reply = completion.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!reply) {
      return errorResponse(502, 'upstream-error', 'Claude returned an empty reply.');
    }

    const payload: ChatReply = { reply };
    return Response.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Claude API error.';
    return errorResponse(502, 'upstream-error', message);
  }
}
