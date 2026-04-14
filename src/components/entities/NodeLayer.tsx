import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { NodeConfig } from '../../types/scenario';

const nodeIcon = L.divIcon({
  className: 'rf-marker rf-marker--node',
  html: '<div class="rf-marker__dot" style="background:#2e8b57"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export interface NodeLayerProps {
  nodes: NodeConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, lat: number, lon: number) => void;
}

/**
 * Renders radar nodes as draggable markers on the map.
 *
 * Drag-end → onMove(id, lat, lon). The parent editor owns the canonical list
 * of nodes so this component can stay stateless.
 */
export function NodeLayer({ nodes, selectedId, onSelect, onMove }: NodeLayerProps) {
  return (
    <>
      {nodes.map((n) => (
        <Marker
          key={n.id}
          position={[n.lat, n.lon]}
          icon={nodeIcon}
          draggable
          eventHandlers={{
            click: () => onSelect(n.id),
            dragend: (evt) => {
              const { lat, lng } = evt.target.getLatLng();
              onMove(n.id, lat, lng);
            },
          }}
        >
          <Tooltip>
            <strong>{n.id}</strong>
            {selectedId === n.id ? ' ★' : null}
          </Tooltip>
          <Popup>
            <div>
              <strong>{n.id}</strong>
              <br />
              lat: {n.lat.toFixed(5)}, lon: {n.lon.toFixed(5)}
              <br />
              alt: {n.alt_m} m · NF: {n.noise_figure_db} dB
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export interface NodePanelProps {
  node: NodeConfig;
  onChange: (node: NodeConfig) => void;
  onRemove: () => void;
}

export function NodePanel({ node, onChange, onRemove }: NodePanelProps) {
  return (
    <div className="entity-panel">
      <h4>Node: {node.id}</h4>
      <label>
        ID
        <input
          type="text"
          value={node.id}
          onChange={(e) => onChange({ ...node, id: e.target.value })}
        />
      </label>
      <label>
        Latitude
        <input
          type="number"
          step="0.00001"
          value={node.lat}
          onChange={(e) => onChange({ ...node, lat: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Longitude
        <input
          type="number"
          step="0.00001"
          value={node.lon}
          onChange={(e) => onChange({ ...node, lon: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Altitude (m)
        <input
          type="number"
          step="0.1"
          value={node.alt_m}
          onChange={(e) => onChange({ ...node, alt_m: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Noise figure (dB)
        <input
          type="number"
          step="0.1"
          value={node.noise_figure_db}
          onChange={(e) => onChange({ ...node, noise_figure_db: parseFloat(e.target.value) })}
        />
      </label>
      <button onClick={onRemove} className="entity-panel__remove">
        Remove node
      </button>
    </div>
  );
}
