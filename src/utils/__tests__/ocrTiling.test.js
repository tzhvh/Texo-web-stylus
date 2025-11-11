/**
 * Tests and examples for TilingEngine
 * Demonstrates various tiling scenarios
 */

import { TilingEngine } from '../ocrTiling';
import { getActiveModelConfig } from '../../config/ocrModels';

describe('TilingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new TilingEngine(384); // 384px row height
  });

  describe('Configuration', () => {
    test('should initialize with correct model config', () => {
      expect(engine.modelConfig).toBeDefined();
      expect(engine.modelConfig.id).toBe('formulanet');
      expect(engine.rowHeight).toBe(384);
    });

    test('should calculate overlap size correctly', () => {
      const config = engine.overlapConfig;
      expect(config.size).toBeGreaterThan(0);
      expect(config.size).toBeGreaterThanOrEqual(50); // minOverlap
      expect(config.size).toBeLessThanOrEqual(200); // maxOverlap

      // For 384px preferred width, 35% = 134px
      expect(config.size).toBeCloseTo(134, 0);
    });
  });

  describe('Single Tile Scenarios', () => {
    test('should create single tile for short expression', async () => {
      // Simulate elements for "x + 2"
      const elements = [
        { id: '1', type: 'freedraw', x: 10, y: 10, width: 50, height: 30 }, // x
        { id: '2', type: 'freedraw', x: 70, y: 15, width: 20, height: 20 }, // +
        { id: '3', type: 'freedraw', x: 100, y: 10, width: 30, height: 30 }  // 2
      ];

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      expect(tiles).toHaveLength(1);
      expect(tiles[0].index).toBe(0);
      expect(tiles[0].leftOverlap).toBeNull();
      expect(tiles[0].rightOverlap).toBeNull();
      expect(tiles[0].logicalWidth).toBe(384); // Standard width
    });

    test('should create single wide tile for medium expression', async () => {
      // Simulate elements spanning 500px
      const elements = [];
      for (let i = 0; i < 10; i++) {
        elements.push({
          id: `${i}`,
          type: 'freedraw',
          x: i * 50,
          y: 10,
          width: 40,
          height: 30
        });
      }

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      expect(tiles).toHaveLength(1);
      expect(tiles[0].logicalWidth).toBeGreaterThan(384);
      expect(tiles[0].isExtraWide).toBe(true);
      expect(tiles[0].scale).toBeLessThan(1); // Should be scaled down
    });
  });

  describe('Multi-Tile Scenarios', () => {
    test('should create overlapping tiles for long expression', async () => {
      // Simulate elements spanning 900px
      const elements = [];
      for (let i = 0; i < 20; i++) {
        elements.push({
          id: `${i}`,
          type: 'freedraw',
          x: i * 45,
          y: 10,
          width: 40,
          height: 30
        });
      }

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      expect(tiles.length).toBeGreaterThanOrEqual(2);

      // Check overlap tracking
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];

        if (i > 0) {
          // Should have left overlap
          expect(tile.leftOverlap).not.toBeNull();
          expect(tile.leftOverlap.sharedWith).toBe(i - 1);
          expect(tile.leftOverlap.size).toBeCloseTo(134, 0);
        } else {
          expect(tile.leftOverlap).toBeNull();
        }

        if (i < tiles.length - 1) {
          // Should have right overlap
          expect(tile.rightOverlap).not.toBeNull();
          expect(tile.rightOverlap.sharedWith).toBe(i + 1);
          expect(tile.rightOverlap.size).toBeCloseTo(134, 0);
        } else {
          expect(tile.rightOverlap).toBeNull();
        }
      }
    });

    test('should handle tile boundaries correctly', async () => {
      const elements = [];
      for (let i = 0; i < 20; i++) {
        elements.push({
          id: `${i}`,
          type: 'freedraw',
          x: i * 45,
          y: 10,
          width: 40,
          height: 30
        });
      }

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      // Verify tiles cover entire content range without gaps
      const contentBounds = engine.getContentBounds(elements);
      const firstTileStart = tiles[0].bounds.minX;
      const lastTileEnd = tiles[tiles.length - 1].bounds.maxX;

      expect(firstTileStart).toBeLessThanOrEqual(contentBounds.minX);
      expect(lastTileEnd).toBeGreaterThanOrEqual(contentBounds.maxX);

      // Verify overlaps connect properly
      for (let i = 1; i < tiles.length; i++) {
        const prevTile = tiles[i - 1];
        const currTile = tiles[i];

        // Current tile should start before previous tile ends (overlap)
        expect(currTile.bounds.minX).toBeLessThan(prevTile.bounds.maxX);
      }
    });
  });

  describe('Math Unit Detection', () => {
    test('should detect and preserve fractions', async () => {
      // Simulate fraction: numerator / denominator
      const elements = [
        // Numerator
        { id: '1', type: 'freedraw', x: 100, y: 10, width: 60, height: 30 },
        // Fraction line
        { id: '2', type: 'line', x: 90, y: 50, width: 80, height: 2, angle: 0 },
        // Denominator
        { id: '3', type: 'freedraw', x: 100, y: 60, width: 60, height: 30 }
      ];

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      expect(tiles).toHaveLength(1);
      expect(tiles[0].mathUnits).toHaveLength(1);
      expect(tiles[0].mathUnits[0].type).toBe('fraction');
      expect(tiles[0].mathUnits[0].critical).toBe(true);
    });

    test('should detect and preserve exponents', async () => {
      // Simulate x²
      const elements = [
        // Base: x
        { id: '1', type: 'freedraw', x: 100, y: 50, width: 40, height: 40 },
        // Exponent: 2 (smaller, higher)
        { id: '2', type: 'freedraw', x: 145, y: 40, width: 15, height: 15 }
      ];

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      expect(tiles).toHaveLength(1);

      const exponentUnits = tiles[0].mathUnits.filter(u => u.type === 'exponent');
      expect(exponentUnits.length).toBeGreaterThan(0);
      expect(exponentUnits[0].critical).toBe(true);
    });

    test('should avoid splitting critical units across tiles', async () => {
      // Create elements with a fraction at the boundary
      const elements = [];

      // Left side content (fills ~350px)
      for (let i = 0; i < 7; i++) {
        elements.push({
          id: `left-${i}`,
          type: 'freedraw',
          x: i * 50,
          y: 50,
          width: 40,
          height: 30
        });
      }

      // Fraction at ~350px (would normally be at tile boundary)
      elements.push(
        { id: 'num', type: 'freedraw', x: 360, y: 10, width: 60, height: 30 },
        { id: 'line', type: 'line', x: 350, y: 50, width: 80, height: 2, angle: 0 },
        { id: 'den', type: 'freedraw', x: 360, y: 60, width: 60, height: 30 }
      );

      // Right side content
      for (let i = 0; i < 7; i++) {
        elements.push({
          id: `right-${i}`,
          type: 'freedraw',
          x: 440 + i * 50,
          y: 50,
          width: 40,
          height: 30
        });
      }

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      // Should detect fraction
      const fractionsFound = tiles.some(t =>
        t.mathUnits.some(u => u.type === 'fraction')
      );
      expect(fractionsFound).toBe(true);

      // Verify fraction is not split across tiles
      for (const tile of tiles) {
        const hasFraction = tile.mathUnits.some(u => u.type === 'fraction');
        if (hasFraction) {
          // All fraction elements should be in this tile
          const fractionUnit = tile.mathUnits.find(u => u.type === 'fraction');
          const fractionElementIds = ['num', 'line', 'den'];

          const tileContainsAllFractionParts = fractionElementIds.every(id =>
            tile.elementIds.includes(id)
          );

          expect(tileContainsAllFractionParts).toBe(true);
        }
      }
    });
  });

  describe('Tile Rendering', () => {
    test('should calculate correct scale for oversized content', () => {
      const logicalWidth = 600;
      const logicalHeight = 384;

      const scale = engine.calculateScale(logicalWidth, logicalHeight);

      // Should scale to fit 384x384
      expect(scale).toBeLessThan(1);
      expect(logicalWidth * scale).toBeLessThanOrEqual(384);
      expect(logicalHeight * scale).toBeLessThanOrEqual(384);
    });

    test('should not upscale small content', () => {
      const logicalWidth = 200;
      const logicalHeight = 200;

      const scale = engine.calculateScale(logicalWidth, logicalHeight);

      expect(scale).toBe(1); // No upscaling
    });
  });

  describe('Caching', () => {
    test('should generate consistent hashes for same content', () => {
      const elements = [
        { id: '1', type: 'freedraw', x: 10, y: 10, width: 50, height: 30 },
        { id: '2', type: 'freedraw', x: 70, y: 15, width: 20, height: 20 }
      ];

      const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 50 };

      const hash1 = engine.hashTile(elements, bounds);
      const hash2 = engine.hashTile(elements, bounds);

      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different content', () => {
      const elements1 = [
        { id: '1', type: 'freedraw', x: 10, y: 10, width: 50, height: 30 }
      ];

      const elements2 = [
        { id: '2', type: 'freedraw', x: 10, y: 10, width: 50, height: 30 }
      ];

      const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 50 };

      const hash1 = engine.hashTile(elements1, bounds);
      const hash2 = engine.hashTile(elements2, bounds);

      expect(hash1).not.toBe(hash2);
    });

    test('should cache and retrieve tiles', () => {
      const hash = 'test-hash-123';
      const data = { latex: 'x^2 + 2x + 1', timestamp: Date.now() };

      engine.cacheTile(hash, data);

      const cached = engine.getCachedTile(hash);
      expect(cached).toBeDefined();
      expect(cached.latex).toBe(data.latex);
    });

    test('should respect cache TTL', () => {
      jest.useFakeTimers();

      const hash = 'test-hash-456';
      const data = { latex: 'y = mx + b', timestamp: Date.now() };

      engine.cacheTile(hash, data);

      // Fast forward 2 hours
      jest.advanceTimersByTime(2 * 60 * 60 * 1000);

      const cached = engine.getCachedTile(hash);
      expect(cached).toBeNull(); // Should be expired

      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty element list', async () => {
      const tiles = await engine.generateRowTiles(0, [], 1000);
      expect(tiles).toHaveLength(0);
    });

    test('should handle single element', async () => {
      const elements = [
        { id: '1', type: 'freedraw', x: 100, y: 100, width: 50, height: 30 }
      ];

      const tiles = await engine.generateRowTiles(0, elements, 1000);
      expect(tiles).toHaveLength(1);
    });

    test('should skip row divider lines', async () => {
      const elements = [
        { id: '1', type: 'line', x: 0, y: 384, width: 1000, height: 2, isRowDivider: true },
        { id: '2', type: 'freedraw', x: 100, y: 100, width: 50, height: 30 }
      ];

      const tiles = await engine.generateRowTiles(0, elements, 1000);

      expect(tiles).toHaveLength(1);
      expect(tiles[0].elements).toHaveLength(1);
      expect(tiles[0].elements[0].id).toBe('2');
    });

    test('should handle very wide single element', async () => {
      const elements = [
        { id: '1', type: 'freedraw', x: 10, y: 10, width: 1000, height: 30 }
      ];

      const tiles = await engine.generateRowTiles(0, elements, 2000);

      // Should create multiple tiles even for single element
      expect(tiles.length).toBeGreaterThanOrEqual(1);

      if (tiles.length > 1) {
        // Element should appear in multiple tiles (overlapping)
        expect(tiles[0].elements[0].id).toBe('1');
        expect(tiles[1].elements[0].id).toBe('1');
      }
    });
  });
});

