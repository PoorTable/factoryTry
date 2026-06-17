# Factory Decision Journal — APP-32

Task: Wardrobe palette analysis + style profile classification
Started: 2026-06-16T20:59:55Z
Branch: feat/APP-32-wardrobe-palette-analysis-style-profile

Append-only. Every agent records every decision here.

## [2026-06-16T20:59:55Z] iter=0 agent=orchestrator event=INIT
- decision: factory invoked for APP-32
- why: user ran /factory with Linear URL
- evidence: https://linear.app/apptryout/issue/APP-32/wardrobe-palette-analysis-style-profile-classification

## [2026-06-16T20:59:55Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, ID=APP-32, status=Todo, priority=Medium
- why: REWORKED ticket — Claude classification removed. paletteName/tagline becomes local rule-based; insight uses on-device LLM with templated fallback. blocked_by=[APP-35 (LLM runtime), APP-28 (Claude scaffold)] but ticket explicitly says wheel+stats need no model and insight has templated fallback — so this can ship on local logic alone.
- evidence: Linear MCP get_issue returned full description; key phrase "Blocked by APP-35 for the LLM insight only — the wheel and stats need no model"

## [2026-06-16T20:59:55Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: no Figma URLs; use local design refs docs/design-screenshots/{screen-profile.png, component-palette-stats.png, design-overview.png} as visual target
- why: task description contains no figma.com links; APP-22 already exists rendering the static profile screen — this ticket is the data layer behind it
- evidence: ls docs/design-screenshots returned 10 PNGs including screen-profile + component-palette-stats

