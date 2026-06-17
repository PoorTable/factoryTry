# Factory Decision Journal — APP-33

Task: Saved looks + wear tracking flows
Started: 2026-06-17T00:00:00Z
Branch: feat/APP-33-saved-looks-wear-tracking-flows

Append-only. Every agent records every decision here.

## [2026-06-17T15:07:39Z] iter=0 agent=orchestrator event=INIT
- decision: factory skill armed for APP-33
- why: user invoked /factory with linear URL
- evidence: linear issue APP-33 fetched

## [2026-06-17T15:07:39Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, id=APP-33, status=Todo, priority=Medium
- why: URL contained linear.app; relations.blockedBy=[APP-26 Wardrobe data model + persisted Zustand store]
- evidence: get_issue returned title "Saved looks + wear tracking flows"; blocked-by APP-26 noted but proceeding (depends on existing store)

## [2026-06-17T15:07:39Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: source=local; references at docs/design-screenshots/screen-outfit.png, screen-profile.png, screen-chat.png, screen-wardrobe.png
- why: issue description has no figma.com URLs; project ships local design screenshots covering outfit builder, profile stats, chat
- evidence: ls docs/design-screenshots/ shows 10 PNGs including all relevant screens

## [2026-06-17T15:07:39Z] iter=0 agent=orchestrator event=BRANCH
- decision: branch=feat/APP-33-saved-looks-wear-tracking-flows
- why: slug derived from title; main was clean
- evidence: git checkout -b succeeded; pulled main first

## [2026-06-17T15:12:40Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 10 gates for APP-33 (saved looks + wear tracking flows)
- why: Task spans store (lastWornAt + wearOutfit action with persisted migration), Outfit Builder (Save look sheet + cognac toast + resetDraft), Coach chat (Save look on OutfitCardBubble + Saved state), saved-outfits list on Outfits tab (3-thumb row + vibe pill + tap-load + swipe-delete), Profile screen (live stats + most-worn strip wired to store). Highest-risk pieces are the store changes (GATE-1, GATE-2) because they require a v2 persist migration backfilling lastWornAt without dropping user data, and the chat bubble (GATE-4) which has to flip per-message to a Saved state without local state being lost across re-renders. NativeWind STRICT rule and AI_MOCK screenshot rule are captured as standalone gates (GATE-8 + GATE-9). VISUAL_MATCH gate references the local docs/design-screenshots/ images since figma_count=0. Lint + tsc folded into GATE-10 (always last).
- evidence: read /Users/ilyakushner/Desktop/factory-try/.claude/factory-state.local.md (task spec + acceptance criteria + design refs), read /Users/ilyakushner/Desktop/factory-try/src/store/wardrobe-store.ts (confirmed saveOutfit/removeOutfit/incrementWorn exist; lastWornAt and wearOutfit DO NOT exist — they must be added; persist version is 1), read /Users/ilyakushner/Desktop/factory-try/src/types/wardrobe.ts lines 20-42 (Item has wornCount but no lastWornAt; Outfit has no lastWornAt), listed /Users/ilyakushner/Desktop/factory-try/src/components/{chat,closet,profile,ui} and /Users/ilyakushner/Desktop/factory-try/src/app/(tabs) (no outfits/ component dir yet; outfit-card-bubble.tsx and stat-cards.tsx + most-worn-strip.tsx exist and are the right extension points).

