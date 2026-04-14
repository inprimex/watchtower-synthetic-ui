import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';
import { useOfflineTiles } from '../hooks/useOfflineTiles';

// react-leaflet v4 does not bundle marker icon assets; the default markers
// 404 in Vite unless we inject the CDN URLs. This is well-known boilerplate.
//
// (If we later go fully offline we'll swap these for local asset imports.)
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Default center — Donbas sector (approx. Bakhmut area). Matches the YAML
 * examples in design.md D5. Overridable via the `center` prop.
 */
export const DEFAULT_CENTER: LatLngExpression = [48.1, 37.6];
export const DEFAULT_ZOOM = 12;

export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapClick,
  children,
  className = 'map-view',
}: MapViewProps) {
  const { tileUrl, attribution } = useOfflineTiles();

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        {onMapClick ? <MapClickHandler onMapClick={onMapClick} /> : null}
        {children}
      </MapContainer>
    </div>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(evt: LeafletMouseEvent) {
      onMapClick({ lat: evt.latlng.lat, lng: evt.latlng.lng });
    },
  });
  return null;
}

/**
 * Helper component — imperatively re-centers the map when `center` changes.
 * Useful when the user selects an entity in a side panel.
 */
export function RecenterControl({ center, zoom }: { center?: LatLngExpression; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}