## [2026-06-16T20:59:55Z] iter=0 agent=orchestrator event=BRANCH
- decision: created feat/APP-32-wardrobe-palette-analysis-style-profile from origin/main
- why: clean working tree on feat/APP-31; fast-forwarded main from origin first (APP-31 PR #30 already merged)
- evidence: git pull fast-forward 63def47..7235888; git checkout -b succeeded

## [2026-06-17T03:56:05Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 11 gates for APP-32 (palette analysis + style profile classification)
- why: Task pivoted to fully on-device (no Claude). Gates target (a) the pure aggregation/classification module at src/services/styling/palette.ts following the APP-31 pattern, (b) the curated color-name table covering warm-autumn families, (c) the 10-segment / sum-100 invariant, (d) deterministic offline classification + templated fallback insight with italic emphasis, (e) the async-generator seam for APP-35's on-device LLM, (f) memoized recompute in wardrobe-store without breaking the existing StyleProfile shape, (g) unit tests under node --experimental-strip-types, plus the standard VISUAL_MATCH / lint / tsc trio. Resolved ambiguity around memoization (accept either reducer-driven recompute or selector-level memo) and function naming (greps allow plausible aliases). Risk: builder could re-introduce a network path or change profile shape — gates explicitly block both.
- evidence: read .claude/factory-state.local.md (APP-32 frontmatter, figma_count=0, local design references at docs/design-screenshots/screen-profile.png + component-palette-stats.png); listed src/services/styling/ (suggest.ts + suggest.test.ts exist as the pattern); grep StyleProfile/paletteAnalysis across src/ found schemas.ts:58 (paletteAnalysisSchema), wardrobe-store.ts:116 (profile: StyleProfile | null), components/profile/palette-section.tsx, app/(tabs)/you.tsx, data/seed.ts; package.json test script confirmed node --experimental-strip-types --test runner. Wrote .claude/factory-gates.local.md with gates_total=11.

## [2026-06-17T04:12:48Z] iter=2 agent=builder event=BUILD
- decision: implement GATEs 1-8 as one cohesive unit — create `src/services/styling/palette.ts` (pure aggregate/name/classify/insight) + `palette.test.ts` (node:test) + wire `computeProfile()` into wardrobe-store reducers (recompute on add/remove/incrementWorn/update). GATE-9 (visual) and 10/11 (lint/tsc) verified by Oracle/Reviewer.
- why: All eight code gates target the same module + its store wiring; splitting would force me to write a test file that imports a non-existent module, and to wire a store import that fails tsc. Modeling after src/services/styling/suggest.ts (same file layout, same hex/HSL helpers, same node:test pattern). For the LLM seam I add an optional `insightGenerator?: (ctx) => Promise<string>` argument on `computeProfile` so APP-35 can drop in the on-device model later. Memoization uses a reducer-driven recompute called from item-mutating actions (simpler than selector memo, and the spec accepts either).
- evidence: read src/services/styling/suggest.ts, suggest.test.ts, src/store/wardrobe-store.ts, src/data/seed.ts, src/types/wardrobe.ts, src/services/ai/schemas.ts; package.json test script runs node --experimental-strip-types --test on a single file (will extend to glob).

## [2026-06-17T04:18:00Z] iter=2 agent=builder event=SELF_REVIEW
- decision: clean — all 8 code gates satisfied locally, both pure-module and store-wiring paths verified, no styling/debug residue.
- why: walked git diff hunk-by-hunk; ran the gate greps (GATE-1 6 exports, GATE-2 15 warm-autumn hits, GATE-3 6 invariant asserts, GATE-4 16 paletteName/Warm Autumn/Cool Summer hits, GATE-5 italic mentions in docs + `*…*` in templates, GATE-6 11 async/promise/insightGenerator hits, GATE-7 store imports from '@/services/styling/palette', GATE-8 14 test() blocks); verified palette.ts imports no react/react-native/expo/network (`grep ... = empty`); verified no `fetch|XMLHttpRequest|axios` in palette.ts; verified `profile: StyleProfile | null` shape unchanged in the store; verified no `StyleSheet.create` or `style={{` in any modified file; no console.log/debugger/TODO(factory) residue. Fixed one lint warning (`ReadonlyArray<T>` → `readonly T[]`) before commit.
- evidence: `npx tsc --noEmit` exit=0; `npx expo lint` exit=0; `npm test` 23 pass / 0 fail (14 new palette tests + 9 existing suggest tests). git diff stat: 2 new files (palette.ts 503 lines, palette.test.ts 188 lines), 2 modified (wardrobe-store.ts +80/-25, package.json +1/-1).

## [2026-06-17T04:20:23Z] iter=2 agent=oracle event=EVAL
- decision: gates 11/11 pass — ALL_GATES_PASS
- why: APP-32 builder commit 00d3d2d delivered pure palette module (palette.ts), 14-test suite, store wiring via memoized recomputeProfile keyed on profileCacheKey, and templated insight with italic *…* span + async InsightGenerator seam for APP-35. Lint, tsc, and node --test all exit 0. Live iOS simulator screenshot of the /you tab matches docs/design-screenshots/screen-profile.png in all major elements (10-segment wheel, Warm Autumn centered, stats grid, most-worn). Count differences (17/5/7 vs 54/12/28) are expected — they prove the store is no longer rendering SEED_PROFILE statics but live values from computeProfile(SEED_ITEMS).
- evidence: Evaluation History pass-2 block in .claude/factory-gates.local.md; npm run lint exit 0; npx tsc --noEmit exit 0; node --experimental-strip-types --test src/services/styling/palette.test.ts → 14 pass / 0 fail; screenshot at /tmp/oracle-visual-check.png; reference at docs/design-screenshots/screen-profile.png.

## [2026-06-17T05:58:38Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Pure palette module (palette.ts) has clean separation — no react/react-native/expo/network imports; handles empty input, malformed hex, zero-sum pcts; async insightGenerator seam swallows errors and falls back to template; StyleProfile shape preserved. Store wiring uses module-scoped memoization key and is called from all item mutation paths (add/update/remove/incrementWorn) plus onRehydrateStorage with a correctly gated re-seed branch. 14 new tests + 9 existing all pass. No new styling violations (StyleSheet/inline style not used; no UI files touched). Visual match confirmed against docs/design-screenshots/screen-profile.png — 10-segment wheel, Warm Autumn centered, stats grid, most-worn season all present; count differences (17/5/7 vs 54/12/28) are the intended outcome (live computed values from SEED_ITEMS instead of static SEED_PROFILE).
- evidence: git diff main..HEAD (4 files: package.json, palette.ts +551, palette.test.ts +214, wardrobe-store.ts +80/-25); simulator screenshot at docs/visual-review/simulator-screenshot.png (committed 339d533) compared with docs/design-screenshots/screen-profile.png; spot-checked GATE-1 (no forbidden imports), GATE-3 (length===10 + sum===100 asserts in test file), GATE-7 (store import + recomputeProfile keyed on profileCacheKey, shape unchanged at line 145-146).

## [2026-06-17T04:30:00Z] iter=2 agent=orchestrator event=EVAL
- decision: gates 11/11 pass; reviewer APPROVED on cycle 1; advancing to PR
- why: builder shipped palette engine + tests + store wiring in one commit (00d3d2d); oracle ALL_GATES_PASS with per-gate evidence + visual match; reviewer APPROVED with no blocking issues; simulator screenshot committed to branch
- evidence: HEAD=00d3d2d, factory-gates gates_passed=11, docs/visual-review/simulator-screenshot.png present in branch

---

# Final Gate State

---
task_id: APP-32
gates_total: 11
gates_passed: 11
evaluated_at: "2026-06-17T04:20:23Z"
---

# Acceptance Gates for APP-32

## Gates

- [x] GATE-1: Pure palette aggregation module exists at `src/services/styling/palette.ts` exporting at minimum `aggregatePalette`, `nameForHex` (or equivalent named-color lookup), and a season `classifyProfile` (or equivalent) function — verify via `ls src/services/styling/palette.ts` and `grep -E "^export (function|const) (aggregatePalette|nameForHex|classifyProfile|classify|computeProfile|paletteFor)" src/services/styling/palette.ts` returning at least 3 matches. The module must NOT import from `react`, `react-native`, `expo`, `expo-*`, or any network module (verify with `grep -E "from ['\"](react|react-native|expo)" src/services/styling/palette.ts` returning 0 matches).

- [x] GATE-2: Curated color-name table is defined inside `src/services/styling/palette.ts` and covers warm-autumn family — `grep -iE "cognac|camel|sand|espresso|olive|bone|terracotta" src/services/styling/palette.ts` returns at least 5 matches. `nameForHex` (or equivalent) must return the closest entry from this table for an arbitrary hex.

- [x] GATE-3: Palette wheel output is exactly 10 segments and percentages sum to 100 — verify by reading the unit test file (see GATE-8) and confirming a test exercises `aggregatePalette` (or equivalent) producing `palette.length === 10` AND `sum(pct) === 100`. Grep: `grep -E "length.*===.*10|sum.*===.*100|toBe\\(100\\)|toBe\\(10\\)|assert.*100|assert.*10" src/services/styling/palette.test.ts` returns at least 2 matches.

- [x] GATE-4: Local season classification is deterministic and offline — `classifyProfile` (or equivalent) in `src/services/styling/palette.ts` returns `{ paletteName, tagline }` based purely on aggregated stats (no fetch/network). Grep `grep -E "Warm Autumn|Cool Summer|paletteName" src/services/styling/palette.ts` returns at least 2 matches, AND `grep -E "fetch\(|XMLHttpRequest|axios" src/services/styling/palette.ts` returns 0 matches.

- [x] GATE-5: Templated fallback insight generator exists and references only real colors from the input items — exposed function (e.g. `fallbackInsight` / `generateInsight`) in `src/services/styling/palette.ts`. Insight string MUST include one italic `*…*` span. Verify with `grep -E "\\*\\{|\\*\\$|'\\*'|\"\\*\"|italic" src/services/styling/palette.ts` returns at least 1 match AND the unit test asserts the returned `insight` substring is drawn from the input item swatches/names (see GATE-8).

- [x] GATE-6: An async-generator seam exists so APP-35's on-device LLM can replace the templated insight later — the classification entry-point (e.g. `computeProfile` / `analyzePalette`) accepts an optional async insight generator parameter. Verify with `grep -E "async|Promise<string>|insightGenerator|generator\\?:|generate\\?:" src/services/styling/palette.ts` returns at least 2 matches AND the function signature shows an optional argument typed for async insight generation.

- [x] GATE-7: Wardrobe store wires real computation into the `profile` selector/state without breaking the existing `StyleProfile` shape — `src/store/wardrobe-store.ts` imports from `src/services/styling/palette.ts` (`grep -n "from '../services/styling/palette'\\|from '@/services/styling/palette'\\|from './../services/styling/palette'" src/store/wardrobe-store.ts` returns at least 1 match). The store exposes a memoized selector that recomputes when items change (verify a `useMemo`-style memo key referencing item ids or `wornCount` exists, or an explicit `recomputeProfile` action is called from `addItem`/`removeItem`/`incrementWorn`). Existing `profile: StyleProfile | null` field shape unchanged.

- [x] GATE-8: Unit tests at `src/services/styling/palette.test.ts` cover clustering, naming, pct rounding, season mapping, and insight reality-check — `ls src/services/styling/palette.test.ts` succeeds. The file contains at least 5 `test(` or `it(` blocks (`grep -cE "^(\\s*)(test|it)\\(" src/services/styling/palette.test.ts` ≥ 5). Running `node --experimental-strip-types --test src/services/styling/palette.test.ts` exits 0 with all tests passing. (If `package.json`'s `test` script must be extended to include this file, that change is acceptable.)

- [x] GATE-9: VISUAL_MATCH — Live iOS simulator screenshot of the Style Profile screen (`/you` tab) matches the design reference at `docs/design-screenshots/screen-profile.png` and `docs/design-screenshots/component-palette-stats.png`: the palette wheel renders with 10 segments and a centered season name, the stats grid is present, and warm-autumn-family colors (cognac/camel/sand range) dominate the wheel because the seeded items in `src/data/seed.ts` skew warm.

- [x] GATE-10: lint passes (`npm run lint` exits 0).

- [x] GATE-11: TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

**Task scope.** APP-32 replaces a static seeded `StyleProfile` (paletteName, tagline, 10-segment palette, insight) with live values computed from the user's wardrobe. The reworked spec (2026-06-16) removes the Claude `POST /api/profile` path entirely: both classification and the templated fallback insight are now local pure functions. The on-device LLM insight is deferred to APP-35; this ticket only needs to provide a seam (optional async generator parameter) and ship the templated path.

**Key files I expect the builder to touch.**
- `src/services/styling/palette.ts` (new) — pure aggregation, naming, classification, fallback insight.
- `src/services/styling/palette.test.ts` (new) — `node --test --experimental-strip-types` style, matches APP-31 pattern at `src/services/styling/suggest.test.ts`.
- `src/store/wardrobe-store.ts` — wire new module into the `profile` slice; recompute on item change. Existing `profile: StyleProfile | null` and `setProfile` field shapes must remain.
- Possibly `package.json` test script (extend to include palette.test.ts).

**Ambiguities resolved.**
- The spec says "Recompute on item add/remove/wear; memoized." I accept either a recompute-on-action approach (called inside the existing item action reducers) or a memoized selector keyed on item ids + wornCount. Either is correct — GATE-7 accepts both.
- Function naming is left to the builder; gates grep for plausible names (`aggregatePalette`, `classifyProfile`, `computeProfile`, etc.).
- The italic emphasis span is verified by checking the insight builder produces a `*…*` substring — I don't pin a specific template string.

**Risks.**
- TypeScript strictness: `paletteAnalysisSchema` includes `palette: StyleProfile['palette']`. The store currently has `profile: StyleProfile | null` — if the builder changes the shape, both schema and screen break. GATE-7 enforces shape preservation.
- The visual gate may show a screen that's already passing because APP-22 already renders a seeded profile. The intent is to confirm the live screen still renders correctly with the new computed data path — not that pixel values changed.

**Assumptions.**
- The builder will not delete the seed data; the seeded profile becomes the fallback when wardrobe is empty.
- The `POST /api/profile` route and any Claude call sites are being removed as part of this ticket (or were already removed) — gates do not assert this directly because the spec marks it as already-done cleanup, but the builder must not re-introduce a network path in `palette.ts`.

## Evaluation History

### Pass 2 — 2026-06-17T04:20:23Z
- GATE-1: PASS — evidence: `ls src/services/styling/palette.ts` ok (21123 bytes); `grep -E "^export (function|const) (aggregatePalette|nameForHex|classifyProfile|classify|computeProfile|paletteFor)" src/services/styling/palette.ts` → 6 matches (nameForHex, aggregatePalette, classifyProfile, computeProfile×3 overloads); forbidden-imports grep `from ['"](react|react-native|expo)` → 0 matches.
- GATE-2: PASS — evidence: `grep -ciE "cognac|camel|sand|espresso|olive|bone|terracotta" src/services/styling/palette.ts` → 15 matches; curated COLOR_NAME_TABLE explicitly contains Cognac, Camel, Sand, Espresso, Olive, Bone, Terracotta; `nameForHex` runs squared-RGB nearest-match over the table.
- GATE-3: PASS — evidence: `grep -E "length.*===.*10|equal.*100|equal.*10" src/services/styling/palette.test.ts` → 6+ matches; node test "aggregatePalette: exactly 10 segments and pcts sum to 100" passed (asserts palette.length===10 and reduce sum===100); also "empty wardrobe still returns 10 segments summing to 100" passed.
- GATE-4: PASS — evidence: `grep -cE "Warm Autumn|Cool Summer|paletteName" src/services/styling/palette.ts` → 16; network grep `fetch\(|XMLHttpRequest|axios` → 0; classifyProfile returns `{paletteName, tagline}` from pure HSL stats; tests "warm-autumn → Warm Autumn / quiet, layered, tactile" and "deterministic — same input, same output" passed.
- GATE-5: PASS — evidence: `generateInsight` returns `You wear ${first} and ${second} a lot. A *soft ${gap} knit* would round out…` — italic `*…*` span literal in source (line 462) and empty-input fallback contains `*soft sage knit*`; test "includes italic *…* emphasis and references real palette colors" passed (asserts the regex `/\*[^*]+\*/` and that the two named colors appear in the wardrobe palette).
- GATE-6: PASS — evidence: `grep -cE "async|Promise<string>|insightGenerator|generator\?:|generate\?:" src/services/styling/palette.ts` → 11; `InsightGenerator = (ctx: InsightContext) => Promise<string>` type exported; `computeProfile` overload signature accepts `options: { insightGenerator?: InsightGenerator }` and returns `StyleProfile | Promise<StyleProfile>`; tests "async insight generator overrides the templated path" and "async generator failure falls back to the templated insight" passed.
- GATE-7: PASS — evidence: `src/store/wardrobe-store.ts` line 12 `import { computeProfile, profileCacheKey } from '@/services/styling/palette';`; `recomputeProfile(items)` memoizes via `lastProfileKey` keyed on `profileCacheKey(items)` (item id + wornCount + swatches) and is called from addItem/updateItem/removeItem/incrementWorn and onRehydrateStorage; state shape `profile: StyleProfile | null` and `setProfile` unchanged (lines 145-146).
- GATE-8: PASS — evidence: `ls src/services/styling/palette.test.ts` ok; `grep -cE "^(\s*)(test|it)\(" src/services/styling/palette.test.ts` → 14; `npm test`/`node --experimental-strip-types --test src/services/styling/palette.test.ts` exited 0, all 14 tests passed (clustering, naming, pct rounding, season mapping, insight reality-check, async seam, cache key invalidation); package.json `test` script already includes palette.test.ts.
- GATE-9: PASS (VISUAL_MATCH) — evidence: started `npx expo start --ios --no-dev --offline`, waited for "iOS Bundled 1789ms" in /tmp/expo-oracle.log, captured `xcrun simctl io booted screenshot /tmp/oracle-visual-check.png` (553577 bytes). Compared against docs/design-screenshots/screen-profile.png: live screen shows STYLE PROFILE header, "Iris Calder" name, "Warm Autumn" pill + "quiet, layered, tactile" tagline, 10-segment palette wheel with warm-autumn colors (cognac/camel/sand/espresso visible) dominating, centered "Warm Autumn" label in wheel, palette legend (Cognac 18%, Camel 15%, Sand 13%, Espresso 11%), stats grid (17 pieces / 5 outfits / 7 worn this month), MOST-WORN SHAPE + UNDERUSED cards, "Most worn this season" TOP 7 grid, bottom tab bar (Closet/Outfits/Coach/You). Differences vs reference (counts: 17/5/7 vs 54/12/28) are intentional — live values now derive from the seeded items via computeProfile, exactly the APP-32 acceptance criterion. Major layout, colors, and components match.
- GATE-10: PASS — evidence: `npm run lint` (`expo lint`) exited 0 with no output (only env load lines).
- GATE-11: PASS — evidence: `npx tsc --noEmit` exited 0 with no output.
