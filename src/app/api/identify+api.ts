/**
 * Garment identification endpoint: `POST /api/identify` with
 * `{ imageBase64: string }` → the structured garment record
 * (see `identifyRequestSchema` / `identifyResultSchema`) that pre-fills the
 * camera confirm panel and the four AI tag pills (APP-29 / APP-19).
 *
 * - mock mode (`EXPO_PUBLIC_AI_MOCK=1`) returns the design-handoff
 *   "Linen camp shirt" fixture, so no live key is needed;
 * - otherwise it calls the vision model (`claude-haiku-4-5-20251001`) with the
 *   photo as a base64 image block and forced tool-use on a single
 *   `identify_garment` tool whose input schema mirrors the response.
 *
 * Enum drift is impossible: every tool output is validated with zod before it
 * is returned. On validation failure the route retries exactly once, feeding
 * the validation error back to the model as an `is_error` tool result; if the
 * retry also fails it returns a 502 error envelope. No success path bypasses
 * `safeParse`.
 */

import type Anthropic from '@anthropic-ai/sdk';

import { identifyRequestSchema, identifyResultSchema } from '@/services/ai/schemas';
import { anthropic, hasApiKey, isMockMode, MODELS } from '@/services/ai/server/anthropic';
import { MOCK_IDENTIFY_RESULT } from '@/services/ai/server/fixtures';
import { errorResponse, parseJsonBody } from '@/services/ai/server/route-utils';

const IDENTIFY_SYSTEM_PROMPT =
  'You identify garments from photos for the Wardrobe app. Name each garment in a ' +
  'boutique-editorial style — specific material and silhouette, like "Linen camp shirt", ' +
  'never a bare word like "shirt". Category must be exactly one of Tops, Bottoms, ' +
  'Outerwear, Shoes, Accessories. Season must be exactly one of all, spring, summer, ' +
  'fall, winter. Report 1-3 dominant hex colors as swatches and your confidence from 0 to 1.';

/**
 * Tool whose input schema mirrors `identifyResultSchema`. The enums are
 * repeated here for the model's benefit; the zod `safeParse` below remains the
 * enforcement boundary.
 */
const IDENTIFY_TOOL: Anthropic.Tool = {
  name: 'identify_garment',
  description:
    'Report the structured identification of the garment in the photo. ' +
    'Call this exactly once with your best identification.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Boutique-editorial garment name, e.g. "Linen camp shirt"',
      },
      category: {
        type: 'string',
        enum: ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'],
      },
      season: {
        type: 'string',
        enum: ['all', 'spring', 'summer', 'fall', 'winter'],
      },
      mood: { type: 'string', description: 'Mood tag, e.g. "Casual"' },
      paletteLabel: { type: 'string', description: 'Palette label, e.g. "Warm neutral"' },
      swatches: {
        type: 'array',
        items: { type: 'string', description: 'Hex color like #D8C3A5' },
        minItems: 1,
        maxItems: 3,
        description: '1-3 dominant hex colors of the garment',
      },
      confidence: { type: 'number', description: 'Confidence between 0 and 1' },
    },
    required: ['name', 'category', 'season', 'mood', 'paletteLabel', 'swatches', 'confidence'],
  },
};

/** Extracts the `identify_garment` tool call's input from a completion, if any. */
function findToolUse(completion: Anthropic.Message): Anthropic.ToolUseBlock | undefined {
  return completion.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === 'identify_garment',
  );
}

export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, identifyRequestSchema);
  if (!body.ok) return body.response;

  if (isMockMode()) {
    return Response.json(MOCK_IDENTIFY_RESULT);
  }

  if (!hasApiKey()) {
    return errorResponse(
      500,
      'not-configured',
      'ANTHROPIC_API_KEY is not set on the server. Set it in .env or enable EXPO_PUBLIC_AI_MOCK=1.',
    );
  }

  try {
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: body.data.imageBase64 },
          },
          { type: 'text', text: 'Identify the garment in this photo.' },
        ],
      },
    ];

    const requestParams = {
      model: MODELS.vision,
      max_tokens: 1024,
      system: IDENTIFY_SYSTEM_PROMPT,
      tools: [IDENTIFY_TOOL],
      tool_choice: { type: 'tool' as const, name: 'identify_garment' },
    };

    const completion = await anthropic().messages.create({ ...requestParams, messages });
    const toolUse = findToolUse(completion);
    if (!toolUse) {
      return errorResponse(502, 'upstream-error', 'Claude returned no identify_garment call.');
    }

    const parsed = identifyResultSchema.safeParse(toolUse.input);
    if (parsed.success) {
      return Response.json(parsed.data);
    }

    // Retry exactly once, feeding the validation error back to the model.
    const validationDetail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      .join('; ');

    const retryCompletion = await anthropic().messages.create({
      ...requestParams,
      messages: [
        ...messages,
        { role: 'assistant', content: completion.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              is_error: true,
              content:
                `Your identification failed validation: ${validationDetail}. ` +
                'Call identify_garment again with corrected values.',
            },
          ],
        },
      ],
    });

    const retryToolUse = findToolUse(retryCompletion);
    const retryParsed = retryToolUse
      ? identifyResultSchema.safeParse(retryToolUse.input)
      : undefined;
    if (retryParsed?.success) {
      return Response.json(retryParsed.data);
    }

    return errorResponse(
      502,
      'upstream-error',
      'Claude returned an invalid garment identification after one retry.',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Claude API error.';
    return errorResponse(502, 'upstream-error', message);
  }
}
