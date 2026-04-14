import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  scenarioKeys,
  useScenarioList,
  useStartScenario,
  useStopScenario,
  useDeleteScenario,
} from '../hooks/useScenarioApi';
import { apiRequest } from '../hooks/apiClient';
import type { ScenarioConfig, ScenarioSummary } from '../types/scenario';

/**
 * EnvironmentLibrary — browse/launch/stop environments (task 5.6).
 *
 * Backend `/scenarios` only returns `{available, active}`, so the summary table
 * is assembled by fan-out fetching each scenario's full definition in parallel.
 * Entity counts are recomputed from the scenario JSON rather than pulled from a
 * dedicated summary endpoint (which doesn't exist in Phase 1b).
 */
export interface EnvironmentLibraryProps {
  onEdit: (scenarioId: string) => void;
  onCreate: () => void;
}

export function EnvironmentLibrary({ onEdit, onCreate }: EnvironmentLibraryProps) {
  const list = useScenarioList();
  const start = useStartScenario();
  const stop = useStopScenario();
  const remove = useDeleteScenario();

  const available = list.data?.available ?? [];
  const active = list.data?.active ?? null;

  const detailQueries = useQueries({
    queries: available.map((id) => ({
      queryKey: scenarioKeys.detail(id),
      queryFn: () => apiRequest<ScenarioConfig>(`/api/scenarios/${encodeURIComponent(id)}`),
      staleTime: 10_000,
    })),
  });

  const summaries: ScenarioSummary[] = useMemo(() => {
    return detailQueries.map((q, idx) => summarize(available[idx], q.data));
  }, [available, detailQueries]);

  if (list.isLoading) return <div className="env-lib__status">Loading environments…</div>;
  if (list.isError) {
    return (
      <div className="env-lib__status env-lib__status--error">
        Failed to load environments: {String(list.error)}
        <button onClick={() => list.refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="env-lib">
      <header className="env-lib__header">
        <h2>Environment Library</h2>
        <div className="env-lib__header-actions">
          <span className="env-lib__active">
            Active: <strong>{active ?? '— none —'}</strong>
          </span>
          <button onClick={onCreate}>+ New Environment</button>
        </div>
      </header>

      {summaries.length === 0 ? (
        <p className="env-lib__empty">No environments yet. Create one to get started.</p>
      ) : (
        <table className="env-lib__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Nodes</th>
              <th>Emitters</th>
              <th>EW</th>
              <th>SIGINT</th>
              <th>Signal types</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr
                key={s.id}
                className={active === s.id ? 'env-lib__row env-lib__row--active' : 'env-lib__row'}
              >
                <td>{s.id}</td>
                <td>{s.description || <em>(no description)</em>}</td>
                <td>{s.node_count}</td>
                <td>{s.emitter_count}</td>
                <td>{s.ew_system_count}</td>
                <td>{s.sigint_system_count}</td>
                <td>{s.signal_types.join(', ') || '—'}</td>
                <td className="env-lib__actions">
                  {active === s.id ? (
                    <button
                      onClick={() => stop.mutate()}
                      disabled={stop.isPending}
                    >
                      {stop.isPending ? 'Stopping…' : 'Stop'}
                    </button>
                  ) : (
                    <button
                      onClick={() => start.mutate(s.id)}
                      disabled={start.isPending || active !== null}
                      title={active !== null ? 'Stop the active scenario first' : 'Launch'}
                    >
                      {start.isPending ? 'Launching…' : 'Launch'}
                    </button>
                  )}
                  <button onClick={() => onEdit(s.id)}>Edit</button>
                  <button
                    onClick={() => remove.mutate(s.id)}
                    disabled={remove.isPending || active === s.id}
                    title={active === s.id ? 'Stop before deleting' : 'Delete'}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function summarize(id: string, data: ScenarioConfig | undefined): ScenarioSummary {
  if (!data) {
    return {
      id,
      description: '…',
      node_count: 0,
      emitter_count: 0,
      ew_system_count: 0,
      sigint_system_count: 0,
      signal_types: [],
    };
  }
  const signalTypes = Array.from(new Set(data.emitters.map((e) => e.signal_type))).sort();
  return {
    id: data.id,
    description: data.description,
    node_count: data.nodes.length,
    emitter_count: data.emitters.length,
    ew_system_count: data.ew_systems.length,
    sigint_system_count: data.sigint_systems.length,
    signal_types: signalTypes,
  };
}
