# watchtower-synthetic-ui

**RF Environment Planner** — a standalone React SPA for modeling, visualizing, and planning within the complete electromagnetic picture of an operating area.

Part of the Watchtower RT platform. Capability: `rf-environment-planner`.

## Architecture

The SPA communicates with `watchtower-synthetic` (FastAPI on :8100) over REST and WebSocket. No business logic lives here — all computation happens in the synthetic backend.

## Development

```bash
npm install
cp .env.example .env          # edit VITE_SYNTHETIC_BASE_URL
npm run dev                   # http://localhost:5173
```

## Build & Deploy

```bash
npm run build                 # production build to dist/
docker compose up             # nginx static serve on :3000
```

## Ownership

- **Agent**: synthetic-agent (same agent owns watchtower-synthetic)
- **Specs**: openspec/changes/synthetic-ui/specs/rf-environment-planner/spec.md
