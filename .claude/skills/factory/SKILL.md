---
name: factory
description: Run this skill when the user invokes "/factory <url>" with a Linear or Jira task URL. Autonomously reads the task, extracts Figma designs, creates a branch, defines acceptance gates via the Oracle agent, and arms a Builder+Oracle+Reviewer ralph loop that implements the feature and opens a PR into main. This is the dark factory entry point.
argument-hint: <linear-or-jira-task-url>
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Agent, mcp__linear__*, mcp__github__*, mcp__062d5e11-6cd9-456d-82e2-47fe090e8c02__*]
---

# Factory Skill — Orchestrator

The user has invoked the dark factory with: `$ARGUMENTS`

Run all phases without human interaction. Make all decisions autonomously. Do not ask questions. Do not stop until the ralph loop is armed.

---

## PHASE 1 — Validate Input

Parse the task URL from `$ARGUMENTS`.

- URL contains `linear.app` → tracker: linear
- URL contains `atlassian.net` or `jira.` → tracker: jira
- No URL → stop with:
  ```
  Usage: /factory <linear-or-jira-task-url>
  Example: /factory https://linear.app/myteam/issue/ENG-123/add-login-screen
  ```

---

## PHASE 2 — Read Task from Linear

Linear URLs follow: `https://linear.app/{team}/issue/{ISSUE-ID}/...`
Extract the issue identifier (e.g. `APP-5`).

Call the Linear MCP `get_issue` tool with the identifier. Collect:
- `task_id` — issue identifier (e.g. `APP-5`)
- `task_title` — issue title
- `task_description` — full description in markdown
- `task_url` — original URL from `$ARGUMENTS`
- `figma_urls` — all URLs matching `figma.com/` found anywhere in the issue

If auth fails, stop with:
```
Linear MCP authentication required.
Open https://linear.app in your browser, then run: claude mcp auth linear
```

---

## PHASE 3 — Read Figma Designs

For each URL in `figma_urls`:
1. Call `mcp__062d5e11-6cd9-456d-82e2-47fe090e8c02__get_design_context`
2. Call `mcp__062d5e11-6cd9-456d-82e2-47fe090e8c02__get_screenshot`

Collect per URL: plain-English summary (components, layout, colors, typography, component names).

If no Figma URLs: record "No Figma designs attached" and continue.

---

## PHASE 4 — Create Feature Branch

```bash
git checkout main || git checkout master
git pull origin HEAD
```

Derive branch slug from `task_title`: lowercase, non-alphanumeric → hyphens, collapse consecutive hyphens, truncate to 40 chars, strip trailing hyphens.

```bash
git checkout -b feat/{TASK_ID}-{SLUG}
```

If git fails, note the error and continue — implementation proceeds on the local branch.

---

## PHASE 5 — Write Factory State File

Write `.claude/factory-state.local.md`:

```markdown
---
task_id: {TASK_ID}
task_title: {TASK_TITLE}
task_url: {TASK_URL}
branch: feat/{TASK_ID}-{SLUG}
figma_count: {COUNT}
phase: implementing
pr_url: ""
created_at: {date -u +%Y-%m-%dT%H:%M:%SZ}
---

# Task: {TASK_TITLE}

## Task Description

{TASK_DESCRIPTION}

## Figma Designs

### Design: {FIGMA_URL}

{DESIGN_SUMMARY}

Components found: {COMPONENT_NAMES}

## Implementation Notes

- Read similar existing files before creating new ones
- Match Figma designs as described above
- Do not add new dependencies unless explicitly required
- Follow CLAUDE.md if present
```

---

## PHASE 6 — Invoke Oracle (Gate Writer Mode)

Use the Agent tool to invoke `factory-oracle`:

```
Agent(
  subagent_type: "factory-oracle",
  prompt: "GATE WRITER MODE: Read .claude/factory-state.local.md.
Analyze the task description and Figma design summaries.
Write .claude/factory-gates.local.md with 5-10 concrete, checkable acceptance gates.
Return: Wrote N gates for {task_id}"
)
```

Wait for the agent to return. Verify the file exists:
```bash
ls .claude/factory-gates.local.md
```

If missing, invoke the agent once more. If still missing, write a minimal gate file manually:
```markdown
---
task_id: {TASK_ID}
gates_total: 2
gates_passed: 0
evaluated_at: ""
---
# Acceptance Gates
- [ ] GATE-1: lint passes (npm run lint exits 0)
- [ ] GATE-2: TypeScript compiles (tsc --noEmit exits 0)
```

---

## PHASE 7 — Write Hookify Guard Files

**`.claude/hookify.block-push-main.local.md`:**
```markdown
---
name: block-push-main
enabled: true
event: bash
action: block
pattern: git\s+push.*\s(main|master)(\s|$)
---

FACTORY GUARD: Direct push to main/master is blocked.
Use: git push origin HEAD
```

**`.claude/hookify.block-force-push.local.md`:**
```markdown
---
name: block-force-push
enabled: true
event: bash
action: block
pattern: git\s+push\s+.*--force
---

FACTORY GUARD: Force push is blocked.
Use: git push origin HEAD
```

**`.claude/hookify.warn-file-delete.local.md`:**
```markdown
---
name: warn-file-delete
enabled: true
event: bash
action: warn
pattern: rm\s+.*\.(ts|tsx|js|jsx|py|go|rs|swift|kt|java|cs)
---

FACTORY GUARD: You are about to delete a source file.
To rename/move use: git mv <old> <new>
```

---

## PHASE 8 — Write Ralph Loop State

