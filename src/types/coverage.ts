/**
 * GeoJSON types for RF coverage overlays produced by the synthetic backend.
 *
 * Backend endpoints:
 *  - GET /api/coverage/radar          -> FeatureCollection
 *  - GET /api/coverage/jamming        -> FeatureCollection
 *  - GET /api/coverage/sigint         -> FeatureCollection
 *  - GET /api/coverage/interference   -> FeatureCollection (severity in properties)
 *  - GET /api/coverage/safe-corridors -> FeatureCollection
 *
 * Leaflet's `L.geoJSON()` consumes these directly.
 */

export type CoverageKind = 'radar' | 'jamming' | 'sigint' | 'interference' | 'safe-corridors';

export interface CoverageFeatureProperties {
  entity_id?: string;
  kind?: CoverageKind;
  severity?: 'nominal' | 'degraded' | 'denied';
  [key: string]: unknown;
}

export interface CoverageFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: CoverageFeatureProperties;
}

export interface CoverageFeatureCollection {
  type: 'FeatureCollection';
  features: CoverageFeature[];
}
