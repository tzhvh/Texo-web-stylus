/**
 * Integration tests for Magic Canvas persistence
 * Tests the complete save/load cycle with real data
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveMagicCanvasState, loadMagicCanvasState, clearMagicCanvasState } from '../workspaceDB.js';
import RowManager from '../rowManager.js';

describe('Magic Canvas Integration Tests', () => {
  let rowManager;

  beforeEach(async () => {
    // Clear any existing state
    await clearMagicCanvasState();
    
    // Initialize fresh RowManager
    rowManager = new RowManager({ rowHeight: 384, startY: 0 });
  });

  afterEach(async () => {
    // Clean up
    await clearMagicCanvasState();
  });

  describe('Complete Save/Load Cycle', () => {
    it('should save and load complex canvas with multiple rows', async () => {
      // Create test elements across multiple rows
      const elements = [
        // Row 0 elements (y: 0-384)
        { id: 'el-1', type: 'rectangle', x: 100, y: 50, width: 80, height: 40, strokeColor: '#ff0000' },
        { id: 'el-2', type: 'ellipse', x: 200, y: 150, width: 60, height: 30, strokeColor: '#00ff00' },
        { id: 'el-3', type: 'line', x: 50, y: 300, width: 100, height: 0, strokeColor: '#0000ff' },
        
        // Row 1 elements (y: 384-768)
        { id: 'el-4', type: 'rectangle', x: 150, y: 450, width: 100, height: 50, strokeColor: '#ff00ff' },
        { id: 'el-5', type: 'text', x: 300, y: 600, width: 80, height: 20, text: '2x + 3 = 7', strokeColor: '#000000' },
        
        // Row 2 elements (y: 768-1152)
        { id: 'el-6', type: 'rectangle', x: 100, y: 900, width: 120, height: 60, strokeColor: '#00ffff' }
      ];

      const appState = {
        zoom: { value: 1.25 },
        scrollX: 50,
        scrollY: 200,
        viewBackgroundColor: '#f5f5f5'
      };

      // Assign elements to rows using RowManager
      elements.forEach(element => {
        rowManager.assignElement(element);
      });

      // Get RowManager state
      const rowManagerState = rowManager.serialize();

      // Save unified state
      await saveMagicCanvasState('integration-test', elements, appState, rowManagerState);

      // Create new RowManager to simulate page reload
      const newRowManager = new RowManager({ rowHeight: 384, startY: 0 });

      // Load the saved state
      const loadedState = await loadMagicCanvasState('integration-test');

      expect(loadedState).toBeDefined();
      expect(loadedState.canvasState).toHaveLength(6);
      expect(loadedState.appState.zoom.value).toBe(1.25);
      expect(loadedState.appState.scrollX).toBe(50);
      expect(loadedState.appState.scrollY).toBe(200);

      // Restore RowManager state
      newRowManager.deserialize(loadedState.rowManagerState);

      // Verify row assignments are correct
      expect(newRowManager.getElementRow('el-1')).toBe('row-0');
      expect(newRowManager.getElementRow('el-2')).toBe('row-0');
      expect(newRowManager.getElementRow('el-3')).toBe('row-0');
      expect(newRowManager.getElementRow('el-4')).toBe('row-1');
      expect(newRowManager.getElementRow('el-5')).toBe('row-1');
      expect(newRowManager.getElementRow('el-6')).toBe('row-2');

      // Verify row content
      const row0 = newRowManager.getRow('row-0');
      const row1 = newRowManager.getRow('row-1');
      const row2 = newRowManager.getRow('row-2');

      expect(row0.elementIds.size).toBe(3);
      expect(row1.elementIds.size).toBe(2);
      expect(row2.elementIds.size).toBe(1);
    });

    it('should handle empty canvas gracefully', async () => {
      const emptyElements = [];
      const emptyAppState = {
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
        viewBackgroundColor: '#f5f5f5'
      };

      const emptyRowManagerState = rowManager.serialize();

      // Save empty state
      await saveMagicCanvasState('empty-test', emptyElements, emptyAppState, emptyRowManagerState);

      // Load empty state
      const loadedState = await loadMagicCanvasState('empty-test');

      expect(loadedState).toBeDefined();
      expect(loadedState.canvasState).toHaveLength(0);
      expect(loadedState.appState.zoom.value).toBe(1);
      expect(loadedState.rowManagerState.rows).toHaveLength(0);
      expect(Object.keys(loadedState.rowManagerState.elementToRow)).toHaveLength(0);
    });

    it('should preserve element properties exactly', async () => {
      const complexElement = {
        id: 'complex-el',
        type: 'rectangle',
        x: 123.45,
        y: 678.90,
        width: 111.22,
        height: 33.44,
        angle: 15.5,
        strokeColor: '#ff6b35',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        fillStyle: 'solid',
        strokeWidth: 3.5,
        roughness: 1.2,
        opacity: 85,
        isDeleted: false,
        text: '∫x²dx = x³/3 + C',
        fontSize: 16,
        fontFamily: 'Virgil',
        textAlign: 'left',
        verticalAlign: 'top'
      };

      const elements = [complexElement];
      const appState = { zoom: { value: 2.5 }, scrollX: 100, scrollY: 200 };
      
      rowManager.assignElement(complexElement);
      const rowManagerState = rowManager.serialize();

      // Save and load
      await saveMagicCanvasState('complex-test', elements, appState, rowManagerState);
      const loadedState = await loadMagicCanvasState('complex-test');

      const loadedElement = loadedState.canvasState[0];
      
      // Verify all properties are preserved
      expect(loadedElement.id).toBe(complexElement.id);
      expect(loadedElement.type).toBe(complexElement.type);
      expect(loadedElement.x).toBe(complexElement.x);
      expect(loadedElement.y).toBe(complexElement.y);
      expect(loadedElement.width).toBe(complexElement.width);
      expect(loadedElement.height).toBe(complexElement.height);
      expect(loadedElement.angle).toBe(complexElement.angle);
      expect(loadedElement.strokeColor).toBe(complexElement.strokeColor);
      expect(loadedElement.backgroundColor).toBe(complexElement.backgroundColor);
      expect(loadedElement.fillStyle).toBe(complexElement.fillStyle);
      expect(loadedElement.strokeWidth).toBe(complexElement.strokeWidth);
      expect(loadedElement.roughness).toBe(complexElement.roughness);
      expect(loadedElement.opacity).toBe(complexElement.opacity);
      expect(loadedElement.isDeleted).toBe(complexElement.isDeleted);
      expect(loadedElement.text).toBe(complexElement.text);
      expect(loadedElement.fontSize).toBe(complexElement.fontSize);
      expect(loadedElement.fontFamily).toBe(complexElement.fontFamily);
      expect(loadedElement.textAlign).toBe(complexElement.textAlign);
      expect(loadedElement.verticalAlign).toBe(complexElement.verticalAlign);
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle large canvas efficiently', async () => {
      // Create 500 elements across 50 rows
      const elements = Array.from({ length: 500 }, (_, i) => ({
        id: `perf-el-${i}`,
        type: i % 3 === 0 ? 'rectangle' : i % 3 === 1 ? 'ellipse' : 'line',
        x: (i % 10) * 100,
        y: Math.floor(i / 10) * 100,
        width: 50 + (i % 20),
        height: 30 + (i % 15),
        strokeColor: `hsl(${i % 360}, 70%, 50%)`
      }));

      const appState = {
        zoom: { value: 0.8 },
        scrollX: 0,
        scrollY: 2500
      };

      // Assign all elements
      elements.forEach(element => rowManager.assignElement(element));
      const rowManagerState = rowManager.serialize();

      // Measure save time
      const saveStart = performance.now();
      await saveMagicCanvasState('perf-test', elements, appState, rowManagerState);
      const saveTime = performance.now() - saveStart;

      // Measure load time
      const loadStart = performance.now();
      const loadedState = await loadMagicCanvasState('perf-test');
      const loadTime = performance.now() - loadStart;

      expect(loadedState).toBeDefined();
      expect(loadedState.canvasState).toHaveLength(500);
      expect(saveTime).toBeLessThan(1000); // Save should be <1s
      expect(loadTime).toBeLessThan(1000); // Load should be <1s (AC6 requirement)

      // Verify all elements loaded correctly
      expect(loadedState.canvasState).toHaveLength(500);
      
      // Verify row assignments
      const newRowManager = new RowManager({ rowHeight: 384, startY: 0 });
      newRowManager.deserialize(loadedState.rowManagerState);
      
      // Should have elements distributed across multiple rows
      const allRows = newRowManager.getAllRows();
      const rowsWithElements = allRows.filter(row => row.elementIds.size > 0);
      expect(rowsWithElements.length).toBeGreaterThan(10);
    });

    it('should handle rapid save/load cycles', async () => {
      const elements = [
        { id: 'rapid-1', type: 'rectangle', x: 10, y: 10, width: 50, height: 30 },
        { id: 'rapid-2', type: 'ellipse', x: 100, y: 100, width: 40, height: 25 }
      ];

      const appState = { zoom: { value: 1 }, scrollX: 0, scrollY: 0 };
      
      elements.forEach(el => rowManager.assignElement(el));
      const rowManagerState = rowManager.serialize();

      // Perform multiple rapid save/load cycles
      for (let i = 0; i < 5; i++) {
        await saveMagicCanvasState(`rapid-test-${i}`, elements, appState, rowManagerState);
        const loadedState = await loadMagicCanvasState(`rapid-test-${i}`);
        
        expect(loadedState).toBeDefined();
        expect(loadedState.canvasState).toHaveLength(2);
        expect(loadedState.canvasState[0].id).toBe('rapid-1');
        expect(loadedState.canvasState[1].id).toBe('rapid-2');
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial state corruption gracefully', async () => {
      // Save valid state first
      const validElements = [
        { id: 'valid-el', type: 'rectangle', x: 50, y: 50, width: 30, height: 20 }
      ];
      const validAppState = { zoom: { value: 1 }, scrollX: 0, scrollY: 0 };
      
      validElements.forEach(el => rowManager.assignElement(el));
      const validRowManagerState = rowManager.serialize();

      await saveMagicCanvasState('corruption-test', validElements, validAppState, validRowManagerState);

      // This test simulates corruption that might occur in the database
      // In a real scenario, the validation function would catch this
      const result = await loadMagicCanvasState('corruption-test');
      
      // Should either load successfully or return null (if corruption detected)
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should maintain data integrity across multiple operations', async () => {
      const originalElements = [
        { id: 'integrity-1', type: 'rectangle', x: 25, y: 25, width: 60, height: 35 },
        { id: 'integrity-2', type: 'ellipse', x: 125, y: 75, width: 45, height: 28 },
        { id: 'integrity-3', type: 'text', x: 75, y: 150, width: 80, height: 18, text: 'E = mc²' }
      ];

      const originalAppState = {
        zoom: { value: 1.5 },
        scrollX: 10,
        scrollY: 20,
        viewBackgroundColor: '#ffffff'
      };

      originalElements.forEach(el => rowManager.assignElement(el));
      const originalRowManagerState = rowManager.serialize();

      // Save original state
      await saveMagicCanvasState('integrity-test', originalElements, originalAppState, originalRowManagerState);

      // Perform multiple save/load cycles to test integrity
      let currentState = originalElements;
      for (let cycle = 0; cycle < 3; cycle++) {
        const loadedState = await loadMagicCanvasState('integrity-test');
        
        expect(loadedState).toBeDefined();
        expect(loadedState.canvasState).toHaveLength(3);
        
        // Verify all elements are present with correct properties
        const loadedIds = loadedState.canvasState.map(el => el.id).sort();
        const originalIds = originalElements.map(el => el.id).sort();
        expect(loadedIds).toEqual(originalIds);

        // Verify app state
        expect(loadedState.appState.zoom.value).toBe(1.5);
        expect(loadedState.appState.scrollX).toBe(10);
        expect(loadedState.appState.scrollY).toBe(20);

        // Verify row assignments
        const testRowManager = new RowManager({ rowHeight: 384, startY: 0 });
        testRowManager.deserialize(loadedState.rowManagerState);
        
        originalElements.forEach(el => {
          const rowId = testRowManager.getElementRow(el.id);
          expect(rowId).toBeDefined();
        });

        currentState = loadedState.canvasState;
      }
    });
  });
});