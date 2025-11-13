/**
 * Row Element Generator
 *
 * Generates Excalidraw elements to display row information directly on the canvas.
 * These elements are locked and marked with isRowInfo flag to distinguish them from user content.
 */

/**
 * Generate row information elements for a single row
 * @param {object} row - Row data from document
 * @param {number} canvasWidth - Width of the canvas viewport
 * @param {boolean} selected - Whether this row is selected
 * @param {boolean} debugMode - Whether to show debug info
 * @returns {array} Array of Excalidraw elements
 */
export function generateRowInfoElements(row, canvasWidth, selected = false, debugMode = false) {
  const elements = [];
  const rowTop = row.y;
  const rowBottom = row.y + row.height;

  // Base ID for all row info elements
  const baseId = `row-info-${row.id}`;

  // 1. Row number badge (top-left)
  elements.push({
    id: `${baseId}-number`,
    type: 'text',
    x: 10,
    y: rowTop + 10,
    width: 40,
    height: 25,
    text: `${row.id}`,
    fontSize: 16,
    fontFamily: 1, // Virgil
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: selected ? '#2563eb' : '#6b7280',
    backgroundColor: selected ? '#dbeafe' : '#f3f4f6',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 0,
    opacity: 80,
    locked: true,
    isRowInfo: true,
    isDeleted: false,
    groupIds: [`row-info-group-${row.id}`],
  });

  // 2. OCR Status indicator (if not pending)
  if (row.ocrStatus !== 'pending') {
    let statusText = '';
    let statusColor = '#6b7280';

    if (row.ocrStatus === 'processing') {
      statusText = `OCR ${(row.ocrProgress * 100).toFixed(0)}%`;
      statusColor = '#f59e0b';
    } else if (row.ocrStatus === 'complete') {
      statusText = '✓ OCR';
      statusColor = '#10b981';
    } else if (row.ocrStatus === 'error') {
      statusText = '✗ OCR';
      statusColor = '#ef4444';
    }

    elements.push({
      id: `${baseId}-ocr-status`,
      type: 'text',
      x: 60,
      y: rowTop + 10,
      width: 100,
      height: 25,
      text: statusText,
      fontSize: 14,
      fontFamily: 1,
      textAlign: 'left',
      verticalAlign: 'middle',
      strokeColor: statusColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 90,
      locked: true,
      isRowInfo: true,
      isDeleted: false,
      groupIds: [`row-info-group-${row.id}`],
    });
  }

  // 3. LaTeX preview (if available)
  if (row.latex) {
    const latexPreview = row.latex.length > 80
      ? row.latex.substring(0, 80) + '...'
      : row.latex;

    elements.push({
      id: `${baseId}-latex`,
      type: 'text',
      x: 10,
      y: rowTop + 45,
      width: Math.min(canvasWidth - 20, 800),
      height: 25,
      text: latexPreview,
      fontSize: 12,
      fontFamily: 3, // Monospace
      textAlign: 'left',
      verticalAlign: 'top',
      strokeColor: '#374151',
      backgroundColor: '#f9fafb',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 85,
      locked: true,
      isRowInfo: true,
      isDeleted: false,
      groupIds: [`row-info-group-${row.id}`],
    });
  }

  // 4. Validation status (if checked)
  if (row.validationStatus !== 'unchecked') {
    let validationIcon = '';
    let validationColor = '#6b7280';

    if (row.validationStatus === 'valid') {
      validationIcon = '✓';
      validationColor = '#10b981';
    } else if (row.validationStatus === 'invalid') {
      validationIcon = '✗';
      validationColor = '#ef4444';
    } else if (row.validationStatus === 'error') {
      validationIcon = '⚠';
      validationColor = '#f59e0b';
    }

    elements.push({
      id: `${baseId}-validation`,
      type: 'text',
      x: canvasWidth - 60,
      y: rowTop + 10,
      width: 40,
      height: 25,
      text: validationIcon,
      fontSize: 20,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      strokeColor: validationColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 90,
      locked: true,
      isRowInfo: true,
      isDeleted: false,
      groupIds: [`row-info-group-${row.id}`],
    });
  }

  // 5. Debug info (if enabled)
  if (debugMode) {
    const debugText = [
      `Elements: ${row.elementIds.size}`,
      `Tiles: ${row.tiles?.length || 0}`,
    ].join(' | ');

    elements.push({
      id: `${baseId}-debug`,
      type: 'text',
      x: 10,
      y: rowBottom - 35,
      width: 300,
      height: 25,
      text: debugText,
      fontSize: 10,
      fontFamily: 3,
      textAlign: 'left',
      verticalAlign: 'middle',
      strokeColor: '#9ca3af',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 70,
      locked: true,
      isRowInfo: true,
      isDeleted: false,
      groupIds: [`row-info-group-${row.id}`],
    });
  }

  // Add required properties for all elements
  return elements.map(el => ({
    ...el,
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    seed: Math.floor(Math.random() * 1000000),
  }));
}

/**
 * Generate row info elements for all visible rows
 * @param {array} rows - Array of row data
 * @param {object} viewport - Viewport info {y, height, width}
 * @param {number} selectedRowId - ID of selected row (or null)
 * @param {boolean} debugMode - Whether to show debug info
 * @returns {array} Array of Excalidraw elements for all visible rows
 */
export function generateAllRowInfoElements(rows, viewport, selectedRowId = null, debugMode = false) {
  // Filter to visible rows
  const visibleRows = rows.filter(row => {
    const rowTop = row.y;
    const rowBottom = row.y + row.height;
    return rowBottom >= viewport.y && rowTop <= viewport.y + viewport.height;
  });

  // Generate elements for each visible row
  const allElements = [];
  for (const row of visibleRows) {
    const selected = row.id === selectedRowId;
    const rowElements = generateRowInfoElements(row, viewport.width, selected, debugMode);
    allElements.push(...rowElements);
  }

  return allElements;
}

/**
 * Filter out old row info elements from scene
 * @param {array} elements - Current scene elements
 * @returns {array} Elements with row info elements removed
 */
export function removeRowInfoElements(elements) {
  return elements.filter(el => !el.isRowInfo);
}
