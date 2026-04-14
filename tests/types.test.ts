import { describe, expect, it } from 'vitest';
import {
  makeEWSystem,
  makeEmitter,
  makeEmptyScenario,
  makeNode,
  makeSIGINTSystem,
} from '../src/types/scenario';

describe('scenario builders', () => {
  it('empty scenario has sensible defaults that match backend Pydantic contract', () => {
    const s = makeEmptyScenario('env_test');
    expect(s.id).toBe('env_test');
    expect(s.nodes).toEqual([]);
    expect(s.emitters).toEqual([]);
    expect(s.ew_systems).toEqual([]);
    expect(s.sigint_systems).toEqual([]);
    expect(s.rf.center_freq).toBe(5_800_000_000);
    expect(s.clock.mode).toBe('realtime');
    expect(s.speedup_factor).toBe(1);
  });

  it('makeNode seeds required fields', () => {
    const n = makeNode('node-1', 48.1, 37.6);
    expect(n).toEqual({ id: 'node-1', lat: 48.1, lon: 37.6, alt_m: 10, noise_figure_db: 5 });
  });

  it('makeEmitter defaults to stationary trajectory with start set', () => {
    const e = makeEmitter('drone-1', 48.0, 37.5);
    expect(e.trajectory.type).toBe('stationary');
    expect(e.trajectory.start).toEqual({ lat: 48.0, lon: 37.5, alt_m: 100 });
  });

  it('makeEWSystem mirrors the pydantic schema (omnidirectional, active, freq range)', () => {
    const ew = makeEWSystem('ew-1', 48.1, 37.6);
    expect(ew.type).toBe('jammer');
    expect(ew.antenna_pattern).toBe('omnidirectional');
    expect(ew.active).toBe(true);
    expect(ew.frequency_range.max_hz).toBeGreaterThan(ew.frequency_range.min_hz);
  });

  it('makeSIGINTSystem enforces positive coverage radius default', () => {
    const s = makeSIGINTSystem('sig-1', 48.1, 37.6);
    expect(s.type).toBe('collection');
    expect(s.coverage_radius_m).toBeGreaterThan(0);
  });
});
