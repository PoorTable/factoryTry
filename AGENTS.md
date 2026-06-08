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
