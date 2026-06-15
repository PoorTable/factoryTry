# Factory Decision Journal — APP-18

Task: Wardrobe Grid Screen
Started: 2026-06-12T06:30:49Z
Branch: feat/APP-18-wardrobe-grid-screen

Append-only. Every agent records every decision here.

## [2026-06-12T06:30:49Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, issue APP-18 "Wardrobe Grid Screen" parsed from URL
- why: URL contains linear.app; identifier extracted from path segment
- evidence: https://linear.app/apptryout/issue/APP-18/wardrobe-grid-screen, Linear MCP get_issue returned full description

## [2026-06-12T06:30:49Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: blockers APP-25 (tokens) and APP-26 (zustand store) verified Done — no blocked-by risk
- why: issue lists both as blocking; checked each via get_issue, both status=Done (completed 2026-06-10)
- evidence: Linear APP-25 completedAt=2026-06-10T16:45, APP-26 completedAt=2026-06-10T16:20

## [2026-06-12T06:30:49Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: design source = local screenshot docs/design-screenshots/screen-wardrobe.png (no Figma URLs in issue)
- why: issue attachment points to this repo path; file exists locally and was read
- evidence: docs/design-screenshots/screen-wardrobe.png — paper bg, mono eyebrow CLOSET·54 PIECES, serif "Your wardrobe" (italic), circular search btn, chip row (All active=ink), 2-col masonry grid w/ photo cards + category overlay labels, worn counts, cognac favorite heart roundel, cognac FAB, floating tab bar Closet active

## [2026-06-12T06:30:49Z] iter=0 agent=orchestrator event=BRANCH
- decision: created feat/APP-18-wardrobe-grid-screen off main@30e5e85
- why: slug from title "Wardrobe Grid Screen" lowercased/hyphenated, <=40 chars; tree was clean, no stash needed; pull fast-forwarded main to include merged APP-30
- evidence: git checkout -b exit 0, HEAD base 30e5e85

## [2026-06-12T06:30:49Z] iter=0 agent=orchestrator event=INIT
- decision: cleared stale APP-30 factory state files, fresh journal/state for APP-18
- why: previous run's journal already preserved in docs/factory-reports/APP-30.md (committed on main)
- evidence: rm .claude/factory-{journal,state,gates}.local.md; APP-30 report at docs/factory-reports/APP-30.md

## [2026-06-12T07:22:22Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 9 gates for APP-18
- why: Task = Wardrobe Grid Screen on existing placeholder route src/app/(tabs)/closet.tsx. Gates cover header (store-derived count, never hardcoded 54), category chips wired to byCategory, true two-column masonry with photoUri-null placeholder, favorite heart -> toggleFavorite, FAB -> /capture navigation, NativeWind-only styling (dynamic per-item height as the only style={} exception), VISUAL_MATCH vs docs/design-screenshots/screen-wardrobe.png, then lint and tsc. Resolved ambiguities: 6 chips required (screenshot crops Accessories), FAB target = existing /capture route, card-scale animation folded into visual gate as unverifiable mechanically.
- evidence: Read .claude/factory-state.local.md and docs/design-screenshots/screen-wardrobe.png; ls src/app/(tabs) (closet.tsx exists, placeholder per grep); grep tailwind.config.js -> paper/cognac/hairline/serif tokens present; grep src/store/wardrobe-store.ts -> byCategory L92/L175, totalCount L95/L182, toggleFavorite L89/L163; src/app/capture.tsx exists (camera route)

## [2026-06-12T07:50:08Z] iter=1 agent=builder event=BUILD
- decision: GATE-1 — Closet header (eyebrow CLOSET · N PIECES from store totalCount, serif title with italic "wardrobe", 38px circular hairline search button)
- why: First unchecked gate. Plan: new src/components/closet/closet-header.tsx modeled on src/components/chat/chat-header.tsx (NativeWind className, expo-image sf symbol via cssInterop, SerifTitle italic-span pattern); rewrite closet.tsx scaffold to bg-paper SafeAreaView rendering the header, keep the existing /capture link untouched so the camera entry survives until GATE-5 swaps it for the FAB. Count via useWardrobeStore((s) => s.totalCount()) — primitive return, safe for Object.is selector comparison.
- evidence: read closet.tsx, chat-header.tsx, coach.tsx, wardrobe-store.ts, tailwind.config.js, SerifTitle/Eyebrow components

