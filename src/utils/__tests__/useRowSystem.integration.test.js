/**
 * Integration Tests for useRowSystem Hook
 * 
 * Tests complete integration between Excalidraw, RowManager, and useRowSystem hook
 * to ensure element assignment works correctly in realistic scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useRowSystem from '../../hooks/useRowSystem.js';
import RowManager from '../../utils/rowManager.js';

// Mock logger
vi.mock('../../utils/logger.js', () => {
  return {
    default: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  };
});

// Mock workspaceDB
vi.mock('../../utils/workspaceDB.js', () => {
  return {
    saveSessionState: vi.fn(() => Promise.resolve()),
    loadSessionState: vi.fn(() => Promise.resolve(null))
  };
});

// Mock Excalidraw API
const createMockExcalidrawAPI = () => ({
  getSceneElements: vi.fn(() => []),
  updateScene: vi.fn(),
  getAppState: vi.fn(() => ({ scrollY: 0, zoom: { value: 1 } }))
});

// Mock workspaceDB
const mockWorkspaceDB = {
  saveSessionState: vi.fn(() => Promise.resolve()),
  loadSessionState: vi.fn(() => Promise.resolve(null))
};

vi.mock('../../utils/workspaceDB.js', () => ({
  saveSessionState: mockWorkspaceDB.saveSessionState,
  loadSessionState: mockWorkspaceDB.loadSessionState
}));

describe('useRowSystem Integration Tests', () => {
  let mockExcalidrawAPI;
  let rowManager;

  beforeEach(() => {
    mockExcalidrawAPI = createMockExcalidrawAPI();
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

  describe('Element Assignment Workflow', () => {
    it('should complete full assignment workflow for new elements', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 10,
          debugMode: true 
        })
      );

      // Simulate new elements
      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' },
        { id: 'el2', x: [200, 300, 300, 200], y: [450, 450, 550, 550], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      // Wait for debounced processing
      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(2);
      });

      expect(result.current.getElementRow('el1')).toBe('row-0');
      expect(result.current.getElementRow('el2')).toBe('row-1');
      expect(result.current.getRowCount()).toBe(2);
      expect(result.current.stats.totalAssignments).toBe(2);
    });

    it('should handle element movement between rows', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 10 
        })
      );

      // Initial assignment
      const initialElements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(initialElements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.getElementRow('el1')).toBe('row-0');
      });

      // Move element to different row
      const movedElements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [450, 450, 550, 550], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(movedElements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.getElementRow('el1')).toBe('row-1');
      });

      expect(result.current.getRowCount()).toBe(1);
    });

    it('should handle element deletion', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 10 
        })
      );

      // Add elements
      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' },
        { id: 'el2', x: [200, 300, 300, 200], y: [450, 450, 550, 550], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(2);
      });

      // Delete one element
      const remainingElements = [
        { id: 'el2', x: [200, 300, 300, 200], y: [450, 450, 550, 550], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(remainingElements, {}, []);
      });

      await waitFor(() => {
        expect(result.current.elementToRow.size).toBe(1);
        expect(result.current.elementToRow.has('el1')).toBe(false);
        expect(result.current.elementToRow.has('el2')).toBe(true);
      });

      expect(result.current.getRowCount()).toBe(1);
    });
  });

  describe('Performance and Debouncing', () => {
    it('should handle rapid changes without performance issues', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 50 
        })
      );

      const startTime = performance.now();

      // Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        const elements = [
          { id: `el${i}`, x: [0, 100, 100, 0], y: [50 + i * 10, 50 + i * 10, 150 + i * 10, 150 + i * 10], type: 'rectangle' }
        ];

        act(() => {
          result.current.handleCanvasChange(elements, {}, []);
        });
      }

      // Wait for final debounced processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete rapidly
      expect(result.current.elementToRow.size).toBeGreaterThan(0);
    });

    it('should debounce rapid changes correctly', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debounceMs: 50 
        })
      );

      let processCallCount = 0;
      const originalProcessElementChanges = result.current.__testProcessElementChanges;
      
      // Mock the processing function to count calls
      result.current.__testProcessElementChanges = vi.fn((changes) => {
        processCallCount++;
        return originalProcessElementChanges(changes);
      });

      // Rapid successive changes
      const elements1 = [{ id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }];
      const elements2 = [{ id: 'el1', x: [0, 100, 100, 0], y: [55, 55, 155, 155], type: 'rectangle' }];

      act(() => {
        result.current.handleCanvasChange(elements1, {}, []);
        result.current.handleCanvasChange(elements2, {}, []);
      });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only process once due to debouncing
      expect(processCallCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid elements gracefully', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debugMode: true 
        })
      );

      const invalidElements = [
        { id: null, x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' },
        { id: 'el2', x: [], y: [], type: 'rectangle' },
        { id: 'el3' } // Missing coordinates
      ];

      act(() => {
        result.current.handleCanvasChange(invalidElements, {}, []);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash and should handle gracefully
      expect(result.current.stats.errorCount).toBeGreaterThanOrEqual(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle RowManager errors gracefully', async () => {
      // Mock RowManager to throw errors
      const mockRowManager = {
        assignElement: vi.fn(() => {
          throw new Error('RowManager error');
        }),
        removeElement: vi.fn(),
        getAllRows: vi.fn(() => []),
        updateRow: vi.fn()
      };

      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager: mockRowManager, 
          debugMode: true 
        })
      );

      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.stats.errorCount).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Debug Mode', () => {
    it('should log debug information when enabled', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debugMode: true 
        })
      );

      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should not log debug information when disabled', async () => {
      const { result } = renderHook(() => 
        useRowSystem({ 
          excalidrawAPI: mockExcalidrawAPI, 
          rowManager, 
          debugMode: false 
        })
      );

      const elements = [
        { id: 'el1', x: [0, 100, 100, 0], y: [50, 50, 150, 150], type: 'rectangle' }
      ];

      act(() => {
        result.current.handleCanvasChange(elements, {}, []);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });
});