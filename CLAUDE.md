## Maestro Orchestration Rules

**You are `synthetic-agent`** (same agent that owns `watchtower-synthetic`).

You own **two repositories**:
- `watchtower-synthetic` (Python asyncio IQ engine, FastAPI backend, MCP server)
- **`watchtower-synthetic-ui`** (this repo — React SPA frontend for the RF environment planner)

Maestro folder: `../watchtower-maestro/`

### Ownership
- `../watchtower-synthetic` — YOURS (write)
- `../watchtower-synthetic-ui` — YOURS (write) — this repo
- All other repos: READ-ONLY (see watchtower-synthetic/CLAUDE.md for full list)

### Tech Stack (this repo)
- **React 18+** + **TypeScript** + **Vite**
- **Leaflet** + **turf.js** for map + geographic computations
- **Vitest** for unit tests
- **nginx** for static serving in production container
- Package manager: **npm**

### Specs
- Active change: `../watchtower-specs/openspec/changes/synthetic-ui/`
- Capability spec: `../watchtower-specs/openspec/changes/synthetic-ui/specs/rf-environment-planner/spec.md`
- To propose a spec change, use `/maestro:propose`

### Git Workflow
- Work in branches: `agent/synthetic-agent/{feature-name}`
- Commits: conventional format
- PR required (merge to main)


<!-- maestro:begin -->
## Maestro Orchestration Rules

**You are `synthetic-agent`**. You own this repository: **watchtower-synthetic-ui**.

Maestro folder: `../watchtower-maestro/` (contains `.agents/`, `platform.yaml`, bus messages)

### First Session Checklist
1. Call `maestro_check(cwd)` MCP tool — see pending messages and blocked tasks
2. Read `../watchtower-maestro/.agents/queue/synthetic-agent.md` — see your active/queued/blocked tasks
3. Read specs relevant to your repo (specs_dir paths below)
4. Run `git log --oneline -10` — understand recent changes
5. If `../watchtower-maestro/.agents/knowledge/` exists, check for tech docs relevant to your work
6. Then: resume active task, or pick highest-priority queued task, or act on bus messages

### Ownership
- This repo (`../watchtower-synthetic-ui`) is YOURS — you may read and write freely here
- Other repos (READ-ONLY, do not write to them):
  - detectmod (../detectmod) — owned by **classification-agent** (READ-ONLY)
  - pfobos (../pfobos) — owned by **hardware-agent** (READ-ONLY)
  - watchtower-edge (../watchtower-edge) — owned by **embedded-agent** (READ-ONLY)
  - watchtower-sdr-probe (../watchtower-sdr-probe) — owned by **probe-agent** (READ-ONLY)
  - watchtower-fusion (../watchtower-fusion) — owned by **fusion-agent** (READ-ONLY)
  - watchtower-specs (../watchtower-specs) — owned by **spec-agent** (READ-ONLY)
  - watchtower-synthetic (../watchtower-synthetic) — owned by **synthetic-agent** (READ-ONLY)
  - watchtower-tactiq (../watchtower-tactiq) — owned by **tactiq-agent** (READ-ONLY)
  - watchtower-e2e (../watchtower-e2e) — owned by **e2e-agent** (READ-ONLY)
  - watchtower-train (../watchtower-train) — owned by **train-agent** (READ-ONLY)
  - watchtower-citadel (../watchtower-citadel) — owned by **citadel-agent** (READ-ONLY)
  - watchtower-grants (../watchtower-grants) — owned by **grants-agent** (READ-ONLY)
- You may read other repos' source code, configs, and CLAUDE.md to understand their APIs
- If you need a change in another repo, send a `task-assignment` or `question` message to its owner

