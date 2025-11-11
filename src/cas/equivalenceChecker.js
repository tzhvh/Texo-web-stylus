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
  const debug = config.debug || false;

  if (debug) {
    console.log('[EquivalenceChecker] Starting check');
    console.log('[EquivalenceChecker] Input 1:', latex1);
    console.log('[EquivalenceChecker] Input 2:', latex2);
  }

  // Step 1: Parse LaTeX to AST
  const parsed1 = parseLatex(latex1);
  const parsed2 = parseLatex(latex2);

  if (debug) {
    console.log('[EquivalenceChecker] Parsed 1:', parsed1);
    console.log('[EquivalenceChecker] Parsed 2:', parsed2);
  }

  if (!parsed1.success || !parsed2.success) {
    if (debug) {
      console.error('[EquivalenceChecker] Parse error:', parsed1.error || parsed2.error);
    }
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

  if (debug) {
    console.log('[EquivalenceChecker] Simplified AST 1:', JSON.stringify(ast1, null, 2));
    console.log('[EquivalenceChecker] Simplified AST 2:', JSON.stringify(ast2, null, 2));
  }

  // Step 3: Canonicalize both expressions
  const engine = createRuleEngine(config.region);

  const canonical1 = engine.canonicalize(ast1, config.maxCanonicalizationIterations);
  const canonical2 = engine.canonicalize(ast2, config.maxCanonicalizationIterations);

  if (debug) {
    console.log('[EquivalenceChecker] Canonical 1 iterations:', canonical1.iterations);
    console.log('[EquivalenceChecker] Canonical 1 applied rules:', canonical1.appliedRules);
    console.log('[EquivalenceChecker] Canonical 1 AST:', JSON.stringify(canonical1.ast, null, 2));
    console.log('[EquivalenceChecker] Canonical 2 iterations:', canonical2.iterations);
    console.log('[EquivalenceChecker] Canonical 2 applied rules:', canonical2.appliedRules);
    console.log('[EquivalenceChecker] Canonical 2 AST:', JSON.stringify(canonical2.ast, null, 2));
  }

  // Step 4: Compare canonical forms (string comparison)
  const str1 = astToString(canonical1.ast, config);
  const str2 = astToString(canonical2.ast, config);

  if (debug) {
    console.log('[EquivalenceChecker] Canonical string 1:', str1);
    console.log('[EquivalenceChecker] Canonical string 2:', str2);
    console.log('[EquivalenceChecker] Strings match:', str1 === str2);
  }

  const fastCheckTime = performance.now() - startTime;

  if (str1 === str2) {
    if (debug) {
      console.log('[EquivalenceChecker] ✓ Canonicalization succeeded');
    }
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
    if (debug) {
      console.log('[EquivalenceChecker] Canonicalization failed, trying Algebrite...');
    }
    try {
      const algebraicCheck = checkWithAlgebrite(latex1, latex2, config.algebriteTimeout, debug);

      if (debug) {
        console.log('[EquivalenceChecker] Algebrite result:', algebraicCheck);
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
      if (debug) {
        console.error('[EquivalenceChecker] Algebrite error:', error);
      }
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
  if (debug) {
    console.log('[EquivalenceChecker] ✗ All methods failed');
  }
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
      console.log('[Algebrite] Original LaTeX 1:', latex1);
      console.log('[Algebrite] Converted expr 1:', expr1);
      console.log('[Algebrite] Original LaTeX 2:', latex2);
      console.log('[Algebrite] Converted expr 2:', expr2);
    }

    // Check if difference simplifies to zero
    const differenceExpr = `simplify(${expr1} - (${expr2}))`;
    if (debug) {
      console.log('[Algebrite] Running:', differenceExpr);
    }
    const difference = Algebrite.run(differenceExpr);
    if (debug) {
      console.log('[Algebrite] Difference result:', difference);
    }
    const isZero = difference === '0' || difference === '0.0';

    if (isZero) {
      if (debug) {
        console.log('[Algebrite] ✓ Difference is zero');
      }
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
    if (debug) {
      console.log('[Algebrite] Trying simplify...');
    }
    const simplified1 = Algebrite.run(`simplify(${expr1})`);
    const simplified2 = Algebrite.run(`simplify(${expr2})`);

    if (debug) {
      console.log('[Algebrite] Simplified 1:', simplified1);
      console.log('[Algebrite] Simplified 2:', simplified2);
    }

    if (simplified1 === simplified2) {
      if (debug) {
        console.log('[Algebrite] ✓ Simplified forms match');
      }
      return {
        equivalent: true,
        method: 'algebrite-simplify',
        simplified: simplified1,
        expr1,
        expr2,
        time: performance.now() - startTime
      };
    }

    if (debug) {
      console.log('[Algebrite] ✗ Not equivalent');
    }
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
    if (debug) {
      console.error('[Algebrite] Error:', error);
    }
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
