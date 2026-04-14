import type { CoverageKind } from '../types/coverage';

/**
 * Visibility map for coverage overlays. Independent toggles per task 7.2.
 * `CoverageLayerControl` owns the checkbox UI; the parent supplies the
 * current state + a mutation callback so it can pipe the toggles into the
 * corresponding `useCoverage(kind, enabled)` calls.
 */
export type CoverageLayerVisibility = Record<CoverageKind, boolean>;

export const DEFAULT_LAYER_VISIBILITY: CoverageLayerVisibility = {
  radar: true,
  jamming: true,
  sigint: true,
  interference: false,
  'safe-corridors': false,
};

const LAYER_META: Record<CoverageKind, { label: string; swatch: string }> = {
  radar: { label: 'Radar coverage', swatch: '#2e8b57' },
  jamming: { label: 'EW jamming', swatch: '#dc143c' },
  sigint: { label: 'SIGINT collection', swatch: '#daa520' },
  interference: { label: 'Interference (severity)', swatch: '#ff4500' },
  'safe-corridors': { label: 'Safe corridors', swatch: '#00ced1' },
};

const ORDER: CoverageKind[] = ['radar', 'jamming', 'sigint', 'interference', 'safe-corridors'];

export interface CoverageLayerControlProps {
  visibility: CoverageLayerVisibility;
  onChange: (next: CoverageLayerVisibility) => void;
}

export function CoverageLayerControl({ visibility, onChange }: CoverageLayerControlProps) {
  return (
    <fieldset className="layer-control">
      <legend>Coverage layers</legend>
      {ORDER.map((kind) => {
        const { label, swatch } = LAYER_META[kind];
        return (
          <label key={kind} className="layer-control__row">
            <input
              type="checkbox"
              checked={visibility[kind]}
              onChange={(e) => onChange({ ...visibility, [kind]: e.target.checked })}
            />
            <span className="layer-control__swatch" style={{ background: swatch }} />
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}
