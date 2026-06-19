# Factory Decision Journal — APP-31

Task: Outfit suggestion engine + real vibe score
Started: 2026-06-19T00:00:00Z
Branch: feat/APP-31-outfit-suggestion-engine-real-vibe-score

Append-only. Every agent records every decision here.

## [2026-06-19T12:14:49Z] iter=0 agent=orchestrator event=INIT
- decision: factory armed for APP-31
- why: user invoked /factory with Linear URL https://linear.app/apptryout/issue/APP-31
- evidence: branch feat/APP-31-outfit-suggestion-engine-real-vibe-score created from main @ 29fc7fd

## [2026-06-19T12:14:49Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, task_id=APP-31, status=Todo, priority=High
- why: Linear MCP get_issue returned full description; blocked_by=APP-28 (AI service layer) but task is rewored to be local-only so blocker is not load-bearing
- evidence: Linear MCP response shows blockedBy=[APP-28] but description explicitly states Layer 1 (local heuristic) is primary and ships without server

## [2026-06-19T12:14:49Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: source=local (no Figma URLs in description); references = docs/design-screenshots/screen-outfit.png, component-cards-slots.png, component-palette-stats.png
- why: Linear description contained zero figma.com URLs; project has committed design screenshots in docs/design-screenshots/; outfit/vibe spec references "Editor at large ≈ 92, Sunday slow ≈ 88" reference outfits
- evidence: grep figma.com on description = 0 hits; ls docs/design-screenshots/ shows screen-outfit.png + component breakdowns

## [2026-06-19T12:14:49Z] iter=0 agent=orchestrator event=BRANCH
- decision: branch feat/APP-31-outfit-suggestion-engine-real-vibe-score created
- why: standard factory branch naming; slug derived from title (40 chars exactly)
- evidence: git checkout -b succeeded; working tree was clean before checkout

## [2026-06-19T12:39:35Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 11 gates for APP-31 (9 functional + lint + tsc; VISUAL_MATCH is GATE-9)
- why: The existing src/services/styling/suggest.ts already implements the full Layer-1 heuristic (SLOT_CATEGORIES mapping, harmonyAgainst+seasonScore+freshnessScore ranking, completeness+paletteCohesion+seasonAgreement vibe blend, seeded surpriseLook), and suggest.test.ts already covers all four required cases (empty, full, single-category, clashing) plus determinism. So this task is largely about PRESERVING the contract through any refactor / optional Layer-2 hook, not greenfield. Gates pin: (1) public exports + purity (no fetch/Date.now/Math.random/native imports), (2) slot→category mapping incl. EXTRA→Outerwear|Accessories, (3) all three ranking signals present in scoreCandidate, (4) vibe formula shape, (5) calibration band [88,96] bracketing the 88/92 anchors, (6) the four required tests + npm test green, (7) determinism for both suggestForSlot and surpriseLook, (8) Layer-2 hook is optional (either absent OR optional with sync default — never blocking), (9) VISUAL_MATCH on the Outfit Builder, (10) lint, (11) tsc. Ambiguities resolved: (a) calibration band kept at the existing test's [88,96] rather than tightening to ±2 around 88/92 — over-tight bands break under harmless re-weighting; (b) Layer-2 left non-mandatory per the task's explicit "can ship on Layer 1 alone"; (c) public name pinned to module-level  (store wraps it as ) — tsc gate catches any rename downstream.
- evidence: Read .claude/factory-state.local.md (task: APP-31, figma_count=0, local design screenshots in docs/design-screenshots/); Read src/services/styling/suggest.ts (298 lines, full Layer-1 implementation present); Read src/services/styling/palette.ts (552 lines, sibling APP-32 module — shape conventions referenced); Read src/services/styling/suggest.test.ts (195 lines, 9 tests already cover all four required cases + determinism + surpriseLook); Read src/types/wardrobe.ts (Item/OutfitDraft/Category/Season shapes); ls docs/design-screenshots/ → screen-outfit.png, component-cards-slots.png, component-palette-stats.png present. Wrote .claude/factory-gates.local.md.

