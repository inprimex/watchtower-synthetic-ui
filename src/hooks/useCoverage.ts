/**
 * React Query hooks for RF coverage overlays.
 *
 * Endpoints return GeoJSON FeatureCollections which Leaflet consumes via
 * `L.geoJSON()`. Coverage is recomputed server-side on every call — these
 * hooks are kept short-staletime so coverage redraws as soon as entities move.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './apiClient';
import type { CoverageFeatureCollection, CoverageKind } from '../types/coverage';

const COVERAGE_PATH: Record<CoverageKind, string> = {
  radar: '/api/coverage/radar',
  jamming: '/api/coverage/jamming',
  sigint: '/api/coverage/sigint',
  interference: '/api/coverage/interference',
  'safe-corridors': '/api/coverage/safe-corridors',
};

export const coverageKeys = {
  all: ['coverage'] as const,
  kind: (kind: CoverageKind) => [...coverageKeys.all, kind] as const,
};

/** One hook per kind so Leaflet layers can subscribe independently. */
export function useCoverage(kind: CoverageKind, enabled = true) {
  return useQuery<CoverageFeatureCollection>({
    queryKey: coverageKeys.kind(kind),
    queryFn: () => apiRequest<CoverageFeatureCollection>(COVERAGE_PATH[kind]),
    enabled,
    // Entities changing should trigger a refetch; client code invalidates
    // coverageKeys.all after mutations. Short stale time keeps overlays fresh.
    staleTime: 1_000,
  });
}

/**
 * Returns a stable callback that invalidates every coverage query, causing
 * all enabled `useCoverage(...)` subscribers to refetch. Used by the editor
 * and live-dashboard after any mutation that could change coverage (entity
 * add/remove/move) — supports the task 7.6 "what-if within 1 second" SLA.
 */
export function useInvalidateCoverage() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: coverageKeys.all });
  }, [qc]);
}