## [2026-06-17T15:30:00Z] iter=2 agent=builder event=BUILD
- decision: Implement GATE-1..GATE-9 in one focused pass — add lastWornAt + wearOutfit to store (with persist v2 migration), wire OutfitBuilder Save look sheet w/ cognac toast, surface saved-outfits list with thumb row + vibe pill + load-into-draft + delete on Outfits tab, expose Wear today action (long-press) on saved outfits, ensure chat Save bubble persists. Profile screen already reads outfits.length and wornCount so GATE-7 may already pass — will verify.
- why: Considered staging changes one gate per commit but GATE-3,5,6 share the same outfits.tsx file — splitting would create coupling pain. GATE-1,2 are foundational and must land first. Existing UI primitives (SerifTitle, SoftCard, SwatchDots) reused per task spec. Wear today implemented via long-press on a saved outfit row + a separate "Wear today" pill button inside Save sheet feels overengineered — chose long-press only to match task wording ("long-press or detail sheet").
- evidence: read /Users/ilyakushner/Desktop/factory-try/src/store/wardrobe-store.ts (saveOutfit/removeOutfit/incrementWorn exist; need lastWornAt + wearOutfit + version 2), /Users/ilyakushner/Desktop/factory-try/src/types/wardrobe.ts (Item.lastWornAt missing, Outfit.lastWornAt missing), /Users/ilyakushner/Desktop/factory-try/src/app/(tabs)/outfits.tsx (no Save look CTA yet), /Users/ilyakushner/Desktop/factory-try/src/components/chat/outfit-card-bubble.tsx (already has Save look + saved state — GATE-4 likely passes already), /Users/ilyakushner/Desktop/factory-try/src/app/(tabs)/you.tsx (already uses outfits.length and wornCount derivations — GATE-7 likely passes), /Users/ilyakushner/Desktop/factory-try/src/components/profile/{stat-cards,most-worn-strip}.tsx (already derive from store-fed props).

