import { describe, expect, it } from 'vitest';
import { parseDashboardFrame } from '../src/types/dashboard';

const GOOD_FRAME = {
  timestamp_ns: 1_700_000_000_000_000_000,
  emitters: [
    { id: 'e1', signal_type: 'fpv_analog', lat: 48.1, lon: 37.6, alt_m: 100 },
  ],
  nodes_snr: [
    { node_id: 'n1', snr: [{ emitter_id: 'e1', snr_db: 23.4 }] },
  ],
  clock: { sim_time_s: 12.5, mode: 'realtime', speed_ratio: 1.0 },
  ew_systems: [],
  sigint_systems: [],
};

describe('parseDashboardFrame', () => {
  it('accepts a well-formed frame', () => {
    const frame = parseDashboardFrame(JSON.stringify(GOOD_FRAME));
    expect(frame.emitters[0].id).toBe('e1');
    expect(frame.clock.mode).toBe('realtime');
    expect(frame.nodes_snr[0].snr[0].snr_db).toBe(23.4);
  });

  it.each([
    ['missing timestamp', { ...GOOD_FRAME, timestamp_ns: undefined }],
    ['emitters not array', { ...GOOD_FRAME, emitters: null }],
    ['missing clock', { ...GOOD_FRAME, clock: undefined }],
    ['missing ew_systems', { ...GOOD_FRAME, ew_systems: undefined }],
  ])('rejects %s', (_label, bad) => {
    expect(() => parseDashboardFrame(JSON.stringify(bad))).toThrow();
  });

  it('rejects non-JSON input', () => {
    expect(() => parseDashboardFrame('not-json')).toThrow();
  });
});
