/**
 * Shape of frames pushed by the synthetic `/ws/dashboard` endpoint at ~2 Hz.
 *
 * Source of truth: watchtower-synthetic/server/ws_server.py (`ws_dashboard`).
 * Keep this file in sync with the Python `frame = {...}` dict.
 *
 * ClockMode values match the backend enum (workers/clock_stats.py):
 *   - "realtime" — 1× simulation speed
 *   - "free-run" — maximum speed the pipeline can sustain
 *   - "pre-generate" — buffered generation; live injection is rejected in this mode
 */

export type ClockMode = 'realtime' | 'free-run' | 'pre-generate';

export interface DashboardEmitter {
  id: string;
  signal_type: string;
  lat: number;
  lon: number;
  alt_m: number;
}

export interface DashboardSnrEntry {
  emitter_id: string;
  snr_db: number;
}

export interface DashboardNodeSnr {
  node_id: string;
  snr: DashboardSnrEntry[];
}

export interface DashboardClockState {
  sim_time_s: number;
  mode: ClockMode;
  speed_ratio: number;
}

export interface DashboardEWState {
  id: string;
  name: string;
  active: boolean;
  lat: number;
  lon: number;
}

export interface DashboardSIGINTState {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface DashboardFrame {
  timestamp_ns: number;
  emitters: DashboardEmitter[];
  nodes_snr: DashboardNodeSnr[];
  clock: DashboardClockState;
  ew_systems: DashboardEWState[];
  sigint_systems: DashboardSIGINTState[];
}

/**
 * Parse a raw dashboard frame string with just enough validation to reject
 * garbage without dragging in a schema library. Throws on malformed input.
 */
export function parseDashboardFrame(raw: string): DashboardFrame {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Dashboard frame is not an object');
  }
  const frame = parsed as Partial<DashboardFrame>;
  if (typeof frame.timestamp_ns !== 'number') throw new Error('timestamp_ns missing');
  if (!Array.isArray(frame.emitters)) throw new Error('emitters missing');
  if (!Array.isArray(frame.nodes_snr)) throw new Error('nodes_snr missing');
  if (!frame.clock || typeof frame.clock !== 'object') throw new Error('clock missing');
  if (!Array.isArray(frame.ew_systems)) throw new Error('ew_systems missing');
  if (!Array.isArray(frame.sigint_systems)) throw new Error('sigint_systems missing');
  return frame as DashboardFrame;
}
