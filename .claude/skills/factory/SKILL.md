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

## JOURNAL PROTOCOL — the audit trail of every decision

The factory keeps an append-only decision journal at `.claude/factory-journal.local.md`. Every phase of this skill AND every loop iteration appends entries. Never edit or delete existing entries — append only.

Entry format (append via Bash heredoc):

```bash
cat >> .claude/factory-journal.local.md <<EOF

## [$(date -u +%Y-%m-%dT%H:%M:%SZ)] iter={N or 0 for setup} agent={orchestrator|builder|oracle|reviewer} event={EVENT}
- decision: {what was decided or done, one line}
- why: {the reasoning — alternatives considered, rule applied, signal observed}
- evidence: {commit SHA, command + exit code, file path, screenshot path, or "n/a"}
EOF
```

Event taxonomy: `INIT`, `TASK_PARSED`, `DESIGN_CONTEXT`, `BRANCH`, `GATES_WRITTEN`, `BUILD`, `SELF_REVIEW`, `BLOCKED`, `EVAL`, `REGRESSION`, `GATE_AUDIT`, `REVIEW`, `STALL`, `ESCALATION`, `PR_CREATED`, `SAFETY_STOP`, `COMPLETE`.

The journal is gitignored during the run; at ship time it is committed into the PR as `docs/factory-reports/{TASK_ID}.md` so every decision is reviewable.

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
- `blocked_by` — if the issue lists blocking issues that are not Done, note them; proceed anyway but record the risk in the journal

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

If no Figma URLs: look for local design references mentioned in the task description (e.g. `docs/design-screenshots/*.png`), Read each one, and summarize it. If neither exists, record "No design reference" and continue.

---

## PHASE 4 — Create Feature Branch

If the working tree is dirty: `git stash --include-untracked` and record a journal entry (event `BRANCH`) noting what was stashed — never silently discard changes.

```bash
git checkout main || git checkout master
git pull origin HEAD
```

Derive branch slug from `task_title`: lowercase, non-alphanumeric → hyphens, collapse consecutive hyphens, truncate to 40 chars, strip trailing hyphens.

```bash
git checkout -b feat/{TASK_ID}-{SLUG}
```

If git fails, note the error in the journal and continue — implementation proceeds on the local branch.

---

## PHASE 5 — Initialize Journal + Write Factory State File

**5a. Initialize the journal.** Create `.claude/factory-journal.local.md`:

```markdown
# Factory Decision Journal — {TASK_ID}

Task: {TASK_TITLE}
Started: {date -u +%Y-%m-%dT%H:%M:%SZ}
Branch: feat/{TASK_ID}-{SLUG}

Append-only. Every agent records every decision here.
```

Then append entries (event per row) covering the setup decisions already made:
- `TASK_PARSED` — tracker detected, issue ID extracted, blocked-by risks if any
- `DESIGN_CONTEXT` — per design reference: source (figma/local/none) and a one-line summary
- `BRANCH` — branch name chosen, slug derivation, any stash/pull failures

**5b. Write `.claude/factory-state.local.md`:**

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
last_gates_passed: 0
last_head_sha: ""
stall_count: 0
review_cycles: 0
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

The four tracking fields (`last_gates_passed`, `last_head_sha`, `stall_count`, `review_cycles`) are updated by the loop orchestrator every iteration — they drive stall detection and escalation.

---

## PHASE 6 — Invoke Oracle (Gate Writer Mode)

Use the Agent tool to invoke `factory-oracle`:

```
Agent(
  subagent_type: "factory-oracle",
  prompt: "GATE WRITER MODE: Read .claude/factory-state.local.md.
Analyze the task description and Figma design summaries.
Write .claude/factory-gates.local.md with 5-10 concrete, checkable acceptance gates.
Append a GATES_WRITTEN entry to .claude/factory-journal.local.md per the journal protocol.
Return: Wrote N gates for {task_id}"
)
```

Wait for the agent to return. Verify the file exists:
```bash
ls .claude/factory-gates.local.md
```

If missing, invoke the agent once more. If still missing, write a minimal gate file manually and record a journal entry (event `GATES_WRITTEN`, why: "oracle failed twice, fallback gates"):
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
You are the factory loop orchestrator. Each iteration runs the steps below in order.
You own the audit trail: append journal entries to .claude/factory-journal.local.md
(append-only, heredoc format: `## [timestamp] iter=N agent=orchestrator event=EVENT`
with decision / why / evidence lines) at every step marked LOG.

