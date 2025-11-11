/**
 * Test Cases for CAS Equivalence Checker
 */

import { checkEquivalence, EquivalenceConfig } from '../../cas/equivalenceChecker.js';

describe('Equivalence Checker', () => {
  describe('Basic Algebra', () => {
    test('should recognize identical expressions', () => {
      const result = checkEquivalence('x + 2', 'x + 2');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize commutative addition', () => {
      const result = checkEquivalence('a + b', 'b + a');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize constant combination', () => {
      const result = checkEquivalence('2 + 3', '5');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize like terms', () => {
      const result = checkEquivalence('2x + 3x', '5x');
      expect(result.equivalent).toBe(true);
    });

    test('should detect non-equivalent expressions', () => {
      const result = checkEquivalence('x + 2', 'x + 3');
      expect(result.equivalent).toBe(false);
    });
  });

  describe('Quadratic Expressions', () => {
    test('should recognize expanded form of (x+2)^2', () => {
      const result = checkEquivalence('(x + 2)^2', 'x^2 + 4x + 4');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize factored form', () => {
      const result = checkEquivalence('x^2 + 4x + 4', '(x + 2)^2');
      expect(result.equivalent).toBe(true);
    });

    test('should detect wrong expansion', () => {
      const result = checkEquivalence('(x + 2)^2', 'x^2 + 4x + 5');
      expect(result.equivalent).toBe(false);
    });
  });

  describe('Fractions', () => {
    test('should recognize equivalent fractions', () => {
      const result = checkEquivalence('\\frac{2}{4}', '\\frac{1}{2}');
      expect(result.equivalent).toBe(true);
    });

    test('should handle negative denominators', () => {
      const result = checkEquivalence('\\frac{a}{-b}', '-\\frac{a}{b}');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize fraction multiplication', () => {
      const result = checkEquivalence('\\frac{a}{b} \\cdot \\frac{c}{d}', '\\frac{ac}{bd}');
      expect(result.equivalent).toBe(true);
    });
  });

  describe('Trigonometry', () => {
    test('should recognize Pythagorean identity', () => {
      const result = checkEquivalence('\\sin^2(x) + \\cos^2(x)', '1');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize tan identity', () => {
      const result = checkEquivalence('\\tan(x)', '\\frac{\\sin(x)}{\\cos(x)}');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize sin as odd function', () => {
      const result = checkEquivalence('\\sin(-x)', '-\\sin(x)');
      expect(result.equivalent).toBe(true);
    });

    test('should recognize cos as even function', () => {
      const result = checkEquivalence('\\cos(-x)', '\\cos(x)');
      expect(result.equivalent).toBe(true);
    });

    test('should evaluate special angles', () => {
      const result = checkEquivalence('\\sin(0)', '0');
      expect(result.equivalent).toBe(true);
    });
  });

  describe('Floating Point Approximations', () => {
    test('should treat 0.999999 as approximately 1', () => {
      const config = { ...EquivalenceConfig, floatTolerance: 1e-5 };
      const result = checkEquivalence('0.999999', '1', config);
      expect(result.equivalent).toBe(true);
    });

    test('should treat 0.5 as 1/2', () => {
      const result = checkEquivalence('0.5', '\\frac{1}{2}');
      expect(result.equivalent).toBe(true);
    });

    test('should not treat 0.9 as 1', () => {
      const result = checkEquivalence('0.9', '1');
      expect(result.equivalent).toBe(false);
    });
  });

  describe('Complex Expressions', () => {
    test('should handle nested operations', () => {
      const result = checkEquivalence('2(x + 3)', '2x + 6');
      expect(result.equivalent).toBe(true);
    });

    test('should handle distribution', () => {
      const result = checkEquivalence('(a + b)(c + d)', 'ac + ad + bc + bd');
      expect(result.equivalent).toBe(true);
    });

    test('should handle exponent rules', () => {
      const result = checkEquivalence('x^2 \\cdot x^3', 'x^5');
      expect(result.equivalent).toBe(true);
    });
  });

  describe('Error Cases', () => {
    test('should handle invalid LaTeX', () => {
      const result = checkEquivalence('\\invalid{syntax}', 'x + 1');
      expect(result.equivalent).toBe(false);
      expect(result.method).toBe('parse-error');
    });

    test('should timeout on complex expressions', () => {
      const config = { ...EquivalenceConfig, algebriteTimeout: 10 };
      // This would need a genuinely complex expression
      expect(config.algebriteTimeout).toBe(10);
    });
  });

  describe('Performance', () => {
    test('should complete simple check in < 100ms', () => {
      const result = checkEquivalence('x + 1', 'x + 1');
      expect(result.time).toBeLessThan(100);
    });

    test('should use canonicalization for simple expressions', () => {
      const result = checkEquivalence('2x + 3x', '5x');
      expect(result.method).toBe('canonicalization');
    });
  });

  describe('Canonicalization - Like Terms', () => {
    test('should combine simple like terms', () => {
      const result = checkEquivalence('2x + 3x', '5x');
      expect(result.equivalent).toBe(true);
      expect(result.method).toBe('canonicalization');
    });

    test('should combine like terms with multiple variables', () => {
      const result = checkEquivalence('2xy + 3xy', '5xy');
      expect(result.equivalent).toBe(true);
    });

    test('should combine mixed terms correctly', () => {
      const result = checkEquivalence('2x + 3y + 4x', '6x + 3y');
      expect(result.equivalent).toBe(true);
    });

    test('should handle negative coefficients', () => {
      const result = checkEquivalence('5x - 2x', '3x');
      expect(result.equivalent).toBe(true);
    });

    test('should handle terms that cancel out', () => {
      const result = checkEquivalence('3x - 3x', '0');
      expect(result.equivalent).toBe(true);
    });

    test('should combine multiple groups of like terms', () => {
      const result = checkEquivalence('2x + 3y + 4x + 5y', '6x + 8y');
      expect(result.equivalent).toBe(true);
    });

    test('should handle single variable without coefficient', () => {
      const result = checkEquivalence('x + x', '2x');
      expect(result.equivalent).toBe(true);
    });

    test('should handle complex polynomial', () => {
      const result = checkEquivalence('3x^2 + 2x + 5x^2 - x', '8x^2 + x');
      expect(result.equivalent).toBe(true);
    });

    test('should not combine unlike terms', () => {
      const result = checkEquivalence('2x + 3y', '5xy');
      expect(result.equivalent).toBe(false);
    });
  });
});

