import { describe, expect, it } from 'vitest';
import { summarize } from '../src/components/EnvironmentLibrary';
import { makeEWSystem, makeEmitter, makeEmptyScenario, makeNode } from '../src/types/scenario';

describe('EnvironmentLibrary.summarize', () => {
  it('counts entities and deduplicates signal types', () => {
    const scenario = makeEmptyScenario('env_1');
    scenario.description = 'Sector 7';
    scenario.nodes.push(makeNode('n1', 48, 37), makeNode('n2', 48, 37.1));
    scenario.emitters.push(
      makeEmitter('e1', 48, 37, 'fpv_analog'),
      makeEmitter('e2', 48, 37.1, 'fpv_analog'),
      makeEmitter('e3', 48, 37.2, 'cw'),
    );
    scenario.ew_systems.push(makeEWSystem('ew1', 48, 37));

    const s = summarize('env_1', scenario);
    expect(s).toMatchObject({
      id: 'env_1',
      description: 'Sector 7',
      node_count: 2,
      emitter_count: 3,
      ew_system_count: 1,
      sigint_system_count: 0,
    });
    expect(s.signal_types).toEqual(['cw', 'fpv_analog']);
  });

  it('returns placeholder summary when detail is still loading', () => {
    const s = summarize('env_loading', undefined);
    expect(s.id).toBe('env_loading');
    expect(s.description).toBe('…');
    expect(s.node_count).toBe(0);
    expect(s.signal_types).toEqual([]);
  });
});
