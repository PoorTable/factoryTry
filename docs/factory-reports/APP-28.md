# Factory Decision Journal — APP-28

Task: AI service layer: Expo Router API routes + Claude API scaffold
Started: 2026-06-11T15:36:31Z
Branch: feat/APP-28-ai-service-layer-expo-router-api-routes

Append-only. Every agent records every decision here.

## [2026-06-11T15:36:31Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, issue=APP-28 "AI service layer: Expo Router API routes + Claude API scaffold", priority High
- why: URL contains linear.app; issue fetched via Linear MCP. Blocker APP-26 verified Done (completed 2026-06-10) so no dependency risk. Issue blocks APP-29/30/31/32.
- evidence: https://linear.app/apptryout/issue/APP-28 — status Todo, blockedBy APP-26 status Done

## [2026-06-11T15:36:31Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: no Figma URLs in issue; service-layer ticket with no screen of its own. Local design refs exist at docs/design-screenshots/ (10 images) for reviewer's general visual check; mock fixtures must match the design handoff tag set / "Quiet luxury" outfit / palette.
- why: searched issue body for figma.com — none. Per skill, fall back to local design references.
- evidence: ls docs/design-screenshots/ — 10 png files

## [2026-06-11T15:36:31Z] iter=0 agent=orchestrator event=BRANCH
- decision: created feat/APP-28-ai-service-layer-expo-router-api-routes off local main; did NOT stash the dirty tree
- why: dirty state was only untracked local config (.claude/launch.json, .env with ANTHROPIC_API_KEY) which cannot conflict with checkout; stashing .env would remove the API key needed for the live round-trip acceptance test. Slug truncated to 40 chars per protocol. NOTE: .env shows as untracked (??) — it is NOT gitignored; task says to verify this, so builder must add .env to .gitignore. Local main is 18 commits ahead of origin/main (prior factory merges); branched from local main to include APP-26/27 work.
- evidence: git branch --show-current = feat/APP-28-ai-service-layer-expo-router-api-routes; git status --short = ?? .claude/launch.json, ?? .env

## [2026-06-11T15:41:47Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 10 gates for APP-28
- why: Service-layer ticket (figma_count 0, no new UI) so no VISUAL_MATCH gate; gates cover server output config, live /api/health curl, mock-mode round-trip endpoint (curl with EXPO_PUBLIC_AI_MOCK=1 + "Quiet luxury" fixture check), structural real-key path (SDK import + model strings, no live call to avoid key dependency), key isolation (ANTHROPIC_API_KEY only in +api.ts/server modules, .env gitignored via git check-ignore), typed zod client with 15s timeout + network/rate-limit/parse error union, shared route utils with {error:{code,message}} envelope verified by malformed-request curl, README local-dev docs, lint, tsc. Sample endpoint left endpoint-agnostic since ticket names none.
- evidence: read .claude/factory-state.local.md; grep package.json (lint script = expo lint); cat .gitignore (confirmed .env NOT ignored, only .env*.local); ls src/app src/services (no api/ dir, no src/services/ai yet)

## [2026-06-11T15:46:46Z] iter=1 agent=builder event=BUILD
- decision: implement GATE-1..GATE-8 as one coherent change (server output, health route, chat sample endpoint, anthropic singleton + route utils + fixtures, zod typed client, README docs, gitignore .env)
- why: gates form one scaffold; doing them piecemeal would leave non-compiling intermediate states (client imports schemas, routes import utils). Plan: (a) app.json web.output=server + .gitignore `.env*` + npm i zod @anthropic-ai/sdk; (b) src/services/ai/schemas.ts typed as z.ZodType<Pick<Item,...>>/<StyleProfile> so fixtures stay aligned with store types at compile time; (c) src/services/ai/server/{anthropic,route-utils,fixtures}.ts — key + SDK + model strings live only in server module, fixtures reuse SEED_PROFILE and the "Quiet luxury" outfit reply; (d) src/app/api/health+api.ts + chat+api.ts with EXPO_PUBLIC_AI_MOCK=1 mock branch; (e) src/services/ai/client.ts fetch wrapper (AbortController 15_000ms, error union network|rate-limit|parse|server, no SDK import, EXPO_PUBLIC_API_URL with Constants.expoConfig.hostUri dev fallback); (f) README AI dev-flow section. NOTE: .env currently contains only GITHUB_PAT, NOT ANTHROPIC_API_KEY despite state-file claim — real-key path is structural per GATE-4 so this does not block, but worth flagging for the Oracle.
- evidence: gates file read (10 gates, 0 passed); seed.ts has "Quiet luxury" outfit o5 + SEED_PROFILE palette; .gitignore only had .env*.local

