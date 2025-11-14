/**
 * OCR Tiling Utility for Magic Canvas
 *
 * Extracts overlapping 384x384px tiles from row bounding boxes for OCR processing.
 * Implements fixed 64px overlap (16.7%) strategy per ADR-002.
 *
 * @module ocrTiling
 */

import Logger from './logger.js';

// Constants from architecture
const TILE_SIZE = 384; // FormulaNet model requirement (FR25)
const OVERLAP_PX = 64; // Fixed overlap per ADR-002 (16.7%)
const STRIDE = TILE_SIZE - OVERLAP_PX; // 320px

/**
 * @typedef {Object} TilePosition
 * @property {number} offsetX - Canvas X coordinate of tile origin
 * @property {number} width - Tile width (always 384)
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} minX - Minimum X coordinate
 * @property {number} minY - Minimum Y coordinate
 * @property {number} maxX - Maximum X coordinate
 * @property {number} maxY - Maximum Y coordinate
 * @property {number} width - Bounding box width
 * @property {number} height - Bounding box height
 */

/**
 * @typedef {Object} Tile
 * @property {string} rowId - Row identifier (e.g., "row-5")
 * @property {number} tileIndex - 0-based sequential index within row
 * @property {number} offsetX - Canvas X coordinate of tile origin
 * @property {number} offsetY - Canvas Y coordinate (row.yStart)
 * @property {number} width - Tile width (always 384)
 * @property {number} height - Tile height (always 384)
 * @property {number} overlap - Pixels overlapping with previous tile (0 for first tile, 64 for others)
 * @property {ImageData} [imageData] - 384x384 grayscale image data (added by renderTileImage)
 * @property {string} [hash] - Tile hash for caching (added by Task 3)
 */

/**
 * Calculate tile positions for a given width with fixed overlap
 *
 * @param {number} width - Total width to tile
 * @param {number} overlap - Overlap in pixels (default: 64)
 * @returns {TilePosition[]} Array of tile positions
 */
export function calculateTilePositions(width, overlap = OVERLAP_PX) {
  // Validate inputs
  if (typeof width !== 'number' || !isFinite(width) || width < 0) {
    Logger.error('ocrTiling', 'Invalid width provided to calculateTilePositions', {
      width,
    });
    throw new TypeError('Width must be a non-negative finite number');
  }

  if (typeof overlap !== 'number' || !isFinite(overlap) || overlap < 0 || overlap >= TILE_SIZE) {
    Logger.error('ocrTiling', 'Invalid overlap provided to calculateTilePositions', {
      overlap,
    });
    throw new TypeError('Overlap must be a non-negative finite number less than tile size');
  }

  // Single tile for narrow rows (≤ tile size)
  if (width <= TILE_SIZE) {
    return [{ offsetX: 0, width: TILE_SIZE }];
  }

  // Calculate number of tiles using formula from spec
  // numTiles = ceil((width - overlap) / stride)
  const stride = TILE_SIZE - overlap;
  const numTiles = Math.ceil((width - overlap) / stride);

  // Generate tile positions
  const positions = [];
  for (let i = 0; i < numTiles; i++) {
    positions.push({
      offsetX: i * stride,
      width: TILE_SIZE,
    });
  }

  Logger.debug('ocrTiling', 'Calculated tile positions', {
    width,
    overlap,
    stride,
    numTiles,
    positions: positions.map(p => p.offsetX),
  });

  return positions;
}

/**
 * Calculate bounding box from Excalidraw elements array
 *
 * @param {Object[]} elements - Array of Excalidraw elements
 * @param {Set<string>} elementIds - Set of element IDs to include in bbox
 * @returns {BoundingBox} Bounding box coordinates
 * @throws {Error} If bounding box is invalid (empty or negative dimensions)
 */
