/**
 * Equivalence Checker
 * Checks if two mathematical expressions are equivalent
 * Uses fast canonicalization first, falls back to Algebrite for complex cases
 */

import Algebrite from 'algebrite';
import { parseLatex, simplifyKatexAst } from './katexParser.js';
import { RuleEngine } from './rules/ruleEngine.js';
import { getAlgebraRules } from './rules/algebraRules.js';
import { getTrigRules } from './rules/trigRules.js';

// Floating-point tolerance for approximations
const FLOAT_TOLERANCE = 1e-6;

/**
 * Configuration for equivalence checking
 */
export const EquivalenceConfig = {
  region: 'US',
  floatTolerance: FLOAT_TOLERANCE,
  useAlgebrite: true,
  algebriteTimeout: 2000, // ms
  maxCanonicalizationIterations: 100
};

/**
 * Initialize rule engine with all rules
 */
export function createRuleEngine(region = 'US') {
  const engine = new RuleEngine(region);

  // Load all rule sets
  const allRules = [
    ...getAlgebraRules(),
    ...getTrigRules()
  ];

  allRules.forEach(rule => engine.addRule(rule));

  return engine;
}

/**
 * Normalize floating-point numbers to handle approximations
 */
function normalizeFloat(value, tolerance = FLOAT_TOLERANCE) {
  // Check if close to integer
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < tolerance) {
    return rounded;
  }

  // Check if close to common fractions
  const commonFractions = [
    [1, 2], [1, 3], [2, 3], [1, 4], [3, 4],
    [1, 5], [2, 5], [3, 5], [4, 5],
    [1, 6], [5, 6]
  ];

  for (const [num, den] of commonFractions) {
    const frac = num / den;
    if (Math.abs(value - frac) < tolerance) {
      return `${num}/${den}`;
    }
  }

  return value;
}

/**
 * Convert AST to a canonical string representation
 */
function astToString(ast, config = EquivalenceConfig) {
  if (!ast) return 'null';

  if (Array.isArray(ast)) {
    return ast.map(node => astToString(node, config)).join('|');
  }

  if (typeof ast !== 'object') {
    return String(ast);
  }

  switch (ast.type) {
    case 'number':
      const normalized = normalizeFloat(ast.value, config.floatTolerance);
      return `num:${normalized}`;

    case 'symbol':
      return `sym:${ast.value}`;

    case 'operator':
      return `op:${ast.op}`;

    case 'power':
      return `pow(${astToString(ast.base, config)},${astToString(ast.exponent, config)})`;

    case 'fraction':
      return `frac(${astToString(ast.numerator, config)},${astToString(ast.denominator, config)})`;

    case 'sqrt':
      return `sqrt(${astToString(ast.body, config)},${ast.index ? astToString(ast.index, config) : '2'})`;

    case 'function':
      return `func:${ast.name}(${ast.arg ? astToString(ast.arg, config) : ''})`;

    case 'delimited':
      return `delim(${astToString(ast.body, config)})`;

    default:
      return `${ast.type}:${JSON.stringify(ast)}`;
  }
}

/**
 * Fast equivalence check using canonicalization
 * @param {string} latex1 - First LaTeX expression
 * @param {string} latex2 - Second LaTeX expression
 * @param {Object} config - Configuration options
 * @returns {Object} - { equivalent: boolean, method: string, details: Object }
 */
