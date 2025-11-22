import Logger from './logger.js';

/**
 * Trigger OCR processing for a row (STUB for Epic 2)
 * @param {string} rowId - Row ID to process
 * @param {Array} elements - Elements in the row
 */
export function triggerOCRForRow(rowId, elements) {
    Logger.info('OCR', 'OCR triggered for row (STUB)', {
        rowId,
        elementCount: elements ? elements.length : 0,
        timestamp: new Date().toISOString()
    });

    // TODO: Epic 2 - Implement actual OCR pipeline here
    // 1. Extract overlapping tiles from row bounding box (ocrTiling.js)
    // 2. Send tiles to OCR worker pool (ocrWorkerPool.js)
    // 3. Merge LaTeX fragments (latexAssembly.js)
    // 4. Post-process LaTeX (ocrPostProcessor.js)
    // 5. Update row.transcribedLatex and row.ocrStatus = 'complete'

    // STUB: Simulate async OCR processing
    setTimeout(() => {
        Logger.info('OCR', 'OCR completed for row (STUB)', { rowId });
        // Update row status (will be real implementation in Epic 2)
        // rowManager.updateRow(rowId, {
        //   ocrStatus: 'complete',
        //   transcribedLatex: '...'
        // });
    }, 500);
}