## [2026-06-19T12:44:15Z] iter=1 agent=builder event=BUILD
- decision: verify-only iteration; run npm test + lint + tsc and confirm all 11 gates hold against current code
- why: Oracle notes that suggest.ts already implements the full Layer-1 heuristic and suggest.test.ts already covers all four required cases — task is largely preserving the contract. Per orchestrator instructions, this iteration should verify and journal evidence, not write new code. Plan: (1) run all three commands and capture exit codes; (2) spot-check the grep-based gates (1, 2, 3, 4); (3) only modify code if a gate actually fails.
- evidence: working tree clean on branch feat/APP-31-outfit-suggestion-engine-real-vibe-score; src/services/styling/suggest.ts (10538 bytes) and suggest.test.ts (9289 bytes) present

## [2026-06-19T12:45:04Z] iter=1 agent=builder event=SELF_REVIEW
- decision: no code changes; all 10 verifiable gates (GATE-1..8, 10, 11) pass against current code; GATE-9 (visual) is reviewer territory
- why: ran the canonical verification suite end-to-end and spot-checked every grep-based gate. Working tree clean — no stray edits to revert. No styling rule applies (no UI touched). No debug residue (no diff). No deletions.
- evidence: npm test → 23/23 pass, exit 0 (including "vibeScore: empty draft returns exactly 0", "vibeScore: Editor at large / SEED_OUTFITS[0] full draft is in [88, 96]", "suggestForSlot: single-category wardrobe (Tops only) is well-behaved", "vibeScore: clashing palette (red / green / blue / yellow) < cohesive", "suggestForSlot: determinism across repeated calls", "surpriseLook: deterministic full 4-slot draft from a complete wardrobe"). npm run lint exit 0. npx tsc --noEmit exit 0. Grep evidence: GATE-1 → 6 exports + only type import + 0 fetch/Date.now/Math.random; GATE-2 → SLOT_CATEGORIES with extra=['Outerwear','Accessories'] + allowed.has + slotted.has; GATE-3 → harmonyAgainst+seasonScore+freshnessScore all referenced inside scoreCandidate (lines 215-217); GATE-4 → completeness+paletteCohesion+seasonAgreement+Math.round all in vibeScore body (lines 271-275); GATE-8 → 0 Layer-2 surface hits (Layer-2 absent, acceptable per task). git status: clean — no commit needed.

## [2026-06-19T12:46:18Z] iter=1 agent=oracle event=EVAL
- decision: gates 10/11 pass; GATE-9 (VISUAL_MATCH) remains unchecked pending iteration-current simulator screenshot
- why: All Layer-1 heuristic gates (GATE-1..GATE-8) verified statically via grep/Read against src/services/styling/suggest.ts and suggest.test.ts. Lint (expo lint exit 0) and tsc --noEmit (exit 0) re-verified independently. npm test reports 23/23 pass — the calibration band test (Editor at large in [88,96]), determinism tests, and surpriseLook test all pass. GATE-9 left unchecked per orchestrator instruction: no fresh simulator screenshot was captured this iteration. Single remaining blocker is the visual capture.
- evidence: see .claude/factory-gates.local.md "Pass 1" Evaluation History block; commands: `npm test` (23 pass), `npm run lint` (exit 0), `npx tsc --noEmit` (exit 0); grep checks on suggest.ts (exports=6, impure-API matches=0, Layer-2 matches=0).

