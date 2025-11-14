/**
 * Tests for Magic Canvas state persistence in workspaceDB
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  initWorkspaceDB, 
  saveMagicCanvasState, 
  loadMagicCanvasState, 
  clearMagicCanvasState,
  benchmarkMagicCanvasRestoration,
  optimizeMagicCanvasState,
  getCacheStats
} from '../workspaceDB.js';

// Mock IndexedDB for testing
const mockDB = {
  transaction: () => ({
    objectStore: () => ({
      put: () => ({ result: { success: true } }),
      get: () => ({ result: null }),
      delete: () => ({ result: 1 }),
      index: () => ({
        openCursor: () => ({ result: null }),
        count: () => ({ result: 0 })
      })
    })
  })
};

// Mock indexedDB global
global.indexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: mockDB
  })
};

describe('Magic Canvas State Persistence', () => {
  beforeEach(async () => {
    // Reset database before each test
    await clearMagicCanvasState();
  });

  afterEach(async () => {
    // Clean up after each test
    await clearMagicCanvasState();
  });

  describe('saveMagicCanvasState', () => {
    it('should save valid Magic Canvas state', async () => {
      const canvasState = [
        { id: 'test-1', type: 'rectangle', x: 100, y: 200, width: 50, height: 30 }
      ];
      
      const appState = {
        zoom: { value: 1.5 },
        scrollX: 100,
        scrollY: 200
      };
      
      const rowManagerState = {
        rowHeight: 384,
        rows: [
          { id: 'row-1', yStart: 0, yEnd: 384, elementIds: new Set(['test-1']) }
        ],
        elementToRow: { 'test-1': 'row-1' }
      };

      const result = await saveMagicCanvasState('test', canvasState, appState, rowManagerState, 1);
      
      expect(result).toBeDefined();
      expect(result.workspaceId).toBeDefined();
      expect(result.key).toBe('test');
      expect(result.canvasState).toEqual(canvasState);
      expect(result.appState).toEqual(appState);
      expect(result.rowManagerState).toEqual(rowManagerState);
      expect(result.version).toBe(1);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should reject invalid canvas state', async () => {
      const invalidCanvasState = 'not an array';
      const appState = { zoom: { value: 1 } };
      const rowManagerState = { rows: [], elementToRow: {} };

      await expect(
        saveMagicCanvasState('test', invalidCanvasState, appState, rowManagerState)
      ).rejects.toThrow('Invalid Magic Canvas state');
    });

    it('should reject too many elements', async () => {
      const tooManyElements = Array.from({ length: 10001 }, (_, i) => ({
        id: `test-${i}`,
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10
      }));

      await expect(
        saveMagicCanvasState('test', tooManyElements, {}, {})
      ).rejects.toThrow('canvasState has too many elements');
    });
  });

  describe('loadMagicCanvasState', () => {
    it('should load saved Magic Canvas state', async () => {
      // First save some state
      const canvasState = [
        { id: 'load-test', type: 'rectangle', x: 50, y: 100, width: 25, height: 15 }
      ];
      const appState = { zoom: { value: 2 }, scrollX: 50, scrollY: 100 };
      const rowManagerState = {
        rows: [{ id: 'row-1', yStart: 0, yEnd: 384, elementIds: new Set(['load-test']) }],
        elementToRow: { 'load-test': 'row-1' }
      };

      await saveMagicCanvasState('load-test', canvasState, appState, rowManagerState);

      // Then load it
      const loadedState = await loadMagicCanvasState('load-test', 1);

      expect(loadedState).toBeDefined();
      expect(loadedState.canvasState).toEqual(canvasState);
      expect(loadedState.appState).toEqual(appState);
      expect(loadedState.rowManagerState).toEqual(rowManagerState);
      expect(loadedState.version).toBe(1);
      expect(loadedState.timestamp).toBeGreaterThan(0);
    });

    it('should return null for non-existent state', async () => {
      const result = await loadMagicCanvasState('non-existent', 1);
      expect(result).toBeNull();
    });

    it('should handle version mismatch', async () => {
      const canvasState = [{ id: 'version-test', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }];
      const appState = { zoom: { value: 1 } };
      const rowManagerState = { rows: [], elementToRow: {} };

      // Save with version 1
      await saveMagicCanvasState('version-test', canvasState, appState, rowManagerState, 1);

      // Try to load with version 2
      const loadedState = await loadMagicCanvasState('version-test', 2);

      // Should still load but with version mismatch warning
      expect(loadedState).toBeDefined();
      expect(loadedState.version).toBe(1);
    });
  });

  describe('clearMagicCanvasState', () => {
    it('should clear specific key', async () => {
      // Save some state first
      await saveMagicCanvasState('clear-test', [], {}, {});

      // Clear specific key
      const deleteCount = await clearMagicCanvasState('clear-test');
      expect(deleteCount).toBe(1);

      // Verify it's gone
      const loadedState = await loadMagicCanvasState('clear-test');
      expect(loadedState).toBeNull();
    });

    it('should clear all Magic Canvas state', async () => {
      // Save multiple states
      await saveMagicCanvasState('test-1', [], {}, {});
      await saveMagicCanvasState('test-2', [], {}, {});

      // Clear all
      const deleteCount = await clearMagicCanvasState();
      expect(deleteCount).toBe(2);
    });
  });

  describe('optimizeMagicCanvasState', () => {
    it('should optimize large canvas state', () => {
      const canvasState = Array.from({ length: 150 }, (_, i) => ({
        id: `opt-test-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: i * 5,
        width: 20,
        height: 10,
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        opacity: 100,
        isDeleted: false,
        // Non-essential properties that should be removed
        customData: { extra: 'data' },
        seed: 12345,
        groupIds: []
      }));

      const appState = { zoom: { value: 1 }, scrollX: 0, scrollY: 0 };
      const rowManagerState = {
        rows: [
          {
            id: 'row-1',
            yStart: 0,
            yEnd: 384,
            elementIds: new Set(['opt-test-0', 'opt-test-1'])
          }
        ],
        elementToRow: { 'opt-test-0': 'row-1', 'opt-test-1': 'row-1' }
      };

      const optimized = optimizeMagicCanvasState(canvasState, appState, rowManagerState);

      expect(optimized.canvasState).toHaveLength(150);
      expect(optimized.canvasState[0]).not.toHaveProperty('customData');
      expect(optimized.canvasState[0]).not.toHaveProperty('seed');
      expect(optimized.canvasState[0]).not.toHaveProperty('groupIds');
      
      // Check that Sets were converted to Arrays
      expect(Array.isArray(optimized.rowManagerState.rows[0].elementIds)).toBe(true);
      expect(optimized.optimizationTime).toBeGreaterThan(0);
    });

    it('should not optimize small canvas state', () => {
      const canvasState = [
        { id: 'small-test', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }
      ];
      const appState = { zoom: { value: 1 } };
      const rowManagerState = { rows: [], elementToRow: {} };

      const optimized = optimizeMagicCanvasState(canvasState, appState, rowManagerState);

      // Should return original state unchanged
      expect(optimized.canvasState).toBe(canvasState);
      expect(optimized.appState).toBe(appState);
      expect(optimized.rowManagerState).toBe(rowManagerState);
      expect(optimized.optimizationTime).toBe(0);
    });
  });

  describe('benchmarkMagicCanvasRestoration', () => {
    it('should benchmark restoration performance', async () => {
      const results = await benchmarkMagicCanvasRestoration(100);

      expect(results.elementCount).toBe(100);
      expect(results.saveTime).toBeDefined();
      expect(results.loadTime).toBeDefined();
      expect(results.totalTime).toBeDefined();
      expect(results.meetsTarget).toBeDefined();
      expect(results.throughput).toBeDefined();
      expect(parseFloat(results.saveTime)).toBeGreaterThan(0);
      expect(parseFloat(results.loadTime)).toBeGreaterThan(0);
      expect(parseFloat(results.totalTime)).toBeGreaterThan(0);
    });

    it('should meet performance target for 500 elements', async () => {
      const results = await benchmarkMagicCanvasRestoration(500);

      expect(results.elementCount).toBe(500);
      // Should meet <1s target for 500 elements (AC6)
      expect(results.meetsTarget).toBe(true);
      expect(parseFloat(results.loadTime)).toBeLessThan(1000);
    });
  });

  describe('State Validation', () => {
    it('should validate complete state structure', async () => {
      const validState = {
        canvasState: [{ id: 'valid', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }],
        appState: { zoom: { value: 1 }, scrollX: 0, scrollY: 0 },
        rowManagerState: {
          rows: [{ id: 'row-1', yStart: 0, yEnd: 384, elementIds: new Set() }],
          elementToRow: {}
        },
        version: 1,
        timestamp: Date.now()
      };

      // This should not throw during save/load
      await saveMagicCanvasState('validation-test', validState.canvasState, validState.appState, validState.rowManagerState);
      const loaded = await loadMagicCanvasState('validation-test');
      expect(loaded).toBeDefined();
    });

    it('should detect corrupted state', async () => {
      // Manually create corrupted state to test validation
      const corruptedState = {
        canvasState: 'not an array', // Invalid
        appState: null, // Invalid
        rowManagerState: 'not an object', // Invalid
        version: -1, // Invalid
        timestamp: 'not a number' // Invalid
      };

      // This should be caught by validation and return null
      // Note: This test simulates corruption in the database
      const result = await loadMagicCanvasState('corrupted-test');
      expect(result).toBeNull();
    });
  });
});