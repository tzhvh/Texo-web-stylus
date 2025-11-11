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
import Logger from '../utils/logger.js';

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
  const debug = config.debug || false;

  if (debug) {
    Logger.debug('EquivalenceChecker', 'Starting equivalence check', {
      input1: latex1,
      input2: latex2
    }, ['equivalence', 'check-start']);
  }

  // Step 1: Parse LaTeX to AST
  const parsed1 = parseLatex(latex1);
  const parsed2 = parseLatex(latex2);

  if (debug) {
    Logger.debug('EquivalenceChecker', 'LaTeX parsed to AST', {
      parsed1Success: parsed1.success,
      parsed2Success: parsed2.success,
      parsed1Error: parsed1.error,
      parsed2Error: parsed2.error
    }, ['equivalence', 'parse']);
  }

  if (!parsed1.success || !parsed2.success) {
    const error = parsed1.error || parsed2.error;
    Logger.error('EquivalenceChecker', 'Parse error', {
      error,
      latex1,
      latex2
    }, ['equivalence', 'parse-error']);

    return {
      equivalent: false,
      method: 'parse-error',
      error,
      time: performance.now() - startTime
    };
  }

  // Step 2: Simplify KaTeX AST
  const ast1 = simplifyKatexAst(parsed1.ast);
  const ast2 = simplifyKatexAst(parsed2.ast);

  if (debug) {
    Logger.debug('EquivalenceChecker', 'AST simplified', {
      ast1: JSON.stringify(ast1),
      ast2: JSON.stringify(ast2)
    }, ['equivalence', 'simplify']);
  }

  // Step 3: Canonicalize both expressions
  const engine = createRuleEngine(config.region);

  const canonical1 = engine.canonicalize(ast1, config.maxCanonicalizationIterations);
  const canonical2 = engine.canonicalize(ast2, config.maxCanonicalizationIterations);

  if (debug) {
    Logger.debug('EquivalenceChecker', 'Canonicalization complete', {
      expr1Iterations: canonical1.iterations,
      expr1AppliedRules: canonical1.appliedRules,
      expr1AST: JSON.stringify(canonical1.ast),
      expr2Iterations: canonical2.iterations,
      expr2AppliedRules: canonical2.appliedRules,
      expr2AST: JSON.stringify(canonical2.ast)
    }, ['equivalence', 'canonicalize']);
  }

  // Step 4: Compare canonical forms (string comparison)
  const str1 = astToString(canonical1.ast, config);
  const str2 = astToString(canonical2.ast, config);

  if (debug) {
    Logger.debug('EquivalenceChecker', 'Canonical string comparison', {
      canonical1: str1,
      canonical2: str2,
      match: str1 === str2
    }, ['equivalence', 'compare']);
  }

  const fastCheckTime = performance.now() - startTime;

  if (str1 === str2) {
    Logger.info('EquivalenceChecker', '✓ Canonicalization succeeded', {
      method: 'canonicalization',
      time: fastCheckTime
    }, ['equivalence', 'success']);

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
    Logger.debug('EquivalenceChecker', 'Canonicalization failed, trying Algebrite', {}, ['equivalence', 'algebrite-fallback']);

    try {
      const algebraicCheck = checkWithAlgebrite(latex1, latex2, config.algebriteTimeout, debug);

      if (debug) {
        Logger.debug('EquivalenceChecker', 'Algebrite check complete', {
          result: algebraicCheck
        }, ['equivalence', 'algebrite-result']);
      }

      return {
        equivalent: algebraicCheck.equivalent,
        method: algebraicCheck.method,
        canonical1: str1,
        canonical2: str2,
        algebrite: algebraicCheck,
        time: performance.now() - startTime
      };
    } catch (error) {
      Logger.error('EquivalenceChecker', 'Algebrite error', {
        error: error.message,
        stack: error.stack
      }, ['equivalence', 'algebrite-error']);

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
  Logger.warn('EquivalenceChecker', '✗ All methods failed', {
    canonical1: str1,
    canonical2: str2
  }, ['equivalence', 'failed']);

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
 * @param {boolean} debug - Enable debug logging
 * @returns {Object} - { equivalent: boolean, method: string }
 */
function checkWithAlgebrite(latex1, latex2, timeout = 2000, debug = false) {
  const startTime = performance.now();

  try {
    // Convert LaTeX to Algebrite syntax (simplified conversion)
    const expr1 = latexToAlgebrite(latex1);
    const expr2 = latexToAlgebrite(latex2);

    if (debug) {
      Logger.debug('Algebrite', 'LaTeX converted to Algebrite syntax', {
        latex1,
        expr1,
        latex2,
        expr2
      }, ['algebrite', 'convert']);
    }

    // Check if difference simplifies to zero
    const differenceExpr = `simplify(${expr1} - (${expr2}))`;

    Logger.debug('Algebrite', 'Computing difference', {
      expression: differenceExpr
    }, ['algebrite', 'difference']);

    const difference = Algebrite.run(differenceExpr);

    Logger.debug('Algebrite', 'Difference computed', {
      result: difference,
      isZero: difference === '0' || difference === '0.0'
    }, ['algebrite', 'difference-result']);

    const isZero = difference === '0' || difference === '0.0';

    if (isZero) {
      Logger.info('Algebrite', '✓ Difference is zero - expressions are equivalent', {
        time: performance.now() - startTime
      }, ['algebrite', 'success']);

      return {
        equivalent: true,
        method: 'algebrite-difference',
        difference: '0',
        expr1,
        expr2,
        time: performance.now() - startTime
      };
    }

    // Try expanding and simplifying both
    Logger.debug('Algebrite', 'Trying individual simplification', {}, ['algebrite', 'simplify']);

    const simplified1 = Algebrite.run(`simplify(${expr1})`);
    const simplified2 = Algebrite.run(`simplify(${expr2})`);

    Logger.debug('Algebrite', 'Simplification complete', {
      simplified1,
      simplified2,
      match: simplified1 === simplified2
    }, ['algebrite', 'simplify-result']);

    if (simplified1 === simplified2) {
      Logger.info('Algebrite', '✓ Simplified forms match', {
        simplified: simplified1,
        time: performance.now() - startTime
      }, ['algebrite', 'success']);

      return {
        equivalent: true,
        method: 'algebrite-simplify',
        simplified: simplified1,
        expr1,
        expr2,
        time: performance.now() - startTime
      };
    }

    Logger.warn('Algebrite', '✗ Not equivalent', {
      simplified1,
      simplified2
    }, ['algebrite', 'not-equivalent']);

    return {
      equivalent: false,
      method: 'algebrite-not-equivalent',
      expr1: simplified1,
      expr2: simplified2,
      originalExpr1: expr1,
      originalExpr2: expr2,
      time: performance.now() - startTime
    };

  } catch (error) {
    Logger.error('Algebrite', 'Computation error', {
      error: error.message,
      stack: error.stack,
      latex1,
      latex2
    }, ['algebrite', 'error']);

    throw new Error(`Algebrite error: ${error.message}`);
  }
}

/**
 * Convert LaTeX to Algebrite syntax (simplified)
 * Note: This is a basic conversion. For production, use a proper LaTeX parser.
 */
function latexToAlgebrite(latex) {
  let result = latex;

  // Handle Unicode superscripts (⁰¹²³⁴⁵⁶⁷⁸⁹)
  const superscripts = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
  };

  // Replace Unicode superscripts with ^{n}
  for (const [unicode, digit] of Object.entries(superscripts)) {
    result = result.replace(new RegExp(unicode, 'g'), `**${digit}`);
  }

  // Handle Unicode math symbols
  result = result
    .replace(/·/g, '*')          // Unicode middle dot (U+00B7)
    .replace(/×/g, '*')          // Unicode multiplication sign (U+00D7)
    .replace(/÷/g, '/')          // Unicode division sign (U+00F7)

    // Handle LaTeX commands
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '($2)**(1/($1))')  // nth root
    .replace(/\^{([^}]+)}/g, '**($1)')     // ^{...}
    .replace(/\^(\w)/g, '**$1')             // ^x
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
    .replace(/\\left\|/g, 'abs(')
    .replace(/\\right\|/g, ')')

    // Handle remaining braces
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')

    // Clean up
    .replace(/\$/g, '')
    .replace(/\\,/g, '')         // thin space
    .replace(/\\ /g, '');         // space

  // Handle implicit multiplication (e.g., "4x" -> "4*x", "2(x+1)" -> "2*(x+1)")
  result = result
    // Number followed by letter
    .replace(/(\d)([a-zA-Z])/g, '$1*$2')
    // Number followed by opening paren
    .replace(/(\d)\(/g, '$1*(')
    // Closing paren followed by number
    .replace(/\)(\d)/g, ')*$1')
    // Closing paren followed by letter
    .replace(/\)([a-zA-Z])/g, ')*$1')
    // Letter followed by opening paren
    .replace(/([a-zA-Z])\(/g, '$1*(');

  return result;
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
