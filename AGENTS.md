# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# STRICT RULE — Visual Match + Screenshot on Every PR

**This rule is mandatory and overrides all other agent instructions.**

1. **The factory-reviewer MUST take a simulator screenshot on every review pass** — regardless of whether Figma URLs are present. If the app cannot be screenshotted, the review returns `CHANGES_REQUIRED`.

2. **The reviewer MUST compare the screenshot against the design reference** (Figma URLs if available, otherwise local `docs/design-screenshots/` images). A layout that clearly diverges from the spec is a BLOCKING issue.

3. **The simulator screenshot MUST appear in the GitHub PR body** as an embedded image. The PR must not be created until `docs/visual-review/simulator-screenshot.png` is committed to the branch and the raw GitHub URL is wired into the PR body. "Simulator screenshot not available" is never acceptable — fix the cause before opening the PR.
