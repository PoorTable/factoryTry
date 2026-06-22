# Factory Decision Journal — APP-43

Task: Spike: RNE 0.9.x compatibility + hook API contract (de-risk the unmock)
Started: 2026-06-22T11:35:00Z
Branch: feat/APP-43-spike-rne-0-9-x-compatibility-hook-api

Append-only. Every agent records every decision here.

## [2026-06-22T11:35:32Z] iter=0 agent=orchestrator event=INIT
- decision: Factory run started for APP-43 via /factory
- why: User invoked dark factory on Linear spike ticket
- evidence: task_url https://linear.app/apptryout/issue/APP-43

## [2026-06-22T11:35:32Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, issue=APP-43, type=SPIKE (deliverable is a doc: docs/ai-models/rne-0.9-spike.md)
- why: Linear get_issue returned title/description; AC requires cited sources for all 3 questions
- evidence: status=Backlog, priority=Urgent, blocks APP-40/41/42, relatedTo APP-29; blockedBy=[] (no blockers)

## [2026-06-22T11:35:32Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: No design reference (no Figma URLs, no design-screenshots referenced in task)
- why: Spike is research/verification of react-native-executorch 0.9.x; deliverable is a markdown decision note, not UI
- evidence: figma_urls=[] in issue description; docs/ai-models/ contains only README.md

## [2026-06-22T11:35:32Z] iter=0 agent=orchestrator event=BRANCH
- decision: Created feat/APP-43-spike-rne-0-9-x-compatibility-hook-api off main
- why: slug derived from task_title, truncated to 40 chars; stashed dirty tree first (app.json, eas.json, package.json, package-lock.json from APP-29 work) — needed git reset HEAD on staged eas.json to unstash cleanly
- evidence: git stash "factory-APP-43-autostash"; main pulled fast-forward 18f8b07..40efd47; branch HEAD on main

## [2026-06-22T11:35:32Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: Recorded current-state grounding for builder/oracle
- why: Spike must compare current vs target RNE
- evidence: installed react-native-executorch=0.4.10 (declared ^0.4.6); stack react-native@0.85.3, react@19.2.3, expo@~56.0.8; target=0.9.x; identify/clip.ts does zero-shot CLIP (image+text embeddings)

## [2026-06-22T11:38:01Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 9 gates for APP-43 (docs-only RNE 0.9.x spike, citation-enforced)
- why: SPIKE deliverable is docs/ai-models/rne-0.9-spike.md only; no UI/Figma (figma_count:0) so NO VISUAL_MATCH gate. Defining ticket constraint is CITATION per finding (resolved peerDependencies range, copied .d.ts signature, or doc URL) -> gates 4/5/6/7 enforce a citation in each of Q1/Q2/Q3, treating fenced code blocks, http(s) URLs, and pinned peerDependencies as valid citation markers. Mapped each ticket AC to a gate: existence+three-questions (G1/G2/G7), Q1 go/no-go+pin or conflict+fallback (G3/G4), Q2 real useLLM+useImageEmbeddings signatures (G5), Q3 CLIP text path or documented absence+clip.ts impact (G6), Linear comments on APP-40/41/42 or explicit no-op (G8), lint+tsc hygiene (G9). Assumptions: G3 accepts clean-go OR documented no-go+fallback; G6 accepts text-encoder-found OR documented-absence; G8 accepts an explicit 'no assumptions invalidated' statement since the doc is the only repo-checkable surface for Linear state. Risk noted: grep can be keyword-gamed, so evaluator must read each section and quote the substantive line, not just count matches.
- evidence: read .claude/factory-state.local.md (APP-43, figma_count:0, deliverable docs/ai-models/rne-0.9-spike.md); ran ls docs/ai-models (only README.md present), ls src/services/ai/identify (clip.ts present); inspected package.json scripts (lint='expo lint', NO typecheck script, tsc binary present at node_modules/.bin/tsc -> G9 uses npx tsc --noEmit). Wrote .claude/factory-gates.local.md (9 gates).

