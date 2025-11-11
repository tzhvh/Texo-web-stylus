/**
 * Variable-Dimension Tiling Engine with Overlap Tracking
 * Intelligently splits canvas content into tiles for OCR processing
 * with defensive math unit detection and overlap regions for verification
 */

import RBush from 'rbush';
import CryptoJS from 'crypto-js';
import { getActiveModelConfig } from '../config/ocrModels';
import { MathUnitDetector } from './mathUnits';
import Logger from './logger';

export class TilingEngine {
  constructor(rowHeight = 384) {
    this.rowHeight = rowHeight;
    this.modelConfig = getActiveModelConfig();
    this.mathDetector = new MathUnitDetector();
    this.tileCache = new Map(); // hash → {latex, timestamp, tile}

    // Calculate overlap configuration
    this.overlapConfig = this.calculateOverlapSize();

    Logger.debug('TilingEngine', 'Initialized', {
      rowHeight,
      model: this.modelConfig.id,
      overlapSize: this.overlapConfig.size,
      preferredTileWidth: this.modelConfig.preferredTileWidth
    });
  }

  /**
   * Calculate overlap size based on model configuration
   */
  calculateOverlapSize() {
    const config = this.modelConfig.tileOverlap;

    if (config.strategy === 'percentage') {
      const baseOverlap = this.modelConfig.preferredTileWidth * config.value;
      const size = Math.max(
        config.minOverlap,
        Math.min(config.maxOverlap, baseOverlap)
      );

      return {
        size: Math.round(size),
        isPercentage: true,
        percentage: config.value,
        config
      };
    } else {
      return {
        size: config.value,
        isPercentage: false,
        config
      };
    }
  }

  /**
   * Generate tiles for a single row
   * Returns tiles with variable dimensions and overlap tracking
   *
   * @param {number} rowId - Row identifier
   * @param {Array} elements - Excalidraw elements in the row
   * @param {number} canvasWidth - Total canvas width
   * @returns {Promise<Array>} Array of tile objects
   */
  async generateRowTiles(rowId, elements, canvasWidth = 10000) {
    const startTime = performance.now();

    const row = {
      id: rowId,
      y: rowId * this.rowHeight,
      height: this.rowHeight
    };

    Logger.debug('TilingEngine', `Generating tiles for row ${rowId}`, {
      elementCount: elements.length,
      rowY: row.y
    });

    // 1. Build spatial index for fast queries
    const spatialIndex = this.buildSpatialIndex(elements);

    // 2. Find content bounds
    const contentBounds = this.getContentBounds(elements);
    if (!contentBounds) {
      Logger.debug('TilingEngine', `Row ${rowId} is empty`);
      return [];
    }

    const contentWidth = contentBounds.maxX - contentBounds.minX;
    Logger.debug('TilingEngine', `Content bounds: ${contentWidth}px wide`, contentBounds);

    // 3. Detect mathematical units (defensive - only critical ones)
    const mathUnits = this.mathDetector.findUnits(elements);
    Logger.debug('TilingEngine', `Detected ${mathUnits.length} math units`, {
      types: mathUnits.map(u => u.type)
    });

    // 4. Generate tiles with variable dimensions and overlap
    const tiles = this.splitIntoVariableTiles(
      elements,
      contentBounds,
      spatialIndex,
      mathUnits,
      rowId
    );

    const elapsed = performance.now() - startTime;
    Logger.info('TilingEngine', `Generated ${tiles.length} tiles for row ${rowId} in ${elapsed.toFixed(1)}ms`);

    return tiles;
  }

