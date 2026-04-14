import { Circle, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { SIGINTSystemConfig } from '../../types/scenario';

const sigintIcon = L.divIcon({
  className: 'rf-marker rf-marker--sigint',
  html: '<div class="rf-marker__dot" style="background:#daa520;border:2px solid #8b7500"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface SIGINTSystemLayerProps {
  systems: SIGINTSystemConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, lat: number, lon: number) => void;
  /** Show the nominal coverage radius as a preview circle on the map. */
  showCoveragePreview?: boolean;
}

/**
 * SIGINT systems can optionally render their nominal coverage radius as a
 * translucent circle for quick visual feedback. The authoritative coverage
 * overlay (with sensitivity/path-loss logic) comes from `/api/coverage/sigint`
 * — this is just an at-a-glance sanity check while the operator configures.
 */
export function SIGINTSystemLayer({
  systems,
  selectedId,
  onSelect,
  onMove,
  showCoveragePreview = true,
}: SIGINTSystemLayerProps) {
  return (
    <>
      {systems.map((s) => (
        <>
          {showCoveragePreview ? (
            <Circle
              key={`${s.id}-preview`}
              center={[s.position.lat, s.position.lon]}
              radius={s.coverage_radius_m}
              pathOptions={{
                color: '#daa520',
                fillColor: '#daa520',
                fillOpacity: 0.08,
                weight: 1,
                dashArray: '4 4',
              }}
            />
          ) : null}
          <Marker
            key={s.id}
            position={[s.position.lat, s.position.lon]}
            icon={sigintIcon}
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
              <strong>SIGINT: {s.id}</strong>
              {selectedId === s.id ? ' ★' : null}
            </Tooltip>
            <Popup>
              <strong>{s.name || s.id}</strong>
              <br />
              sens: {s.sensitivity_dbm} dBm · r={s.coverage_radius_m} m
            </Popup>
          </Marker>
        </>
      ))}
    </>
  );
}

export interface SIGINTSystemPanelProps {
  system: SIGINTSystemConfig;
  onChange: (s: SIGINTSystemConfig) => void;
  onRemove: () => void;
}

export function SIGINTSystemPanel({ system, onChange, onRemove }: SIGINTSystemPanelProps) {
  return (
    <div className="entity-panel">
      <h4>SIGINT: {system.id}</h4>
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
        Sensitivity (dBm)
        <input
          type="number"
          step="0.1"
          value={system.sensitivity_dbm}
          onChange={(e) => onChange({ ...system, sensitivity_dbm: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Coverage radius (m)
        <input
          type="number"
          step="100"
          min="1"
          value={system.coverage_radius_m}
          onChange={(e) => onChange({ ...system, coverage_radius_m: parseFloat(e.target.value) })}
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
      <button onClick={onRemove} className="entity-panel__remove">
        Remove SIGINT system
      </button>
    </div>
  );
}
