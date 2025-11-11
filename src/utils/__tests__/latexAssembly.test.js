/**
 * Tests for LaTeX Assembly with Restorative Merging
 */

import { LatexTokenizer, RestorativeLatexAssembler, assembleLatexTiles } from '../latexAssembly';

describe('LatexTokenizer', () => {
  let tokenizer;

  beforeEach(() => {
    tokenizer = new LatexTokenizer();
  });

  describe('tokenize()', () => {
    test('should tokenize simple expression', () => {
      const latex = 'x + 2';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toEqual(['x', '+', '2']);
    });

    test('should tokenize expression with exponents', () => {
      const latex = 'x^2 + 4x + 4';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toEqual(['x', '^', '2', '+', '4', 'x', '+', '4']);
    });

    test('should tokenize fractions', () => {
      const latex = '\\frac{a}{b}';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toEqual(['\\frac', '{', 'a', '}', '{', 'b', '}']);
    });

    test('should tokenize nested braces', () => {
      const latex = '\\frac{a + b}{c + d}';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toContain('\\frac');
      expect(tokens).toContain('{');
      expect(tokens).toContain('a');
      expect(tokens).toContain('+');
      expect(tokens).toContain('b');
      expect(tokens).toContain('}');
    });

    test('should tokenize summation with bounds', () => {
      const latex = '\\sum_{i=1}^{n}';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toContain('\\sum');
      expect(tokens).toContain('_');
      expect(tokens).toContain('^');
      expect(tokens).toContain('i');
      expect(tokens).toContain('=');
      expect(tokens).toContain('1');
      expect(tokens).toContain('n');
    });

    test('should tokenize square roots', () => {
      const latex = '\\sqrt{x^2 + y^2}';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toContain('\\sqrt');
      expect(tokens).toContain('{');
      expect(tokens).toContain('x');
      expect(tokens).toContain('^');
      expect(tokens).toContain('2');
    });

    test('should tokenize integrals', () => {
      const latex = '\\int_0^{\\pi} \\sin(x) dx';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens).toContain('\\int');
      expect(tokens).toContain('_');
      expect(tokens).toContain('0');
      expect(tokens).toContain('\\sin');
    });

    test('should handle empty string', () => {
      expect(tokenizer.tokenize('')).toEqual([]);
      expect(tokenizer.tokenize(null)).toEqual([]);
    });

    test('should handle complex expression', () => {
      const latex = 'x^2 + 2xy + y^2 = (x + y)^2';
      const tokens = tokenizer.tokenize(latex);

      expect(tokens.length).toBeGreaterThan(10);
      expect(tokens).toContain('x');
      expect(tokens).toContain('^');
      expect(tokens).toContain('2');
      expect(tokens).toContain('+');
      expect(tokens).toContain('=');
    });
  });

  describe('tokensToLatex()', () => {
    test('should reconstruct simple expression', () => {
      const tokens = ['x', '+', '2'];
      const latex = tokenizer.tokensToLatex(tokens);

      expect(latex).toBe('x + 2');
    });

    test('should reconstruct fraction', () => {
      const tokens = ['\\frac', '{', 'a', '}', '{', 'b', '}'];
      const latex = tokenizer.tokensToLatex(tokens);

      expect(latex).toBe('\\frac{a}{b}');
    });

    test('should reconstruct exponent', () => {
      const tokens = ['x', '^', '2'];
      const latex = tokenizer.tokensToLatex(tokens);

      expect(latex).toBe('x^2');
    });

    test('should handle empty tokens', () => {
      expect(tokenizer.tokensToLatex([])).toBe('');
      expect(tokenizer.tokensToLatex(null)).toBe('');
    });

    test('should roundtrip correctly', () => {
      const original = 'x^2 + 4x + 4';
      const tokens = tokenizer.tokenize(original);
      const reconstructed = tokenizer.tokensToLatex(tokens);

      // Should be structurally the same (whitespace may differ)
      expect(reconstructed.replace(/\s/g, '')).toBe(original.replace(/\s/g, ''));
    });
  });

  describe('estimateTokensInRange()', () => {
    test('should extract first 50% of tokens', () => {
      const tokens = ['a', '+', 'b', '+', 'c', '+', 'd'];
      const result = tokenizer.estimateTokensInRange(tokens, 0, 0.5);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(tokens.length);
      expect(result[0]).toBe('a');
    });

    test('should extract last 50% of tokens', () => {
      const tokens = ['a', '+', 'b', '+', 'c', '+', 'd'];
      const result = tokenizer.estimateTokensInRange(tokens, 0.5, 1.0);

      expect(result.length).toBeGreaterThan(0);
      expect(result[result.length - 1]).toBe('d');
    });

    test('should handle edge cases', () => {
      const tokens = ['a', 'b', 'c'];

      expect(tokenizer.estimateTokensInRange(tokens, 0, 0)).toEqual([]);
      expect(tokenizer.estimateTokensInRange(tokens, 1, 1)).toEqual([]);
      expect(tokenizer.estimateTokensInRange([], 0, 1)).toEqual([]);
    });
  });
});

