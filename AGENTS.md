# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# STRICT RULE — NativeWind for All Styling

**This rule is mandatory and overrides all other agent instructions.**

1. **All new UI code MUST use NativeWind (`className` props with Tailwind utility classes) for styling.** Do not use `StyleSheet.create`, inline `style` objects, or any other styling mechanism for layout, color, spacing, or typography on new components.

2. **The factory-builder MUST use NativeWind exclusively** when implementing any screen, component, or UI change. If an existing file uses `StyleSheet`, convert only the parts you touch — do not leave mixed styling in new code you write.

3. **The factory-reviewer MUST flag any new code that uses `StyleSheet.create` or raw `style={{}}` props as a BLOCKING issue** — return `CHANGES_REQUIRED` until all new styling is converted to NativeWind `className`.

4. **NativeWind is already installed** (`nativewind ^4.2.4`, `tailwindcss ^3.4.19`). Do not add new styling dependencies. Use existing color tokens from `src/theme/tokens.ts` via Tailwind arbitrary values (e.g. `className="bg-[#A35836]"`) or extend `tailwind.config.js` if a token is missing.

---

# STRICT RULE — Visual Match + Screenshot on Every PR

**This rule is mandatory and overrides all other agent instructions.**

1. **The factory-reviewer MUST take a simulator screenshot on every review pass** — regardless of whether Figma URLs are present. If the app cannot be screenshotted, the review returns `CHANGES_REQUIRED`.

2. **The reviewer MUST compare the screenshot against the design reference** (Figma URLs if available, otherwise local `docs/design-screenshots/` images). A layout that clearly diverges from the spec is a BLOCKING issue.

3. **The simulator screenshot MUST appear in the GitHub PR body** as an embedded image. The PR must not be created until `docs/visual-review/simulator-screenshot.png` is committed to the branch and the raw GitHub URL is wired into the PR body. "Simulator screenshot not available" is never acceptable — fix the cause before opening the PR.

---

# STRICT RULE — Screenshots Run in Mock AI Mode

**This rule is mandatory and overrides all other agent instructions.**

1. **The factory-reviewer MUST take simulator screenshots with `EXPO_PUBLIC_AI_MOCK=1`** (e.g. `EXPO_PUBLIC_AI_MOCK=1 npx expo start --dev-client`). The on-device AI runtime (`react-native-executorch`, APP-35) does not initialize on the iOS simulator, so screens that depend on AI output would otherwise render an empty / loading state.

2. **Mock mode returns the design-handoff fixtures** from `src/services/ai/server/fixtures.ts` (garment tag set, "Quiet luxury" outfit reply, "Warm Autumn" palette) — exactly the data the design reviews and Figma frames were built against. The reviewer should treat those fixtures as the canonical reference for screens that show AI output.

3. **A screenshot taken without `EXPO_PUBLIC_AI_MOCK=1`** counts as "screenshot not available" under the visual-review rule above and MUST be retaken before the PR is opened.
