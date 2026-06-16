# Factory Decision Journal — APP-31

Task: Outfit suggestion engine + real vibe score
Started: 2026-06-16T00:00:00Z
Branch: feat/APP-31-outfit-suggestion-engine-real-vibe

Append-only. Every agent records every decision here.

## [2026-06-16T16:30:03Z] iter=0 agent=orchestrator event=INIT
- decision: Factory initialized for APP-31
- why: User invoked /factory with Linear URL https://linear.app/apptryout/issue/APP-31/outfit-suggestion-engine-real-vibe-score
- evidence: Linear MCP get_issue returned task data

## [2026-06-16T16:30:03Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: Tracker=linear, ID=APP-31, status=Todo, priority=High
- why: APP-31 is REWORKED — Layer 2 (Claude re-rank) REMOVED. Source of truth is Layer 1 (local heuristic in src/services/styling/suggest.ts). Optional on-device LLM (APP-35) is non-essential — ticket ships on Layer 1 alone.
- evidence: Issue description states "this ticket can ship on Layer 1 alone without it"

## [2026-06-16T16:30:03Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: No Figma URLs in issue; local design ref docs/design-screenshots/screen-outfit.png is the visual target. UI screen src/app/(tabs)/outfits.tsx already exists and uses vibeScoreFor + setSlot via store.
- why: Issue is pure logic — engine + scoring. The engine swap must be behind the same vibeScoreFor signature so screens stay untouched.
- evidence: Read src/app/(tabs)/outfits.tsx (canned slot-ladder vibeScoreFor) and src/store/wardrobe-store.ts (placeholder lives at wardrobe-store.ts:73)

## [2026-06-16T16:30:03Z] iter=0 agent=orchestrator event=BRANCH
- decision: Created branch feat/APP-31-outfit-suggestion-engine-real-vibe from main
- why: Standard factory branch convention; main was clean (only 13 unpushed commits from prior APP-22 work, no working-tree changes)
- evidence: git checkout -b succeeded

## [2026-06-16T16:33:48Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 10 gates for APP-31
- why: Task is a pure-logic refactor (new on-device suggestion engine + real vibe score) with no screen layout changes, so gates focus on (1) the new pure module's existence + exports + purity, (2) the store wrapper preserving its signature while delegating, (3) the screen wiring suggestForSlot/surpriseLook, (4) unit-test coverage + npm test passing, (5) vibe calibration via assertions inside the suite (empty=0, Editor-at-large in [88,96], clashing < cohesive), and (6) standard lint + tsc gates. Skipped VISUAL_MATCH because figma_count=0 and the ticket says "screens untouched" — adding a simulator gate would be busywork that doesn't validate the change. Ambiguity around the test runner is left to the builder (the ticket says they may pick node --test --experimental-strip-types or a .mjs companion); GATE-5 enforces npm test exits 0 without constraining how. Vibe acceptance band chosen as [88,96] — wide enough for honest calibration drift, tight enough that the current placeholder ladder (max 91 for full draft) could still pass but a naive "always 100" engine could not.
- evidence: read .claude/factory-state.local.md (lines 1-102), read src/store/wardrobe-store.ts (lines 1-100 — confirmed vibeScoreFor signature and EMPTY_DRAFT shape), listed src/services/ and src/app/(tabs)/ (confirmed services/styling does not yet exist and outfits.tsx is present), read package.json head (confirmed devDeps will need a test script wiring — no jest/vitest installed). Wrote .claude/factory-gates.local.md with 10 gates.

## [2026-06-16T17:00:00Z] iter=2 agent=builder event=BUILD
- decision: Implement all 8 non-lint/non-tsc gates in one pass — create pure engine src/services/styling/suggest.ts, write node:test suite, wire npm test, update store wrapper, swap rail+surprise logic in outfits screen
- why: Gates are tightly coupled (engine + store + screen + tests must land together for npm test to pass and outfit rail to compile). Splitting would leave intermediate iterations broken. Engine uses relative type imports from ../../types/wardrobe so it loads under node --experimental-strip-types for the test runner; the screen imports it via @/services/styling/suggest. Test file is colocated suggest.test.ts and uses inline fixtures reconstructing the "Editor at large" outfit (i4/i3/i5 + i6 for the EXTRA slot) — avoiding the @/data/seed path-alias which node strip-types can't resolve.
- evidence: read state/gates/journal, read wardrobe-store.ts, types/wardrobe.ts, outfits.tsx, data/seed.ts, package.json; node 25.9 supports type stripping