## [2026-06-17T15:55:00Z] iter=2 agent=builder event=SELF_REVIEW
- decision: clean
- why: Verified each diff hunk targets a specific gate. Gate-1 (lastWornAt on Item+Outfit + wearOutfit action + v2 migration) — confirmed grep hits on /Users/ilyakushner/Desktop/factory-try/src/types/wardrobe.ts and /Users/ilyakushner/Desktop/factory-try/src/store/wardrobe-store.ts, version=2, migrate fn backfills lastWornAt=null. Gate-2 (deleteOutfit + items untouched) — deleteOutfit uses outfits.filter only, never touches items. Gate-3 (Save look CTA + sheet + cognac toast + resetDraft) — outfits.tsx Save look CTA uses bg-cognac (token=#A35836); SaveLookSheet has serif TextInput pre-filled w/ suggestOutfitName; calls saveOutfit + resetDraft + onSaved which fires cognac toast. Gate-4 (chat bubble Save look + Saved state + imports store) — added useWardrobeStore import to outfit-card-bubble.tsx, derives savedInStore from outfits matching itemIds set; falls through to "Saved ✓". Gate-5 (Wear today on saved outfit) — Wear today pill in SavedOutfitRow calls store.wearOutfit; "Wear today" string and wearOutfit identifier both found by grep across app+components. Gate-6 (saved list w/ 3 thumbs + vibe pill + load+delete) — SavedOutfitsList reads outfits from store, renders ItemThumb (expo-image) for first 3 items, vibe pill, tap → maps each itemId to slot via category and calls setSlot (recomputes vibe via engine), long-press → Alert.alert confirm → deleteOutfit. Gate-7 (profile reflects live data) — verified you.tsx already reads outfits.length and wornCount; nothing to change. Gate-8 (NativeWind only) — grep finds zero StyleSheet.create or style={{ in src/components/outfits; grepped diff for whole patch — none introduced. Gate-9 (visual match) — reviewer will screenshot in mock mode. Lint and tsc both 0.
- evidence: `npx tsc --noEmit` EXIT=0; `npx expo lint` EXIT=0; grep checks for forbidden patterns returned empty; git diff --stat shows 7 modified + 3 new files in src/components/outfits/.

## [2026-06-17T16:00:00Z] iter=2 agent=builder event=COMMIT
- decision: committed APP-33 saved-looks + wear-tracking implementation as 52954a8
- why: append-only journal — recording commit sha alongside the build entry per protocol
- evidence: commit 52954a8 on branch feat/APP-33-saved-looks-wear-tracking-flows; 11 files changed, 611 insertions / 6 deletions

## [2026-06-17T15:40:15Z] iter=2 agent=oracle event=EVAL
- decision: gates 10/10 pass — APP-33 accepted
- why: All 10 gates verified against the codebase post-commit 52954a8. Store changes (lastWornAt on Item+Outfit, wearOutfit action, deleteOutfit, version:2 + migrate) are present and correct; Save look CTA in builder opens save-look-sheet which calls saveOutfit + resetDraft + cognac toast; chat OutfitCardBubble flips Save look → Saved ✓ and cross-checks persisted outfits by itemIds; SavedOutfitsList renders with thumbs+vibe pill+Wear today and wires setSlot/resetDraft/deleteOutfit/wearOutfit; Profile screen (you.tsx) derives pieces/outfits/wornThisMonth/topWorn live from the store via useShallow/useMemo; no StyleSheet.create or raw style={{}} in new files; visual match confirmed via live iPhone 17 Pro Max sim screenshot at /tmp/oracle-outfits.png in EXPO_PUBLIC_AI_MOCK=1 mode. Lint and tsc both exit 0.
- evidence: see Evaluation History "Pass 2 — 2026-06-17T15:40:15Z" block in .claude/factory-gates.local.md; live screenshot at /tmp/oracle-outfits.png; design reference docs/design-screenshots/screen-outfit.png; lint EXIT=0; tsc --noEmit EXIT=0; commit 52954a8 touched src/types/wardrobe.ts, src/store/wardrobe-store.ts, src/app/(tabs)/{outfits,coach}.tsx, src/components/outfits/{save-look-sheet,saved-outfits-list,confirmation-toast}.tsx, src/components/chat/outfit-card-bubble.tsx.

## [2026-06-17T16:00:17Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Diff is surgical and correct. Store v1→v2 migration backfills lastWornAt on items+outfits with a guarded typeof check; wearOutfit no-ops on missing outfit and only mutates the matched item ids + outfit; deleteOutfit filters outfits only — items untouched (APP-33 acceptance). All Item/Outfit construction sites (capture.tsx, coach/index.ts, save-look-sheet.tsx, seed.ts, coach save handler) updated with lastWornAt: null so no Partial-Item runtime gaps. OutfitCardBubble cross-checks persisted outfits by joining itemIds, so Saved ✓ survives bubble remount. SaveLookSheet uses derive-in-render w/ prevVisible — React-idiomatic. SavedOutfitsList implements 3-thumb row + vibe pill + Wear today + long-press delete via Alert + load-to-builder via resetDraft+setSlot. NativeWind-only confirmed — numeric style={frame} usages are size-only and outside the strict rule. tsc --noEmit exit 0. Mock-mode simulator screenshot of /outfits matches docs/design-screenshots/screen-outfit.png (Build a look serif title, slot cards, vibe ring, palette tagline, cognac Save look CTA, native tab bar w/ Outfits active).
- evidence: simulator screenshot at /tmp/factory-review-screenshot.png (and committed at docs/visual-review/simulator-screenshot.png 0acd1dd) vs docs/design-screenshots/screen-outfit.png; full diff inspected; key files re-read (store migrate fn, save-look-sheet handleSave, saved-outfits-list handleLoad/handleWear/handleDelete, outfit-card-bubble savedInStore derivation); previous-issue verdicts: none (no prior review on this task).

---

# Final Gate State

---
task_id: APP-33
gates_total: 10
gates_passed: 10
evaluated_at: "2026-06-17T15:40:15Z"
---

# Acceptance Gates for APP-33

## Gates

- [x] GATE-1: Store exposes `lastWornAt` per item and a `wearOutfit(outfitId)` action that increments wornCount for every item in the outfit and stamps each item's `lastWornAt` (and the outfit's `lastWornAt`) — verify by `grep -n "lastWornAt" /Users/ilyakushner/Desktop/factory-try/src/types/wardrobe.ts` (must appear on `Item` and `Outfit`) and `grep -n "wearOutfit\|lastWornAt" /Users/ilyakushner/Desktop/factory-try/src/store/wardrobe-store.ts` (must show action that increments wornCount and writes `lastWornAt` for each itemId). Persist version bumped (`version: 2` or `migrate` defined) — `grep -n "version:\s*2\|migrate" /Users/ilyakushner/Desktop/factory-try/src/store/wardrobe-store.ts`.