export function checkEquivalence(latex1, latex2, config = EquivalenceConfig) {
  const startTime = performance.now();

  // Step 1: Parse LaTeX to AST
  const parsed1 = parseLatex(latex1);
  const parsed2 = parseLatex(latex2);

  if (!parsed1.success || !parsed2.success) {
    return {
      equivalent: false,
      method: 'parse-error',
      error: parsed1.error || parsed2.error,
      time: performance.now() - startTime
    };
  }

  // Step 2: Simplify KaTeX AST
  const ast1 = simplifyKatexAst(parsed1.ast);
  const ast2 = simplifyKatexAst(parsed2.ast);

  // Step 3: Canonicalize both expressions
  const engine = createRuleEngine(config.region);

  const canonical1 = engine.canonicalize(ast1, config.maxCanonicalizationIterations);
  const canonical2 = engine.canonicalize(ast2, config.maxCanonicalizationIterations);

  // Step 4: Compare canonical forms (string comparison)
  const str1 = astToString(canonical1.ast, config);
  const str2 = astToString(canonical2.ast, config);

  const fastCheckTime = performance.now() - startTime;

  if (str1 === str2) {
    return {
      equivalent: true,
      method: 'canonicalization',
      canonical1: str1,
      canonical2: str2,
      appliedRules: {
        expr1: canonical1.appliedRules,
        expr2: canonical2.appliedRules
      },
      time: fastCheckTime
    };
  }

  // Step 5: If canonicalization fails, try Algebrite (if enabled)
  if (config.useAlgebrite) {
    try {
      const algebraicCheck = checkWithAlgebrite(latex1, latex2, config.algebriteTimeout);

      return {
        equivalent: algebraicCheck.equivalent,
        method: algebraicCheck.method,
        canonical1: str1,
        canonical2: str2,
        algebrite: algebraicCheck,
        time: performance.now() - startTime
      };
    } catch (error) {
      return {
        equivalent: false,
        method: 'algebrite-error',
        error: error.message,
        canonical1: str1,
        canonical2: str2,
        time: performance.now() - startTime
      };
    }
  }

  // Step 6: Unable to determine equivalence
  return {
    equivalent: false,
    method: 'canonicalization-failed',
    canonical1: str1,
    canonical2: str2,
    time: performance.now() - startTime
  };
}

/**
 * Check equivalence using Algebrite CAS
 * @param {string} latex1 - First LaTeX expression
 * @param {string} latex2 - Second LaTeX expression
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Object} - { equivalent: boolean, method: string }
 */
function checkWithAlgebrite(latex1, latex2, timeout = 2000) {
  const startTime = performance.now();

  try {
    // Convert LaTeX to Algebrite syntax (simplified conversion)
    const expr1 = latexToAlgebrite(latex1);
    const expr2 = latexToAlgebrite(latex2);

    // Check if difference simplifies to zero
    const difference = Algebrite.run(`simplify(${expr1} - (${expr2}))`);
    const isZero = difference === '0' || difference === '0.0';

    if (isZero) {
      return {
        equivalent: true,
        method: 'algebrite-difference',
        difference: '0',
        time: performance.now() - startTime
      };
    }

    // Try expanding and simplifying both
    const simplified1 = Algebrite.run(`simplify(${expr1})`);
    const simplified2 = Algebrite.run(`simplify(${expr2})`);

    if (simplified1 === simplified2) {
      return {
        equivalent: true,
        method: 'algebrite-simplify',
        simplified: simplified1,
        time: performance.now() - startTime
      };
    }

    return {
      equivalent: false,
      method: 'algebrite-not-equivalent',
      expr1: simplified1,
      expr2: simplified2,
      time: performance.now() - startTime
    };

  } catch (error) {
    throw new Error(`Algebrite error: ${error.message}`);
  }
}

/**
 * Convert LaTeX to Algebrite syntax (simplified)
 * Note: This is a basic conversion. For production, use a proper LaTeX parser.
 */
function latexToAlgebrite(latex) {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\^/g, '**')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\log/g, 'log')
    .replace(/\\ln/g, 'log')
    .replace(/\\pi/g, 'pi')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\$/g, '');
}

/**
 * Batch check multiple expressions (for line-by-line validation)
 * @param {string[]} latexLines - Array of LaTeX expressions
 * @param {Object} config - Configuration options
 * @returns {Array} - Array of check results
 */
export function checkMultipleLines(latexLines, config = EquivalenceConfig) {
  const results = [];

  for (let i = 1; i < latexLines.length; i++) {
    const result = checkEquivalence(latexLines[i - 1], latexLines[i], config);
    results.push({
      lineNumber: i + 1,
      previousLine: latexLines[i - 1],
      currentLine: latexLines[i],
      ...result
    });
  }

  return results;
}
