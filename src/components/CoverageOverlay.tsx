import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CoverageFeatureCollection, CoverageKind } from '../types/coverage';

const STYLE: Record<CoverageKind, L.PathOptions> = {
  radar: { color: '#2e8b57', fillColor: '#2e8b57', fillOpacity: 0.15, weight: 1 },
  jamming: { color: '#dc143c', fillColor: '#dc143c', fillOpacity: 0.2, weight: 1 },
  sigint: { color: '#daa520', fillColor: '#daa520', fillOpacity: 0.15, weight: 1 },
  interference: { color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.25, weight: 1 },
  'safe-corridors': { color: '#00ced1', fillColor: '#00ced1', fillOpacity: 0.15, weight: 1 },
};

/**
 * Renders a GeoJSON FeatureCollection as a Leaflet layer styled per CoverageKind.
 *
 * Used both for "live coverage preview" in the editor (tasks 6.4 / 6.5) and
 * for the full coverage-visualization feature slated for Phase 2b. Accepts a
 * plain FeatureCollection rather than hard-coded endpoint wiring so parents
 * can swap in data from any source (live hooks, cached, stubbed in tests).
 */
export interface CoverageOverlayProps {
  data?: CoverageFeatureCollection;
  kind: CoverageKind;
}

export function CoverageOverlay({ data, kind }: CoverageOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    // Tear down any previous layer before replacing it; this keeps the map
    // clean when the operator moves an entity and the overlay refetches.
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!data) return;

    const layer = L.geoJSON(data as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        // Interference features carry severity; tint accordingly.
        const sev = (feature?.properties as { severity?: string } | undefined)?.severity;
        if (kind === 'interference' && sev) {
          const severityColors: Record<string, L.PathOptions> = {
            nominal: { color: '#2e8b57', fillColor: '#2e8b57', fillOpacity: 0.2 },
            degraded: { color: '#daa520', fillColor: '#daa520', fillOpacity: 0.25 },
            denied: { color: '#dc143c', fillColor: '#dc143c', fillOpacity: 0.35 },
          };
          return severityColors[sev] ?? STYLE[kind];
        }
        return STYLE[kind];
      },
    }).addTo(map);

    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [data, kind, map]);

  return null;
}
