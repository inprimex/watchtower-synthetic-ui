import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MapView, RecenterControl } from './MapView';
import { CoverageOverlay } from './CoverageOverlay';
import {
  CoverageLayerControl,
  DEFAULT_LAYER_VISIBILITY,
  type CoverageLayerVisibility,
} from './CoverageLayerControl';
import { DashboardMarkersLayer } from './dashboard/DashboardMarkersLayer';
import { ClockIndicator } from './dashboard/ClockIndicator';
import { NodeSnrPanel } from './dashboard/NodeSnrPanel';
import { LiveInjectionPanel } from './dashboard/LiveInjectionPanel';
import { RouteAnalysis, type RoutePoint } from './RouteAnalysis';
import { NodeLayer } from './entities/NodeLayer';
import { useScenario, useScenarioList, useStopScenario } from '../hooks/useScenarioApi';
import { useCoverage, useInvalidateCoverage } from '../hooks/useCoverage';
import { useDashboardWs } from '../hooks/useDashboardWs';
import type { CoverageKind } from '../types/coverage';

const STALE_FRAME_MS = 3000; // if no frame for this long, mark clock as stale

export interface SimulationDashboardProps {
  onBack: () => void;
}

/**
 * Live dashboard view (task 8.2).
 *
 * Composes:
 *   - MapView with node markers (static from scenario) + live dashboard markers
 *   - CoverageOverlay for each coverage kind (gated by layer-toggle UI)
 *   - Optional RouteAnalysis polyline the operator can draw
 *   - ClockIndicator, NodeSnrPanel, LiveInjectionPanel in the sidebar
 *
 * Falls back to a "no active scenario" placeholder when the backend reports
 * no scenario running; the operator is nudged back to the library.
 */
export function SimulationDashboard({ onBack }: SimulationDashboardProps) {
  const list = useScenarioList();
  const activeId = list.data?.active ?? null;
  const scenario = useScenario(activeId);
  const stop = useStopScenario();

  const hasActive = !!activeId;

  const ws = useDashboardWs(hasActive);
  const invalidateCoverage = useInvalidateCoverage();

  const [visibility, setVisibility] = useState<CoverageLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [routeEnabled, setRouteEnabled] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);

  // Coverage queries, gated by the layer-toggle state. Each layer is a separate
  // useCoverage() hook so toggling one doesn't refetch unrelated kinds.
  const radar = useCoverage('radar', hasActive && visibility.radar);
  const jamming = useCoverage('jamming', hasActive && visibility.jamming);
  const sigint = useCoverage('sigint', hasActive && visibility.sigint);
  const interference = useCoverage('interference', hasActive && visibility.interference);
  const safeCorridors = useCoverage('safe-corridors', hasActive && visibility['safe-corridors']);

  // Route analysis needs radar + jamming even when their map overlays are
  // hidden — fetch them for classification if the route tool is active.
  const radarForRoute = useCoverage('radar', hasActive && routeEnabled && !visibility.radar);
  const jammingForRoute = useCoverage('jamming', hasActive && routeEnabled && !visibility.jamming);

  const coverageByKind = {
    radar: radar.data,
    jamming: jamming.data,
    sigint: sigint.data,
    interference: interference.data,
    'safe-corridors': safeCorridors.data,
  } as const;

  const radarForClassification = radar.data ?? radarForRoute.data;
  const jammingForClassification = jamming.data ?? jammingForRoute.data;

  // If the operator explicitly moves an entity (via the live-injection panel
  // this is handled automatically by mutations invalidating coverage), we
  // still re-trigger coverage on fresh dashboard frames for robustness. This
  // is cheap thanks to the 1-second stale window.
  const frameTs = ws.frame?.timestamp_ns;
  useEffect(() => {
    if (frameTs) invalidateCoverage();
  }, [frameTs, invalidateCoverage]);

  const center = useMemo((): [number, number] => {
    if (scenario.data?.nodes[0]) {
      return [scenario.data.nodes[0].lat, scenario.data.nodes[0].lon];
    }
    if (ws.frame?.emitters[0]) {
      return [ws.frame.emitters[0].lat, ws.frame.emitters[0].lon];
    }
    return DEFAULT_CENTER as [number, number];
  }, [scenario.data, ws.frame]);

  const frameStale =
    ws.status === 'open' &&
    ws.lastFrameMs !== null &&
    Date.now() - ws.lastFrameMs > STALE_FRAME_MS;

  if (!hasActive) {
    return (
      <div className="sim-dashboard sim-dashboard--empty">
        <p>No active scenario. Return to the library and launch one.</p>
        <button onClick={onBack}>← Library</button>
      </div>
    );
  }

  return (
    <div className="sim-dashboard">
      <header className="sim-dashboard__header">
        <button onClick={onBack}>← Library</button>
        <strong>{activeId}</strong>
        <ClockIndicator clock={ws.frame?.clock ?? null} stale={frameStale} />
        <span className="sim-dashboard__ws-status">
          WS: {ws.status}
          {ws.lastError ? ` (${ws.lastError})` : ''}
        </span>
        <button
          className="sim-dashboard__stop"
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
        >
          {stop.isPending ? 'Stopping…' : 'Stop scenario'}
        </button>
      </header>

      <div className="sim-dashboard__body">
        <aside className="sim-dashboard__sidebar">
          <CoverageLayerControl visibility={visibility} onChange={setVisibility} />

          <div className="sim-dashboard__tool-row">
            <label>
              <input
                type="checkbox"
                checked={routeEnabled}
                onChange={(e) => setRouteEnabled(e.target.checked)}
              />
              Draw friendly drone route
            </label>
            {routePoints.length > 0 ? (
              <button onClick={() => setRoutePoints([])}>Clear route</button>
            ) : null}
          </div>

          {ws.frame ? (
            <>
              <h4>Per-node SNR</h4>
              <NodeSnrPanel nodesSnr={ws.frame.nodes_snr} />
              <LiveInjectionPanel
                clockMode={ws.frame.clock.mode}
                emitterIds={ws.frame.emitters.map((e) => e.id)}
                ewIds={ws.frame.ew_systems.map((s) => s.id)}
                sigintIds={ws.frame.sigint_systems.map((s) => s.id)}
                center={center}
              />
            </>
          ) : (
            <p className="sim-dashboard__hint">
              Waiting for first dashboard frame… ({ws.status})
            </p>
          )}
        </aside>

        <div className="sim-dashboard__map-wrap">
          <MapView>
            <RecenterControl center={center} zoom={DEFAULT_ZOOM} />
            {scenario.data ? (
              <NodeLayer
                nodes={scenario.data.nodes}
                selectedId={null}
                onSelect={() => {}}
                onMove={() => {}}
              />
            ) : null}
            <DashboardMarkersLayer
              emitters={ws.frame?.emitters ?? []}
              ew={ws.frame?.ew_systems ?? []}
              sigint={ws.frame?.sigint_systems ?? []}
            />
            {(Object.keys(visibility) as CoverageKind[]).map((kind) =>
              visibility[kind] ? (
                <CoverageOverlay key={kind} kind={kind} data={coverageByKind[kind]} />
              ) : null,
            )}
            <RouteAnalysis
              points={routePoints}
              onAppend={(p) => setRoutePoints((prev) => [...prev, p])}
              radarCoverage={radarForClassification}
              jammingCoverage={jammingForClassification}
              enabled={routeEnabled}
            />
          </MapView>
        </div>
      </div>
    </div>
  );
}