  /**
   * Split content into variable-sized tiles with overlap
   */
  splitIntoVariableTiles(elements, bounds, spatialIndex, mathUnits, rowId) {
    const tiles = [];
    const contentWidth = bounds.maxX - bounds.minX;

    // Single tile if content fits
    if (contentWidth <= this.modelConfig.inputSize.width) {
      const tile = this.createVariableTile(
        elements,
        bounds,
        0,
        mathUnits,
        null, // no leftOverlap
        null, // no rightOverlap
        rowId
      );
      tiles.push(tile);
      Logger.debug('TilingEngine', 'Single tile sufficient', { contentWidth });
      return tiles;
    }

    // Multi-tile strategy with overlap
    let currentX = bounds.minX;
    let tileIndex = 0;
    let previousTile = null;

    Logger.debug('TilingEngine', `Starting multi-tile split, content width: ${contentWidth}px`);

    while (currentX < bounds.maxX) {
      // Calculate overlap with previous tile
      const leftOverlapSize = previousTile
        ? this.calculateActualOverlap(
            previousTile.bounds.maxX - this.overlapConfig.size,
            currentX
          )
        : 0;

      // Proposed tile endpoint (standard width)
      const standardEndX = currentX + this.modelConfig.preferredTileWidth;

      // Check for math units in this range
      const affectedUnits = this.findUnitsInRange(mathUnits, currentX, standardEndX);

      let tileEndX;
      let tileBounds;

      Logger.debug('TilingEngine', `Tile ${tileIndex}: start=${currentX.toFixed(0)}, proposed end=${standardEndX.toFixed(0)}`, {
        affectedUnits: affectedUnits.length
      });

      // Adjust endpoint if critical math units are affected
      if (affectedUnits.length > 0 && this.hasCriticalUnits(affectedUnits)) {
        Logger.debug('TilingEngine', `Tile ${tileIndex}: adjusting for ${affectedUnits.length} critical units`);

        const adjustment = this.adjustForMathUnits(
          currentX,
          standardEndX,
          affectedUnits,
          spatialIndex,
          bounds
        );

        tileEndX = adjustment.endX;

        Logger.debug('TilingEngine', `Tile ${tileIndex}: adjusted endpoint to ${tileEndX.toFixed(0)}`);
      } else {
        // Try to find whitespace gap for cleaner split
        const gap = this.findWhitespaceGap(currentX, standardEndX, spatialIndex, bounds);
        tileEndX = gap ? gap.x : Math.min(standardEndX, bounds.maxX);

        if (gap) {
          Logger.debug('TilingEngine', `Tile ${tileIndex}: found whitespace gap at ${gap.x.toFixed(0)}`);
        }
      }

      // Calculate overlap with next tile
      const rightOverlapSize = (tileEndX < bounds.maxX)
        ? this.overlapConfig.size
        : 0;

      // Define tile bounds with overlap regions
      tileBounds = {
        minX: currentX - leftOverlapSize,
        maxX: tileEndX + rightOverlapSize,
        minY: bounds.minY,
        maxY: bounds.maxY,

        // Overlap metadata
        leftOverlap: leftOverlapSize > 0 ? {
          start: currentX - leftOverlapSize,
          end: currentX,
          size: leftOverlapSize,
          sharedWith: previousTile ? previousTile.index : null
        } : null,

        rightOverlap: rightOverlapSize > 0 ? {
          start: tileEndX,
          end: tileEndX + rightOverlapSize,
          size: rightOverlapSize,
          sharedWith: tileIndex + 1 // Next tile
        } : null
      };

      // Extract elements for this tile
      const tileElements = this.getElementsInRegion(
        spatialIndex,
        tileBounds.minX,
        tileBounds.maxX,
        tileBounds.minY,
        tileBounds.maxY
      );

      Logger.debug('TilingEngine', `Tile ${tileIndex}: ${tileElements.length} elements`, {
        leftOverlap: leftOverlapSize,
        rightOverlap: rightOverlapSize,
        bounds: tileBounds
      });

      // Create tile with overlap info
      const tile = this.createVariableTile(
        tileElements,
        tileBounds,
        tileIndex,
        affectedUnits,
        tileBounds.leftOverlap,
        tileBounds.rightOverlap,
        rowId
      );

      tiles.push(tile);

      // Store reference for next iteration
      previousTile = tile;

      // Move to next position (non-overlapping start)
      currentX = tileEndX;
      tileIndex++;
    }

    Logger.info('TilingEngine', `Created ${tiles.length} overlapping tiles`);
    return tiles;
  }