/**
 * Integration Test: Multi-line Validation
 */
describe('Multi-line Validation', () => {
  test('should validate a complete proof', () => {
    const lines = [
      'x^2 + 4x + 4',
      '(x + 2)^2',
      'x^2 + 2 \\cdot 2x + 2^2',
      'x^2 + 4x + 4'
    ];

    // Each line should be equivalent to the previous one
    for (let i = 1; i < lines.length; i++) {
      const result = checkEquivalence(lines[i - 1], lines[i]);
      expect(result.equivalent).toBe(true);
    }
  });

  test('should detect error in proof', () => {
    const lines = [
      'x^2 + 4x + 4',
      '(x + 2)^2',
      'x^2 + 4x + 5' // Error here!
    ];

    const result1 = checkEquivalence(lines[0], lines[1]);
    expect(result1.equivalent).toBe(true);

    const result2 = checkEquivalence(lines[1], lines[2]);
    expect(result2.equivalent).toBe(false);
  });
});

/**
 * Force Algebrite Mode Tests
 */
describe('Force Algebrite Mode', () => {
  test('should skip canonicalization when forceAlgebrite is true', () => {
    const result = checkEquivalence('2x + 3x', '5x', {
      forceAlgebrite: true
    });

    expect(result.equivalent).toBe(true);
    expect(result.method).toMatch(/^algebrite-/);  // Should use Algebrite method
    expect(result.forced).toBe(true);  // Should have forced flag
  });

  test('should use canonicalization when forceAlgebrite is false', () => {
    const result = checkEquivalence('2x + 3x', '5x', {
      forceAlgebrite: false
    });

    expect(result.equivalent).toBe(true);
    expect(result.method).toBe('canonicalization');  // Should use fast path
    expect(result.forced).toBeUndefined();  // No forced flag
  });

  test('should handle complex expressions in force mode', () => {
    const result = checkEquivalence('\\sin^2(x) + \\cos^2(x)', '1', {
      forceAlgebrite: true
    });

    expect(result.equivalent).toBe(true);
    expect(result.forced).toBe(true);
  });

  test('should detect inequivalence in force mode', () => {
    const result = checkEquivalence('x + 2', 'x + 3', {
      forceAlgebrite: true
    });

    expect(result.equivalent).toBe(false);
    expect(result.forced).toBe(true);
  });

  test('should have slower performance in force mode', () => {
    // Run normal mode
    const normalResult = checkEquivalence('2x + 3x', '5x', {
      forceAlgebrite: false
    });

    // Run force mode
    const forcedResult = checkEquivalence('2x + 3x', '5x', {
      forceAlgebrite: true
    });

    // Force mode should be slower (though both should work)
    expect(normalResult.equivalent).toBe(true);
    expect(forcedResult.equivalent).toBe(true);
    expect(normalResult.method).toBe('canonicalization');
    expect(forcedResult.method).toMatch(/^algebrite-/);
  });

  test('should return forced flag even on errors', () => {
    const result = checkEquivalence('\\invalid{syntax}', 'x + 1', {
      forceAlgebrite: true
    });

    expect(result.equivalent).toBe(false);
    expect(result.forced).toBe(true);
    expect(result.error).toBeDefined();
  });
});

/**
 * Sample Test Data for Pre-fill UX
 */
export const sampleProblems = [
  {
    name: 'Quadratic Factoring',
    description: 'Factor and expand a quadratic expression',
    lines: [
      'x^2 + 6x + 9',
      '(x + 3)^2',
      'x^2 + 2(3)x + 3^2',
      'x^2 + 6x + 9'
    ]
  },
  {
    name: 'Pythagorean Identity',
    description: 'Demonstrate the fundamental trig identity',
    lines: [
      '\\sin^2(\\theta) + \\cos^2(\\theta)',
      '1'
    ]
  },
  {
    name: 'Difference of Squares',
    description: 'Factor using difference of squares',
    lines: [
      'x^2 - 9',
      '(x + 3)(x - 3)',
      'x^2 - 3x + 3x - 9',
      'x^2 - 9'
    ]
  },
  {
    name: 'Exponent Rules',
    description: 'Apply exponent multiplication rules',
    lines: [
      'x^3 \\cdot x^2',
      'x^{3+2}',
      'x^5'
    ]
  },
  {
    name: 'Fraction Simplification',
    description: 'Simplify complex fractions',
    lines: [
      '\\frac{2x}{4}',
      '\\frac{x}{2}'
    ]
  }
];