export function calculateBoundingBox(elements, elementIds) {
  // Validate inputs
  if (!Array.isArray(elements)) {
    Logger.error('ocrTiling', 'Invalid elements array provided', { elements });
    throw new TypeError('Elements must be an array');
  }

  if (!(elementIds instanceof Set)) {
    Logger.error('ocrTiling', 'Invalid elementIds provided', { elementIds });
    throw new TypeError('ElementIds must be a Set');
  }

  // Handle empty row case (AC#9: empty rows return empty array)
  if (elementIds.size === 0) {
    Logger.debug('ocrTiling', 'Empty row - no elements to tile', { elementIds });
    return null; // Signals empty row
  }

  // Filter elements to only include those in this row
  const rowElements = elements.filter(el => elementIds.has(el.id));

  if (rowElements.length === 0) {
    Logger.warn('ocrTiling', 'No matching elements found for row', {
      elementIds: Array.from(elementIds),
      totalElements: elements.length,
    });
    return null; // Signals empty row
  }

  // Calculate bounding box from elements
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of rowElements) {
    // Handle different element types (regular elements vs stroke elements)
    if (Array.isArray(element.x) && Array.isArray(element.y)) {
      // Stroke element with point arrays
      const elementMinX = Math.min(...element.x);
      const elementMaxX = Math.max(...element.x);
      const elementMinY = Math.min(...element.y);
      const elementMaxY = Math.max(...element.y);

      minX = Math.min(minX, elementMinX);
      maxX = Math.max(maxX, elementMaxX);
      minY = Math.min(minY, elementMinY);
      maxY = Math.max(maxY, elementMaxY);
    } else if (typeof element.x === 'number' && typeof element.y === 'number') {
      // Regular element with x, y, width, height
      minX = Math.min(minX, element.x);
      maxX = Math.max(maxX, element.x + (element.width || 0));
      minY = Math.min(minY, element.y);
      maxY = Math.max(maxY, element.y + (element.height || 0));
    } else {
      Logger.warn('ocrTiling', 'Element has invalid coordinates', {
        elementId: element.id,
        x: element.x,
        y: element.y,
      });
    }
  }

  // Validate bounding box (FM-004: Invalid Bounding Box)
  const width = maxX - minX;
  const height = maxY - minY;

  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
    Logger.error('ocrTiling', 'Invalid bounding box - zero or negative dimensions', {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      elementCount: rowElements.length,
    });
    throw new Error('Invalid bounding box: zero or negative dimensions (FM-004)');
  }

  const bbox = {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
  };

  Logger.debug('ocrTiling', 'Calculated bounding box', {
    bbox,
    elementCount: rowElements.length,
  });

  return bbox;
}

/**
 * Extract overlapping 384x384px tiles from row elements
 *
 * This is the main entry point for tile extraction. It calculates the row's
 * bounding box, determines tile positions, and returns tile metadata.
 *
 * Note: This function returns tile metadata only (no ImageData). Tile rendering
 * is handled by Task 2 (see ocrTiling.render.js or integration code).
 *
 * @param {Object} row - Row object from RowManager
 * @param {string} row.id - Row identifier
 * @param {number} row.yStart - Top Y coordinate of row
 * @param {number} row.yEnd - Bottom Y coordinate of row
 * @param {Set<string>} row.elementIds - Set of element IDs in this row
 * @param {Object[]} elements - Array of all Excalidraw elements
 * @returns {Tile[]} Array of tile metadata objects (no ImageData)
 */