## [2026-06-22T11:42:00Z] iter=2 agent=builder event=BUILD
- decision: Picked GATE-1..8 together (the whole spike doc); writing docs/ai-models/rne-0.9-spike.md answering Q1/Q2/Q3 with cited sources, plus G8 Linear-reflection statement.
- why: SPIKE is a single deliverable; all content gates are satisfied by one doc. Sources are all real: pinned RNE 0.9.2 (npm view peerDependencies = {react:'*',react-native:'*'} -> no npm conflict), .d.ts copied from the 0.9.2 tarball (npm pack react-native-executorch@0.9.2) for useLLM/useImageEmbeddings/useTextEmbeddings, CLIP_VIT_BASE_PATCH32_TEXT constant from modelUrls.d.ts, and the SWM compatibility doc URL (RN 0.85 = yes; Expo SDK table tops out at 55 -> documented caveat). All three answers are positive findings; no APP-40/41/42 assumption is invalidated, so G8 satisfied via explicit no-op statement with justification.
- evidence: npm view react-native-executorch@0.9.0/0.9.1/0.9.2 peerDependencies (all wildcard); /tmp/rne-spike/package/lib/typescript/{hooks,types}/*.d.ts; constants/modelUrls.d.ts lines 872-940; docs.swmansion.com/.../other/compatibility; src/services/ai/identify/clip.ts (ClipEmbedder needs encodeImage+encodeText -> both encoders confirmed reachable).

## [2026-06-22T11:46:00Z] iter=2 agent=builder event=SELF_REVIEW
- decision: Clean. Doc passes all content gates G1-G8 by grep; lint + tsc green (G9).
- why: Re-read every section against literal gate text. G1 290 lines (>=40). G2 three sections present. G3 GO verdict + pinned 0.9.2 + fallback 0.8.4. G4/G7 citations real (copied .d.ts fences + npm peerDependencies output + live SWM/HF URLs), one in each of Q1/Q2/Q3. G5 useLLM contract (sendMessage/generate both return string + stream via response; messageHistory) and forward(input: string|PixelData) accepts URI, doc-comment quoted "File path, URL, or Base64". G6 useTextEmbeddings + clip-vit-base-patch32-text named, references clip.ts with concrete design impact. G8 explicit "no assumptions were invalidated" with per-issue justification. No styling/debug residue (doc-only). git status: only the new file added, no deletions.
- evidence: wc -l=290; grep gate checks all >=1; git status shows only ?? docs/ai-models/rne-0.9-spike.md; LINT_EXIT=0; TSC_EXIT=0.

## [2026-06-22T11:47:00Z] iter=2 agent=builder event=COMMIT
- decision: Committed spike doc.
- why: All gates satisfied; follow-up to the BUILD entry with the SHA.
- evidence: commit 6f8ee6c "docs: RNE 0.9.x compatibility + hook API contract spike (APP-43)"; 1 file, 290 insertions.

## [2026-06-22T13:06:02Z] iter=2 agent=oracle event=EVAL
- decision: gates 9/9 pass — ALL_GATES_PASS for APP-43
- why: All three spike answers independently verified against authoritative sources, not keyword presence. The builder's three load-bearing claims are REAL: (1) RNE 0.9.2 exists with wildcard peerDeps — confirmed via npm view for 0.9.0/0.9.1/0.9.2, all {react:*, react-native:*}; (2) useImageEmbeddings.forward(string|PixelData)=>Promise<Float32Array> — confirmed verbatim in the 0.9.2 tarball typings; (3) useTextEmbeddings + clip-vit-base-patch32-text encoder — confirmed in types/textEmbeddings.d.ts and constants/modelUrls.d.ts CLIP_VIT_BASE_PATCH32_TEXT. No fabrication found. Cited URLs (docs.swmansion compat, HF checkpoint) return HTTP 200. Diff touched only the doc; lint+tsc re-verified exit 0. No regressions.
- evidence: npm view react-native-executorch versions/peerDependencies (exit 0); npm pack react-native-executorch@0.9.2 + cat package/lib/typescript/{hooks,types,constants}/*.d.ts; read src/services/ai/identify/clip.ts (ClipEmbedder lines 45-50 match); curl compat URL=200, HF URL=200; npm run lint exit 0; npx tsc --noEmit exit 0. See Evaluation History Pass 2 block in factory-gates.local.md.

## [2026-06-22T13:07:38Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: Docs-only SPIKE (APP-43). All 3 questions answered, each with a REAL cited source independently re-verified, not asserted. Q1 peerDeps {react:*,react-native:*} for 0.9.2 (latest stable) confirmed via npm view; Expo SDK 56 gap honestly flagged as doc gap not a false "supported" claim; go-verdict + pin 0.9.2 + fallback 0.8.4 present. Q2 useImageEmbeddings.forward(string|PixelData)=>Promise<Float32Array> + "File path, URL, or Base64" comment match published 0.9.2 tarball verbatim; useLLM generate/sendMessage/messageHistory/response all present. Q3 useTextEmbeddings hook exists+exported, clip-vit-base-patch32-text + CLIP_VIT_BASE_PATCH32_TEXT confirmed, image+text share same HF checkpoint (shared CLIP space); clip.ts design-impact note correct against real ClipEmbedder interface (Float32Array->number[] and URI-vs-buffer mismatches are genuine). No runtime code / package.json / lock / app.json / eas.json in main..HEAD diff — only the doc. No NativeWind/StyleSheet concern (no UI). Internally consistent.
- evidence: git diff --name-only main..HEAD = docs/ai-models/rne-0.9-spike.md only. Independent verification: npm view react-native-executorch@0.9.2 peerDependencies (wildcard, matches doc); npm pack 0.9.2 tarball -> types/imageEmbeddings.d.ts:57, types/llm.d.ts, types/textEmbeddings.d.ts:7, constants/modelUrls.d.ts:937, hooks/natural_language_processing/useTextEmbeddings.d.ts (exported in index.d.ts:65) all match doc claims. src/services/ai/identify/clip.ts:45-49 ClipEmbedder matches quoted interface. Visual review: no UI change in this spike, so existing committed screenshot docs/visual-review/simulator-screenshot.png (git ls-files confirms; commit af620d8; real 1206x2622 PNG, mock-mode capture screen) satisfies the file requirement; no new capture warranted.

## [2026-06-22T13:08:09Z] iter=2 agent=orchestrator event=EVAL
- decision: Iteration 2 complete — all gates pass, reviewer APPROVED, proceeding to ship PR
- why: gates 9/9 passed (Oracle independently verified RNE 0.9.2 peerDeps, useImageEmbeddings.forward URI, useTextEmbeddings+clip text model against npm tarball/registry — no fabrication). Reviewer APPROVED: docs-only diff, no runtime/package.json change, every claim cited, existing screenshot satisfies visual rule (no UI surface).
- evidence: builder commit 6f8ee6c (docs/ai-models/rne-0.9-spike.md, 290 lines); gates_passed=9/9; stall_count=0; review_cycles=0 (approved cycle 1)

---

# Final Gate State

---
task_id: APP-43
gates_total: 9
gates_passed: 9
evaluated_at: "2026-06-22T13:02:19Z"
---

# Acceptance Gates for APP-43

## Gates

- [x] GATE-1: The decision note exists at `docs/ai-models/rne-0.9-spike.md` and is non-trivial (>= 40 lines). Check: `test -f docs/ai-models/rne-0.9-spike.md && wc -l < docs/ai-models/rne-0.9-spike.md` returns a count >= 40.
- [x] GATE-2: The doc has a section for each of the three spike questions. Check: `grep -niE 'toolchain|compatib|peerdepend' docs/ai-models/rne-0.9-spike.md`, `grep -niE 'useLLM|useImageEmbeddings|hook api' docs/ai-models/rne-0.9-spike.md`, and `grep -niE 'clip|text embed|useTextEmbeddings' docs/ai-models/rne-0.9-spike.md` each return >= 1 match.
- [x] GATE-3: Q1 (toolchain) answered with an explicit go/no-go verdict AND an exact pinned RNE version (or a precise conflict + fallback proposal). Check: `grep -niE 'go ?/ ?no-?go|no-?go|verdict|GO\b' docs/ai-models/rne-0.9-spike.md` matches AND a concrete RNE version is pinned `grep -niE 'react-native-executorch[@ ]?[~^]?0\.9|0\.9\.[0-9]' docs/ai-models/rne-0.9-spike.md` matches; if no-go, a fallback (different RNE version or RN bump) is named in the same section.
- [x] GATE-4: Q1 verdict carries a CITED source — a resolved peerDependencies range, a release/registry reference, or a doc/registry URL. Check: within the toolchain section, find at least one of: a `peerDependencies`/version-range citation (e.g. `react-native`/`react`/`expo` pinned ranges) OR an `http`/`https` URL (`grep -niE 'peerDependencies|react-native\":? *\"[^\"]*[0-9]|https?://' docs/ai-models/rne-0.9-spike.md`).
- [x] GATE-5: Q2 (hook API) gives the REAL `useLLM` contract — how a turn is generated (`generate` / `sendMessage` / message-history) and how the final string is read (return value vs streamed `response`) — AND confirms `useImageEmbeddings.forward` accepts a file URI. Each backed by a copied `.d.ts` type signature (code fence) or a doc URL. Check: `grep -niE 'generate|sendMessage|response|messageHistory' docs/ai-models/rne-0.9-spike.md` matches for useLLM; `grep -niE 'forward.*(uri|file|imageSource|string)' docs/ai-models/rne-0.9-spike.md` matches for forward; and the section contains a fenced code block (` ``` `) or an `https?://` URL as citation (`grep -nE '```|https?://' docs/ai-models/rne-0.9-spike.md`).
- [x] GATE-6: Q3 (CLIP text side) names a concrete CLIP text-embedding path — model id + hook (e.g. `useTextEmbeddings` + a CLIP text model id) — OR documents its absence and the design impact on APP-29 / `src/services/ai/identify/clip.ts`, with a cited source. Check: `grep -niE 'useTextEmbeddings|clip.*text|text.*encoder|CLIP_TEXT|model id' docs/ai-models/rne-0.9-spike.md` matches AND the section references `clip.ts` (`grep -niE 'clip\.ts|identify/clip' docs/ai-models/rne-0.9-spike.md`) AND carries a citation (code fence or URL).
- [x] GATE-7: Every one of the three answers carries at least one citation. Check: the doc contains citation markers totalling >= 3 — count fenced code blocks + http URLs + explicit peerDependencies/version-range pins: `grep -cnE '```|https?://|peerDependencies' docs/ai-models/rne-0.9-spike.md` >= 3, and visual inspection confirms one citation lives in each of the Q1/Q2/Q3 sections.
- [x] GATE-8: Invalidating findings are reflected to Linear on APP-40/41/42, OR the doc explicitly states no assumptions were invalidated. Check: `grep -niE 'APP-40|APP-41|APP-42|no assumptions (were )?invalidated|linear comment' docs/ai-models/rne-0.9-spike.md` returns >= 1 match (a "Linear follow-ups" / "Assumptions invalidated" subsection naming the issues, or an explicit no-op statement).
- [x] GATE-9: lint passes (`npm run lint` exits 0) and TypeScript compiles (`npx tsc --noEmit` exits 0). Check: both commands exit 0. (Both ALWAYS re-verified each pass — they regress silently. No `typecheck` script exists; invoke `npx tsc --noEmit` directly.)

## Oracle Notes

This is a SPIKE / docs-only task. The single deliverable is the decision note at
`docs/ai-models/rne-0.9-spike.md`; there is NO UI, NO new dependency, NO runtime
code. Therefore NO VISUAL_MATCH / simulator gate is included (per gate-writer
instruction and the absence of Figma designs, `figma_count: 0`).

The defining constraint from the ticket is CITATION: every finding must be backed
by a resolved `peerDependencies` range, an exported `.d.ts` type signature copied
from the package, or a doc URL. Gates 4, 5, 6, 7 enforce this — an answer that
asserts without a citation does NOT pass. I treat three citation forms as valid
"cited source" markers: a fenced code block (a copied type signature), an
`http(s)://` URL (npm registry / docs.swmansion.com), or an explicit
`peerDependencies` / pinned version range.

Mapping to ticket acceptance criteria:
- AC "doc exists, answers all three, each cited" -> GATE-1, GATE-2, GATE-7.
- AC "Q1 go/no-go + exact pinned version (or conflict + fallback)" -> GATE-3, GATE-4.
- AC "Q2 real useLLM + useImageEmbeddings signatures from typings" -> GATE-5.
- AC "Q3 concrete CLIP text path (model id + hook) or absence + design impact" -> GATE-6.
- AC "invalidating findings reflected as Linear comments on APP-40/41/42" -> GATE-8.
- Standard hygiene so the spike doesn't break existing code -> GATE-9.

Ambiguities / assumptions resolved:
- Current installed RNE is 0.4.10 (declares `^0.4.6`); target is 0.9.x. GATE-3
  accepts either a clean go with a 0.9.x pin, or a documented no-go with a precise
  conflict + fallback (different RNE version or RN bump). Both satisfy the ticket.
- Q3 has two valid outcomes (text encoder reachable, or only image encoder exists);
  GATE-6 accepts either as long as model id/hook is named OR absence is documented
  with the impact on `clip.ts`. The grep for `clip.ts` keeps the design-impact note
  concrete rather than abstract.
- GATE-8 accepts an explicit "no assumptions were invalidated" statement as
  passing, since the Linear comment is only required WHEN a finding invalidates an
  assumption. The evaluator cannot reliably verify Linear API state from the repo,
  so the doc-side declaration is the checkable surface; an actual posted comment is
  a bonus, not the gate's pass condition.
- No `typecheck` npm script exists; `tsc` binary is present in node_modules/.bin,
  so GATE-9 invokes `npx tsc --noEmit` directly.

Risks: grep-based checks can be satisfied by keyword presence without true
substance. The evaluator MUST read the relevant section of the doc (not just count
grep hits) to confirm each answer is actually substantive and the citation is real
(a copied signature / live URL), not a keyword sprinkled to pass a regex. Per-gate
evidence in Evaluation History must quote the specific line, not just the match
count.

## Evaluation History

### Pass 2 — 2026-06-22T13:02:19Z

Diff touched only `docs/ai-models/rne-0.9-spike.md` (git diff HEAD~1 --name-only). No
code regression surface; lint/tsc re-verified anyway. Every load-bearing claim
independently checked against authoritative sources (npm registry + the published
0.9.2 tarball via `npm pack`), not keyword presence.

- GATE-1: PASS — `wc -l docs/ai-models/rne-0.9-spike.md` = 290 (>= 40); file exists.
- GATE-2: PASS — three-section greps = 14 / 17 / 35 matches (toolchain / hook-api / clip), all >= 1.
- GATE-3: PASS — explicit "**Verdict: GO. Pin `react-native-executorch@0.9.2`**" (line 59); version pin present. Independently confirmed 0.9.2 is the latest STABLE: `npm view react-native-executorch version` → `0.9.2`, and 0.9.0/0.9.1/0.9.2 are the only non-nightly 0.9.x in `npm view ... versions --json`. Fallback `0.8.4` named in same section.
- GATE-4: PASS — cited peerDependencies block, independently verified: `npm view react-native-executorch@{0.9.0,0.9.1,0.9.2} peerDependencies --json` ALL return `{ "react": "*", "react-native": "*" }` — matches the doc's quoted block exactly. Compat URL https://docs.swmansion.com/react-native-executorch/docs/other/compatibility returns HTTP 200 (curl).
- GATE-5: PASS — verified against REAL 0.9.2 typings (`npm pack react-native-executorch@0.9.2`). `package/lib/typescript/hooks/natural_language_processing/useLLM.d.ts` overloads match verbatim. `types/llm.d.ts` `LLMTypeBase.generate: (messages: Message[], tools?: LLMTool[]) => Promise<string>` and `LLMType.sendMessage: (message: string) => Promise<string>`, plus streamed `response`/`token`/`messageHistory` — all match. `hooks/computer_vision/useImageEmbeddings.d.ts` + `types/imageEmbeddings.d.ts` `forward: (input: string | PixelData) => Promise<Float32Array>` with doc comment "File path, URL, or Base64-encoded string" — exact match. Citation = code fences. NOT fabricated.
- GATE-6: PASS — verified against real `types/textEmbeddings.d.ts`: `TextEmbeddingsModelName` union includes `'clip-vit-base-patch32-text'`; `useTextEmbeddings` hook exists (`hooks/natural_language_processing/useTextEmbeddings.d.ts`). `constants/modelUrls.d.ts` lines 872-941: `CLIP_VIT_BASE_PATCH32_IMAGE` and `CLIP_VIT_BASE_PATCH32_TEXT` constants with identical `clip-vit-base-patch32` checkpoint + exact HF modelSource/tokenizerSource URLs — match doc verbatim. HF URL returns HTTP 200. Doc references `clip.ts` and quotes the real `ClipEmbedder` interface (matches src/services/ai/identify/clip.ts lines 45-50).
- GATE-7: PASS — `grep -cE '```|https?://|peerDependencies'` = 31 (>= 3); one citation lives in each of Q1 (peerDeps block + compat URL), Q2 (.d.ts fences), Q3 (.d.ts fences + HF URL) on visual inspection.
- GATE-8: PASS — "## Linear follow-ups (APP-40 / APP-41 / APP-42)" subsection (line 252) with explicit "**No assumptions were invalidated.**" (line 254) + per-issue confirmation. Satisfies the no-op-allowed condition per Oracle Notes.
- GATE-9: PASS — `npm run lint` exit 0; `npx tsc --noEmit` exit 0.
