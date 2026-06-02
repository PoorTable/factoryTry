---
name: factory
description: Run this skill when the user invokes "/factory <url>" with a Linear or Jira task URL. Autonomously reads the task, extracts Figma designs, creates a branch, defines acceptance gates via the Oracle agent, and arms a Builder+Oracle ralph loop that implements the feature and opens a PR into main. This is the dark factory entry point.
argument-hint: <linear-or-jira-task-url>
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Agent, mcp__linear__*, mcp__github__*, mcp__062d5e11-6cd9-456d-82e2-47fe090e8c02__*]
---

# Factory Skill — Orchestrator

The user has invoked the dark factory with: `$ARGUMENTS`

You will set up the factory in a single pass without any human interaction. Make all decisions autonomously. Do not ask questions. Do not stop until the ralph loop is armed and running.

---

## PHASE 1 — Validate Input

Parse the task URL from `$ARGUMENTS`.

- If URL contains `linear.app` → task tracker is "linear"
- If URL contains `atlassian.net` or `jira.` → task tracker is "jira" (note: Jira MCP not installed by default; proceed with URL stored as reference)
- If no URL provided → output usage error and stop:
  ```
  Usage: /factory <linear-or-jira-task-url>
  Example: /factory https://linear.app/myteam/issue/ENG-123/add-login-screen
  ```

---

## PHASE 2 — Read Task from Linear

Extract the issue identifier from the URL. Linear URLs follow:
`https://linear.app/{team}/issue/{ISSUE-ID}/...`
The ISSUE-ID is the identifier (e.g. `ENG-123`).

Call the Linear MCP to fetch the issue. The Linear MCP is available as `linear` — use whatever `getIssue`, `issue`, or equivalent tool it exposes. Pass the issue identifier.

Collect:
- `task_id` — the issue identifier (e.g. `ENG-123`)
- `task_title` — the issue title
- `task_description` — the full description in markdown
- `task_url` — the original URL from `$ARGUMENTS`
- `figma_urls` — all URLs in description/comments/attachments matching `figma.com/`

**If Linear MCP auth fails:** output this error and stop:
```
Linear MCP authentication required.
Open https://linear.app in your browser, then run: claude mcp auth linear
```

---

## PHASE 3 — Read Figma Designs

For each URL in `figma_urls`:

1. Call `mcp__062d5e11-6cd9-456d-82e2-47fe090e8c02__get_design_context` with the URL
2. Call `mcp__062d5e11-6cd9-456d-82e2-47fe090e8c02__get_screenshot` with the URL

Collect per URL: a plain-English summary of the design (components, layout, colors, typography, component names found).

If no Figma URLs found: record "No Figma designs attached" and continue.

---

## PHASE 4 — Create Feature Branch

Run:
```bash
git checkout main || git checkout master
git pull origin HEAD
```

Derive branch slug:
- Take `task_title`, lowercase it, replace all non-alphanumeric characters with hyphens, collapse consecutive hyphens, truncate to 40 characters, strip trailing hyphens
- Branch name: `feat/{task_id}-{slug}` (e.g. `feat/ENG-123-add-login-screen`)

Run:
```bash
git checkout -b feat/{TASK_ID}-{SLUG}
```

If git commands fail (no remote, dirty state), note the error and continue — implementation can proceed on the local branch.

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
created_at: {ISO timestamp from: date -u +%Y-%m-%dT%H:%M:%SZ}
---

# Task: {TASK_TITLE}

## Task Description

{TASK_DESCRIPTION}

## Figma Designs

{FOR EACH FIGMA URL:}
### Design: {FIGMA_URL}

{DESIGN_SUMMARY}

Components found: {COMPONENT_NAMES}

{END FOR EACH}

## Implementation Notes

