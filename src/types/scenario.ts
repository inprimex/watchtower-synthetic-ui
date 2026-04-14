/**
 * TypeScript types mirroring the watchtower-synthetic scenario YAML schema.
 *
 * Source of truth: watchtower-synthetic/core/models.py (Pydantic).
 * Reference: watchtower-specs/openspec/changes/synthetic-ui/design.md section D5.
 *
 * Field names and optionality match the backend Pydantic models exactly so that
 * the same JSON body can be round-tripped through `POST/PUT /api/scenarios`.
 */

export interface Position {
  lat: number;
  lon: number;
  alt_m: number;
}

export type TrajectoryType = 'stationary' | 'linear' | 'circular' | 'waypoints';
export type TrajectoryLoop = 'none' | 'ping_pong';

export interface TrajectoryConfig {
  type: TrajectoryType;
  /** Required for stationary/linear trajectories. */
  start?: Position;
  /** Required for linear trajectories. */
  end?: Position;
  duration_s?: number;
  loop?: TrajectoryLoop;
  /** Required for circular trajectories. */
  center?: Position;
  /** Required for circular trajectories (>0). */
  radius_m?: number;
  /** Required for circular trajectories (>0). */
  speed_mps?: number;
  z_amplitude_m?: number;
  z_period_s?: number;
}

export type SignalType = 'fpv_analog' | 'cw' | 'fm' | 'chirp' | 'fhss_like' | 'file';

export interface EmitterGeneratorConfig {
  backend: 'numpy' | 'torchsig' | 'file';
  path?: string;
  key?: string;
  loop?: boolean;
  normalize?: boolean;
  seed?: number;
}

export interface EmitterMqttConfig {
  signal_class?: string;
  confidence?: number;
}

export interface EmitterConfig {
  id: string;
  /** Free-form string — backend enforces known values like fpv_analog, cw, fm, chirp, fhss_like, file. */
  signal_type: SignalType | string;
  power_dbm: number;
  /** Optional per-emitter center freq; inherits rf.center_freq if omitted. */
  center_freq?: number;
  trajectory: TrajectoryConfig;
  generator?: EmitterGeneratorConfig;
  mqtt?: EmitterMqttConfig;
}

export interface NodeConfig {
  id: string;
  lat: number;
  lon: number;
  alt_m: number;
  noise_figure_db: number;
}

export interface FrequencyRange {
  min_hz: number;
  max_hz: number;
}

export type AntennaPattern = 'omnidirectional' | 'directional';

export interface EWSystemConfig {
  id: string;
  type: 'jammer';
  name: string;
  position: Position;
  frequency_range: FrequencyRange;
  power_dbm: number;
  antenna_gain_dbi: number;
  antenna_pattern: AntennaPattern;
  /** Required when antenna_pattern === 'directional'. */
  azimuth_deg?: number;
  /** Required when antenna_pattern === 'directional' (>0). */
  beamwidth_deg?: number;
  active: boolean;
}

export interface SIGINTSystemConfig {
  id: string;
  type: 'collection';
  name: string;
  position: Position;
  frequency_range: FrequencyRange;
  sensitivity_dbm: number;
  /** Must be > 0. */
  coverage_radius_m: number;
}

export interface RFConfig {
  sample_rate: number;
  center_freq: number;
  bandwidth_hz: number;
  chunk_size: number;
}

export interface GeneratorConfig {
  backend: 'numpy' | 'torchsig';
  seed?: number;
}

export interface ClockConfig {
  mode: 'realtime' | 'free-run' | 'pre-generate';
  buffer_depth_s: number;
}

export interface MqttOutputConfig {
  enabled: boolean;
  broker: string;
  topic_prefix: string;
  detection_interval_ms: number;
  default_signal_class: string;
  default_confidence: number;
  include_noise_detections: boolean;
}

export interface OutputConfig {
  websocket: boolean;
  mqtt: MqttOutputConfig;
}

