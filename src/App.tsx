export function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Watchtower — RF Environment Planner</h1>
      <p>Scaffold ready. Waiting for Phase 2a implementation.</p>
      <p>
        Backend: <code>{import.meta.env.VITE_SYNTHETIC_BASE_URL || 'not configured'}</code>
      </p>
    </div>
  );
}