## [2026-06-16T17:10:00Z] iter=2 agent=builder event=SELF_REVIEW
- decision: All 8 implementation gates verified; lint + tsc + npm test all green
- why: Re-read every hunk against gate text — engine file has the 3 named exports, zero impure imports, store wrapper preserves `(draft: OutfitDraft) => number` and imports engine, screen imports + calls suggestForSlot + surpriseLook, package.json scripts.test references the test file, test file mentions all 5 required case keywords (empty/full/single-category/clash/determin = 42 hits), calibration keywords present (16+16 hits), seed param signature is now single-line so the GATE-8 grep matches. Removed dead code (SLOT_CATEGORIES, shuffleBySeed) the engine subsumes — kept no orphan imports. Added `noEmit` + `allowImportingTsExtensions` to tsconfig.json because the test file imports `./suggest.ts` with the .ts extension (required by node strict ESM resolution under --experimental-strip-types); both flags are safe since Expo doesn't run tsc for emit (Metro/Babel handle transpilation). No NativeWind violations introduced — diff has zero new `StyleSheet.create` or `style={{...}}` literals. No console.* or debugger residue.
- evidence: tsc exit 0, expo lint exit 0 (0 errors 0 warnings), npm test exit 0 (9/9 passed), all gate-spec greps return expected matches (4 export hits, 0 impurity hits, 1 vibeScoreFor signature, 1 engine import in store, 0 placeholder ladder hits, 2 engine calls in screen, 1 engine import in screen, test file name resolves, GATE-8 seed param grep matches)

## [2026-06-16T17:15:00Z] iter=2 agent=builder event=COMMIT
- decision: Committed APP-31 engine + tests + wiring as 7ede8cb on feat/APP-31-outfit-suggestion-engine-real-vibe
- why: All 8 implementation gates verified locally; lint/tsc/test green; ready for Oracle to re-evaluate.
- evidence: commit 7ede8cb, 6 files changed (+525 -52); files: src/services/styling/suggest.ts (new), src/services/styling/suggest.test.ts (new), src/store/wardrobe-store.ts, src/app/(tabs)/outfits.tsx, package.json, tsconfig.json

## [2026-06-16T16:45:28Z] iter=2 agent=oracle event=EVAL
- decision: gates 10/10 pass
- why: Builder commit 7ede8cb added pure engine module, wired store wrapper to delegate, replaced rail+surprise actions in outfits screen, added node:test suite with 9 cases all green, and kept lint+tsc clean. No regressions: lint and tsc re-run on every pass and both exit 0; no previously-passed gates to re-check (first eval pass for this task).
- evidence: See ## Evaluation History > Pass 2 in .claude/factory-gates.local.md for per-gate command output. Key checks: `npm test` 9/9 pass; `npm run lint` exit 0; `npx tsc --noEmit` exit 0; forbidden-import grep against suggest.ts exit 1 (no matches); placeholder ladder grep against wardrobe-store.ts exit 1 (no matches).

## [2026-06-16T16:49:36Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Pure-logic refactor — new engine src/services/styling/suggest.ts (no React/RN/network imports), store wrapper preserves (draft)=>number signature and delegates to engine, outfits screen rail now calls suggestForSlot/surpriseLook with deterministic seed. No StyleSheet/inline-style additions (mostly removed dead helper code). npm test 9/9 pass, tsc clean, lint clean. Simulator screenshot of /outfits route shows expected Outfit Builder layout (slot cards, vibe ring top-right showing computed 70 for the default mixed draft, AI rail, tab bar) matching docs/design-screenshots/screen-outfit.png. Differences in displayed items/score are expected — design used a curated cohesive look (87), simulator default has mixed-season items.
- evidence: git diff main..HEAD (6 files, +525/-52); npm test → 9 pass; npx tsc --noEmit exit 0; expo lint exit 0; /tmp/factory-review-screenshot.png compared against docs/design-screenshots/screen-outfit.png — layout structure identical (slot list, vibe badge geometry, rail, tab bar). Inspected suggest.ts harmonyAgainst empty-target fallback (0.7), hexToRgb malformed-input safety, seedJitter 32-bit overflow handling, draftItems Map-based lookup — all sound.

---

# Final Gate State

---
task_id: APP-31
gates_total: 10
gates_passed: 10
evaluated_at: "2026-06-16T16:45:28Z"
---

# Acceptance Gates for APP-31

## Gates

- [x] GATE-1: Engine module exists at `src/services/styling/suggest.ts` and exports the three required functions: `suggestForSlot`, `vibeScore`, and `surpriseLook`. Verify via `ls src/services/styling/suggest.ts` (exit 0) and `grep -E '^export (function|const) (suggestForSlot|vibeScore|surpriseLook)\b' src/services/styling/suggest.ts` → at least 3 matches, one for each name.

