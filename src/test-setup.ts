import '@testing-library/jest-dom/vitest';

// Leaflet touches globals at import time (e.g. L.Browser probes). jsdom supplies
// enough of the window API for the MapView to mount, but a couple of rAF/rIC
// shims keep react-leaflet's effect hooks happy in the test env.
if (typeof window !== 'undefined') {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  }
}
