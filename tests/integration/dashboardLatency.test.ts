/**
 * Phase 4 · task 10.2 — dashboard reflects mid-run injection within 2s.
 *
 * This is the only Phase 4 test that genuinely needs a running backend. The
 * other 10.x tasks live in watchtower-synthetic as pytest integration tests.
 *
 * Gating: the test is **skipped unless `SYNTHETIC_BASE_URL` is exported**.
 * This keeps `npm run test` green in all environments. To run it locally:
 *
 *   # 1. start the backend in another terminal
 *   cd ../watchtower-synthetic && uv run python -m server.main
 *
 *   # 2. run this test with the backend pointed out
 *   SYNTHETIC_BASE_URL=http://localhost:8100 npm run test -- dashboardLatency
 *
 * What the test asserts (matches the spec scenario):
 *   "create env via API, launch it, inject an emitter mid-run, the dashboard
 *    WebSocket must surface the new emitter within 2 seconds."
 *
 * Why not Playwright:
 *   The spec's real assertion is on the data pipeline (REST → pipeline restart →
 *   /ws/dashboard frame). A browser test only adds DOM rendering on top, which
 *   is already covered by unit tests of the dashboard components.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

const BASE_URL = process.env.SYNTHETIC_BASE_URL;
const WS_URL = BASE_URL?.replace(/^http/, 'ws');
const TEST_ENABLED = !!BASE_URL;
const SLA_MS = 2_000;
const SCENARIO_ID = 'phase4_ui_latency';

const describeLive = TEST_ENABLED ? describe : describe.skip;

async function api<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  const data = text ? (JSON.parse(text) as T) : null;
  return { status: resp.status, data };
}

describeLive('Phase 4 · 10.2 — dashboard reflects injection within 2s', () => {
  beforeAll(async () => {
    // Verify backend is actually reachable before declaring the test enabled —
    // otherwise the user sees a timeout instead of a clean skip message.
    const probe = await fetch(`${BASE_URL}/health`).catch(() => null);
    if (!probe || !probe.ok) {
      throw new Error(
        `SYNTHETIC_BASE_URL=${BASE_URL} is unreachable. Start the backend first.`,
      );
    }
  });

  afterEach(async () => {
    // Best-effort cleanup — stop scenario and delete the test env. Errors are
    // benign (scenario may already be stopped/missing).
    await api('POST', '/scenario/stop').catch(() => {});
    await api('DELETE', `/api/scenarios/${SCENARIO_ID}`).catch(() => {});
  });

  it('POST /api/emitters reaches /ws/dashboard within 2 seconds', async () => {
    // 1. Clean any leftover env from a prior failed run.
    await api('DELETE', `/api/scenarios/${SCENARIO_ID}`).catch(() => {});

    // 2. Create a realtime scenario with a single node + emitter.
    const createBody = {
      id: SCENARIO_ID,
      description: 'Phase 4 UI latency test',
      nodes: [{ id: 'node-1', lat: 48.1, lon: 37.6, alt_m: 0, noise_figure_db: 5.0 }],
      emitters: [
        {
          id: 'baseline-emitter',
          signal_type: 'cw',
          power_dbm: 20,
          trajectory: { type: 'stationary', start: { lat: 48.105, lon: 37.615, alt_m: 50 } },
        },
      ],
      clock: { mode: 'realtime', buffer_depth_s: 5.0 },
    };
    const created = await api('POST', '/api/scenarios', createBody);
    expect(created.status).toBe(200);

    // 3. Launch.
    const started = await api('POST', `/scenario/${SCENARIO_ID}/start`);
    expect(started.status).toBe(200);

    // 4. Open dashboard WS and wait for the first frame so we know the stream is live.
    const ws = new WebSocket(`${WS_URL}/ws/dashboard`);
    const injectedId = 'phase4-injected-1';

    try {
      await waitForOpen(ws);
      await waitForFrame(ws); // drain one baseline frame

      // 5. Inject the new emitter, then race a 2s deadline against the WS frame.
      const injectBody = {
        id: injectedId,
        signal_type: 'cw',
        power_dbm: 18.0,
        trajectory: { type: 'stationary', start: { lat: 48.11, lon: 37.62, alt_m: 60 } },
      };
      const t0 = Date.now();
      const injected = await api('POST', '/api/emitters', injectBody);
      expect(injected.status).toBe(200);

      const appearedAtMs = await waitForEmitterInFrames(ws, injectedId, SLA_MS);
      const elapsed = appearedAtMs - t0;

      expect(elapsed).toBeLessThanOrEqual(SLA_MS);
    } finally {
      ws.close();
    }
  }, 30_000);
});

// -----------------------------------------------------------------------------
// WebSocket helpers
// -----------------------------------------------------------------------------

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.once('open', () => resolve());
    ws.once('error', (err) => reject(err));
  });
}

function waitForFrame(ws: WebSocket, timeoutMs = 5_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for dashboard frame after ${timeoutMs}ms`)),
      timeoutMs,
    );
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(String(data)));
    });
  });
}

/**
 * Listen on the WebSocket until a frame arrives whose `emitters` array
 * contains the given id. Returns the wall-clock ms at which that frame was
 * received — the caller subtracts the injection timestamp to get latency.
 */
function waitForEmitterInFrames(
  ws: WebSocket,
  emitterId: string,
  budgetMs: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + budgetMs;
    const onMessage = (data: WebSocket.RawData) => {
      try {
        const frame = JSON.parse(String(data)) as { emitters?: { id: string }[] };
        if (frame.emitters?.some((e) => e.id === emitterId)) {
          cleanup();
          resolve(Date.now());
        } else if (Date.now() > deadline) {
          cleanup();
          reject(new Error(`emitter ${emitterId} did not appear within ${budgetMs}ms`));
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`deadline: emitter ${emitterId} missing after ${budgetMs}ms`));
    }, budgetMs);
    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
    };
    ws.on('message', onMessage);
  });
}