### Communication — MCP Tools (ALWAYS USE THESE)
- **Use MCP tools for ALL maestro operations** — zero bash permissions needed:
  - `maestro_check(cwd)` — list pending messages for you
  - `maestro_send(cwd, to, subject, body)` — send a message to another agent
  - `maestro_ack(cwd, message_stem)` — acknowledge a message (read/resolved)
  - `maestro_read_message(cwd, message_stem)` — read full message content
  - `maestro_status(cwd)` — project-wide summary (all agents, messages, blocked)
  - `maestro_blocked(cwd)` — check/clear your blocked tasks
  - `maestro_propose(cwd, title, what_needs_to_change, why_needed)` — propose a spec change
  - `maestro_complete(cwd, change_name, tasks)` — report task completion
  - `maestro_read_spec(cwd, spec_path)` — read spec files without bash
  - `maestro_queue(cwd)` — read/update your task queue
  - `maestro_list_agents(cwd)` — list all agents and their repos
  - `maestro_set_agent(cwd, agent_name)` — set your identity
  - `maestro_cleanup(cwd)` — archive old bus messages
- Pass your current working directory as `cwd` for all tools
- **Do NOT use bash for maestro operations** — MCP tools are faster and need no permissions

### Bus Awareness (CRITICAL)
- **Check the bus proactively** — do NOT wait for the human to tell you:
  - After completing each task (feature done, test passing)
  - Before starting a new task from your queue
  - When idle or waiting for anything
  - After every 3-5 tool calls during active work
- **Never let pending messages exceed 3 without acting**
- When you change an API or shared type: send `contract-change` via `maestro_send` BEFORE committing
- Message handling while busy: ack as `read`, add to queue, finish current task first
- Urgent messages: pause current work, inform the human immediately

### Task Queue
- Your queue file: `../watchtower-maestro/.agents/queue/synthetic-agent.md`
- Max 1 active task at a time — finish or pause before switching
- When a `task-assignment` arrives while you're busy: ack as `read`, add to Queued section
- When you finish a task: check bus, then pick highest-priority queued item
- Urgent messages override: pause active task, handle urgent item

### Task Completion Reporting (CRITICAL)
- When you finish tasks from a `task-assignment`, you MUST report completion:
  - `maestro complete <change-name> --tasks "2.1, 2.3"` (specific tasks)
  - `maestro complete <change-name> --all` (all tasks for that change)
- This updates `tasks.md` checkboxes in the specs repo and sends a `task-complete` bus message
- **Lifecycle**: task-assignment received -> ack "read" -> implement -> `maestro complete` -> ack "resolved"
- NEVER ack a task-assignment as "resolved" without first running `maestro complete`

### Specs (OpenSpec)
- Specs repo: `../watchtower-specs` (READ-ONLY)
- **Your specs** (read these before implementing):
  - `../watchtower-specs/openspec/specs/rf-environment-planner/spec.md`
- **Shared contracts**: `../watchtower-specs/openspec/specs/shared-contracts/spec.md` — message schemas, signal classes, security contracts
- **Active changes for you**: scan `../watchtower-specs/openspec/changes/` for folders whose `tasks.md` references your repo or domain. Read `proposal.md` → `design.md` → `tasks.md` in each.
- **All accumulated specs**: `../watchtower-specs/openspec/specs/`
- To propose a spec change, use `/maestro:propose` — do NOT modify specs directly

### Spec Change Rules (CRITICAL)
- If you discover a missing endpoint, contract gap, or any spec change needed: run `/maestro:propose`, then **STOP** working on that feature
- **Never implement against a spec that doesn't exist yet** — wait for human approval + spec commit
- After proposing, switch to other tasks. Run `/maestro:check` periodically to see if your proposal was approved
- Resume the blocked task only after you see BOTH `spec-change-approved` AND `spec-change` messages
- Check `../watchtower-maestro/.agents/blocked/synthetic-agent.md` for your currently blocked tasks

- **Branching**: gitflow
- **Commits**: conventional format



### Git Workflow
- Work in branches: `agent/synthetic-agent/{feature-name}`
- All changes go through PRs
- Write clear commit messages for the audit trail
<!-- maestro:end -->
