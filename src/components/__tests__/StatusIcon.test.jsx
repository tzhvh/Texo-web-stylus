/**
 * Story 1.6 Tests: StatusIcon Component
 *
 * Tests for status icon rendering, positioning, transitions, and tap targets.
 * Validates all acceptance criteria for Story 1.6.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusIcon from '../StatusIcon';

describe('Story 1.6: StatusIcon Component', () => {
  const mockRow = {
    id: 'row-0',
    yStart: 0,
    yEnd: 384,
    ocrStatus: 'pending',
    validationStatus: 'pending',
    errorMessage: null,
    elementIds: new Set()
  };

  const canvasWidth = 1000;

  describe('Task 1: Status Icon Rendering (AC #1, #5)', () => {
    it('should render pending icon for pending status', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('data-status')).toBe('pending');

      // Should have circle for pending status
      const circle = container.querySelector('circle');
      expect(circle).toBeTruthy();
    });

    it('should render processing icon for processing status', () => {
      const processingRow = {
        ...mockRow,
        ocrStatus: 'processing'
      };

      const { container } = render(
        <StatusIcon row={processingRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('data-status')).toBe('processing');

      // Should have spinning animation
      const animatedGroup = container.querySelector('.animate-spin');
      expect(animatedGroup).toBeTruthy();
    });

    it('should render valid icon for validated status', () => {
      const validRow = {
        ...mockRow,
        validationStatus: 'validated'
      };

      const { container } = render(
        <StatusIcon row={validRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('data-status')).toBe('valid');

      // Should have checkmark path
      const path = container.querySelector('path');
      expect(path).toBeTruthy();
      expect(path.getAttribute('d')).toContain('M14 24 L20 30 L34 16');
    });

    it('should render invalid icon for invalid status', () => {
      const invalidRow = {
        ...mockRow,
        validationStatus: 'invalid'
      };

      const { container } = render(
        <StatusIcon row={invalidRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('data-status')).toBe('invalid');

      // Should have X (two lines)
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBe(2);
    });

    it('should render error icon for error status', () => {
      const errorRow = {
        ...mockRow,
        ocrStatus: 'error',
        errorMessage: 'OCR failed'
      };

      const { container } = render(
        <StatusIcon row={errorRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('data-status')).toBe('error');

      // Should have warning symbol (exclamation mark: line + circle)
      const path = container.querySelector('path');
      const circle = container.querySelector('circle');
      expect(path).toBeTruthy();
      expect(circle).toBeTruthy();
    });

    it('should prioritize error over other statuses', () => {
      const errorRow = {
        ...mockRow,
        ocrStatus: 'error',
        validationStatus: 'validated', // Should be ignored
        errorMessage: 'Parse error'
      };

      const { container } = render(
        <StatusIcon row={errorRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('data-status')).toBe('error');
    });

    it('should prioritize processing over validated', () => {
      const processingRow = {
        ...mockRow,
        ocrStatus: 'processing',
        validationStatus: 'validated'
      };

      const { container } = render(
        <StatusIcon row={processingRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('data-status')).toBe('processing');
    });
  });

  describe('Task 2: Icon Positioning (AC #2, #8)', () => {
    it('should position icon at (canvasWidth - 60, rowCenterY)', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      const style = svg.getAttribute('style');

      // Icon should be at x = canvasWidth - 60 = 1000 - 60 = 940
      expect(style).toContain('left: 940px');

      // Icon should be centered vertically: (yStart + yEnd) / 2 = (0 + 384) / 2 = 192
      // Subtract half icon height (24px) for centering: 192 - 24 = 168
      expect(style).toContain('top: 168px');
    });

    it('should position correctly for different row positions', () => {
      const row2 = {
        ...mockRow,
        id: 'row-2',
        yStart: 768,
        yEnd: 1152
      };

      const { container } = render(
        <StatusIcon row={row2} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      const style = svg.getAttribute('style');

      // rowCenterY = (768 + 1152) / 2 = 960
      // top = 960 - 24 = 936
      expect(style).toContain('top: 936px');
    });

    it('should update position when canvasWidth changes', () => {
      const { container, rerender } = render(
        <StatusIcon row={mockRow} canvasWidth={1000} />
      );

      let svg = container.querySelector('svg');
      let style = svg.getAttribute('style');
      expect(style).toContain('left: 940px');

      // Update canvas width
      rerender(
        <StatusIcon row={mockRow} canvasWidth={1200} />
      );

      svg = container.querySelector('svg');
      style = svg.getAttribute('style');
      expect(style).toContain('left: 1140px'); // 1200 - 60
    });
  });

  describe('Task 3: Icon Size and Styling (AC #3)', () => {
    it('should render 48x48px icon', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('width')).toBe('48');
      expect(svg.getAttribute('height')).toBe('48');
      expect(svg.getAttribute('viewBox')).toBe('0 0 48 48');
    });

    it('should have consistent icon colors', () => {
      const testCases = [
        { status: { ocrStatus: 'pending' }, expectedColor: '#9CA3AF' },
        { status: { ocrStatus: 'processing' }, expectedColor: '#F97316' },
        { status: { validationStatus: 'validated' }, expectedColor: '#10B981' },
        { status: { validationStatus: 'invalid' }, expectedColor: '#EF4444' },
        { status: { ocrStatus: 'error' }, expectedColor: '#F59E0B' }
      ];

      testCases.forEach(({ status, expectedColor }) => {
        const row = { ...mockRow, ...status };
        const { container } = render(
          <StatusIcon row={row} canvasWidth={canvasWidth} />
        );

        // Check that SVG elements use expected color
        const svgContent = container.innerHTML;
        expect(svgContent).toContain(expectedColor);
      });
    });
  });

  describe('Task 6: Smooth Transitions (AC #6)', () => {
    it('should have 200ms opacity transition', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      const style = svg.getAttribute('style');

      expect(style).toContain('transition: opacity 200ms ease');
    });

    it('should apply reduced opacity for pending status', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      const style = svg.getAttribute('style');

      expect(style).toContain('opacity: 0.5');
    });

    it('should apply full opacity for active statuses', () => {
      const processingRow = {
        ...mockRow,
        ocrStatus: 'processing'
      };

      const { container } = render(
        <StatusIcon row={processingRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      const style = svg.getAttribute('style');

      expect(style).toContain('opacity: 1');
    });
  });

  describe('Task 7: Tap Target and Click Handling (AC #9)', () => {
    it('should have 44x44px tap target', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const tapTarget = screen.getByTestId('tap-target');
      expect(tapTarget).toBeTruthy();
      expect(tapTarget.getAttribute('width')).toBe('44');
      expect(tapTarget.getAttribute('height')).toBe('44');
    });

    it('should call onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const onClickMock = vi.fn();

      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} onClick={onClickMock} />
      );

      const svg = container.querySelector('svg');
      await user.click(svg);

      expect(onClickMock).toHaveBeenCalledTimes(1);
      expect(onClickMock).toHaveBeenCalledWith(mockRow, 'pending');
    });

    it('should log to console when no onClick handler provided', async () => {
      const user = userEvent.setup();
      const consoleLogSpy = vi.spyOn(console, 'log');

      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      await user.click(svg);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'StatusIcon clicked:',
        expect.objectContaining({
          rowId: 'row-0',
          status: 'pending'
        })
      );

      consoleLogSpy.mockRestore();
    });

    it('should stop event propagation on click', async () => {
      const user = userEvent.setup();
      const parentClickMock = vi.fn();

      const { container } = render(
        <div onClick={parentClickMock}>
          <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
        </div>
      );

      const svg = container.querySelector('svg');
      await user.click(svg);

      // Parent should not receive click event
      expect(parentClickMock).not.toHaveBeenCalled();
    });
  });

  describe('Task 8: Accessibility (AC #9)', () => {
    it('should have accessible label', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('aria-label')).toBe('row-0 - Row pending processing');
      expect(svg.getAttribute('role')).toBe('img');
    });

    it('should update accessible label based on status', () => {
      const validRow = {
        ...mockRow,
        validationStatus: 'validated'
      };

      const { container } = render(
        <StatusIcon row={validRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('aria-label')).toBe('row-0 - Row validated successfully');
    });

    it('should include error message in accessible label', () => {
      const errorRow = {
        ...mockRow,
        ocrStatus: 'error',
        errorMessage: 'OCR processing timeout'
      };

      const { container } = render(
        <StatusIcon row={errorRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg.getAttribute('aria-label')).toContain('OCR processing timeout');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return null for invalid row', () => {
      const { container } = render(
        <StatusIcon row={null} canvasWidth={canvasWidth} />
      );

      expect(container.innerHTML).toBe('');
    });

    it('should return null for invalid canvasWidth', () => {
      const { container } = render(
        <StatusIcon row={mockRow} canvasWidth={null} />
      );

      expect(container.innerHTML).toBe('');
    });

    it('should handle missing status fields gracefully', () => {
      const minimalRow = {
        id: 'row-minimal',
        yStart: 0,
        yEnd: 384
      };

      const { container } = render(
        <StatusIcon row={minimalRow} canvasWidth={canvasWidth} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('data-status')).toBe('pending');
    });
  });

  describe('MemoizedStatusIcon', () => {
    it('should export memoized version', async () => {
      const module = await import('../StatusIcon');
      expect(module.MemoizedStatusIcon).toBeTruthy();
      expect(module.MemoizedStatusIcon.displayName).toBe('MemoizedStatusIcon');
    });
  });
});