## [2026-06-19T12:59:44Z] iter=1 agent=reviewer event=REVIEW
- decision: APPROVED
- why: GATE-9 visual verification satisfied. iOS simulator screenshot of Outfit Builder (`/outfits`) captured under EXPO_PUBLIC_AI_MOCK=1 shows the four slot cards (TOP/BOTTOM/SHOES/EXTRA), the vibe ring with a numeric score (80), the "AI suggests for EXTRA" suggestion rail with Shuffle action, the Save look CTA, palette swatches with "Warm autumn, low-contrast" caption, and the tab bar — all matching docs/design-screenshots/screen-outfit.png in warm-autumn paper/cognac palette. Code review of src/services/styling/suggest.ts found no correctness, type-safety, security, or crash bugs: pure module (only `import type`, no Date.now/Math.random/fetch), deterministic seeded jitter for tie-breaks, safe hex parsing with graceful fallback on malformed input, no divide-by-zero paths in rgbToHsl, weights sum to 1.0 in both scoreCandidate and vibeScore, empty draft returns exactly 0. No StyleSheet.create or raw style={{}} in scope (pure service module). All 10 prior Oracle gates already PASS per gates file; visual gate now satisfied.
- evidence: screenshot /tmp/factory-review-screenshot.png (committed to docs/visual-review/simulator-screenshot.png at ce97e46); compared to docs/design-screenshots/screen-outfit.png (header + four slots + vibe ring + suggestion rail + tab bar all present, warm-autumn palette matches); reviewed src/services/styling/suggest.ts lines 1-298 (pure types-only import line 18, deterministic seedJitter lines 175-182, vibeScore early-return 0 on empty draft line 270, Math.round integer clamp line 275, suggestForSlot stable secondary sort by id lines 250-253). No previous review file existed (cycle 1, first reviewer pass).

## [2026-06-19T14:34:27Z] iter=1 agent=orchestrator event=EVAL
- decision: iteration 1 complete; gates 11/11 pass; reviewer APPROVED; proceeding to PR
- why: builder verified 10/11 mechanical gates with npm test (23/23), lint, tsc all green; reviewer captured simulator screenshot under EXPO_PUBLIC_AI_MOCK=1 mode, committed to docs/visual-review/simulator-screenshot.png, and confirmed visual match against docs/design-screenshots/screen-outfit.png (4 slot cards, vibe ring with score 80, suggestion rail, warm-autumn palette all present); GATE-9 flipped to checked
- evidence: HEAD ce97e46a896b1ffdafa93bc1818b629e1e9f7fff; commit ce97e46 (visual review screenshot); gates_passed=11 in .claude/factory-gates.local.md

---

# Final Gate State

---
task_id: APP-31
gates_total: 11
gates_passed: 11
evaluated_at: "2026-06-19T15:01:00Z"
---

# Acceptance Gates for APP-31

## Gates

- [x] GATE-1: `src/services/styling/suggest.ts` exposes the preserved public API AND stays a pure offline module. Check: `grep -nE '^export (function|type|const) (suggestForSlot|vibeScore|surpriseLook|colorDistance|paletteCohesion|Slot)\b' src/services/styling/suggest.ts` returns at least 6 matches (the five values + the `Slot` type). The module imports ONLY type symbols from outside its own file — `grep -nE "^import " src/services/styling/suggest.ts` shows no runtime imports from `react`, `react-native`, `expo`, `@/`, or any network module; only `import type` lines are allowed. `grep -nE "fetch\(|XMLHttpRequest|Date\\.now|Math\\.random" src/services/styling/suggest.ts` returns ZERO matches (determinism via `seedJitter`, not wall-clock or PRNG).

- [x] GATE-2: Slot candidate filtering uses the category mapping TOP→Tops, BOTTOM→Bottoms, SHOES→Shoes, EXTRA→Outerwear|Accessories, and excludes already-slotted items. Check: `grep -n "SLOT_CATEGORIES\|allowed\.has\|slotted\.has" src/services/styling/suggest.ts` shows the mapping object AND a filter step that excludes the current draft's item ids; the EXTRA mapping array contains both `'Outerwear'` and `'Accessories'`.

- [x] GATE-3: Ranking signals are present and combined: color harmony against draft swatches, season compatibility, and a recency / wornCount freshness boost. Check: `grep -nE "harmonyAgainst|seasonScore|freshnessScore|wornCount" src/services/styling/suggest.ts` returns at least 4 matches across distinct helpers, AND the `scoreCandidate` function body references all three signals.

