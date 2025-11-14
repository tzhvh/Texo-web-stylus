/**
 * Unit Tests for RowHeader Component
 * Tests visual status indicators for Magic Canvas rows
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

describe('RowHeader Component', () => {
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

  describe('Icon Rendering (AC: 1, 3, 4)', () => {
    it('should render gray ∅ icon for pending status', () => {
      const row = createMockRow({ 
        ocrStatus: 'pending', 
        validationStatus: 'pending' 
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('Pending processing');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-gray-400', 'bg-gray-100');
      expect(icon.textContent).toBe('∅');
    });

    it('should render orange ⟳ icon for processing status', () => {
      const row = createMockRow({ 
        ocrStatus: 'processing', 
        validationStatus: 'pending' 
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('Processing...');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-orange-500', 'bg-orange-100', 'animate-spin');
      expect(icon.textContent).toBe('⟳');
    });

    it('should render green ✓ icon for validated status', () => {
      const row = createMockRow({ 
        ocrStatus: 'completed', 
        validationStatus: 'validated' 
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('OCR completed and validated');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-green-500', 'bg-green-100');
      expect(icon.textContent).toBe('✓');
    });

    it('should render red ✗ icon for error status', () => {
      const row = createMockRow({ 
        ocrStatus: 'error', 
        validationStatus: 'pending',
        errorMessage: 'OCR processing failed'
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('Error: OCR processing failed');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-500', 'bg-red-100');
      expect(icon.textContent).toBe('✗');
    });

    it('should render yellow ⚠️ icon for validation failed status', () => {
      const row = createMockRow({ 
        ocrStatus: 'completed', 
        validationStatus: 'invalid' 
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('OCR completed but validation failed');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-yellow-500', 'bg-yellow-100');
      expect(icon.textContent).toBe('⚠️');
    });

    it('should render blue ○ icon for OCR completed awaiting validation', () => {
      const row = createMockRow({ 
        ocrStatus: 'completed', 
        validationStatus: 'pending' 
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('OCR completed, awaiting validation');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-blue-500', 'bg-blue-100');
      expect(icon.textContent).toBe('○');
    });
  });

  describe('Icon Positioning (AC: 2)', () => {
    it('should position icon at (canvasWidth - 60px, rowCenterY)', () => {
      const row = createMockRow({ yStart: 100, yEnd: 484 }); // Center at 292
      const canvasWidth = 1200;
      
      render(<RowHeader {...defaultProps} row={row} canvasWidth={canvasWidth} y={100} />);
      
      const icon = screen.getByRole('button');
      const style = window.getComputedStyle(icon);
      
      // Check positioning (accounting for transform)
      expect(icon.style.left).toBe('1140px'); // 1200 - 60
      // Component calculates center as: y + (row.yEnd - row.yStart) / 2
      // So: 100 + (484 - 100) / 2 = 100 + 192 = 292
      expect(icon.style.top).toBe('292px'); // Row center
    });

    it('should center icon with transform', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon.style.transform).toBe('translate(-50%, -50%)');
    });
  });

  describe('Icon Size (AC: 3)', () => {
    it('should render 48x48px icons', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      const style = window.getComputedStyle(icon);
      
      expect(icon.style.width).toBe('48px');
      expect(icon.style.height).toBe('48px');
    });

    it('should have 48x48px tap target for accessibility', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      
      // Check inline styles (more reliable in jsdom)
      expect(icon.style.width).toBe('48px');
      expect(icon.style.height).toBe('48px');
    });
  });

  describe('Animation and Transitions (AC: 5, 7)', () => {
    it('should apply fade-in animation class', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('row-status-icon');
    });

    it('should apply spinning animation for processing status', () => {
      const row = createMockRow({ 
        ocrStatus: 'processing', 
        validationStatus: 'pending' 
      });
      
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('animate-spin');
    });

    it('should have hover scale effect', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('hover:scale-110');
    });

    it('should have transition duration for smooth effects', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('transition-opacity', 'duration-200');
    });
  });

  describe('Layer Separation (AC: 6)', () => {
    it('should render on separate z-index layer', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon.style.zIndex).toBe('1000');
    });

    it('should have pointer events enabled for interaction', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon.style.pointerEvents).toBe('auto');
    });
  });

  describe('Tap Detection (AC: 8)', () => {
    it('should be clickable/tappable', () => {
      render(<RowHeader {...defaultProps} />);
      
      const icon = screen.getByRole('button');
      expect(icon).toBeEnabled();
    });

    it('should call tap handler when clicked', () => {
      const mockHandler = vi.fn();
      window.rowHeaderTapHandler = mockHandler;
      
      const row = createMockRow({ id: 'test-row-1' });
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByRole('button');
      fireEvent.click(icon);
      
      expect(mockHandler).toHaveBeenCalledWith(row);
    });

    it('should prevent canvas interaction when clicked', () => {
      const row = createMockRow();
      render(<RowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      // Mock stopPropagation
      const stopPropagationSpy = vi.fn();
      clickEvent.stopPropagation = stopPropagationSpy;
      
      fireEvent(icon, clickEvent);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Debug Mode', () => {
    it('should show debug information when debugMode is true', () => {
      const row = createMockRow({ 
        id: 'debug-row',
        ocrStatus: 'completed',
        validationStatus: 'validated',
        elementIds: new Set(['el-1', 'el-2', 'el-3'])
      });
      
      render(<RowHeader {...defaultProps} row={row} debugMode={true} />);
      
      // Check for debug overlay content
      expect(screen.getByText('ID: debug-row')).toBeInTheDocument();
      expect(screen.getByText('OCR: completed')).toBeInTheDocument();
      expect(screen.getByText('Val: validated')).toBeInTheDocument();
      expect(screen.getByText('Elements: 3')).toBeInTheDocument();
    });

    it('should log to console when clicked in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const row = createMockRow({ id: 'debug-log-test' });
      
      render(<RowHeader {...defaultProps} row={row} debugMode={true} />);
      
      const icon = screen.getByRole('button');
      fireEvent.click(icon);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'RowHeader clicked: debug-log-test',
        expect.objectContaining({
          ocrStatus: 'pending',
          validationStatus: 'pending'
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should return null for invalid row', () => {
      const { container } = render(<RowHeader {...defaultProps} row={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for invalid y coordinate', () => {
      const { container } = render(<RowHeader {...defaultProps} y={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for invalid canvas width', () => {
      const { container } = render(<RowHeader {...defaultProps} canvasWidth={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('MemoizedRowHeader', () => {
    it('should not re-render when relevant props are unchanged', () => {
      const row = createMockRow();
      const { rerender } = render(<MemoizedRowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByRole('button');
      const initialRender = icon.textContent;
      
      // Re-render with same props
      rerender(<MemoizedRowHeader {...defaultProps} row={row} />);
      
      expect(icon.textContent).toBe(initialRender);
    });

    it('should re-render when status changes', () => {
      const row = createMockRow({ ocrStatus: 'pending' });
      const { rerender } = render(<MemoizedRowHeader {...defaultProps} row={row} />);
      
      const icon = screen.getByTitle('Pending processing');
      expect(icon).toBeInTheDocument();
      
      // Update status
      const updatedRow = createMockRow({ ocrStatus: 'completed', validationStatus: 'validated' });
      rerender(<MemoizedRowHeader {...defaultProps} row={updatedRow} />);
      
      expect(screen.getByTitle('OCR completed and validated')).toBeInTheDocument();
    });
  });
});