/** Health check: `GET /api/health` → 200 `{"ok":true}`. */
export function GET(): Response {
  return Response.json({ ok: true });
}