- [x] GATE-4: `vibeScore(draft, items)` is a weighted blend of completeness + palette cohesion + season agreement that returns exactly `0` for an empty draft and an integer in `0..100` otherwise. Check: `grep -nE "completeness|paletteCohesion|seasonAgreement|Math\\.round" src/services/styling/suggest.ts` shows all four terms inside the `vibeScore` function body.

- [x] GATE-5: Calibration — the canonical full cohesive look (SEED_OUTFITS[0] "Sunday slow" padded to 4 slots with accessory `i6`) scores within the design's reference band `[88, 96]`, bracketing both anchors (Editor at large ≈ 92, Sunday slow ≈ 88). Check: the existing test `vibeScore: Editor at large / SEED_OUTFITS[0] full draft is in [88, 96]` in `src/services/styling/suggest.test.ts` passes under `npm test`.

- [x] GATE-6: Required unit-test cases exist in `src/services/styling/suggest.test.ts` covering: (a) empty draft → 0, (b) full cohesive draft in [88,96], (c) single-category wardrobe (Tops only) returns only Tops candidates and a zero score for an empty draft, (d) clashing palette (red/green/blue/yellow) strictly less than cohesive. Check: `grep -ncE "empty draft|full draft|single-category|clashing" src/services/styling/suggest.test.ts` returns ≥ 4 AND `npm test` exits 0.

- [x] GATE-7: Determinism — `suggestForSlot(slot, items, draft, seed)` returns the same order across repeated calls for the same `(slot, items, draft, seed)`, AND `surpriseLook` is deterministic for a given seed. Check: both the `suggestForSlot: determinism across repeated calls` test and the `surpriseLook: deterministic full 4-slot draft from a complete wardrobe` test are present in `suggest.test.ts` and pass under `npm test`.

