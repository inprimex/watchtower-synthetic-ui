import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveInjectionPanel } from '../src/components/dashboard/LiveInjectionPanel';

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('LiveInjectionPanel', () => {
  it('disables all add buttons when clockMode is pre-generate', () => {
    renderWithQuery(
      <LiveInjectionPanel
        clockMode="pre-generate"
        emitterIds={['e1']}
        ewIds={['ew1']}
        sigintIds={['s1']}
        center={[48.1, 37.6]}
      />,
    );

    // Banner informs the operator why
    expect(screen.getByText(/Pre-generate clock mode/i)).toBeInTheDocument();

    // Every add button is disabled
    const addButtons = screen.getAllByRole('button', { name: /\+ .+ at map center/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(3);
    addButtons.forEach((btn) => expect(btn).toBeDisabled());

    // Per-entity remove buttons are also disabled
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    removeButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('enables controls when clockMode is realtime and hides the warning banner', () => {
    renderWithQuery(
      <LiveInjectionPanel
        clockMode="realtime"
        emitterIds={[]}
        ewIds={[]}
        sigintIds={[]}
        center={[48.1, 37.6]}
      />,
    );

    expect(screen.queryByText(/Pre-generate clock mode/i)).toBeNull();
    const addButtons = screen.getAllByRole('button', { name: /\+ .+ at map center/i });
    addButtons.forEach((btn) => expect(btn).not.toBeDisabled());
  });
});
