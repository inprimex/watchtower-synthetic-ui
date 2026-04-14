import type { DashboardNodeSnr } from '../../types/dashboard';

export interface NodeSnrPanelProps {
  nodesSnr: DashboardNodeSnr[];
}

/**
 * Per-node × per-emitter SNR table (task 8.3).
 *
 * Cell background is tinted by SNR value so the operator can spot weak/strong
 * detection at a glance without parsing numbers:
 *   - >= 20 dB: strong (green)
 *   - 10–20 dB: marginal (yellow)
 *   - <  10 dB: weak / likely below detection threshold (red)
 */
export function NodeSnrPanel({ nodesSnr }: NodeSnrPanelProps) {
  const emitterIds = deriveEmitterColumns(nodesSnr);

  if (emitterIds.length === 0) {
    return <div className="snr-panel snr-panel--empty">No emitters — SNR table unavailable</div>;
  }

  return (
    <div className="snr-panel">
      <table className="snr-panel__table">
        <thead>
          <tr>
            <th>Node ↓ / Emitter →</th>
            {emitterIds.map((id) => (
              <th key={id}>{id}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nodesSnr.map((node) => {
            const byEmitter = new Map(node.snr.map((e) => [e.emitter_id, e.snr_db]));
            return (
              <tr key={node.node_id}>
                <td className="snr-panel__node">{node.node_id}</td>
                {emitterIds.map((id) => {
                  const val = byEmitter.get(id);
                  return (
                    <td
                      key={id}
                      className="snr-panel__cell"
                      style={{ background: cellTint(val) }}
                      title={val !== undefined ? `${val} dB` : 'no data'}
                    >
                      {val !== undefined ? val.toFixed(1) : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function deriveEmitterColumns(nodesSnr: DashboardNodeSnr[]): string[] {
  const seen = new Set<string>();
  nodesSnr.forEach((n) => n.snr.forEach((e) => seen.add(e.emitter_id)));
  return Array.from(seen).sort();
}

function cellTint(snr: number | undefined): string {
  if (snr === undefined) return 'transparent';
  if (snr >= 20) return 'rgba(46, 139, 87, 0.25)';
  if (snr >= 10) return 'rgba(218, 165, 32, 0.25)';
  return 'rgba(220, 20, 60, 0.25)';
}