// Example usage for documentation
export function exampleUsage() {
  console.log('=== TilingEngine Example Usage ===\n');

  const engine = new TilingEngine(384);

  // Example 1: Simple expression
  console.log('Example 1: Simple expression "x + 2"');
  const simpleElements = [
    { id: '1', type: 'freedraw', x: 10, y: 10, width: 50, height: 30 },
    { id: '2', type: 'freedraw', x: 70, y: 15, width: 20, height: 20 },
    { id: '3', type: 'freedraw', x: 100, y: 10, width: 30, height: 30 }
  ];

  engine.generateRowTiles(0, simpleElements, 1000).then(tiles => {
    console.log(`  Generated ${tiles.length} tile(s)`);
    tiles.forEach(tile => {
      console.log(`    Tile ${tile.index}: ${tile.logicalWidth}x${tile.logicalHeight}px`);
      console.log(`    Left overlap: ${tile.leftOverlap?.size || 0}px`);
      console.log(`    Right overlap: ${tile.rightOverlap?.size || 0}px`);
    });
  });

  // Example 2: Long expression with overlap
  console.log('\nExample 2: Long expression with overlapping tiles');
  const longElements = [];
  for (let i = 0; i < 20; i++) {
    longElements.push({
      id: `${i}`,
      type: 'freedraw',
      x: i * 45,
      y: 10,
      width: 40,
      height: 30
    });
  }

  engine.generateRowTiles(0, longElements, 1000).then(tiles => {
    console.log(`  Generated ${tiles.length} tile(s)`);
    tiles.forEach(tile => {
      console.log(`    Tile ${tile.index}:`);
      console.log(`      Bounds: x=${tile.bounds.minX.toFixed(0)}-${tile.bounds.maxX.toFixed(0)}`);
      console.log(`      Elements: ${tile.elements.length}`);
      console.log(`      Overlap L/R: ${tile.leftOverlap?.size || 0}/${tile.rightOverlap?.size || 0}px`);
      console.log(`      Math units: ${tile.mathUnits.length}`);
    });
  });
}
