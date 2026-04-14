import { useState } from 'react';
import { EnvironmentLibrary } from './components/EnvironmentLibrary';
import { EnvironmentEditor } from './components/EnvironmentEditor';
import { SimulationDashboard } from './components/SimulationDashboard';
import { useHealth } from './hooks/useScenarioApi';
import { SYNTHETIC_BASE_URL } from './config/backend';
import './styles/app.css';

type View =
  | { kind: 'library' }
  | { kind: 'editor'; scenarioId: string | null }
  | { kind: 'dashboard' };

export function App() {
  const [view, setView] = useState<View>({ kind: 'library' });
  const health = useHealth({ refetchInterval: 10_000 });

  const back = () => setView({ kind: 'library' });

  return (
    <div className="app">
      <header className="app__header">
        <h1>Watchtower · RF Environment Planner</h1>
        <div className="app__backend">
          Backend: <code>{SYNTHETIC_BASE_URL}</code>
          {health.isSuccess ? (
            <span className="app__health app__health--ok">
              · {health.data.status} · v{health.data.version}
              {health.data.scenario ? ` · running ${health.data.scenario}` : ''}
            </span>
          ) : health.isError ? (
            <span className="app__health app__health--err">· unreachable</span>
          ) : (
            <span className="app__health">· …</span>
          )}
        </div>
      </header>

      <main className="app__main">
        {view.kind === 'library' ? (
          <EnvironmentLibrary
            onEdit={(id) => setView({ kind: 'editor', scenarioId: id })}
            onCreate={() => setView({ kind: 'editor', scenarioId: null })}
            onOpenDashboard={() => setView({ kind: 'dashboard' })}
          />
        ) : view.kind === 'editor' ? (
          <EnvironmentEditor scenarioId={view.scenarioId} onBack={back} />
        ) : (
          <SimulationDashboard onBack={back} />
        )}
      </main>
    </div>
  );
}
