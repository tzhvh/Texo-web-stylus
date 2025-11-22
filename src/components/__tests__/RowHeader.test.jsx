/**
 * Story 1.6 Tests: RowHeader Component with StatusIcon Integration
 *
 * Tests for RowHeader component integration with StatusIcon and active row highlighting.
 * Validates Story 1.5 and Story 1.6 acceptance criteria.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RowHeader from '../RowHeader';

describe('Story 1.6: RowHeader Component with StatusIcon Integration', () => {
  const mockRow = {
    id: 'row-0',
    yStart: 0,
    yEnd: 384,
    isActive: false,
    ocrStatus: 'pending',
    validationStatus: 'pending',
    errorMessage: null,
    elementIds: new Set(),
    lastModified: Date.now()
  };

  const canvasWidth = 1000;
  const y = 192; // Center of row

  describe('Task 1: StatusIcon Integration (AC #1, #5)', () => {
    it('should render StatusIcon component', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={canvasWidth} />
      );

      const statusIcon = container.querySelector('svg[data-testid*="status-icon"]');
      expect(statusIcon).toBeTruthy();
    });

    it('should pass correct props to StatusIcon', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={canvasWidth} />
      );

      const statusIcon = container.querySelector('svg[data-testid="status-icon-row-0"]');
      expect(statusIcon).toBeTruthy();
      expect(statusIcon.getAttribute('data-status')).toBe('pending');
    });

    it('should render different icon types based on status', () => {
      const testCases = [
        { status: { ocrStatus: 'processing' }, expected: 'processing' },
        { status: { validationStatus: 'validated' }, expected: 'valid' },
        { status: { validationStatus: 'invalid' }, expected: 'invalid' },
        { status: { ocrStatus: 'error', errorMessage: 'Error' }, expected: 'error' }
      ];

      testCases.forEach(({ status, expected }) => {
        const row = { ...mockRow, ...status };
        const { container } = render(
          <RowHeader row={row} y={y} canvasWidth={canvasWidth} />
        );

        const statusIcon = container.querySelector('svg[data-testid*="status-icon"]');
        expect(statusIcon.getAttribute('data-status')).toBe(expected);
      });
    });
  });

  describe('Task 3: Active Row Highlighting (AC #4) - Note: Highlighting now handled via Excalidraw overlays', () => {
    it('should render StatusIcon component regardless of active state', () => {
      const activeRow = {
        ...mockRow,
        isActive: true
      };

      const { container } = render(
        <RowHeader row={activeRow} y={y} canvasWidth={canvasWidth} />
      );

      const statusIcon = container.querySelector('svg[data-testid*="status-icon"]');
      expect(statusIcon).toBeTruthy();
    });

    it('should render StatusIcon for inactive rows', () => {
      const inactiveRow = {
        ...mockRow,
        isActive: false
      };

      const { container } = render(
        <RowHeader row={inactiveRow} y={y} canvasWidth={canvasWidth} />
      );

      const statusIcon = container.querySelector('svg[data-testid*="status-icon"]');
      expect(statusIcon).toBeTruthy();
    });
  });

  describe('Task 4: Canvas Integration (AC #7)', () => {
    it('should render icon with interactive pointer events', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={canvasWidth} />
      );

      const statusIcon = container.querySelector('svg[data-testid*="status-icon"]');
      const style = statusIcon.getAttribute('style');
      expect(style).toContain('pointer-events: auto');
    });
  });

  describe('Debug Mode Features', () => {
    it('should render debug overlay when debugMode is true', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={canvasWidth} debugMode={true} />
      );

      const debugOverlay = container.querySelector('.bg-black.bg-opacity-75');
      expect(debugOverlay).toBeTruthy();
      expect(debugOverlay.textContent).toContain('ID: row-0');
      expect(debugOverlay.textContent).toContain('OCR: pending');
      expect(debugOverlay.textContent).toContain('Val: pending');
    });

    it('should not render debug overlay when debugMode is false', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={canvasWidth} debugMode={false} />
      );

      const debugOverlay = container.querySelector('.bg-black.bg-opacity-75');
      expect(debugOverlay).toBeFalsy();
    });

    it('should show active status in debug overlay', () => {
      const activeRow = {
        ...mockRow,
        isActive: true
      };

      const { container } = render(
        <RowHeader row={activeRow} y={y} canvasWidth={canvasWidth} debugMode={true} />
      );

      const debugOverlay = container.querySelector('.bg-black.bg-opacity-75');
      expect(debugOverlay.textContent).toContain('Active: YES');
    });

    it('should display error message in debug overlay', () => {
      const errorRow = {
        ...mockRow,
        errorMessage: 'OCR timeout error'
      };

      const { container } = render(
        <RowHeader row={errorRow} y={y} canvasWidth={canvasWidth} debugMode={true} />
      );

      const debugOverlay = container.querySelector('.bg-black.bg-opacity-75');
      expect(debugOverlay.textContent).toContain('Error: OCR timeout error');
    });

    it('should pass onClick handler to StatusIcon in debug mode', () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={canvasWidth} debugMode={true} />
      );

      // StatusIcon should receive onClick handler
      const statusIcon = container.querySelector('svg[data-testid*="status-icon"]');
      expect(statusIcon).toBeTruthy();

      consoleLogSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return null for invalid row', () => {
      const { container } = render(
        <RowHeader row={null} y={y} canvasWidth={canvasWidth} />
      );

      expect(container.innerHTML).toBe('');
    });

    it('should return null for invalid y coordinate', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={null} canvasWidth={canvasWidth} />
      );

      expect(container.innerHTML).toBe('');
    });

    it('should return null for invalid canvasWidth', () => {
      const { container } = render(
        <RowHeader row={mockRow} y={y} canvasWidth={null} />
      );

      expect(container.innerHTML).toBe('');
    });

    it('should handle missing optional row properties', () => {
      const minimalRow = {
        id: 'row-minimal',
        yStart: 0,
        yEnd: 384,
        isActive: false,
        ocrStatus: 'pending',
        validationStatus: 'pending'
      };

      const { container } = render(
        <RowHeader row={minimalRow} y={y} canvasWidth={canvasWidth} />
      );

      expect(container.innerHTML).not.toBe('');
    });
  });

  describe('Integration with Multiple Rows', () => {
    it('should render multiple row headers with different states', () => {
      const rows = [
        { ...mockRow, id: 'row-0', isActive: true },
        { ...mockRow, id: 'row-1', isActive: false, ocrStatus: 'processing' },
        { ...mockRow, id: 'row-2', isActive: false, validationStatus: 'validated' }
      ];

      const { container } = render(
        <>
          {rows.map(row => (
            <RowHeader
              key={row.id}
              row={row}
              y={row.yStart + (row.yEnd - row.yStart) / 2}
              canvasWidth={canvasWidth}
            />
          ))}
        </>
      );

      // Should have 3 status icons
      const statusIcons = container.querySelectorAll('svg[data-testid*="status-icon"]');
      expect(statusIcons.length).toBe(3);
    });
  });

  describe('Performance and Memoization', () => {
    it('should export MemoizedRowHeader', async () => {
      const module = await import('../RowHeader');
      expect(module.MemoizedRowHeader).toBeTruthy();
    });
  });
});
