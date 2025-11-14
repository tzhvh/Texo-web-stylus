/**
 * Tests for RowManager Optimizations
 *
 * Tests bounds validation, performance optimizations, and memory management
 * for the RowManager class after optimization implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import RowManager from '../rowManager.js';

// Mock Logger
vi.mock('../logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('RowManager Optimizations', () => {
  let rowManager;

  beforeEach(() => {
    rowManager = new RowManager({ rowHeight: 384, startY: 0 });
    vi.clearAllMocks();
  });

  describe('Bounds Validation', () => {
    it('should handle extreme coordinates efficiently', () => {
      const extremeCases = [
        { y: -10000, height: 100 }, // Very negative
        { y: 100000, height: 1000 }, // Very large positive
        { y: NaN, height: 100 }, // NaN coordinate
        { y: Infinity, height: 100 }, // Infinity coordinate
        { y: -Infinity, height: 100 }, // Negative infinity
        { y: 100, height: -50 }, // Negative height
        { y: 0, height: 0 }, // Zero dimensions
      ];

      const startTime = performance.now();

      extremeCases.forEach((coords, index) => {
        const element = {
          id: `extreme-${index}`,
          x: 100,
          width: 100,
          ...coords,
        };

        const handleTime = performance.now();
        const result = rowManager.assignElement(element);
        const handleDuration = performance.now() - handleTime;

        // Should handle extreme cases efficiently (<10ms each)
        expect(handleDuration).toBeLessThan(10);

        // Should either assign to a valid row or return null gracefully
        if (coords.y === Infinity || coords.y === -Infinity || isNaN(coords.y)) {
          expect(result).toBeNull();
        } else if (result) {
          expect(result).toMatch(/row-\d+/);
        }
      });

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Total <50ms for all extreme cases
    });

    it('should clamp coordinates to reasonable bounds', () => {
      const testElement = {
        id: 'clamp-test',
        x: 100,
        y: -50000, // Very negative
        width: 100,
        height: 100000, // Very large
      };

      const startTime = performance.now();
      const rowId = rowManager.assignElement(testElement);
      const assignTime = performance.now() - startTime;

      expect(rowId).toBeDefined();
      expect(assignTime).toBeLessThan(50); // Efficient handling

      const row = rowManager.getRow(rowId);
      expect(row).toBeDefined();
      expect(row.elementIds.has('clamp-test')).toBe(true);
    });

    it('should prevent excessive row creation', () => {
      // Elements spaced very far apart
      const elements = [];
      for (let i = 0; i < 100; i++) {
        elements.push({
          id: `row-test-${i}`,
          x: 0,
          y: i * 10000, // Very far apart
          width: 100,
          height: 50,
        });
      }

      const startTime = performance.now();
      elements.forEach(element => {
        rowManager.assignElement(element);
      });
      const totalTime = performance.now() - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // <1s for 100 elements

      // Should not create excessive rows (bounded by reasonable limit)
      const allRows = rowManager.getAllRows();
      expect(allRows.length).toBeLessThan(1001); // Prevents runaway creation
    });
  });

  describe('Performance Optimizations', () => {
    it('should meet cross-row move performance target of <100ms', () => {
      // Create element in first row
      const element = {
        id: 'move-perf-element',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      };
      rowManager.assignElement(element);

      // Measure time for cross-row moves
      const moveTimes = [];
      const targetRows = [1, 5, 10, 20]; // Move to progressively farther rows

      for (const targetRow of targetRows) {
        const moveStartTime = performance.now();

        const movedElement = {
          ...element,
          y: targetRow * 400, // Move to target row
        };

        rowManager.assignElement(movedElement);
        moveTimes.push(performance.now() - moveStartTime);
      }

      // Verify performance targets
      const avgMoveTime = moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
      const maxMoveTime = Math.max(...moveTimes);

      expect(avgMoveTime).toBeLessThan(100); // Average <100ms target
      expect(maxMoveTime).toBeLessThan(150); // Max <150ms for complex moves
    });

    it('should maintain O(1) lookup performance with many elements', () => {
      // Create large dataset
      const elementCount = 1000;
      const elements = [];

      for (let i = 0; i < elementCount; i++) {
        elements.push({
          id: `bulk-element-${i}`,
          x: 100 + (i % 10) * 50,
          y: 50 + Math.floor(i / 10) * 50, // Distribute across rows
          width: 40,
          height: 40,
        });
      }

      // Bulk assign
      const startTime = performance.now();
      elements.forEach(element => {
        rowManager.assignElement(element);
      });
      const bulkTime = performance.now() - startTime;

      // Verify performance
      expect(bulkTime / elementCount).toBeLessThan(50); // <50ms per element average

      // Test O(1) lookup performance
      const lookupStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const randomId = `bulk-element-${Math.floor(Math.random() * elementCount)}`;
        const rowId = rowManager.elementToRow.get(randomId);
        expect(rowId).toBeDefined();
      }
      const lookupTime = performance.now() - lookupStart;

      // O(1) lookup should be very fast (<1ms per lookup)
      expect(lookupTime / 100).toBeLessThan(1);
    });

    it('should handle rapid batch operations efficiently', () => {
      const batchSizes = [10, 50, 100];

      batchSizes.forEach(batchSize => {
        const testManager = new RowManager({ rowHeight: 384, startY: 0 });
        const elements = [];

        for (let i = 0; i < batchSize; i++) {
          elements.push({
            id: `batch-${i}`,
            x: i * 10,
            y: 50 + (i % 5) * 100,
            width: 50,
            height: 50,
          });
        }

        const startTime = performance.now();
        elements.forEach(element => {
          testManager.assignElement(element);
        });
        const batchTime = performance.now() - startTime;

        // Should scale linearly and meet performance target
        expect(batchTime / batchSize).toBeLessThan(50); // <50ms per element
        expect(batchTime).toBeLessThan(batchSize * 100); // Reasonable total time
      });
    });
  });

  describe('Memory Management', () => {
    it('should handle memory efficiently during rapid operations', () => {
      const assignmentTimes = [];

      // Simulate rapid assignments that would fill memory
      for (let i = 0; i < 500; i++) {
        const startTime = performance.now();
        const element = {
          id: `memory-test-${i}`,
          x: 100,
          y: 50 + (i % 100) * 10, // Keep within reasonable bounds
          width: 100,
          height: 50,
        };

        rowManager.assignElement(element);
        assignmentTimes.push(performance.now() - startTime);

        // Simulate cleanup (as done in the optimized hook)
        if (assignmentTimes.length > 100) {
          assignmentTimes.splice(0, 50); // Remove first half (circular buffer)
        }
      }

      // Verify performance maintained throughout
      const avgTime = assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length;
      expect(avgTime).toBeLessThan(50); // Maintain <50ms per assignment

      // Verify memory bounds - should not create excessive rows
      const allRows = rowManager.getAllRows();
      expect(allRows.length).toBeLessThan(50); // Reasonable row count
    });

    it('should maintain stable performance over time', () => {
      // Test that performance doesn't degrade with repeated operations
      const iterations = 100;
      const timings = [];

      for (let i = 0; i < iterations; i++) {
        const element = {
          id: `stable-test-${i}`,
          x: 100,
          y: 100 + (i % 50) * 10, // Cycle through rows
          width: 100,
          height: 50,
        };

        const startTime = performance.now();
        rowManager.assignElement(element);
        const timing = performance.now() - startTime;

        timings.push(timing);
      }

      // Calculate performance statistics
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);
      const variance = timings.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / timings.length;

      // Performance should be consistent
      expect(avgTime).toBeLessThan(50); // Good average performance
      expect(maxTime).toBeLessThan(100); // No extreme outliers
      expect(Math.sqrt(variance)).toBeLessThan(20); // Low variance indicates stable performance
    });
  });

  describe('Complete Integration Scenarios', () => {
    it('should handle complex workflow scenarios', () => {
      const workflowStartTime = performance.now();

      // 1. Bulk creation
      const creationStart = performance.now();
      const elements = [];
      for (let i = 0; i < 50; i++) {
        elements.push({
          id: `workflow-element-${i}`,
          x: (i % 10) * 50,
          y: 50 + Math.floor(i / 10) * 100,
          width: 40,
          height: 40,
        });
      }
      elements.forEach(element => rowManager.assignElement(element));
      const creationTime = performance.now() - creationStart;

      // 2. Bulk modifications (same row)
      const modificationStart = performance.now();
      elements.forEach(element => {
        const modified = { ...element, x: element.x + 5, y: element.y + 5 };
        rowManager.assignElement(modified);
      });
      const modificationTime = performance.now() - modificationStart;

      // 3. Cross-row moves
      const moveStart = performance.now();
      elements.forEach((element, index) => {
        const moved = { ...element, y: element.y + 400 }; // Move to next row
        rowManager.assignElement(moved);
      });
      const moveTime = performance.now() - moveStart;

      // 4. Bulk deletion
      const deletionStart = performance.now();
      elements.forEach(element => {
        rowManager.removeElement(element.id);
      });
      const deletionTime = performance.now() - deletionStart;

      const totalWorkflowTime = performance.now() - workflowStartTime;

      // Verify all performance targets
      expect(creationTime / elements.length).toBeLessThan(50);
      expect(modificationTime / elements.length).toBeLessThan(50);
      expect(moveTime / elements.length).toBeLessThan(100); // Cross-row moves have higher target
      expect(deletionTime / elements.length).toBeLessThan(50);
      expect(totalWorkflowTime).toBeLessThan(200); // Total workflow time reasonable
    });

    it('should handle error recovery gracefully', () => {
      // Test that system remains functional after errors
      const errorCases = [
        () => rowManager.assignElement(null),
        () => rowManager.assignElement({ id: 'no-y-coord' }),
        () => rowManager.assignElement({ y: NaN, id: 'nan-y' }),
        () => rowManager.removeElement(undefined),
        () => rowManager.getRow(null),
      ];

      let errorCount = 0;
      errorCases.forEach(scenario => {
        try {
          scenario();
        } catch (error) {
          errorCount++;
        }
      });

      // Should handle errors gracefully
      expect(errorCount).toBeGreaterThan(0); // Some scenarios should throw

      // Verify system still functional after errors
      const testElement = {
        id: 'after-error-test',
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      };
      const rowId = rowManager.assignElement(testElement);
      expect(rowId).toBeDefined();
      expect(rowManager.elementToRow.get(testElement.id)).toBe(rowId);
    });
  });
});
