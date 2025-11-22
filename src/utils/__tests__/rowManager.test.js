/**
 * Unit Tests for RowManager Class
 * 
 * Tests cover all public methods, edge cases, and error handling scenarios.
 * Uses Vitest with jsdom environment for DOM-related functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock logger to avoid console output during tests
vi.mock('../logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { RowManager } from '../rowManager.js';
import Logger from '../logger.js';

// Get reference to the mocked logger
const mockLogger = Logger;

describe('RowManager', () => {
  let rowManager;

  beforeEach(() => {
    // Reset mock logger before each test
    vi.clearAllMocks();
    
    // Create fresh RowManager instance for each test
    rowManager = new RowManager({ rowHeight: 384, startY: 0 });
  });

  afterEach(() => {
    // Clean up any test state
    if (rowManager) {
      rowManager.rows.clear();
      rowManager.elementToRow.clear();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new RowManager();
      
      expect(defaultManager.rowHeight).toBe(384);
      expect(defaultManager.startY).toBe(0);
      expect(defaultManager.rows).toBeInstanceOf(Map);
      expect(defaultManager.elementToRow).toBeInstanceOf(Map);
      expect(defaultManager.rows.size).toBe(0);
      expect(defaultManager.elementToRow.size).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      const customManager = new RowManager({ rowHeight: 200, startY: 100 });
      
      expect(customManager.rowHeight).toBe(200);
      expect(customManager.startY).toBe(100);
    });

    it('should log initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'RowManager',
        'Initialized',
        expect.objectContaining({
          rowHeight: 384,
          startY: 0,
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('getRowForY', () => {
    it('should return correct row for Y coordinate within first row', () => {
      const row = rowManager.getRowForY(100);
      
      expect(row).toBeDefined();
      expect(row.id).toBe('row-0');
      expect(row.yStart).toBe(0);
      expect(row.yEnd).toBe(384);
    });

    it('should return correct row for Y coordinate at exact boundary', () => {
      const row = rowManager.getRowForY(384);
      
      expect(row.id).toBe('row-1');
      expect(row.yStart).toBe(384);
      expect(row.yEnd).toBe(768);
    });

    it('should return correct row for negative Y coordinate', () => {
      const row = rowManager.getRowForY(-100);
      
      expect(row.id).toBe('row-0');
      expect(row.yStart).toBe(0);
      expect(row.yEnd).toBe(384);
    });

    it('should return correct row for large Y coordinate', () => {
      const row = rowManager.getRowForY(5000);
      
      expect(row.id).toBe('row-13');
      expect(row.yStart).toBe(4992);
      expect(row.yEnd).toBe(5376);
    });

    it('should return same row instance for repeated calls with same Y', () => {
      const row1 = rowManager.getRowForY(200);
      const row2 = rowManager.getRowForY(250);
      
      expect(row1).toBe(row2); // Same object reference
    });

    it('should create new row for different Y coordinates', () => {
      const row1 = rowManager.getRowForY(100);
      const row2 = rowManager.getRowForY(500);
      
      expect(row1.id).toBe('row-0');
      expect(row2.id).toBe('row-1');
      expect(row1).not.toBe(row2);
    });

    it('should return null for invalid Y coordinate', () => {
      expect(rowManager.getRowForY(null)).toBeNull();
      expect(rowManager.getRowForY(undefined)).toBeNull();
      expect(rowManager.getRowForY('invalid')).toBeNull();
      expect(rowManager.getRowForY(NaN)).toBeNull();
      expect(rowManager.getRowForY(Infinity)).toBeNull();
    });

    it('should log warning for invalid Y coordinate', () => {
      rowManager.getRowForY('invalid');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Invalid Y coordinate provided to getRowForY',
        { y: 'invalid' }
      );
    });

    it('should log row creation', () => {
      rowManager.getRowForY(100);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'RowManager',
        'Created new row',
        expect.objectContaining({
          rowId: 'row-0',
          rowIndex: 0,
          y: 100,
          yStart: 0,
          yEnd: 384
        })
      );
    });
  });

  describe('assignElement', () => {
    const mockElement = {
      id: 'element-1',
      x: [100, 200, 200, 100],
      y: [50, 50, 150, 150]
    };

    it('should assign element to correct row based on center Y', () => {
      const rowId = rowManager.assignElement(mockElement);
      
      expect(rowId).toBe('row-0');
      
      const row = rowManager.getRow(rowId);
      expect(row.elementIds.has('element-1')).toBe(true);
      expect(rowManager.elementToRow.get('element-1')).toBe(rowId);
    });

    it('should assign element to row based on center Y coordinate', () => {
      const tallElement = {
        id: 'tall-element',
        x: [100, 200, 200, 100],
        y: [300, 300, 800, 800] // Spans multiple rows
      };
      
      const rowId = rowManager.assignElement(tallElement);
      
      // Center Y is (300 + 800) / 2 = 550, which should be in row-1
      expect(rowId).toBe('row-1');
    });

    it('should handle element reassignment', () => {
      // First assignment
      rowManager.assignElement(mockElement);
      expect(rowManager.getRow('row-0').elementIds.size).toBe(1);
      
      // Move element to different position
      const movedElement = {
        ...mockElement,
        y: [500, 500, 600, 600] // Move to row-1
      };
      
      const newRowId = rowManager.assignElement(movedElement);
      
      expect(newRowId).toBe('row-1');
      expect(rowManager.getRow('row-0').elementIds.size).toBe(0);
      expect(rowManager.getRow('row-1').elementIds.has('element-1')).toBe(true);
    });

    it('should update row metadata on assignment', () => {
      const rowId = rowManager.assignElement(mockElement);
      const row = rowManager.getRow(rowId);
      
      expect(row.lastModified).toBeGreaterThan(0);
      expect(row.ocrStatus).toBe('pending');
    });

    it('should throw error for invalid element', () => {
      expect(() => rowManager.assignElement(null)).toThrow('Element must have a valid id property');
      expect(() => rowManager.assignElement({})).toThrow('Element must have a valid id property');
      expect(() => rowManager.assignElement({ id: null })).toThrow('Element must have a valid id property');
    });

    it('should handle element with insufficient Y coordinates', () => {
      const invalidElement = {
        id: 'invalid-element',
        x: [100, 200, 200, 100],
        y: [50] // Only one Y coordinate
      };
      
      const result = rowManager.assignElement(invalidElement);
      expect(result).toBeNull();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Element has insufficient Y coordinates',
        expect.objectContaining({
          elementId: 'invalid-element',
          yCoords: [50]
        })
      );
    });

    it('should return null if row cannot be determined', () => {
      // Mock getRowForY to return null
      vi.spyOn(rowManager, 'getRowForY').mockReturnValue(null);
      
      const result = rowManager.assignElement(mockElement);
      expect(result).toBeNull();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'RowManager',
        'Could not determine target row for element',
        expect.objectContaining({
          elementId: 'element-1'
        })
      );
    });

    it('should log element assignment', () => {
      rowManager.assignElement(mockElement);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'RowManager',
        'Assigned element to row',
        expect.objectContaining({
          elementId: 'element-1',
          rowId: 'row-0',
          centerY: 100,
          elementCount: 1
        })
      );
    });
  });

  describe('getRow', () => {
    beforeEach(() => {
      // Create a test row
      rowManager.getRowForY(100);
    });

    it('should return existing row by ID', () => {
      const row = rowManager.getRow('row-0');
      
      expect(row).toBeDefined();
      expect(row.id).toBe('row-0');
    });

    it('should return undefined for non-existent row', () => {
      const row = rowManager.getRow('row-999');
      
      expect(row).toBeUndefined();
    });

    it('should return undefined for invalid row ID', () => {
      expect(rowManager.getRow(null)).toBeUndefined();
      expect(rowManager.getRow(undefined)).toBeUndefined();
      expect(rowManager.getRow(123)).toBeUndefined();
    });

    it('should log warning for invalid row ID', () => {
      rowManager.getRow(null);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Invalid rowId provided to getRow',
        { rowId: null }
      );
    });
  });

  describe('updateRow', () => {
    beforeEach(() => {
      // Create a test row
      rowManager.getRowForY(100);
    });

    it('should update row properties', () => {
      const updates = {
        ocrStatus: 'complete',
        transcribedLatex: 'x^2 + 2x + 1'
      };
      
      rowManager.updateRow('row-0', updates);
      
      const row = rowManager.getRow('row-0');
      expect(row.ocrStatus).toBe('complete');
      expect(row.transcribedLatex).toBe('x^2 + 2x + 1');
      expect(row.lastModified).toBeGreaterThan(0);
    });

    it('should handle partial updates', () => {
      const initialRow = { ...rowManager.getRow('row-0') };
      
      rowManager.updateRow('row-0', { ocrStatus: 'processing' });
      
      const row = rowManager.getRow('row-0');
      expect(row.ocrStatus).toBe('processing');
      // Other properties should remain unchanged
      expect(row.yStart).toBe(initialRow.yStart);
      expect(row.yEnd).toBe(initialRow.yEnd);
    });

    it('should handle non-existent row gracefully', () => {
      const updates = { ocrStatus: 'complete' };
      
      // Should not throw error
      expect(() => rowManager.updateRow('row-999', updates)).not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Attempted to update non-existent row',
        { rowId: 'row-999' }
      );
    });

    it('should handle invalid updates object', () => {
      expect(() => rowManager.updateRow('row-0', null)).not.toThrow();
      expect(() => rowManager.updateRow('row-0', 'invalid')).not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Invalid updates provided to updateRow',
        expect.any(Object)
      );
    });

    it('should log row update', () => {
      const updates = { ocrStatus: 'complete' };
      
      rowManager.updateRow('row-0', updates);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'RowManager',
        'Updated row',
        expect.objectContaining({
          rowId: 'row-0',
          updates: ['ocrStatus']
        })
      );
    });
  });

  describe('getAllRows', () => {
    it('should return empty array when no rows exist', () => {
      const rows = rowManager.getAllRows();
      expect(rows).toEqual([]);
      expect(Array.isArray(rows)).toBe(true);
    });

    it('should return all created rows', () => {
      // Create multiple rows
      rowManager.getRowForY(100); // row-0
      rowManager.getRowForY(500); // row-1
      rowManager.getRowForY(900); // row-2
      
      const rows = rowManager.getAllRows();
      
      expect(rows.length).toBe(3);
      expect(rows.map(r => r.id)).toEqual(['row-0', 'row-1', 'row-2']);
    });

    it('should return array of row objects', () => {
      rowManager.getRowForY(100);
      
      const rows = rowManager.getAllRows();
      const row = rows[0];
      
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('yStart');
      expect(row).toHaveProperty('yEnd');
      expect(row).toHaveProperty('elementIds');
      expect(row.elementIds).toBeInstanceOf(Set);
    });
  });

  describe('getRowsInViewport', () => {
    beforeEach(() => {
      // Create test rows
      rowManager.getRowForY(100);  // row-0: [0, 384]
      rowManager.getRowForY(500);  // row-1: [384, 768]
      rowManager.getRowForY(900);  // row-2: [768, 1152]
    });

    it('should return rows within viewport bounds', () => {
      const viewport = { y: 200, height: 300 }; // [200, 500]
      
      const visibleRows = rowManager.getRowsInViewport(viewport);
      
      expect(visibleRows.length).toBe(2);
      expect(visibleRows.map(r => r.id)).toEqual(['row-0', 'row-1']);
    });

    it('should return empty array for viewport with no overlapping rows', () => {
      const viewport = { y: 2000, height: 100 }; // [2000, 2100]
      
      const visibleRows = rowManager.getRowsInViewport(viewport);
      
      expect(visibleRows).toEqual([]);
    });

    it('should handle viewport that includes all rows', () => {
      const viewport = { y: 0, height: 2000 };
      
      const visibleRows = rowManager.getRowsInViewport(viewport);
      
      expect(visibleRows.length).toBe(3);
    });

    it('should handle partial row overlap', () => {
      const viewport = { y: 350, height: 50 }; // Overlaps row-0 and row-1
      
      const visibleRows = rowManager.getRowsInViewport(viewport);
      
      expect(visibleRows.length).toBe(2);
      expect(visibleRows.map(r => r.id)).toEqual(['row-0', 'row-1']);
    });

    it('should handle invalid viewport', () => {
      expect(rowManager.getRowsInViewport(null)).toEqual([]);
      expect(rowManager.getRowsInViewport({})).toEqual([]);
      expect(rowManager.getRowsInViewport({ y: 'invalid', height: 100 })).toEqual([]);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Invalid viewport provided to getRowsInViewport',
        expect.any(Object)
      );
    });

    it('should handle viewport with optional properties', () => {
      const viewport = { 
        y: 200, 
        height: 300, 
        width: 1000, 
        x: 50 
      };
      
      const visibleRows = rowManager.getRowsInViewport(viewport);
      
      expect(visibleRows.length).toBe(2);
    });
  });

  describe('removeElement', () => {
    const mockElement = {
      id: 'element-1',
      x: [100, 200, 200, 100],
      y: [50, 50, 150, 150]
    };

    beforeEach(() => {
      // Assign an element first
      rowManager.assignElement(mockElement);
    });

    it('should remove element from its assigned row', () => {
      rowManager.removeElement('element-1');
      
      const row = rowManager.getRow('row-0');
      expect(row.elementIds.has('element-1')).toBe(false);
      expect(rowManager.elementToRow.has('element-1')).toBe(false);
    });

    it('should handle removal of non-existent element', () => {
      expect(() => rowManager.removeElement('non-existent')).not.toThrow();
    });

    it('should handle invalid element ID', () => {
      expect(() => rowManager.removeElement(null)).not.toThrow();
      expect(() => rowManager.removeElement(undefined)).not.toThrow();
      expect(() => rowManager.removeElement(123)).not.toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RowManager',
        'Invalid elementId provided to removeElement',
        expect.any(Object)
      );
    });

    it('should log element removal', () => {
      rowManager.removeElement('element-1');
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'RowManager',
        'Removed element from previous row',
        expect.objectContaining({
          elementId: 'element-1',
          previousRowId: 'row-0',
          remainingElements: 0
        })
      );
    });
  });

  describe('serialize', () => {
    beforeEach(() => {
      // Create test data
      rowManager.getRowForY(100);
      rowManager.getRowForY(500);
      
      const mockElement = {
        id: 'element-1',
        x: [100, 200, 200, 100],
        y: [50, 50, 150, 150]
      };
      rowManager.assignElement(mockElement);
    });

    it('should serialize complete state', () => {
      const serialized = rowManager.serialize();
      
      expect(serialized).toHaveProperty('rowHeight', 384);
      expect(serialized).toHaveProperty('startY', 0);
      expect(Array.isArray(serialized.rows)).toBe(true);
      expect(serialized.rows.length).toBe(2);
      expect(typeof serialized.elementToRow).toBe('object');
    });

    it('should convert Sets to Arrays for JSON serialization', () => {
      const serialized = rowManager.serialize();
      
      const row = serialized.rows.find(r => r.id === 'row-0');
      expect(Array.isArray(row.elementIds)).toBe(true);
      expect(row.elementIds).toContain('element-1');
    });

    it('should convert Map to Object for JSON serialization', () => {
      const serialized = rowManager.serialize();
      
      expect(serialized.elementToRow).toHaveProperty('element-1', 'row-0');
      expect(serialized.elementToRow.constructor).toBe(Object);
    });
  });

  describe('deserialize', () => {
    const mockSerializedState = {
      rowHeight: 200,
      startY: 100,
      rows: [
        {
          id: 'row-0',
          yStart: 100,
          yEnd: 300,
          elementIds: ['element-1', 'element-2'],
          ocrStatus: 'complete',
          validationStatus: 'validated',
          transcribedLatex: 'x^2 + 2x + 1',
          validationResult: { equivalent: true, method: 'canonicalization' },
          lastModified: 1234567890,
          tileHash: 'hash-123',
          errorMessage: null
        }
      ],
      elementToRow: {
        'element-1': 'row-0',
        'element-2': 'row-0'
      }
    };

    it('should deserialize and restore state completely', () => {
      rowManager.deserialize(mockSerializedState);
      
      expect(rowManager.rowHeight).toBe(200);
      expect(rowManager.startY).toBe(100);
      expect(rowManager.rows.size).toBe(1);
      expect(rowManager.elementToRow.size).toBe(2);
      
      const row = rowManager.getRow('row-0');
      expect(row.elementIds).toBeInstanceOf(Set);
      expect(row.elementIds.has('element-1')).toBe(true);
      expect(row.elementIds.has('element-2')).toBe(true);
      expect(row.ocrStatus).toBe('complete');
      expect(row.transcribedLatex).toBe('x^2 + 2x + 1');
    });

    it('should handle invalid state gracefully', () => {
      expect(() => rowManager.deserialize(null)).not.toThrow();
      expect(() => rowManager.deserialize(undefined)).not.toThrow();
      expect(() => rowManager.deserialize('invalid')).not.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'RowManager',
        'Invalid state provided to deserialize',
        expect.any(Object)
      );
    });

    it('should handle missing properties in state', () => {
      const partialState = {
        rows: []
      };
      
      expect(() => rowManager.deserialize(partialState)).not.toThrow();
      
      expect(rowManager.rowHeight).toBe(384); // Default value
      expect(rowManager.startY).toBe(0); // Default value
    });

    it('should log successful deserialization', () => {
      rowManager.deserialize(mockSerializedState);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'RowManager',
        'State deserialized successfully',
        expect.objectContaining({
          rowCount: 1,
          elementMappings: 2,
          rowHeight: 200,
          startY: 100
        })
      );
    });

    it('should clear existing state before deserializing', () => {
      // Add some initial state
      rowManager.getRowForY(100);
      expect(rowManager.rows.size).toBe(1);
      
      // Deserialize new state
      rowManager.deserialize(mockSerializedState);
      
      expect(rowManager.rows.size).toBe(1);
      expect(rowManager.getRow('row-0').ocrStatus).toBe('complete');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid element assignments and removals', () => {
      const elements = Array.from({ length: 10 }, (_, i) => ({
        id: `element-${i}`,
        x: [100, 200, 200, 100],
        y: [i * 50, i * 50, i * 50 + 100, i * 50 + 100]
      }));
      
      // Assign all elements
      elements.forEach(element => rowManager.assignElement(element));
      
      // Remove every other element
      elements.filter((_, i) => i % 2 === 0).forEach(element => {
        rowManager.removeElement(element.id);
      });
      
      // Verify state consistency
      expect(rowManager.elementToRow.size).toBe(5);
      
      const allRows = rowManager.getAllRows();
      const totalElements = allRows.reduce((sum, row) => sum + row.elementIds.size, 0);
      expect(totalElements).toBe(5);
    });

    it('should handle large Y coordinates without performance issues', () => {
      const largeY = 1000000;
      const startTime = performance.now();
      
      const row = rowManager.getRowForY(largeY);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(row).toBeDefined();
      expect(duration).toBeLessThan(10); // Should be very fast (O(1) operation)
    });

    it('should maintain row ID consistency across multiple operations', () => {
      const y = 500;
      
      const row1 = rowManager.getRowForY(y);
      const row2 = rowManager.getRowForY(y);
      const row3 = rowManager.getRowForY(y);
      
      expect(row1.id).toBe(row2.id);
      expect(row2.id).toBe(row3.id);
      expect(row1).toBe(row2); // Same object reference
      expect(row2).toBe(row3); // Same object reference
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of rows efficiently', () => {
      // Create many rows
      for (let i = 0; i < 1000; i++) {
        rowManager.getRowForY(i * 384);
      }

      const startTime = performance.now();
      const allRows = rowManager.getAllRows();
      const endTime = performance.now();

      expect(allRows.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });

    it('should handle many element assignments efficiently', () => {
      // Create rows first
      for (let i = 0; i < 100; i++) {
        rowManager.getRowForY(i * 384);
      }

      const startTime = performance.now();

      // Assign many elements
      for (let i = 0; i < 1000; i++) {
        const element = {
          id: `element-${i}`,
          x: [100, 200, 200, 100],
          y: [i * 10, i * 10, i * 10 + 50, i * 10 + 50]
        };
        rowManager.assignElement(element);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be reasonably fast
      expect(rowManager.elementToRow.size).toBe(1000);
    });
  });

  // Story 1.4 Tests: Single-Active-Row Model & Activation Timeline
  describe('Story 1.4: setActiveRow with single-active-row constraint', () => {
    beforeEach(() => {
      // Create test rows
      rowManager.getRowForY(100);  // row-0
      rowManager.getRowForY(500);  // row-1
      rowManager.getRowForY(900);  // row-2
    });

    it('should activate row and set isActive flag (AC #2, #10)', () => {
      rowManager.setActiveRow('row-1');

      const row = rowManager.getRow('row-1');
      expect(row.isActive).toBe(true);
      expect(rowManager.activeRowId).toBe('row-1');
    });

    it('should deactivate previous active row when activating new row (AC #10)', () => {
      rowManager.setActiveRow('row-0');
      rowManager.setActiveRow('row-1');

      const row0 = rowManager.getRow('row-0');
      const row1 = rowManager.getRow('row-1');

      expect(row0.isActive).toBe(false);
      expect(row1.isActive).toBe(true);
    });

    it('should enforce single-active-row constraint (AC #10)', () => {
      rowManager.setActiveRow('row-0');
      rowManager.setActiveRow('row-1');
      rowManager.setActiveRow('row-2');

      const allRows = rowManager.getAllRows();
      const activeRows = allRows.filter(r => r.isActive);

      expect(activeRows.length).toBe(1);
      expect(activeRows[0].id).toBe('row-2');
    });

    it('should set activatedAt timestamp when activating row (AC #9)', () => {
      const beforeActivation = new Date();
      rowManager.setActiveRow('row-1');
      const afterActivation = new Date();

      const row = rowManager.getRow('row-1');
      expect(row.activatedAt).toBeInstanceOf(Date);
      expect(row.activatedAt.getTime()).toBeGreaterThanOrEqual(beforeActivation.getTime());
      expect(row.activatedAt.getTime()).toBeLessThanOrEqual(afterActivation.getTime());
    });

    it('should throw error for invalid rowId (AC #2)', () => {
      expect(() => rowManager.setActiveRow(null)).toThrow('Invalid rowId provided to setActiveRow');
      expect(() => rowManager.setActiveRow('')).toThrow('Invalid rowId provided to setActiveRow');
      expect(() => rowManager.setActiveRow(123)).toThrow('Invalid rowId provided to setActiveRow');
    });

    it('should throw error for non-existent rowId (AC #2)', () => {
      expect(() => rowManager.setActiveRow('row-999')).toThrow('Row row-999 not found');
    });

    it('should log error for invalid activation attempts', () => {
      try {
        rowManager.setActiveRow('non-existent');
      } catch (e) {
        // Expected error
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'RowManager',
        'Row non-existent not found',
        expect.any(Object)
      );
    });
  });

  describe('Story 1.4: getActivationTimeline (AC #8, #12)', () => {
    beforeEach(() => {
      rowManager.getRowForY(100);  // row-0
      rowManager.getRowForY(500);  // row-1
      rowManager.getRowForY(900);  // row-2
    });

    it('should return activation timeline array', () => {
      rowManager.setActiveRow('row-0');
      rowManager.setActiveRow('row-1');

      const timeline = rowManager.getActivationTimeline();

      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBe(2);
    });

    it('should track activation events with rowId, activatedAt, deactivatedAt (AC #12)', () => {
      rowManager.setActiveRow('row-0');
      rowManager.setActiveRow('row-1');

      const timeline = rowManager.getActivationTimeline();

      // First activation (row-0)
      expect(timeline[0].rowId).toBe('row-0');
      expect(timeline[0].activatedAt).toBeGreaterThan(0);
      expect(timeline[0].deactivatedAt).toBeGreaterThan(0); // Deactivated when row-1 was activated

      // Second activation (row-1)
      expect(timeline[1].rowId).toBe('row-1');
      expect(timeline[1].activatedAt).toBeGreaterThan(timeline[0].activatedAt);
      expect(timeline[1].deactivatedAt).toBe(null); // Currently active
    });

    it('should maintain chronological order of activation events (AC #12)', () => {
      rowManager.setActiveRow('row-0');
      rowManager.setActiveRow('row-1');
      rowManager.setActiveRow('row-2');

      const timeline = rowManager.getActivationTimeline();

      expect(timeline.length).toBe(3);
      expect(timeline[0].activatedAt).toBeLessThan(timeline[1].activatedAt);
      expect(timeline[1].activatedAt).toBeLessThan(timeline[2].activatedAt);
    });

    it('should return immutable copy of timeline (AC #8)', () => {
      rowManager.setActiveRow('row-0');

      const timeline1 = rowManager.getActivationTimeline();
      const timeline2 = rowManager.getActivationTimeline();

      // Should be different array instances (copies)
      expect(timeline1).not.toBe(timeline2);

      // But have same content
      expect(timeline1.length).toBe(timeline2.length);
      expect(timeline1[0].rowId).toBe(timeline2[0].rowId);

      // Modifying returned timeline should not affect internal timeline
      timeline1.push({ rowId: 'fake', activatedAt: 999, deactivatedAt: null });
      const timeline3 = rowManager.getActivationTimeline();
      expect(timeline3.length).toBe(1); // Original length, not modified
    });

    it('should return empty array if no activations', () => {
      const timeline = rowManager.getActivationTimeline();
      expect(timeline).toEqual([]);
    });
  });

  describe('Story 1.4: updateRow with single-active-row constraint (AC #6, #10)', () => {
    beforeEach(() => {
      rowManager.getRowForY(100);  // row-0
      rowManager.getRowForY(500);  // row-1
    });

    it('should apply partial updates to row (AC #6)', () => {
      rowManager.updateRow('row-0', {
        ocrStatus: 'complete',
        transcribedLatex: 'x^2 + 1'
      });

      const row = rowManager.getRow('row-0');
      expect(row.ocrStatus).toBe('complete');
      expect(row.transcribedLatex).toBe('x^2 + 1');
      expect(row.validationStatus).toBe('pending'); // Unchanged
    });

    it('should enforce single-active-row constraint when isActive is updated (AC #10)', () => {
      rowManager.setActiveRow('row-0');

      // Update row-1 to be active via updateRow
      rowManager.updateRow('row-1', { isActive: true });

      const row0 = rowManager.getRow('row-0');
      const row1 = rowManager.getRow('row-1');

      expect(row0.isActive).toBe(false); // Auto-deactivated
      expect(row1.isActive).toBe(true);
    });

    it('should throw error for invalid rowId (AC #6)', () => {
      expect(() => rowManager.updateRow('non-existent', { ocrStatus: 'complete' }))
        .toThrow('Row non-existent not found');
    });

    it('should throw error for invalid updates object (AC #6)', () => {
      expect(() => rowManager.updateRow('row-0', null))
        .toThrow('Invalid updates provided to updateRow');
      expect(() => rowManager.updateRow('row-0', 'invalid'))
        .toThrow('Invalid updates provided to updateRow');
    });

    it('should preserve fields not included in updates (AC #6)', () => {
      rowManager.updateRow('row-0', { ocrStatus: 'complete' });

      const row = rowManager.getRow('row-0');
      expect(row.id).toBe('row-0');
      expect(row.yStart).toBe(0);
      expect(row.yEnd).toBe(384);
      expect(row.validationStatus).toBe('pending');
    });
  });

  describe('Story 1.4: Row interface with isActive and activatedAt (AC #9)', () => {
    it('should create rows with isActive field defaulting to false', () => {
      const row = rowManager.getRowForY(100);

      expect(row).toHaveProperty('isActive');
      expect(row.isActive).toBe(false);
    });

    it('should create rows with activatedAt field defaulting to null', () => {
      const row = rowManager.getRowForY(100);

      expect(row).toHaveProperty('activatedAt');
      expect(row.activatedAt).toBe(null);
    });

    it('should include all required Row interface fields (AC #9)', () => {
      const row = rowManager.getRowForY(100);

      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('yStart');
      expect(row).toHaveProperty('yEnd');
      expect(row).toHaveProperty('isActive');
      expect(row).toHaveProperty('ocrStatus');
      expect(row).toHaveProperty('validationStatus');
      expect(row).toHaveProperty('transcribedLatex');
      expect(row).toHaveProperty('activatedAt');
      expect(row).toHaveProperty('errorMessage');
    });
  });

  describe('Story 1.4: serialize/deserialize with activeRowId and activationTimeline (AC #11)', () => {
    beforeEach(() => {
      rowManager.getRowForY(100);  // row-0
      rowManager.getRowForY(500);  // row-1
      rowManager.setActiveRow('row-0');
      rowManager.setActiveRow('row-1');
    });

    it('should serialize activeRowId (AC #11)', () => {
      const serialized = rowManager.serialize();

      expect(serialized).toHaveProperty('activeRowId', 'row-1');
    });

    it('should serialize activationTimeline (AC #12)', () => {
      const serialized = rowManager.serialize();

      expect(serialized).toHaveProperty('activationTimeline');
      expect(Array.isArray(serialized.activationTimeline)).toBe(true);
      expect(serialized.activationTimeline.length).toBe(2);
      expect(serialized.activationTimeline[0].rowId).toBe('row-0');
      expect(serialized.activationTimeline[1].rowId).toBe('row-1');
    });

    it('should serialize activatedAt as ISO string', () => {
      const serialized = rowManager.serialize();

      const row1 = serialized.rows.find(r => r.id === 'row-1');
      expect(typeof row1.activatedAt).toBe('string');
      expect(row1.activatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should deserialize activeRowId (AC #11)', () => {
      const serialized = rowManager.serialize();
      const newManager = new RowManager();

      newManager.deserialize(serialized);

      expect(newManager.activeRowId).toBe('row-1');
    });

    it('should deserialize activationTimeline (AC #12)', () => {
      const serialized = rowManager.serialize();
      const newManager = new RowManager();

      newManager.deserialize(serialized);

      const timeline = newManager.getActivationTimeline();
      expect(timeline.length).toBe(2);
      expect(timeline[0].rowId).toBe('row-0');
      expect(timeline[1].rowId).toBe('row-1');
    });

    it('should deserialize activatedAt as Date object', () => {
      const serialized = rowManager.serialize();
      const newManager = new RowManager();

      newManager.deserialize(serialized);

      const row1 = newManager.getRow('row-1');
      expect(row1.activatedAt).toBeInstanceOf(Date);
    });

    it('should preserve isActive flags after serialize/deserialize roundtrip (AC #11)', () => {
      const serialized = rowManager.serialize();
      const newManager = new RowManager();

      newManager.deserialize(serialized);

      const row0 = newManager.getRow('row-0');
      const row1 = newManager.getRow('row-1');

      expect(row0.isActive).toBe(false);
      expect(row1.isActive).toBe(true);
    });

    it('should handle missing activeRowId and activationTimeline in legacy state', () => {
      const legacyState = {
        rowHeight: 384,
        startY: 0,
        rows: [{
          id: 'row-0',
          yStart: 0,
          yEnd: 384,
          elementIds: [],
          ocrStatus: 'pending',
          validationStatus: 'pending',
          transcribedLatex: null,
          validationResult: null,
          lastModified: Date.now(),
          tileHash: null,
          errorMessage: null
        }],
        elementToRow: {}
      };

      expect(() => rowManager.deserialize(legacyState)).not.toThrow();

      expect(rowManager.activeRowId).toBe(null);
      expect(rowManager.getActivationTimeline()).toEqual([]);
    });
  });

  describe('Story 1.4: O(1) lookups with Map (AC #13)', () => {
    it('should use Map for rows storage', () => {
      expect(rowManager.rows).toBeInstanceOf(Map);
    });

    it('should perform O(1) getRow lookups', () => {
      // Create many rows
      for (let i = 0; i < 1000; i++) {
        rowManager.getRowForY(i * 384);
      }

      // Measure lookup time for first vs last row
      const startTime1 = performance.now();
      rowManager.getRow('row-0');
      const time1 = performance.now() - startTime1;

      const startTime2 = performance.now();
      rowManager.getRow('row-999');
      const time2 = performance.now() - startTime2;

      // Lookup times should be similar (O(1)), not linear
      expect(Math.abs(time1 - time2)).toBeLessThan(1); // Within 1ms
    });
  });
});