export function extractTiles(row, elements) {
  const startTime = performance.now();

  // Validate inputs
  if (!row || typeof row.id !== 'string') {
    Logger.error('ocrTiling', 'Invalid row provided to extractTiles', { row });
    throw new TypeError('Row must have a valid id property');
  }

  if (!row.elementIds || !(row.elementIds instanceof Set)) {
    Logger.error('ocrTiling', 'Invalid row.elementIds provided', {
      rowId: row.id,
      elementIds: row.elementIds,
    });
    throw new TypeError('Row must have elementIds as a Set');
  }

  if (!Array.isArray(elements)) {
    Logger.error('ocrTiling', 'Invalid elements array provided', {
      rowId: row.id,
      elements,
    });
    throw new TypeError('Elements must be an array');
  }

  // Calculate bounding box (AC#4: Bounding Box Extraction)
  const bbox = calculateBoundingBox(elements, row.elementIds);

  // Handle empty row case (AC#9: empty rows return empty array)
  if (!bbox) {
    Logger.debug('ocrTiling', 'Empty row - returning empty tiles array', {
      rowId: row.id,
    });
    return [];
  }

  // Calculate tile positions (AC#2: Overlap Strategy, AC#3: Tile Count Calculation)
  const positions = calculateTilePositions(bbox.width, OVERLAP_PX);

  // Generate tile metadata (AC#6: Tile Metadata)
  const tiles = positions.map((pos, index) => ({
    rowId: row.id,
    tileIndex: index,
    offsetX: bbox.minX + pos.offsetX,
    offsetY: row.yStart,
    width: TILE_SIZE,
    height: TILE_SIZE,
    overlap: index > 0 ? OVERLAP_PX : 0, // First tile has no overlap
    // Note: imageData and hash added by Task 2 and Task 3
  }));

  const duration = performance.now() - startTime;

  Logger.debug('ocrTiling', 'Extracted tiles from row', {
    rowId: row.id,
    tileCount: tiles.length,
    bboxWidth: bbox.width,
    bboxHeight: bbox.height,
    duration: `${duration.toFixed(2)}ms`,
  });

  // Performance budget verification (AC#7: <200ms for typical row)
  if (duration > 200) {
    Logger.warn('ocrTiling', 'Tile extraction exceeded performance budget', {
      rowId: row.id,
      duration: `${duration.toFixed(2)}ms`,
      budget: '200ms',
      tileCount: tiles.length,
    });
  }

  return tiles;
}

/**
 * Calculate fast hash for ImageData using FNV-1a algorithm
 *
 * Implements inline hash function to avoid new dependencies (ADR-006).
 * Uses FNV-1a (Fowler-Noll-Vo) hash which is fast and has good distribution.
 *
 * @param {ImageData} imageData - ImageData to hash
 * @returns {string} 16-character hex hash string
 */
export function calculateTileHash(imageData) {
  const startTime = performance.now();

  if (!imageData || !imageData.data) {
    Logger.error('ocrTiling', 'Invalid ImageData provided to calculateTileHash', {
      imageData,
    });
    throw new TypeError('ImageData must have a data property');
  }

  // FNV-1a parameters (32-bit)
  const FNV_PRIME = 0x01000193;
  const FNV_OFFSET_BASIS = 0x811c9dc5;

  let hash = FNV_OFFSET_BASIS;
  const data = imageData.data;

  // Hash every 4th pixel (R channel of grayscale) for speed
  // Since grayscale: R === G === B, we only need one channel
  // This reduces computation by 4x while maintaining uniqueness
  for (let i = 0; i < data.length; i += 16) {
    // i += 16 = every 4th pixel (4 bytes/pixel)
    hash ^= data[i]; // XOR with byte
    hash = Math.imul(hash, FNV_PRIME); // Multiply with FNV prime
  }

  // Convert to unsigned 32-bit and then to hex string
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0');

  // Add dimensions to hash to differentiate same-content different-size images
  const widthHex = imageData.width.toString(16).padStart(4, '0');
  const heightHex = imageData.height.toString(16).padStart(4, '0');

  const fullHash = `${hashHex}${widthHex}${heightHex}`;

  const duration = performance.now() - startTime;

  Logger.debug('ocrTiling', 'Calculated tile hash', {
    hash: fullHash,
    duration: `${duration.toFixed(2)}ms`,
    dataLength: data.length,
  });

  // Performance check (AC#8: hash computation <10ms per tile)
  if (duration > 10) {
    Logger.warn('ocrTiling', 'Hash calculation exceeded 10ms budget', {
      duration: `${duration.toFixed(2)}ms`,
      budget: '10ms',
    });
  }

  return fullHash;
}

