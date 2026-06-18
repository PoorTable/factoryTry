# Factory Decision Journal — APP-39

Task: Pick from photo library (expo-image-picker) in capture flow — enables simulator testing
Started: 2026-06-17T16:10:04Z
Branch: feat/APP-39-pick-from-photo-library

Append-only. Every agent records every decision here.

## [2026-06-17T16:10:04Z] iter=0 agent=orchestrator event=INIT
- decision: Factory boot for APP-39
- why: User invoked /factory with Linear URL https://linear.app/apptryout/issue/APP-39
- evidence: n/a

## [2026-06-17T16:10:04Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: Tracker=linear; issue=APP-39 "Pick from photo library (expo-image-picker) in capture flow"; status=Todo; priority=High; project=Wardrobe v1
- why: Linear get_issue returned full description with scope + acceptance criteria; relatedTo APP-37, APP-29, APP-19 (no blocking)
- evidence: Linear MCP get_issue APP-39

## [2026-06-17T16:10:04Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: No Figma URLs and no local design screenshots referenced; implementation guided by acceptance criteria + AGENTS.md tokens (paper/cognac glass-blurred button per description)
- why: Issue description contains no figma.com URLs and no docs/design-screenshots/ paths; only code-path references (src/app/capture.tsx, photo-store, use-garment-camera)
- evidence: Linear issue body inspected

## [2026-06-17T16:10:04Z] iter=0 agent=orchestrator event=BRANCH
- decision: Created feat/APP-39-pick-from-photo-library off main (post fast-forward to 2744c6b)
- why: Fresh branch from updated main; no stash needed (working tree clean)
- evidence: git checkout -b feat/APP-39-pick-from-photo-library exit 0

## [2026-06-18T06:16:40Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 9 gates for APP-39
- why: Task is a small, single-screen addition (library picker as secondary action in capture flow) — 9 gates is the right granularity. Split into: dependency presence (G1), permission plist/plugin (G2), UI affordance with correct tokens (G3), picker API + permission request (G4), graceful denial reusing camera-permission-denied pattern (G5), single-pipeline reuse / no duplicate identify or savePhoto call (G6, the highest-risk gate per the AC "no separate code path for identify input"), NativeWind strictness via diff-grep (G7, enforces AGENTS.md strict rule), and the always-on lint+tsc gates (G8, G9). No VISUAL_MATCH gate because figma_count=0 and no local design screenshots are referenced — the PR-time reviewer screenshot per AGENTS.md still runs and covers the visual check on a one-button change. Key ambiguity resolved: "SDK 56-compatible version" verified by presence + node_modules install (not a pinned semver), since env: load .env
env: export GITHUB_PAT
› Installing using npm
> npm install

up to date, audited 1081 packages in 3s

203 packages are looking for funding
  run `npm fund` for details

15 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details. is the correct way to add it. "Secondary to shutter" treated as: shutter Pressable (testID=shutter) must still exist; library button added nearby — gate doesn't pixel-pin the layout.
- evidence: Read .claude/factory-state.local.md (54 lines), src/app/capture.tsx (479 lines, single identify() entry at L132–164 confirmed, savePhoto entry at L184 confirmed), src/hooks/use-garment-camera.ts (120 lines, internal setPhotoUri+setState('frozen') pattern at L108–109 confirmed as the reusable plumbing target), src/components/camera-permission-denied.tsx (40 lines, paper+cognac Linking.openSettings pattern confirmed for G5 reuse target), app.json (51 lines, expo-camera config plugin pattern at L27–33 confirmed as the shape G2 should mirror), package.json (Expo 56.0.8 confirmed; expo-image-picker NOT currently installed). Wrote .claude/factory-gates.local.md with 9 gates.

## [2026-06-18T00:00:00Z] iter=0 agent=orchestrator event=GATES_WRITTEN
- decision: Oracle wrote 9 acceptance gates covering dep install, iOS permission key, viewfinder UI affordance, picker call, denial UX, single downstream pipeline, NativeWind-only diff, lint, tsc
- why: Issue has explicit acceptance criteria + scope; Oracle skipped VISUAL_MATCH gate because figma_count=0 and no local screenshots referenced; mandatory PR-time simulator screenshot still applies per AGENTS.md
- evidence: .claude/factory-gates.local.md (9 gates), oracle agent id a3fc63d2a1e71c391

