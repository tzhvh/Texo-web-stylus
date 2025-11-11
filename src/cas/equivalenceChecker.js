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
      const algebraicCheck = checkWithAlgebrite(latex1, latex2, config.algebriteTimeout, debug, config.floatTolerance);

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
 * Check if a value is approximately zero within tolerance
 * @param {string} value - The value to check (as string from Algebrite)
 * @param {number} tolerance - The tolerance threshold
 * @returns {boolean} - True if value is approximately zero
 */
function isApproximatelyZero(value, tolerance = FLOAT_TOLERANCE) {
  // Exact zero strings
  if (value === '0' || value === '0.0') {
    return true;
  }

  // Try to parse as number
  // Remove trailing ellipsis if present (e.g., "0.000001...")
  const cleaned = value.replace(/\.\.\.+$/, '').trim();

  // Handle scientific notation and regular decimals
  const num = parseFloat(cleaned);

  if (!isNaN(num)) {
    return Math.abs(num) < tolerance;
  }

  // Check for very small decimal representation
  if (/^-?0\.0+[1-9]?/.test(cleaned)) {
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      return Math.abs(num) < tolerance;
    }
  }

  return false;
}

/**
 * Normalize Algebrite expression by removing explicit multiplication operators between variables
 * This handles: "a*c" → "ac", "a*c+a*d" → "ac+ad", "ac/(bd)" → "ac/bd"
 * @param {string} expr - Algebrite expression
 * @returns {string} - Normalized expression
 */
function normalizeAlgebriteExpr(expr) {
  let result = expr;

  // Remove explicit * between single letters/variables
  // Pattern: letter * letter → letter+letter
  result = result.replace(/([a-z])\*([a-z])/gi, '$1$2');

  // Remove unnecessary parentheses around products in denominators
  // Pattern: /(xy) → /xy, /(abc) → /abc
  result = result.replace(/\/\(([a-z]+)\)/gi, '/$1');

  return result;
}

/**
 * Check equivalence using Algebrite CAS
 * @param {string} latex1 - First LaTeX expression
 * @param {string} latex2 - Second LaTeX expression
 * @param {number} timeout - Timeout in milliseconds
 * @param {boolean} debug - Enable debug logging
 * @param {number} tolerance - Tolerance for approximate equality
 * @returns {Object} - { equivalent: boolean, method: string }
 */
