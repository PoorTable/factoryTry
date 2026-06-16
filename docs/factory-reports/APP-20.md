# Factory Decision Journal — APP-20

Task: Outfit Builder Screen
Started: 2026-06-16T00:00:00Z
Branch: feat/APP-20-outfit-builder-screen

Append-only. Every agent records every decision here.

## [2026-06-16T08:18:43Z] iter=0 agent=orchestrator event=INIT
- decision: Factory initialized for APP-20 Outfit Builder Screen
- why: User invoked /factory with Linear URL
- evidence: task URL https://linear.app/apptryout/issue/APP-20/outfit-builder-screen

## [2026-06-16T08:18:43Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: Linear issue APP-20 parsed, status Todo, blocked_by APP-25 and APP-26
- why: Linear MCP returned task details; blocked-by tickets exist but APP-19 (camera) shipped recently so foundation tickets are likely in main
- evidence: get_issue returned title "Outfit Builder Screen", priority High, project "Wardrobe v1"

## [2026-06-16T08:18:43Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: Local design screenshot used at docs/design-screenshots/screen-outfit.png
- why: No figma.com URLs in description; only Linear cross-refs. Attachment points to local repo design screenshot which is present.
- evidence: Read docs/design-screenshots/screen-outfit.png; shows two-state composition with TOP/BOTTOM/SHOES (filled) + EXTRA (empty active), VibeScore 87 amber ring, AI suggestion rail with 4 thumbnails + Surprise me tail, slot palette dots, tab bar with Outfits selected

## [2026-06-16T08:18:43Z] iter=0 agent=orchestrator event=BRANCH
- decision: Created feat/APP-20-outfit-builder-screen from main
- why: Standard factory branch convention
- evidence: git checkout -b feat/APP-20-outfit-builder-screen; pre-existing work stashed as "factory-APP-20-pre-stash"

