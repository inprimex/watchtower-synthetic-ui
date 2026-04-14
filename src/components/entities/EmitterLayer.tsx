import { Circle, Marker, Polyline, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { EmitterConfig, Position, TrajectoryType } from '../../types/scenario';

const emitterIcon = L.divIcon({
  className: 'rf-marker rf-marker--emitter',
  html: '<div class="rf-marker__dot" style="background:#1e90ff"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const waypointIcon = L.divIcon({
  className: 'rf-marker rf-marker--waypoint',
  html: '<div class="rf-marker__dot" style="background:#87ceeb;width:8px;height:8px"></div>',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

export interface EmitterLayerProps {
  emitters: EmitterConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** For stationary trajectories: drag the main marker updates `trajectory.start`. */
  onMoveStart: (id: string, lat: number, lon: number) => void;
  /** For linear trajectories, drag the end marker updates `trajectory.end`. */
  onMoveEnd: (id: string, lat: number, lon: number) => void;
  /** For circular trajectories, drag the center marker updates `trajectory.center`. */
  onMoveCircleCenter: (id: string, lat: number, lon: number) => void;
}

/**
 * Renders emitters + trajectory visualization per design D5:
 *   - stationary:  single draggable marker at trajectory.start
 *   - linear:      start + end markers, connected by a polyline
 *   - circular:    center marker + circle with radius_m
 *
 * Each handle writes back through the appropriate callback — parent keeps
 * canonical trajectory config.
 */
export function EmitterLayer({
  emitters,
  selectedId,
  onSelect,
  onMoveStart,
  onMoveEnd,
  onMoveCircleCenter,
}: EmitterLayerProps) {
  return (
    <>
      {emitters.map((e) => {
        const traj = e.trajectory;
        const selected = selectedId === e.id;
        switch (traj.type) {
          case 'stationary':
          case 'linear':
          case 'waypoints': {
            const start = traj.start;
            const end = traj.type === 'linear' ? traj.end : undefined;
            if (!start) return null;
            return (
              <LinearEmitter
                key={e.id}
                emitterId={e.id}
                signalType={e.signal_type}
                start={start}
                end={end}
                selected={selected}
                onSelect={onSelect}
                onMoveStart={onMoveStart}
                onMoveEnd={onMoveEnd}
              />
            );
          }
          case 'circular': {
            if (!traj.center || !traj.radius_m) return null;
            return (
              <CircularEmitter
                key={e.id}
                emitterId={e.id}
                signalType={e.signal_type}
                center={traj.center}
                radius_m={traj.radius_m}
                selected={selected}
                onSelect={onSelect}
                onMoveCenter={onMoveCircleCenter}
              />
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}

function LinearEmitter({
  emitterId,
  signalType,
  start,
  end,
  selected,
  onSelect,
  onMoveStart,
  onMoveEnd,
}: {
  emitterId: string;
  signalType: string;
  start: Position;
  end?: Position;
  selected: boolean;
  onSelect: (id: string) => void;
  onMoveStart: (id: string, lat: number, lon: number) => void;
  onMoveEnd: (id: string, lat: number, lon: number) => void;
}) {
  return (
    <>
      <Marker
        position={[start.lat, start.lon]}
        icon={emitterIcon}
        draggable
        eventHandlers={{
          click: () => onSelect(emitterId),
          dragend: (evt) => {
            const { lat, lng } = evt.target.getLatLng();
            onMoveStart(emitterId, lat, lng);
          },
        }}
      >
        <Tooltip>
          <strong>{emitterId}</strong> ({signalType}){selected ? ' ★' : ''}
        </Tooltip>
        <Popup>
          <strong>{emitterId}</strong> · {signalType}
          <br />
          lat: {start.lat.toFixed(5)}, lon: {start.lon.toFixed(5)}
        </Popup>
      </Marker>
      {end ? (
        <>
          <Polyline
            positions={[
              [start.lat, start.lon],
              [end.lat, end.lon],
            ]}
            pathOptions={{ color: '#1e90ff', dashArray: '6 4' }}
          />
          <Marker
            position={[end.lat, end.lon]}
            icon={waypointIcon}
            draggable
            eventHandlers={{
              click: () => onSelect(emitterId),
              dragend: (evt) => {
                const { lat, lng } = evt.target.getLatLng();
                onMoveEnd(emitterId, lat, lng);
              },
            }}
          >
            <Tooltip>{emitterId} end</Tooltip>
          </Marker>
        </>
      ) : null}
    </>
  );
}

function CircularEmitter({
  emitterId,
  signalType,
  center,
  radius_m,
  selected,
  onSelect,
  onMoveCenter,
}: {
  emitterId: string;
  signalType: string;
  center: Position;
  radius_m: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onMoveCenter: (id: string, lat: number, lon: number) => void;
}) {
  return (
    <>
      <Circle
        center={[center.lat, center.lon]}
        radius={radius_m}
        pathOptions={{ color: '#1e90ff', fillOpacity: 0.05 }}
      />
      <Marker
        position={[center.lat, center.lon]}
        icon={emitterIcon}
        draggable
        eventHandlers={{
          click: () => onSelect(emitterId),
          dragend: (evt) => {
            const { lat, lng } = evt.target.getLatLng();
            onMoveCenter(emitterId, lat, lng);
          },
        }}
      >
        <Tooltip>
          <strong>{emitterId}</strong> ({signalType}, circular){selected ? ' ★' : ''}
        </Tooltip>
        <Popup>
          <strong>{emitterId}</strong> · {signalType}
          <br />
          center: {center.lat.toFixed(5)}, {center.lon.toFixed(5)}
          <br />
          radius: {radius_m} m
        </Popup>
      </Marker>
    </>
  );
}

// ---------------------------------------------------------------------------
// Trajectory editor — side panel
// ---------------------------------------------------------------------------

export interface EmitterPanelProps {
  emitter: EmitterConfig;
  onChange: (e: EmitterConfig) => void;
  onRemove: () => void;
}

const SIGNAL_TYPES: string[] = ['fpv_analog', 'cw', 'fm', 'chirp', 'fhss_like', 'file'];

export function EmitterPanel({ emitter, onChange, onRemove }: EmitterPanelProps) {
  const traj = emitter.trajectory;

  const setTrajectoryType = (type: TrajectoryType) => {
    // When the operator changes trajectory type, keep whatever start we have
    // and seed the extra fields with sensible defaults so validation passes
    // without the user touching every input.
    const start = traj.start ?? { lat: 48.1, lon: 37.6, alt_m: 100 };
    switch (type) {
      case 'stationary':
        onChange({ ...emitter, trajectory: { type, start } });
        break;
      case 'linear':
        onChange({
          ...emitter,
          trajectory: {
            type,
            start,
            end: traj.end ?? { lat: start.lat + 0.01, lon: start.lon + 0.01, alt_m: start.alt_m },
            duration_s: traj.duration_s ?? 60,
            loop: traj.loop ?? 'none',
          },
        });
        break;
      case 'circular':
        onChange({
          ...emitter,
          trajectory: {
            type,
            center: traj.center ?? start,
            radius_m: traj.radius_m ?? 500,
            speed_mps: traj.speed_mps ?? 30,
          },
        });
        break;
      case 'waypoints':
        onChange({ ...emitter, trajectory: { type, start } });
        break;
    }
  };

  return (
    <div className="entity-panel">
      <h4>Emitter: {emitter.id}</h4>
      <label>
        ID
        <input
          type="text"
          value={emitter.id}
          onChange={(e) => onChange({ ...emitter, id: e.target.value })}
        />
      </label>
      <label>
        Signal type
        <select
          value={emitter.signal_type}
          onChange={(e) => onChange({ ...emitter, signal_type: e.target.value })}
        >
          {SIGNAL_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Power (dBm)
        <input
          type="number"
          step="0.1"
          value={emitter.power_dbm}
          onChange={(e) => onChange({ ...emitter, power_dbm: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Trajectory type
        <select
          value={traj.type}
          onChange={(e) => setTrajectoryType(e.target.value as TrajectoryType)}
        >
          <option value="stationary">stationary</option>
          <option value="linear">linear</option>
          <option value="circular">circular</option>
        </select>
      </label>

      {(traj.type === 'stationary' || traj.type === 'linear') && traj.start ? (
        <fieldset>
          <legend>Start</legend>
          <PositionInputs
            value={traj.start}
            onChange={(start) => onChange({ ...emitter, trajectory: { ...traj, start } })}
          />
        </fieldset>
      ) : null}

      {traj.type === 'linear' && traj.end ? (
        <fieldset>
          <legend>End</legend>
          <PositionInputs
            value={traj.end}
            onChange={(end) => onChange({ ...emitter, trajectory: { ...traj, end } })}
          />
          <label>
            Duration (s)
            <input
              type="number"
              step="1"
              value={traj.duration_s ?? 60}
              onChange={(e) =>
                onChange({
                  ...emitter,
                  trajectory: { ...traj, duration_s: parseFloat(e.target.value) },
                })
              }
            />
          </label>
        </fieldset>
      ) : null}

      {traj.type === 'circular' && traj.center ? (
        <fieldset>
          <legend>Circle</legend>
          <PositionInputs
            value={traj.center}
            onChange={(center) => onChange({ ...emitter, trajectory: { ...traj, center } })}
          />
          <label>
            Radius (m)
            <input
              type="number"
              step="1"
              value={traj.radius_m ?? 500}
              onChange={(e) =>
                onChange({
                  ...emitter,
                  trajectory: { ...traj, radius_m: parseFloat(e.target.value) },
                })
              }
            />
          </label>
          <label>
            Speed (m/s)
            <input
              type="number"
              step="0.1"
              value={traj.speed_mps ?? 30}
              onChange={(e) =>
                onChange({
                  ...emitter,
                  trajectory: { ...traj, speed_mps: parseFloat(e.target.value) },
                })
              }
            />
          </label>
        </fieldset>
      ) : null}

      <button onClick={onRemove} className="entity-panel__remove">
        Remove emitter
      </button>
    </div>
  );
}

function PositionInputs({
  value,
  onChange,
}: {
  value: Position;
  onChange: (p: Position) => void;
}) {
  return (
    <>
      <label>
        Lat
        <input
          type="number"
          step="0.00001"
          value={value.lat}
          onChange={(e) => onChange({ ...value, lat: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Lon
        <input
          type="number"
          step="0.00001"
          value={value.lon}
          onChange={(e) => onChange({ ...value, lon: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Alt (m)
        <input
          type="number"
          step="0.1"
          value={value.alt_m}
          onChange={(e) => onChange({ ...value, alt_m: parseFloat(e.target.value) })}
        />
      </label>
    </>
  );
}