- [x] GATE-2: Engine is pure — zero imports of React, react-native, expo-*, or any network module. Verify via `grep -nE "from ['\"](react|react-native|expo[-/]|node:https?|axios|@anthropic-ai|fetch)" src/services/styling/suggest.ts` → 0 matches (exit 1 from grep means no matches, which is PASS). Also verify no use of fetch/XMLHttpRequest: `grep -nE "\b(fetch|XMLHttpRequest|WebSocket)\b" src/services/styling/suggest.ts` → 0 matches. Engine must not add new runtime dependencies — `git diff main -- package.json` shows no new entries under `dependencies` (devDeps for testing are allowed).

- [x] GATE-3: Store wrapper `vibeScoreFor` in `src/store/wardrobe-store.ts` preserves its signature `(draft: OutfitDraft) => number` and delegates into the new engine. Verify via `grep -nE "export function vibeScoreFor\s*\(\s*draft\s*:\s*OutfitDraft\s*\)\s*:\s*number" src/store/wardrobe-store.ts` → 1 match, AND `grep -nE "from ['\"]@/services/styling/suggest['\"]|from ['\"]\.\./services/styling/suggest['\"]" src/store/wardrobe-store.ts` → at least 1 match (store imports from engine), AND the placeholder `if (filled === 1) return 48;` ladder is gone: `grep -nE "filled === 1.*return 48" src/store/wardrobe-store.ts` → 0 matches.

- [x] GATE-4: Outfit Builder screen `src/app/(tabs)/outfits.tsx` uses the engine — `suggestForSlot` for the rail and `surpriseLook` for the "Surprise me" action. Verify via `grep -nE "suggestForSlot\b" src/app/\(tabs\)/outfits.tsx` → at least 1 match, AND `grep -nE "surpriseLook\b" src/app/\(tabs\)/outfits.tsx` → at least 1 match, AND `grep -nE "from ['\"]@/services/styling/suggest['\"]" src/app/\(tabs\)/outfits.tsx` → at least 1 match.

- [x] GATE-5: A `test` script is wired into `package.json` and runs the engine unit tests successfully. Verify via `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).scripts.test)"` → prints a command that references `src/services/styling/suggest.test` (either `.ts` with `--experimental-strip-types` or a sibling `.mjs`). Then run `npm test` → exit code 0.

- [x] GATE-6: Unit tests cover the required cases — empty draft, full draft, single-category wardrobe, clashing palette, determinism. Verify via the test file existing (`ls src/services/styling/suggest.test.* | head -1`) and `grep -ciE "empty|full|single.?category|clash|determin" src/services/styling/suggest.test.*` → at least 5 (one keyword per case). All cases must pass when `npm test` runs (already covered structurally by GATE-5; this gate enforces case coverage by keyword).

- [x] GATE-7: Vibe score calibration is correct. Enforced inside the test suite (so `npm test` exits 0 only if these hold): (a) `vibeScore({top:null,bottom:null,shoes:null,extra:null}, [])` returns exactly `0`; (b) for the full draft built from `SEED_OUTFITS[0]` ("Editor at large") slot ids with `SEED_ITEMS`, `vibeScore` returns a value in the inclusive range `[88, 96]`; (c) a constructed 4-slot draft whose items have clashing swatches (e.g. red `#E53935`, green `#43A047`, blue `#1E88E5`, yellow `#FDD835`) returns a vibe strictly less than the cohesive Editor-at-large score. Verify case-presence via `grep -ciE "Editor at large|SEED_OUTFITS\[0\]|88|92|96" src/services/styling/suggest.test.*` → at least 2 matches, AND `grep -ciE "clash|E53935|43A047|1E88E5|FDD835" src/services/styling/suggest.test.*` → at least 1 match.

- [x] GATE-8: Determinism — `suggestForSlot(slot, items, draft, seed)` returns the same order across repeated calls with the same arguments. Enforced by the determinism test case from GATE-6; additionally verify the engine signature accepts a `seed?: number` parameter via `grep -nE "function suggestForSlot\s*\([^)]*seed\??\s*:\s*number" src/services/styling/suggest.ts` → 1 match (or arrow form: `grep -nE "suggestForSlot\s*=\s*\([^)]*seed\??\s*:\s*number" src/services/styling/suggest.ts`).

- [x] GATE-9: Lint passes — `npm run lint` exits 0.

- [x] GATE-10: TypeScript compiles — `npx tsc --noEmit` exits 0.

## Oracle Notes