## STEP 0 — ORIENT

1. Read the frontmatter of .claude/factory-state.local.md (last_gates_passed,
   last_head_sha, stall_count, review_cycles).
2. Run: git log --oneline -5  and  tail -40 .claude/factory-journal.local.md
   to see what the previous iteration did.
3. Note the current iteration number from the ralph system message.

## STEP 1 — BUILD

Pick the builder directive based on stall_count from factory-state frontmatter:

- stall_count 0–1 (normal):
  Agent(
    subagent_type: "factory-builder",
    prompt: "Read .claude/factory-state.local.md and .claude/factory-gates.local.md.
If .claude/factory-review.local.md exists, address its blocking issues first.
Otherwise implement the next unchecked gate (skip lint/tsc — Oracle verifies those).
Follow your self-review protocol before committing, and append journal entries
per your logging protocol. Current loop iteration: {N}. Return a one-line summary."
  )

- stall_count 2–3 (ESCALATION — same gate failing repeatedly):
  Same prompt, plus:
  "ESCALATION: the last {stall_count} iterations made no progress on the gates.
Read the last 60 lines of .claude/factory-journal.local.md to see what was already
tried. Do NOT repeat a failed approach — pick a different implementation strategy,
re-read the gate text literally, and re-read the design reference before coding."
  LOG event=ESCALATION (decision: escalated builder, why: stall_count={N}).

- stall_count >= 4 (GATE AUDIT — the gate itself may be wrong):
  First invoke the Oracle in gate-audit mode:
  Agent(
    subagent_type: "factory-oracle",
    prompt: "GATE AUDIT MODE: Iterations are stalling. Read
.claude/factory-gates.local.md, .claude/factory-state.local.md, and the last 80
lines of .claude/factory-journal.local.md. Identify the gate blocking progress.
Determine whether it is (a) achievable as written, (b) ambiguous and needs rewording,
or (c) infeasible in this codebase and needs splitting/replacing. You may rewrite
that ONE gate — never weaken it to vacuous — and you MUST append a GATE_AUDIT journal
entry justifying the change. Return: AUDIT_OK or AUDIT_REWROTE: {gate id}."
  )
  Then run the normal builder step. Reset stall_count to 0 in factory-state
  frontmatter after the audit.

After the builder returns: verify a commit actually landed:
  git rev-parse HEAD  — compare to last_head_sha from factory-state.
If HEAD is unchanged AND the builder did not report BLOCKED in the journal,
LOG event=STALL (decision: builder produced no commit, evidence: HEAD sha).

## STEP 2 — EVALUATE

Agent(
  subagent_type: "factory-oracle",
  prompt: "EVALUATOR MODE: Read .claude/factory-gates.local.md and inspect the
current codebase. Check each unchecked gate AND re-verify the lint/tsc gates and
any previously-passed gate the latest diff plausibly touched (regression check).
Record per-gate evidence and update factory-gates.local.md ([x] marks, gates_passed,
evaluated_at). Append EVAL (and REGRESSION if any) journal entries per your logging
protocol. Current loop iteration: {N}.
Return ALL_GATES_PASS or GATES_REMAINING: N."
)

## STEP 3 — REVIEW

Only runs if the Oracle returned ALL_GATES_PASS. Skip to STEP 4 if gates are still failing.

Agent(
  subagent_type: "factory-reviewer",
  prompt: "Read .claude/factory-state.local.md for the Figma spec and task requirements.
Run: git diff main..HEAD
Review the full diff for correctness bugs, type safety issues, security problems,
missing error handling, and violations of the Figma spec. Follow your visual
verification and logging protocols. This is review cycle {review_cycles + 1}.
Return APPROVED or CHANGES_REQUIRED: N blocking issues."
)

If CHANGES_REQUIRED: increment review_cycles in factory-state frontmatter.

## STEP 4 — DECIDE + ACCOUNT

First, update the tracking fields in .claude/factory-state.local.md frontmatter:
- Read gates_passed from factory-gates.local.md.
- If gates_passed > last_gates_passed OR HEAD != last_head_sha with review feedback
  addressed: progress was made → stall_count: 0.
