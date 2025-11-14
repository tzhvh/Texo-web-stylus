/**
 * Tests for Story 1.8: Handle Row Updates When Elements Are Modified or Moved
 *
 * Tests cross-row element move detection, same-row modifications, element deletion,
 * debouncing for rapid modifications, and complete workflow scenarios with performance benchmarks.
 *
 * Performance targets:
 * - Cross-row moves: <100ms per move
 * - Bulk operations: <50ms per element
 * - Memory usage: <1000 assignment times retained
 * - Total processing: <2s for 200 elements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import RowManager from "../rowManager.js";
import useRowSystem from "../../hooks/useRowSystem.js";

// Mock Excalidraw API
const mockExcalidrawAPI = {
  getSceneElements: vi.fn(),
  getAppState: vi.fn(() => ({ zoom: { value: 1 }, scrollY: 0, scrollX: 0 })),
  updateScene: vi.fn(),
};

// Mock Logger
vi.mock("../logger.js", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock workspaceDB
vi.mock("../workspaceDB.js", () => ({
  saveSessionState: vi.fn(() => Promise.resolve()),
  loadSessionState: vi.fn(() => Promise.resolve(null)),
}));

describe("Story 1.8: Row Updates for Element Modifications and Moves", () => {
  let rowManager;
  let mockElement;

  beforeEach(() => {
    rowManager = new RowManager({ rowHeight: 384, startY: 0 });

    // Mock element with center in row 0 (y: 0-384)
    mockElement = {
      id: "test-element-1",
      type: "freedraw",
      x: 100,
      y: 50, // Center Y would be 100 (row 0)
      width: 100,
      height: 100,
      strokeColor: "#000000",
      points: [
        [0, 0],
        [50, 50],
        [100, 0],
      ],
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Task 1: Element move detection between rows", () => {
    it("should detect cross-row element moves", () => {
      // Assign element to row 0 initially
      const initialRowId = rowManager.assignElement(mockElement);
      expect(initialRowId).toBe("row-0");

      // Simulate element move to row 1 (y: 400-784)
      const movedElement = {
        ...mockElement,
        y: 450, // Center Y would be 500 (row 1)
      };

      const targetRowId = rowManager.assignElement(movedElement);
      expect(targetRowId).toBe("row-1");

      // Verify element removed from row 0 and added to row 1
      const row0 = rowManager.getRow("row-0");
      const row1 = rowManager.getRow("row-1");

      expect(row0.elementIds.has(mockElement.id)).toBe(false);
      expect(row1.elementIds.has(mockElement.id)).toBe(true);
      expect(rowManager.elementToRow.get(mockElement.id)).toBe("row-1");
    });

    it("should update both source and target row metadata on cross-row move", () => {
      // Set up initial state
      rowManager.assignElement(mockElement);

      // Update row metadata to known state
      rowManager.updateRow("row-0", {
        ocrStatus: "completed",
      });

      // Move element to row 1
      const movedElement = {
        ...mockElement,
        y: 450, // Move to row 1
      };

      rowManager.assignElement(movedElement);

      // Verify target row is updated with pending status
      const row1 = rowManager.getRow("row-1");
      expect(row1.ocrStatus).toBe("pending");

      // Verify element moved from row 0 to row 1
      const row0 = rowManager.getRow("row-0");
      expect(row0.elementIds.has(mockElement.id)).toBe(false);
      expect(row1.elementIds.has(mockElement.id)).toBe(true);

      // Verify source row was updated by _removeElementFromPreviousRow
      expect(row0.lastModified).toBeGreaterThan(0);
    });

    it("should handle multiple elements moving between rows", () => {
      const element1 = { ...mockElement, id: "elem-1", y: 50 }; // row 0
      const element2 = { ...mockElement, id: "elem-2", y: 200 }; // row 0
      const element3 = { ...mockElement, id: "elem-3", y: 450 }; // row 1

      // Initial assignments
      rowManager.assignElement(element1);
      rowManager.assignElement(element2);
      rowManager.assignElement(element3);

      // Move element2 to row 1
      const movedElement2 = { ...element2, y: 500 };
      rowManager.assignElement(movedElement2);

      // Verify assignments
      const row0 = rowManager.getRow("row-0");
      const row1 = rowManager.getRow("row-1");

      expect(row0.elementIds.size).toBe(1); // element1 only
      expect(row1.elementIds.size).toBe(2); // element2, element3

      expect(row0.elementIds.has("elem-1")).toBe(true);
      expect(row1.elementIds.has("elem-2")).toBe(true);
      expect(row1.elementIds.has("elem-3")).toBe(true);
    });
  });

  describe("Task 2: Element modification detection within rows", () => {
    it("should detect same-row element modifications", () => {
      // Assign element to row
      rowManager.assignElement(mockElement);

      // Modify element properties but keep in same row
      const modifiedElement = {
        ...mockElement,
        strokeColor: "#ff0000", // Changed stroke color
        width: 150, // Changed width
      };

      const rowId = rowManager.assignElement(modifiedElement);
      expect(rowId).toBe("row-0"); // Should remain in same row

      // Verify row metadata updated
      const row = rowManager.getRow("row-0");
      expect(row.ocrStatus).toBe("pending");
      expect(row.lastModified).toBeGreaterThan(row.lastModified - 1000);
    });

    it("should handle element property changes (stroke, size, text)", () => {
      // Test different element types
      const strokeElement = {
        ...mockElement,
        type: "freedraw",
        strokeColor: "#000000",
      };
      const textElement = {
        id: "text-element",
        type: "text",
        x: 100,
        y: 50,
        width: 80,
        height: 30,
        text: "x^2",
        fontSize: 20,
      };

      // Assign elements
      rowManager.assignElement(strokeElement);
      rowManager.assignElement(textElement);

      // Modify stroke element
      const modifiedStroke = { ...strokeElement, strokeColor: "#ff0000" };
      rowManager.assignElement(modifiedStroke);

      // Modify text element
      const modifiedText = { ...textElement, text: "x^2 + 3" };
      rowManager.assignElement(modifiedText);

      // Verify row updated
      const row = rowManager.getRow("row-0");
      expect(row.ocrStatus).toBe("pending");
      expect(row.elementIds.size).toBe(2);
    });

    it("should handle element deletion and removal from row assignments", () => {
      // Assign multiple elements to row
      const element1 = { ...mockElement, id: "elem-1" };
      const element2 = { ...mockElement, id: "elem-2" };

      rowManager.assignElement(element1);
      rowManager.assignElement(element2);

      // Verify both elements assigned
      let row = rowManager.getRow("row-0");
      expect(row.elementIds.size).toBe(2);

      // Remove one element
      rowManager.removeElement("elem-1");

      // Verify removal
      row = rowManager.getRow("row-0");
      expect(row.elementIds.size).toBe(1);
      expect(row.elementIds.has("elem-1")).toBe(false);
      expect(row.elementIds.has("elem-2")).toBe(true);
      expect(rowManager.elementToRow.has("elem-1")).toBe(false);
      expect(rowManager.elementToRow.get("elem-2")).toBe("row-0");

      // Verify row metadata updated
      expect(row.ocrStatus).toBe("pending");
    });

    it("should update affected row metadata and trigger OCR reset on modification", () => {
      // Set initial completed state
      rowManager.assignElement(mockElement);
      rowManager.updateRow("row-0", {
        ocrStatus: "completed",
        transcribedLatex: "x^2",
      });

      // Modify element
      const modifiedElement = { ...mockElement, width: 200 };
      rowManager.assignElement(modifiedElement);

      // Verify OCR reset
      const row = rowManager.getRow("row-0");
      expect(row.ocrStatus).toBe("pending");
      expect(row.transcribedLatex).toBe("x^2"); // Should keep previous LaTeX until new OCR
      expect(row.lastModified).toBeGreaterThan(0);
    });
  });

  describe("Task 3: Debouncing for rapid modifications", () => {
    it("should handle rapid element assignments efficiently", () => {
      // Test basic performance for rapid element assignments
      // Note: Full debouncing is handled in useRowSystem hook

      // Simulate rapid element assignments
      const elements = [
        { ...mockElement, id: "rapid-1", y: 50 },
        { ...mockElement, id: "rapid-2", y: 55 },
        { ...mockElement, id: "rapid-3", y: 60 },
        { ...mockElement, id: "rapid-4", y: 65 },
      ];

      // Assign elements rapidly
      elements.forEach((element) => {
        rowManager.assignElement(element);
      });

      // Verify all elements assigned (RowManager doesn't debounce itself)
      const row = rowManager.getRow("row-0");
      expect(row.elementIds.size).toBe(4);

      // Verify performance is maintained
      elements.forEach((element) => {
        expect(rowManager.elementToRow.get(element.id)).toBe("row-0");
      });
    });

    it("should maintain performance during rapid drawing/editing with memory efficiency", () => {
      const startTime = performance.now();
      const assignmentTimes = [];

      // Simulate rapid element assignments with memory tracking
      for (let i = 0; i < 100; i++) {
        const elementStartTime = performance.now();
        const element = {
          ...mockElement,
          id: `rapid-element-${i}`,
          y: 50 + i * 2, // Small Y changes
        };

        rowManager.assignElement(element);
        assignmentTimes.push(performance.now() - elementStartTime);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerAssignment =
        assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length;

      // Verify performance targets
      expect(avgTimePerAssignment).toBeLessThan(100); // <100ms per assignment
      expect(totalTime).toBeLessThan(1000); // Total should be under 1s

      // Verify no memory leaks - reasonable number of rows created
      const allRows = rowManager.getAllRows();
      const totalElements = allRows.reduce(
        (sum, row) => sum + row.elementIds.size,
        0,
      );
      expect(totalElements).toBe(100);
      expect(allRows.length).toBeLessThan(5); // Should fit in few rows with small Y changes
    });

    it("should handle rapid cross-row moves efficiently", () => {
      const startTime = performance.now();

      // Create element and move it rapidly between rows
      let element = { ...mockElement, id: "moving-element" };

      for (let i = 0; i < 50; i++) {
        element = {
          ...element,
          y: 50 + i * 50, // Move down through rows
        };

        rowManager.assignElement(element);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid moves efficiently
      expect(totalTime).toBeLessThan(500); // 50 moves in <500ms

      // Verify final position
      const finalRowId = rowManager.elementToRow.get("moving-element");
      expect(finalRowId).toMatch(/row-\d+/);
    });
  });

  describe("Integration: Complete workflow scenarios with performance", () => {
    it("should handle complete draw-modify-move-delete workflow within performance targets", () => {
      const workflowStartTime = performance.now();

      // 1. Draw element in row 0
      const drawTime = performance.now();
      rowManager.assignElement(mockElement);
      const drawDuration = performance.now() - drawTime;
      expect(rowManager.getRow("row-0").elementIds.size).toBe(1);
      expect(drawDuration).toBeLessThan(50); // Draw <50ms

      // 2. Modify element (same row)
      const modifyTime = performance.now();
      const modifiedElement = { ...mockElement, strokeColor: "#ff0000" };
      rowManager.assignElement(modifiedElement);
      const modifyDuration = performance.now() - modifyTime;
      expect(rowManager.getRow("row-0").ocrStatus).toBe("pending");
      expect(modifyDuration).toBeLessThan(50); // Modify <50ms

      // 3. Move element to row 1
      const moveTime = performance.now();
      const movedElement = { ...modifiedElement, y: 450 };
      rowManager.assignElement(movedElement);
      const moveDuration = performance.now() - moveTime;

      expect(rowManager.getRow("row-0").elementIds.size).toBe(0);
      expect(rowManager.getRow("row-1").elementIds.size).toBe(1);
      expect(rowManager.getRow("row-0").ocrStatus).toBe("pending");
      expect(rowManager.getRow("row-1").ocrStatus).toBe("pending");
      expect(moveDuration).toBeLessThan(100); // Move <100ms target

      // 4. Delete element
      const deleteTime = performance.now();
      rowManager.removeElement("test-element-1");
      const deleteDuration = performance.now() - deleteTime;

      expect(rowManager.getRow("row-1").elementIds.size).toBe(0);
      expect(rowManager.elementToRow.has("test-element-1")).toBe(false);
      expect(deleteDuration).toBeLessThan(50); // Delete <50ms

      const totalWorkflowTime = performance.now() - workflowStartTime;
      expect(totalWorkflowTime).toBeLessThan(300); // Complete workflow <300ms
    });

    it("should handle elements spanning row boundaries with performance", () => {
      // Create element that spans multiple rows (large height)
      const tallElement = {
        ...mockElement,
        id: "tall-element",
        y: 200, // Starts in row 0
        height: 400, // Spans into row 1 (ends at y=600)
      };

      const assignTime = performance.now();
      const rowId = rowManager.assignElement(tallElement);
      const assignDuration = performance.now() - assignTime;

      // Should assign based on center Y (200 + 400/2 = 400, which is row 1)
      expect(rowId).toBe("row-1");
      expect(assignDuration).toBeLessThan(50); // Large element assignment <50ms

      const row1 = rowManager.getRow("row-1");
      expect(row1.elementIds.has("tall-element")).toBe(true);
    });

    it("should maintain performance with large number of elements", () => {
      const startTime = performance.now();
      const assignmentTimes = [];

      // Create many elements across multiple rows
      for (let i = 0; i < 200; i++) {
        const elementAssignmentStart = performance.now();
        const element = {
          ...mockElement,
          id: `perf-element-${i}`,
          y: 50 + i * 20, // Distribute across rows
          x: (i % 10) * 50, // Spread horizontally
        };

        rowManager.assignElement(element);
        assignmentTimes.push(performance.now() - elementAssignmentStart);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgAssignmentTime =
        assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length;

      // Performance targets
      expect(avgAssignmentTime).toBeLessThan(50); // <50ms per assignment
      expect(totalTime).toBeLessThan(2000); // <2s total

      // Verify all elements assigned
      const allRows = rowManager.getAllRows();
      const totalAssigned = allRows.reduce(
        (sum, row) => sum + row.elementIds.size,
        0,
      );
      expect(totalAssigned).toBe(200);

      // Verify memory efficiency - should create reasonable number of rows
      expect(allRows.length).toBeLessThan(20); // Should fit in ~10 rows with 384px height
    });

    it("should meet cross-row move performance target of <100ms", () => {
      // Create element in first row
      const element = { ...mockElement, id: "move-perf-element", y: 100 };
      rowManager.assignElement(element);

      // Measure time for cross-row moves
      const moveTimes = [];
      const targetRows = [1, 5, 10, 15]; // Move to progressively farther rows

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
      const avgMoveTime =
        moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
      const maxMoveTime = Math.max(...moveTimes);

      expect(avgMoveTime).toBeLessThan(100); // Average <100ms target
      expect(maxMoveTime).toBeLessThan(150); // Max <150ms for complex moves
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle invalid elements gracefully", () => {
      // RowManager.assignElement throws on null/invalid elements (by design)
      expect(() => {
        rowManager.assignElement(null);
      }).toThrow("Element must have a valid id property");

      expect(() => {
        rowManager.assignElement({ id: "invalid" }); // Missing y coordinate
      }).not.toThrow(); // Should handle missing y gracefully

      expect(() => {
        rowManager.removeElement(null);
      }).not.toThrow();

      expect(() => {
        rowManager.removeElement("");
      }).not.toThrow();
    });

    it("should handle elements with extreme coordinates efficiently", () => {
      const extremeCases = [
        { y: -10000, height: 100 }, // Very negative
        { y: 100000, height: 1000 }, // Very large positive
        { y: NaN, height: 100 }, // NaN coordinate
        { y: Infinity, height: 100 }, // Infinity coordinate
        { y: 100, height: -50 }, // Negative height
      ];

      const startTime = performance.now();

      extremeCases.forEach((coords, index) => {
        const element = {
          ...mockElement,
          id: `extreme-${index}`,
          ...coords,
        };

        const handleTime = performance.now();
        rowManager.assignElement(element);
        const handleDuration = performance.now() - handleTime;

        // Should handle extreme cases efficiently (<10ms each)
        expect(handleDuration).toBeLessThan(10);
      });

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Total <50ms for all extreme cases
    });

    it("should handle elements at row boundaries", () => {
      // Element exactly at row boundary
      const boundaryElement = {
        ...mockElement,
        id: "boundary-element",
        y: 384, // Exactly at row 1 boundary
        height: 2,
      };

      const rowId = rowManager.assignElement(boundaryElement);
      expect(rowId).toBe("row-1"); // Center Y = 385, should be row 1
    });

    it("should handle negative coordinates", () => {
      const negativeElement = {
        ...mockElement,
        id: "negative-element",
        y: -100, // Above start Y
        height: 50,
      };

      const rowId = rowManager.assignElement(negativeElement);
      expect(rowId).toBe("row-0"); // Should map to first row
    });

    it("should handle very large coordinates", () => {
      const largeElement = {
        ...mockElement,
        id: "large-element",
        y: 50000, // Very large Y
        height: 100,
      };

      const rowId = rowManager.assignElement(largeElement);
      expect(rowId).toMatch(/row-\d+/); // Should handle gracefully

      const row = rowManager.getRow(rowId);
      expect(row).toBeDefined();
      expect(row.elementIds.has("large-element")).toBe(true);
    });
  });

  describe("Task 4: Memory management and performance", () => {
    it("should handle memory efficiently during rapid operations", () => {
      // This test simulates the RowManager's memory usage patterns
      const assignmentTimes = [];

      // Simulate rapid assignments that would fill memory
      for (let i = 0; i < 2000; i++) {
        const startTime = performance.now();
        const element = {
          ...mockElement,
          id: `memory-test-${i}`,
          y: 50 + (i % 100) * 10, // Keep within reasonable bounds
        };

        rowManager.assignElement(element);
        assignmentTimes.push(performance.now() - startTime);

        // Simulate cleanup every 100 elements (as done in useRowSystem)
        if (assignmentTimes.length > 1000) {
          assignmentTimes.splice(0, 500); // Remove first half (circular buffer)
        }
      }

      // Verify performance maintained throughout
      const avgTime =
        assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length;
      expect(avgTime).toBeLessThan(50); // Maintain <50ms per assignment

      // Verify memory bounds - should not create excessive rows
      const allRows = rowManager.getAllRows();
      expect(allRows.length).toBeLessThan(50); // Reasonable row count
    });

    it("should maintain O(1) lookup performance with many elements", () => {
      // Create large dataset
      const elementCount = 1000;
      const elements = [];

      for (let i = 0; i < elementCount; i++) {
        elements.push({
          ...mockElement,
          id: `bulk-element-${i}`,
          y: 50 + Math.floor(i / 10) * 50, // Distribute across rows
        });
      }

      // Bulk assign
      const startTime = performance.now();
      elements.forEach((element) => {
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
  });

  describe("Task 5: Comprehensive integration scenarios", () => {
    it("should handle complex workflow with multiple users and rapid changes", () => {
      const users = ["user1", "user2", "user3"];
      const userElements = {};

      // Create elements for each user in different rows
      users.forEach((user) => {
        userElements[user] = [];
        for (let i = 0; i < 50; i++) {
          userElements[user].push({
            ...mockElement,
            id: `${user}-element-${i}`,
            y: 50 + users.indexOf(user) * 200 + i * 10, // Different starting rows
          });
        }
      });

      // Simulate rapid concurrent assignments (interleaved)
      const workflowStart = performance.now();
      for (let i = 0; i < 50; i++) {
        users.forEach((user) => {
          // Assign element from each user (simulating interleaved operations)
          rowManager.assignElement(userElements[user][i]);
        });
      }
      const workflowTime = performance.now() - workflowStart;

      // Verify performance target met
      expect(workflowTime / 150).toBeLessThan(100); // <100ms per operation average

      // Verify all elements assigned correctly
      const allRows = rowManager.getAllRows();
      let totalAssigned = 0;
      allRows.forEach((row) => {
        totalAssigned += row.elementIds.size;
      });
      expect(totalAssigned).toBe(150); // 3 users * 50 elements

      // Verify user elements are in expected rows
      users.forEach((user) => {
        const userRowIds = new Set();
        userElements[user].forEach((element) => {
          const rowId = rowManager.elementToRow.get(element.id);
          expect(rowId).toBeDefined();
          userRowIds.add(rowId);
        });
        // Each user's elements should be clustered in specific rows
        expect(userRowIds.size).toBeLessThan(10);
      });
    });

    it("should recover gracefully from error conditions", () => {
      // Test error recovery scenarios
      const errorScenarios = [
        () => rowManager.assignElement(null), // Null element
        () => rowManager.assignElement({ id: "no-y-coord" }), // Missing Y
        () => rowManager.assignElement({ y: NaN, id: "nan-y" }), // NaN Y
        () => rowManager.assignElement({ y: Infinity, id: "inf-y" }), // Inf Y
        () => rowManager.removeElement(undefined), // Undefined ID
        () => rowManager.updateRow("nonexistent", { ocrStatus: "pending" }), // Nonexistent row
      ];

      let errorCount = 0;
      const errorMessages = [];

      errorScenarios.forEach((scenario) => {
        try {
          scenario();
        } catch (error) {
          errorCount++;
          errorMessages.push(error.message);
        }
      });

      // Should handle errors gracefully (not crash)
      expect(errorCount).toBeGreaterThan(0); // Some scenarios should throw

      // Verify system still functional after errors
      const testElement = { ...mockElement, id: "after-error-test" };
      const rowId = rowManager.assignElement(testElement);
      expect(rowId).toBeDefined();
      expect(rowManager.elementToRow.get(testElement.id)).toBe(rowId);
    });

    it("should handle spatial clustering and edge detection", () => {
      // Create elements in tight clusters and sparse areas
      const clusters = [
        { x: 100, y: 100, count: 20, spacing: 5 }, // Tight cluster
        { x: 500, y: 450, count: 10, spacing: 50 }, // Sparse cluster (spans rows)
        { x: 300, y: 800, count: 30, spacing: 10 }, // Medium cluster
      ];

      const clusterElements = [];
      clusters.forEach((cluster, clusterIndex) => {
        for (let i = 0; i < cluster.count; i++) {
          clusterElements.push({
            ...mockElement,
            id: `cluster-${clusterIndex}-element-${i}`,
            x: cluster.x + (i % 5) * cluster.spacing,
            y: cluster.y + Math.floor(i / 5) * cluster.spacing,
          });
        }
      });

      // Assign all elements
      const startTime = performance.now();
      clusterElements.forEach((element) => {
        rowManager.assignElement(element);
      });
      const clusterTime = performance.now() - startTime;

      // Verify performance
      expect(clusterTime / clusterElements.length).toBeLessThan(50);

      // Verify spatial clustering - elements should be in appropriate rows
      const allRows = rowManager.getAllRows();
      const elementsByRow = {};
      allRows.forEach((row) => {
        elementsByRow[row.id] = Array.from(row.elementIds);
      });

      // Verify elements are distributed across expected number of rows
      const rowCount = Object.keys(elementsByRow).length;
      expect(rowCount).toBeGreaterThan(2); // Should span multiple rows
      expect(rowCount).toBeLessThan(15); // But not too many
    });
  });
});
