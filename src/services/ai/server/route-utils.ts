/**
 * Shared utilities for Expo Router API routes (`src/app/api/*+api.ts`).
 *
 * Provides JSON body parsing, zod request validation, and the project-wide
 * error envelope `{ error: { code, message } }`. Server-only: routes import
 * this module; client code never should.
 */

import { z } from 'zod';

/** Error codes used in the `{ error: { code, message } }` envelope. */
export type RouteErrorCode = 'invalid-request' | 'not-configured' | 'upstream-error';

/** Builds the standard error envelope response: `{ error: { code, message } }`. */
export function errorResponse(status: number, code: RouteErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Parses the request body as JSON and validates it against `schema`.
 * On failure returns a ready-to-send 400 error-envelope response, so routes
 * can early-return without re-stating error shapes:
 *
 * ```ts
 * const body = await parseJsonBody(request, chatRequestSchema);
 * if (!body.ok) return body.response;
 * ```
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParsedBody<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-request', 'Request body must be valid JSON.'),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    return {
      ok: false,
      response: errorResponse(400, 'invalid-request', detail),
    };
  }

  return { ok: true, data: parsed.data };
}
