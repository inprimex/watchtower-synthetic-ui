import { useEffect, useState } from 'react';

/**
 * Offline tile fallback hook (task 6.1).
 *
 * Probes `public/tiles/0/0/0.png` (standard XYZ layout). When the probe
 * succeeds, the caller should render a `tileLayer` pointing at `/tiles/{z}/{x}/{y}.png`
 * instead of OSM. If the probe fails (no pre-cached tiles, or internet is
 * available), the caller falls back to the online OSM URL.
 *
 * Phase 3 (task 9.1) is responsible for actually populating `public/tiles/`;
 * Phase 2a just wires the detection plumbing so the switch is flip-of-a-bit
 * later.
 */
export type TileMode = 'probing' | 'offline' | 'online';

const PROBE_URL = '/tiles/0/0/0.png';
const ONLINE_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OFFLINE_TILE_URL = '/tiles/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

export interface OfflineTilesResult {
  mode: TileMode;
  tileUrl: string;
  attribution: string;
}

export function useOfflineTiles(): OfflineTilesResult {
  const [mode, setMode] = useState<TileMode>('probing');

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        const res = await fetch(PROBE_URL, { method: 'HEAD' });
        if (!cancelled) setMode(res.ok ? 'offline' : 'online');
      } catch {
        if (!cancelled) setMode('online');
      }
    };

    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    mode,
    tileUrl: mode === 'offline' ? OFFLINE_TILE_URL : ONLINE_TILE_URL,
    attribution: mode === 'offline' ? 'Offline cached tiles' : OSM_ATTRIBUTION,
  };
}