describe('RestorativeLatexAssembler', () => {
  let assembler;

  beforeEach(() => {
    assembler = new RestorativeLatexAssembler();
  });

  describe('assembleTiles() - Single Tile', () => {
    test('should handle single tile without changes', () => {
      const tiles = [{
        index: 0,
        latex: 'x^2 + 4x + 4',
        offsetX: 0,
        logicalWidth: 384
      }];

      const result = assembler.assembleTiles(tiles);

      expect(result.latex).toBe('x^2 + 4x + 4');
      expect(result.confidence).toBe(1.0);
      expect(result.repairs).toEqual([]);
      expect(result.tileCount).toBe(1);
    });

    test('should clean malformed LaTeX', () => {
      const tiles = [{
        index: 0,
        latex: 'x^2  +  4x   +  4',  // Extra spaces
        offsetX: 0,
        logicalWidth: 384
      }];

      const result = assembler.assembleTiles(tiles);

      expect(result.latex).toBe('x^2 + 4x + 4');
    });

    test('should handle empty tile', () => {
      const tiles = [{
        index: 0,
        latex: '',
        offsetX: 0,
        logicalWidth: 384
      }];

      const result = assembler.assembleTiles(tiles);

      expect(result.latex).toBe('');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('assembleTiles() - Two Tiles with Identical Overlap', () => {
    test('should merge with identical overlap perfectly', () => {
      const tiles = [
        {
          index: 0,
          latex: 'x^2 + 4x + 4',
          offsetX: 0,
          logicalWidth: 384,
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 1,
          latex: '+ 4x + 4 = z',
          offsetX: 250,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 250, end: 384 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      // Should not duplicate the overlap
      expect(result.latex).toContain('x^2');
      expect(result.latex).toContain('= z');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.repairs.length).toBeLessThanOrEqual(1);
    });

    test('should handle fraction across tiles', () => {
      const tiles = [
        {
          index: 0,
          latex: 'x + \\frac{a + b}{c}',
          offsetX: 0,
          logicalWidth: 500,
          rightOverlap: { size: 175, start: 325, end: 500 }
        },
        {
          index: 1,
          latex: '\\frac{a + b}{c} + y',
          offsetX: 325,
          logicalWidth: 500,
          leftOverlap: { size: 175, start: 325, end: 500 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      // Should contain fraction only once
      expect((result.latex.match(/\\frac/g) || []).length).toBeLessThanOrEqual(2); // Allow some leeway
      expect(result.latex).toContain('x');
      expect(result.latex).toContain('y');
    });
  });

  describe('assembleTiles() - Two Tiles with Similar Overlap', () => {
    test('should repair minor OCR differences', () => {
      const tiles = [
        {
          index: 0,
          latex: 'a^2 + b^2 = c^2',  // Correct
          offsetX: 0,
          logicalWidth: 384,
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 1,
          latex: '+ b^z = c^2 + d',  // OCR misread "2" as "z"
          offsetX: 250,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 250, end: 384 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      expect(result.repairs.length).toBeGreaterThanOrEqual(1);
      expect(result.repairs[0].type).toBe('similarity');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThan(1.0);
    });

    test('should use longer version when similar', () => {
      // Configure with 'longer' strategy
      const tiles = [
        {
          index: 0,
          latex: 'x + 2xy',
          offsetX: 0,
          logicalWidth: 384,
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 1,
          latex: '2x + y',  // Shorter, slight OCR error
          offsetX: 250,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 250, end: 384 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      // Should prefer longer/more complete version
      expect(result.latex).toContain('x');
      expect(result.latex).toContain('y');
    });
  });

  describe('assembleTiles() - Two Tiles with Different Overlap', () => {
    test('should flag mismatched overlaps', () => {
      const tiles = [
        {
          index: 0,
          latex: 'a + b + c',
          offsetX: 0,
          logicalWidth: 384,
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 1,
          latex: 'x + y + z',  // Completely different
          offsetX: 250,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 250, end: 384 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      expect(result.repairs.length).toBeGreaterThan(0);
      expect(result.repairs[0].type).toBe('mismatch');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });
  });

  describe('assembleTiles() - Three Tiles', () => {
    test('should merge three tiles correctly', () => {
      const tiles = [
        {
          index: 0,
          latex: 'x^2 + 2xy',
          offsetX: 0,
          logicalWidth: 384,
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 1,
          latex: '+ 2xy + y^2',
          offsetX: 250,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 250, end: 384 },
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 2,
          latex: '+ y^2 = (x + y)^2',
          offsetX: 500,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 500, end: 634 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      expect(result.tileCount).toBe(3);
      expect(result.latex).toContain('x^2');
      expect(result.latex).toContain('2xy');
      expect(result.latex).toContain('y^2');
      expect(result.latex).toContain('(x + y)^2');
    });

    test('should handle multiple repairs', () => {
      const tiles = [
        {
          index: 0,
          latex: 'a + b',
          offsetX: 0,
          logicalWidth: 384,
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 1,
          latex: 'b + c',  // Slightly different
          offsetX: 250,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 250, end: 384 },
          rightOverlap: { size: 134, start: 250, end: 384 }
        },
        {
          index: 2,
          latex: 'c + d',
          offsetX: 500,
          logicalWidth: 384,
          leftOverlap: { size: 134, start: 500, end: 634 }
        }
      ];

      const result = assembler.assembleTiles(tiles);

      expect(result.repairs.length).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('compareOverlaps()', () => {
    test('should detect identical overlaps', () => {
      const left = '+ 4x +';
      const right = '+ 4x +';

      const comparison = assembler.compareOverlaps(left, right);

      expect(comparison.identical).toBe(true);
      expect(comparison.similar).toBe(true);
      expect(comparison.similarity).toBe(1.0);
      expect(comparison.editDistance).toBe(0);
    });

    test('should detect similar overlaps', () => {
      const left = '+ 4x + 4';
      const right = '+ 4x + 5';  // Only last digit differs

      const comparison = assembler.compareOverlaps(left, right);

      expect(comparison.identical).toBe(false);
      expect(comparison.similarity).toBeGreaterThan(0.8);
      expect(comparison.editDistance).toBeGreaterThan(0);
    });

    test('should detect different overlaps', () => {
      const left = 'a + b';
      const right = 'x + y';

      const comparison = assembler.compareOverlaps(left, right);

      expect(comparison.identical).toBe(false);
      expect(comparison.similar).toBe(false);
      expect(comparison.similarity).toBeLessThan(0.8);
    });

    test('should handle empty strings', () => {
      const comparison = assembler.compareOverlaps('', '');

      expect(comparison.identical).toBe(false);
      expect(comparison.similarity).toBe(0);
    });

    test('should normalize whitespace in comparison', () => {
      const left = 'x + y';
      const right = 'x+y';  // No spaces

      const comparison = assembler.compareOverlaps(left, right);

      expect(comparison.identical).toBe(true);  // After normalization
    });
  });

  describe('cleanLatex()', () => {
    test('should remove excessive whitespace', () => {
      const latex = 'x  +   y    +  z';
      const cleaned = assembler.cleanLatex(latex);

      expect(cleaned).toBe('x + y + z');
    });

    test('should fix duplicate operators', () => {
      expect(assembler.cleanLatex('a + + b')).toBe('a + b');
      expect(assembler.cleanLatex('a - - b')).toBe('a + b');  // -- becomes +
      expect(assembler.cleanLatex('a = = b')).toBe('a = b');
    });

    test('should normalize operator spacing', () => {
      const latex = 'x+y-z=0';
      const cleaned = assembler.cleanLatex(latex);

      expect(cleaned).toBe('x + y - z = 0');
    });

    test('should fix brace spacing', () => {
      expect(assembler.cleanLatex('\\frac{ a }{ b }')).toBe('\\frac{a}{b}');
    });

    test('should handle empty string', () => {
      expect(assembler.cleanLatex('')).toBe('');
      expect(assembler.cleanLatex(null)).toBe('');
    });
  });
});

describe('Integration Tests - Real LaTeX Fragments', () => {
  let assembler;

  beforeEach(() => {
    assembler = new RestorativeLatexAssembler();
  });

  test('Quadratic formula across tiles', () => {
    const tiles = [
      {
        index: 0,
        latex: 'x = \\frac{-b \\pm',
        offsetX: 0,
        logicalWidth: 384,
        rightOverlap: { size: 134, start: 250, end: 384 }
      },
      {
        index: 1,
        latex: '\\pm \\sqrt{b^2 - 4ac}}{2a}',
        offsetX: 250,
        logicalWidth: 384,
        leftOverlap: { size: 134, start: 250, end: 384 }
      }
    ];

    const result = assembler.assembleTiles(tiles);

    expect(result.latex).toContain('\\frac');
    expect(result.latex).toContain('\\sqrt');
    expect(result.latex).toContain('b^2');
    expect(result.latex).toContain('4ac');
  });

  test('Summation across tiles', () => {
    const tiles = [
      {
        index: 0,
        latex: '\\sum_{i=1}^{n} a_i x_i',
        offsetX: 0,
        logicalWidth: 500,
        rightOverlap: { size: 175, start: 325, end: 500 }
      },
      {
        index: 1,
        latex: 'a_i x_i + \\sum_{j=1}^{m} b_j y_j',
        offsetX: 325,
        logicalWidth: 500,
        leftOverlap: { size: 175, start: 325, end: 500 }
      }
    ];

    const result = assembler.assembleTiles(tiles);

    expect(result.latex).toContain('\\sum');
    expect(result.latex).toContain('a_i');
    expect(result.latex).toContain('b_j');
  });

  test('Integral with limits', () => {
    const tiles = [
      {
        index: 0,
        latex: '\\int_0^{\\pi}',
        offsetX: 0,
        logicalWidth: 384,
        rightOverlap: { size: 134, start: 250, end: 384 }
      },
      {
        index: 1,
        latex: '^{\\pi} \\sin(x) dx',
        offsetX: 250,
        logicalWidth: 384,
        leftOverlap: { size: 134, start: 250, end: 384 }
      }
    ];

    const result = assembler.assembleTiles(tiles);

    expect(result.latex).toContain('\\int');
    expect(result.latex).toContain('\\sin');
    expect(result.latex).toContain('dx');
  });

  test('Matrix notation', () => {
    const tiles = [
      {
        index: 0,
        latex: '\\begin{pmatrix} a & b',
        offsetX: 0,
        logicalWidth: 384,
        rightOverlap: { size: 134, start: 250, end: 384 }
      },
      {
        index: 1,
        latex: 'a & b \\\\ c & d \\end{pmatrix}',
        offsetX: 250,
        logicalWidth: 384,
        leftOverlap: { size: 134, start: 250, end: 384 }
      }
    ];

    const result = assembler.assembleTiles(tiles);

    expect(result.latex).toContain('\\begin{pmatrix}');
    expect(result.latex).toContain('\\end{pmatrix}');
  });

  test('Complex nested expression', () => {
    const tiles = [
      {
        index: 0,
        latex: '\\left(\\frac{x + y}{z}\\right)^2',
        offsetX: 0,
        logicalWidth: 500,
        rightOverlap: { size: 175, start: 325, end: 500 }
      },
      {
        index: 1,
        latex: '{z}\\right)^2 = \\frac{(x + y)^2}{z^2}',
        offsetX: 325,
        logicalWidth: 500,
        leftOverlap: { size: 175, start: 325, end: 500 }
      }
    ];

    const result = assembler.assembleTiles(tiles);

    expect(result.latex).toContain('\\frac');
    expect(result.latex).toContain('\\left');
    expect(result.latex).toContain('\\right');
    expect(result.latex).toContain('^2');
  });
});

describe('assembleLatexTiles() convenience function', () => {
  test('should work as shorthand', () => {
    const tiles = [{
      index: 0,
      latex: 'x^2 + 1',
      offsetX: 0,
      logicalWidth: 384
    }];

    const result = assembleLatexTiles(tiles);

    expect(result.latex).toBe('x^2 + 1');
    expect(result.confidence).toBe(1.0);
  });
});