### Scope as I interpret it
- Pure, offline Layer-1 engine only. Layer-2 (on-device LLM) is explicitly optional and not in scope for these gates.
- No new screens or layout changes. Outfit Builder UI is already implemented at `src/app/(tabs)/outfits.tsx`; we are only changing the *ordering* logic and the *vibe* values.
- Because the task is logic-only (no new visible UI per the ticket), I deliberately did NOT include a VISUAL_MATCH gate. `figma_count == 0`, the screen layout is unchanged, and the ticket explicitly says "screens untouched". A simulator gate would be busywork that doesn't validate the change.

### Ambiguities resolved
- The test runner isn't pre-installed. The ticket explicitly leaves the choice to the builder: `node --test --experimental-strip-types src/services/styling/suggest.test.ts` or a `.mjs` companion file. GATE-5 only requires that `npm test` exists and exits 0, and that the script name references the test file — implementation is free.
- The exact vibe number for "Editor at large" is given as `~92` in the design and `>= 88` in the test plan. I chose `[88, 96]` as the acceptance band — wide enough to allow honest calibration drift, tight enough that a naive "always 100" implementation would fail.
- "Clashing palette < cohesive" is expressed asymmetrically/relatively, which is the only way to make the gate robust against minor formula tweaks.

### Risks the builder may trip on
- Forgetting to remove the placeholder ladder body in `vibeScoreFor` — GATE-3 explicitly greps for `filled === 1.*return 48` to catch that.
- Accidentally importing `react-native` types inside the engine (e.g. `ColorValue`) — GATE-2 blocks it.
- `npm test` failing silently because the script is missing — GATE-5 forces it to exist.
- `(tabs)` is a literal directory name with parens; the gate-verification grep uses backslash-escaped parens.

### Assumptions made
- `SEED_OUTFITS[0]` is "Editor at large" per the ticket. If seed ordering changes, GATE-7 still expresses intent via the named outfit.
- `OutfitDraft` shape is `{ top, bottom, shoes, extra }` — confirmed from `src/store/wardrobe-store.ts` (EMPTY_DRAFT).
- The store wrapper still owns the `(draft) => number` signature; the engine itself takes `(draft, items)`. Both are exercised by the gates.

## Evaluation History

### Pass 2 — 2026-06-16T16:45:28Z
- GATE-1: PASS — evidence: `ls src/services/styling/suggest.ts` exit 0; `grep -E '^export (function|const) (suggestForSlot|vibeScore|surpriseLook)\b'` → 3 matches at lines 236, 268, 287.
- GATE-2: PASS — evidence: forbidden-import grep exit 1 (0 matches); fetch/XMLHttpRequest/WebSocket grep exit 1 (0 matches); `git diff main -- package.json` shows only a new `test` script (devDeps allowed; no new dependencies).
- GATE-3: PASS — evidence: vibeScoreFor signature found at line 74 of src/store/wardrobe-store.ts; engine import `import { vibeScore as engineVibeScore } from '@/services/styling/suggest'` at line 12; placeholder `filled === 1.*return 48` grep exit 1 (0 matches).
- GATE-4: PASS — evidence: `src/app/(tabs)/outfits.tsx` line 16 imports `suggestForSlot, surpriseLook`; line 312 calls `suggestForSlot(activeSlot, items, draft, shuffleSeed)`; line 324 calls `surpriseLook(items, shuffleSeed + 1)`.
- GATE-5: PASS — evidence: `package.json` scripts.test = `node --experimental-strip-types --test src/services/styling/suggest.test.ts`; `npm test` exit 0; 9 tests passed, 0 failed.
- GATE-6: PASS — evidence: test file at `src/services/styling/suggest.test.ts`; keyword grep `empty|full|single.?category|clash|determin` → 42 matches; all 9 test cases pass per GATE-5 output.
- GATE-7: PASS — evidence: keyword grep `Editor at large|SEED_OUTFITS\[0\]|88|92|96` → 16 matches; clash grep `clash|E53935|43A047|1E88E5|FDD835` → 16 matches; calibration assertions pass inside `npm test` (test names: "empty draft returns exactly 0", "Editor at large / SEED_OUTFITS[0] full draft is in [88, 96]", "clashing palette ... < cohesive").
- GATE-8: PASS — evidence: `grep 'function suggestForSlot\s*\([^)]*seed\??\s*:\s*number'` → 1 match at line 236 (signature `seed: number = 0`); determinism test case passes in npm test output ("suggestForSlot: determinism across repeated calls").
- GATE-9: PASS — evidence: `npm run lint` (expo lint) exit 0; no warnings or errors.
- GATE-10: PASS — evidence: `npx tsc --noEmit` exit 0.
