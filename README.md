# watchtower-synthetic-ui

**RF Environment Planner** — a standalone React SPA for modeling, visualizing,
and planning within the complete electromagnetic picture of an operating area.

Part of the Watchtower RT platform. Capability: `rf-environment-planner`.

## Architecture

The SPA communicates with [`watchtower-synthetic`](https://github.com/inprimex/watchtower-synthetic)
(FastAPI on `:8100`) over REST and WebSocket. No business logic lives here —
all computation (coverage, interference, SNR) happens in the synthetic backend.

```
  React SPA (this repo, nginx :3000)
          │ REST /api/*, WS /ws/dashboard
          ▼
  watchtower-synthetic (FastAPI :8100)
```

See `../watchtower-specs/openspec/changes/synthetic-ui/design.md` for the
design rationale (D1 standalone SPA, D5 YAML schema, D6 Leaflet layers).

## Features

- **Environment library** — browse, launch, stop, edit, and delete scenarios
- **Map editor** — click-to-place nodes, emitters (stationary / linear /
  circular trajectories), EW jammers, SIGINT collectors; live save/load via
  the CRUD API
- **Coverage visualization** — five toggleable overlay layers: radar, jamming,
  SIGINT, interference (with green/yellow/red severity), safe corridors
- **Route analysis** — draw a friendly-drone route, segments colored by
  coverage/jamming status
- **Live dashboard** — ground-truth emitter positions at 2 Hz, per-node SNR
  table, clock indicator, live entity injection (with pre-generate-mode
  gating and IQ-gap warnings)
- **Offline tile support** — pre-cached OSM tiles served by nginx when the
  field host has no internet

## Development

```bash
npm install
cp .env.example .env            # edit VITE_SYNTHETIC_BASE_URL if backend isn't on :8100
npm run dev                     # http://localhost:5173
```

### Scripts

| command | what it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production bundle to `dist/` |
| `npm run test` | Vitest in CI mode |
| `npm run test:watch` | Vitest interactive |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src/` |
| `npm run preview` | Serve the built bundle locally |

## Offline map tiles

Tiles are **not** committed to git (too large + OSM licensing). Prefetch them
before building the Docker image:

```bash
# Default bbox covers the Donbas sector at zooms 8–13 (~a few MB).
scripts/download-tiles.sh

# Or customize the area:
MIN_LAT=47.9 MAX_LAT=48.3 MIN_LON=37.3 MAX_LON=37.9 \
  MIN_ZOOM=8 MAX_ZOOM=14 \
  scripts/download-tiles.sh
```

Downloaded tiles land under `public/tiles/{z}/{x}/{y}.png`. At runtime,
`useOfflineTiles` probes `/tiles/0/0/0.png` and switches the Leaflet
`tileLayer` URL accordingly — if the cache is empty or unreachable, the UI
falls back to the online OSM tile server transparently.

Respect the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/):
only prefetch small operational areas, set a descriptive User-Agent (the
script already does), and for continuous or large-area use host your own
tile server (`tileserver-gl` + OpenMapTiles).

## Docker build & run

### Standalone

```bash
docker compose up --build
# → http://localhost:3000
```

This spins up the UI only. It assumes the synthetic backend is reachable at
the URL baked into the bundle via `VITE_SYNTHETIC_BASE_URL` (default
`http://watchtower-synthetic:8100`). For local testing without Docker-networked
backend, override:

```bash
VITE_SYNTHETIC_BASE_URL=http://host.docker.internal:8100 docker compose up --build
```

### Composed with `watchtower-synthetic` (recommended for field hosts)

Both compose stacks join a shared external network so they can reach each
other by service DNS.

**One-time setup**:

```bash
docker network create watchtower-net
```

**In `../watchtower-synthetic/docker-compose.yml`** — add these two blocks if
they aren't there yet (synthetic-agent owns that file; this is a coordinating
change):

```yaml
services:
  synthetic:
    # ...existing config...
    networks:
      - watchtower

networks:
  watchtower:
    name: watchtower-net
    external: true
```

**Then bring both up**:

```bash
(cd ../watchtower-synthetic && docker compose up -d)
docker compose up --build -d
```

The UI reaches the backend via `http://watchtower-synthetic:8100` — no host
networking, no published ports required between services.

## Field deployment

1. **Build the image on a connected host** (tiles + dependencies need
   internet during build):

   ```bash
   scripts/download-tiles.sh                             # prefetch OSM tiles
   docker compose build \
     --build-arg VITE_SYNTHETIC_BASE_URL=http://cp-host.local:8100
   ```

2. **Save & transfer**:

   ```bash
   docker save watchtower-synthetic-ui:local | gzip > ui.tar.gz
   # copy ui.tar.gz to the field host via whatever sneakernet you have
   ```

3. **On the field host**:

   ```bash
   gunzip -c ui.tar.gz | docker load
   docker network create watchtower-net   # once
   docker compose up -d
   ```

The UI will serve from `:3000`, talk to the backend at the baked-in URL, and
use the pre-cached tiles — no internet required at runtime.

## Ownership

- **Agent**: synthetic-agent (same agent owns [watchtower-synthetic](https://github.com/inprimex/watchtower-synthetic))
- **Specs**: `../watchtower-specs/openspec/specs/rf-environment-planner/spec.md`
- **Active change**: `../watchtower-specs/openspec/changes/synthetic-ui/`
