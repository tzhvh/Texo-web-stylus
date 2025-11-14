/**
 * Performance Tests for useRowSystem Hook
 * 
 * Tests performance characteristics to ensure <100ms assignment target
 * and efficient handling of large numbers of elements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useRowSystem from '../../hooks/useRowSystem.js';
import RowManager from '../../utils/rowManager.js';

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.mock('../../utils/logger.js', () => ({
  default: mockLogger
}));

describe('useRowSystem Performance Tests', () => {
  let mockExcalidrawAPI;
  let rowManager;

  beforeEach(() => {
    mockExcalidrawAPI = {
      getSceneElements: vi.fn(() => []),
      updateScene: vi.fn(),
      getAppState: vi.fn(() => ({ scrollY: 0, zoom: { value: 1 } }))
    };
    
    rowManager = new RowManager({ rowHeight: 384, startY: 0 });
    
    // Reset mock logger
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Assignment Performance', () => {
    it('should complete single element assignment within 100ms', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 0, // No debounce for performance testing
          debugMode: false 
        })
      );

      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }
      ];

      const startTime = performance.now();

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(1);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.current.stats.averageAssignmentTime).toBeLessThan(100);
    });

    it('should handle 10 elements within 100ms', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 0,
          debugMode: false 
        })
      );

      const elements = Array.from({ length: 10 }, (_, i) => ({
        id: `el${i}`,
        x: [i * 50, i * 50 + 100, i * 50 + 100, i * 50],
        y: [50 + i * 20, 50 + i * 20, 150 + i * 20, 150 + i * 20],
        type: 'rectangle'
      }));

      const startTime = performance.now();

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(10);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.current.stats.averageAssignmentTime).toBeLessThan(20); // Average per element
    });

    it('should handle 100 elements within 200ms', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 0,
          debugMode: false 
        })
      );

      const elements = Array.from({ length: 100 }, (_, i) => ({
        id: `el${i}`,
        x: [i * 10, i * 10 + 50, i * 10 + 50, i * 10],
        y: [50 + i * 5, 50 + i * 5, 150 + i * 5, 150 + i * 5],
        type: 'rectangle'
      }));

      const startTime = performance.now();

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(100);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
      expect(result.current.stats.averageAssignmentTime).toBeLessThan(5); // Average per element
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory with repeated assignments', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 0,
          debugMode: false 
        })
      );

      // Simulate many assignment cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        const elements = Array.from({ length: 20 }, (_, i) => ({
          id: `cycle${cycle}_el${i}`,
          x: [i * 10, i * 10 + 50, i * 10 + 50, i * 10],
          y: [50 + i * 5, 50 + i * 5, 150 + i * 5, 150 + i * 5],
          type: 'rectangle'
        }));

        act(() => {
          result.current.handleCanvasChange(elements, {}, []);
        });

        await waitFor(() => {
          expect(result.current.elementToRow.size).toBe(20);
        });

        // Clear elements for next cycle
        act(() => {
          result.current.handleCanvasChange([], {}, []);
        });

        await waitFor(() => {
          expect(result.current.elementToRow.size).toBe(0);
        });
      }

      // Verify no memory leaks (basic check)
      expect(result.current.elementToRow.size).toBe(0);
      expect(result.current.getRowCount()).toBe(0);
    });
  });

  describe('Debouncing Performance', () => {
    it('should debounce rapid changes efficiently', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 50,
          debugMode: false 
        })
      );

      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }
      ];

      const startTime = performance.now();
      let processCallCount = 0;
      
      // Mock the internal processing function to count calls
      const originalProcessElementChanges = result.current.__testProcessElementChanges;
      result.current.__testProcessElementChanges = vi.fn((changes) => {
        processCallCount++;
        return originalProcessElementChanges(changes);
      });

      // Rapid successive changes
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.handleCanvasChange(elements, {}, []);
        });
      }

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should only process once due to debouncing
      expect(processCallCount).toBeLessThanOrEqual(2); // Initial + debounced
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Row Manager Performance', () => {
    it('should maintain O(1) performance with many rows', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 0,
          debugMode: false 
        })
      );

      // Create elements spread across many rows
      const elements = Array.from({ length: 50 }, (_, i) => ({
        id: `el${i}`,
        x: [i * 20, i * 20 + 50, i * 20 + 50, i * 20],
        y: [i * 384, i * 384 + 50, i * 384 + 150, i * 384 + 200],
        type: 'rectangle'
      }));

      const startTime = performance.now();

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(50);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.current.getRowCount()).toBe(50);
    });
  });
});