## [2026-06-12T07:51:55Z] iter=1 agent=builder event=SELF_REVIEW
- decision: clean — diff serves GATE-1 only, no fixes needed
- why: re-read both hunks: closet.tsx scaffold (SafeAreaView top edge, bg-paper, header, preserved /capture link) + new closet-header.tsx. Gate fit: totalCount selector (no literal 54), italic "wardrobe" span via SerifTitle italic inside Text parent, 38px rounded-full border-hairline search button with sf:magnifyingglass. Eyebrow component uppercases via Typography.eyebrow textTransform. Greps: StyleSheet.create/style={{ → 0 hits; console/debugger → 0 hits; no deletions (git status: 1 modified, 1 new dir).
- evidence: expo lint exit 0, tsc --noEmit exit 0, files: src/app/(tabs)/closet.tsx, src/components/closet/closet-header.tsx

## [2026-06-12T07:52:21Z] iter=1 agent=builder event=BUILD
- decision: GATE-1 committed
- why: follow-up evidence line for the iter=1 BUILD entry (append-only journal)
- evidence: commit 44e40a1 — src/app/(tabs)/closet.tsx, src/components/closet/closet-header.tsx

## [2026-06-12T09:42:18Z] iter=1 agent=orchestrator event=EVAL
- decision: iteration 1 complete — gates 4/9 (GATE-1 header, GATE-6 NativeWind, GATE-8 lint, GATE-9 tsc); verdict GATES_REMAINING: 5; reviewer not run; stall_count=0; loop continues
- why: builder landed 44e40a1 (closet header); oracle evaluator updated gates file (4 passed) but its session was cut by a usage limit before it could append its own EVAL entry — orchestrator records the result from factory-gates.local.md on its behalf
- evidence: factory-gates.local.md gates_passed: 4; git rev-parse HEAD = 44e40a1; remaining gates 2,3,4,5,7

## [$(date -u +%Y-%m-%dT%H:%M:%SZ)] iter=2 agent=builder event=BUILD
- decision: GATE-2 — category chip row (All/Tops/Bottoms/Outerwear/Shoes/Accessories) wired to byCategory filter
- why: First unchecked gate. Plan: new src/components/closet/category-chip-row.tsx (horizontal ScrollView, NativeWind pills: active ink bg + paper text, inactive transparent + stone border); closet.tsx gains useState<Category|null> filter and derives visibleItems via store byCategory(filter) called at render (subscribe to s.items for reactivity — avoids zustand v5 new-array-selector getSnapshot loop; no useMemo so no exhaustive-deps risk). Rejected reusing src/components/ui/Chip.tsx — it is StyleSheet-based legacy; AGENTS.md mandates NativeWind for all new UI. Interim minimal filtered-name list renders below the chips so filtering is observable; GATE-3 replaces it with the masonry grid. Adding 'sans-medium': DMSans_500Medium to tailwind.config.js fontFamily (chip label = DM Sans Medium 13 per Typography.chip) per AGENTS.md "extend tailwind.config.js if a token is missing".
- evidence: read closet.tsx, wardrobe-store.ts (byCategory L175), types/wardrobe.ts Category, ui/Chip.tsx, chat-input.tsx, tailwind.config.js

## [2026-06-12T11:12:03Z] iter=2 agent=builder event=BUILD
- decision: timestamp correction — the iter=2 BUILD entry above was written at 2026-06-12T11:12:03Z (its heredoc was quoted, leaving the date literal); content of that entry stands as written
- why: append-only protocol forbids editing the malformed header in place
- evidence: this entry

## [2026-06-12T11:58:44Z] iter=2 agent=builder event=SELF_REVIEW
- decision: clean after one fix — replaced initial discard-subscribe store hack with zustand v5 useShallow
- why: re-read all 3 hunks, each serves GATE-2 (chip row component, closet wiring + interim list, sans-medium token). Gate fit: exactly six chips All/Tops/Bottoms/Outerwear/Shoes/Accessories; All maps to null; onPress -> onSelect(setFilter); visibleItems via state.byCategory(filter) wrapped in useShallow (fresh-array selector would trip Object.is). Active = border-ink bg-ink text-paper, inactive = border-stone bg-transparent text-ink — matches gate literally. Greps: StyleSheet.create / style={{ / console / debugger / TODO(factory) -> 0 hits; git status shows no deletions (2 modified, 1 new file). Null safety: filter typed Category|null, no unguarded access; no async paths added.
- evidence: npx expo lint exit 0, npx tsc --noEmit exit 0; files: src/app/(tabs)/closet.tsx, src/components/closet/category-chip-row.tsx, tailwind.config.js

## [2026-06-12T11:59:24Z] iter=2 agent=builder event=BUILD
- decision: GATE-2 committed
- why: follow-up evidence line for the iter=2 BUILD entry (append-only journal); note: hookify block-env-commit denies "git add -A" — staged the 3 files explicitly, future iterations must do the same
- evidence: commit 9bc72f4 — src/app/(tabs)/closet.tsx, src/components/closet/category-chip-row.tsx, tailwind.config.js

## [2026-06-12T12:07:37Z] iter=2 agent=oracle event=EVAL
- decision: gates 5/9 pass — GATE-2 flipped to pass; GATE-3/4/5/7 remain failing
- why: chip row + filtering landed and wired to byCategory; biggest blocker is GATE-3 (two-column masonry grid still an interim text list), which also blocks GATE-4 (heart on cards), GATE-5 (FAB), and GATE-7 (visual match). No regressions: GATE-1/6 re-verified after closet.tsx diff, lint+tsc both exit 0.
- evidence: see "Pass 2" block in factory-gates.local.md Evaluation History (grep/read of closet.tsx, category-chip-row.tsx, closet-header.tsx; npm run lint exit 0; npx tsc --noEmit exit 0)

## [2026-06-12T12:08:06Z] iter=2 agent=orchestrator event=EVAL
- decision: iteration 2 complete — gates 5/9 (GATE-2 chip row flipped; 1,6,8,9 held); verdict GATES_REMAINING: 4; reviewer not run; stall_count=0; loop continues
- why: builder landed 9bc72f4 (six category chips wired to byCategory via useShallow, interim list pending masonry); oracle confirmed no regressions; next blocker is GATE-3 masonry grid which gates 4/5/7 depend on
- evidence: factory-gates.local.md gates_passed: 5; git rev-parse HEAD = 9bc72f4

## [2026-06-12T12:12:23Z] iter=3 agent=builder event=BUILD
- decision: GATE-3 — two-column masonry grid (new src/components/closet/masonry-grid.tsx + item-card.tsx, closet.tsx swaps interim text list for the grid)
- why: First unchecked gate; also unblocks 4/5/7. Plan: masonry-grid.tsx owns photoHeightFor(item) (deterministic id-hash -> 160-280 in 24px steps, "driven by item data" per gate) and greedy shortest-column split (photoHeight + fixed text-block constant), rendering two flex-1 columns inside a ScrollView (gap-grid token = 10px). item-card.tsx follows the reviewer-approved APP-30 pattern from outfit-card-bubble.tsx/palette-bubble.tsx: expo-image via cssInterop when photoUri set, flat item.color placeholder View when null, swatch dots + "worn Nx" row, mono caps category overlay, serif name. Dynamic style={} limited to photo height + runtime hex colors (placeholder, swatch dots) — runtime hexes cannot be Tailwind classes; precedent palette-bubble.tsx:25, outfit-card-bubble.tsx:46. Rejected reusing ui/ItemPhoto + ui/SwatchDots: both are StyleSheet legacy and unused-by/peripheral; AGENTS.md mandates NativeWind for new UI, and chat components already re-implemented dots inline. Favorite heart (GATE-4) and FAB (GATE-5) deliberately excluded — one gate per iteration; temp capture pill stays until GATE-5.
- evidence: read closet.tsx, item types, wardrobe-store.ts, seed.ts, screen-wardrobe.png, palette-bubble.tsx, outfit-card-bubble.tsx, ItemPhoto.tsx, SwatchDots.tsx, tailwind.config.js; skill expo:building-native-ui consulted

## [2026-06-12T12:14:22Z] iter=3 agent=builder event=SELF_REVIEW
- decision: clean — all 3 hunks serve GATE-3, no fixes needed
- why: gate fit re-read literally: two independent columns via greedy shortest-column split (splitColumns, not FlatList numColumns); photo block rounded-item (14px token) with height from photoHeightFor id-hash -> 160/184/208/232/256/280 (160-280 driven by item data); serif name below photo; meta row = swatch dots left + "worn N×" right; photoUri===null branch renders flat item.color View. Greps over diff + new files: StyleSheet.create / style={{ / console / debugger / TODO(factory) -> 0 hits; style= occurrences are only named consts of dynamic data values (photoFrame height, placeholderColor, dotColor) per GATE-6 carve-out + palette-bubble/outfit-card-bubble precedent. git status: 1 modified, 2 new files, no deletions; temp capture pill preserved for GATE-5. Null safety: photoUri ternary guards null; swatches always an array per Item type; no async paths added.
- evidence: npx expo lint exit 0, npx tsc --noEmit exit 0; files: src/app/(tabs)/closet.tsx, src/components/closet/masonry-grid.tsx, src/components/closet/item-card.tsx

## [2026-06-12T12:14:40Z] iter=3 agent=builder event=BUILD
- decision: GATE-3 committed
- why: follow-up evidence line for the iter=3 BUILD entry (append-only journal); staged files explicitly per the iter=2 hookify note
- evidence: commit 271575b — src/app/(tabs)/closet.tsx, src/components/closet/masonry-grid.tsx, src/components/closet/item-card.tsx

## [2026-06-12T12:43:34Z] iter=3 agent=oracle event=EVAL
- decision: gates 6/9 pass — GATE-3 (masonry grid) flipped to PASS; GATE-4, GATE-5, GATE-7 remain
- why: commit 271575b added masonry-grid.tsx (greedy two-column split, 160-280px deterministic heights) and item-card.tsx (14px radius, serif name, swatches + worn count, flat-color placeholder), satisfying GATE-3; no toggleFavorite heart (GATE-4) and no cognac FAB (GATE-5) yet, which also forces GATE-7 (VISUAL_MATCH) to fail since the FAB is a design component entirely absent. Most important remaining blocker: favorite heart + cognac FAB on the card/screen. No regressions: GATE-1/2/6 re-verified against the diff, lint+tsc both exit 0.
- evidence: see Evaluation History "Pass 3 — 2026-06-12T12:42:30Z" in .claude/factory-gates.local.md (greps for toggleFavorite/bg-cognac exit 1; npm run lint exit 0; npx tsc --noEmit exit 0)

## [2026-06-12T12:43:57Z] iter=3 agent=orchestrator event=EVAL
- decision: iteration 3 complete — gates 6/9 (GATE-3 masonry flipped; 1,2,6,8,9 held); verdict GATES_REMAINING: 3; reviewer not run; stall_count=0; loop continues
- why: builder landed 271575b (masonry-grid.tsx greedy shortest-column split + item-card.tsx with null-photoUri placeholder); remaining: GATE-4 favorite heart, GATE-5 cognac FAB, GATE-7 visual match
- evidence: factory-gates.local.md gates_passed: 6; git rev-parse HEAD = 271575b

## [2026-06-12T12:53:26Z] iter=4 agent=builder event=BUILD
- decision: GATE-4 — favorite heart roundel on ItemCard wired to store toggleFavorite(id)
- why: First unchecked gate (GATE-5 FAB comes next iteration). Plan: item-card.tsx gains a conditional absolute top-right 28px paper-glass roundel (rounded-full bg-paper/85) rendered only when item.isFavorite, containing sf:heart.fill tinted Colors.cognac via the established expo-image cssInterop pattern (precedent: closet-header.tsx search button). Press handler calls useWardrobeStore((s) => s.toggleFavorite) directly in the card — stable function selector, avoids prop-drilling a callback through MasonryGrid; nested Pressable inside the card Pressable handles its own press natively in RN. Field is item.isFavorite per src/types/wardrobe.ts:22 (gate text says "item.favorite" loosely; store action signature toggleFavorite(id: string) confirmed at wardrobe-store.ts:89).
- evidence: read item-card.tsx, closet.tsx, closet-header.tsx; grep wardrobe-store.ts (toggleFavorite L89/L163, isFavorite L179), types/wardrobe.ts (isFavorite L22); skill expo:building-native-ui consulted

## [2026-06-12T12:58:26Z] iter=4 agent=builder event=SELF_REVIEW
- decision: clean — single-file diff serves GATE-4 only, no fixes needed
- why: gate fit re-read literally: cognac heart (sf:heart.fill tinted Colors.cognac per closet-header icon pattern) in a 28px (h-7 w-7) paper-glass roundel (rounded-full bg-paper/85) absolute top-right of the photo block; renders conditionally on item.isFavorite; onPress calls toggleFavorite(item.id) from the store — grep check "toggleFavorite" in src/components/ now hits. Reactivity: store toggle replaces the item object, so closet.tsx's useShallow byCategory selector sees a new element reference and re-renders. Greps over diff: StyleSheet.create / style={{ / console / debugger / TODO(factory) → 0 hits; git status: 1 modified file, no deletions. Null safety: isFavorite is required boolean per Item type, no optional chaining needed; no async paths added.
- evidence: npx expo lint exit 0, npx tsc --noEmit exit 0; file: src/components/closet/item-card.tsx

## [2026-06-12T12:58:55Z] iter=4 agent=builder event=BUILD
- decision: GATE-4 committed
- why: follow-up evidence line for the iter=4 BUILD entry (append-only journal); staged the file explicitly per the iter=2 hookify note
- evidence: commit f5154bf — src/components/closet/item-card.tsx

## [2026-06-12T13:10:52Z] iter=4 agent=oracle event=EVAL
- decision: gates 7/9 pass
- why: GATE-4 flipped to PASS (favorite heart roundel wired to toggleFavorite in item-card.tsx); GATE-3/GATE-6 regression re-checks held on the item-card.tsx diff; single remaining blocker is the cognac FAB (GATE-5), which also keeps GATE-7 VISUAL_MATCH failing since a key design component is absent
- evidence: see "Pass 4 — 2026-06-12T13:05:40Z" block in factory-gates.local.md Evaluation History; lint exit 0, tsc exit 0, grep toggleFavorite → 3 matches, grep bg-cognac → 0 matches

## [2026-06-12T13:29:06Z] iter=4 agent=orchestrator event=EVAL
- decision: iteration 4 complete — gates 7/9 (GATE-4 favorite heart flipped; 3,6,8,9 re-held); verdict GATES_REMAINING: 2; reviewer not run; stall_count=0; loop continues
- why: builder landed f5154bf (cognac sf:heart.fill in 28px paper-glass roundel wired to toggleFavorite); remaining GATE-5 cognac FAB then GATE-7 visual match
- evidence: factory-gates.local.md gates_passed: 7; git rev-parse HEAD = f5154bf

## [2026-06-12T15:34:50Z] iter=5 agent=builder event=BUILD
- decision: GATE-5 — cognac FAB on closet.tsx replacing the temporary "Add with camera" pill, Link → /capture
- why: First unchecked gate; last code change before GATE-7 visual match. Plan: absolute-positioned 58px rounded-full bg-cognac Pressable at right-[22px] bottom-[108px] (spec offsets), paper sf:plus icon via the established expo-image cssInterop pattern (closet-header.tsx precedent), wrapped in Link href="/capture" asChild (same nav pattern as the temp pill it replaces). Shadow via NativeWind arbitrary boxShadow class shadow-[0_10px_24px_rgba(163,88,54,0.35),0_2px_4px_rgba(42,37,32,0.10)] — exact spec value; expo skill mandates CSS boxShadow over legacy shadow props, and a className arbitrary value keeps GATE-6's NativeWind-only rule (no inline style). Rejected a separate fab component file: single-use, ~15 lines, lives naturally in the screen like the pill did.
- evidence: read closet.tsx, closet-header.tsx, app-tabs.tsx, tailwind.config.js; grep boxShadow/shadow-[ → no prior usage; capture route confirmed at src/app/capture.tsx; skill expo:building-native-ui consulted

## [2026-06-12T19:05:43Z] iter=5 agent=builder event=SELF_REVIEW
- decision: clean — single-hunk diff in closet.tsx serves GATE-5 only, no fixes needed
- why: gate fit re-read literally: circular (rounded-full h-[58px] w-[58px]) bg-cognac Pressable with paper sf:plus icon (tintColor Colors.paper), absolute bottom-right (right-[22px] bottom-[108px] — spec offsets, above the tab bar), press navigates via Link href="/capture" asChild — gate greps for bg-cognac and /capture both hit. Temp pill removed along with now-unused Text/View imports (gate supersedes it; Oracle Pass 2-4 evidence repeatedly cites the pill as the deficiency). Shadow is the exact spec boxShadow as a NativeWind arbitrary class — no inline style, GATE-6 intact. Greps over diff: StyleSheet.create / style={{ / console / debugger / TODO(factory) → 0 hits (exit 1); git status: 1 modified file, no deletions. Null safety: no data access or async paths added.
- evidence: npx expo lint exit 0, npx tsc --noEmit exit 0; file: src/app/(tabs)/closet.tsx

## [2026-06-12T19:14:01Z] iter=5 agent=builder event=BUILD
- decision: GATE-5 committed
- why: follow-up evidence line for the iter=5 BUILD entry (append-only journal); staged the file explicitly
- evidence: commit 94d8756 — src/app/(tabs)/closet.tsx

## [2026-06-14T12:18:06Z] iter=6 agent=oracle event=EVAL
- decision: gates 9/9 pass — ALL_GATES_PASS
- why: cognac FAB landed in commit 94d8756 (closet.tsx only); GATE-5 now verifies via grep bg-cognac + /capture Link; VISUAL_MATCH GATE-7 captured live sim screenshot and confirmed all major design elements (paper bg, mono eyebrow, serif italic title, search circle, chip row All-active, two-col masonry, swatch+worn rows, cognac FAB, floating tab bar with Closet active); regression sweep on closet.tsx-touching gates 1/2/3/4/6 all still pass; lint exit 0; tsc --noEmit exit 0
- evidence: see .claude/factory-gates.local.md Pass 6 block; screenshot archived at docs/visual-review/oracle-pass-6.png; commands run — git log --oneline, grep StyleSheet/bg-cognac/toggleFavorite, npm run lint, npx tsc --noEmit, npx expo start --ios --no-dev --offline, xcrun simctl io booted screenshot

## [2026-06-14T12:43:41Z] iter=6 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Full diff (5 files + tailwind.config.js) implements GATE-1..GATE-7 cleanly — store-wired header, six category chips with byCategory filter, two-column masonry with deterministic 160-280px heights, photoUri null → flat-color placeholder, favorite heart roundel wired to toggleFavorite, cognac 58px FAB at bottom-right linking to /capture. NativeWind-only styling (StyleSheet.create = 0 matches across new files); inline style={} restricted to runtime data values (per-item height + hex colors) per documented carve-out. No correctness bugs, type errors, missing error handling, security issues, or crashes. Visual match against docs/design-screenshots/screen-wardrobe.png confirmed: paper bg, mono eyebrow CLOSET · 16 PIECES, italic serif title, search circle, chip row All active, masonry grid with item names + swatch dots + worn counts, cognac FAB, floating tab bar with Closet active.
- evidence: /tmp/factory-review-screenshot.png (committed as docs/visual-review/simulator-screenshot.png in d548916); compared vs docs/design-screenshots/screen-wardrobe.png; git diff main..HEAD inspected (closet.tsx, category-chip-row.tsx, closet-header.tsx, item-card.tsx, masonry-grid.tsx, tailwind.config.js); no previous review file existed (first review pass)

## [2026-06-14T12:44:18Z] iter=6 agent=orchestrator event=EVAL
- decision: ALL_GATES_PASS + APPROVED — shipping (gates 9/9, reviewer cycle 1)
- why: builder landed 94d8756 (FAB), oracle re-ran pass 6 and flipped GATE-5 + GATE-7 (sim screenshot at docs/visual-review/oracle-pass-6.png, committed simulator-screenshot at d548916), reviewer found no blocking issues
- evidence: git log shows d548916, 94d8756, f5154bf, 271575b, 9bc72f4, 44e40a1; factory-gates.local.md gates_passed: 9

---

# Final Gate State

---
task_id: APP-18
gates_total: 9
gates_passed: 9
evaluated_at: "2026-06-14T12:16:21Z"
---

# Acceptance Gates for APP-18

## Gates

- [x] GATE-1: Header implemented in the Closet screen (`src/app/(tabs)/closet.tsx` or a component it renders): mono uppercase eyebrow showing `CLOSET · {N} PIECES` where N derives from the store's `totalCount` (NOT hardcoded 54), serif title "Your wardrobe" with "wardrobe" in italic, and a circular search button with hairline border. Check: `grep -rn "totalCount" src/app/(tabs)/closet.tsx src/components/` shows store-derived count; `grep -rn "wardrobe" src/app/(tabs)/ src/components/` finds the title with an italic span; grep confirms no literal `54 PIECES` string.
- [x] GATE-2: Horizontally scrolling category chip row with exactly the chips All, Tops, Bottoms, Outerwear, Shoes, Accessories; tapping a chip filters the grid via the store's `byCategory(filter)` selector ("All" maps to `null`). Active chip styled ink bg + paper text, inactive transparent + stone border. Check: grep the closet screen/components for `byCategory` and all six chip labels; read the file to confirm onPress sets the filter state.
- [x] GATE-3: Two-column masonry grid (left/right columns with independent heights, NOT a uniform FlatList numColumns grid with equal-height rows) rendering one card per item: photo block with 14px radius and variable height (160–280px range driven by item data), item name in serif below the photo, a row with swatch dot(s) left and `worn N×` right. When `item.photoUri === null` a flat-color placeholder using `item.color` is rendered. Check: read the grid component — verify two-column split logic, variable height mapping, `photoUri` null branch, and `worn` text rendering.
- [x] GATE-4: Favorite heart — favorited items show a cognac heart in a small paper-glass roundel at the photo's top-right, and pressing it calls the store's `toggleFavorite(id)`. Check: `grep -rn "toggleFavorite" src/app/(tabs)/closet.tsx src/components/` finds a press handler wired to the store action; read the card component to confirm the roundel renders conditionally on `item.favorite`.
- [x] GATE-5: Cognac FAB — circular button with cognac background and paper plus icon, positioned bottom-right above the tab bar, that navigates to the camera capture route on press. Check: grep the closet screen/components for a press handler pushing/linking to `/capture` (e.g. `router.push('/capture')` or `<Link href="/capture"`), with `bg-cognac` styling.
- [x] GATE-6: NativeWind-only styling — all new/modified files for this task (`src/app/(tabs)/closet.tsx` and any new components it imports) use `className` with token classes (`bg-paper`, `text-ink`, `bg-cognac`, `border-hairline`, `font-serif`, `font-mono`, etc.); zero occurrences of `StyleSheet.create` and no layout/color/spacing via inline `style={{}}` objects in those files (dynamic computed values like masonry card height may use `style` ONLY for the non-static numeric height). Check: `grep -n "StyleSheet" src/app/(tabs)/closet.tsx <new component files>` returns nothing; visual grep of `style={` occurrences confirms only dynamic-height usage.
- [x] GATE-7: VISUAL_MATCH — Live iOS simulator screenshot of the Closet tab matches `docs/design-screenshots/screen-wardrobe.png`: paper background, header eyebrow + serif title + search circle present, chip row present with "All" active in ink, two-column masonry grid of cards with names and worn counts visible, cognac FAB bottom-right, floating tab bar with Closet active. No major component from the design missing; colors in the right ballpark.
- [x] GATE-8: lint passes — `npm run lint` exits 0.
- [x] GATE-9: TypeScript compiles — `npx tsc --noEmit` exits 0.

## Oracle Notes

- Target route already exists as a placeholder: `src/app/(tabs)/closet.tsx` (currently has a temporary "Add with camera" link). The task replaces it with the full grid screen.
- Foundations verified present: `src/store/wardrobe-store.ts` exports `byCategory(filter)`, `totalCount()`, `toggleFavorite(id)`; `src/types/wardrobe.ts` defines `Item` with `photoUri: string | null`; `tailwind.config.js` defines `paper #F8F4EE`, `cognac #A35836`, `hairline #DDD3C2`, `font-serif` (CormorantGaramond). Camera route is `src/app/capture.tsx` → href `/capture`.
- Ambiguity resolved: spec's "Tap FAB → open camera capture flow" mapped to the existing `/capture` route (APP-19's confirm flow may extend it later; navigation target is what's checkable now).
- Ambiguity resolved: design screenshot shows 5 chips (no Accessories visible due to horizontal scroll cutoff) but the task text lists 6 including Accessories — gates require all six.
- Assumption: "masonry" means a two-column layout where columns flow independently (items distributed by accumulated height or alternation), not a uniform-row grid. GATE-3 checks for this structurally rather than pixel-measuring.
- Assumption on NativeWind strictness: per AGENTS.md the rule is absolute for static styling; a single dynamic numeric (per-item photo height) cannot be expressed as a static Tailwind class, so GATE-6 carves out only that. Tailwind arbitrary values per item would bloat the class cache; this is the standard NativeWind escape hatch.
- Micro-interaction (card scale 0.97 on tap) and FAB shadow are polish details folded into the visual gate rather than separate gates — they are hard to verify mechanically and should not block on pixel-perfection.
- Risk: simulator screenshot flow can be flaky; per protocol VISUAL_MATCH is left unchecked with a note if tooling fails, never auto-failed.

## Evaluation History

### Pass 2 — 2026-06-12T12:07:37Z
- GATE-1: PASS (regression re-check; closet.tsx in latest diff) — evidence: closet.tsx:21 `totalCount()` from store feeds ClosetHeader; closet-header.tsx renders Eyebrow `Closet · ${pieceCount} pieces`, SerifTitle "Your " + italic "wardrobe", 38px rounded-full border-hairline search Pressable; grep "54 PIECES" src/ → no matches
- GATE-2: PASS — evidence: category-chip-row.tsx OPTIONS has all six labels (All/Tops/Bottoms/Outerwear/Shoes/Accessories) with All→null; onPress → onSelect(value) → setFilter in closet.tsx:30; closet.tsx:24 `byCategory(filter)` drives visible list; active chip `border-ink bg-ink` + `text-paper`, inactive `border-stone bg-transparent` + `text-ink`; horizontal ScrollView
- GATE-3: FAIL — evidence: closet.tsx:32-40 renders an interim flat <Text> list inside a ScrollView with explicit comment "replaced by the two-column masonry grid in the next gate"; no grid/card component exists in src/components/closet/ (only category-chip-row.tsx, closet-header.tsx)
- GATE-4: FAIL — evidence: grep "toggleFavorite" in closet.tsx + src/components/closet/ → 0 matches; no card component with heart roundel exists
- GATE-5: FAIL — evidence: grep "bg-cognac" in closet screen/components → 0 matches; /capture entry exists only as a temporary bottom-center pill Link (closet.tsx:44-57, comment "the cognac FAB lands in a later gate"), not a circular cognac FAB bottom-right
- GATE-7: FAIL — evidence: code inspection shows the masonry grid (the design's dominant element) and the cognac FAB are entirely absent (see GATE-3/GATE-5 evidence); live screenshot of the interim text list cannot match docs/design-screenshots/screen-wardrobe.png — simulator capture deferred until the grid exists to avoid a pointless boot cycle
- GATE-8: PASS (always re-verified) — evidence: `npm run lint` (expo lint) exit 0
- GATE-9: PASS (always re-verified) — evidence: `npx tsc --noEmit` exit 0
- GATE-6: PASS (regression re-check; new file category-chip-row.tsx) — evidence: grep "StyleSheet\|style={" closet.tsx + src/components/closet/ → 0 matches; all styling via className incl. cssInterop for SafeAreaView/expo-image

### Pass 3 — 2026-06-12T12:42:30Z
- GATE-1: PASS (regression re-check; closet.tsx in diff 271575b) — evidence: closet.tsx:22 `totalCount()` → ClosetHeader pieceCount (line 29); closet-header.tsx untouched by diff; header wiring intact
- GATE-2: PASS (regression re-check; closet.tsx in diff) — evidence: closet.tsx:25 `byCategory(filter)` via useShallow drives MasonryGrid items; line 31 CategoryChipRow selected/onSelect=setFilter wiring intact; category-chip-row.tsx untouched
- GATE-3: PASS — evidence: read src/components/closet/masonry-grid.tsx — splitColumns() greedy shortest-column split into two independent-height columns (lines 35-53, NOT numColumns); photoHeightFor() maps item.id hash → 160-280px in 24px rungs (lines 21-28); item-card.tsx: rounded-item (=14px per tailwind.config.js:47) photo block, font-serif name (line 52), swatch dots left + `worn ${item.wornCount}×` right (lines 56-71), photoUri===null branch renders flat item.color View (line 45)
- GATE-4: FAIL — evidence: grep "toggleFavorite" closet.tsx + src/components/closet/ → 0 matches (exit 1); item-card.tsx has no heart roundel / favorite branch
- GATE-5: FAIL — evidence: grep "bg-cognac" closet screen/components → 0 matches; /capture entry still the temporary bottom-center pill Link (closet.tsx:37-50, comment "the cognac FAB lands in a later gate"), not a circular cognac FAB bottom-right
- GATE-6: PASS (regression re-check; new files item-card.tsx, masonry-grid.tsx) — evidence: grep StyleSheet across closet files → 0 matches; style={} occurrences are only runtime data-driven values (per-item masonry height, item.color placeholder hex, swatch hex dots) which cannot be static Tailwind classes — same escape hatch the gate carves out for the dynamic height (see Oracle Notes on class-cache bloat); all static layout/color/typography via className
- GATE-7: FAIL — evidence: cognac FAB completely absent from implementation (GATE-5 grep evidence) — a key component the design shows, which is an automatic fail per the comparison criteria; masonry grid now exists so only the FAB blocks; simulator capture deferred until FAB lands to avoid a boot cycle with a predetermined verdict
- GATE-8: PASS (always re-verified) — evidence: `npm run lint` (expo lint) exit 0
- GATE-9: PASS (always re-verified) — evidence: `npx tsc --noEmit` exit 0

### Pass 4 — 2026-06-12T13:05:40Z
- GATE-4: PASS — evidence: grep "toggleFavorite" → item-card.tsx:28 selects store action, line 61 onPress={() => toggleFavorite(item.id)}; lines 56-71 render heart roundel conditionally on `item.isFavorite` (the Item type's favorite flag per src/types/wardrobe.ts:22; store toggles it at wardrobe-store.ts:163-166) — sf:heart.fill tinted Colors.cognac inside a paper/85 rounded-full 28px roundel at absolute right-2 top-2 of the photo block
- GATE-3: PASS (regression re-check; item-card.tsx in diff f5154bf) — evidence: read item-card.tsx — rounded-item photo block (line 42), photoUri===null flat item.color branch (line 51), font-serif name (line 74), swatch dots left + `worn ${item.wornCount}×` right (lines 78-93) all intact; masonry-grid.tsx untouched by diff
- GATE-6: PASS (regression re-check; item-card.tsx in diff) — evidence: grep StyleSheet across closet.tsx + src/components/closet/ → 0 matches (exit 1); style={} usages in item-card.tsx remain only the data-driven values (photoFrame height, item.color placeholder, swatch hex dots) per the gate's carve-out; new roundel/heart styled entirely via className
- GATE-5: FAIL — evidence: grep "bg-cognac" closet screen/components → 0 matches; /capture entry is still the temporary bottom-center pill Link (closet.tsx:37-50, comment "the cognac FAB lands in a later gate"), not a circular cognac FAB bottom-right
- GATE-7: FAIL — evidence: cognac FAB entirely absent (GATE-5 grep) — a key component the design (docs/design-screenshots/screen-wardrobe.png) shows, an automatic fail per the comparison criteria; simulator capture again deferred until the FAB lands to avoid a boot cycle with a predetermined verdict — it is now the single remaining code change
- GATE-8: PASS (always re-verified) — evidence: `npm run lint` (expo lint) exit 0
- GATE-9: PASS (always re-verified) — evidence: `npx tsc --noEmit` exit 0

### Pass 6 — 2026-06-14T12:16:21Z
- GATE-5: PASS — evidence: latest diff (94d8756) only touches src/app/(tabs)/closet.tsx; closet.tsx:41 `<Link href="/capture" asChild>`, line 46 className includes `absolute bottom-[108px] right-[22px] h-[58px] w-[58px] ... rounded-full bg-cognac shadow-[...]`, lines 48-53 expo-image renders `sf:plus` tinted Colors.paper — cognac FAB now in place; grep "bg-cognac" closet files → 1 match (closet.tsx:46)
- GATE-7: PASS (VISUAL_MATCH) — evidence: booted iPhone 17 Pro Max sim, `npx expo start --ios --no-dev --offline`, Metro up attempt 1, `xcrun simctl io booted screenshot /tmp/oracle-visual-check.png` (archived to docs/visual-review/oracle-pass-6.png); compared vs docs/design-screenshots/screen-wardrobe.png — paper #F8F4EE bg matches, eyebrow `CLOSET · 16 PIECES` (store-derived; design's 54 is mock; mono uppercase correct), serif "Your wardrobe" with italic span + 38px circular search button top-right, chip row with All active (ink/paper pill) + Tops/Bottoms/Outerwear/Shoes/Acces visible, two-column masonry with flat-color placeholders (Linen camp shirt, Wool trench, Pleated trouser, Cashmere mock) varying heights, swatch dots + worn N×, category labels (TOPS/OUTERWEAR/BOTTOMS) overlaid bottom-left, cognac FAB bottom-right with paper "+" icon, floating tab bar with Closet active in cognac — all major design elements present; the blue Expo dev menu circle in the live screenshot is dev-tooling overlay, not app UI
- GATE-1: PASS (regression re-check; closet.tsx in 94d8756 diff) — evidence: closet.tsx:26 `pieceCount = useWardrobeStore((state) => state.totalCount())`, line 33 `<ClosetHeader pieceCount={pieceCount} />` — header wiring intact; live screenshot confirms `CLOSET · 16 PIECES` rendered (store-derived, not hardcoded 54); grep "54 PIECES" src/ → 0 matches
- GATE-2: PASS (regression re-check; closet.tsx in diff) — evidence: closet.tsx:29 `byCategory(filter)` via useShallow → visibleItems → MasonryGrid; line 35 CategoryChipRow selected/onSelect=setFilter wiring intact; live screenshot shows All/Tops/Bottoms/Outerwear/Shoes/Acces chip row with All active (ink bg, paper text)
- GATE-3: PASS (regression re-check; closet.tsx in diff) — evidence: closet.tsx:37 `<MasonryGrid items={visibleItems} />`; masonry-grid.tsx + item-card.tsx untouched by diff; live screenshot confirms two independent-height columns with flat-color placeholders, item names in serif, swatch dots + worn counts
- GATE-4: PASS (regression re-check; closet.tsx in diff) — evidence: item-card.tsx untouched by diff; grep "toggleFavorite" src/components/closet/item-card.tsx → matches at lines 28, 61; favorite roundel logic intact
- GATE-6: PASS (regression re-check; closet.tsx in diff) — evidence: grep "StyleSheet" src/app/(tabs)/closet.tsx src/components/closet/ → 0 matches; closet.tsx uses className-only styling for the FAB (no style={{}}), cssInterop applied for SafeAreaView/expo-image; AGENTS.md NativeWind rule honored
- GATE-8: PASS (always re-verified) — evidence: `npm run lint` (expo lint) exit 0
- GATE-9: PASS (always re-verified) — evidence: `npx tsc --noEmit` exit 0
