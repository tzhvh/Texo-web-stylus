import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import RowNavigator from './RowNavigator.jsx';

// Mock react-swipeable
vi.mock('react-swipeable', () => ({
  useSwipeable: (config) => {
    // Store config for testing
    global.swipeableConfig = config;
    return {}; // Return empty object for spread operator
  }
}));

/**
 * Unit Tests for RowNavigator Component - Story 1.9
 *
 * Tests keyboard navigation, gesture handling, and boundary conditions
 * as specified in acceptance criteria.
 */
describe('RowNavigator', () => {
  let mockRowManager;
  let mockOnRowChange;

  beforeEach(() => {
    // Create mock RowManager
    mockRowManager = {
      getActiveRow: vi.fn(),
      getAllRows: vi.fn(),
      setActiveRow: vi.fn()
    };

    // Create mock callback
    mockOnRowChange = vi.fn();

    // Reset DOM event listeners
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // AC #1, #2: Arrow keys navigate to previous row
  it('navigates to previous row when Up arrow is pressed', () => {
    const mockRows = [
      { id: 'row-0' },
      { id: 'row-1' },
      { id: 'row-2' }
    ];

    mockRowManager.getActiveRow.mockReturnValue({ id: 'row-1' });
    mockRowManager.getAllRows.mockReturnValue(mockRows);

    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Simulate Up arrow key press
    fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp' });

    // Should call setActiveRow with previous row
    expect(mockRowManager.setActiveRow).toHaveBeenCalledWith('row-0');
    expect(mockOnRowChange).toHaveBeenCalledWith('row-0');
  });

  // AC #1, #3: Arrow keys navigate to next row
  it('navigates to next row when Down arrow is pressed', () => {
    const mockRows = [
      { id: 'row-0' },
      { id: 'row-1' },
      { id: 'row-2' }
    ];

    mockRowManager.getActiveRow.mockReturnValue({ id: 'row-1' });
    mockRowManager.getAllRows.mockReturnValue(mockRows);

    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Simulate Down arrow key press
    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });

    // Should call setActiveRow with next row
    expect(mockRowManager.setActiveRow).toHaveBeenCalledWith('row-2');
    expect(mockOnRowChange).toHaveBeenCalledWith('row-2');
  });

  // AC #4: Up on row 0 does nothing
  it('does not navigate when Up is pressed on first row', () => {
    const mockRows = [
      { id: 'row-0' },
      { id: 'row-1' },
      { id: 'row-2' }
    ];

    mockRowManager.getActiveRow.mockReturnValue({ id: 'row-0' });
    mockRowManager.getAllRows.mockReturnValue(mockRows);

    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Simulate Up arrow key press on first row
    fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp' });

    // Should NOT call setActiveRow
    expect(mockRowManager.setActiveRow).not.toHaveBeenCalled();
    expect(mockOnRowChange).not.toHaveBeenCalled();
  });

  // AC #5: Down on last row logs Story 1.10 integration message
  it('logs Story 1.10 integration point when Down is pressed on last row', () => {
    const mockRows = [
      { id: 'row-0' },
      { id: 'row-1' },
      { id: 'row-2' }
    ];

    mockRowManager.getActiveRow.mockReturnValue({ id: 'row-2' });
    mockRowManager.getAllRows.mockReturnValue(mockRows);

    const consoleLogSpy = vi.spyOn(console, 'log');

    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Simulate Down arrow key press on last row
    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });

    // Should NOT call setActiveRow
    expect(mockRowManager.setActiveRow).not.toHaveBeenCalled();

    // Should log integration message
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Down on last row - Story 1.10 integration point'
    );

    consoleLogSpy.mockRestore();
  });

  // AC #10: Swipe gesture configuration has 50px threshold
  it('configures swipeable with 50px threshold', () => {
    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Check swipeable configuration
    expect(global.swipeableConfig).toBeDefined();
    expect(global.swipeableConfig.delta).toBe(50);
    expect(global.swipeableConfig.trackMouse).toBe(false);
    expect(global.swipeableConfig.trackTouch).toBe(true);
  });

  // Gesture handling: Swipe up navigates to next row
  it('handles swipe up gesture to navigate to next row', () => {
    const mockRows = [
      { id: 'row-0' },
      { id: 'row-1' },
      { id: 'row-2' }
    ];

    mockRowManager.getActiveRow.mockReturnValue({ id: 'row-1' });
    mockRowManager.getAllRows.mockReturnValue(mockRows);

    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Simulate swipe up (should navigate to next row)
    if (global.swipeableConfig && global.swipeableConfig.onSwipedUp) {
      global.swipeableConfig.onSwipedUp();
    }

    expect(mockRowManager.setActiveRow).toHaveBeenCalledWith('row-2');
    expect(mockOnRowChange).toHaveBeenCalledWith('row-2');
  });

  // Gesture handling: Swipe down navigates to previous row
  it('handles swipe down gesture to navigate to previous row', () => {
    const mockRows = [
      { id: 'row-0' },
      { id: 'row-1' },
      { id: 'row-2' }
    ];

    mockRowManager.getActiveRow.mockReturnValue({ id: 'row-1' });
    mockRowManager.getAllRows.mockReturnValue(mockRows);

    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    // Simulate swipe down (should navigate to previous row)
    if (global.swipeableConfig && global.swipeableConfig.onSwipedDown) {
      global.swipeableConfig.onSwipedDown();
    }

    expect(mockRowManager.setActiveRow).toHaveBeenCalledWith('row-0');
    expect(mockOnRowChange).toHaveBeenCalledWith('row-0');
  });

  // Component renders children correctly
  it('renders children correctly', () => {
    render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div data-testid="test-child">Test content</div>
      </RowNavigator>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  // Cleanup: Removes event listeners on unmount
  it('removes keyboard event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <RowNavigator rowManager={mockRowManager} onRowChange={mockOnRowChange}>
        <div>Test content</div>
      </RowNavigator>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
