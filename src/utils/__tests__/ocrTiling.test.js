/**
 * Unit tests for OCR Tiling utility
 *
 * Tests all acceptance criteria:
 * - AC#1: Tile dimensions (384x384)
 * - AC#2: Overlap strategy (64px, 16.7%)
 * - AC#3: Tile count calculation
 * - AC#4: Bounding box extraction
 * - AC#5: Image rendering (384x384 grayscale)
 * - AC#6: Tile metadata
 * - AC#7: Performance (<200ms)
 * - AC#8: Hash calculation
 * - AC#9: Edge cases
 * - AC#10: RowManager integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateTilePositions,
  calculateBoundingBox,
  extractTiles,
  renderTileImage,
  calculateTileHash,
  extractTilesWithImages,
  CONSTANTS,
} from '../ocrTiling.js';

describe('ocrTiling - TileExtractor', () => {
  // Test AC#1, #2, #3: Tile dimensions, overlap, and count calculation
  describe('calculateTilePositions', () => {
    it('should return single tile for narrow rows (≤384px)', () => {
      const positions = calculateTilePositions(200);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({
        offsetX: 0,
        width: 384,
      });
    });

    it('should return single tile for exactly 384px width', () => {
      const positions = calculateTilePositions(384);
      expect(positions).toHaveLength(1);
    });

    it('should return 2 tiles for 400px width', () => {
      // Formula: ceil((400 - 64) / 320) = ceil(336 / 320) = ceil(1.05) = 2
      const positions = calculateTilePositions(400);
      expect(positions).toHaveLength(2);
      expect(positions[0].offsetX).toBe(0);
      expect(positions[1].offsetX).toBe(320); // stride = 384 - 64 = 320
    });

    it('should return 3 tiles for 800px width', () => {
      // Formula: ceil((800 - 64) / 320) = ceil(736 / 320) = ceil(2.3) = 3
      const positions = calculateTilePositions(800);
      expect(positions).toHaveLength(3);
      expect(positions[0].offsetX).toBe(0);
      expect(positions[1].offsetX).toBe(320);
      expect(positions[2].offsetX).toBe(640);
    });

    it('should return 4 tiles for 1200px width', () => {
      // Formula: ceil((1200 - 64) / 320) = ceil(1136 / 320) = ceil(3.55) = 4
      const positions = calculateTilePositions(1200);
      expect(positions).toHaveLength(4);
      expect(positions).toEqual([
        { offsetX: 0, width: 384 },
        { offsetX: 320, width: 384 },
        { offsetX: 640, width: 384 },
        { offsetX: 960, width: 384 },
      ]);
    });

    it('should verify overlap is 64px (16.7%)', () => {
      expect(CONSTANTS.OVERLAP_PX).toBe(64);
      expect(CONSTANTS.OVERLAP_PX / CONSTANTS.TILE_SIZE).toBeCloseTo(0.167, 2);
    });

    it('should verify stride is 320px (384 - 64)', () => {
      expect(CONSTANTS.STRIDE).toBe(320);
      expect(CONSTANTS.STRIDE).toBe(CONSTANTS.TILE_SIZE - CONSTANTS.OVERLAP_PX);
    });

    it('should throw error for invalid width', () => {
      expect(() => calculateTilePositions(-100)).toThrow(TypeError);
      expect(() => calculateTilePositions(NaN)).toThrow(TypeError);
      expect(() => calculateTilePositions(Infinity)).toThrow(TypeError);
    });

    it('should throw error for invalid overlap', () => {
      expect(() => calculateTilePositions(800, -10)).toThrow(TypeError);
      expect(() => calculateTilePositions(800, 400)).toThrow(TypeError); // overlap >= tile size
    });
  });

  // Test AC#4: Bounding box extraction
  describe('calculateBoundingBox', () => {
    it('should calculate bbox from regular elements (x, y, width, height)', () => {
      const elements = [
        { id: 'e1', x: 100, y: 200, width: 50, height: 30 },
        { id: 'e2', x: 120, y: 210, width: 80, height: 40 },
      ];
      const elementIds = new Set(['e1', 'e2']);

      const bbox = calculateBoundingBox(elements, elementIds);

      expect(bbox).toEqual({
        minX: 100,
        minY: 200,
        maxX: 200, // 120 + 80
        maxY: 250, // 210 + 40
        width: 100,
        height: 50,
      });
    });

    it('should calculate bbox from stroke elements (array of x, y coordinates)', () => {
      const elements = [
        { id: 'stroke1', x: [100, 150, 200], y: [300, 320, 310] },
      ];
      const elementIds = new Set(['stroke1']);

      const bbox = calculateBoundingBox(elements, elementIds);

      expect(bbox).toEqual({
        minX: 100,
        minY: 300,
        maxX: 200,
        maxY: 320,
        width: 100,
        height: 20,
      });
    });

    it('should return null for empty row (no elements)', () => {
      const elements = [];
      const elementIds = new Set();

      const bbox = calculateBoundingBox(elements, elementIds);
      expect(bbox).toBeNull();
    });

    it('should return null when no matching elements found', () => {
      const elements = [
        { id: 'e1', x: 100, y: 200, width: 50, height: 30 },
      ];
      const elementIds = new Set(['e2', 'e3']); // IDs not in elements

      const bbox = calculateBoundingBox(elements, elementIds);
      expect(bbox).toBeNull();
    });

    it('should throw error for invalid bounding box (zero width)', () => {
      const elements = [
        { id: 'e1', x: 100, y: 200, width: 0, height: 30 },
      ];
      const elementIds = new Set(['e1']);

      expect(() => calculateBoundingBox(elements, elementIds)).toThrow(
        /Invalid bounding box.*FM-004/
      );
    });

    it('should throw error for invalid bounding box (negative dimensions)', () => {
      const elements = [
        { id: 'e1', x: 100, y: 200, width: -50, height: 30 },
      ];
      const elementIds = new Set(['e1']);

      expect(() => calculateBoundingBox(elements, elementIds)).toThrow(
        /Invalid bounding box/
      );
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateBoundingBox('not-array', new Set())).toThrow(TypeError);
      expect(() => calculateBoundingBox([], 'not-a-set')).toThrow(TypeError);
    });
  });

  // Test AC#6: Tile metadata structure
  describe('extractTiles', () => {
    it('should return tiles with complete metadata', () => {
      const row = {
        id: 'row-5',
        yStart: 1920, // 384 * 5
        yEnd: 2304,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 100, y: 1950, width: 500, height: 50 },
      ];

      const tiles = extractTiles(row, elements);

      expect(tiles).toHaveLength(2); // 500px width → 2 tiles
      expect(tiles[0]).toMatchObject({
        rowId: 'row-5',
        tileIndex: 0,
        offsetX: 100, // bbox.minX
        offsetY: 1920, // row.yStart
        width: 384,
        height: 384,
        overlap: 0, // First tile
      });
      expect(tiles[1]).toMatchObject({
        rowId: 'row-5',
        tileIndex: 1,
        offsetX: 420, // 100 + 320 (stride)
        offsetY: 1920,
        width: 384,
        height: 384,
        overlap: 64, // Subsequent tiles
      });
    });

    it('should return empty array for empty row', () => {
      const row = {
        id: 'row-0',
        yStart: 0,
        yEnd: 384,
        elementIds: new Set(),
      };
      const elements = [];

      const tiles = extractTiles(row, elements);
      expect(tiles).toEqual([]);
    });

    it('should return single tile for narrow row (<384px)', () => {
      const row = {
        id: 'row-2',
        yStart: 768,
        yEnd: 1152,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 100, y: 800, width: 200, height: 50 }, // 200px wide
      ];

      const tiles = extractTiles(row, elements);
      expect(tiles).toHaveLength(1);
      expect(tiles[0].overlap).toBe(0);
    });

    it('should throw error for invalid row', () => {
      expect(() => extractTiles(null, [])).toThrow(TypeError);
      expect(() => extractTiles({}, [])).toThrow(TypeError); // missing id
      expect(() => extractTiles({ id: 'row-1' }, [])).toThrow(TypeError); // missing elementIds
    });

    it('should throw error for invalid elements', () => {
      const row = {
        id: 'row-1',
        yStart: 384,
        yEnd: 768,
        elementIds: new Set(['e1']),
      };

      expect(() => extractTiles(row, 'not-array')).toThrow(TypeError);
    });
  });

  // Test AC#5, #6: Image rendering and hash calculation
  describe('renderTileImage', () => {
    let mockCanvas;
    let mockCtx;
    let mockImageData;

    beforeEach(() => {
      // Create mock canvas context
      mockImageData = {
        width: 384,
        height: 384,
        data: new Uint8ClampedArray(384 * 384 * 4), // RGBA
      };

      // Fill with test pattern (RGB values)
      for (let i = 0; i < mockImageData.data.length; i += 4) {
        mockImageData.data[i] = 100; // R
        mockImageData.data[i + 1] = 150; // G
        mockImageData.data[i + 2] = 200; // B
        mockImageData.data[i + 3] = 255; // A
      }

      mockCtx = {
        getImageData: vi.fn().mockReturnValue(mockImageData),
      };
    });

    it('should render 384x384 grayscale ImageData', () => {
      const tile = {
        rowId: 'row-1',
        tileIndex: 0,
        offsetX: 100,
        offsetY: 384,
        width: 384,
        height: 384,
        overlap: 0,
      };

      const imageData = renderTileImage(mockCtx, tile);

      expect(mockCtx.getImageData).toHaveBeenCalledWith(100, 384, 384, 384);
      expect(imageData.width).toBe(384);
      expect(imageData.height).toBe(384);

      // Verify grayscale conversion (R === G === B)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        expect(r).toBe(g);
        expect(g).toBe(b);
      }
    });

    it('should apply grayscale formula (0.299R + 0.587G + 0.114B)', () => {
      const tile = {
        rowId: 'row-1',
        tileIndex: 0,
        offsetX: 0,
        offsetY: 0,
        width: 384,
        height: 384,
        overlap: 0,
      };

      const imageData = renderTileImage(mockCtx, tile);

      // Expected grayscale: 0.299 * 100 + 0.587 * 150 + 0.114 * 200
      // = 29.9 + 88.05 + 22.8 = 140.75 → 141 (rounded)
      const expectedGray = Math.round(0.299 * 100 + 0.587 * 150 + 0.114 * 200);

      expect(imageData.data[0]).toBe(expectedGray);
      expect(imageData.data[1]).toBe(expectedGray);
      expect(imageData.data[2]).toBe(expectedGray);
      expect(imageData.data[3]).toBe(255); // Alpha unchanged
    });

    it('should throw error for invalid canvas context', () => {
      const tile = { offsetX: 0, offsetY: 0 };
      expect(() => renderTileImage(null, tile)).toThrow(TypeError);
      expect(() => renderTileImage({}, tile)).toThrow(TypeError); // no getImageData
    });

    it('should throw error for invalid tile', () => {
      expect(() => renderTileImage(mockCtx, null)).toThrow(TypeError);
      expect(() => renderTileImage(mockCtx, {})).toThrow(TypeError);
    });
  });

  // Test AC#8: Hash calculation
  describe('calculateTileHash', () => {
    it('should generate consistent hash for same ImageData', () => {
      const imageData = {
        width: 384,
        height: 384,
        data: new Uint8ClampedArray(384 * 384 * 4),
      };

      // Fill with pattern
      for (let i = 0; i < imageData.data.length; i++) {
        imageData.data[i] = i % 256;
      }

      const hash1 = calculateTileHash(imageData);
      const hash2 = calculateTileHash(imageData);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{16}$/); // 16-char hex string
    });

    it('should generate different hashes for different ImageData', () => {
      const imageData1 = {
        width: 384,
        height: 384,
        data: new Uint8ClampedArray(384 * 384 * 4),
      };

      const imageData2 = {
        width: 384,
        height: 384,
        data: new Uint8ClampedArray(384 * 384 * 4),
      };

      // Fill with different patterns
      for (let i = 0; i < imageData1.data.length; i++) {
        imageData1.data[i] = i % 256;
        imageData2.data[i] = (i + 50) % 256; // Different pattern
      }

      const hash1 = calculateTileHash(imageData1);
      const hash2 = calculateTileHash(imageData2);

      expect(hash1).not.toBe(hash2);
    });

    it('should complete hash calculation in <10ms', () => {
      const imageData = {
        width: 384,
        height: 384,
        data: new Uint8ClampedArray(384 * 384 * 4),
      };

      const start = performance.now();
      calculateTileHash(imageData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should throw error for invalid ImageData', () => {
      expect(() => calculateTileHash(null)).toThrow(TypeError);
      expect(() => calculateTileHash({})).toThrow(TypeError);
      expect(() => calculateTileHash({ data: null })).toThrow(TypeError);
    });
  });

  // Test AC#7: Performance budget (<200ms for 5-tile row)
  describe('extractTilesWithImages - Performance', () => {
    let mockCtx;

    beforeEach(() => {
      // Mock canvas context with fast getImageData
      const mockImageData = {
        width: 384,
        height: 384,
        data: new Uint8ClampedArray(384 * 384 * 4),
      };

      mockCtx = {
        getImageData: vi.fn().mockReturnValue(mockImageData),
      };
    });

    it('should complete extraction in <200ms for 5-tile row', () => {
      const row = {
        id: 'row-3',
        yStart: 1152,
        yEnd: 1536,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 100, y: 1200, width: 1600, height: 50 }, // ~5 tiles
      ];

      const start = performance.now();
      const tiles = extractTilesWithImages(row, elements, mockCtx);
      const duration = performance.now() - start;

      expect(tiles).toHaveLength(5);
      expect(duration).toBeLessThan(200);
    });
  });

  // Test AC#10: Integration with RowManager
  describe('RowManager Integration', () => {
    it('should accept row object from RowManager with elementIds Set', () => {
      const row = {
        id: 'row-0',
        yStart: 0,
        yEnd: 384,
        elementIds: new Set(['e1', 'e2']),
        ocrStatus: 'pending',
        validationStatus: 'pending',
        transcribedLatex: null,
        validationResult: null,
        lastModified: Date.now(),
        tileHash: null,
        errorMessage: null,
      };

      const elements = [
        { id: 'e1', x: 100, y: 50, width: 200, height: 30 },
        { id: 'e2', x: 150, y: 70, width: 100, height: 20 },
      ];

      const tiles = extractTiles(row, elements);

      expect(tiles).toBeDefined();
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles[0].rowId).toBe('row-0');
    });

    it('should use row.id in tile metadata', () => {
      const row = {
        id: 'row-15',
        yStart: 5760,
        yEnd: 6144,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 200, y: 5800, width: 400, height: 50 },
      ];

      const tiles = extractTiles(row, elements);

      tiles.forEach(tile => {
        expect(tile.rowId).toBe('row-15');
      });
    });

    it('should use row.yStart as offsetY for all tiles', () => {
      const row = {
        id: 'row-7',
        yStart: 2688,
        yEnd: 3072,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 100, y: 2700, width: 800, height: 50 },
      ];

      const tiles = extractTiles(row, elements);

      tiles.forEach(tile => {
        expect(tile.offsetY).toBe(2688);
      });
    });
  });

  // Test edge cases comprehensively (AC#9)
  describe('Edge Cases', () => {
    it('should handle row with zero-width elements gracefully', () => {
      const row = {
        id: 'row-1',
        yStart: 384,
        yEnd: 768,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 100, y: 400, width: 0, height: 50 },
      ];

      expect(() => extractTiles(row, elements)).toThrow(/FM-004/);
    });

    it('should handle row with elements outside row bounds', () => {
      const row = {
        id: 'row-2',
        yStart: 768,
        yEnd: 1152,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 100, y: 500, width: 200, height: 30 }, // y=500 outside row
      ];

      const tiles = extractTiles(row, elements);
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles[0].offsetY).toBe(768); // Uses row.yStart regardless
    });

    it('should handle very wide row (many tiles)', () => {
      const row = {
        id: 'row-10',
        yStart: 3840,
        yEnd: 4224,
        elementIds: new Set(['e1']),
      };
      const elements = [
        { id: 'e1', x: 0, y: 3900, width: 3200, height: 50 }, // ~10 tiles
      ];

      const tiles = extractTiles(row, elements);
      expect(tiles.length).toBe(10);

      // Verify all tiles have correct metadata
      tiles.forEach((tile, index) => {
        expect(tile.tileIndex).toBe(index);
        expect(tile.width).toBe(384);
        expect(tile.height).toBe(384);
        expect(tile.overlap).toBe(index > 0 ? 64 : 0);
      });
    });
  });
});