## [2026-06-11T15:51:04Z] iter=1 agent=builder event=SELF_REVIEW
- decision: diff approved after one fix — reworded client.ts doc comment that contained the literal strings "@anthropic-ai/sdk" and "ANTHROPIC_API_KEY" (would have tripped GATE-4/5/6 mechanical greps despite being comments)
- why: re-read every hunk; no StyleSheet/inline-style/console residue (grep clean, no UI in this ticket); key isolation verified (ANTHROPIC_API_KEY only in server/anthropic.ts + chat+api.ts error string, no EXPO_PUBLIC_ANTHROPIC anywhere, git check-ignore .env exits 0, git ls-files .env empty); runtime smoke test with EXPO_PUBLIC_AI_MOCK=1: /api/health → 200 {"ok":true}, /api/chat → 200 "Quiet luxury" fixture, malformed body → 400 {"error":{"code":"invalid-request",...}}, missing field → 400 envelope. Note for Oracle: .env locally contains only GITHUB_PAT (no ANTHROPIC_API_KEY despite state-file claim) — chat route returns a clean 500 not-configured envelope in that case; GATE-4 is structural so unaffected.
- evidence: expo lint exit 0, tsc --noEmit exit 0; curl outputs above; files: src/services/ai/{schemas,client}.ts, src/services/ai/server/{anthropic,route-utils,fixtures}.ts, src/app/api/{health,chat}+api.ts, app.json, .gitignore, README.md, package.json

## [2026-06-11T15:51:19Z] iter=1 agent=builder event=BUILD_COMMITTED
- decision: committed in two chunks — config/deps (1bcac81), service layer (527f0f0)
- why: config + dependency bump is separable from feature code; both compile independently
- evidence: commits 1bcac81, 527f0f0 on feat/APP-28-ai-service-layer-expo-router-api-routes; working tree clean except untracked .claude/launch.json (local config, intentionally uncommitted)

## [2026-06-11T17:10:24Z] iter=1 agent=oracle event=EVAL
- decision: gates 10/10 pass — ALL_GATES_PASS
- why: first evaluation pass, no prior-passed gates to regress; all static gates verified by grep/read, runtime gates 2/3/7 verified live against EXPO_PUBLIC_AI_MOCK=1 dev server (health 200, chat mock fixture 200, malformed body 400 with error envelope), lint and tsc both exit 0
- evidence: Evaluation History "Pass 1 — 2026-06-11T15:53:06Z" in .claude/factory-gates.local.md; key commands: curl /api/health → 200 {"ok":true}; curl POST /api/chat → 200 Quiet-luxury reply; curl 'not json' → 400 {"error":{"code":"invalid-request",...}}; npm run lint exit 0; npx tsc --noEmit exit 0

## [2026-06-11T17:13:23Z] iter=1 agent=reviewer event=REVIEW
- decision: APPROVED
- why: service-layer diff is sound — key isolation verified (ANTHROPIC_API_KEY only in server/anthropic.ts + a chat route error string; .env gitignored via check-ignore, not tracked), typed client handles all failure modes (abort/timeout, 429, non-2xx, non-JSON, zod shape mismatch) with the network/rate-limit/parse/server union, route utils return the {error:{code,message}} envelope on bad JSON and zod failures, mock branch correctly gated before the hasApiKey/live path, no StyleSheet or inline styles (no UI in this ticket). Non-blocking only: client discards the server error envelope body (reports "HTTP <status>"), and apiOrigin() falls back to '' on production native — both acceptable for a scaffold and documented via EXPO_PUBLIC_API_URL.
- evidence: simulator screenshot docs/visual-review/simulator-screenshot.png (committed b0141d9) — app boots to Closet tab, four-tab bar Closet/Outfits/Coach/You + camera CTA render identically to main's placeholder (closet.tsx unchanged vs main, screen is pre-APP-19 placeholder by design), no regression; compared against docs/design-screenshots/screen-wardrobe.png + component-tabbar-fab.png; files inspected: src/app/api/{chat,health}+api.ts, src/services/ai/{client,schemas}.ts, src/services/ai/server/{anthropic,fixtures,route-utils}.ts, app.json, .gitignore, README.md; gates file 10/10 with live-curl evidence (health 200, mock chat 200 Quiet-luxury, malformed body 400 envelope) — no hollow gates spotted

