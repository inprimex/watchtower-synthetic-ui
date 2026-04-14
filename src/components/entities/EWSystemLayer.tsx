import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { EWSystemConfig } from '../../types/scenario';

const ewIcon = L.divIcon({
  className: 'rf-marker rf-marker--ew',
  html: '<div class="rf-marker__dot" style="background:#dc143c;border:2px solid #8b0000"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface EWSystemLayerProps {
  systems: EWSystemConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, lat: number, lon: number) => void;
}

export function EWSystemLayer({ systems, selectedId, onSelect, onMove }: EWSystemLayerProps) {
  return (
    <>
      {systems.map((s) => (
        <Marker
          key={s.id}
          position={[s.position.lat, s.position.lon]}
          icon={ewIcon}
          draggable
          eventHandlers={{
            click: () => onSelect(s.id),
            dragend: (evt) => {
              const { lat, lng } = evt.target.getLatLng();
              onMove(s.id, lat, lng);
            },
          }}
        >
          <Tooltip>
            <strong>EW: {s.id}</strong>
            {selectedId === s.id ? ' ★' : null}
          </Tooltip>
          <Popup>
            <strong>{s.name || s.id}</strong> ({s.type})
            <br />
            {s.power_dbm} dBm · {s.antenna_pattern}
            <br />
            {(s.frequency_range.min_hz / 1e6).toFixed(0)}–
            {(s.frequency_range.max_hz / 1e6).toFixed(0)} MHz
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export interface EWSystemPanelProps {
  system: EWSystemConfig;
  onChange: (s: EWSystemConfig) => void;
  onRemove: () => void;
}

export function EWSystemPanel({ system, onChange, onRemove }: EWSystemPanelProps) {
  return (
    <div className="entity-panel">
      <h4>EW system: {system.id}</h4>
      <label>
        ID
        <input
          type="text"
          value={system.id}
          onChange={(e) => onChange({ ...system, id: e.target.value })}
        />
      </label>
      <label>
        Name
        <input
          type="text"
          value={system.name}
          onChange={(e) => onChange({ ...system, name: e.target.value })}
        />
      </label>
      <label>
        Lat
        <input
          type="number"
          step="0.00001"
          value={system.position.lat}
          onChange={(e) =>
            onChange({
              ...system,
              position: { ...system.position, lat: parseFloat(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Lon
        <input
          type="number"
          step="0.00001"
          value={system.position.lon}
          onChange={(e) =>
            onChange({
              ...system,
              position: { ...system.position, lon: parseFloat(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Alt (m)
        <input
          type="number"
          step="0.1"
          value={system.position.alt_m}
          onChange={(e) =>
            onChange({
              ...system,
              position: { ...system.position, alt_m: parseFloat(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Power (dBm)
        <input
          type="number"
          step="0.1"
          value={system.power_dbm}
          onChange={(e) => onChange({ ...system, power_dbm: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Antenna gain (dBi)
        <input
          type="number"
          step="0.1"
          value={system.antenna_gain_dbi}
          onChange={(e) => onChange({ ...system, antenna_gain_dbi: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Min freq (Hz)
        <input
          type="number"
          value={system.frequency_range.min_hz}
          onChange={(e) =>
            onChange({
              ...system,
              frequency_range: { ...system.frequency_range, min_hz: parseFloat(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Max freq (Hz)
        <input
          type="number"
          value={system.frequency_range.max_hz}
          onChange={(e) =>
            onChange({
              ...system,
              frequency_range: { ...system.frequency_range, max_hz: parseFloat(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Antenna pattern
        <select
          value={system.antenna_pattern}
          onChange={(e) => {
            const pattern = e.target.value as 'omnidirectional' | 'directional';
            if (pattern === 'directional') {
              onChange({
                ...system,
                antenna_pattern: pattern,
                azimuth_deg: system.azimuth_deg ?? 0,
                beamwidth_deg: system.beamwidth_deg ?? 60,
              });
            } else {
              const { azimuth_deg: _a, beamwidth_deg: _b, ...rest } = system;
              onChange({ ...rest, antenna_pattern: pattern });
            }
          }}
        >
          <option value="omnidirectional">omnidirectional</option>
          <option value="directional">directional</option>
        </select>
      </label>
      {system.antenna_pattern === 'directional' ? (
        <>
          <label>
            Azimuth (deg)
            <input
              type="number"
              step="1"
              value={system.azimuth_deg ?? 0}
              onChange={(e) => onChange({ ...system, azimuth_deg: parseFloat(e.target.value) })}
            />
          </label>
          <label>
            Beamwidth (deg)
            <input
              type="number"
              step="1"
              value={system.beamwidth_deg ?? 60}
              onChange={(e) => onChange({ ...system, beamwidth_deg: parseFloat(e.target.value) })}
            />
          </label>
        </>
      ) : null}
      <label>
        <input
          type="checkbox"
          checked={system.active}
          onChange={(e) => onChange({ ...system, active: e.target.checked })}
        />
        Active
      </label>
      <button onClick={onRemove} className="entity-panel__remove">
        Remove EW system
      </button>
    </div>
  );
}