Get the session ID:
```bash
echo "${CLAUDE_CODE_SESSION_ID:-}"
```

Write `.claude/ralph-loop.local.md`:

```
---
iteration: 1
max_iterations: 40
completion_promise: "FACTORY COMPLETE"
session_id: {SESSION_ID_OR_EMPTY}
---
You are the factory loop orchestrator. Each iteration runs four steps in order.

## STEP 1 — BUILD

Invoke the factory-builder agent using the Agent tool:

  Agent(
    subagent_type: "factory-builder",
    prompt: "Read .claude/factory-state.local.md and .claude/factory-gates.local.md.
If .claude/factory-review.local.md exists, address its blocking issues first.
Otherwise implement the next unchecked gate (skip lint/tsc — Oracle verifies those).
Run lint and type check, fix errors, commit. Return a one-line summary."
  )

## STEP 2 — EVALUATE

Invoke the factory-oracle agent using the Agent tool:

  Agent(
    subagent_type: "factory-oracle",
    prompt: "EVALUATOR MODE: Read .claude/factory-gates.local.md and inspect the
current codebase. Check each unchecked gate. Update factory-gates.local.md with [x]
for passing gates and update gates_passed count in frontmatter.
Return ALL_GATES_PASS or GATES_REMAINING: N."
  )

## STEP 3 — REVIEW

Only runs if the Oracle returned ALL_GATES_PASS. Skip to STEP 4 if gates are still failing.

Invoke the factory-reviewer agent using the Agent tool:

  Agent(
    subagent_type: "factory-reviewer",
    prompt: "Read .claude/factory-state.local.md for the Figma spec and task requirements.
Run: git diff main..HEAD
Review the full diff for correctness bugs, type safety issues, security problems,
missing error handling, and violations of the Figma spec.
Return APPROVED or CHANGES_REQUIRED: N blocking issues."
  )

## STEP 4 — DECIDE

### If Oracle returned GATES_REMAINING: N:
End your turn. The loop continues to the next iteration.

### If all gates passed AND Reviewer returned CHANGES_REQUIRED: N:
The reviewer wrote blocking issues to .claude/factory-review.local.md.
End your turn. Next iteration the Builder will address the feedback first.

### If all gates passed AND Reviewer returned APPROVED:

1. git push origin HEAD

2. Read factory-state.local.md for task_title, task_url, figma_urls.
   Run: git log --oneline main..HEAD

3. Collect visual evidence for the PR body:

   a. Parse owner/repo from the remote:
      ```bash
      REPO_PATH=$(git remote get-url origin | sed 's|.*github\.com[:/]\(.*\)\.git|\1|;s|.*github\.com[:/]\(.*\)|\1|')
      BRANCH=$(git branch --show-current)
      ```

   b. Build the design reference block from factory-state.local.md:
      - For each figma.com URL: `[View in Figma]({url})`
      - For each local design screenshot path (e.g. `docs/design-screenshots/foo.png`):
        `![Design reference](https://raw.githubusercontent.com/{REPO_PATH}/main/{path})`
      - If no design references exist: write "No design reference attached."

   c. Build the simulator screenshot block:
      - If `docs/visual-review/simulator-screenshot.png` exists in the repo:
        `![Simulator screenshot](https://raw.githubusercontent.com/{REPO_PATH}/{BRANCH}/docs/visual-review/simulator-screenshot.png)`
      - Otherwise: "Simulator screenshot not available."

4. gh pr create \
     --title "{task_title}" \
     --base main \
     --body "$(cat <<'PRBODY'
## Summary

Implements {task_title}

Closes {task_url}

## Changes

{bullet list from git log --oneline main..HEAD}

## Visual Evidence

| Design Reference | Simulator (Live Build) |
|:---:|:---:|
| {design_reference_block} | {simulator_screenshot_block} |

## Test Plan

- [x] All acceptance gates pass
- [x] Visual comparison completed by reviewer
- [ ] Lint passes
- [ ] TypeScript compiles

🤖 Generated by [Dark Factory](https://github.com/anthropics/factory-try)
PRBODY
)"

5. Capture the PR URL from gh output.

6. Update .claude/factory-state.local.md:
   - phase: complete
   - pr_url: {PR_URL}

7. Output exactly:
<promise>FACTORY COMPLETE</promise>

## SAFETY RULE

If the ralph system message shows iteration 35 or higher: create the PR immediately
regardless of gate or review status, add "⚠️ Safety stop at iteration 35" to the PR body,
and output FACTORY COMPLETE.
```

---

## PHASE 9 — Confirm and Hand Off

Read `gates_total` from `.claude/factory-gates.local.md`.

Output:
```
Factory initialized.

Task:   {TASK_ID} — {TASK_TITLE}
Branch: feat/{TASK_ID}-{SLUG}
Figma:  {COUNT} designs loaded
Gates:  {gates_total} acceptance gates written by Oracle

Guards armed:
  ✓ block-push-main
  ✓ block-force-push
  ✓ warn-file-delete

Ralph loop: armed (max 40 iterations, completion: "FACTORY COMPLETE")

Each iteration:
  1. Builder  — implements next gate (or fixes review feedback)
  2. Oracle   — evaluates all gates
  3. Reviewer — inspects diff when all gates pass
  4. Decide   — loop / fix review / ship PR

Monitor:
  git log --oneline feat/{TASK_ID}-{SLUG}
  cat .claude/factory-gates.local.md
```

The Stop hook is now active. This session will not exit until FACTORY COMPLETE is detected or max iterations is reached.