/**
 * Render a single tile as 384x384 grayscale ImageData
 *
 * This function extracts a region from the source canvas context and converts
 * it to grayscale ImageData. Reuses patterns from existing imageProcessor.js
 * (AC#5: Image Rendering).
 *
 * @param {CanvasRenderingContext2D} sourceCtx - Canvas context to extract from
 * @param {Tile} tile - Tile metadata (without imageData)
 * @returns {ImageData} 384x384 grayscale ImageData
 */
export function renderTileImage(sourceCtx, tile) {
  const startTime = performance.now();

  // Validate inputs
  if (!sourceCtx || typeof sourceCtx.getImageData !== 'function') {
    Logger.error('ocrTiling', 'Invalid canvas context provided', { sourceCtx });
    throw new TypeError('sourceCtx must be a valid CanvasRenderingContext2D');
  }

  if (!tile || typeof tile.offsetX !== 'number' || typeof tile.offsetY !== 'number') {
    Logger.error('ocrTiling', 'Invalid tile provided to renderTileImage', { tile });
    throw new TypeError('Tile must have valid offsetX and offsetY properties');
  }

  try {
    // Extract image data from source canvas at tile position
    // Note: Excalidraw canvas may have elements outside tile bounds,
    // we extract the exact 384x384 region
    const imageData = sourceCtx.getImageData(
      tile.offsetX,
      tile.offsetY,
      TILE_SIZE,
      TILE_SIZE
    );

    // Convert to grayscale (reusing imageProcessor.js pattern)
    // Formula: grayscale = 0.299 * R + 0.587 * G + 0.114 * B
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Standard grayscale conversion (ITU-R BT.601)
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      // Set RGB to same gray value
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      // Alpha remains unchanged (data[i + 3])
    }

    const duration = performance.now() - startTime;

    Logger.debug('ocrTiling', 'Rendered tile image', {
      rowId: tile.rowId,
      tileIndex: tile.tileIndex,
      offsetX: tile.offsetX,
      offsetY: tile.offsetY,
      duration: `${duration.toFixed(2)}ms`,
    });

    return imageData;
  } catch (error) {
    Logger.error('ocrTiling', 'Failed to render tile image', {
      rowId: tile.rowId,
      tileIndex: tile.tileIndex,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to render tile image: ${error.message}`);
  }
}

/**
 * Extract tiles with rendered ImageData from row elements
 *
 * This is a convenience function that combines extractTiles() and renderTileImage()
 * to produce complete Tile objects with ImageData.
 *
 * @param {Object} row - Row object from RowManager
 * @param {Object[]} elements - Array of all Excalidraw elements
 * @param {CanvasRenderingContext2D} canvasCtx - Canvas context for rendering
 * @returns {Tile[]} Array of complete tile objects with ImageData
 */
export function extractTilesWithImages(row, elements, canvasCtx) {
  const startTime = performance.now();

  // Extract tile metadata (without ImageData)
  const tiles = extractTiles(row, elements);

  // Handle empty row case
  if (tiles.length === 0) {
    return [];
  }

  // Render ImageData and calculate hash for each tile
  const tilesWithImages = tiles.map(tile => {
    const imageData = renderTileImage(canvasCtx, tile);
    const hash = calculateTileHash(imageData);
    return {
      ...tile,
      imageData,
      hash, // AC#8: Add hash field to Tile object
    };
  });

  const duration = performance.now() - startTime;

  Logger.debug('ocrTiling', 'Extracted tiles with images', {
    rowId: row.id,
    tileCount: tilesWithImages.length,
    duration: `${duration.toFixed(2)}ms`,
  });

  // Performance budget check (AC#7: <200ms total)
  if (duration > 200) {
    Logger.warn('ocrTiling', 'Tile extraction with rendering exceeded budget', {
      rowId: row.id,
      duration: `${duration.toFixed(2)}ms`,
      budget: '200ms',
      tileCount: tilesWithImages.length,
    });
  }

  return tilesWithImages;
}

// Export constants for testing
export const CONSTANTS = {
  TILE_SIZE,
  OVERLAP_PX,
  STRIDE,
};
