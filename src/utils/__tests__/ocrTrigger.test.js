import { describe, it, expect, vi } from 'vitest';
import { triggerOCRForRow } from '../ocrTrigger';
import Logger from '../logger';

// Mock Logger
vi.mock('../logger', () => ({
    default: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('triggerOCRForRow', () => {
    it('should log OCR trigger event', () => {
        const rowId = 'row-1';
        const elements = [{ id: '1' }];

        triggerOCRForRow(rowId, elements);

        expect(Logger.info).toHaveBeenCalledWith(
            'OCR',
            'OCR triggered for row (STUB)',
            expect.objectContaining({
                rowId,
                elementCount: 1
            })
        );
    });

    it('should handle null elements', () => {
        const rowId = 'row-1';

        triggerOCRForRow(rowId, null);

        expect(Logger.info).toHaveBeenCalledWith(
            'OCR',
            'OCR triggered for row (STUB)',
            expect.objectContaining({
                rowId,
                elementCount: 0
            })
        );
    });
});