- Follow existing project conventions (read similar files before creating new ones)
- Match Figma designs as described above
- Do not add new dependencies unless the task explicitly requires it
- Follow rules in CLAUDE.md if present
```

---

## PHASE 6 — Spawn Oracle (Gate Writer Mode)

Spawn the `factory-oracle` agent with this exact prompt:

```
GATE WRITER MODE: Read .claude/factory-state.local.md.
Analyze the task description and Figma design summaries.
Write .claude/factory-gates.local.md with 5-10 concrete, checkable acceptance gates.
Return: "Wrote N gates for {task_id}"
```

Wait for the agent to complete. Then verify `.claude/factory-gates.local.md` exists by running `ls .claude/factory-gates.local.md`. If it does not exist, retry the agent spawn once. If it still fails, write a minimal gate file manually with the lint and tsc gates.

---

## PHASE 7 — Write Hookify Guard Files

Write three hookify rule files.

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

The dark factory creates a PR from a feature branch. Push to your feature branch:
  git push origin HEAD
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

Force pushing can destroy history. Use standard push:
  git push origin HEAD
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

Verify this is intentional. To rename/move use: git mv <old> <new>
```

---

## PHASE 8 — Write Ralph Loop State

First, get the session ID:
```bash
echo "${CLAUDE_CODE_SESSION_ID:-}"
```

Write `.claude/ralph-loop.local.md` with this exact structure (the stop hook parses the YAML frontmatter strictly):

```
---
iteration: 1
max_iterations: 40
completion_promise: "FACTORY COMPLETE"
session_id: {SESSION_ID_FROM_ABOVE_OR_EMPTY}
---
You are the factory loop orchestrator. Each iteration you run three steps.

## STEP 1 — BUILD

Spawn the factory-builder agent with this prompt:
  "Read .claude/factory-state.local.md and .claude/factory-gates.local.md.
   Implement the next unchecked gate (skip lint/tsc gates — those are verified
   by the Oracle). Commit when done. Return a one-line summary."

## STEP 2 — EVALUATE

Spawn the factory-oracle agent with this prompt:
  "EVALUATOR MODE: Read .claude/factory-gates.local.md and inspect the current
   codebase. Check each unchecked gate. Update factory-gates.local.md with [x]
   for passing gates and update gates_passed count in frontmatter.
   Return ALL_GATES_PASS or GATES_REMAINING: N."

## STEP 3 — DECIDE

Read .claude/factory-gates.local.md.
Parse the frontmatter: compare gates_passed to gates_total.

### If ALL gates pass (gates_passed == gates_total):

1. Push the branch:
   git push origin HEAD

2. Read factory-state.local.md for task_title, task_url, figma_urls, branch.
   Read git log for change summary: git log --oneline main..HEAD

3. Create the PR:
   gh pr create \
     --title "{task_title}" \
     --base main \
     --body "$(cat <<'PRBODY'
## Summary

Implements {task_title}

Closes {task_url}

## Changes

{bullet list derived from git log: git log --oneline main..HEAD}

## Figma References

{figma_urls, one per line}

## Test Plan

- [ ] Visual review against Figma designs
- [ ] Lint passes
- [ ] TypeScript compiles

🤖 Generated by [Dark Factory](https://github.com/anthropics/factory-try)
PRBODY
)"

4. Capture the PR URL from gh output.

5. Update .claude/factory-state.local.md frontmatter:
   - Set phase: complete
   - Set pr_url: {PR_URL}

6. Output the completion signal exactly:
<promise>FACTORY COMPLETE</promise>

### If gates are still failing:

End your turn normally. The ralph loop will continue to the next iteration.

## SAFETY RULE

If the current iteration number (visible in the ralph system message) is 35 or higher,
create the PR with whatever is currently on the branch and output FACTORY COMPLETE
regardless of gate status. Include a note in the PR body: "⚠️ Safety stop at iteration 35 — some gates may be incomplete."
```

---

## PHASE 9 — Confirm and Hand Off

Read the gate count from `.claude/factory-gates.local.md` frontmatter.

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

The factory is now running. Each iteration will:
  1. Builder implements the next gate
  2. Oracle evaluates all gates
  3. When all pass → PR created → loop stops

Monitor:
  git log --oneline feat/{TASK_ID}-{SLUG}
  cat .claude/factory-gates.local.md
```

The Stop hook is now active. This session will not exit until FACTORY COMPLETE is detected or max iterations is reached.