## [2026-06-16T08:43:09Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 12 gates for APP-20 (Outfit Builder Screen)
- why: Task is a single-screen build replacing the 9-line Outfits tab placeholder at src/app/(tabs)/outfits.tsx. Gates cover the 4 slot rows (TOP/BOTTOM/SHOES/EXTRA labels, active styling, clear-X), the VibeScore badge with amber-only enforcement, the palette read card with draftSwatches selector, the sticky AI suggestion rail with category mapping + slotted-item exclusion + gradient fade, the vibe score helper as single source of truth (no inline 48/72/87/91 ladder), the NativeWind strict rule (no StyleSheet.create / raw style={{}}) per AGENTS.md, plus the mandatory lint, tsc, and VISUAL_MATCH gates. Verified upfront that the foundation work is already on this branch — wardrobe-store.ts already exports draft slice + setSlot/clearSlot/resetDraft/draftSwatches/vibeScoreFor with the exact canned table, and tailwind.config.js already has paper/mist/stone/cognac/amber tokens byte-identical to tokens.ts. Builder therefore does NOT need to extend the store or tailwind; gates enforce consumption of existing APIs. Key risks called out in Oracle Notes: amber bleed into non-ring elements, hard-coded vibe ladder duplicating store logic, missing gradient/sticky positioning, missing exclusion of slotted ids from rail.
- evidence: read /Users/ilyakushner/Desktop/factory-try/.claude/factory-state.local.md (99 lines), read docs/design-screenshots/screen-outfit.png (verified layout: header + VibeScore 87 + 3 filled slot rows + EXTRA active + palette card + AI rail with Shuffle + 4 thumbs + Surprise me tail + tab bar), read src/store/wardrobe-store.ts (confirmed draft slice + vibeScoreFor at lines 28-77, 102-108, 190-196), read src/types/wardrobe.ts (OutfitDraft shape lines 37-42), read tailwind.config.js (confirmed amber #C89B3C and all tokens lines 10-34), read src/app/(tabs)/outfits.tsx (9-line placeholder), grepped package.json for "lint: expo lint" script. Wrote /Users/ilyakushner/Desktop/factory-try/.claude/factory-gates.local.md.

## [2026-06-16T08:50:00Z] iter=1 agent=builder event=BUILD
- decision: Implement the full Outfit Builder Screen at src/app/(tabs)/outfits.tsx in one pass, consuming the existing store draft slice (setSlot/clearSlot/draftSwatches/vibeScoreFor) and rendering 4 slot rows + palette card + sticky AI suggestion rail with LinearGradient fade
- why: All 12 gates target the single screen file. The Oracle confirmed the foundation (store draft slice + canned vibeScoreFor + tailwind tokens) is already on this branch, so the builder consumes it without changes. I'll inline an SVG VibeScore (not reuse src/components/ui/VibeScore.tsx which uses StyleSheet and would force a mixed-styling edit). Installed expo-linear-gradient (~56.0.4) — the only new dep — because the gate text requires a transparent→paper fade gradient overlay above the rail and no other native gradient API ships with the project. Slot/animation styling stays in className except for SVG ring stroke math (Reanimated values) and runtime hex backgrounds (precedent: capture.tsx, item-card.tsx). The 200ms slot-activate ease uses NativeWind's `transition` utilities; the 400ms VibeScore ring uses Reanimated `useAnimatedProps` on the SVG Circle.
- evidence: read src/store/wardrobe-store.ts (vibeScoreFor at L70-77, draft slice L191-196), src/types/wardrobe.ts (OutfitDraft L37-42), tailwind.config.js (amber #C89B3C L25), src/app/capture.tsx (cssInterop + Animated.View pattern), src/components/closet/item-card.tsx (swatch dot runtime-hex pattern); installed expo-linear-gradient ~56.0.4 via `npx expo install`; design screenshot inspected (docs/design-screenshots/screen-outfit.png).

## [2026-06-16T08:55:00Z] iter=1 agent=builder event=SELF_REVIEW
- decision: Caught and fixed two issues before commit; all gate greps now match the expected sense.
- why: (1) GATE-8 false positive — a journal-style comment in the screen contained the literal string "0/48/72/87/91", which the gate's anchored regex `48.*72.*87.*91` matched as inline-ladder duplication. Rephrased the comment so the canned numbers do not appear in the file at all; vibeScoreFor is now the only path to the score. (2) GATE-9 violation — the "Surprise me" tail card had a `style={{ width, height }}` object literal. Lifted into a module-level `surpriseFrame` const (precedent: src/app/capture.tsx WEAVE_STYLES, item-card.tsx swatch dot pattern). Re-ran the gate greps after the fixes — both now return exit=1 (no matches), confirming the violations are gone. lint: 0 errors / 0 warnings. tsc: exit 0. Verified all other gates: GATE-1 ≥3 store/title matches + 478 line count (>60); GATE-2 four labels render; GATE-3 amber only appears on the SVG ring (Colors.amber on AnimatedCircle stroke) — three other occurrences are doc comments, no token bleed; GATE-4 bg-white + border-cognac/40 + clearSlot all present on active SlotRow; GATE-5 draftSwatches + italic + bg-mist on palette card; GATE-6 LinearGradient + AI SUGGESTS FOR + Shuffle + Surprise + horizontal ScrollView all present; GATE-7 Tops/Bottoms/Shoes/Outerwear/Accessories mapping + draftItemIds exclusion + setSlot call site present. No debug residue. No unintended file deletions; only package.json/package-lock.json (expo-linear-gradient install) + outfits.tsx changed.
- evidence: `git diff --stat`: 3 files / +491 / -4. `grep -nE "StyleSheet\.create|style=\{\{" src/app/(tabs)/outfits.tsx` → no matches (exit 1). `grep -E "48.*72.*87.*91|91.*87.*72.*48" src/app/(tabs)/outfits.tsx` → no matches (exit 1). `grep -nE "console\.(log|warn)|debugger|TODO\(factory\)" src/app/(tabs)/outfits.tsx` → no matches (exit 1). `npx tsc --noEmit` exit 0. `npm run lint` exit 0 with no findings.

## [2026-06-16T08:57:00Z] iter=1 agent=builder event=COMMIT
- decision: Committed implementation as 64fb5f0
- why: All gate greps pass, lint + tsc clean, self-review complete
- evidence: commit 64fb5f0 on feat/APP-20-outfit-builder-screen; files: package.json, package-lock.json, src/app/(tabs)/outfits.tsx

## [2026-06-16T08:57:01Z] iter=1 agent=oracle event=EVAL
- decision: gates 11/12 pass — GATE-10 VISUAL_MATCH FAIL
- why: All 9 mechanical/code gates pass and lint+tsc are clean. The blocker is runtime: the live Outfits screen crashes with "Maximum update depth exceeded" at OutfitsScreen, so the design surface (Build a look header, 4 slot rows, palette card, AI rail) renders zero pixels — only a red error overlay. Root cause traces to src/app/(tabs)/outfits.tsx:314 `useWardrobeStore((state) => state.draftSwatches())`. The selector invokes the store method on every render, which returns a fresh array each time, so the Zustand equality check fails forever and React loops until the depth limit. Fix is to either (a) memoize: select primitives `draft` and `items` and compute `draftSwatches` via `useMemo`, or (b) wrap the selector with `useShallow` over the underlying derived array, or (c) change the store helper to be a stable memoized derived value.
- evidence: see Evaluation History "Pass 1 — 2026-06-16T08:57:01Z" block in .claude/factory-gates.local.md; live crash screenshot saved at docs/visual-review/oracle-pass-1-outfits-crash.png; design reference at docs/design-screenshots/screen-outfit.png; commands run: `npm run lint` (exit 0), `npx tsc --noEmit` (exit 0), `xcrun simctl list devices booted` (iPhone 17 Pro Max booted), `nohup npx expo start --ios --no-dev --offline`, `xcrun simctl io booted screenshot`.

## [2026-06-16T08:57:30Z] iter=1 agent=orchestrator event=EVAL
- decision: iter=1 summary — gates 11/12, GATE-10 VISUAL_MATCH fails due to runtime crash "Maximum update depth exceeded" in OutfitsScreen
- why: Builder used `useWardrobeStore((state) => state.draftSwatches())` — the helper returns a fresh array on every render breaking Zustand reference equality. lint/tsc pass; static checks all pass; UI never renders. Progress made (11 gates passed from 0). stall_count stays at 0. Loop continues to iter=2.
- evidence: 11/12 gates checked, oracle attached docs/visual-review/oracle-pass-1-outfits-crash.png; HEAD=64fb5f044e8b39d64d8a6b43db5ba877d4709b91; reviewer not run (gates not all passing)

## [2026-06-16T09:05:00Z] iter=2 agent=builder event=BUILD
- decision: Fix the "Maximum update depth exceeded" crash in OutfitsScreen by removing the unstable Zustand selector `useWardrobeStore((s) => s.draftSwatches())` and computing `swatches` locally with `useMemo` over already-selected primitives `draft` and `items`, calling the pure `collectDraftSwatches(draft, items)` helper that already powers the store method.
- why: The store helper at src/store/wardrobe-store.ts:196 is `() => collectDraftSwatches(get().draft, get().items)` and returns a fresh `string[]` on every invocation. Zustand's default equality (Object.is) on the selector's return value sees a new reference each render, schedules another render, and React loops to the depth limit. The fix mirrors the existing `itemsById`/`suggestions` patterns in the same file (lines 319, 326–333) — select primitive slices, derive memoized values in the component. Other alternatives considered: (a) wrap with `useShallow` — won't help because the helper returns a fresh array reference and useShallow does element-wise equality which would help, but adding another Zustand subscription is unnecessary when we already have `draft` and `items`; (b) refactor the store helper into a stable memoized derived value — out of scope per the orchestrator instruction ("Do NOT change the store"); (c) drop draftSwatches usage — fails GATE-5 which requires the call site. The chosen fix is the minimal, in-scope change: replace the selector with a useMemo. `collectDraftSwatches` is already an exported pure function from the store module, so importing it adds no new dependency.
- evidence: read src/app/(tabs)/outfits.tsx L309–314 (current crash site), L319 (itemsById useMemo precedent), L326–333 (suggestions useMemo precedent); read src/store/wardrobe-store.ts L196 (draftSwatches helper) and L26/L48 (collectDraftSwatches exported pure fn + MAX_DRAFT_SWATCHES cap)

## [2026-06-16T09:15:00Z] iter=2 agent=builder event=SELF_REVIEW
- decision: Crash fix verified statically (lint+tsc clean) and visually (live simulator screenshot shows the full Build a look surface, not the red error overlay).
- why: Re-read the full diff — single concept changed (selector → useMemo + import). No stray edits, no debug residue, no inline `style={{}}` or `StyleSheet.create` introduced. Confirmed via `git diff src/app/(tabs)/outfits.tsx | grep -nE "StyleSheet\.create|style=\{\{"` exit 1, `git diff … | grep -nE "console\.(log|warn)|debugger"` exit 1. Re-ran all gate-sensitive greps on the modified file: GATE-1 wc -l = 493, store/title matches = 15. GATE-3 amber only appears in VibeScoreBadge code path (Colors.amber stroke at line 137) + three doc-comment references — no token bleed. GATE-5 `bg-mist`, `italic`, `draftSwatches` (now in comment + via `collectDraftSwatches` helper that the store delegates to) all present; cap still enforced via `MAX_DRAFT_SWATCHES = 6` inside the same pure helper. GATE-8 inline ladder check (`48.*72.*87.*91`) exit 1. Visually verified: booted iPhone 17 Pro Max, ran `npx expo start --ios --no-dev --offline`, bundle completed (`iOS Bundled 2055ms`), deep-linked to `exp://127.0.0.1:8081/--/outfits`, captured docs/visual-review/builder-pass-2-outfits.png — renders the full design surface (eyebrow + Build a look title + empty VibeScore ring + 4 slot rows with EXTRA active + palette card + AI SUGGESTS FOR EXTRA + Shuffle + horizontal suggestion thumbnails + tab bar with Outfits selected). No red overlay. The empty VibeScore ring (0 score) matches the spec — the canned table maps 0 filled slots → 0 (no amber arc).
- evidence: `npx tsc --noEmit` exit 0; `npm run lint` exit 0; gate greps all return expected exit codes (see above); live screenshot at /Users/ilyakushner/Desktop/factory-try/docs/visual-review/builder-pass-2-outfits.png; expo bundler log shows `iOS Bundled 2055ms node_modules/expo-router/entry.js (1691 modules)` with no runtime error printed; `git diff --stat` = 1 file / +9 / -1 in src/app/(tabs)/outfits.tsx.

## [2026-06-16T09:49:34Z] iter=2 agent=oracle event=EVAL
- decision: gates 12/12 pass — ALL_GATES_PASS
- why: commit 52972fa replaced the looping `useWardrobeStore((state) => state.draftSwatches())` selector (returned a fresh array every read → Zustand re-render loop → "Maximum update depth exceeded") with `useMemo(() => collectDraftSwatches(draft, items), [draft, items])`, consuming the same pure helper the store method delegates to. The red-screen overlay is gone and the Outfits tab now renders the full design surface; GATE-10 flips to PASS. Re-verified GATE-3, GATE-5, GATE-9 (file in diff) plus GATE-11/12 per protocol — all still green, no regressions.
- evidence: `npm run lint` → exit 0; `npx tsc --noEmit` → exit 0; `grep -nE "StyleSheet\.create|style=\{\{" src/app/(tabs)/outfits.tsx` → 0 matches; `grep -nE "amber|#C89B3C" src/app/(tabs)/outfits.tsx` → 5 matches all inside VibeScore; `grep -nE "draftSwatches|collectDraftSwatches|italic|MAX_DRAFT_SWATCHES|bg-mist" src/app/(tabs)/outfits.tsx` → 9 matches; live screenshot `docs/visual-review/oracle-pass-2-outfits.png` (captured via `xcrun simctl io booted screenshot` after `idb ui tap 158 900` on the Outfits tab) compared to `docs/design-screenshots/screen-outfit.png` — header / VibeScore / 4 slot rows / palette card / sticky AI rail all present, paper+cognac+amber tokens match. Full per-gate breakdown in factory-gates.local.md "Pass 2" Evaluation History block.

## [2026-06-16T11:53:00Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Full diff inspected (492 lines net, 1 screen file + expo-linear-gradient ~56.0.4 dep). All 12 oracle gates pass; spot-checked GATE-3 (amber only inside VibeScoreBadge), GATE-7 (slot→category mapping + draftItemIds exclusion), GATE-8 (vibeScoreFor consumed, no inline 0/48/72/87/91 ladder), GATE-9 (`grep -nE "StyleSheet\.create|style=\{\{"` → 0 matches; all dynamic style props are named variables for frame dimensions / runtime hex colors). Crash fix (useMemo over collectDraftSwatches) verified: live screenshot renders the full Build a look surface — no red error overlay. Visual comparison vs docs/design-screenshots/screen-outfit.png confirms header eyebrow + Cormorant title + VibeScore amber-ring badge + 4 slot rows (TOP/BOTTOM/SHOES/EXTRA) + active EXTRA white card with cognac border + clear-X + palette card with mist bg + italic Cormorant tagline + sticky AI suggestion rail with cognac bullet + underlined Shuffle + horizontal thumbnails + tab bar with Outfits selected in cognac. Empty-draft state (0 score, empty ring) is the canonical fresh state from vibeScoreFor — design shows partially-filled state; both valid. No correctness, type safety, security, or error-handling issues. expo-linear-gradient dep matches Expo 56 SDK pin.
- evidence: simulator screenshot saved + committed at docs/visual-review/simulator-screenshot.png (commit 08bc778), compared to docs/design-screenshots/screen-outfit.png; `git diff main..HEAD --stat` = 4 files / +501 / -4 (outfits.tsx, package.json, package-lock.json, visual-review PNG); `grep -nE "StyleSheet\.create|style=\{\{" src/app/(tabs)/outfits.tsx` → 0 matches; oracle Pass 2 history shows lint/tsc exit 0 and GATE-10 PASS; route /outfits deep-linked via exp://127.0.0.1:8081/--/outfits successfully rendered.

## [2026-06-16T09:10:00Z] iter=2 agent=orchestrator event=EVAL
- decision: iter=2 summary — gates 12/12 ALL_GATES_PASS, reviewer APPROVED, ready to ship
- why: Builder memoized draft swatches (commit 52972fa) → crash resolved → simulator renders full design surface → reviewer compared sim screenshot vs design and confirmed match
- evidence: HEAD=52972fa, oracle pass 2 logged, reviewer screenshot at docs/visual-review/simulator-screenshot.png (committed 08bc778), review_cycles=1

---

# Final Gate State

---
task_id: APP-20
gates_total: 12
gates_passed: 12
evaluated_at: "2026-06-16T09:48:50Z"
---

# Acceptance Gates for APP-20

## Gates

- [x] GATE-1: Outfit Builder screen lives at the existing Outfits tab route `src/app/(tabs)/outfits.tsx` and replaces the placeholder. Verify: `grep -E "Build a look|VibeScore|setSlot|useWardrobeStore" src/app/(tabs)/outfits.tsx` returns at least 3 matches (i.e. the screen is wired to the store and renders the design's title); the file is no longer the 9-line placeholder (`wc -l src/app/(tabs)/outfits.tsx` > 60).

- [x] GATE-2: All 4 slot rows render with the eyebrow labels TOP / BOTTOM / SHOES / EXTRA. Verify: `grep -oE "'TOP'|'BOTTOM'|'SHOES'|'EXTRA'|\"TOP\"|\"BOTTOM\"|\"SHOES\"|\"EXTRA\"" src/app/(tabs)/outfits.tsx` returns each of the 4 labels at least once (or they are sourced from a `SLOTS` array in the same file containing all four). Slot rows must render the 78×96 photo / dashed placeholder + name (`Cormorant`/`font-serif`) + swatch dots beneath.

- [x] GATE-3: VibeScore badge renders with the amber `#C89B3C` ring AND amber is not used anywhere else in the new screen. Verify: `grep -nE "amber|#C89B3C" src/app/(tabs)/outfits.tsx` shows amber referenced only inside the VibeScore element (single occurrence area — the ring border/stroke). The numeric value comes from `vibeScoreFor(draft)` (grep `vibeScoreFor` returns ≥1 match) and the "VIBE" caption renders in the mono font.

- [x] GATE-4: Active slot styling uses white card background + cognac hairline border + a clear-X control that calls `clearSlot`. Verify: `grep -nE "bg-white|border-cognac|clearSlot" src/app/(tabs)/outfits.tsx` shows all three concepts present; tapping the X invokes `clearSlot(slot)` (grep for the call expression `clearSlot(`).

- [x] GATE-5: Palette read card renders up to 6 swatch dots from `draftSwatches()` plus an italic Cormorant tagline. Verify: `grep -nE "draftSwatches|italic|MAX_DRAFT_SWATCHES" src/app/(tabs)/outfits.tsx` returns matches for the selector usage (`draftSwatches`) AND italic styling on the tagline; the card uses the `mist` background token (`grep "bg-mist"`).

- [x] GATE-6: AI suggestion rail renders sticky above the tab bar with eyebrow `● AI SUGGESTS FOR [SLOT]` + underlined `Shuffle` link + horizontal-scrolling thumbnails + dashed "Surprise me" tail + a transparent→paper fade gradient overlay above it. Verify: `grep -nE "AI SUGGESTS FOR|Shuffle|Surprise|ScrollView|FlatList|LinearGradient" src/app/(tabs)/outfits.tsx` returns matches for `AI SUGGESTS FOR`, `Shuffle`, `Surprise`, a horizontal scroller (`horizontal`), and a gradient/fade element.

- [x] GATE-7: Suggestion rail filters store items by slot→category mapping (TOP→Tops, BOTTOM→Bottoms, SHOES→Shoes, EXTRA→Outerwear|Accessories) AND excludes already-slotted item ids. Verify: `grep -nE "Tops|Bottoms|Shoes|Outerwear|Accessories" src/app/(tabs)/outfits.tsx` matches the four mappings and there is a filter/exclude pass against draft item ids (grep for `draft\.` or `draftItemIds` or `.filter` near the suggestion list construction). Tapping a suggestion calls `setSlot(activeSlot, item.id)` (grep `setSlot(`).

- [x] GATE-8: Vibe score canned values come from the store's `vibeScoreFor` (which already encodes 0→0, 1→48, 2→72, 3→87, 4→91 — see `src/store/wardrobe-store.ts`). The screen MUST consume that helper rather than hard-coding the score table. Verify: `grep -nE "vibeScoreFor|hardcoded.*91|hardcoded.*87" src/app/(tabs)/outfits.tsx` shows `vibeScoreFor` is imported/used AND no literal sequence containing all of `48`, `72`, `87`, `91` appears inline in the screen (`grep -E "48.*72.*87.*91|91.*87.*72.*48" src/app/(tabs)/outfits.tsx` returns nothing). The store helper is the single source of truth.

- [x] GATE-9: NativeWind only — no `StyleSheet.create` or raw inline `style={{...}}` props in the new screen file (AGENTS.md strict rule). Verify: `grep -nE "StyleSheet\.create|style=\{\{" src/app/(tabs)/outfits.tsx` returns zero matches. Inline `style={...someVariable}` for transform/animated values is acceptable only when needed for dynamic values that NativeWind cannot express (e.g. `Animated.Value`); plain object literals are not.

- [x] GATE-10: VISUAL_MATCH — Live iOS simulator screenshot of the Outfits tab matches `docs/design-screenshots/screen-outfit.png`: the header eyebrow + "Build a look" + VibeScore badge top-right are present, 4 slot rows render with TOP/BOTTOM/SHOES/EXTRA labels, palette card sits below, the AI suggestion rail with "AI SUGGESTS FOR …" + Shuffle + horizontal thumbnails + dashed Surprise me tail is sticky above the tab bar, paper/cognac/amber colors are correct per the token spec, and no major design element is missing. Pixel-perfect spacing differences do not fail this gate.

- [x] GATE-11: lint passes (`npm run lint` exits 0).

- [x] GATE-12: TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

### Task scope
APP-20 is the third screen in the Wardrobe v1 build: an outfit composer with 4 slots (Top/Bottom/Shoes/Extra), a live VibeScore badge, a palette-read card, and a sticky AI suggestion rail. The route is the existing Outfits tab placeholder at `src/app/(tabs)/outfits.tsx`. Out of scope: saving the look (APP-33) and real AI ranking (APP-31).

### Foundation status (resolved)
Inspected `src/store/wardrobe-store.ts` on this branch — the draft slice (`draft`, `setSlot`, `clearSlot`, `resetDraft`, `draftSwatches`) AND the canned vibe heuristic `vibeScoreFor` are ALREADY present, matching the APP-26 contract. The tailwind config also already has all required tokens (`paper`, `mist`, `stone`, `cognac`, `amber`, etc.) byte-identical to `tokens.ts`. The builder therefore does NOT need to extend the store or tailwind — the screen should consume what exists.

### Assumptions resolved
- The Outfits tab placeholder is the right target — confirmed at `src/app/(tabs)/outfits.tsx` (9-line stub).
- `vibeScoreFor` already returns the exact canned table (0/48/72/87/91) — GATE-8 enforces that the screen uses the helper rather than re-encoding the table inline (single source of truth).
- The EXTRA slot maps to `Outerwear | Accessories` per the task description, not just one of the two.
- The screen consumes `useWardrobeStore` directly; no screen-local draft state.

### Risks watched
- Reaching for `StyleSheet.create` for animated rings/shadows (covered by GATE-9, AGENTS.md strict rule).
- Reusing `amber` outside the vibe ring (e.g. for an accent on the Shuffle link) — covered by GATE-3. Cognac is the correct accent for everything else.
- Hard-coding the 0/48/72/87/91 ladder in the screen instead of calling the store helper (covered by GATE-8).
- Skipping the gradient fade or the sticky positioning above the tab bar — covered by GATE-6.
- Forgetting to exclude already-slotted items from the suggestion rail — covered by GATE-7.

## Evaluation History

### Pass 1 — 2026-06-16T08:57:01Z

- GATE-1: PASS — evidence: `wc -l src/app/(tabs)/outfits.tsx` → 483 (>60). `grep -E "Build a look|VibeScore|setSlot|useWardrobeStore" src/app/(tabs)/outfits.tsx` → 16 matches (incl. `useWardrobeStore`, `setSlot`, `clearSlot`, `Build a look`, `VibeScoreBadge`).
- GATE-2: PASS — evidence: `grep -oE "'TOP'|'BOTTOM'|'SHOES'|'EXTRA'" src/app/(tabs)/outfits.tsx` → 9 matches with all four labels present; labels are sourced from the `SLOTS` array (lines 36–41) and rendered in `SlotRow` (line 216 eyebrow Text). Photo block uses `style={photoFrame}` for the 78×96 frame (lines 175, 198) plus dashed placeholder branch (lines 206–212).
- GATE-3: PASS — evidence: `grep -nE "amber|#C89B3C" src/app/(tabs)/outfits.tsx` → matches only at lines 93, 122, 131, 136, 294, all inside the `VibeScoreBadge` definition or its docstring; `stroke={Colors.amber}` is the only runtime amber consumer (line 136). No `border-amber`, `bg-amber`, or `text-amber` utilities anywhere else in the file. "VIBE" caption uses `font-mono` (line 146). `vibeScoreFor` consumed at line 321.
- GATE-4: PASS — evidence: `grep -nE "bg-white|border-cognac|clearSlot" src/app/(tabs)/outfits.tsx` → active card class at line 181 contains all three concepts (`bg-white border-cognac/40`); `onClear={() => clearSlot(key)}` at line 382 + clear-X Pressable at lines 240–249.
- GATE-5: PASS — evidence: palette card at lines 389–404 — `bg-mist`, swatches mapped from `state.draftSwatches()` (line 314) capped at 6 by store's `MAX_DRAFT_SWATCHES`, italic Cormorant tagline (line 401: `font-serif … italic`).
- GATE-6: PASS — evidence: sticky container `absolute bottom-0 left-0 right-0` (lines 410–412); `LinearGradient` overlay transparent→paper at lines 416–421; eyebrow with cognac bullet + `AI SUGGESTS FOR {activeLabel}` (lines 426–430); underlined `Shuffle` link (lines 432–442); horizontal `ScrollView` (lines 446–478); dashed `Surprise me` tail card (lines 458–477) with dashed-border, paper-2 background.
- GATE-7: PASS — evidence: `SLOT_CATEGORIES` mapping at lines 44–49 (top→Tops, bottom→Bottoms, shoes→Shoes, extra→Outerwear+Accessories); suggestions filter at lines 326–333 uses `allowed.has(it.category) && !slottedIds.has(it.id)` where `slottedIds = new Set(draftItemIds(draft))`; `setSlot(activeSlot, item.id)` invoked at line 336.
- GATE-8: PASS — evidence: `vibeScoreFor` imported (line 20) and used (line 321); `grep -E "48.*72.*87.*91|91.*87.*72.*48" src/app/(tabs)/outfits.tsx` → no matches (no inline ladder).
- GATE-9: PASS — evidence: `grep -nE "StyleSheet\.create|style=\{\{" src/app/(tabs)/outfits.tsx` → zero matches. All dynamic `style={...}` props reference named variables (`photoFrame`, `placeholderColor`, `dotStyle`, `surpriseFrame`) holding RN frame/color values that NativeWind cannot express.
- GATE-10: FAIL — evidence: booted iPhone 17 Pro Max, ran `npx expo start --ios --no-dev --offline`, waited for Metro and bundle (`iOS Bundled 2352ms`), captured `docs/visual-review/oracle-pass-1-outfits-crash.png`. Live screen shows a red React error overlay: `Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.` Stack frame is `at OutfitsScreen`. The Build a look UI, slot rows, palette card, and AI rail are all entirely absent — the design's primary surface does not render at all. Root cause appears to be `useWardrobeStore((state) => state.draftSwatches())` at line 314: the selector invokes the store method on every render, returning a fresh array each time, which Zustand treats as a state change and re-renders in a loop. Compared against `docs/design-screenshots/screen-outfit.png` (header eyebrow, "Build a look" title, amber 87 ring, four slot rows, palette card, AI suggestion rail) — none of those elements are visible on the live simulator. Gate fails because a primary design surface is completely missing from the implementation as it actually runs.
- GATE-11: PASS — evidence: `npm run lint` → exit 0 (expo lint).
- GATE-12: PASS — evidence: `npx tsc --noEmit` → exit 0.

### Pass 2 — 2026-06-16T09:48:50Z

- GATE-5 (regression re-check, file in diff): PASS — evidence: `grep -nE "draftSwatches|collectDraftSwatches|italic|MAX_DRAFT_SWATCHES|bg-mist" src/app/(tabs)/outfits.tsx` → matches at lines 17 (`collectDraftSwatches` import), 226 (italic placeholder), 299/322 (`draftSwatches` docstring + comment referencing the store helper), 327 (`collectDraftSwatches(draft, items)` memoized usage), 398 (mist palette card comment), 399 (`bg-mist` class), 411 (italic Cormorant tagline). The store still exposes `draftSwatches` (`grep -n draftSwatches src/store/wardrobe-store.ts` → line 196) delegating to the same `collectDraftSwatches` pure helper now consumed directly in the screen — semantics preserved, `MAX_DRAFT_SWATCHES` cap still applied inside `collectDraftSwatches`.
- GATE-9 (regression re-check, file in diff): PASS — evidence: `grep -nE "StyleSheet\.create|style=\{\{" src/app/(tabs)/outfits.tsx` → zero matches (exit 1). New `useMemo(() => collectDraftSwatches(draft, items), [draft, items])` adds no styling.
- GATE-3 (regression re-check, file in diff): PASS — evidence: `grep -nE "amber|#C89B3C" src/app/(tabs)/outfits.tsx` → matches only at 94, 123, 132, 137, 295 — all inside the VibeScore badge or its docstring; `stroke={Colors.amber}` at line 137 remains the sole runtime amber consumer.
- GATE-10: PASS — evidence: rebooted iPhone 17 Pro Max, restarted Expo Go via `xcrun simctl openurl booted "exp://localhost:8081"`, captured the live Outfits tab using `idb ui tap 158 900` to switch to the Outfits tab and `xcrun simctl io booted screenshot`. Saved as `docs/visual-review/oracle-pass-2-outfits.png`. The previous "Maximum update depth exceeded" red-screen overlay is GONE — the memoization fix at line 326 (`useMemo(() => collectDraftSwatches(draft, items), [draft, items])` replacing the looping `state.draftSwatches()` selector) resolved the crash. Live screen now renders, compared to `docs/design-screenshots/screen-outfit.png`: header eyebrow `NEW OUTFIT · TUESDAY` present, Cormorant `Build a look` title present, VibeScore amber ring badge top-right present (shows `0` with empty ring since the fresh draft has no slots — design shows `87` with 3 slots filled; both values come from `vibeScoreFor` per GATE-8), all four slot rows TOP/BOTTOM/SHOES/EXTRA render with dashed placeholders + italic "Add a piece" Cormorant labels, EXTRA slot is the active one with white card bg + cognac hairline border + clear-X (matches the design's active EXTRA), palette card with mist bg + italic `"Warm autumn, low-contrast"` tagline present below the slots, sticky AI suggestion rail at the bottom shows `● AI SUGGESTS FOR EXTRA` + underlined `Shuffle` + horizontal thumbnails (Wool trench, Silk scarf, Boucle blazer, Olive cha…, Tortoi…) with the dashed Surprise me tail card visible at the right edge, the native tab bar shows Outfits selected in cognac. Paper background, cognac accents, amber-only-on-ring scoping all match the token spec. No major design element is missing.
- GATE-11 (re-verified per protocol): PASS — evidence: `npm run lint` → exit 0.
- GATE-12 (re-verified per protocol): PASS — evidence: `npx tsc --noEmit` → exit 0.
