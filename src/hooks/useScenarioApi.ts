/**
 * React Query hooks for watchtower-synthetic scenario management.
 *
 * Endpoints (Phase 1b):
 *   GET    /health
 *   GET    /scenarios                       (list available + active)
 *   POST   /scenario/{id}/start
 *   POST   /scenario/stop
 *   GET    /nodes
 *   POST   /api/scenarios
 *   GET    /api/scenarios/{id}
 *   PUT    /api/scenarios/{id}
 *   DELETE /api/scenarios/{id}
 *   POST   /api/scenarios/{id}/validate
 *   POST|PATCH|DELETE /api/emitters[/{id}]
 *   POST|PATCH|DELETE /api/ew-systems[/{id}]
 *   POST|DELETE       /api/sigint-systems[/{id}]
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiRequest } from './apiClient';
import type {
  EWSystemConfig,
  EmitterConfig,
  ScenarioConfig,
  ScenarioListResponse,
  SIGINTSystemConfig,
} from '../types/scenario';

export const scenarioKeys = {
  all: ['scenarios'] as const,
  list: () => [...scenarioKeys.all, 'list'] as const,
  detail: (id: string) => [...scenarioKeys.all, 'detail', id] as const,
  health: () => ['health'] as const,
  nodes: () => ['nodes'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  version: string;
  scenario: string | null;
  uptime_s: number;
}

export function useHealth(
  options?: Omit<UseQueryOptions<HealthResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<HealthResponse>({
    queryKey: scenarioKeys.health(),
    queryFn: () => apiRequest<HealthResponse>('/health'),
    ...options,
  });
}

export function useScenarioList() {
  return useQuery<ScenarioListResponse>({
    queryKey: scenarioKeys.list(),
    queryFn: () => apiRequest<ScenarioListResponse>('/scenarios'),
  });
}

export function useScenario(id: string | null | undefined) {
  return useQuery<ScenarioConfig>({
    queryKey: scenarioKeys.detail(id ?? ''),
    queryFn: () => apiRequest<ScenarioConfig>(`/api/scenarios/${encodeURIComponent(id!)}`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Scenario lifecycle (start/stop)
// ---------------------------------------------------------------------------

export function useStartScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ status: string; scenario_id: string; nodes: string[] }>(
        `/scenario/${encodeURIComponent(id)}/start`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scenarioKeys.list() });
      qc.invalidateQueries({ queryKey: scenarioKeys.health() });
    },
  });
}

export function useStopScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ status: string }>('/scenario/stop', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scenarioKeys.list() });
      qc.invalidateQueries({ queryKey: scenarioKeys.health() });
    },
  });
}

// ---------------------------------------------------------------------------
// Scenario CRUD
// ---------------------------------------------------------------------------

export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenario: ScenarioConfig) =>
      apiRequest<{ id: string; status: string }>('/api/scenarios', {
        method: 'POST',
        body: scenario,
      }),
    onSuccess: (_data, scenario) => {
      qc.invalidateQueries({ queryKey: scenarioKeys.list() });
      qc.invalidateQueries({ queryKey: scenarioKeys.detail(scenario.id) });
    },
  });
}

export function useUpdateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenario: ScenarioConfig) =>
      apiRequest<{ id: string; status: string }>(
        `/api/scenarios/${encodeURIComponent(scenario.id)}`,
        { method: 'PUT', body: scenario },
      ),
    onSuccess: (_data, scenario) => {
      qc.invalidateQueries({ queryKey: scenarioKeys.list() });
      qc.invalidateQueries({ queryKey: scenarioKeys.detail(scenario.id) });
    },
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; status: string }>(
        `/api/scenarios/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: scenarioKeys.list() });
      qc.removeQueries({ queryKey: scenarioKeys.detail(id) });
    },
  });
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function useValidateScenario() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ScenarioConfig> }) =>
      apiRequest<ValidationResult>(`/api/scenarios/${encodeURIComponent(id)}/validate`, {
        method: 'POST',
        body,
      }),
  });
}

// ---------------------------------------------------------------------------
// Live injection — emitters, EW, SIGINT (require a running scenario)
//
// All live-injection mutations invalidate `coverageKeys.all` on success so
// every enabled `useCoverage(...)` subscriber refetches — this is how the
// editor hits the task 7.6 "coverage updates within 1 second" SLA after
// adding/removing/moving an entity.
// ---------------------------------------------------------------------------

export function useAddEmitter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cfg: EmitterConfig) =>
      apiRequest<{ id: string; status: string; emitter_count: number }>('/api/emitters', {
        method: 'POST',
        body: cfg,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}

export function useRemoveEmitter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; status: string }>(
        `/api/emitters/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}

export function useUpdateEmitter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<EmitterConfig> }) =>
      apiRequest<{ id: string; status: string }>(
        `/api/emitters/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: patch },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}

export function useAddEWSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cfg: EWSystemConfig) =>
      apiRequest<{ id: string; status: string; ew_system_count: number }>('/api/ew-systems', {
        method: 'POST',
        body: cfg,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}

export function useRemoveEWSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; status: string }>(
        `/api/ew-systems/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}

export function useAddSIGINTSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cfg: SIGINTSystemConfig) =>
      apiRequest<{ id: string; status: string; sigint_system_count: number }>(
        '/api/sigint-systems',
        { method: 'POST', body: cfg },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}

export function useRemoveSIGINTSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; status: string }>(
        `/api/sigint-systems/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  });
}
