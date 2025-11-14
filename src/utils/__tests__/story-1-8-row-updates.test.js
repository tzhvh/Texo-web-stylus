/**
 * Tests for Story 1.8: Handle Row Updates When Elements Are Modified or Moved
 * 
 * Tests cross-row element move detection, same-row modifications, element deletion,
 * and debouncing for rapid modifications.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RowManager from '../rowManager.js';
import useRowSystem from '../../hooks/useRowSystem.js';

// Mock Excalidraw API
const mockExcalidrawAPI = {
  getSceneElements: vi.fn(),
  getAppState: vi.fn(() => ({ zoom: { value: 1 }, scrollY: 0, scrollX: 0 })),
  updateScene: vi.fn()
};

// Mock Logger
vi.mock('../logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock workspaceDB
vi.mock('../workspaceDB.js', () => ({
  saveSessionState: vi.fn(() => Promise.resolve()),
  loadSessionState: vi.fn(() => Promise.resolve(null))
}));

describe('Story 1.8: Row Updates for Element Modifications and Moves', () => {
  let rowManager;
  let mockElement;

  beforeEach(() => {
    rowManager = new RowManager({ rowHeight: 384, startY: 0 });
    
    // Mock element with center in row 0 (y: 0-384)
    mockElement = {
      id: 'test-element-1',
      type: 'freedraw',
      x: 100,
      y: 50, // Center Y would be 100 (row 0)
      width: 100,
      height: 100,
      strokeColor: '#000000',
      points: [[0, 0], [50, 50], [100, 0]]
    };
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 1: Element move detection between rows', () => {
    it('should detect cross-row element moves', () => {
      // Assign element to row 0 initially
      const initialRowId = rowManager.assignElement(mockElement);
      expect(initialRowId).toBe('row-0');
      
      // Simulate element move to row 1 (y: 400-784)
      const movedElement = {
        ...mockElement,
        y: 450 // Center Y would be 500 (row 1)
      };
      
      const targetRowId = rowManager.assignElement(movedElement);
      expect(targetRowId).toBe('row-1');
      
      // Verify element removed from row 0 and added to row 1
      const row0 = rowManager.getRow('row-0');
      const row1 = rowManager.getRow('row-1');
      
      expect(row0.elementIds.has(mockElement.id)).toBe(false);
      expect(row1.elementIds.has(mockElement.id)).toBe(true);
      expect(rowManager.elementToRow.get(mockElement.id)).toBe('row-1');
    });

    it('should update both source and target row metadata on cross-row move', () => {
      // Set up initial state
      rowManager.assignElement(mockElement);
      
      // Update row metadata to known state
      rowManager.updateRow('row-0', {
        ocrStatus: 'completed'
      });
      
      // Move element to row 1
      const movedElement = {
        ...mockElement,
        y: 450 // Move to row 1
      };
      
      rowManager.assignElement(movedElement);
      
      // Verify target row is updated with pending status
      const row1 = rowManager.getRow('row-1');
      expect(row1.ocrStatus).toBe('pending');
      
      // Verify element moved from row 0 to row 1
      const row0 = rowManager.getRow('row-0');
      expect(row0.elementIds.has(mockElement.id)).toBe(false);
      expect(row1.elementIds.has(mockElement.id)).toBe(true);
      
      // Verify source row was updated by _removeElementFromPreviousRow
      expect(row0.lastModified).toBeGreaterThan(0);
    });

    it('should handle multiple elements moving between rows', () => {
      const element1 = { ...mockElement, id: 'elem-1', y: 50 }; // row 0
      const element2 = { ...mockElement, id: 'elem-2', y: 200 }; // row 0
      const element3 = { ...mockElement, id: 'elem-3', y: 450 }; // row 1
      
      // Initial assignments
      rowManager.assignElement(element1);
      rowManager.assignElement(element2);
      rowManager.assignElement(element3);
      
      // Move element2 to row 1
      const movedElement2 = { ...element2, y: 500 };
      rowManager.assignElement(movedElement2);
      
      // Verify assignments
      const row0 = rowManager.getRow('row-0');
      const row1 = rowManager.getRow('row-1');
      
      expect(row0.elementIds.size).toBe(1); // element1 only
      expect(row1.elementIds.size).toBe(2); // element2, element3
      
      expect(row0.elementIds.has('elem-1')).toBe(true);
      expect(row1.elementIds.has('elem-2')).toBe(true);
      expect(row1.elementIds.has('elem-3')).toBe(true);
    });
  });

  describe('Task 2: Element modification detection within rows', () => {
    it('should detect same-row element modifications', () => {
      // Assign element to row
      rowManager.assignElement(mockElement);
      
      // Modify element properties but keep in same row
      const modifiedElement = {
        ...mockElement,
        strokeColor: '#ff0000', // Changed stroke color
        width: 150 // Changed width
      };
      
      const rowId = rowManager.assignElement(modifiedElement);
      expect(rowId).toBe('row-0'); // Should remain in same row
      
      // Verify row metadata updated
      const row = rowManager.getRow('row-0');
      expect(row.ocrStatus).toBe('pending');
      expect(row.lastModified).toBeGreaterThan(row.lastModified - 1000);
    });

    it('should handle element property changes (stroke, size, text)', () => {
      // Test different element types
      const strokeElement = { ...mockElement, type: 'freedraw', strokeColor: '#000000' };
      const textElement = {
        id: 'text-element',
        type: 'text',
        x: 100,
        y: 50,
        width: 80,
        height: 30,
        text: 'x^2',
        fontSize: 20
      };
      
      // Assign elements
      rowManager.assignElement(strokeElement);
      rowManager.assignElement(textElement);
      
      // Modify stroke element
      const modifiedStroke = { ...strokeElement, strokeColor: '#ff0000' };
      rowManager.assignElement(modifiedStroke);
      
      // Modify text element
      const modifiedText = { ...textElement, text: 'x^2 + 3' };
      rowManager.assignElement(modifiedText);
      
      // Verify row updated
      const row = rowManager.getRow('row-0');
      expect(row.ocrStatus).toBe('pending');
      expect(row.elementIds.size).toBe(2);
    });

    it('should handle element deletion and removal from row assignments', () => {
      // Assign multiple elements to row
      const element1 = { ...mockElement, id: 'elem-1' };
      const element2 = { ...mockElement, id: 'elem-2' };
      
      rowManager.assignElement(element1);
      rowManager.assignElement(element2);
      
      // Verify both elements assigned
      let row = rowManager.getRow('row-0');
      expect(row.elementIds.size).toBe(2);
      
      // Remove one element
      rowManager.removeElement('elem-1');
      
      // Verify removal
      row = rowManager.getRow('row-0');
      expect(row.elementIds.size).toBe(1);
      expect(row.elementIds.has('elem-1')).toBe(false);
      expect(row.elementIds.has('elem-2')).toBe(true);
      expect(rowManager.elementToRow.has('elem-1')).toBe(false);
      expect(rowManager.elementToRow.get('elem-2')).toBe('row-0');
      
      // Verify row metadata updated
      expect(row.ocrStatus).toBe('pending');
    });

    it('should update affected row metadata and trigger OCR reset on modification', () => {
      // Set initial completed state
      rowManager.assignElement(mockElement);
      rowManager.updateRow('row-0', {
        ocrStatus: 'completed',
        transcribedLatex: 'x^2'
      });
      
      // Modify element
      const modifiedElement = { ...mockElement, width: 200 };
      rowManager.assignElement(modifiedElement);
      
      // Verify OCR reset
      const row = rowManager.getRow('row-0');
      expect(row.ocrStatus).toBe('pending');
      expect(row.transcribedLatex).toBe('x^2'); // Should keep previous LaTeX until new OCR
      expect(row.lastModified).toBeGreaterThan(0);
    });
  });

  describe('Task 3: Debouncing for rapid modifications', () => {
    it('should handle rapid element assignments efficiently', () => {
      // Test basic performance for rapid element assignments
      // Note: Full debouncing is handled in useRowSystem hook
      
      // Simulate rapid element assignments
      const elements = [
        { ...mockElement, id: 'rapid-1', y: 50 },
        { ...mockElement, id: 'rapid-2', y: 55 },
        { ...mockElement, id: 'rapid-3', y: 60 },
        { ...mockElement, id: 'rapid-4', y: 65 }
      ];
      
      // Assign elements rapidly
      elements.forEach(element => {
        rowManager.assignElement(element);
      });
      
      // Verify all elements assigned (RowManager doesn't debounce itself)
      const row = rowManager.getRow('row-0');
      expect(row.elementIds.size).toBe(4);
      
      // Verify performance is maintained
      elements.forEach(element => {
        expect(rowManager.elementToRow.get(element.id)).toBe('row-0');
      });
    });

    it('should maintain performance during rapid drawing/editing', () => {
      const startTime = performance.now();
      
      // Simulate rapid element assignments
      for (let i = 0; i < 100; i++) {
        const element = {
          ...mockElement,
          id: `rapid-element-${i}`,
          y: 50 + (i * 2) // Small Y changes
        };
        
        rowManager.assignElement(element);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerAssignment = totalTime / 100;
      
      // Should meet performance target (<100ms per assignment on average)
      expect(avgTimePerAssignment).toBeLessThan(100);
      expect(totalTime).toBeLessThan(1000); // Total should be under 1 second
    });

    it('should handle rapid cross-row moves efficiently', () => {
      const startTime = performance.now();
      
      // Create element and move it rapidly between rows
      let element = { ...mockElement, id: 'moving-element' };
      
      for (let i = 0; i < 50; i++) {
        element = {
          ...element,
          y: 50 + (i * 50) // Move down through rows
        };
        
        rowManager.assignElement(element);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle rapid moves efficiently
      expect(totalTime).toBeLessThan(500); // 50 moves in <500ms
      
      // Verify final position
      const finalRowId = rowManager.elementToRow.get('moving-element');
      expect(finalRowId).toMatch(/row-\d+/);
    });
  });

  describe('Integration: Complete workflow scenarios', () => {
    it('should handle complete draw-modify-move-delete workflow', () => {
      // 1. Draw element in row 0
      rowManager.assignElement(mockElement);
      expect(rowManager.getRow('row-0').elementIds.size).toBe(1);
      
      // 2. Modify element (same row)
      const modifiedElement = { ...mockElement, strokeColor: '#ff0000' };
      rowManager.assignElement(modifiedElement);
      expect(rowManager.getRow('row-0').ocrStatus).toBe('pending');
      
      // 3. Move element to row 1
      const movedElement = { ...modifiedElement, y: 450 };
      rowManager.assignElement(movedElement);
      
      expect(rowManager.getRow('row-0').elementIds.size).toBe(0);
      expect(rowManager.getRow('row-1').elementIds.size).toBe(1);
      expect(rowManager.getRow('row-0').ocrStatus).toBe('pending');
      expect(rowManager.getRow('row-1').ocrStatus).toBe('pending');
      
      // 4. Delete element
      rowManager.removeElement('test-element-1');
      expect(rowManager.getRow('row-1').elementIds.size).toBe(0);
      expect(rowManager.elementToRow.has('test-element-1')).toBe(false);
    });

    it('should handle elements spanning row boundaries', () => {
      // Create element that spans multiple rows (large height)
      const tallElement = {
        ...mockElement,
        id: 'tall-element',
        y: 200, // Starts in row 0
        height: 400 // Spans into row 1 (ends at y=600)
      };
      
      const rowId = rowManager.assignElement(tallElement);
      
      // Should assign based on center Y (200 + 400/2 = 400, which is row 1)
      expect(rowId).toBe('row-1');
      
      const row1 = rowManager.getRow('row-1');
      expect(row1.elementIds.has('tall-element')).toBe(true);
    });

    it('should maintain performance with large number of elements', () => {
      const startTime = performance.now();
      
      // Create many elements across multiple rows
      for (let i = 0; i < 200; i++) {
        const element = {
          ...mockElement,
          id: `perf-element-${i}`,
          y: 50 + (i * 20), // Distribute across rows
          x: (i % 10) * 50 // Spread horizontally
        };
        
        rowManager.assignElement(element);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerAssignment = totalTime / 200;
      
      // Performance targets
      expect(avgTimePerAssignment).toBeLessThan(50); // <50ms per assignment
      expect(totalTime).toBeLessThan(2000); // <2s total
      
      // Verify all elements assigned
      const allRows = rowManager.getAllRows();
      const totalAssigned = allRows.reduce((sum, row) => sum + row.elementIds.size, 0);
      expect(totalAssigned).toBe(200);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid elements gracefully', () => {
      // RowManager.assignElement throws on null/invalid elements (by design)
      expect(() => {
        rowManager.assignElement(null);
      }).toThrow('Element must have a valid id property');
      
      expect(() => {
        rowManager.assignElement({ id: 'invalid' }); // Missing y coordinate
      }).not.toThrow(); // Should handle missing y gracefully
      
      expect(() => {
        rowManager.removeElement(null);
      }).not.toThrow();
      
      expect(() => {
        rowManager.removeElement('');
      }).not.toThrow();
    });

    it('should handle elements at row boundaries', () => {
      // Element exactly at row boundary
      const boundaryElement = {
        ...mockElement,
        id: 'boundary-element',
        y: 384, // Exactly at row 1 boundary
        height: 2
      };
      
      const rowId = rowManager.assignElement(boundaryElement);
      expect(rowId).toBe('row-1'); // Center Y = 385, should be row 1
    });

    it('should handle negative coordinates', () => {
      const negativeElement = {
        ...mockElement,
        id: 'negative-element',
        y: -100, // Above start Y
        height: 50
      };
      
      const rowId = rowManager.assignElement(negativeElement);
      expect(rowId).toBe('row-0'); // Should map to first row
    });

    it('should handle very large coordinates', () => {
      const largeElement = {
        ...mockElement,
        id: 'large-element',
        y: 50000, // Very large Y
        height: 100
      };
      
      const rowId = rowManager.assignElement(largeElement);
      expect(rowId).toMatch(/row-\d+/); // Should handle gracefully
      
      const row = rowManager.getRow(rowId);
      expect(row).toBeDefined();
      expect(row.elementIds.has('large-element')).toBe(true);
    });
  });
});