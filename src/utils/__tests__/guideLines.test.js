import { describe, it, expect } from 'vitest';

// Mock the Excalidraw convertToExcalidrawElements function
const mockConvertToExcalidrawElements = (elements) => {
  return elements.map(el => ({
    ...el,
    id: el.id || `mock-${Date.now()}`,
    seed: 1,
    versionNonce: 1,
  }));
};

const CANVAS_CONFIG = {
  MAX_WIDTH: 10000,
};

// Copy the createGuideLine function from MagicCanvas
const createGuideLine = (y, id) => {
  const guideLine = mockConvertToExcalidrawElements([
    {
      type: "line",
      x: 0,
      y: y,
      width: CANVAS_CONFIG.MAX_WIDTH,
      height: 0,
      strokeColor: "#d3d3d3",
      backgroundColor: "transparent",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 30,
      locked: true,
      isDeleted: false,
      id: id || `guide-${y}`,
    },
  ]);
  return guideLine[0];
};

// Copy createActiveRowHighlight from MagicCanvas
const createActiveRowHighlight = (row) => {
  if (!row) return null;

  const highlight = mockConvertToExcalidrawElements([
    {
      type: "rectangle",
      x: 0,
      y: row.yStart,
      width: CANVAS_CONFIG.MAX_WIDTH,
      height: row.yEnd - row.yStart,
      strokeColor: "#3b82f6", // Blue highlight
      backgroundColor: "transparent", // Transparent background
      strokeWidth: 2, // Distinct border
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      locked: true, // Prevent interaction
      isDeleted: false,
      id: `highlight-${row.id}`,
    },
  ]);
  return highlight[0];
};

// Copy the generateGuideLines function from MagicCanvas
const generateGuideLines = (spacing = 384) => {
  const guideLines = [];
  for (let y = -50000; y <= 50000; y += spacing) {
    guideLines.push(createGuideLine(y));
  }
  return guideLines;
};

describe('Guide Line Generation (Story 1.3)', () => {
  it('should generate guide lines with correct 384px spacing', () => {
    const guideLines = generateGuideLines(384);

    // Should generate approximately 260 lines for 100,000px canvas
    expect(guideLines.length).toBeGreaterThan(250);
    expect(guideLines.length).toBeLessThan(270);

    // Check spacing between consecutive lines
    for (let i = 1; i < Math.min(guideLines.length, 10); i++) {
      const prevY = guideLines[i - 1].y;
      const currY = guideLines[i].y;
      expect(currY - prevY).toBe(384);
    }
  });

  it('should generate guide lines with correct properties', () => {
    const guideLines = generateGuideLines(384);
    const firstLine = guideLines[0];

    expect(firstLine.type).toBe('line');
    expect(firstLine.width).toBe(10000); // Updated MAX_WIDTH
    expect(firstLine.height).toBe(0);
    expect(firstLine.strokeColor).toBe('#d3d3d3'); // Updated color
    expect(firstLine.strokeWidth).toBe(1);
    expect(firstLine.locked).toBe(true);
    expect(firstLine.isDeleted).toBe(false);
    expect(firstLine.opacity).toBe(30);
  });

  it('should use correct ID pattern for guide lines', () => {
    const guideLines = generateGuideLines(384);
    const firstLine = guideLines[0];

    expect(firstLine.id).toBe('guide--50000');
  });

  it('should handle different spacing values', () => {
    const lines100 = generateGuideLines(100);
    const lines384 = generateGuideLines(384);

    // 384px spacing should generate fewer lines than 100px spacing
    expect(lines384.length).toBeLessThan(lines100.length);

    // Check that 384px spacing is actually used
    for (let i = 1; i < Math.min(lines384.length, 5); i++) {
      const prevY = lines384[i - 1].y;
      const currY = lines384[i].y;
      expect(currY - prevY).toBe(384);
    }
  });
});

describe('Active Row Highlighting (Story 1.3)', () => {
  it('should generate highlight element for active row', () => {
    const mockRow = {
      id: 'row-1',
      yStart: 384,
      yEnd: 768,
      isActive: true
    };

    const highlight = createActiveRowHighlight(mockRow);

    expect(highlight).toBeDefined();
    expect(highlight.type).toBe('rectangle');
    expect(highlight.y).toBe(384);
    expect(highlight.height).toBe(384);
    expect(highlight.width).toBe(10000);
    expect(highlight.strokeColor).toBe('#3b82f6');
    expect(highlight.strokeWidth).toBe(2);
    expect(highlight.locked).toBe(true);
    expect(highlight.id).toBe('highlight-row-1');
  });

  it('should return null if no row provided', () => {
    const highlight = createActiveRowHighlight(null);
    expect(highlight).toBeNull();
  });
});