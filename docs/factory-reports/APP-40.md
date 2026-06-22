# Factory Decision Journal — APP-40

Task: Upgrade react-native-executorch 0.4.10 → 0.9.x + real Expo native integration (dev client)
Started: 2026-06-22
Branch: feat/APP-40-upgrade-rne-0-9-x-expo-native-integration

Append-only. Every decision recorded here.

## [2026-06-22T13:37:25Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: Parsed APP-40 from Linear. Tracker=linear, priority=Urgent, status=Backlog.
- why: APP-40 upgrades RNE to 0.9.x for the CLIP image-embedding API absent in 0.4.10. Blocked-by APP-43 (spike) which is the current branch and is docs-only; branched off main per protocol. Blocks APP-37/APP-42.
- evidence: linear get_issue APP-40; git diff main..APP-43 = docs only (rne-0.9-spike.md, APP-43.md)

## [2026-06-22T13:37:25Z] iter=0 agent=orchestrator event=ESCALATION
- decision: Did NOT arm the autonomous ralph loop. APP-40's proof rules forbid the factory's mock-mode simulator screenshot as proof and require physical-device + EAS-build artifacts I cannot produce. Asked the user; chose "honest code-prep PR".
- why: APP-40 was created specifically because APP-36 "passed its gates while shipping a no-op config plugin and placeholder SHAs." Running the loop to its safety-stop would ship a PR with a mock-mode screenshot + green gates = fabricated device proof. Refused; doing the achievable code work and leaving device-proof ACs open for a human.
- evidence: APP-40 "Proof rules (non-negotiable)" section; CLAUDE.md STRICT RULE (mock-mode simulator screenshot); AskUserQuestion answer="Honest code-prep PR"

## [2026-06-22T13:37:25Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: No Figma. Used APP-43 spike (docs/ai-models/rne-0.9-spike.md) as the integration contract.
- why: Spike pins react-native-executorch@0.9.2 (wildcard peers, RN 0.85 supported), resource-fetcher@0.9.1, expo-asset. Verified published exports: initExecutorch({resourceFetcher}), isAvailable:boolean (RNE); ExpoResourceFetcher (fetcher). isAvailable is the real fail-closed capability probe.
- evidence: npm pack react-native-executorch@0.9.2 → index.d.ts (initExecutorch, isAvailable); react-native-executorch-expo-resource-fetcher@0.9.1 → ResourceFetcher.d.ts (export const ExpoResourceFetcher)

## [2026-06-22T13:43:47Z] iter=1 agent=builder event=BUILD
- decision: Implemented the achievable APP-40 scope. (1) package.json pins react-native-executorch@0.9.2 (exact), adds react-native-executorch-expo-resource-fetcher@0.9.1 + expo-asset@~56.0.17; lockfile updated. (2) New src/services/ai/runtime/executorch.ts: initAiRuntime() calls initExecutorch({resourceFetcher: ExpoResourceFetcher}) fail-closed; isExecutorchAvailable() probes RNE's published `isAvailable` boolean; getExecutorchDiagnostics() for the readout. (3) src/app/_layout.tsx calls initAiRuntime() at module-scope entry. (4) client.ts: shouldUseMockMode() now ONLY honors EXPO_PUBLIC_AI_MOCK=1; new resolveClientMode (pure, src/services/ai/client-mode.ts) → mock|unavailable|live; the unavailable branch returns model-unavailable (no silent mock). (5) Deleted plugins/with-react-native-executorch.js + removed it from app.json. (6) New src/app/diagnostics.tsx on-device readout (NativeWind). (7) New unit test client-mode.test.ts wired into npm test.
- why: APP-43 spike pinned 0.9.2 and confirmed the exact exports. Fail-closed via RNE's own `isAvailable` is the honest capability probe the AC #5 demands. Hook wiring (useLLM/useImageEmbeddings) deliberately left to APP-42 per its scope.
- evidence: npm ci clean (added 920 packages, exit 0); npm test 26/26 pass incl 3 fail-closed cases; tsc --noEmit exit 0; expo lint exit 0; git status shows the 9 file changes

## [2026-06-22T13:43:47Z] iter=1 agent=oracle event=EVAL
- decision: Verifiable ACs MET (in this env): AC#1 (pins + lockfile + npm ci clean), AC#2 (initExecutorch at entry + no-op plugin deleted + no remaining return-config plugin), AC#5 logic (fail-closed unavailable, unit-tested). Device-proof ACs NOT MET and NOT fabricated: AC#3 (EAS dev build URL) and AC#4 (physical-device diagnostics readout) require an Expo build account + physical device unavailable here.
- why: APP-40's non-negotiable proof rules forbid tsc/lint/grep/file-exists as proof of the device ACs. I will not attach a mock-mode simulator screenshot as device proof; doing so would be the exact fabrication this ticket was created to stop. The diagnostics screen + runtime probe are the on-device artifacts a human runs to satisfy AC#3/#4.
- evidence: see BUILD entry command exits; .env EXPO_PUBLIC_AI_MOCK=0 (fail-closed is the real default); AC#3/#4 left unchecked in PR

## [2026-06-22T13:43:47Z] iter=1 agent=orchestrator event=COMPLETE
- decision: Shipping an honest code-prep PR (NOT via the autonomous loop's fabricated-screenshot path). PR marks AC#3/#4 unchecked with explicit human steps.
- why: User chose "honest code-prep PR". No simulator screenshot is attached because APP-40 forbids it as device proof.
- evidence: PR URL recorded after creation

---

# Acceptance Criteria — Honest Status

Verified in this environment (CI/local):

- [x] **AC#1** — `package.json` pins `react-native-executorch@0.9.2`; `react-native-executorch-expo-resource-fetcher@0.9.1` + `expo-asset@~56.0.17` present; lockfile committed; `npm ci` installs clean (exit 0).
- [x] **AC#2** — `initExecutorch({ resourceFetcher: ExpoResourceFetcher })` called at the app entry (`src/app/_layout.tsx`); `plugins/with-react-native-executorch.js` deleted and removed from `app.json`; `grep 'return config'` over the repo = none.
- [x] **AC#5 (logic)** — fail-closed: with mock unset and the native module absent, `resolveClientMode` returns `unavailable` and the client emits `model-unavailable` (never mock). Unit-tested in `client-mode.test.ts` (3/3 pass).

Requires a human with an Expo build account + physical device (cannot be produced by the agent; NOT fabricated):

- [ ] **AC#3** — `eas build --profile development` succeeds for iOS; attach the build URL to APP-40.
- [ ] **AC#4** — on a physical device (with `EXPO_PUBLIC_AI_MOCK` unset), open the `/diagnostics` route; it must show *Native module linked: yes* + a real runtime version. Attach the device screenshot to APP-40.
- [ ] **AC#5 (device proof)** — on web / Expo Go, confirm `/diagnostics` shows *UNAVAILABLE* and AI screens surface `model-unavailable` (no silent mock success).