export interface ScenarioConfig {
  id: string;
  description: string;
  nodes: NodeConfig[];
  emitters: EmitterConfig[];
  ew_systems: EWSystemConfig[];
  sigint_systems: SIGINTSystemConfig[];
  rf: RFConfig;
  generator: GeneratorConfig;
  output: OutputConfig;
  clock: ClockConfig;
  speedup_factor: number;
}

/**
 * Minimal scenario summary returned by the library/list endpoint.
 * The backend `/scenarios` endpoint returns `{available: string[], active: string | null}`;
 * we enrich that client-side via individual `/api/scenarios/{id}` reads.
 */
export interface ScenarioSummary {
  id: string;
  description: string;
  node_count: number;
  emitter_count: number;
  ew_system_count: number;
  sigint_system_count: number;
  signal_types: string[];
}

export interface ScenarioListResponse {
  available: string[];
  active: string | null;
}

// ---------------------------------------------------------------------------
// Sensible defaults — used by the editor when the operator creates a new entity.
// ---------------------------------------------------------------------------

export const DEFAULT_RF: RFConfig = {
  sample_rate: 2_000_000.0,
  center_freq: 5_800_000_000.0,
  bandwidth_hz: 20_000_000.0,
  chunk_size: 1024,
};

export const DEFAULT_GENERATOR: GeneratorConfig = {
  backend: 'numpy',
  seed: 42,
};

export const DEFAULT_CLOCK: ClockConfig = {
  mode: 'realtime',
  buffer_depth_s: 5.0,
};

export const DEFAULT_OUTPUT: OutputConfig = {
  websocket: true,
  mqtt: {
    enabled: false,
    broker: 'mqtt://localhost:1883',
    topic_prefix: 'watchtower/detections',
    detection_interval_ms: 500,
    default_signal_class: 'wifi_24',
    default_confidence: 0.92,
    include_noise_detections: false,
  },
};

export function makeEmptyScenario(id = 'new_environment'): ScenarioConfig {
  return {
    id,
    description: '',
    nodes: [],
    emitters: [],
    ew_systems: [],
    sigint_systems: [],
    rf: { ...DEFAULT_RF },
    generator: { ...DEFAULT_GENERATOR },
    output: { ...DEFAULT_OUTPUT, mqtt: { ...DEFAULT_OUTPUT.mqtt } },
    clock: { ...DEFAULT_CLOCK },
    speedup_factor: 1.0,
  };
}

export function makeNode(id: string, lat: number, lon: number): NodeConfig {
  return { id, lat, lon, alt_m: 10.0, noise_figure_db: 5.0 };
}

export function makeEmitter(
  id: string,
  lat: number,
  lon: number,
  signal_type: SignalType = 'fpv_analog',
): EmitterConfig {
  return {
    id,
    signal_type,
    power_dbm: 20.0,
    trajectory: {
      type: 'stationary',
      start: { lat, lon, alt_m: 100.0 },
      duration_s: 60.0,
      loop: 'none',
    },
  };
}

export function makeEWSystem(id: string, lat: number, lon: number): EWSystemConfig {
  return {
    id,
    type: 'jammer',
    name: id,
    position: { lat, lon, alt_m: 5.0 },
    frequency_range: { min_hz: 800_000_000, max_hz: 2_500_000_000 },
    power_dbm: 40.0,
    antenna_gain_dbi: 12.0,
    antenna_pattern: 'omnidirectional',
    active: true,
  };
}

export function makeSIGINTSystem(id: string, lat: number, lon: number): SIGINTSystemConfig {
  return {
    id,
    type: 'collection',
    name: id,
    position: { lat, lon, alt_m: 15.0 },
    frequency_range: { min_hz: 100_000_000, max_hz: 6_000_000_000 },
    sensitivity_dbm: -110.0,
    coverage_radius_m: 15000.0,
  };
}
