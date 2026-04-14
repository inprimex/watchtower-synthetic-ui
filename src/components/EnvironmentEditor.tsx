import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MapView,
  RecenterControl,
} from './MapView';
import { NodeLayer, NodePanel } from './entities/NodeLayer';
import { EmitterLayer, EmitterPanel } from './entities/EmitterLayer';
import { EWSystemLayer, EWSystemPanel } from './entities/EWSystemLayer';
import { SIGINTSystemLayer, SIGINTSystemPanel } from './entities/SIGINTSystemLayer';
import { CoverageOverlay } from './CoverageOverlay';
import {
  useCreateScenario,
  useScenario,
  useScenarioList,
  useUpdateScenario,
  useValidateScenario,
} from '../hooks/useScenarioApi';
import { useCoverage } from '../hooks/useCoverage';
import {
  makeEWSystem,
  makeEmitter,
  makeEmptyScenario,
  makeNode,
  makeSIGINTSystem,
  type EWSystemConfig,
  type EmitterConfig,
  type NodeConfig,
  type ScenarioConfig,
  type SIGINTSystemConfig,
} from '../types/scenario';

export interface EnvironmentEditorProps {
  /** If set, load and edit an existing scenario; otherwise create a new one. */
  scenarioId: string | null;
  onBack: () => void;
}

type EntityMode = 'select' | 'node' | 'emitter' | 'ew' | 'sigint';
type SelectedEntity =
  | { kind: 'node'; id: string }
  | { kind: 'emitter'; id: string }
  | { kind: 'ew'; id: string }
  | { kind: 'sigint'; id: string }
  | null;

/**
 * Orchestrates the map editor for a single scenario (task 6.6).
 *
 * The editor holds a local copy of the scenario so edits are immediate;
 * Save pushes via POST (create) or PUT (update). Live coverage previews for
 * EW/SIGINT are fetched only when this scenario is the active one — the
 * synthetic backend requires an active scenario for any /api/coverage call.
 */
