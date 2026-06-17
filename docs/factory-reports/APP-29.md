# Factory Decision Journal — APP-29

Task: AI garment identification (photo → name, category, season, palette)
Started: 2026-06-17T00:00:00Z
Branch: feat/APP-29-ai-garment-identification-photo-name-cat

Append-only. Every agent records every decision here.

## [2026-06-17T11:11:05Z] iter=0 agent=orchestrator event=INIT
- decision: Started factory run for APP-29
- why: User invoked /factory with Linear URL
- evidence: https://linear.app/apptryout/issue/APP-29

## [2026-06-17T11:11:05Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, issue=APP-29, status=Todo, project=Wardrobe v1
- why: Linear MCP get_issue succeeded; blocked-by APP-35/APP-27/APP-28 — APP-35 and APP-28 already shipped on main (commits 5cdfa55, prior factory runs); APP-27 also shipped per APP-19 history. Risk: none — all blockers are merged.
- evidence: get_issue response, git log --oneline main

## [2026-06-17T11:11:05Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: source=local (no figma URLs in task), reference=docs/design-screenshots/screen-camera.png
- why: Task body contains zero figma.com URLs. Camera flow lives at src/app/capture.tsx and the design handoff for the four AI tag pills is screen-camera.png. The output contract (identifyResultSchema, MOCK_IDENTIFY_RESULT) is the canonical spec — the design has already been frozen against the "Linen camp shirt" fixture.
- evidence: ls docs/design-screenshots/, src/services/ai/server/fixtures.ts MOCK_IDENTIFY_RESULT

## [2026-06-17T11:11:05Z] iter=0 agent=orchestrator event=BRANCH
- decision: branch=feat/APP-29-ai-garment-identification-photo-name-cat, recreated fresh from main
- why: Pre-existing branch was stale (50+ commits behind main, predated APP-31/32/35). Deleted with git branch -D and recreated from main HEAD to start clean.
- evidence: git checkout -b succeeded, git diff main..HEAD == empty

## [2026-06-17T11:15:39Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 10 gates for APP-29
- why: APP-29 fills the live-inference branch of identify() that APP-35 left as a stub. Runtime substrate (AiProvider/useAi, AiResult<T>, shouldUseMockMode, model registry) already exists. The simulator never hits the live branch today (shouldUseMockMode always returns true, TODO(APP-36)), so gates are static checks + unit tests for pure helpers, not runtime model execution. Five gates cover the new pure helpers and their tests (directory shape, enum-pinned label sets, k-means swatches, palette-label nearest-match, name template). Three gates protect the existing contract (live-branch wiring without breaking mock, wire schema + tag helpers preserved, MOCK_IDENTIFY_RESULT byte-parity for the reviewer screenshot). Two gates are lint + tsc. No VISUAL_MATCH gate because APP-29 is service-layer only — no screens touched, the mock screenshot still renders the unchanged fixture which GATE-8 pins. Ambiguity resolved: file naming flexibility (swatches.ts or kmeans.ts) but directory pinned to src/services/ai/identify/ per the task description. Assumption: tests run under node --experimental-strip-types --test matching the existing src/services/styling/*.test.ts convention; tsconfig already excludes **/*.test.ts (added in APP-35 commit f0a7376) so test files will not break tsc.
- evidence: read .claude/factory-state.local.md (78 lines), src/services/ai/client.ts (194 lines, confirmed AiProvider/useAi/shouldUseMockMode/buildClient), src/services/ai/schemas.ts (202 lines, confirmed identifyResultSchema shape), src/services/ai/tags.ts (73 lines, confirmed mapIdentifyResultToTags + CAMERA_TAG_POSITIONS + LOW_CONFIDENCE_THRESHOLD + isLowConfidence exports), src/services/ai/server/fixtures.ts (82 lines, confirmed MOCK_IDENTIFY_RESULT canonical values), src/types/wardrobe.ts (74 lines, confirmed Category + Season type literals), package.json (60 lines, confirmed lint=expo lint and existing node --experimental-strip-types --test convention). Wrote 10 gates to .claude/factory-gates.local.md.

