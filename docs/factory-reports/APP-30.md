# Factory Decision Journal — APP-30

Task: AI style coach "Iris" — chat completion with structured replies
Started: 2026-06-17T11:49:37Z
Branch: feat/APP-30-ai-style-coach-iris-chat-completion

Append-only. Every agent records every decision here.

## [2026-06-17T11:49:37Z] iter=0 agent=orchestrator event=INIT
- decision: factory armed for APP-30 on branch feat/APP-30-ai-style-coach-iris-chat-completion
- why: user invoked /factory with Linear URL; ran phases 1-9 per skill
- evidence: skill /factory invoked with task_url=https://linear.app/apptryout/issue/APP-30

## [2026-06-17T11:49:37Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: parsed Linear issue APP-30 (status Todo, priority High); blocked by APP-35 (runtime) per description
- why: the issue REWORKED note marks APP-35 as blocking; APP-35 is already merged (PR #32, src/services/ai/client.ts has the executorch capability gate), so we proceed; APP-31 (outfit suggestion engine) and APP-32 (palette engine) are both already in src/services/styling/ (suggest.ts + palette.ts) and ready to call
- evidence: mcp__linear-server__get_issue returned full description; existing src/services/styling/{suggest,palette}.ts confirmed via grep -n export

## [2026-06-17T11:49:37Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: no Figma URL on the issue; local design reference docs/design-screenshots/screen-chat.png is the canonical reference
- why: the issue description does not include a figma.com URL; APP-21 already shipped the chat UI (src/app/(tabs)/coach.tsx + src/components/chat/*); APP-30 is the brain behind that UI, not new screens
- evidence: docs/design-screenshots/screen-chat.png read; screen renders three bubble kinds (text / outfit-card with vibe + Save look + Try on / palette swatches) over the existing chat UI

## [2026-06-17T11:49:37Z] iter=0 agent=orchestrator event=BRANCH
- decision: branch feat/APP-30-ai-style-coach-iris-chat-completion created off main (fa26b5d)
- why: standard factory branch convention; main was 10 commits behind origin/main and got fast-forwarded as part of pull
- evidence: git stash --include-untracked saved "factory APP-30 stash" (uncommitted APP-29 changes preserved); git checkout main && git pull origin main && git checkout -b feat/APP-30-... succeeded

## [2026-06-17T12:12:15Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 12 gates for APP-30
- why: Services-layer PR (no UI, no Figma, no NativeWind, no visual match). Scope is six new coach pipeline files + one modification to client.ts, with hard constraints that the mock branch, wire schema, fixture, screen, and chat components stay frozen. Gates split into: existence (G1), exported signatures (G2), co-located tests (G3), node:test pass (G4), live wiring flipped on (G5/G6), mock branch preserved (G7), UI untouched (G8), fixture/schema frozen (G9), final schema validation in pipeline (G10), lint (G11), tsc (G12). Assumptions made: persona builder name accepts three reasonable variants since notes did not pin it; runtime global accepts __aiLlmRuntime or __aiCoachRuntime; only the four pure helpers (intent/window/grounding/persona) are required to ship tests since llm.ts and index.ts touch the runtime and styling engines and may not strip-run cleanly.
- evidence: Read .claude/factory-state.local.md (lines 1-108), src/services/ai/client.ts (full), src/services/ai/schemas.ts (full), src/services/ai/server/fixtures.ts (first 80 lines). Confirmed existing identify test pattern via head of src/services/ai/identify/name-template.test.ts. Confirmed styling helpers via head of src/services/styling/suggest.ts and palette.ts. Wrote .claude/factory-gates.local.md.

## [2026-06-17T12:23:38Z] iter=2 agent=builder event=BUILD
- decision: implement all six coach pipeline modules + tests + wire client.ts in one pass
- why: gates G1–G10 form a coherent feature unit; partial implementation (e.g. only intent.ts) would leave client.ts unwired and break unrelated gates. Splitting also wouldn't help since the orchestrator runs lint/tsc as one gate set. I'll mirror the identify/* pattern exactly (relative imports for testability, loose runtime typing via globalThis), reuse styling/suggest.ts (surpriseLook + vibeScore) and styling/palette.ts (aggregatePalette) instead of reimplementing, and validate the final pipeline output against coachResponseSchema (single-message array) inside index.ts.
- evidence: read state, gates, identify/{clip,name-template}.ts, styling/{suggest,palette}.ts, client.ts, schemas.ts, fixtures.ts; clean working tree on branch feat/APP-30

## [2026-06-17T13:00:00Z] iter=2 agent=builder event=BUILD
- decision: completed APP-30 coach pipeline — fixed regression in intent classifier, wired client.ts to runCoachPipeline, committed e0b6487
- why: previous builder session hit the API limit before the commit landed. All 10 coach module files existed untracked. One failing intent test ("I love the look from yesterday" → was 'outfit', should be 'text') caused by overly broad standalone `\boutfit\b` and `\blooks?\b` patterns; dropped those — the more specific verb-keyed patterns ("build me a look", "put together a look") still cover every explicit-outfit test case. Then added the live coach branch to client.ts that reads `globalThis.__aiLlmRuntime` and delegates to runCoachPipeline, returning model-loading when the runtime is absent and inference on throw (same shape as identify()).
- evidence: node --experimental-strip-types --test on all four pure helpers → 29 pass / 0 fail; npm run lint exit 0; npx tsc --noEmit exit 0; git commit e0b6487 "feat(APP-30): on-device coach pipeline (intent → text/outfit/palette)" — 11 files, 788 insertions, 1 deletion

## [2026-06-17T14:38:40Z] iter=2 agent=oracle event=EVAL
- decision: gates 12/12 pass — ALL_GATES_PASS for APP-30
- why: Builder added the full coach pipeline (intent/persona/window/grounding/llm/index) with four unit-test files, wired client.ts via globalThis.__aiLlmRuntime to runCoachPipeline, left the mock branch + fixture + schema untouched, and did not touch the chat UI. Lint and tsc both clean. 29/29 node:test cases pass.
- evidence: see Pass 2 block in .claude/factory-gates.local.md — every gate has a concrete grep/ls/diff/exit-code line. Key commands: `node --experimental-strip-types --test src/services/ai/coach/*.test.ts` → tests 29 pass 29 fail 0; `npm run lint` exit 0; `npx tsc --noEmit` exit 0; `git diff main...HEAD --name-only` lists only client.ts and src/services/ai/coach/* (no UI, no schemas, no fixtures).

## [2026-06-17T14:58:57Z] iter=1 agent=reviewer event=REVIEW
- decision: APPROVED
- why: APP-30 services-layer PR is correct end-to-end. The six coach modules (intent/persona/window/grounding/llm/index) ship with pure-helper tests (29/29 pass under node --experimental-strip-types --test), lint and tsc are clean, mock branch + fixture + schemas + chat UI are untouched (verified via diff), and the live coach() path correctly resolves runtime via globalThis.__aiLlmRuntime mirroring the CLIP injection. runCoachPipeline windows to 20 turns, classifies intent, always emits a text intro bubble, appends outfit/palette only when intent matches and grounded ids are non-empty, then validates the final shape against coachResponseSchema. No correctness, type-safety, security, or design-spec issues found.
- evidence: simulator screenshot at /Users/ilyakushner/Desktop/factory-try/docs/visual-review/simulator-screenshot.png shows mock-mode coach screen rendering the Quiet luxury outfit card + Warm Autumn palette + composer + tab bar — visually matches docs/design-screenshots/screen-chat.png (Iris header, outfit card w/ vibe pill + Save look + Try on, palette swatches w/ one-line note, Ask Iris composer). Compared against screen-chat.png reference. Re-ran node:test → 29 pass / 0 fail; npx tsc --noEmit → exit 0. Reviewed coach/index.ts (runCoachPipeline validates schema at L165), coach/intent.ts (regex-first with palette-before-outfit precedence), coach/llm.ts (fallback for empty replies), client.ts diff (live coach branch correctly wraps pipeline with try/catch → inference error, returns notReady when runtime absent). Mock branch unchanged at client.ts L143.

## [2026-06-17T13:35:00Z] iter=2 agent=orchestrator event=EVAL
- decision: iteration 2 result — gates 12/12, oracle ALL_GATES_PASS, reviewer APPROVED → ship PR
- why: all 12 acceptance gates verified with evidence (Oracle EVAL entry); Reviewer found no correctness/type/security/error-handling/design issues; simulator screenshot committed at 19e66cc with EXPO_PUBLIC_AI_MOCK=1 and matches design-screenshots/screen-chat.png
- evidence: git log → e0b6487 (coach pipeline) + 19e66cc (screenshot); docs/visual-review/simulator-screenshot.png tracked; npm run lint exit 0; npx tsc --noEmit exit 0; node test suite 29/29 pass

---

# Final Gate State

---
task_id: APP-30
gates_total: 12
gates_passed: 12
evaluated_at: "2026-06-17T14:38:40Z"
---

# Acceptance Gates for APP-30

## Gates

- [x] GATE-1: Coach pipeline modules exist with the expected file paths. Check via `ls src/services/ai/coach/intent.ts src/services/ai/coach/persona.ts src/services/ai/coach/window.ts src/services/ai/coach/grounding.ts src/services/ai/coach/llm.ts src/services/ai/coach/index.ts` — all six paths must resolve and exit 0.

- [x] GATE-2: Pure helpers export the documented signatures. Verify with grep:
  - `grep -E "export function classifyIntent" src/services/ai/coach/intent.ts` (returns `'text' | 'outfit' | 'palette'`)
  - `grep -E "export function windowTurns" src/services/ai/coach/window.ts`
  - `grep -E "export function groundItemIds" src/services/ai/coach/grounding.ts`
  - `grep -E "export function buildIrisSystemPrompt|export function buildPersonaPrompt|export function buildSystemPrompt" src/services/ai/coach/persona.ts` (any one of these persona-builder names is acceptable)
  - `grep -E "export (async )?function generateIrisReply" src/services/ai/coach/llm.ts`
  - `grep -E "export (async )?function runCoachPipeline" src/services/ai/coach/index.ts`
  Each grep must produce at least one match.

- [x] GATE-3: Each pure module has a co-located `*.test.ts`. Check via `ls src/services/ai/coach/intent.test.ts src/services/ai/coach/window.test.ts src/services/ai/coach/grounding.test.ts src/services/ai/coach/persona.test.ts` — all four files must exist (llm.ts and index.ts are not required to be test-runnable under node:test because they touch the runtime / styling engines, but pure helpers must be).

- [x] GATE-4: All coach unit tests pass under node's experimental TS strip. Run `node --experimental-strip-types --test src/services/ai/coach/intent.test.ts src/services/ai/coach/window.test.ts src/services/ai/coach/grounding.test.ts src/services/ai/coach/persona.test.ts` and confirm exit code 0 with "tests" count > 0 and "fail 0" in the tap output.

- [x] GATE-5: `src/services/ai/client.ts` no longer returns `notReady` unconditionally from the live `coach()` path. Verify with `grep -nE "coach: async \(\) => \(\{ ok: false, error: notReady \}\)" src/services/ai/client.ts` — this must produce ZERO matches. Then `grep -nE "runCoachPipeline" src/services/ai/client.ts` must produce at least one match (the live wiring imports and calls the pipeline).

- [x] GATE-6: The live coach path resolves a runtime via `globalThis` (same pattern as `__aiClipEmbedder`). Verify `grep -nE "__aiLlmRuntime|__aiCoachRuntime" src/services/ai/client.ts` produces at least one match.

- [x] GATE-7: Mock-mode coach branch is unchanged — still returns `MOCK_COACH_CONVERSATION` validated against `coachResponseSchema`. Verify `grep -nE "validate\(coachResponseSchema, MOCK_COACH_CONVERSATION\)" src/services/ai/client.ts` produces at least one match.

- [x] GATE-8: The screen `src/app/(tabs)/coach.tsx` and the chat components are NOT modified by this PR. Run `git diff main...HEAD --name-only` and confirm that NEITHER `src/app/(tabs)/coach.tsx` NOR any path matching `src/components/chat/` appears in the output.

- [x] GATE-9: The design-handoff fixture `MOCK_COACH_CONVERSATION` still validates against `coachResponseSchema`. Verify by running the existing mock-mode validation indirectly: `grep -nE "MOCK_COACH_CONVERSATION" src/services/ai/server/fixtures.ts` returns the fixture, AND `git diff main...HEAD -- src/services/ai/server/fixtures.ts src/services/ai/schemas.ts` shows ZERO lines changed (the wire contract and fixture are frozen per the implementation notes).

- [x] GATE-10: `runCoachPipeline` validates its final output against `coachResponseSchema`. Verify `grep -nE "coachResponseSchema" src/services/ai/coach/index.ts` produces at least one match (the pipeline imports the schema and uses it for the final parse).

- [x] GATE-11: lint passes (`npm run lint` exits 0).

- [x] GATE-12: TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

APP-30 is a services-layer PR — no JSX, no NativeWind, no Figma visual match needed. The hard constraints from the implementation notes are:

1. Six new files under `src/services/ai/coach/` with the documented pure-helper signatures.
2. Pure helpers must be runnable under `node --experimental-strip-types --test`, mirroring the APP-29 identify pipeline pattern. Their tests live next to them.
3. `src/services/ai/client.ts` flips the live `coach()` path from `notReady` to a real call to `runCoachPipeline`, gated by a `globalThis.__aiLlmRuntime` injection (same pattern as `__aiClipEmbedder`).
4. The mock branch, the wire schema, the fixture, and all UI (screen + chat components) are explicitly frozen.

Ambiguities resolved:
- The persona-builder export name was not pinned by the notes ("Iris persona system prompt builder"), so GATE-2 accepts any of `buildIrisSystemPrompt | buildPersonaPrompt | buildSystemPrompt`.
- `llm.ts` and `index.ts` import the runtime and the styling engines respectively, both of which pull in non-node-runnable modules in the worst case — so GATE-3 only mandates tests for the four pure helpers (`intent`, `window`, `grounding`, `persona`). This matches the implementation note "Each pure module ships a `*.test.ts`".
- The globalThis runtime handle name was specified as `__aiLlmRuntime` but a near-equivalent `__aiCoachRuntime` is accepted in GATE-6 to avoid trapping a reasonable builder choice.
- GATE-8 uses `git diff main...HEAD` (three-dot) so it captures the full set of changes on the branch, not just the latest commit.

Risks:
- The builder may add the pure helpers but forget to wire `client.ts` — GATE-5 + GATE-6 catch that.
- The builder may regress the mock branch by accidentally routing it through the pipeline — GATE-7 catches that.
- The builder may forget to validate against `coachResponseSchema` inside the pipeline — GATE-10 catches that.
- The builder may touch the UI — GATE-8 catches that.

## Evaluation History

### Pass 2 — 2026-06-17T14:38:40Z
- GATE-1: PASS — evidence: `ls src/services/ai/coach/{intent,persona,window,grounding,llm,index}.ts` all resolve (all six files present in directory listing).
- GATE-2: PASS — evidence: grep matches: `classifyIntent` at intent.ts:67 (returns `CoachIntent`); `windowTurns` at window.ts:24; `groundItemIds` at grounding.ts:26; `buildIrisSystemPrompt` at persona.ts:52; `generateIrisReply` at llm.ts:51 (async); `runCoachPipeline` at index.ts:124 (async).
- GATE-3: PASS — evidence: `ls` shows intent.test.ts, window.test.ts, grounding.test.ts, persona.test.ts in src/services/ai/coach/.
- GATE-4: PASS — evidence: `node --experimental-strip-types --test` over all four test files → "tests 29, pass 29, fail 0, duration_ms 154.55".
- GATE-5: PASS — evidence: grep for the legacy `notReady` coach line in client.ts → 0 matches; grep `runCoachPipeline` → 2 matches (import at L51, call at L201 `runCoachPipeline({ request, runtime })`).
- GATE-6: PASS — evidence: grep `__aiLlmRuntime|__aiCoachRuntime` in client.ts → matches at L194 (comment) and L198 (`(globalThis as { __aiLlmRuntime?: LlmRuntime }).__aiLlmRuntime`).
- GATE-7: PASS — evidence: grep `validate(coachResponseSchema, MOCK_COACH_CONVERSATION)` in client.ts → 1 match at L143 (mock branch).
- GATE-8: PASS — evidence: `git diff main...HEAD --name-only | grep -E "src/app/\(tabs\)/coach\.tsx|src/components/chat/"` → no matches (NO_UI_TOUCHED). Changed files are limited to client.ts + src/services/ai/coach/*.
- GATE-9: PASS — evidence: grep `MOCK_COACH_CONVERSATION` in fixtures.ts → 1 match at L58; `git diff main...HEAD -- src/services/ai/server/fixtures.ts src/services/ai/schemas.ts | wc -l` → 0 lines changed.
- GATE-10: PASS — evidence: grep `coachResponseSchema` in src/services/ai/coach/index.ts → 4 matches including L31 import, L165 `coachResponseSchema.safeParse(candidate)`, L169 error throw on validation failure.
- GATE-11: PASS — evidence: `npm run lint` exit code 0 (no errors output beyond env load).
- GATE-12: PASS — evidence: `npx tsc --noEmit` exit code 0 (no output).