export function EnvironmentEditor({ scenarioId, onBack }: EnvironmentEditorProps) {
  const existing = useScenario(scenarioId);
  const listQuery = useScenarioList();
  const create = useCreateScenario();
  const update = useUpdateScenario();
  const validate = useValidateScenario();

  const isActiveScenario = !!scenarioId && listQuery.data?.active === scenarioId;

  // Coverage previews only meaningful when this scenario is actually running.
  const jamming = useCoverage('jamming', isActiveScenario);
  const sigintCov = useCoverage('sigint', isActiveScenario);

  const [scenario, setScenario] = useState<ScenarioConfig | null>(null);
  const [mode, setMode] = useState<EntityMode>('select');
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Seed local state from the server once per scenarioId load.
  useEffect(() => {
    if (scenarioId == null) {
      setScenario(makeEmptyScenario());
    } else if (existing.data) {
      setScenario(existing.data);
    }
  }, [scenarioId, existing.data]);

  // Initial map center — use the first node/emitter position so the operator
  // doesn't have to pan across Europe before seeing their own data.
  const mapCenter = useMemo(() => {
    if (!scenario) return DEFAULT_CENTER;
    const first = scenario.nodes[0] ?? scenario.emitters[0]?.trajectory.start;
    if (!first) return DEFAULT_CENTER;
    return [
      'lat' in first ? first.lat : (first as NodeConfig).lat,
      'lon' in first ? first.lon : (first as NodeConfig).lon,
    ] as [number, number];
  }, [scenario]);

  if (!scenario) {
    return <div className="env-editor env-editor--loading">Loading scenario…</div>;
  }

  // -------------------------------------------------------------------------
  // Placement / edit callbacks
  // -------------------------------------------------------------------------

  const handleMapClick = ({ lat, lng }: { lat: number; lng: number }) => {
    if (mode === 'select') return;
    const existingIds = new Set([
      ...scenario.nodes.map((n) => n.id),
      ...scenario.emitters.map((e) => e.id),
      ...scenario.ew_systems.map((s) => s.id),
      ...scenario.sigint_systems.map((s) => s.id),
    ]);
    const makeId = (prefix: string) => {
      for (let i = 1; i < 1000; i += 1) {
        const candidate = `${prefix}-${i}`;
        if (!existingIds.has(candidate)) return candidate;
      }
      return `${prefix}-${Date.now()}`;
    };
    switch (mode) {
      case 'node': {
        const node = makeNode(makeId('node'), lat, lng);
        setScenario({ ...scenario, nodes: [...scenario.nodes, node] });
        setSelected({ kind: 'node', id: node.id });
        break;
      }
      case 'emitter': {
        const emitter = makeEmitter(makeId('emitter'), lat, lng);
        setScenario({ ...scenario, emitters: [...scenario.emitters, emitter] });
        setSelected({ kind: 'emitter', id: emitter.id });
        break;
      }
      case 'ew': {
        const ew = makeEWSystem(makeId('ew'), lat, lng);
        setScenario({ ...scenario, ew_systems: [...scenario.ew_systems, ew] });
        setSelected({ kind: 'ew', id: ew.id });
        break;
      }
      case 'sigint': {
        const sig = makeSIGINTSystem(makeId('sigint'), lat, lng);
        setScenario({ ...scenario, sigint_systems: [...scenario.sigint_systems, sig] });
        setSelected({ kind: 'sigint', id: sig.id });
        break;
      }
    }
    setMode('select');
  };

  const updateNode = (next: NodeConfig, prevId: string) => {
    setScenario({
      ...scenario,
      nodes: scenario.nodes.map((n) => (n.id === prevId ? next : n)),
    });
    if (selected?.kind === 'node' && selected.id === prevId) {
      setSelected({ kind: 'node', id: next.id });
    }
  };
  const updateEmitter = (next: EmitterConfig, prevId: string) => {
    setScenario({
      ...scenario,
      emitters: scenario.emitters.map((e) => (e.id === prevId ? next : e)),
    });
    if (selected?.kind === 'emitter' && selected.id === prevId) {
      setSelected({ kind: 'emitter', id: next.id });
    }
  };
  const updateEW = (next: EWSystemConfig, prevId: string) => {
    setScenario({
      ...scenario,
      ew_systems: scenario.ew_systems.map((s) => (s.id === prevId ? next : s)),
    });
    if (selected?.kind === 'ew' && selected.id === prevId) {
      setSelected({ kind: 'ew', id: next.id });
    }
  };
  const updateSIGINT = (next: SIGINTSystemConfig, prevId: string) => {
    setScenario({
      ...scenario,
      sigint_systems: scenario.sigint_systems.map((s) => (s.id === prevId ? next : s)),
    });
    if (selected?.kind === 'sigint' && selected.id === prevId) {
      setSelected({ kind: 'sigint', id: next.id });
    }
  };

  const removeSelected = () => {
    if (!selected) return;
    switch (selected.kind) {
      case 'node':
        setScenario({ ...scenario, nodes: scenario.nodes.filter((n) => n.id !== selected.id) });
        break;
      case 'emitter':
        setScenario({
          ...scenario,
          emitters: scenario.emitters.filter((e) => e.id !== selected.id),
        });
        break;
      case 'ew':
        setScenario({
          ...scenario,
          ew_systems: scenario.ew_systems.filter((s) => s.id !== selected.id),
        });
        break;
      case 'sigint':
        setScenario({
          ...scenario,
          sigint_systems: scenario.sigint_systems.filter((s) => s.id !== selected.id),
        });
        break;
    }
    setSelected(null);
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    setStatusMsg('Validating…');
    try {
      const result = await validate.mutateAsync({ id: scenario.id, body: scenario });
      if (!result.valid) {
        setStatusMsg(`Invalid: ${result.errors.join('; ')}`);
        return;
      }
      if (scenarioId) {
        await update.mutateAsync(scenario);
        setStatusMsg(`Updated ${scenario.id}`);
      } else {
        await create.mutateAsync(scenario);
        setStatusMsg(`Created ${scenario.id}`);
      }
    } catch (err) {
      setStatusMsg(`Save failed: ${String(err)}`);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const selectedPanel = (() => {
    if (!selected) return null;
    switch (selected.kind) {
      case 'node': {
        const node = scenario.nodes.find((n) => n.id === selected.id);
        if (!node) return null;
        return (
          <NodePanel
            node={node}
            onChange={(next) => updateNode(next, selected.id)}
            onRemove={removeSelected}
          />
        );
      }
      case 'emitter': {
        const emitter = scenario.emitters.find((e) => e.id === selected.id);
        if (!emitter) return null;
        return (
          <EmitterPanel
            emitter={emitter}
            onChange={(next) => updateEmitter(next, selected.id)}
            onRemove={removeSelected}
          />
        );
      }
      case 'ew': {
        const ew = scenario.ew_systems.find((s) => s.id === selected.id);
        if (!ew) return null;
        return (
          <EWSystemPanel
            system={ew}
            onChange={(next) => updateEW(next, selected.id)}
            onRemove={removeSelected}
          />
        );
      }
      case 'sigint': {
        const sig = scenario.sigint_systems.find((s) => s.id === selected.id);
        if (!sig) return null;
        return (
          <SIGINTSystemPanel
            system={sig}
            onChange={(next) => updateSIGINT(next, selected.id)}
            onRemove={removeSelected}
          />
        );
      }
    }
  })();

  return (
    <div className="env-editor">
      <header className="env-editor__header">
        <button onClick={onBack}>← Library</button>
        <input
          className="env-editor__id-input"
          type="text"
          value={scenario.id}
          onChange={(e) => setScenario({ ...scenario, id: e.target.value })}
          placeholder="Environment ID"
        />
        <input
          className="env-editor__desc-input"
          type="text"
          value={scenario.description}
          onChange={(e) => setScenario({ ...scenario, description: e.target.value })}
          placeholder="Description"
        />
        <button
          onClick={handleSave}
          disabled={create.isPending || update.isPending || validate.isPending}
        >
          Save
        </button>
        <span className="env-editor__status">{statusMsg}</span>
      </header>

      <div className="env-editor__body">
        <aside className="env-editor__sidebar">
          <div className="env-editor__tools">
            <ModeButton current={mode} mode="select" onClick={setMode}>
              Select / drag
            </ModeButton>
            <ModeButton current={mode} mode="node" onClick={setMode}>
              + Node
            </ModeButton>
            <ModeButton current={mode} mode="emitter" onClick={setMode}>
              + Emitter
            </ModeButton>
            <ModeButton current={mode} mode="ew" onClick={setMode}>
              + EW system
            </ModeButton>
            <ModeButton current={mode} mode="sigint" onClick={setMode}>
              + SIGINT
            </ModeButton>
          </div>
          {mode !== 'select' ? (
            <p className="env-editor__hint">Click map to place {mode}</p>
          ) : null}
          <hr />
          <div className="env-editor__selection">{selectedPanel}</div>
          {!isActiveScenario && (scenario.ew_systems.length > 0 || scenario.sigint_systems.length > 0) ? (
            <p className="env-editor__note">
              Coverage overlays require launching this scenario (Library → Launch).
            </p>
          ) : null}
        </aside>

        <div className="env-editor__map-wrap">
          <MapView onMapClick={handleMapClick}>
            <RecenterControl center={mapCenter} zoom={DEFAULT_ZOOM} />
            <NodeLayer
              nodes={scenario.nodes}
              selectedId={selected?.kind === 'node' ? selected.id : null}
              onSelect={(id) => setSelected({ kind: 'node', id })}
              onMove={(id, lat, lon) => {
                const n = scenario.nodes.find((x) => x.id === id);
                if (n) updateNode({ ...n, lat, lon }, id);
              }}
            />
            <EmitterLayer
              emitters={scenario.emitters}
              selectedId={selected?.kind === 'emitter' ? selected.id : null}
              onSelect={(id) => setSelected({ kind: 'emitter', id })}
              onMoveStart={(id, lat, lon) => {
                const e = scenario.emitters.find((x) => x.id === id);
                if (e && e.trajectory.start) {
                  updateEmitter(
                    {
                      ...e,
                      trajectory: { ...e.trajectory, start: { ...e.trajectory.start, lat, lon } },
                    },
                    id,
                  );
                }
              }}
              onMoveEnd={(id, lat, lon) => {
                const e = scenario.emitters.find((x) => x.id === id);
                if (e && e.trajectory.end) {
                  updateEmitter(
                    {
                      ...e,
                      trajectory: { ...e.trajectory, end: { ...e.trajectory.end, lat, lon } },
                    },
                    id,
                  );
                }
              }}
              onMoveCircleCenter={(id, lat, lon) => {
                const e = scenario.emitters.find((x) => x.id === id);
                if (e && e.trajectory.center) {
                  updateEmitter(
                    {
                      ...e,
                      trajectory: { ...e.trajectory, center: { ...e.trajectory.center, lat, lon } },
                    },
                    id,
                  );
                }
              }}
            />
            <EWSystemLayer
              systems={scenario.ew_systems}
              selectedId={selected?.kind === 'ew' ? selected.id : null}
              onSelect={(id) => setSelected({ kind: 'ew', id })}
              onMove={(id, lat, lon) => {
                const s = scenario.ew_systems.find((x) => x.id === id);
                if (s) updateEW({ ...s, position: { ...s.position, lat, lon } }, id);
              }}
            />
            <SIGINTSystemLayer
              systems={scenario.sigint_systems}
              selectedId={selected?.kind === 'sigint' ? selected.id : null}
              onSelect={(id) => setSelected({ kind: 'sigint', id })}
              onMove={(id, lat, lon) => {
                const s = scenario.sigint_systems.find((x) => x.id === id);
                if (s) updateSIGINT({ ...s, position: { ...s.position, lat, lon } }, id);
              }}
            />
            <CoverageOverlay kind="jamming" data={jamming.data} />
            <CoverageOverlay kind="sigint" data={sigintCov.data} />
          </MapView>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  current,
  mode,
  onClick,
  children,
}: {
  current: EntityMode;
  mode: EntityMode;
  onClick: (m: EntityMode) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={current === mode ? 'mode-btn mode-btn--active' : 'mode-btn'}
      onClick={() => onClick(mode)}
    >
      {children}
    </button>
  );
}
