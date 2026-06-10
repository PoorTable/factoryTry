# Factory Decision Journal — APP-25

Task: Migrate tailwind.config.js to Wardrobe design tokens
Started: 2026-06-10T16:21:15Z
Branch: feat/APP-25-migrate-tailwind-config-js-to-wardrobe-d

Append-only. Every agent records every decision here.

## [2026-06-10T16:21:15Z] iter=0 agent=orchestrator event=INIT
- decision: factory run started for APP-25 via /factory
- why: user invoked /factory with Linear URL
- evidence: https://linear.app/apptryout/issue/APP-25/migrate-tailwindconfigjs-to-wardrobe-design-tokens

## [2026-06-10T16:21:15Z] iter=0 agent=orchestrator event=TASK_PARSED
- decision: tracker=linear, issue=APP-25 "Migrate tailwind.config.js to Wardrobe design tokens", priority=Urgent, status=Todo
- why: URL contains linear.app; issue fetched via Linear MCP get_issue. Issue has no blockedBy relations (it BLOCKS APP-18..APP-22, which is fine)
- evidence: Linear get_issue APP-25 response

## [2026-06-10T16:21:15Z] iter=0 agent=orchestrator event=DESIGN_CONTEXT
- decision: no Figma URLs and no local design-screenshot references in the issue; design source is the token/radius/spacing/font tables embedded in the issue description
- why: scanned issue description and attachments for figma.com URLs and docs/design-screenshots paths — none found; this is a config-migration task, the spec IS the description
- evidence: APP-25 description token table (paper #F8F4EE ... amber #C89B3C + swatch tones)

## [2026-06-10T16:21:15Z] iter=0 agent=orchestrator event=BRANCH
- decision: created feat/APP-25-migrate-tailwind-config-js-to-wardrobe-d off main@ba10baa
- why: slug derived from title (lowercase, non-alnum to hyphens, 40-char truncate); working tree had only untracked .env and .claude/launch.json so no stash was needed — checkout is safe with untracked files and stashing .env could break local app runs
- evidence: git rev-parse HEAD = ba10baaed2dd42098762c64c26daf34984c7040d

## [2026-06-10T16:24:58Z] iter=0 agent=oracle event=GATES_WRITTEN
- decision: 10 gates for APP-25
- why: Config-migration task with no Figma (figma_count: 0); spec is the token table + src/theme/tokens.ts as single source of truth. Gates split into palette colors (G1), swatch tones (G2), Recall removal (G3), radius/spacing (G4), fontFamily aliases (G5), tokens.ts<->config hex parity (G6), source sweep + dead-screen removal (G7), VISUAL_MATCH smoke render (G8), lint (G9), tsc (G10). Resolved ambiguities: 28px radius named 'surface' in Tailwind despite tokens.ts calling it tabBar (blocked issues APP-18..22 mandate exact Tailwind names); grid gap 10 accepted under any spacing/gap key resolving to 10px; swatch tones only required in config since tokens.ts lacks them today.
- evidence: Read tailwind.config.js (pure Recall palette, r-* tokens) and src/theme/tokens.ts (13 Wardrobe colors match task table). grep sweep of src/app + src/components found zero Recall class usages (components use generic Tailwind: bg-white, bg-blue-500); dead screens confirmed present at src/app/{styling-demo,profile-screen,explore}.tsx via find (exit 0).

## [2026-06-10T16:27:38Z] iter=1 agent=builder event=BUILD
- decision: rewrite tailwind.config.js theme.extend for GATE-1..GATE-5 (palette, swatches, Recall removal, radius/spacing, fontFamily) in one commit
- why: gates 1-5 are inseparable — replacing the colors block to add the 13 Wardrobe colors necessarily deletes Recall tokens (G3), and radius/spacing/fontFamily live in the same extend object. Hexes copied byte-identical from src/theme/tokens.ts Colors export (satisfies G6 parity); font names taken from src/app/_layout.tsx useFonts (CormorantGaramond_500Medium, DMSans_400Regular, JetBrainsMono_400Regular). 28px radius named 'surface' per Oracle's resolved ambiguity; grid gap key named 'grid: 10px'. Not touching dead screens — Oracle confirmed zero Recall class usages in src, GATE-7 is a separate gate.
- evidence: read tailwind.config.js (pure Recall), src/theme/tokens.ts, src/theme/typography.ts, src/app/_layout.tsx font loads

## [2026-06-10T16:28:42Z] iter=1 agent=builder event=SELF_REVIEW
- decision: diff clean — single-file change to tailwind.config.js, all gate scripts G1-G5 pass locally
- why: re-read every hunk against gate text; ran the exact node/grep checks from gates file (all OK); styling grep (StyleSheet/inline style) clean; debug-residue grep clean; no deletions (git status shows only M tailwind.config.js); extra safety sweep for removed color classes bg-card/bg-fill/bg-bg in src found zero usages so GATE-8 render is not at risk
- evidence: GATE1-5 scripts all printed OK; npx expo lint exit 0; npx tsc --noEmit exit 0

## [2026-06-10T16:28:55Z] iter=1 agent=builder event=BUILD_COMMITTED
- decision: committed config migration
- why: follow-up evidence line for the iter=1 BUILD entry (journal is gitignored, committed config only)
- evidence: commit bac5181, files: tailwind.config.js (41+/30-)

## [2026-06-10T16:32:10Z] iter=1 agent=oracle event=EVAL
- decision: gates 9/10 pass
- why: GATE-1..6, 8, 9, 10 all flipped to pass on first evaluation; sole remaining blocker is GATE-7 — src/constants/theme.ts still defines Recall leftovers (accent-press #3E63D6/#5C86FF, accent-soft, success-soft) which the sweep grep catches; builder should purge or migrate that file (and optionally delete dead screens explore/profile-screen/styling-demo)
- evidence: see "Pass 1 — 2026-06-10T16:31:32Z" block in factory-gates.local.md Evaluation History; gate greps/node checks exit codes recorded there; visual check screenshot /tmp/oracle-visual-check.png

## [2026-06-10T16:32:31Z] iter=1 agent=orchestrator event=EVAL
- decision: iteration 1 summary — gates 9/10, loop continues to iteration 2
- why: builder migrated tailwind.config.js (palette+swatches+radius/spacing+fontFamily, Recall removed) in commit bac5181; oracle verdict GATES_REMAINING: 1 (GATE-7 fails: Recall keys accent-press/accent-soft/success-soft remain in src/constants/theme.ts); reviewer not run; progress made (9 > 0) so stall_count=0
- evidence: last_head_sha bac5181922e5767b9de515a4be6f5951cab5174b, gates_passed 9/10

## [2026-06-10T16:34:49Z] iter=2 agent=builder event=BUILD
- decision: satisfy GATE-7 by (a) removing the Recall semantic keys (accent, accent-press, accent-soft, success, success-soft) from both light/dark in src/constants/theme.ts, (b) git rm dead screens src/app/{explore,profile-screen,styling-demo}.tsx, (c) repointing app-tabs.web.tsx TabTriggers to the four Wardrobe tab routes /(tabs)/{closet,outfits,coach,you}
- why: gate grep only fails on accent-press/accent-soft/success-soft in theme.ts; grep proved zero usages of any accent/success key outside theme.ts so removing the whole semantic block is zero-risk and cleaner than leaving bare Recall accent hexes. Dead-screen deletion is the gate's preferred outcome, but explore/styling-demo are href targets in app-tabs.web.tsx with typedRoutes on — deleting without fixing those hrefs would break tsc, so the web TabTriggers must be migrated to the real (tabs) routes (matching index.tsx's '/(tabs)/closet' href form). Considered minimal theme.ts-only fix but orchestrator context + Oracle note both call deletion the expected outcome.
- evidence: gate grep matches only src/constants/theme.ts lines 31-34/59-62; grep -rn "accent|success" outside theme.ts hits only comments in src/theme/tokens.ts; app-tabs.web.tsx lines 24-32 reference /explore and /styling-demo

## [2026-06-10T16:36:06Z] iter=2 agent=builder event=SELF_REVIEW
- decision: diff clean — GATE-7 satisfied: gate grep now exits 1 (no matches), src/app/ contains only (tabs), _layout.tsx, index.tsx
- why: re-read every hunk against gate text. theme.ts: removed entire "Accent & semantic" blocks (light+dark) — proved unused by repo-wide grep before editing, tsc confirms no ThemeColor consumer broke. app-tabs.web.tsx: replaced 3 stale Recall triggers (home/explore/styling-demo) with 4 Wardrobe triggers using '/(tabs)/x' href form matching index.tsx; typedRoutes accepted them (tsc exit 0). Styling grep on diff hit only a pre-existing context line (TabSlot style height:100%) — not code I added, no new StyleSheet/inline style introduced. Debug-residue grep clean. Deletions: exactly the 3 dead screens the gate names, via git rm (intentional, gate-preferred outcome).
- evidence: gate grep exit 1; npx expo lint exit 0; npx tsc --noEmit exit 0; git status shows D x3 + M x2 only

## [2026-06-10T16:36:31Z] iter=2 agent=builder event=BUILD_COMMITTED
- decision: committed GATE-7 fix
- why: follow-up evidence line for the iter=2 BUILD entry
- evidence: commit 3561cf5, 5 files changed (9+/853-): theme.ts, app-tabs.web.tsx modified; explore.tsx, profile-screen.tsx, styling-demo.tsx deleted

## [2026-06-10T16:40:11Z] iter=2 agent=oracle event=EVAL
- decision: gates 10/10 pass — ALL_GATES_PASS
- why: GATE-7 flipped to PASS after commit 3561cf5 purged accent-press/accent-soft/success-soft from src/constants/theme.ts and deleted the 3 dead demo screens; regression sweep re-verified GATE-8 (theme.ts is consumed by themed-text/themed-view, screen deletions could break routing) plus lint/tsc — all hold. No regressions.
- evidence: gate grep exit 1; ls src/app shows only (tabs)/_layout.tsx/index.tsx; npx expo lint exit 0; npx tsc --noEmit exit 0; /tmp/oracle-visual-check-pass2.png renders tab bar with no error overlay; full detail in factory-gates.local.md Evaluation History "Pass 2"

## [2026-06-10T16:42:43Z] iter=2 agent=reviewer event=REVIEW
- decision: APPROVED
- why: diff is a clean config migration — tailwind.config.js Wardrobe palette/swatches/radius/spacing/fontFamily byte-identical to src/theme/tokens.ts and the APP-25 token table; removed Recall semantic keys in src/constants/theme.ts verified unconsumed (repo grep: only pre-existing hardcoded accentGlow shadow remains, zero consumers); app-tabs.web.tsx triggers retargeted to /(tabs)/{closet,outfits,coach,you} which all exist on disk; deleted demo screens have zero remaining references; no new StyleSheet/inline styles introduced (TabSlot style line is pre-existing context). No blocking issues.
- evidence: screenshot docs/visual-review/simulator-screenshot.png (committed 57ba18f) — deep-linked /closet on iPhone 17 Pro Max, tab bar Closet/Outfits/Coach/You renders with cognac active tint, no error overlay; design reference = APP-25 token table (figma_count 0); inspected tailwind.config.js, src/constants/theme.ts, src/components/app-tabs.web.tsx, src/theme/tokens.ts, ls src/app/(tabs); gates 10/10 evidence spot-checked (tokens.ts hex parity re-verified myself)

## [2026-06-10T16:43:19Z] iter=2 agent=orchestrator event=EVAL
- decision: iteration 2 summary — gates 10/10, reviewer APPROVED on cycle 1, proceeding to ship
- why: builder purged Recall tokens from src/constants/theme.ts, deleted dead screens, fixed app-tabs.web.tsx (commit 3561cf5); oracle ALL_GATES_PASS with regression re-verification of GATE-8/9/10; reviewer approved with simulator screenshot committed (57ba18f); progress made so stall_count=0
- evidence: gates_passed 10/10, HEAD 57ba18f34034ef0e8833f007f898207dc2b9988d

---

# Final Gate State

---
task_id: APP-25
gates_total: 10
gates_passed: 10
evaluated_at: "2026-06-10T16:38:45Z"
---

# Acceptance Gates for APP-25

## Gates

- [x] GATE-1: All 13 Wardrobe palette colors are defined in `tailwind.config.js` `theme.extend.colors` with exact hex values: paper `#F8F4EE`, paper-2 `#F1EBE0`, ink `#2A2520`, ink-soft `#4A3F36`, muted `#8A7C6E`, hairline `#DDD3C2`, mist `#ECE6DC`, stone `#D6CCBC`, cognac `#A35836`, cognac-deep `#8A4426`, terracotta `#C97B5E`, clay `#B86F4A`, amber `#C89B3C`. Check: `node -e "const c=require('./tailwind.config.js').theme.extend.colors; const want={paper:'#F8F4EE','paper-2':'#F1EBE0',ink:'#2A2520','ink-soft':'#4A3F36',muted:'#8A7C6E',hairline:'#DDD3C2',mist:'#ECE6DC',stone:'#D6CCBC',cognac:'#A35836','cognac-deep':'#8A4426',terracotta:'#C97B5E',clay:'#B86F4A',amber:'#C89B3C'}; for(const[k,v]of Object.entries(want)){if((c[k]||'').toUpperCase()!==v){console.error('MISMATCH',k,c[k]);process.exit(1)}} console.log('OK')"` exits 0.

- [x] GATE-2: All 6 swatch tones are defined in `tailwind.config.js` colors with exact hex values: sage `#7A8454`, camel `#B89368`, slate-warm `#6E7A88`, plum `#6B4858`, sand `#E7D9BE`, bone `#DDD3C0`. Check: `node -e "const c=require('./tailwind.config.js').theme.extend.colors; const want={sage:'#7A8454',camel:'#B89368','slate-warm':'#6E7A88',plum:'#6B4858',sand:'#E7D9BE',bone:'#DDD3C0'}; for(const[k,v]of Object.entries(want)){if((c[k]||'').toUpperCase()!==v){console.error('MISMATCH',k,c[k]);process.exit(1)}} console.log('OK')"` exits 0.

- [x] GATE-3: No Recall tokens remain in `tailwind.config.js`: no `#F8F8F6`, no `#4F7CFF`, no `accent`, no `success`, no `r-` prefixed spacing/radius keys (`r-xs`, `r-sm`, `r-md`, `r-lg`, `r-xl`, `r-card`, `r-sheet`, `r-pill`), no `bg-grouped`, no `ink-2`/`ink-3`, no `fill`/`fill-2`. Check: `grep -E "F8F8F6|4F7CFF|accent|success|'r-|\"r-|bg-grouped|ink-2|ink-3" tailwind.config.js` returns no matches (exit 1).

- [x] GATE-4: Wardrobe radius and spacing extensions exist in `tailwind.config.js`: `borderRadius` contains `card: '18px'`, `card-sm: '16px'`, `item: '14px'`, `surface: '28px'`, `pill: '999px'`; `spacing` (or equivalent gap token) contains `screen-h: '22px'` and a 10px grid-gap token. Check: `node -e "const t=require('./tailwind.config.js').theme.extend; const r=t.borderRadius; const want={card:'18px','card-sm':'16px',item:'14px',surface:'28px',pill:'999px'}; for(const[k,v]of Object.entries(want)){if(r[k]!==v){console.error('RADIUS',k,r[k]);process.exit(1)}} const s=t.spacing||{}; if(s['screen-h']!=='22px'){console.error('SPACING screen-h',s['screen-h']);process.exit(1)} if(!Object.values(s).includes('10px')&&!Object.values(t.gap||{}).includes('10px')){console.error('NO 10px grid gap token');process.exit(1)} console.log('OK')"` exits 0.

- [x] GATE-5: `fontFamily` aliases exist in `tailwind.config.js`: `serif` maps to a CormorantGaramond font, `sans` to a DMSans font, `mono` to a JetBrainsMono font. Check: `node -e "const f=require('./tailwind.config.js').theme.extend.fontFamily; const flat=(x)=>[].concat(x||[]).join(','); if(!/CormorantGaramond/.test(flat(f.serif))){console.error('serif',f.serif);process.exit(1)} if(!/DMSans/.test(flat(f.sans))){console.error('sans',f.sans);process.exit(1)} if(!/JetBrainsMono/.test(flat(f.mono))){console.error('mono',f.mono);process.exit(1)} console.log('OK')"` exits 0.

- [x] GATE-6: `src/theme/tokens.ts` and `tailwind.config.js` agree on every hex value for the 13 shared palette tokens (paper, paper-2, ink, ink-soft, muted, hairline, mist, stone, cognac, cognac-deep, terracotta, clay, amber) — either the config requires/derives from tokens.ts, or the values are byte-identical. Check: for each of the 13 token names, the hex value in `tailwind.config.js` (resolved via `node -e "console.log(JSON.stringify(require('./tailwind.config.js').theme.extend.colors))"`) equals the value in the `Colors` export of `src/theme/tokens.ts` (read the file). All 13 must match case-insensitively.

- [x] GATE-7: No source file references a removed Recall class: `grep -rEn "bg-bg|bg-card-2|bg-fill|text-accent|bg-accent|accent-soft|accent-press|success-soft|text-ink-2|text-ink-3|rounded-r-(sm|md|lg|card|xl|sheet|pill)|p[xytrbl]?-r-(xs|sm|md|lg|xl)|m[xytrbl]?-r-(xs|sm|md|lg|xl)|gap-r-" src/ --include="*.tsx" --include="*.ts"` returns no matches (exit 1). Additionally, the dead demo screens `src/app/styling-demo.tsx`, `src/app/profile-screen.tsx`, and `src/app/explore.tsx` are either deleted (preferred, they are unused) or contain no removed Recall classes — verify via `ls src/app/`.

- [x] GATE-8: VISUAL_MATCH — Live iOS simulator screenshot shows the app still renders without a red-screen error after the token migration (no missing-class crashes from deleted Recall tokens); layout structure of existing tab screens is intact. No Figma reference exists for this task; the comparison baseline is "app renders, no error overlay".

- [x] GATE-9: lint passes — `npx expo lint` exits 0.

- [x] GATE-10: TypeScript compiles — `npx tsc --noEmit` exits 0.

## Oracle Notes

- This is a styling-infrastructure task (figma_count: 0). The authoritative spec is the token table in the task description, which must agree exactly with `src/theme/tokens.ts`.
- Verified current state before writing gates: `tailwind.config.js` is 100% Recall palette (bg `#F8F8F6`, accent `#4F7CFF`, `r-*` spacing/radius). `src/theme/tokens.ts` already holds the full Wardrobe `Colors` export with all 13 hex values matching the task table.
- Swatch tones (sage, camel, slate-warm, plum, sand, bone) are NOT in `src/theme/tokens.ts` today — the task says they're "used by seed data". The builder may add them to tokens.ts or only to the Tailwind config; GATE-2 only requires them in the config, GATE-6 only checks the 13 shared tokens. Assumption: if the builder adds swatches to tokens.ts too, values must still match GATE-2's hexes.
- Ambiguity resolved on radius naming: tokens.ts uses `tabBar: 28` for the 28px radius while the task table calls it `surface 28`. The task's token-name list for blocked issues mandates Tailwind names exactly, so the config must use `surface` (GATE-4) even though tokens.ts calls it tabBar. GATE-6 therefore only compares colors, not radii.
- Ambiguity resolved on grid gap: task says "grid gap 10" without naming the key. GATE-4 accepts any spacing/gap token resolving to `10px` (e.g. `grid: '10px'`).
- Swept the codebase: no component currently uses Recall classes (components use generic Tailwind like `bg-white`, `bg-blue-500`). The three dead screens `styling-demo.tsx`, `profile-screen.tsx`, `explore.tsx` exist in `src/app/` and are routable Expo Router screens — the task says delete if unused; deletion is the expected outcome (GATE-7).
- GATE-3 grep for `accent`/`success` is scoped to tailwind.config.js only — the word may legitimately appear elsewhere in the repo.

## Evaluation History

### Pass 1 — 2026-06-10T16:31:32Z
- GATE-1: PASS — evidence: node check of 13 palette hexes against tailwind.config.js → "OK", exit 0
- GATE-2: PASS — evidence: node check of 6 swatch hexes (sage/camel/slate-warm/plum/sand/bone) → "OK", exit 0
- GATE-3: PASS — evidence: `grep -E "F8F8F6|4F7CFF|accent|success|'r-|\"r-|bg-grouped|ink-2|ink-3" tailwind.config.js` → no matches, exit 1
- GATE-4: PASS — evidence: node check of borderRadius (card/card-sm/item/surface/pill) + spacing screen-h 22px + 10px grid token → "OK", exit 0
- GATE-5: PASS — evidence: node check fontFamily serif=CormorantGaramond, sans=DMSans, mono=JetBrainsMono → "OK", exit 0
- GATE-6: PASS — evidence: dumped resolved config colors via node; read src/theme/tokens.ts Colors export; all 13 shared token hexes byte-identical (paper #F8F4EE ... amber #C89B3C)
- GATE-7: FAIL — evidence: gate grep exited 0 with 6 matches in src/constants/theme.ts (lines 31-32, 34, 59-60, 62): Recall leftovers `accent-press` (#3E63D6/#5C86FF), `accent-soft`, `success-soft`. Dead screens explore.tsx/profile-screen.tsx/styling-demo.tsx still exist in src/app/ but contain no removed Recall classes (not in grep output) — that sub-condition holds; the blocker is src/constants/theme.ts.
- GATE-8: PASS — evidence: compared /tmp/oracle-visual-check.png (booted iPhone 17 Pro Max, Metro confirmed via localhost:8081/status) against baseline "app renders, no error overlay". Tab bar with Closet/Outfits/Coach/You renders, Closet placeholder screen reachable, no red-screen error or missing-class crash after token migration.
- GATE-9: PASS — evidence: `npx expo lint` exit 0
- GATE-10: PASS — evidence: `npx tsc --noEmit` exit 0

### Pass 2 — 2026-06-10T16:38:45Z
- GATE-7: PASS — evidence: gate grep over src/ (--include *.tsx *.ts) → no matches, exit 1; commit 3561cf5 removed the accent-press/accent-soft/success-soft leftovers from src/constants/theme.ts (14 lines deleted); `ls src/app/` shows only `(tabs)`, `_layout.tsx`, `index.tsx` — explore.tsx, profile-screen.tsx, styling-demo.tsx deleted
- GATE-8: RE-VERIFIED PASS (regression check — commit 3561cf5 edited src/constants/theme.ts, consumed by themed-text/themed-view/use-theme, and deleted 3 routable screens) — evidence: compared /tmp/oracle-visual-check-pass2.png (booted iPhone 17 Pro Max, Metro confirmed via localhost:8081/status) against baseline "app renders, no error overlay". Tab bar Closet/Outfits/Coach/You renders with cognac active tint, Closet screen reachable, no red-screen error or missing-class crash
- GATE-9: RE-VERIFIED PASS — evidence: `npx expo lint` exit 0
- GATE-10: RE-VERIFIED PASS — evidence: `npx tsc --noEmit` exit 0