function checkWithAlgebrite(latex1, latex2, timeout = 2000, debug = false, tolerance = FLOAT_TOLERANCE) {
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
      isZero: isApproximatelyZero(difference, tolerance)
    }, ['algebrite', 'difference-result']);

    const isZero = isApproximatelyZero(difference, tolerance);

    if (isZero) {
      Logger.info('Algebrite', '✓ Difference is zero - expressions are equivalent', {
        time: performance.now() - startTime
      }, ['algebrite', 'success']);

      return {
        equivalent: true,
        method: 'algebrite-difference',
        difference: difference,
        expr1,
        expr2,
        time: performance.now() - startTime
      };
    }

    // Try expanding and simplifying both (with trig expansion for identities)
    Logger.debug('Algebrite', 'Trying individual simplification', {}, ['algebrite', 'simplify']);

    // First try with circexp to expand trig functions
    let simplified1 = Algebrite.run(`simplify(circexp(${expr1}))`);
    let simplified2 = Algebrite.run(`simplify(circexp(${expr2}))`);

    // If circexp didn't help, try regular simplify
    if (simplified1.includes('circexp') || simplified2.includes('circexp')) {
      simplified1 = Algebrite.run(`simplify(${expr1})`);
      simplified2 = Algebrite.run(`simplify(${expr2})`);
    }

    // Normalize both by removing explicit multiplication between variables
    const normalized1 = normalizeAlgebriteExpr(simplified1);
    const normalized2 = normalizeAlgebriteExpr(simplified2);

    Logger.debug('Algebrite', 'Simplification complete', {
      simplified1,
      simplified2,
      normalized1,
      normalized2,
      match: normalized1 === normalized2
    }, ['algebrite', 'simplify-result']);

    if (normalized1 === normalized2) {
      Logger.info('Algebrite', '✓ Simplified forms match', {
        simplified: normalized1,
        time: performance.now() - startTime
      }, ['algebrite', 'success']);

      return {
        equivalent: true,
        method: 'algebrite-simplify',
        simplified: normalized1,
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
 * Important: Algebrite uses ^ for exponentiation, not ** (like JavaScript/Python)
 */
function latexToAlgebrite(latex) {
  let result = latex;

  // Handle Unicode superscripts (⁰¹²³⁴⁵⁶⁷⁸⁹)
  const superscripts = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
  };

  // Replace Unicode superscripts with ^n (Algebrite uses ^ not **)
  for (const [unicode, digit] of Object.entries(superscripts)) {
    result = result.replace(new RegExp(unicode, 'g'), `^${digit}`);
  }

  // Handle Unicode math symbols
  result = result
    .replace(/·/g, '*')          // Unicode middle dot (U+00B7)
    .replace(/×/g, '*')          // Unicode multiplication sign (U+00D7)
    .replace(/÷/g, '/')          // Unicode division sign (U+00F7)

    // Handle LaTeX commands
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))')  // Extra parens for safety
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '($2)^(1/($1))')  // nth root: use ^ not **
    .replace(/\^{([^}]+)}/g, '^($1)')      // ^{...} -> ^(...)
    .replace(/\^(\w)/g, '^$1')              // ^x stays as ^x (Algebrite syntax)
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

  // CRITICAL FIX: Handle function exponentiation before implicit multiplication
  // Convert sin^2(x) to (sin(x))^2 by wrapping function calls
  // This handles \sin^2(x), \cos^2(x), etc.
  result = convertFunctionPowers(result);

  // Handle implicit multiplication (e.g., "4x" -> "4*x", "2(x+1)" -> "2*(x+1)")
  result = result
    // Number followed by letter (but not after ^)
    .replace(/(\d)(?!\^)([a-zA-Z])/g, '$1*$2')
    // Letter followed by opening paren (except for known functions)
    .replace(/([a-zA-Z])(?!bs)\(/g, (match, letter, offset, string) => {
      // Check if this is part of a function name (sin, cos, tan, log, sqrt, abs)
      const before = string.substring(Math.max(0, offset - 10), offset + 1);
      if (/(?:sin|cos|tan|log|sqrt|abs)$/.test(before)) {
        return match; // Don't add * for function calls
      }
      return letter + '*(';
    })
    // CRITICAL FIX: Adjacent parentheses - closing paren followed by opening paren
    .replace(/\)\s*\(/g, ')*(')
    // Closing paren followed by number
    .replace(/\)(\d)/g, ')*$1')
    // Closing paren followed by letter
    .replace(/\)([a-zA-Z])/g, ')*$1')
    // Number followed by opening paren (but not immediately after ^)
    .replace(/(\d)(?!\^)\(/g, (match, digit, offset, string) => {
      // Check if the digit is part of an exponent operator (^)
      if (offset >= 1 && string[offset - 1] === '^') {
        return match; // Don't add * after exponent
      }
      return digit + '*(';
    });

  return result;
}

/**
 * Convert function exponentiation to proper Algebrite syntax
 * Transforms: sin^2(x) → (sin(x))^2
 * Handles: sin, cos, tan, log, ln, sqrt
 */
function convertFunctionPowers(str) {
  // Pattern: (function)^digit followed by opening paren
  // We need to find the matching closing paren and wrap the entire function call

  const funcPattern = /(sin|cos|tan|log|sqrt)\^(\d+)\(/g;
  let result = str;
  let match;

  // Use a loop to handle multiple occurrences
  while ((match = funcPattern.exec(str)) !== null) {
    const funcName = match[1];
    const exponent = match[2];
    const startIdx = match.index;
    const parenStartIdx = match.index + match[0].length - 1; // Index of opening (

    // Find matching closing parenthesis
    let depth = 1;
    let parenEndIdx = parenStartIdx + 1;

    while (depth > 0 && parenEndIdx < str.length) {
      if (str[parenEndIdx] === '(') depth++;
      if (str[parenEndIdx] === ')') depth--;
      parenEndIdx++;
    }

    if (depth === 0) {
      // Found matching paren, now reconstruct
      const arg = str.substring(parenStartIdx + 1, parenEndIdx - 1);
      const replacement = `(${funcName}(${arg}))^${exponent}`;

      // Replace in result
      result = str.substring(0, startIdx) + replacement + str.substring(parenEndIdx);

      // Update str for next iteration
      str = result;

      // Reset regex lastIndex since we modified the string
      funcPattern.lastIndex = 0;
    } else {
      break; // Malformed expression
    }
  }

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
