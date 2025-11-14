/**
 * Integration Tests for RowHeader Overlay System
 * Tests canvas overlay positioning, zoom scaling, and tap detection
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import RowHeader, { MemoizedRowHeader } from '../RowHeader.jsx';

// Mock row data for testing
const createMockRow = (overrides = {}) => ({
  id: 'row-0',
  yStart: 0,
  yEnd: 384,
  elementIds: new Set(['element-1', 'element-2']),
  ocrStatus: 'pending',
  validationStatus: 'pending',
  transcribedLatex: null,
  validationResult: null,
  lastModified: new Date(),
  tileHash: null,
  errorMessage: null,
  ...overrides
});

describe('RowHeader Integration Tests', () => {
  const defaultProps = {
    row: createMockRow(),
    y: 0,
    canvasWidth: 1200,
    debugMode: false
  };

  beforeEach(() => {
    // Clear any window handlers
    delete window.rowHeaderTapHandler;
  });

  describe('Canvas Overlay Positioning (AC: 2, 6)', () => {
    it('should position icons correctly at different canvas widths', () => {
      const testCases = [
        { canvasWidth: 800, expectedX: 740 },
        { canvasWidth: 1200, expectedX: 1140 },
        { canvasWidth: 1600, expectedX: 1540 },
        { canvasWidth: 2000, expectedX: 1940 }
      ];

      testCases.forEach(({ canvasWidth, expectedX }) => {
        const { unmount } = render(
          <RowHeader {...defaultProps} canvasWidth={canvasWidth} />
        );
        
        const icon = screen.getByRole('button');
        const style = window.getComputedStyle(icon);
        
        expect(icon.style.left).toBe(`${expectedX}px`);
        expect(icon.style.top).toBe('192px'); // Default row center
        
        unmount();
      });
    });

    it('should maintain positioning during zoom scenarios', () => {
      // Test that positioning is independent of zoom
      // (zoom is handled by parent container, not RowHeader)
      const row = createMockRow({ yStart: 200, yEnd: 584 }); // Center at 392
      
      render(<RowHeader {...defaultProps} row={row} y={200} />);
      
      const icon = screen.getByRole('button');
      
      // Position should be absolute in canvas coordinates
      expect(icon.style.left).toBe('1140px');
      expect(icon.style.top).toBe('392px');
      expect(icon).toHaveClass('absolute');
    });

    it('should render on separate z-index layer', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon.style.zIndex).toBe('1000');
    });

    it('should not interfere with drawing elements', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      
      // Should have pointer events enabled for tap detection
      expect(icon.style.pointerEvents).toBe('auto');
      
      // Should be positioned absolutely to not affect document flow
      expect(icon).toHaveClass('absolute');
    });
  });

  describe('Zoom Scaling Behavior (AC: 7)', () => {
    it('should maintain icon size during zoom', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      
      // Icon size should be fixed at 48x48px regardless of zoom
      expect(icon.style.width).toBe('48px');
      expect(icon.style.height).toBe('48px');
    });

    it('should scale with canvas zoom level', () => {
      // This test verifies that icons use canvas coordinates
      // which naturally scale with parent container zoom
      const row = createMockRow({ yStart: 100, yEnd: 484 });
      
      render(<RowHeader {...defaultProps} row={row} y={100} />);
      
      const icon = screen.getByRole('button');
      
      // Position should be in canvas coordinates
      expect(icon.style.left).toBe('1140px');
      expect(icon.style.top).toBe('292px');
      
      // Transform should only center the icon, not scale it
      expect(icon.style.transform).toBe('translate(-50%, -50%)');
    });
  });

  describe('Layer Separation (AC: 6)', () => {
    it('should render above guide lines but below UI elements', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      
      // Should be on high z-index for visibility
      expect(parseInt(icon.style.zIndex)).toBeGreaterThanOrEqual(1000);
    });

    it('should not affect document flow', () => {
      const { container } = render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      
      // Should be absolutely positioned
      expect(icon).toHaveClass('absolute');
      
      // Should not affect container layout
      expect(container.firstChild).toBe(icon);
    });
  });

  describe('Tap Target Responsiveness (AC: 8)', () => {
    it('should have 44x44px minimum tap target', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      
      // Icon is 48x48px which exceeds 44x44px WCAG minimum
      expect(icon.style.width).toBe('48px');
      expect(icon.style.height).toBe('48px');
    });

    it('should respond to click events', () => {
      const mockHandler = vi.fn();
      window.rowHeaderTapHandler = mockHandler;
      
      const row = createMockRow({ id: 'test-tap-row' });
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByRole('button');
      fireEvent.click(icon);
      
      expect(mockHandler).toHaveBeenCalledWith(row);
    });

    it('should prevent event bubbling to canvas', () => {
      const mockCanvasHandler = vi.fn();
      
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      // Mock stopPropagation
      const stopPropagationSpy = vi.fn();
      clickEvent.stopPropagation = stopPropagationSpy;
      
      fireEvent(icon, clickEvent);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should store tap handler for Story 4.1 integration', () => {
      // Test that component checks for global handler
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const row = createMockRow({ id: 'integration-test' });
      render(<RowHeader {...defaultProps} row={row} debugMode={true} />);
      
      const icon = screen.getByRole('button');
      fireEvent.click(icon);
      
      // Should not throw error when checking for handler
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Cannot read property'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Animation', () => {
    it('should apply fade-in animation class', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('row-status-icon');
    });

    it('should apply hover effects', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('hover:scale-110');
    });

    it('should have smooth transitions', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('transition-opacity', 'duration-200');
    });

    it('should apply spinning animation for processing status', () => {
      const row = createMockRow({ ocrStatus: 'processing' });
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Multiple Row Headers', () => {
    it('should render multiple headers without conflicts', () => {
      const rows = [
        createMockRow({ id: 'row-0', yStart: 0, yEnd: 384 }),
        createMockRow({ id: 'row-1', yStart: 384, yEnd: 768 }),
        createMockRow({ id: 'row-2', yStart: 768, yEnd: 1152 })
      ];

      const { unmount } = render(
        <div>
          {rows.map(row => (
            <RowHeader 
              key={row.id}
              {...defaultProps} 
              row={row} 
              y={row.yStart}
            />
          ))}
        </div>
      );

      // All icons should be present
      expect(screen.getAllByRole('button')).toHaveLength(3);
      
      // Each should have correct positioning
      const icons = screen.getAllByRole('button');
      expect(icons[0].style.top).toBe('192px'); // Row 0 center
      expect(icons[1].style.top).toBe('576px'); // Row 1 center
      expect(icons[2].style.top).toBe('960px'); // Row 2 center
      
      unmount();
    });

    it('should handle different status combinations', () => {
      const rows = [
        createMockRow({ id: 'pending', ocrStatus: 'pending' }),
        createMockRow({ id: 'processing', ocrStatus: 'processing' }),
        createMockRow({ id: 'validated', ocrStatus: 'completed', validationStatus: 'validated' }),
        createMockRow({ id: 'error', ocrStatus: 'error' })
      ];

      render(
        <div>
          {rows.map(row => (
            <RowHeader 
              key={row.id}
              {...defaultProps} 
              row={row} 
            />
          ))}
        </div>
      );

      const icons = screen.getAllByRole('button');
      
      // Each should have appropriate status styling
      expect(icons[0]).toHaveClass('text-gray-400', 'bg-gray-100');
      expect(icons[1]).toHaveClass('text-orange-500', 'bg-orange-100', 'animate-spin');
      expect(icons[2]).toHaveClass('text-green-500', 'bg-green-100');
      expect(icons[3]).toHaveClass('text-red-500', 'bg-red-100');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large canvas widths', () => {
      render(<RowHeader {...defaultProps} canvasWidth={10000} />);
      
      const icon = screen.getByRole('button');
      expect(icon.style.left).toBe('9940px'); // 10000 - 60
    });

    it('should handle small canvas widths', () => {
      render(<RowHeader {...defaultProps} canvasWidth={100} />);
      
      const icon = screen.getByRole('button');
      expect(icon.style.left).toBe('40px'); // 100 - 60
    });

    it('should handle negative y coordinates', () => {
      const row = createMockRow({ yStart: -500, yEnd: -116 });
      render(<RowHeader {...defaultProps} row={row} y={-500} />);
      
      const icon = screen.getByRole('button');
      // Center: -500 + (-116 - (-500)) / 2 = -500 + (-116 + 500) / 2 = -500 + 192 = -308
      expect(icon.style.top).toBe('-308px');
    });

    it('should handle very tall rows', () => {
      const row = createMockRow({ yStart: 0, yEnd: 1000 });
      render(<RowHeader {...defaultProps} row={row} y={0} />);
      
      const icon = screen.getByRole('button');
      // Center: 0 + (1000 - 0) / 2 = 500
      expect(icon.style.top).toBe('500px');
    });
  });
});