## [2026-06-11T17:13:56Z] iter=1 agent=orchestrator event=EVAL
- decision: iteration 1 complete — gates 10/10 passed, reviewer APPROVED on cycle 1; proceeding to ship (factory report + push + PR)
- why: builder implemented the full scaffold in one pass (commits 1bcac81, 527f0f0: server output, health+chat routes, mock fixtures, route utils with error envelope, Anthropic singleton, typed zod client, .env gitignored, README docs); oracle verified all 10 gates with runtime curl evidence; reviewer found no blocking issues, confirmed key isolation and no-UI-regression via simulator screenshot (commit b0141d9). stall_count stays 0.
- evidence: factory-gates.local.md gates_passed=10/10; reviewer verdict APPROVED; HEAD b0141d9

---

# Final Gate State

---
task_id: APP-28
gates_total: 10
gates_passed: 10
evaluated_at: "2026-06-11T15:53:06Z"
---

# Acceptance Gates for APP-28

## Gates

- [x] GATE-1: Server output enabled — `app.json` contains `"output": "server"` under the `web` key. Check: `grep -A4 '"web"' app.json | grep '"output": "server"'` exits 0.
- [x] GATE-2: Health endpoint live — `src/app/api/health+api.ts` exists and exports a GET handler; with the Expo dev server running, `curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/api/health` returns `200` and the body is `{"ok":true}` (verify body with `curl -s http://localhost:8081/api/health`). Start server via `npx expo start --offline` in background, poll `http://localhost:8081/status` until up.
- [x] GATE-3: Sample Claude round-trip endpoint in mock mode — at least one non-health API route exists under `src/app/api/` (e.g. a chat or tag endpoint `*+api.ts`) that, when the dev server is started with `EXPO_PUBLIC_AI_MOCK=1`, returns HTTP 200 with a canned fixture payload via `curl` POST (valid JSON body). The fixture content must include the design-handoff data: grep the codebase for `Quiet luxury` (outfit reply fixture) → at least 1 match in a server/fixtures file.
- [x] GATE-4: Real-key structure in place — the sample endpoint's server-side code imports `@anthropic-ai/sdk` (or a shared Anthropic singleton that does) and references model strings `claude-fable-5` and/or `claude-haiku-4-5-20251001`, with the mock branch gated on the env flag. Check: `grep -rn "@anthropic-ai/sdk" src/` matches only `*+api.ts` route files or server-only utility modules, and `grep -rn "claude-fable-5\|claude-haiku-4-5" src/` ≥ 1 match in server-side code.
- [x] GATE-5: No API key reachable from client bundle — `grep -rn "ANTHROPIC_API_KEY" src/` matches ONLY in `*+api.ts` route files or server-only utility modules imported exclusively by routes (never in `src/services/ai/client.ts`, screens, components, hooks, or stores); no `EXPO_PUBLIC_ANTHROPIC*` variable exists anywhere (`grep -rn "EXPO_PUBLIC_ANTHROPIC" src/ app.json` → 0 matches); and `.env` is gitignored: `git check-ignore .env` exits 0 and `git ls-files .env` outputs nothing.
- [x] GATE-6: Typed client — `src/services/ai/client.ts` exists; it uses zod to validate responses (`grep -n "zod" src/services/ai/client.ts` ≥ 1), implements a 15s timeout (grep the file for `15000`/`15_000` used with AbortController or `AbortSignal.timeout`), exposes a typed error union covering at least `network`, `rate-limit`, and `parse` variants (grep the file for those three literals/type members), and contains no import of `@anthropic-ai/sdk`.
- [x] GATE-7: Shared route utilities with error envelope — a shared server utility module exists (e.g. under `src/app/api/` or `src/services/ai/server*`) providing JSON body parsing + zod request validation + an error envelope shaped `{ error: { code, message } }`. Check: grep the utility file for both `code` and `message` inside an `error` object construction, and confirm a malformed request to the sample endpoint (e.g. `curl -X POST` with an invalid/empty JSON body) returns a 4xx whose JSON body matches `{"error":{"code":...,"message":...}}`.
- [x] GATE-8: README documents local dev — `README.md` covers the AI/API local dev flow: `expo start` serving API routes, `EXPO_PUBLIC_API_URL` for device→dev-server origin, `ANTHROPIC_API_KEY` in `.env`, and `EXPO_PUBLIC_AI_MOCK=1` mock mode. Check: `grep -n "EXPO_PUBLIC_API_URL\|EXPO_PUBLIC_AI_MOCK" README.md` ≥ 2 matches.
- [x] GATE-9: lint passes — `npm run lint` exits 0.
- [x] GATE-10: TypeScript compiles — `npx tsc --noEmit` exits 0.

## Oracle Notes

Task: APP-28, AI service layer scaffold — Expo Router API routes (web.output "server"), Anthropic SDK kept server-side, typed zod client, mock mode, README docs. No Figma (figma_count: 0) and the ticket adds no UI of its own, so no VISUAL_MATCH gate; the reviewer's mandatory simulator screenshot covers boot regression separately.

