import { describe, it, expect } from 'vitest';
import { calculateRowContentHash } from '../contentHash';

describe('calculateRowContentHash', () => {
    it('should return empty string for empty input', () => {
        expect(calculateRowContentHash([])).toBe('');
        expect(calculateRowContentHash(null)).toBe('');
        expect(calculateRowContentHash(undefined)).toBe('');
    });

    it('should return consistent hash for same elements', () => {
        const elements = [
            { id: '1', x: 10, y: 20 },
            { id: '2', x: 30, y: 40 }
        ];
        const hash1 = calculateRowContentHash(elements);
        const hash2 = calculateRowContentHash(elements);
        expect(hash1).toBe(hash2);
    });

    it('should return different hash when element added', () => {
        const elements1 = [
            { id: '1', x: 10, y: 20 }
        ];
        const elements2 = [
            { id: '1', x: 10, y: 20 },
            { id: '2', x: 30, y: 40 }
        ];
        expect(calculateRowContentHash(elements1)).not.toBe(calculateRowContentHash(elements2));
    });

    it('should return different hash when element moved', () => {
        const elements1 = [
            { id: '1', x: 10, y: 20 }
        ];
        const elements2 = [
            { id: '1', x: 10, y: 25 } // Moved y
        ];
        expect(calculateRowContentHash(elements1)).not.toBe(calculateRowContentHash(elements2));
    });

    it('should return same hash regardless of element order', () => {
        const elements1 = [
            { id: '1', x: 10, y: 20 },
            { id: '2', x: 30, y: 40 }
        ];
        const elements2 = [
            { id: '2', x: 30, y: 40 },
            { id: '1', x: 10, y: 20 }
        ];
        expect(calculateRowContentHash(elements1)).toBe(calculateRowContentHash(elements2));
    });
});
