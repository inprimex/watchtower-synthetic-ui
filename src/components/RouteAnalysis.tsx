import { useMemo } from 'react';
import { Polyline, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { CoverageFeatureCollection } from '../types/coverage';

export type RouteSegmentStatus = 'safe' | 'partial' | 'jammed' | 'uncovered';

const STATUS_COLOR: Record<RouteSegmentStatus, string> = {
  safe: '#2e8b57',       // radar-covered AND not jammed
  partial: '#daa520',    // radar-covered but jammed, or unjammed but no radar
  jammed: '#dc143c',     // jammed
  uncovered: '#808080',  // neither — "unmonitored"
};

export interface RoutePoint {
  lat: number;
  lng: number;
}

const waypointIcon = L.divIcon({
  className: 'rf-marker rf-marker--route',
  html: '<div class="rf-marker__dot" style="background:#0077b6;width:10px;height:10px"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export interface RouteAnalysisProps {
  points: RoutePoint[];
  onAppend: (p: RoutePoint) => void;
  radarCoverage?: CoverageFeatureCollection;
  jammingCoverage?: CoverageFeatureCollection;
  enabled: boolean;
}

/**
 * Drone-route analysis (task 7.5).
 *
 * When `enabled`, map clicks append to the route. Segments are drawn colored
 * by coverage/jamming status derived from the supplied GeoJSON — segment
 * midpoints are tested against radar and jamming polygons via turf.js
 * point-in-polygon (cheap, no server roundtrip required for re-coloring
 * while the route is edited).
 *
 * Midpoint-only is a well-known approximation — a long segment can cross
 * coverage boundaries with a midpoint that's nominally "safe." For Phase 2b
 * this matches the spec's segment-by-segment framing and is cheap enough to
 * recompute on every frame. Sub-segment sampling is a future optimization.
 */
export function RouteAnalysis({
  points,
  onAppend,
  radarCoverage,
  jammingCoverage,
  enabled,
}: RouteAnalysisProps) {
  // Attach click handler only when route-drawing is enabled. Unmounting the
  // child component detaches the event listener cleanly.
  const segments = useMemo(
    () => classifySegments(points, radarCoverage, jammingCoverage),
    [points, radarCoverage, jammingCoverage],
  );

  return (
    <>
      {enabled ? <RouteClickHandler onAppend={onAppend} /> : null}
      {points.map((p, idx) => (
        <Marker key={`wp-${idx}`} position={[p.lat, p.lng]} icon={waypointIcon} />
      ))}
      {segments.map((seg, idx) => (
        <Polyline
          key={`seg-${idx}`}
          positions={[
            [seg.from.lat, seg.from.lng],
            [seg.to.lat, seg.to.lng],
          ]}
          pathOptions={{ color: STATUS_COLOR[seg.status], weight: 4, opacity: 0.9 }}
        />
      ))}
    </>
  );
}

function RouteClickHandler({ onAppend }: { onAppend: (p: RoutePoint) => void }) {
  useMapEvents({
    click(evt) {
      onAppend({ lat: evt.latlng.lat, lng: evt.latlng.lng });
    },
  });
  return null;
}

export interface RouteSegment {
  from: RoutePoint;
  to: RoutePoint;
  status: RouteSegmentStatus;
}

export function classifySegments(
  points: RoutePoint[],
  radarCoverage?: CoverageFeatureCollection,
  jammingCoverage?: CoverageFeatureCollection,
): RouteSegment[] {
  const segments: RouteSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
    const inRadar = inAnyFeature(mid, radarCoverage);
    const inJam = inAnyFeature(mid, jammingCoverage);
    let status: RouteSegmentStatus;
    if (inJam && inRadar) status = 'partial';
    else if (inJam) status = 'jammed';
    else if (inRadar) status = 'safe';
    else status = 'uncovered';
    segments.push({ from, to, status });
  }
  return segments;
}

function inAnyFeature(p: RoutePoint, fc: CoverageFeatureCollection | undefined): boolean {
  if (!fc) return false;
  const pt = turfPoint([p.lng, p.lat]);
  return fc.features.some((feat) => {
    try {
      return booleanPointInPolygon(pt, feat as unknown as Feature<Polygon | MultiPolygon>);
    } catch {
      return false;
    }
  });
}
