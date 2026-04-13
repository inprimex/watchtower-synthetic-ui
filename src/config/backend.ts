export const SYNTHETIC_BASE_URL = import.meta.env.VITE_SYNTHETIC_BASE_URL || 'http://localhost:8100';
export const SYNTHETIC_WS_URL = SYNTHETIC_BASE_URL.replace(/^http/, 'ws');