## [2026-06-18T00:00:00Z] iter=0 agent=orchestrator event=INIT
- decision: Wrote .claude/ralph-loop.local.md (max 40 iter, completion=FACTORY COMPLETE) and verified all four hookify guard files present (block-push-main, block-force-push, warn-file-delete, block-env-commit)
- why: All phases through 8 complete; loop ready to arm
- evidence: ls .claude/hookify.*.local.md returned 4 files; ralph-loop.local.md written

## [2026-06-18T00:00:00Z] iter=1 agent=builder event=BUILD
- decision: Pick up uncommitted work from prior iteration and refactor to satisfy GATE-4 literal grep (picker API must appear in src/app/capture.tsx, not just the hook)
- why: Prior implementation moved entire picker + permission flow into use-garment-camera.ts. That cleanly funnels both takePhoto and pickFromLibrary into a shared commitPhoto, but it fails GATE-4 which greps capture.tsx specifically for launchImageLibraryAsync + requestMediaLibraryPermissionsAsync. Oracle Notes also hinted "loadPhoto(uri)" — i.e. picker stays in screen, hook just accepts a URI. Refactor: rename hook export to loadPhoto(uri) (URI in, freeze state out, no picker concerns), and put ImagePicker.requestMediaLibraryPermissionsAsync + launchImageLibraryAsync directly in capture.tsx. Keeps single-pipeline invariant (loadPhoto reuses commitPhoto). Also handles GATE-5 by checking permission.granted + result.canceled before loadPhoto.
- evidence: gates re-read; current grep -nE 'ImagePicker' capture.tsx returns 0 hits (would fail GATE-4)

## [2026-06-18T00:00:00Z] iter=1 agent=builder event=SELF_REVIEW
- decision: Clean — all 9 gates verified, lint+tsc green
- why: Re-ran each gate's grep. G1 dep present (~56.0.18) + node_modules. G2 photosPermission entry in app.json plugin. G3 library button at L351 with paper/cognac NativeWind tokens (bg-paper/15, border-paper/30, text-paper) and shutter testID still at L333. G4 ImagePicker.requestMediaLibraryPermissionsAsync + launchImageLibraryAsync both in capture.tsx. G5 picker handler checks result.granted, picked.canceled, and falls back to Linking.openSettings on permanent denial. G6 grep -c "identify(base64)" = 1, grep -c "savePhoto(" = 1 — single pipeline preserved via loadPhoto(uri) on the hook that funnels into the same commitPhoto path as takePhoto. G7 diff grep for ^+.*StyleSheet.create|style={{ returned empty. Null safety: handler guards every step (granted, canceled, ?.[0]?.uri) before calling loadPhoto.
- evidence: npm run lint exit 0; npx tsc --noEmit exit 0; gate greps above

## [2026-06-18T00:00:00Z] iter=1 agent=builder event=COMMIT
- decision: Committed APP-39 work as b8b8acf
- why: All 9 gates passed locally; lint+tsc green; self-review clean
- evidence: git commit b8b8acf "feat: pick from photo library in capture flow (APP-39)"