- Otherwise → stall_count: {stall_count + 1}.
- Set last_gates_passed: {gates_passed}, last_head_sha: {git rev-parse HEAD}.

LOG event=EVAL summarizing the iteration: gates passed X/Y, builder summary,
oracle verdict, reviewer verdict (or "not run"), stall_count, and the decision below.

### If Oracle returned GATES_REMAINING: N:
End your turn. The loop continues to the next iteration.

### If all gates passed AND Reviewer returned CHANGES_REQUIRED: N:
The reviewer wrote blocking issues to .claude/factory-review.local.md.
End your turn. Next iteration the Builder will address the feedback first.

### If all gates passed AND Reviewer returned APPROVED:

1. Commit the audit trail into the branch — REQUIRED before the PR:
   ```bash
   mkdir -p docs/factory-reports
   {
     cat .claude/factory-journal.local.md
     echo ""
     echo "---"
     echo ""
     echo "# Final Gate State"
     echo ""
     cat .claude/factory-gates.local.md
   } > docs/factory-reports/{TASK_ID}.md
   git add docs/factory-reports/{TASK_ID}.md
   git commit -m "docs: add factory run report for {TASK_ID}"
   ```

2. git push origin HEAD

3. Read factory-state.local.md for task_title, task_url, figma_urls.
   Run: git log --oneline main..HEAD

4. Collect visual evidence for the PR body:

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

   c. Build the simulator screenshot block — **REQUIRED**:
      ```bash
      git ls-files docs/visual-review/simulator-screenshot.png | grep -q . && echo "EXISTS" || echo "MISSING"
      ```
      - If the file exists in the repo (committed by the reviewer):
        `![Simulator screenshot](https://raw.githubusercontent.com/{REPO_PATH}/{BRANCH}/docs/visual-review/simulator-screenshot.png)`
      - If MISSING: **do NOT open the PR**. LOG event=STALL (why: screenshot missing)
        and return to STEP 1, forcing another reviewer pass so the screenshot is
        produced. The PR body must always contain the embedded simulator image.

5. gh pr create \
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

## Factory Audit

- Iterations used: {N} of 40
- Acceptance gates: {gates_passed}/{gates_total} passed
- Review cycles: {review_cycles}
- Full decision log: [`docs/factory-reports/{TASK_ID}.md`](https://github.com/{REPO_PATH}/blob/{BRANCH}/docs/factory-reports/{TASK_ID}.md)

## Test Plan

- [x] All acceptance gates pass (evidence per gate in the factory report)
- [x] Visual comparison completed by reviewer
- [x] Lint passes
- [x] TypeScript compiles

🤖 Generated by [Dark Factory](https://github.com/anthropics/factory-try)
PRBODY
)"

6. Capture the PR URL from gh output.

7. Update .claude/factory-state.local.md:
   - phase: complete
   - pr_url: {PR_URL}

8. LOG event=PR_CREATED then event=COMPLETE (evidence: PR URL).

9. Output exactly:
<promise>FACTORY COMPLETE</promise>

## SAFETY RULE

If the ralph system message shows iteration 35 or higher: LOG event=SAFETY_STOP,
commit the factory report (step 1 above), create the PR immediately regardless of
gate or review status, add "⚠️ Safety stop at iteration 35 — gates {gates_passed}/{gates_total}"
to the PR body, and output FACTORY COMPLETE.
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
  0. Orient   — read journal tail + progress counters
  1. Builder  — implements next gate (self-review before commit)
  2. Oracle   — evaluates gates with per-gate evidence + regression check
  3. Reviewer — diff + visual review when all gates pass
  4. Decide   — stall accounting, escalation, loop / fix / ship PR

Stall handling: 2 no-progress iterations → builder strategy escalation;
4 → Oracle gate audit. Safety stop at iteration 35.

Monitor:
  tail -f .claude/factory-journal.local.md     # every decision, live
  cat .claude/factory-gates.local.md           # gate status + evidence
  git log --oneline feat/{TASK_ID}-{SLUG}

The PR will include docs/factory-reports/{TASK_ID}.md — the full decision log.
```

The Stop hook is now active. This session will not exit until FACTORY COMPLETE is detected or max iterations is reached.