- [x] GATE-8: Optional Layer 2 hook is non-blocking. Either (a) NO Layer-2 surface exists in `suggest.ts` (acceptable — task says it's optional) — `grep -nE "executorch|onDeviceRerank|llmRerank|insightGenerator" src/services/styling/suggest.ts` returns 0 matches; OR (b) if a Layer-2 seam exists, it is an optional argument with a synchronous default path that returns the heuristic result when no model is loaded — verified by `npm test` passing with no model present AND by the public signatures of `suggestForSlot` / `vibeScore` / `surpriseLook` remaining unchanged (GATE-1 + the TypeScript gate catch any breakage).

- [x] GATE-9: VISUAL_MATCH — Live iOS simulator screenshot of the Outfit Builder (taken in `EXPO_PUBLIC_AI_MOCK=1` mode) matches `docs/design-screenshots/screen-outfit.png`: the four slot cards, the vibe ring with a numeric score, and the suggestion rail are all present; colors are in the warm-autumn family (paper/cream backgrounds, cognac/camel accents) per `src/theme/tokens.ts`; no major component from the design is missing.

- [x] GATE-10: lint passes (`npm run lint` exits 0).

- [x] GATE-11: TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

**Scope read.** The existing `src/services/styling/suggest.ts` already implements the full Layer-1 heuristic: SLOT→Category mapping, harmony+season+freshness ranking with deterministic `seedJitter` tie-breaks, completeness+cohesion+season vibe blend, and `surpriseLook`. The existing `suggest.test.ts` already covers all four required cases plus determinism and `surpriseLook`. So this task is largely about **preserving and verifying** the contract — not greenfield implementation. The gates pin the public surface, the purity guarantee, the calibration band, the four required test cases, and the determinism property — they will catch the kinds of regressions a refactor or a Layer-2 hook addition could introduce.

**Calibration band.** The task says "≈92 / ≈88". The existing test fixture's "Sunday slow" + i6-pad outfit was tuned by the original author to land in [88,96], which brackets both anchors. We keep that band — widening it would let regressions through, tightening it would over-specify the blend weights.

**Layer 2.** The task description explicitly says Layer 2 is optional and non-blocking ("Related to APP-35; this ticket can ship on Layer 1 alone without it"). GATE-9 accepts EITHER no Layer-2 code (current state) OR a properly optional hook that defaults synchronously to Layer 1. We do not force a Layer-2 hook to be added.

**Purity gate (GATE-2).** Layer 1 must stay deterministic so the rail produces the same order on every re-render and tests stay stable. We forbid `Date.now` / `Math.random` and any network/native import — the module already uses a `seedJitter` helper for tie-breaks, which is the right pattern.

**Public surface naming.** The task says "the same signature the store already exposes" via `vibeScoreFor`. The module-level export is `vibeScore`; the store presumably wraps it as `vibeScoreFor`. We pin the module-level export name `vibeScore` (current state) — renaming it would break the store wrapper and `tsc` would catch that (GATE-12).

**Visual gate.** The task is mostly service-layer, but the Outfit Builder consumes `vibeScore` / `suggestForSlot`, so a visible regression (e.g. the rail disappearing or the vibe ring breaking) surfaces on screen. GATE-10 is low-strictness — components present, colors in the right family, no missing major elements — not pixel-perfect.

**Risks the builder should watch.**
- Rewiring `vibeScore` weights and pushing the calibration outside [88,96] → GATE-6.
- Adding `Math.random` or `Date.now` for "Shuffle" diversity instead of seeded jitter → GATE-2 and GATE-8.
- Removing or renaming a public export while refactoring → GATE-1 and GATE-12.
- Adding a non-optional Layer-2 hook that requires a loaded model → GATE-9 and GATE-7 (tests run without a model).

## Evaluation History

### Pass 1 — 2026-06-19T12:46:18Z
- GATE-1: PASS — evidence: `grep '^export ...' suggest.ts` → 6 matches (Slot type, colorDistance, paletteCohesion, suggestForSlot, vibeScore, surpriseLook); `grep '^import' suggest.ts` → 1 line, only `import type { Category, Item, OutfitDraft, Season } from '../../types/wardrobe'`; `grep 'fetch\(|XMLHttpRequest|Date\.now|Math\.random' suggest.ts` → 0 matches.
- GATE-2: PASS — evidence: `grep 'SLOT_CATEGORIES|allowed\.has|slotted\.has' suggest.ts` → 3 matches (line 27 mapping with `extra: ['Outerwear', 'Accessories']`, line 237 allowed.has, line 240 !slotted.has filter).
- GATE-3: PASS — evidence: `grep 'harmonyAgainst|seasonScore|freshnessScore|wornCount' suggest.ts` → 7 matches across 3 helpers; `scoreCandidate` body (lines 209-221) invokes all three.
- GATE-4: PASS — evidence: `vibeScore` body (lines 268-276) contains `completeness`, `paletteCohesion` (via `cohesion = paletteCohesion(...)`), `seasonAgreement` (via `season = seasonAgreement(...)`), `Math.round`; line 270 returns 0 on empty draft.
- GATE-5: PASS — evidence: `npm test` shows `✔ vibeScore: Editor at large / SEED_OUTFITS[0] full draft is in [88, 96]` passing.
- GATE-6: PASS — evidence: `grep -ncE 'empty draft|full draft|single-category|clashing' suggest.test.ts` → 13 (≥ 4); npm test exit 0 with 23/23 pass.
- GATE-7: PASS — evidence: `npm test` shows `✔ suggestForSlot: determinism across repeated calls` and `✔ surpriseLook: deterministic full 4-slot draft from a complete wardrobe`.
- GATE-8: PASS — evidence: `grep 'executorch|onDeviceRerank|llmRerank|insightGenerator' suggest.ts` → 0 matches; the module has no Layer-2 surface, which the gate explicitly accepts (option a).
- GATE-9: NOT EVALUATED — VISUAL_MATCH gate intentionally left unchecked per orchestrator note: builder has not yet captured an iteration-current simulator screenshot. The pre-existing `docs/visual-review/simulator-screenshot.png` predates this evaluation cycle.
- GATE-10: PASS — evidence: `npm run lint` (expo lint) exit 0, no output.
- GATE-11: PASS — evidence: `npx tsc --noEmit` exit 0, no output.