## [2026-06-18T07:04:47Z] iter=1 agent=oracle event=EVAL
- decision: gates 9/9 pass
- why: APP-39 builder commit b8b8acf added expo-image-picker dep, app.json plugin with photosPermission, library button with NativeWind-only styling, onPickFromLibrary handler that calls requestMediaLibraryPermissionsAsync + launchImageLibraryAsync, denial handled via Linking.openSettings, loadPhoto reused in use-garment-camera.ts so identify(base64) and savePhoto remain single-call. Lint and tsc both clean.
- evidence: see .claude/factory-gates.local.md Evaluation History Pass 1; commands run: grep on src/app/capture.tsx for ImagePicker/library/testID/granted/canceled/Settings, grep -c identify(base64)=1, grep -c savePhoto(=1, git diff for forbidden styling (no matches), npm run lint EXIT=0, npx tsc --noEmit EXIT=0.

## [2026-06-18T07:23:37Z] iter=1 agent=reviewer event=REVIEW
- decision: APPROVED
- why: APP-39 diff is correct and minimal. New library button uses NativeWind paper tokens only (className="...border-paper/30 bg-paper/15 text-paper"). Picker handler in capture.tsx properly checks result.granted, calls Linking.openSettings on permanent denial, early-returns on canceled / missing asset. Selected image funnels through loadPhoto -> commitPhoto in use-garment-camera.ts, which sets the same {photoUri, state:'frozen'} that takePhoto sets — so the existing identify(base64) useEffect remains the single downstream pipeline entry. app.json declares the expo-image-picker config plugin with photosPermission for iOS. Visual sim screenshot confirms the new affordance renders at bottom-left of shutter exactly per design intent.
- evidence: visual screenshot at docs/visual-review/simulator-screenshot.png (commit 22ce794) shows capture viewfinder with new ⧉ library button bottom-left of 74px shutter, paper/cognac tokens, corner brackets + ADD A PIECE pill intact. Code-level: grep -c 'identify(base64)' src/app/capture.tsx = 1; grep -c 'savePhoto(' src/app/capture.tsx = 1; diff for StyleSheet.create / style={{}} on touched files = empty. Permission denial path mirrors src/components/camera-permission-denied.tsx (Linking.openSettings). SDK 56 compatibility verified by package-lock.json (~56.0.18) and native build (npx expo run:ios after pod install with LANG=en_US.UTF-8) — required because the prior dev-client binary on the sim predated expo-image-picker.

---

# Final Gate State

---
task_id: APP-39
gates_total: 9
gates_passed: 9
evaluated_at: "2026-06-18T06:48:01Z"
---

# Acceptance Gates for APP-39

## Gates

- [x] GATE-1: `expo-image-picker` is declared in `package.json` dependencies at an SDK 56-compatible version (Expo SDK 56 expects the `~56.x` range per https://docs.expo.dev/versions/v56.0.0/). Verify: `node -e "console.log(require('/Users/ilyakushner/Desktop/factory-try/package.json').dependencies['expo-image-picker'])"` returns a version string (not `undefined`), AND `ls /Users/ilyakushner/Desktop/factory-try/node_modules/expo-image-picker/package.json` exists.

- [x] GATE-2: iOS photo-library usage description is configured. Verify by reading `app.json` (or `app.config.{js,ts}` if added): either (a) `expo.ios.infoPlist.NSPhotoLibraryUsageDescription` is set to a non-empty string, OR (b) the `expo-image-picker` config plugin entry is present in `expo.plugins` with a `photosPermission` string. Check: `grep -E "NSPhotoLibraryUsageDescription|expo-image-picker|photosPermission" /Users/ilyakushner/Desktop/factory-try/app.json` returns at least one match.

- [x] GATE-3: A "Choose from library" affordance is rendered in the viewfinder state of `src/app/capture.tsx` as a SECONDARY action next to the shutter. Verify: `grep -nE "library|Library|photos" /Users/ilyakushner/Desktop/factory-try/src/app/capture.tsx` shows a Pressable/button referencing the library, AND the `testID="shutter"` Pressable still exists with its 74px paper inner disc (shutter is not removed/replaced). The new button must use NativeWind `className` with Wardrobe paper/cognac tokens (e.g. `bg-paper`, `border-paper`, `text-paper`, `bg-cognac`, `text-cognac`, or `/`-opacity variants like `bg-paper/15`, `border-paper/30`) — no `StyleSheet.create` and no `style={{...}}` inline object literals for layout/color/spacing on the new button.

- [x] GATE-4: Library picker invokes `launchImageLibraryAsync` and requests permission at tap time. Verify: `grep -nE "launchImageLibraryAsync|requestMediaLibraryPermissionsAsync|ImagePicker" /Users/ilyakushner/Desktop/factory-try/src/app/capture.tsx` shows both `launchImageLibraryAsync` AND a permission request call (`requestMediaLibraryPermissionsAsync` or the equivalent `useMediaLibraryPermissions` hook from `expo-image-picker`). The handler must be wired to the new library button's `onPress`.

- [x] GATE-5: Library permission denial is handled gracefully — denial does NOT crash and reuses the existing camera-permission-denied pattern. Verify by reading `src/app/capture.tsx`: the picker handler must inspect the permission result (e.g. `status !== 'granted'` or `!result.granted`) and either (a) render `<CameraPermissionDenied />` style copy / a similar paper+cognac "Open Settings" state, OR (b) deep-link to settings via `Linking.openSettings()` (matching `src/components/camera-permission-denied.tsx`). `grep -nE "granted|canceled|Settings" /Users/ilyakushner/Desktop/factory-try/src/app/capture.tsx` must show the result is checked before the URI is used.

- [x] GATE-6: Selected image is fed through the SAME downstream pipeline as a captured frame — no duplicate identify input path. Verify: (a) the picker handler must land in the same `state === 'frozen'` + `photoUri` state the camera uses, either by exposing a new method on `useGarmentCamera` (e.g. `loadPhoto(uri)` that sets `photoUri` + `state='frozen'`) and reusing it, OR by routing through the existing `setPhotoUri`/`setState` plumbing; (b) the existing `useEffect` in `capture.tsx` that calls `identify(base64)` when `state === 'frozen' && photoUri` MUST remain the single identify entry point — `grep -c "identify(base64)" /Users/ilyakushner/Desktop/factory-try/src/app/capture.tsx` must return `1` (NOT 2); (c) the picker path must NOT add a separate `savePhoto(...)` call — the existing one inside `onAddToWardrobe` is reused. Check `grep -c "savePhoto(" /Users/ilyakushner/Desktop/factory-try/src/app/capture.tsx` returns `1`.

- [x] GATE-7: All new styling on the library button and any denial UI uses NativeWind `className` exclusively (STRICT RULE from AGENTS.md). Verify against the diff vs `main`: `git diff main -- src/app/capture.tsx src/components/ | grep -E "^\+" | grep -E "StyleSheet\.create\(|style=\{\{"` returns no matches. (Pre-existing `style={positionStyle}` / `style={weaveStyle}` / `style={swatchStyle}` runtime-computed style variable refs are out of scope — only NEW inline-object literals or `StyleSheet.create` calls are forbidden.)

- [x] GATE-8: lint passes (`npm run lint` exits 0).

- [x] GATE-9: TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

**Task scope.** Add `expo-image-picker` so the iOS simulator (no working camera) can feed real images into the existing capture → identify pipeline (APP-19/APP-29). Camera stays default; library is a secondary affordance. Independent of the on-device runtime (APP-35) — runs in mock AI mode today.

**Key existing pieces to reuse (NOT duplicate):**
- `src/app/capture.tsx` — single identify entry point is the `useEffect` keyed off `state === 'frozen' && photoUri` (line 132). The picker MUST land in this same state; no second `identify()` call.
- `src/hooks/use-garment-camera.ts` — owns `{ photoUri, state }`. The cleanest plumbing is to expose a `loadPhoto(uri)` (or similar) that mirrors what `takePhoto` does internally: `setPhotoUri(uri); setState('frozen')`. Builder should add this rather than ducking around the hook.
- `src/services/photo-store.ts` (`savePhoto`) — already called inside `onAddToWardrobe`. The picker path must NOT call it separately; it falls out automatically when the user taps "Add to wardrobe".
- `src/components/camera-permission-denied.tsx` — paper/cognac denial pattern. Library denial should match this look or call the same `Linking.openSettings()` affordance.

**Ambiguities resolved.**
- "SDK 56-compatible version" → I verify the package is installed and declared, not pinned to a specific semver. The builder should use `npx expo install expo-image-picker` (Expo's resolver picks the SDK 56 range).
- "Secondary to shutter" → the shutter Pressable (`testID="shutter"`) still exists at its 74px size/position; the library button is added nearby with smaller visual weight (e.g. paper-tinted glass pill to the left of the shutter, matching the close/flash button language at lines 254–278). The gate doesn't enforce exact pixel layout — only that the shutter still exists and a library control is reachable in the viewfinder state.
- "NSPhotoLibraryUsageDescription via app.json / config plugin" → either path is acceptable. The `expo-image-picker` config plugin auto-injects the Info.plist key when `photosPermission` is passed; raw `expo.ios.infoPlist` also works.

**Assumptions.**
- Wardrobe paper/cognac tokens come from `tailwind.config.js` (`bg-paper`, `bg-cognac`, `text-paper`, etc.) as used elsewhere in `capture.tsx` (lines 222, 260, 295, 469).
- The picked image's URI from `launchImageLibraryAsync` is a `file://` or `ph://` URI that the existing `new File(photoUri).arrayBuffer()` path (line 138) can read. (expo-file-system's `File` accepts `file://`; if `ph://` is returned, the builder must handle it — but this is an implementation detail, not a gate concern.)

**Risks the builder should watch.**
- Adding a second `identify(...)` call inside the picker handler — GATE-6's `grep -c` of `identify(base64)` catches this.
- Leaking `style={{...}}` literals or `StyleSheet.create` on the new button — GATE-7's diff-grep catches this.
- Forgetting the Info.plist key / config plugin — GATE-2 catches this.
- Picker returning `canceled: true` → handler must early-return, not feed an undefined URI into `loadPhoto`.

**No VISUAL_MATCH gate here:** `figma_count = 0`, no local design screenshots referenced in the task, and the change is a single small secondary control on an already-existing screen. The PR-time reviewer screenshot (per CLAUDE.md / AGENTS.md "Visual Match + Screenshot on Every PR") still runs and provides the visual sanity check.

## Evaluation History

### Pass 1 — 2026-06-18T06:48:01Z
- GATE-1: PASS — evidence: `node -e require('package.json').dependencies['expo-image-picker']` → `~56.0.18`; `ls node_modules/expo-image-picker/package.json` exists.
- GATE-2: PASS — evidence: `grep -E "NSPhotoLibraryUsageDescription|expo-image-picker|photosPermission" app.json` → matches `expo-image-picker` plugin entry with `photosPermission: "Wardrobe uses your photo library..."`.
- GATE-3: PASS — evidence: `grep` on src/app/capture.tsx shows `testID="library-button"` Pressable (line 351) with accessibilityLabel "Choose from library"; shutter Pressable still present at line 333 with `h-[74px] w-[74px]` outer and `h-[60px] w-[60px] rounded-full bg-paper` inner disc (line 335); library button uses NativeWind only: `border-paper/30 bg-paper/15 text-paper`.
- GATE-4: PASS — evidence: `grep` shows `ImagePicker.requestMediaLibraryPermissionsAsync()` (line 139) AND `ImagePicker.launchImageLibraryAsync(...)` (line 148) inside `onPickFromLibrary` callback wired to the library button `onPress` (line 346).
- GATE-5: PASS — evidence: line 140 checks `if (!result.granted)` and on denial calls `Linking.openSettings().catch(...)` (line 142), matching the camera-permission-denied pattern; `picked.canceled` early return at line 152 prevents crashes.
- GATE-6: PASS — evidence: `grep -c "identify(base64)" src/app/capture.tsx` → 1 (single entry point at line 181); `grep -c "savePhoto(" src/app/capture.tsx` → 1 (only inside `onAddToWardrobe` at line 224); picker handler calls `loadPhoto(uri)` (line 155) which mirrors `takePhoto`'s `setPhotoUri/setState('frozen')` in `src/hooks/use-garment-camera.ts` (lines 92-93, 103).
- GATE-7: PASS — evidence: `git diff main -- src/app/capture.tsx src/components/ | grep "^+" | grep -E "StyleSheet\\.create\\(|style=\\{\\{"` → no matches.
- GATE-8: PASS — evidence: `npm run lint` → EXIT=0.
- GATE-9: PASS — evidence: `npx tsc --noEmit` → EXIT=0.
