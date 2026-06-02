# ADR-001: Styling System Selection

**Status:** Accepted  
**Date:** 2026-06-02  
**Author:** Engineering Team

---

## Context

The project is an Expo SDK 56 application using React Native 0.85.3 and React 19. We need to choose a styling system that will scale with the codebase, support theming (light/dark), provide good developer ergonomics, and integrate cleanly with our existing Expo setup.

The existing codebase has a `src/global.css` file, indicating NativeWind compatibility was considered during project setup. No styling library has been formally adopted yet.

---

## Options Evaluated

### 1. Unistyles

**Repository:** `react-native-unistyles`

**Pros:**
- High-performance: styles are processed on the C++ thread via a native binding, avoiding JS bridge overhead
- First-class support for themes, breakpoints, and dynamic variants
- API is close to React Native's `StyleSheet.create`, minimising the learning curve
- Works well with React Native's new architecture (Fabric / JSI)
- Supports Expo (managed and bare workflow)

**Cons:**
- Requires native modules — adds native build complexity and potential issues with Expo Go
- Relatively newer library, smaller community compared to alternatives
- Extra build step needed; cannot use Expo Go without a custom dev client

---

### 2. Restyle (@shopify/restyle)

**Repository:** `@shopify/restyle`

**Pros:**
- Theme-driven design system with strong TypeScript support
- Forces consistency by constraining styles to theme tokens (colors, spacing, typography)
- Components are typed against the theme, providing compile-time safety
- Produced and maintained by Shopify — battle-tested in production

**Cons:**
- Requires wrapping all components in Restyle's component primitives, which can be verbose
- Less flexible for one-off styles that fall outside theme constraints
- Slight paradigm shift away from standard React Native styling — steeper learning curve
- No CSS-in-JS or utility-class approach; relies on JSX component props

---

### 3. NativeWind

**Repository:** `nativewind` (utility classes powered by Tailwind CSS)

**Pros:**
- Utility-first approach familiar to web developers who know Tailwind CSS
- Rapid prototyping with className-based styling on React Native components
- Good Expo support; works with Expo Router
- The existing `src/global.css` already signals compatibility with the current setup
- Large community and ecosystem; Tailwind documentation transfers directly

**Cons:**
- CSS class names processed through a Babel/Metro transformer — adds build-time complexity
- Developer experience on deep conditional styles can get unwieldy (long className strings)
- TypeScript autocomplete for class names requires a Tailwind IntelliSense plugin
- Style debugging is less transparent than inspecting a StyleSheet object

---

### 4. Plain React Native StyleSheet

**Description:** The built-in `StyleSheet.create` API provided by React Native.

**Pros:**
- Zero dependencies, zero build configuration
- Fully supported across all Expo workflows including Expo Go
- Extremely stable; no third-party upgrade risk

**Cons:**
- No built-in theming system — requires manual context/hooks for dark mode
- No design tokens enforcement; styling consistency relies on convention and discipline
- Repetitive boilerplate for shared style values (colors, spacing) scattered across files
- Does not scale well as the component library grows without a custom token layer

---

## Decision

**Chosen solution: NativeWind**

We will use NativeWind as the primary styling system for this project.

---

## Rationale

NativeWind is the best fit for this project for the following reasons:

1. **Existing project signals.** The presence of `src/global.css` in the repo indicates NativeWind was already considered and partially scaffolded. Choosing NativeWind avoids throwing away that setup.

2. **Expo SDK 56 compatibility.** NativeWind v4+ supports Expo SDK 56 and Expo Router out of the box, with no custom native builds or dev-client requirement for the majority of use cases.

3. **Developer familiarity.** Tailwind CSS is widely known. New contributors onboard quickly without learning a bespoke styling API.

4. **Utility-first speed.** For a project in early development, utility classes allow rapid UI iteration without context-switching between component files and stylesheet objects.

5. **Theme support.** NativeWind's `dark:` variant and CSS custom properties provide built-in dark-mode support that works with Expo's `useColorScheme` hook.

**Why not Unistyles?** While Unistyles has excellent performance characteristics, it requires a custom dev client and native build configuration that adds overhead at this stage of the project.

**Why not Restyle?** Restyle's component-wrapping approach adds significant structural overhead and is better suited for teams building a mature, token-locked design system from the start. It can be revisited if the project requires a formal design system layer later.

**Why not plain StyleSheet?** Without a theming layer, maintaining visual consistency across a growing codebase becomes increasingly difficult. NativeWind provides that layer without introducing native build complexity.

---

## Integration Plan

The following steps will be taken to integrate NativeWind into the existing Expo project:

1. **Install dependencies.** Add `nativewind` and `tailwindcss` as dependencies:
   ```
   npx expo install nativewind tailwindcss
   ```

2. **Initialize Tailwind config.** Run `npx tailwindcss init` to generate `tailwind.config.js`. Configure the `content` array to include all source files:
   ```js
   content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"]
   ```

3. **Update Metro config.** Wrap the Metro config with NativeWind's `withNativeWind` helper in `metro.config.js`, pointing at `src/global.css` as the CSS entry point.

4. **Update Babel config.** Add the NativeWind Babel preset (`"nativewind/babel"`) to `babel.config.js`.

5. **Import global CSS.** Ensure `src/global.css` is imported in the root layout (`app/_layout.tsx`) so Tailwind base styles are applied.

6. **Add TypeScript types.** Add `/// <reference types="nativewind/types" />` to `src/global.d.ts` (create if not present) so `className` prop is recognised on React Native components.

7. **Migrate existing styles.** Convert components one at a time: replace inline `style` props using `StyleSheet` objects with equivalent `className` props using Tailwind utility classes.

8. **Verify dark mode.** Test light/dark switching using Expo's `useColorScheme` hook combined with NativeWind's `dark:` variant classes.

9. **CI check.** Confirm `npx tsc --noEmit` and `expo lint` pass after migration is complete.