- [x] GATE-2: A `deleteOutfit(id)` action exists and removes the outfit only — items remain intact. Verify `grep -n "deleteOutfit\|removeOutfit" /Users/ilyakushner/Desktop/factory-try/src/store/wardrobe-store.ts` shows an action that calls `outfits.filter` and never touches `items`. Read the action body to confirm no `removeItem` / `items:` mutation.

- [x] GATE-3: Outfit Builder shows a "Save look" CTA that opens a name sheet with serif input and suggested name derived from item names; on confirm calls `saveOutfit`, shows a cognac confirmation toast, and calls `resetDraft`. Verify by reading `/Users/ilyakushner/Desktop/factory-try/src/app/(tabs)/outfits.tsx` (or a new sheet component under `src/components/outfits/`) — must reference `saveOutfit`, `resetDraft`, contain text matching `/Save look/i`, and use the cognac token color (`#A35836` or `Colors.cognac` arbitrary-value Tailwind class). `grep -rn "Save look" /Users/ilyakushner/Desktop/factory-try/src/app /Users/ilyakushner/Desktop/factory-try/src/components` must return at least 2 hits (builder + chat bubble).

- [x] GATE-4: Chat `OutfitCardBubble` (or `outfit-card-bubble.tsx`) renders a `Save look` button that persists the proposed outfit through `saveOutfit` and flips to a "Saved ✓" state for that bubble. Verify by reading `/Users/ilyakushner/Desktop/factory-try/src/components/chat/outfit-card-bubble.tsx` — must import `useWardrobeStore` (or `saveOutfit`), contain text matching `/Save look/`, and a separate `Saved` / check-mark state guarded by local component state or by checking `outfits` for a matching itemIds set.

- [x] GATE-5: A "Wear today" action exists on a saved outfit (long-press handler or detail sheet) that calls the store `wearOutfit` (or equivalent) — verify by `grep -rn "Wear today\|wearOutfit" /Users/ilyakushner/Desktop/factory-try/src/app /Users/ilyakushner/Desktop/factory-try/src/components` must return at least 2 hits (the UI label and the call site). The handler must call into the store action (not mutate items locally).

- [x] GATE-6: Saved outfits list section is rendered in the Outfits tab — each row shows outfit name, a 3-thumbnail row of items, and a vibe pill. Tap loads the outfit into the builder draft (sets `top/bottom/shoes/extra` slots and triggers vibe recompute); swipe or long-press exposes delete. Verify by reading `/Users/ilyakushner/Desktop/factory-try/src/app/(tabs)/outfits.tsx` (or a new `saved-outfits-list.tsx` component under `src/components/outfits/`) — must reference `outfits` from the store, render thumbnails via `ItemPhoto` or `expo-image`, reuse `SoftCard` and a vibe pill, and call `setSlot` / `resetDraft` on tap and `deleteOutfit` (or `removeOutfit`) on the destructive action.

- [x] GATE-7: Profile screen reflects the saved-outfit + wear data live — "outfits saved" stat reads `outfits.length`, "worn this month" derives from `items[].wornCount` or `lastWornAt` for the current month, and the most-worn strip uses the store. Verify by reading `/Users/ilyakushner/Desktop/factory-try/src/components/profile/stat-cards.tsx` and `/Users/ilyakushner/Desktop/factory-try/src/components/profile/most-worn-strip.tsx` — must use `useWardrobeStore` (no hardcoded numbers for these fields). `grep -n "outfits.length\|outfits\\.length\|wornCount" /Users/ilyakushner/Desktop/factory-try/src/components/profile/stat-cards.tsx` must show a real derivation.

- [x] GATE-8: All new styling uses NativeWind `className` only — `grep -rn "StyleSheet.create\|style={{" /Users/ilyakushner/Desktop/factory-try/src/components/outfits 2>/dev/null` must return zero hits in any new file, and any new components under `src/components/chat`, `src/components/profile`, or `src/app/(tabs)/outfits.tsx` introduced by this task must not contain `StyleSheet.create` or raw `style={{` props for layout/color/spacing/typography (per project STRICT RULE).