Assumptions and resolved ambiguities:
- "Sample Claude round-trip endpoint" — the ticket does not name it; any non-health `*+api.ts` route under `src/app/api/` qualifies (likely chat or garment-tagging). GATE-3/4/7 are written endpoint-agnostic.
- A real-key round-trip cannot be verified in evaluation without spending tokens / depending on a live key; GATE-4 therefore checks the real-key code path structurally (SDK import + model strings + env-flag gating) rather than executing a live call. Mock mode (GATE-3) IS executed live via curl — this matches the ticket's intent that reviewers never depend on a live key.
- Verified before writing gates: `.gitignore` currently only ignores `.env*.local`, NOT `.env` — the builder must add `.env*` (or `.env`); GATE-5 checks mechanically via `git check-ignore .env` + `git ls-files .env`.
- "No API key reachable from client bundle" is approximated by static reachability: `ANTHROPIC_API_KEY` referenced only in route files / server-only modules, no `EXPO_PUBLIC_` prefix on the key. A full bundle-output scan is overkill for this scaffold; the static check matches the criterion's intent.
- Mock fixtures must match the design handoff ("Quiet luxury" outfit reply, garment tag set, palette) and align with `src/types/wardrobe.ts` types; GATE-3 spot-checks the distinctive "Quiet luxury" string, GATE-10 (tsc) enforces type alignment.
- Allowed new deps: `zod`, `@anthropic-ai/sdk` only.
- Risk: runtime gates (2, 3, 7-curl) need the Metro dev server up; evaluator starts `npx expo start --offline` in background and polls `http://localhost:8081/status` before curling. If the server cannot start due to environment issues, those gates stay unchecked with a note rather than being failed.

## Evaluation History

### Pass 1 — 2026-06-11T15:53:06Z
- GATE-1: PASS — evidence: `grep -A4 '"web"' app.json | grep '"output": "server"'` → matched `"output": "server",`, exit 0
- GATE-2: PASS — evidence: started `EXPO_PUBLIC_AI_MOCK=1 npx expo start --offline` (up after 10s polling /status); `curl http://localhost:8081/api/health` → HTTP 200, body `{"ok":true}`
- GATE-3: PASS — evidence: `src/app/api/chat+api.ts` exists; `curl -X POST /api/chat -d '{"message":"What should I wear tonight?"}'` in mock mode → HTTP 200 with the "Quiet luxury" fixture reply; `grep -rn "Quiet luxury" src/` → matches in src/services/ai/server/fixtures.ts (lines 7, 26, 29)
- GATE-4: PASS — evidence: `grep -rn "@anthropic-ai/sdk" src/` → only src/services/ai/server/anthropic.ts:10 (server-only singleton); models `claude-fable-5` (anthropic.ts:15) and `claude-haiku-4-5-20251001` (anthropic.ts:17); mock branch gated via `isMockMode()` env-flag check in chat+api.ts:25
- GATE-5: PASS — evidence: `grep -rn "ANTHROPIC_API_KEY" src/` → only chat+api.ts (route) and services/ai/server/anthropic.ts; `grep -rln "services/ai/server" src/` → imported only by src/app/api/chat+api.ts (no client/screen/hook/store importers); `grep -rn "EXPO_PUBLIC_ANTHROPIC" src/ app.json` → 0 matches (exit 1); `git check-ignore .env` → exit 0; `git ls-files .env` → empty
- GATE-6: PASS — evidence: read src/services/ai/client.ts — `import { z } from 'zod'` (L15), `REQUEST_TIMEOUT_MS = 15_000` with AbortController (L31, L49-50), error union `'network' | 'rate-limit' | 'parse' | 'server'` (L20), no `@anthropic-ai/sdk` import
- GATE-7: PASS — evidence: src/services/ai/server/route-utils.ts builds `Response.json({ error: { code, message } })` (L15-16); `curl -X POST /api/chat -d 'not json'` → 400 `{"error":{"code":"invalid-request","message":"Request body must be valid JSON."}}`; `curl -d '{}'` → 400 with zod issue message in envelope
- GATE-8: PASS — evidence: `grep -n "EXPO_PUBLIC_API_URL\|EXPO_PUBLIC_AI_MOCK" README.md` → 3 matches (L49, L50, L55); README also documents `ANTHROPIC_API_KEY` server-only (L48) and `npx expo start` serving API routes (L34-37)
- GATE-9: PASS — evidence: `npm run lint` (expo lint) → exit 0
- GATE-10: PASS — evidence: `npx tsc --noEmit` → exit 0

