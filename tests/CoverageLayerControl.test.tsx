import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CoverageLayerControl,
  DEFAULT_LAYER_VISIBILITY,
} from '../src/components/CoverageLayerControl';

describe('CoverageLayerControl', () => {
  it('renders a checkbox per coverage kind with correct initial state', () => {
    render(
      <CoverageLayerControl
        visibility={DEFAULT_LAYER_VISIBILITY}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Radar coverage/i)).toBeChecked();
    expect(screen.getByLabelText(/EW jamming/i)).toBeChecked();
    expect(screen.getByLabelText(/SIGINT collection/i)).toBeChecked();
    expect(screen.getByLabelText(/Interference/i)).not.toBeChecked();
    expect(screen.getByLabelText(/Safe corridors/i)).not.toBeChecked();
  });

  it('onChange fires with the mutated visibility map when a toggle flips', () => {
    const onChange = vi.fn();
    render(
      <CoverageLayerControl
        visibility={DEFAULT_LAYER_VISIBILITY}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Interference/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual({
      ...DEFAULT_LAYER_VISIBILITY,
      interference: true,
    });
  });
});