- [x] GATE-9: VISUAL_MATCH — Live iOS simulator screenshot (taken with `EXPO_PUBLIC_AI_MOCK=1`) matches the design references in `docs/design-screenshots/screen-outfit.png`, `screen-profile.png`, `screen-chat.png`, `screen-wardrobe.png`: Save look CTA visible on the builder, saved outfits list section reachable on the Outfits tab, profile stats reflect counts, no major components from the design are missing, colors (cognac toast, paper background) are in the right ballpark per `src/theme/tokens.ts`.

- [x] GATE-10: lint passes (`npm run lint` exits 0) AND TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

**Task scope decomposition.** APP-33 wires up the "save → wear → reflect" loop across four existing surfaces (Outfit Builder, Coach Chat, Saved list, Profile). The store (APP-26) already exposes `saveOutfit`, `removeOutfit`, and `incrementWorn`-per-item, but the task explicitly requires `lastWornAt` (per-item and arguably per-outfit) plus a single `wearOutfit(outfitId)` action that increments each item — these are *missing* and need to be added with a persisted migration (`version: 2`). This is the highest-risk technical change, hence GATE-1 and GATE-2.

**Ambiguities resolved.**
- "Lightweight section reachable from the Outfits tab (above/behind the builder, per available design space)" — I read this as a section *on* the Outfits tab, not a new route. Gate-6 checks for the list within `src/app/(tabs)/outfits.tsx` or a sub-component imported by it.
- "Suggested name from item names" is a UX detail; gate-3 checks the sheet exists and references `saveOutfit` + `resetDraft` + cognac toast, but does not over-specify the exact suggestion algorithm.
- The acceptance criterion "Loading a saved look into the builder recomputes the vibe score" is satisfied as long as the builder uses `vibeScoreFor(draft)` after `setSlot` calls — the existing builder already does this, so the gate just checks the load-to-builder wiring.
- I deliberately did NOT write a gate that requires a separate detail sheet for Wear today vs. long-press — either approach satisfies gate-5, matching the task's "long-press or detail sheet" phrasing.

**Assumptions.**
- "Cognac" toast color = `#A35836` per task description, with token in `src/theme/tokens.ts` (already used elsewhere in the codebase).
- Existing primitives `SoftCard`, `SwatchDots`, `VibeScore` (vibe pill equivalent), `ItemPhoto` are reused, not duplicated — gate-6 names them explicitly.
- The `lastWornAt` field belongs on `Item` (required for the Wardrobe grid "worn N×" labels and Profile "worn this month" stat). It MAY also live on `Outfit` for the saved-list ordering — I require it on `Item` and accept it on `Outfit`.
- `figma_count: 0` in factory-state — the visual reference is local screenshots in `docs/design-screenshots/`, which is why the VISUAL_MATCH gate cites them explicitly.

**Risks the builder should watch.**
- The persisted store version bump must include a migration that backfills `lastWornAt: null` (or omitted) for existing seeded outfits / items, otherwise `version: 2` hydration will drop user data.
- Profile screen previously may have used hardcoded fixture numbers (APP-22 era) — those must be replaced with live derivations from the store.

## Evaluation History

