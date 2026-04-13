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
