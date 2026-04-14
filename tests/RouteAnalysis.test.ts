import { describe, expect, it } from 'vitest';
import { classifySegments } from '../src/components/RouteAnalysis';
import type { CoverageFeatureCollection } from '../src/types/coverage';

/** A square polygon helper that's easy to reason about in test assertions. */
function square(name: string, center: [number, number], halfEdge = 0.1): CoverageFeatureCollection {
  const [lat, lon] = center;
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lon - halfEdge, lat - halfEdge],
              [lon + halfEdge, lat - halfEdge],
              [lon + halfEdge, lat + halfEdge],
              [lon - halfEdge, lat + halfEdge],
              [lon - halfEdge, lat - halfEdge],
            ],
          ],
        },
        properties: { entity_id: name },
      },
    ],
  };
}

describe('classifySegments', () => {
  const radar = square('r1', [48.0, 37.0], 0.2); // big square covering origin
  const jammer = square('j1', [48.1, 37.1], 0.05); // small square offset

  it('returns an empty array when fewer than 2 points are given', () => {
    expect(classifySegments([], radar, jammer)).toEqual([]);
    expect(classifySegments([{ lat: 48, lng: 37 }], radar, jammer)).toEqual([]);
  });

  it('classifies segment inside radar coverage and outside jammer as safe', () => {
    const segs = classifySegments(
      [
        { lat: 47.95, lng: 36.95 },
        { lat: 47.99, lng: 36.99 },
      ],
      radar,
      jammer,
    );
    expect(segs).toHaveLength(1);
    expect(segs[0].status).toBe('safe');
  });

  it('classifies segment inside both radar and jammer as partial', () => {
    const segs = classifySegments(
      [
        { lat: 48.09, lng: 37.09 },
        { lat: 48.11, lng: 37.11 },
      ],
      radar,
      jammer,
    );
    expect(segs[0].status).toBe('partial');
  });

  it('classifies segment outside radar but inside jammer as jammed', () => {
    const tiny = square('r1', [99.0, 99.0], 0.01); // radar far away
    const segs = classifySegments(
      [
        { lat: 48.09, lng: 37.09 },
        { lat: 48.11, lng: 37.11 },
      ],
      tiny,
      jammer,
    );
    expect(segs[0].status).toBe('jammed');
  });

  it('classifies segment outside both as uncovered', () => {
    const segs = classifySegments(
      [
        { lat: 0, lng: 0 },
        { lat: 0.01, lng: 0.01 },
      ],
      radar,
      jammer,
    );
    expect(segs[0].status).toBe('uncovered');
  });

  it('survives undefined coverage (no data yet) by treating everything as uncovered', () => {
    const segs = classifySegments(
      [
        { lat: 48, lng: 37 },
        { lat: 48.01, lng: 37.01 },
      ],
      undefined,
      undefined,
    );
    expect(segs[0].status).toBe('uncovered');
  });
});