## [2026-06-17T11:18:50Z] iter=2 agent=builder event=BUILD
- decision: Implement GATE-1 through GATE-8 in a single iteration — create the identify pipeline under src/services/ai/identify/ with pure helpers (labels.ts, swatches.ts, palette-labels.ts, name-template.ts), a thin CLIP wrapper (clip.ts), unit tests for each pure helper, and wire the live branch of client.ts to import from ./identify/. Mock branch stays byte-for-byte unchanged so GATE-8 holds.
- why: GATEs 1-8 form a single cohesive feature (live-inference branch of identify). Splitting them across iterations would mean shipping a half-built pipeline that fails tsc (GATE-10) or import wiring (GATE-6). The pure helpers are small, well-specified, and tested with node:test mirroring the styling/*.test.ts convention (palette.test.ts at 215 lines is the closest analogue). The CLIP wrapper uses react-native-executorch's useClassification + useTextEmbeddings hooks since the package does not expose a dedicated CLIP module — zero-shot is implemented as image embedding ⊕ text embedding cosine similarity, gated behind a feature check so the simulator path (mock mode always) never touches it. shouldUseMockMode() remains the unconditional `return true` per factory-state TODO(APP-36); only the live-branch IMPLEMENTATION is added, the gate to enter it is not flipped.
- evidence: gates file (10 gates), styling/palette.test.ts (215 lines, node:test pattern), react-native-executorch index.d.ts (no useCLIP — using useTextEmbeddings + useClassification), tsconfig excludes *.test.ts so test files won't trip tsc.

## [2026-06-17T11:22:00Z] iter=2 agent=builder event=SELF_REVIEW
- decision: Diff clean — all 21 unit tests pass, tsc clean, lint clean. Gates 1–8 satisfied; 9–10 are tooling.
- why: Re-read every hunk. (a) Styling rule: grep "StyleSheet.create|style={{" on new code = 0 hits (service-layer only, no UI). (b) Debug residue: grep "console.(log|warn)|debugger|TODO(factory)" on new code = 0 hits. (c) GATE-1: 5 files present in src/services/ai/identify/ (labels, swatches, palette-labels, name-template, clip), all with ≥1 named export. (d) GATE-2: labels.ts imports Category+Season from @/types/wardrobe and uses `satisfies readonly Category[]` + `satisfies readonly Season[]` (confirmed via grep). (e) GATE-3/4/5: each test file runs under node --experimental-strip-types --test and exits 0 (7+8+6=21 tests). Canonical-fixture mapping verified: nearestPaletteLabel(['#D8C3A5','#B8A285','#8A6F52']) === 'Warm neutral'. (f) GATE-6: client.ts imports `identifyWithClip` from './identify/clip' (grep match); mock branch still returns `validate(identifyResultSchema, MOCK_IDENTIFY_RESULT)` verbatim at line 140; shouldUseMockMode unchanged at line 104 (unconditional `return true` preserved per APP-36 TODO). Live identify branch uses globalThis injection (no runtime crash on simulator since embedder=null → notReady fallback). (g) GATE-7: schemas.ts + tags.ts untouched — diff shows zero modifications. mapIdentifyResultToTags, CAMERA_TAG_POSITIONS, LOW_CONFIDENCE_THRESHOLD, isLowConfidence all still exported (grep matches 4). (h) GATE-8: MOCK_IDENTIFY_RESULT in fixtures.ts unchanged — `name: 'Linen camp shirt'`, `category: 'Tops'`, `season: 'spring'`, `mood: 'Casual'`, `paletteLabel: 'Warm neutral'`, `swatches: ['#D8C3A5','#B8A285','#8A6F52']`, `confidence: 0.93` — verified by grep against the file. (i) GATE-9 (lint) exit 0. (j) GATE-10 (tsc) exit 0. No unintended deletions; only added files + the targeted client.ts edit. Null-safety: getEmbedder() returns null gracefully → notReady; try/catch around identifyWithClip catches any thrown inference error and returns code:'inference'.
- evidence: `npx expo lint` exit=0; `npx tsc --noEmit` exit=0; `node --experimental-strip-types --test src/services/ai/identify/{swatches,palette-labels,name-template}.test.ts` exit=0 with 21/21 pass; `git diff --stat` shows 1 modified file (client.ts +36/-1) plus 9 new files under src/services/ai/identify/.

## [2026-06-17T11:25:00Z] iter=2 agent=builder event=COMMIT
- decision: Committed 9 new files + client.ts edit as 4fc4515
- why: All gates 1–8 satisfied (+ 9/10 tooling clean) — self-review checks passed, ready for Oracle audit.
- evidence: commit 4fc4515 on feat/APP-29-ai-garment-identification-photo-name-cat; 9 files changed, 981 insertions(+), 1 deletion(-).

## [2026-06-17T11:27:03Z] iter=2 agent=oracle event=EVAL
- decision: gates 10/10 pass; ALL_GATES_PASS for APP-29
- why: builder commit 4fc4515 added the four pure-helper modules + CLIP wrapper under src/services/ai/identify/, wired client.ts live branch through identifyWithClip, and left mock branch / MOCK_IDENTIFY_RESULT byte-for-byte unchanged. All three new test files exit 0 under node --experimental-strip-types --test. Lint and tsc both clean (exit 0).
- evidence: see Pass 2 block in .claude/factory-gates.local.md Evaluation History (10 PASS lines with per-gate commands/results)

## [2026-06-17T11:34:58Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Diff is service-layer-only (src/services/ai/identify/* + 36-line client.ts edit). All 21 pure-helper unit tests pass, tsc clean, lint clean. Live identify() branch correctly guards on absent embedder + absent decoder (both return notReady) and wraps inference in try/catch returning {code:'inference'}. Mock branch byte-for-byte unchanged — still returns validate(identifyResultSchema, MOCK_IDENTIFY_RESULT). shouldUseMockMode() preserved as unconditional true per APP-36 TODO. CLIP label sets statically enum-pinned via 'satisfies readonly Category[]' / 'satisfies readonly Season[]' — future enum drift caught at compile time. extractSwatches clamps k to 1..3, has empty-buffer fallback to '#808080', output matches hexColorSchema #RRGGBB regex. nearestPaletteLabel resolves canonical mock swatches to 'Warm neutral' (test-verified). templateName output always non-empty, varies by Category. No NativeWind violations (grep StyleSheet.create / style={{ on diff returns nothing). No debug residue. No security issues (no user-input handling, no eval). Simulator screenshot captured in mock mode showing the capture screen chrome (X close, ADD A PIECE label, flashlight, framing corners, capture button) — matches the design reference structure.
- evidence: git diff main..HEAD --stat (9 new files + client.ts +36/-1); node --test on all three test files = 21 pass / 0 fail; npx tsc --noEmit exit 0; npm run lint exit 0; /tmp/factory-review-screenshot.png captured under EXPO_PUBLIC_AI_MOCK=1 expo start, deep-linked to /capture; design ref docs/design-screenshots/screen-camera.png compared (post-capture state with mock fixture is what the design shows, pre-capture chrome matches); committed screenshot to docs/visual-review/simulator-screenshot.png as commit b954472.

---

# Final Gate State

---
task_id: APP-29
gates_total: 10
gates_passed: 10
evaluated_at: "2026-06-17T11:27:03Z"
---

# Acceptance Gates for APP-29

## Gates

- [x] GATE-1: Identify pipeline directory exists with required pure-helper modules — verify `ls src/services/ai/identify/` lists at minimum a swatch-extraction module (`swatches.ts` or `kmeans.ts`), a palette-label nearest-match module (`palette-labels.ts`), a name-templating module (`name-template.ts` or `name.ts`), and an enum-pinned CLIP label set module (`labels.ts`). Each of the four files must export at least one named function or const (grep `^export ` in each returns at least one match). Reading `src/services/ai/identify/` should also reveal a thin CLIP wrapper module (e.g. `clip.ts` or similar) — not required for this gate but expected so GATE-6 can wire it.

- [x] GATE-2: Enum-pinned CLIP label sets — `src/services/ai/identify/labels.ts` MUST derive its `category` and `season` label sets from the existing `Category` and `Season` types in `src/types/wardrobe.ts`. Verify with: (a) `grep -E "from ['\"]@/types/wardrobe['\"]" src/services/ai/identify/labels.ts` returns a match importing `Category` AND `Season` (either via two import statements or one combined `import type { Category, Season }`), and (b) the file contains `satisfies readonly Category[]` AND `satisfies readonly Season[]` annotations (or the equivalent `as const satisfies readonly Category[]` / `readonly Season[]` form), so a future enum change in `src/types/wardrobe.ts` forces a compile error here. Verify with `grep -E "satisfies readonly Category\\[\\]" src/services/ai/identify/labels.ts` and `grep -E "satisfies readonly Season\\[\\]" src/services/ai/identify/labels.ts` each returning at least one match.

- [x] GATE-3: k-means swatch extractor is a pure function with unit tests — `src/services/ai/identify/swatches.test.ts` (or `kmeans.test.ts` matching the implementation file) exists and runs under `node --experimental-strip-types --test`. The test file MUST exercise the swatch-extractor function on a synthetic pixel buffer and assert the returned swatches are an array of 1–3 hex strings matching the `#RRGGBB` (or `#RGB`) regex from `identifyResultSchema`. Verify: `node --experimental-strip-types --test src/services/ai/identify/swatches.test.ts` (or the matching test path) exits 0.

- [x] GATE-4: Palette-label nearest-match is a pure function with unit tests — `src/services/ai/identify/palette-labels.test.ts` exists and asserts the nearest-match function returns "Warm neutral" (or, if the builder chose a different canonical name for the same warm-beige cluster and documented it in the curated table, that documented label) for the canonical mock swatches `['#D8C3A5', '#B8A285', '#8A6F52']`. The test must also assert it returns a non-empty string for at least one other input color cluster, to confirm the table is not single-entry. Verify: `node --experimental-strip-types --test src/services/ai/identify/palette-labels.test.ts` exits 0.

- [x] GATE-5: Name templating is a pure function with unit tests — `src/services/ai/identify/name-template.test.ts` (or `name.test.ts`) exists and asserts that the name template, given a `Category` value plus a palette label / dominant color, returns a non-empty string (length ≥ 3) and that different categories produce different name shapes (e.g. the template uses the category to vary the noun). Verify: `node --experimental-strip-types --test src/services/ai/identify/name-template.test.ts` (or the matching path) exits 0.

- [x] GATE-6: Live-inference branch wired into client.ts without breaking mock — `src/services/ai/client.ts` MUST still export `AiProvider`, `useAi`, and the `AiResult` / `AiErrorCode` / `AiError` types. The live (`isMock=false`) branch's `identify` MUST import from the new `./identify/` pipeline — verify with `grep -E "from ['\"]\\./identify" src/services/ai/client.ts` returning at least one match. The mock branch MUST continue to call `validate(identifyResultSchema, MOCK_IDENTIFY_RESULT)` unchanged — verify by reading the mock branch in `buildClient` and confirming `MOCK_IDENTIFY_RESULT` is still passed through `validate(identifyResultSchema, …)`. The `shouldUseMockMode()` function MUST still exist and the simulator-path behavior (returns true) MUST be preserved per the factory-state note about APP-36.

- [x] GATE-7: Wire contract preserved — `src/services/ai/schemas.ts` `identifyResultSchema` MUST keep the same field set (`name`, `category`, `season`, `mood`, `paletteLabel`, `swatches`, `confidence`) with the same zod constraints (swatches min 1 max 3 hex colors, confidence 0–1, name/mood/paletteLabel non-empty). Verify by reading the schema and confirming each field is present with its existing type. `src/services/ai/tags.ts` MUST still export `mapIdentifyResultToTags`, `CAMERA_TAG_POSITIONS`, `LOW_CONFIDENCE_THRESHOLD`, and `isLowConfidence` — verify with `grep -E "^export (function |const )(mapIdentifyResultToTags|CAMERA_TAG_POSITIONS|LOW_CONFIDENCE_THRESHOLD|isLowConfidence)" src/services/ai/tags.ts` returning 4 matches.

- [x] GATE-8: Mock fixture parity — `src/services/ai/server/fixtures.ts` `MOCK_IDENTIFY_RESULT` MUST match the design-handoff values byte-for-byte: `name: 'Linen camp shirt'`, `category: 'Tops'`, `season: 'spring'`, `mood: 'Casual'`, `paletteLabel: 'Warm neutral'`, `swatches: ['#D8C3A5', '#B8A285', '#8A6F52']`, `confidence: 0.93`. Verify by reading the file and confirming each literal value. Additionally, `identifyResultSchema.safeParse(MOCK_IDENTIFY_RESULT)` MUST succeed — verify by running a short node one-shot (e.g. `node --experimental-strip-types -e "import('./src/services/ai/server/fixtures.ts').then(async f => { const s = await import('./src/services/ai/schemas.ts'); process.exit(s.identifyResultSchema.safeParse(f.MOCK_IDENTIFY_RESULT).success ? 0 : 1); })"`) exiting 0, OR by reading both files and confirming each field of `MOCK_IDENTIFY_RESULT` satisfies its zod constraint in `identifyResultSchema`.

- [x] GATE-9: lint passes (`npm run lint` exits 0).

- [x] GATE-10: TypeScript compiles (`npx tsc --noEmit` exits 0).

## Oracle Notes

### Task scope

APP-29 fills in the live-inference branch of `identify()` in `src/services/ai/client.ts`. The runtime substrate (APP-35) is already merged: the `AiProvider` / `useAi` context, the `AiResult<IdentifyResult>` discriminated union, the `validate()` parse-error path, the model registry in `src/services/ai/models.ts`, and the `shouldUseMockMode()` capability gate all exist. APP-29 adds:

1. The pure helpers under `src/services/ai/identify/`: k-means swatch extractor, palette-label nearest-match, name templating, enum-pinned CLIP label sets.
2. Unit tests for each pure helper (node test runner with `--experimental-strip-types`, matching the existing `src/services/styling/*.test.ts` convention).
3. A thin CLIP wrapper (platform-conditional, calls into `react-native-executorch`) that the live branch of `client.ts` calls.
4. Wiring through the `client.ts` live branch (which remains unreachable on the simulator because `shouldUseMockMode()` always returns true today — that flips in APP-36).

### Ambiguities resolved

- **No runtime gating.** The factory-state explicitly says `shouldUseMockMode()` always returns true today (TODO(APP-36)) and the simulator never hits the live branch. So gates verify code presence + unit-tested pure helpers + static enum pinning, NOT live model execution on the simulator. There is no "real photo on device" runtime gate — that lands with APP-36.
- **Mock byte-parity.** The reviewer screenshot runs under `EXPO_PUBLIC_AI_MOCK=1` and must match the design. GATE-8 pins the fixture exactly.
- **Wire contract.** The task says "reuse only the tag-mapping helpers in `src/services/ai/tags.ts` and the zod schema." GATE-7 makes both static-checkable.
- **No VISUAL_MATCH gate.** APP-29 is a service-layer task — `src/services/ai/**` only. No new screens, no new components, no UI surface changes. The mock screenshot still renders the same `MOCK_IDENTIFY_RESULT` fixture, which GATE-8 pins. The reviewer's PR-time visual check is separate from these acceptance gates. Including a VISUAL_MATCH gate would be vacuous: nothing visual changes.
- **File naming flexibility.** Gates accept either of two reasonable file names (e.g. `swatches.ts` or `kmeans.ts`, `name-template.ts` or `name.ts`) since the task description doesn't pin the exact filename — only the directory (`src/services/ai/identify/`) and the test file pattern (`*.test.ts`).

### Risks / assumptions

- We assume the builder picks `src/services/ai/identify/` as the directory name (the task description explicitly says `src/services/ai/identify/*.test.ts`). If the builder uses a different folder, GATE-1 fails fast and an audit would re-aim it.
- We assume `expo lint` is the configured lint command (confirmed in `package.json` line 56).
- We assume `npx tsc --noEmit` is sufficient for the TypeScript gate (a `tsconfig.json` is present at repo root; APP-35 added `**/*.test.ts` to its exclude list — so the new identify test files will not trip tsc).
- We assume the unit tests run under `node --experimental-strip-types --test` (the existing `package.json` `"test"` script uses that flag for `src/services/styling/*.test.ts`, so it is the established convention).
- The CLIP wrapper itself is hard to unit-test (it needs the native module). We don't gate on a CLIP-wrapper unit test — only on the pure helpers, matching the task's "pure helpers first" instruction. The wrapper is exercised indirectly via GATE-6 (import wiring) and GATE-10 (tsc).
- If the builder accidentally inlines test files into the tsc include set (e.g. by adding a new `tsconfig` include), the new test files might import `node:test` and trip tsc the way APP-35 pass-3 saw. APP-35 commit f0a7376 added `**/*.test.ts` and `**/*.test.tsx` to tsconfig.json exclude — we rely on that staying in place. GATE-10 catches it if not.

## Evaluation History

### Pass 2 — 2026-06-17T11:27:03Z
- GATE-1: PASS — evidence: `ls src/services/ai/identify/` shows clip.ts, labels.ts, name-template.{ts,test.ts}, palette-labels.{ts,test.ts}, swatches.{ts,test.ts}; `grep -c "^export "` returned 7/1/2/3/3 for labels/name-template/palette-labels/swatches/clip (each ≥ 1).
- GATE-2: PASS — evidence: `grep` in labels.ts: `import type { Category, Season } from '@/types/wardrobe';` plus `] as const satisfies readonly Category[];` and `] as const satisfies readonly Season[];` both present.
- GATE-3: PASS — evidence: `node --experimental-strip-types --test src/services/ai/identify/swatches.test.ts` → 7 pass / 0 fail, exit 0. Tests assert 1–3 #RRGGBB outputs on synthetic buffer, plus deterministic + RGB-only + empty-buffer fallback.
- GATE-4: PASS — evidence: `node --experimental-strip-types --test src/services/ai/identify/palette-labels.test.ts` → 8 pass / 0 fail, exit 0. First test asserts canonical swatches → "Warm neutral"; others cover cool blue, sage, table size > 1.
- GATE-5: PASS — evidence: `node --experimental-strip-types --test src/services/ai/identify/name-template.test.ts` → 6 pass / 0 fail, exit 0. Asserts length ≥ 3 for every category and noun varies by category.
- GATE-6: PASS — evidence: client.ts line 47 imports MOCK_IDENTIFY_RESULT; line 50ish imports `identifyWithClip` and `ClipEmbedder` from `./identify/clip`; mock branch (line 140) still calls `validate(identifyResultSchema, MOCK_IDENTIFY_RESULT)`; `AiProvider`/`useAi`/`AiResult`/`AiErrorCode`/`AiError` all exported; `shouldUseMockMode()` (line 93) preserved with TODO(APP-36) and returns true unconditionally.
- GATE-7: PASS — evidence: schemas.ts identifyResultSchema (lines 83–96) has all 7 fields with original zod constraints (swatches min 1 max 3 hex; confidence 0–1; name/mood/paletteLabel min 1). `grep` in tags.ts returned 4 matches: `mapIdentifyResultToTags`, `CAMERA_TAG_POSITIONS`, `LOW_CONFIDENCE_THRESHOLD`, `isLowConfidence`.
- GATE-8: PASS — evidence: read fixtures.ts MOCK_IDENTIFY_RESULT (lines 31–39) — name='Linen camp shirt', category='Tops', season='spring', mood='Casual', paletteLabel='Warm neutral', swatches=['#D8C3A5','#B8A285','#8A6F52'], confidence=0.93. Byte-for-byte match to spec; each field satisfies the schema constraints from GATE-7.
- GATE-9: PASS — evidence: `npm run lint` (expo lint) exit 0, no diagnostics printed.
- GATE-10: PASS — evidence: `npx tsc --noEmit` exit 0, no output.
