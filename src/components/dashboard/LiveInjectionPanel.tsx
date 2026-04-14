import { useState } from 'react';
import {
  useAddEWSystem,
  useAddEmitter,
  useAddSIGINTSystem,
  useRemoveEWSystem,
  useRemoveEmitter,
  useRemoveSIGINTSystem,
} from '../../hooks/useScenarioApi';
import type { ClockMode } from '../../types/dashboard';
import {
  makeEWSystem,
  makeEmitter,
  makeSIGINTSystem,
} from '../../types/scenario';

const PRE_GENERATE_DISABLED_TIP =
  'Disabled: live injection not supported in pre-generate clock mode. Switch the scenario to realtime or free-run.';

/**
 * Live entity injection controls for a running scenario (tasks 8.5 + 8.6).
 *
 * When `clockMode === 'pre-generate'` the controls are disabled — the backend
 * rejects these calls with HTTP 409 (see environment_api.py `_check_pre_generate`).
 *
 * Adding or removing an **emitter** triggers a StreamManager pipeline restart
 * (design D8 "Path A"). WebSocket clients survive, but node IQ streams gap
 * for ~0.5–1.5 s. We warn the operator before firing the request.
 *
 * Adding/removing EW/SIGINT systems is zero-disruption (no pipeline restart)
 * so no confirmation is shown for those — per design D2/D8.
 */
export interface LiveInjectionPanelProps {
  clockMode: ClockMode | null;
  emitterIds: string[];
  ewIds: string[];
  sigintIds: string[];
  /** Map center — used to seed the position of newly-injected entities. */
  center: [number, number];
}

export function LiveInjectionPanel({
  clockMode,
  emitterIds,
  ewIds,
  sigintIds,
  center,
}: LiveInjectionPanelProps) {
  const isPreGenerate = clockMode === 'pre-generate';
  const disableReason = isPreGenerate ? PRE_GENERATE_DISABLED_TIP : undefined;

  const addEmitter = useAddEmitter();
  const removeEmitter = useRemoveEmitter();
  const addEw = useAddEWSystem();
  const removeEw = useRemoveEWSystem();
  const addSigint = useAddSIGINTSystem();
  const removeSigint = useRemoveSIGINTSystem();

  const [status, setStatus] = useState<string>('');
  const [pendingGap, setPendingGap] = useState<null | { kind: 'add' | 'remove'; id: string }>(null);

  const handleAddEmitter = () => {
    const id = uniqueId('inj-emitter', emitterIds);
    setPendingGap({ kind: 'add', id });
  };

  const confirmEmitterInjection = async () => {
    if (!pendingGap) return;
    const pending = pendingGap;
    setPendingGap(null);
    setStatus(`Injecting emitter ${pending.id}…`);
    try {
      if (pending.kind === 'add') {
        await addEmitter.mutateAsync(makeEmitter(pending.id, center[0], center[1]));
      } else {
        await removeEmitter.mutateAsync(pending.id);
      }
      setStatus(`Done: ${pending.kind} emitter ${pending.id}`);
    } catch (err) {
      setStatus(`Failed: ${String(err)}`);
    }
  };

  const handleRemoveEmitter = (id: string) => {
    setPendingGap({ kind: 'remove', id });
  };

  const handleAddEw = async () => {
    const id = uniqueId('inj-ew', ewIds);
    setStatus(`Injecting EW ${id}…`);
    try {
      await addEw.mutateAsync(makeEWSystem(id, center[0], center[1]));
      setStatus(`Done: added EW ${id}`);
    } catch (err) {
      setStatus(`Failed: ${String(err)}`);
    }
  };

  const handleRemoveEw = async (id: string) => {
    setStatus(`Removing EW ${id}…`);
    try {
      await removeEw.mutateAsync(id);
      setStatus(`Done: removed EW ${id}`);
    } catch (err) {
      setStatus(`Failed: ${String(err)}`);
    }
  };

  const handleAddSigint = async () => {
    const id = uniqueId('inj-sigint', sigintIds);
    setStatus(`Injecting SIGINT ${id}…`);
    try {
      await addSigint.mutateAsync(makeSIGINTSystem(id, center[0], center[1]));
      setStatus(`Done: added SIGINT ${id}`);
    } catch (err) {
      setStatus(`Failed: ${String(err)}`);
    }
  };

  const handleRemoveSigint = async (id: string) => {
    setStatus(`Removing SIGINT ${id}…`);
    try {
      await removeSigint.mutateAsync(id);
      setStatus(`Done: removed SIGINT ${id}`);
    } catch (err) {
      setStatus(`Failed: ${String(err)}`);
    }
  };

  return (
    <div className="live-inject">
      <h4>Live injection</h4>
      {isPreGenerate ? (
        <p className="live-inject__banner">
          <strong>Pre-generate clock mode:</strong> live injection is disabled. Switch to
          realtime or free-run to use these controls.
        </p>
      ) : null}

      <section>
        <div className="live-inject__row">
          <button onClick={handleAddEmitter} disabled={isPreGenerate} title={disableReason}>
            + Emitter at map center
          </button>
        </div>
        <ul className="live-inject__list">
          {emitterIds.map((id) => (
            <li key={id}>
              {id}
              <button
                onClick={() => handleRemoveEmitter(id)}
                disabled={isPreGenerate}
                title={disableReason}
              >
                remove
              </button>
            </li>
          ))}
          {emitterIds.length === 0 ? <li className="live-inject__muted">(no emitters)</li> : null}
        </ul>
      </section>

      <section>
        <div className="live-inject__row">
          <button onClick={handleAddEw} disabled={isPreGenerate} title={disableReason}>
            + EW system at map center
          </button>
        </div>
        <ul className="live-inject__list">
          {ewIds.map((id) => (
            <li key={id}>
              {id}
              <button
                onClick={() => handleRemoveEw(id)}
                disabled={isPreGenerate}
                title={disableReason}
              >
                remove
              </button>
            </li>
          ))}
          {ewIds.length === 0 ? <li className="live-inject__muted">(no EW systems)</li> : null}
        </ul>
      </section>

      <section>
        <div className="live-inject__row">
          <button onClick={handleAddSigint} disabled={isPreGenerate} title={disableReason}>
            + SIGINT at map center
          </button>
        </div>
        <ul className="live-inject__list">
          {sigintIds.map((id) => (
            <li key={id}>
              {id}
              <button
                onClick={() => handleRemoveSigint(id)}
                disabled={isPreGenerate}
                title={disableReason}
              >
                remove
              </button>
            </li>
          ))}
          {sigintIds.length === 0 ? <li className="live-inject__muted">(no SIGINT)</li> : null}
        </ul>
      </section>

      {pendingGap ? (
        <div className="live-inject__gap-warning" role="alertdialog">
          <p>
            <strong>Warning:</strong> {pendingGap.kind === 'add' ? 'Adding' : 'Removing'} emitter{' '}
            <code>{pendingGap.id}</code> will restart the synthetic IQ pipeline.
          </p>
          <p>
            WebSocket clients stay connected, but node IQ streams will gap for roughly 0.5–1.5
            seconds during the restart.
          </p>
          <div className="live-inject__gap-actions">
            <button onClick={confirmEmitterInjection}>Proceed</button>
            <button onClick={() => setPendingGap(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      <p className="live-inject__status">{status}</p>
    </div>
  );
}

function uniqueId(prefix: string, existing: string[]): string {
  const set = new Set(existing);
  for (let i = 1; i < 1000; i += 1) {
    const candidate = `${prefix}-${i}`;
    if (!set.has(candidate)) return candidate;
  }
  return `${prefix}-${Date.now()}`;
}