  /**
   * Create tile with variable dimensions and overlap regions tracked
   */
  createVariableTile(elements, bounds, index, mathUnits, leftOverlap, rightOverlap, rowId) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // Calculate logical dimensions (before scaling)
    const logicalDimensions = this.calculateLogicalDimensions(width, height);

    // Calculate scale to fit into model input size
    const scale = this.calculateScale(
      logicalDimensions.width,
      logicalDimensions.height
    );

    // Calculate padding to center content
    const scaledWidth = logicalDimensions.width * scale;
    const scaledHeight = logicalDimensions.height * scale;
    const paddingX = (this.modelConfig.inputSize.width - scaledWidth) / 2;
    const paddingY = (this.modelConfig.inputSize.height - scaledHeight) / 2;

    // Generate hash for caching
    const hash = this.hashTile(elements, bounds);

    const tile = {
      // Identity
      index,
      rowId,
      hash,

      // Elements
      elements,
      elementIds: elements.map(el => el.id),

      // Bounds (canvas coordinates)
      bounds,

      // Logical dimensions (before scaling to model input)
      logicalWidth: logicalDimensions.width,
      logicalHeight: logicalDimensions.height,

      // Output dimensions (model input size)
      outputWidth: this.modelConfig.inputSize.width,
      outputHeight: this.modelConfig.inputSize.height,

      // Transform parameters
      scale,
      padding: { x: paddingX, y: paddingY },

      // Reconstruction info
      offsetX: bounds.minX,
      offsetY: bounds.minY,

      // Metadata
      mathUnits: mathUnits.map(u => ({
        type: u.type,
        bounds: u.bounds,
        confidence: u.confidence,
        critical: u.critical
      })),
      isExtraWide: logicalDimensions.width > this.modelConfig.preferredTileWidth,
      isExtraTall: logicalDimensions.height > this.modelConfig.inputSize.height,

      // Overlap tracking
      leftOverlap: leftOverlap ? {
        ...leftOverlap,
        // Convert pixel coordinates to scaled tile coordinates
        startInTile: (leftOverlap.start - bounds.minX) * scale + paddingX,
        endInTile: (leftOverlap.end - bounds.minX) * scale + paddingX,
        widthInTile: leftOverlap.size * scale
      } : null,

      rightOverlap: rightOverlap ? {
        ...rightOverlap,
        startInTile: (rightOverlap.start - bounds.minX) * scale + paddingX,
        endInTile: (rightOverlap.end - bounds.minX) * scale + paddingX,
        widthInTile: rightOverlap.size * scale
      } : null,

      // Will be populated after OCR
      latex: null,
      leftOverlapLatex: null,  // LaTeX for left overlap region
      rightOverlapLatex: null, // LaTeX for right overlap region
      ocrTime: null,
      ocrError: null
    };

    Logger.debug('TilingEngine', `Created tile ${index}`, {
      logicalSize: `${logicalDimensions.width}x${logicalDimensions.height}`,
      scale: scale.toFixed(3),
      outputSize: `${tile.outputWidth}x${tile.outputHeight}`,
      leftOverlap: leftOverlap?.size || 0,
      rightOverlap: rightOverlap?.size || 0,
      mathUnits: mathUnits.length
    });

