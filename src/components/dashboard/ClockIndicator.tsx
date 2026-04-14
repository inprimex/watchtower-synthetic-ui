import type { DashboardClockState } from '../../types/dashboard';

export interface ClockIndicatorProps {
  clock: DashboardClockState | null;
  stale?: boolean;
}

/**
 * Displays current sim time, clock mode, and speed ratio (task 8.4).
 *
 * `speed_ratio` is the ratio of sim-time advance to wall-clock — 1.0 = realtime.
 * Pre-generate mode reports instantaneous ratio based on how fast the
 * generator thread is filling the buffer.
 */
export function ClockIndicator({ clock, stale }: ClockIndicatorProps) {
  if (!clock) {
    return <div className="clock-indicator clock-indicator--empty">No clock data</div>;
  }
  const speed = clock.speed_ratio.toFixed(2);
  return (
    <div
      className={stale ? 'clock-indicator clock-indicator--stale' : 'clock-indicator'}
      title={stale ? 'No frames received recently — backend may have stalled' : ''}
    >
      <span className="clock-indicator__time">
        t = {formatSimTime(clock.sim_time_s)}
      </span>
      <span className="clock-indicator__mode">{clock.mode}</span>
      <span className="clock-indicator__speed">
        × {speed}
      </span>
      {stale ? <span className="clock-indicator__stale-flag">· stale</span> : null}
    </div>
  );
}

function formatSimTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  const hhStr = hh.toString().padStart(2, '0');
  const mmStr = mm.toString().padStart(2, '0');
  const ssStr = ss.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');
  return `${hhStr}:${mmStr}:${ssStr}.${msStr}`;
}