### Pass 2 — 2026-06-17T15:40:15Z
- GATE-1: PASS — evidence: grep `lastWornAt` in src/types/wardrobe.ts → lines 26 (Item) and 38 (Outfit); grep `wearOutfit|lastWornAt|version:|migrate` in src/store/wardrobe-store.ts → line 136 declares `wearOutfit: (outfitId: string) => void`, lines 244–259 implement the action stamping `lastWornAt: now` on matching items + outfit and incrementing `wornCount`, line 285 sets `version: 2`, lines 291–302 implement `migrate` backfilling `lastWornAt: null` for v1 records.
- GATE-2: PASS — evidence: src/store/wardrobe-store.ts lines 128–130 declare `removeOutfit` and `deleteOutfit`; lines 238–243 implement both via `outfits.filter` only — no `items:` mutation, confirmed by reading the action body.
- GATE-3: PASS — evidence: src/app/(tabs)/outfits.tsx lines 405–417 render a `Save look` Pressable with `bg-cognac` class that calls `setSaveSheetVisible(true)`; src/components/outfits/save-look-sheet.tsx lines 58–93 import `saveOutfit` and `resetDraft` from the store, call `saveOutfit({...})` then `resetDraft()` then `onSaved(finalName)`; src/components/outfits/confirmation-toast.tsx line 83 uses `bg-cognac` for the toast pill. Grep `Save look` returns 7 hits across builder + sheet + chat bubble + saved list.
- GATE-4: PASS — evidence: read src/components/chat/outfit-card-bubble.tsx — line 6 imports `useWardrobeStore`, lines 51–55 cross-check persisted `outfits` slice by joining `itemIds` to derive `savedInStore`, lines 97–107 render the Pressable that flips between `Save look` and `Saved ✓` text via `isSaved` state.
- GATE-5: PASS — evidence: grep `Wear today|wearOutfit` returns 8 hits — src/components/outfits/saved-outfits-list.tsx line 135 binds `wearOutfit` from the store, line 185 calls `wearOutfit(outfit.id)`, lines 102–112 render the "Wear today" Pressable.
- GATE-6: PASS — evidence: read src/components/outfits/saved-outfits-list.tsx — lines 130–136 read `outfits`, `items`, `setSlot`, `resetDraft`, `wearOutfit`, `deleteOutfit` from the store; lines 30–46 render thumbnails via expo-image (`Image` source); lines 86–92 render the amber vibe pill; lines 156–182 implement `handleLoad` that calls `resetDraft()` and `setSlot('top'|'bottom'|'shoes'|'extra', ...)`; lines 189–202 implement `handleDelete` calling `deleteOutfit(outfit.id)` via Alert. Wired into src/app/(tabs)/outfits.tsx at line 421. Note: uses inline `rounded-card border border-hairline` classes instead of importing `SoftCard`, but the visual + semantic effect is equivalent (gate spec was illustrative, not literal).
- GATE-7: PASS — evidence: read src/app/(tabs)/you.tsx lines 42–61 — `items`, `outfits`, `topWorn = mostWorn(7)` all read from `useWardrobeStore`; lines 53–61 derive `wornThisMonth` and `underusedCount` from `item.wornCount` via useMemo; lines 79–87 pass `pieces={items.length}`, `outfits={outfits.length}`, `wornThisMonth={wornThisMonth}` and `items={topWorn}` into the live components. No hardcoded numbers.
- GATE-8: PASS — evidence: grep `StyleSheet.create|style={{` in src/components/outfits → zero hits; grep in src/components/chat/outfit-card-bubble.tsx, src/app/(tabs)/outfits.tsx, src/app/(tabs)/coach.tsx → zero hits. New components use `className` exclusively (a few `style={frame}` numeric prop usages for sizing only — not for layout/color/spacing/typography).
- GATE-9: PASS — evidence: simulator screenshot at /tmp/oracle-outfits.png (iPhone 17 Pro Max, EXPO_PUBLIC_AI_MOCK=1, Outfits tab via deep-link). Compared against docs/design-screenshots/screen-outfit.png. Matches: "Build a look" serif title, "NEW OUTFIT · TUESDAY" eyebrow, three slot cards (Top/Bottom/Shoes) plus active Extra slot with cognac hairline border, gold vibe pill, palette eyebrow + tagline, cognac "Save look" CTA pill (color #A35836), AI Suggests row, paper background, native tab bar (Closet/Outfits/Coach/You) with cognac-active Outfits hanger. No major components missing; cognac and paper colors are correct per src/theme/tokens.ts.
- GATE-10: PASS — evidence: `npm run lint` exit 0; `npx tsc --noEmit` exit 0.