    return tile;
  }

  /**
   * Calculate logical tile dimensions based on content
   */
  calculateLogicalDimensions(contentWidth, contentHeight) {
    // Height should match row height (384px by default)
    const logicalHeight = this.rowHeight;

    // Width is flexible based on content
    let logicalWidth;

    if (contentWidth <= this.modelConfig.preferredTileWidth) {
      // Standard width
      logicalWidth = this.modelConfig.preferredTileWidth;
    } else if (contentWidth <= this.modelConfig.maxTileWidth) {
      // Wide tile (will be scaled down)
      logicalWidth = contentWidth;
    } else {
      // Ultra-wide content - cap at max
      logicalWidth = this.modelConfig.maxTileWidth;
      Logger.warn('TilingEngine', `Content width ${contentWidth}px exceeds max tile width ${this.modelConfig.maxTileWidth}px, will be clipped`);
    }

    return { width: Math.round(logicalWidth), height: Math.round(logicalHeight) };
  }

  /**
   * Calculate scale factor to fit logical dimensions into model input size
   */
  calculateScale(logicalWidth, logicalHeight) {
    const scaleX = this.modelConfig.inputSize.width / logicalWidth;
    const scaleY = this.modelConfig.inputSize.height / logicalHeight;

    // Use the smaller scale to maintain aspect ratio
    const scale = Math.min(scaleX, scaleY, 1.0);

    return scale;
  }

  /**
   * Adjust tile boundaries for mathematical units
   */
  adjustForMathUnits(startX, proposedEndX, units, spatialIndex, bounds) {
    const criticalUnits = units.filter(u => u.critical);

    // Strategy 1: If critical unit starts in tile, try to include it all
    for (const unit of criticalUnits) {
      if (unit.bounds.minX >= startX && unit.bounds.minX < proposedEndX) {
        // Unit starts in tile, include entire unit
        const newEndX = Math.max(proposedEndX, unit.bounds.maxX + 10);
        const newWidth = newEndX - startX;

        // Check if this creates an acceptable tile
        if (newWidth <= this.modelConfig.maxTileWidth) {
          Logger.debug('TilingEngine', `Extended tile to include ${unit.type}`, {
            unitBounds: unit.bounds,
            newEndX,
            newWidth
          });

          return {
            endX: newEndX,
            bounds: {
              minX: startX,
              maxX: newEndX,
              minY: bounds.minY,
              maxY: bounds.maxY
            },
            reason: `included_${unit.type}`
          };
        }
      }

      // Strategy 2: If unit crosses boundary, decide whether to include or exclude
      if (unit.bounds.maxX > proposedEndX && unit.bounds.minX < proposedEndX) {
        // Option A: Shrink tile to before unit starts
        const shrunkEndX = unit.bounds.minX - 10;
        if (shrunkEndX - startX >= this.modelConfig.minTileWidth) {
          Logger.debug('TilingEngine', `Shrunk tile to avoid splitting ${unit.type}`, {
            unitBounds: unit.bounds,
            shrunkEndX
          });

          return {
            endX: shrunkEndX,
            bounds: {
              minX: startX,
              maxX: shrunkEndX,
              minY: bounds.minY,
              maxY: bounds.maxY
            },
            reason: `excluded_${unit.type}`
          };
        }

        // Option B: Include entire unit (may create wide tile)
        const extendedEndX = unit.bounds.maxX + 10;
        if (extendedEndX - startX <= this.modelConfig.maxTileWidth) {
          Logger.debug('TilingEngine', `Extended tile to include ${unit.type}`, {
            unitBounds: unit.bounds,
            extendedEndX
          });

          return {
            endX: extendedEndX,
            bounds: {
              minX: startX,
              maxX: extendedEndX,
              minY: bounds.minY,
              maxY: bounds.maxY
            },
            reason: `included_${unit.type}`
          };
        }
      }
    }

    // Strategy 3: Find whitespace gap near boundary
    const gap = this.findWhitespaceGap(startX, proposedEndX, spatialIndex, bounds);
    if (gap) {
      return {
        endX: gap.x,
        bounds: {
          minX: startX,
          maxX: gap.x,
          minY: bounds.minY,
          maxY: bounds.maxY
        },
        reason: 'whitespace_gap'
      };
    }

    // Fallback: use proposed boundary
    return {
      endX: proposedEndX,
      bounds: {
        minX: startX,
        maxX: proposedEndX,
        minY: bounds.minY,
        maxY: bounds.maxY
      },
      reason: 'standard'
    };
  }

  /**
   * Find vertical whitespace gap for clean splitting
   */
  findWhitespaceGap(startX, endX, spatialIndex, bounds) {
    const SCAN_WIDTH = 5;
    const MIN_GAP_WIDTH = 15;

    for (let x = startX + 50; x < endX - 50; x += 5) {
      const elementsInGap = spatialIndex.search({
        minX: x - SCAN_WIDTH,
        minY: bounds.minY,
        maxX: x + SCAN_WIDTH,
        maxY: bounds.maxY
      });

      if (elementsInGap.length === 0) {
        // Found potential gap, expand to find full width
        let gapStart = x;
        let gapEnd = x;

        while (gapStart > startX && spatialIndex.search({
          minX: gapStart - 5,
          minY: bounds.minY,
          maxX: gapStart,
          maxY: bounds.maxY
        }).length === 0) {
          gapStart -= 5;
        }

        while (gapEnd < endX && spatialIndex.search({
          minX: gapEnd,
          minY: bounds.minY,
          maxX: gapEnd + 5,
          maxY: bounds.maxY
        }).length === 0) {
          gapEnd += 5;
        }

        if (gapEnd - gapStart >= MIN_GAP_WIDTH) {
          return { x: (gapStart + gapEnd) / 2, width: gapEnd - gapStart };
        }
      }
    }

    return null;
  }

  /**
   * Find mathematical units in range
   */
  findUnitsInRange(mathUnits, startX, endX) {
    return mathUnits.filter(unit => {
      const unitStartsInRange = unit.bounds.minX >= startX && unit.bounds.minX < endX;
      const unitEndsInRange = unit.bounds.maxX > startX && unit.bounds.maxX <= endX;
      const unitSpansRange = unit.bounds.minX < startX && unit.bounds.maxX > endX;

      return unitStartsInRange || unitEndsInRange || unitSpansRange;
    });
  }

  /**
   * Check if any units are critical
   */
  hasCriticalUnits(units) {
    return units.some(u => u.critical);
  }

  /**
   * Calculate actual overlap between tiles
   */
  calculateActualOverlap(prevEnd, currentStart) {
    return Math.max(0, prevEnd - currentStart);
  }

  // Helper methods

  buildSpatialIndex(elements) {
    const tree = new RBush();
    elements.forEach(el => {
      if (el.type === 'line' && el.isRowDivider) return; // Skip row dividers

      tree.insert({
        minX: el.x || 0,
        minY: el.y || 0,
        maxX: (el.x || 0) + (el.width || 0),
        maxY: (el.y || 0) + (el.height || 0),
        element: el
      });
    });
    return tree;
  }

  getContentBounds(elements) {
    if (elements.length === 0) return null;

    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    elements.forEach(el => {
      if (el.type === 'line' && el.isRowDivider) return;

      bounds.minX = Math.min(bounds.minX, el.x || 0);
      bounds.minY = Math.min(bounds.minY, el.y || 0);
      bounds.maxX = Math.max(bounds.maxX, (el.x || 0) + (el.width || 0));
      bounds.maxY = Math.max(bounds.maxY, (el.y || 0) + (el.height || 0));
    });

    if (bounds.minX === Infinity) return null;

    return bounds;
  }

  getElementsInRegion(tree, x1, x2, y1, y2) {
    const results = tree.search({
      minX: x1,
      minY: y1,
      maxX: x2,
      maxY: y2
    });
    return results.map(r => r.element);
  }

  hashTile(elements, bounds) {
    const data = {
      elementIds: elements.map(el => el.id).sort(),
      bounds: {
        x: Math.round(bounds.minX),
        y: Math.round(bounds.minY),
        w: Math.round(bounds.maxX - bounds.minX),
        h: Math.round(bounds.maxY - bounds.minY)
      }
    };
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }

  getCachedTile(hash) {
    const cached = this.tileCache.get(hash);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      return cached;
    }
    return null;
  }

  cacheTile(hash, data) {
    this.tileCache.set(hash, {
      ...data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.tileCache.clear();
  }
}
