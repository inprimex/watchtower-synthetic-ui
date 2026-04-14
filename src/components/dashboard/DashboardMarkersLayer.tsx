import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type {
  DashboardEWState,
  DashboardEmitter,
  DashboardSIGINTState,
} from '../../types/dashboard';

/**
 * Live-dashboard markers derived from the WS frame (task 8.2).
 *
 * These mirror the editor's static marker shapes but are read-only: the
 * dashboard shows ground-truth emitter positions + backend-authoritative
 * EW/SIGINT states. Edits go through the injection panel instead of
 * drag-to-move on the map.
 */

const emitterIcon = L.divIcon({
  className: 'rf-marker rf-marker--emitter',
  html: '<div class="rf-marker__dot" style="background:#1e90ff"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const ewActiveIcon = L.divIcon({
  className: 'rf-marker rf-marker--ew',
  html: '<div class="rf-marker__dot" style="background:#dc143c;border:2px solid #8b0000"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const ewInactiveIcon = L.divIcon({
  className: 'rf-marker rf-marker--ew rf-marker--inactive',
  html: '<div class="rf-marker__dot" style="background:#999;border:2px solid #666"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const sigintIcon = L.divIcon({
  className: 'rf-marker rf-marker--sigint',
  html: '<div class="rf-marker__dot" style="background:#daa520;border:2px solid #8b7500"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface DashboardMarkersLayerProps {
  emitters: DashboardEmitter[];
  ew: DashboardEWState[];
  sigint: DashboardSIGINTState[];
}

export function DashboardMarkersLayer({ emitters, ew, sigint }: DashboardMarkersLayerProps) {
  return (
    <>
      {emitters.map((e) => (
        <Marker key={`e-${e.id}`} position={[e.lat, e.lon]} icon={emitterIcon}>
          <Tooltip>
            <strong>{e.id}</strong> · {e.signal_type}
            <br />
            {e.lat.toFixed(5)}, {e.lon.toFixed(5)} · {e.alt_m.toFixed(0)} m
          </Tooltip>
        </Marker>
      ))}
      {ew.map((s) => (
        <Marker
          key={`ew-${s.id}`}
          position={[s.lat, s.lon]}
          icon={s.active ? ewActiveIcon : ewInactiveIcon}
        >
          <Tooltip>
            <strong>EW: {s.name || s.id}</strong>
            {s.active ? ' (active)' : ' (inactive)'}
          </Tooltip>
        </Marker>
      ))}
      {sigint.map((s) => (
        <Marker key={`sig-${s.id}`} position={[s.lat, s.lon]} icon={sigintIcon}>
          <Tooltip>
            <strong>SIGINT: {s.name || s.id}</strong>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
