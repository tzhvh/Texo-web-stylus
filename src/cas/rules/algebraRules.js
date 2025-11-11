/**
 * Algebraic Canonicalization Rules
 * Rules for normalizing algebraic expressions
 */

import { isType, isNumber, getNumber, isVariable, extractTerms, extractFactors } from './ruleEngine.js';

/**
 * Get all algebra canonicalization rules
 */
export function getAlgebraRules() {
  return [
    // Rule: Flatten nested additions
    // (a + (b + c)) → (a + b + c)
    {
      name: 'flatten-addition',
      description: 'Flatten nested additions',
      priority: 100,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Check if any element is a delimited addition
        return ast.some(node =>
          isType(node, 'delimited') &&
          Array.isArray(node.body) &&
          node.body.some(n => isType(n, 'operator') && n.op === '+')
        );
      },
      transform: (ast) => {
        const flattened = [];
        for (const node of ast) {
          if (isType(node, 'delimited') && node.body) {
            flattened.push(...node.body);
          } else {
            flattened.push(node);
          }
        }
        return flattened;
      }
    },

    // Rule: Combine like constants
    // 2 + 3 → 5
    {
      name: 'combine-constants',
      description: 'Combine adjacent numeric constants',
      priority: 90,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Look for pattern: number operator number
        for (let i = 0; i < ast.length - 2; i++) {
          if (isNumber(ast[i]) && isType(ast[i + 1], 'operator') && isNumber(ast[i + 2])) {
            return true;
          }
        }
        return false;
      },
      transform: (ast) => {
        const result = [];
        let i = 0;

        while (i < ast.length) {
          if (i < ast.length - 2 &&
            isNumber(ast[i]) &&
            isType(ast[i + 1], 'operator') &&
            isNumber(ast[i + 2])) {

            const left = getNumber(ast[i]);
            const op = ast[i + 1].op;
            const right = getNumber(ast[i + 2]);

            let value;
            switch (op) {
              case '+':
                value = left + right;
                break;
              case '-':
                value = left - right;
                break;
              case '\\cdot':
              case '\\times':
              case '*':
                value = left * right;
                break;
              case '/':
                value = left / right;
                break;
              default:
                result.push(ast[i], ast[i + 1], ast[i + 2]);
                i += 3;
                continue;
            }

            result.push({ type: 'number', value });
            i += 3;
          } else {
            result.push(ast[i]);
            i++;
          }
        }

        return result;
      }
    },

    // Rule: Combine like terms
    // 2x + 3x → 5x, 4xy + 2xy → 6xy
    {
      name: 'combine-like-terms',
      description: 'Combine terms with same variable part',
      priority: 68,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Check if expression contains addition
        if (!ast.some(node => isType(node, 'operator') && node.op === '+')) return false;

        // Extract terms and check for like terms
        const terms = extractTerms(ast);
        const variableParts = new Map();

        for (const term of terms) {
          const { coefficient, variablePart } = extractCoefficientAndVariables(term);
          const key = JSON.stringify(stripLoc(variablePart));
          if (variablePart !== null) {
            if (variableParts.has(key)) {
              return true; // Found like terms
            }
            variableParts.set(key, coefficient);
          }
        }

        return false;
      },
      transform: (ast) => {
        const terms = extractTerms(ast);
        const grouped = new Map();

        // Group terms by their variable part
        for (const term of terms) {
          const { coefficient, variablePart } = extractCoefficientAndVariables(term);
          const key = JSON.stringify(stripLoc(variablePart));

          if (!grouped.has(key)) {
            grouped.set(key, { coefficients: [], variablePart });
          }
          grouped.get(key).coefficients.push(coefficient);
        }

        // Combine coefficients for each group
        const result = [];
        let first = true;

        for (const [, group] of grouped) {
          const totalCoeff = group.coefficients.reduce((sum, c) => sum + c, 0);

          // Skip terms with zero coefficient
          if (totalCoeff === 0) continue;

          // Add operator before each term (except first)
          if (!first) {
            result.push({ type: 'operator', op: '+' });
          }
          first = false;

          // Add coefficient if not 1 or if no variable part
          if (group.variablePart === null || totalCoeff !== 1) {
            result.push({ type: 'number', value: totalCoeff });
          }

          // Add variable part with multiplication operator if needed
          if (group.variablePart !== null) {
            if (totalCoeff !== 1) {
              result.push({ type: 'operator', op: '\\cdot' });
            }
            result.push(...group.variablePart);
          }
        }

        return result.length > 0 ? result : [{ type: 'number', value: 0 }];
      }
    },

    // Rule: Sort commutative operands alphabetically
    // c + b + a → a + b + c
    {
      name: 'sort-addition-terms',
      description: 'Sort addition terms alphabetically',
      priority: 80,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Check if expression contains addition
        return ast.some(node => isType(node, 'operator') && node.op === '+');
      },
      transform: (ast) => {
        const terms = extractTerms(ast);

        // Sort terms by a canonical string representation
        const sortedTerms = terms.sort((a, b) => {
          const aStr = JSON.stringify(a);
          const bStr = JSON.stringify(b);
          return aStr.localeCompare(bStr);
        });

        // Rebuild expression
        const result = [];
        for (let i = 0; i < sortedTerms.length; i++) {
          if (i > 0) {
            result.push({ type: 'operator', op: '+' });
          }
          result.push(...sortedTerms[i]);
        }

        return result;
      }
    },

    // Rule: Sort multiplication factors alphabetically
    // c * b * a → a * b * c
    {
      name: 'sort-multiplication-factors',
      description: 'Sort multiplication factors alphabetically',
      priority: 75,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Check if expression contains multiplication
        return ast.some(node => isType(node, 'operator') &&
          (node.op === '\\cdot' || node.op === '\\times' || node.op === '*'));
      },
      transform: (ast) => {
        const factors = extractFactors(ast);

        // Separate numeric factors from non-numeric
        const numericFactors = [];
        const nonNumericFactors = [];

        for (const factor of factors) {
          if (factor.op === null && factor.nodes.length === 1 && isNumber(factor.nodes[0])) {
            numericFactors.push(factor);
          } else if (factor.op === null) {
            nonNumericFactors.push(factor);
          }
        }

        // Sort non-numeric factors alphabetically
        nonNumericFactors.sort((a, b) => {
          const aStr = JSON.stringify(a.nodes);
          const bStr = JSON.stringify(b.nodes);
          return aStr.localeCompare(bStr);
        });

        // Rebuild: numbers first, then sorted variables
        const result = [];
        const allFactors = [...numericFactors, ...nonNumericFactors];

        for (let i = 0; i < allFactors.length; i++) {
          if (i > 0) {
            result.push({ type: 'operator', op: '\\cdot' });
          }
          result.push(...allFactors[i].nodes);
        }

        return result.length > 0 ? result : ast;
      }
    },

    // Rule: Move minus signs into numerator
    // a / (-b) → -(a / b)
    {
      name: 'normalize-fraction-signs',
      description: 'Move negative signs out of denominators',
      priority: 85,
      region: ['US', 'UK', 'EU'],
      match: (node) => {
        if (!isType(node, 'fraction')) return false;
        // Check if denominator starts with negative sign
        const denom = node.denominator;
        if (Array.isArray(denom) && denom.length > 0) {
          return isType(denom[0], 'sign') && denom[0].value === '-';
        }
        return false;
      },
      transform: (node) => {
        // Remove sign from denominator
        const newDenom = node.denominator.slice(1);

        // Add sign to numerator
        const newNumer = [{ type: 'sign', value: '-' }, ...node.numerator];

        return {
          ...node,
          numerator: newNumer,
          denominator: newDenom
        };
      }
    },

    // Rule: Simplify double negatives
    // -(-x) → x
    {
      name: 'simplify-double-negative',
      description: 'Remove double negatives',
      priority: 95,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Look for pattern: - (delimited with -)
        for (let i = 0; i < ast.length - 1; i++) {
          if (isType(ast[i], 'sign') && ast[i].value === '-') {
            const next = ast[i + 1];
            if (isType(next, 'delimited') && Array.isArray(next.body) && next.body.length > 0) {
              if (isType(next.body[0], 'sign') && next.body[0].value === '-') {
                return true;
              }
            }
          }
        }
        return false;
      },
      transform: (ast) => {
        const result = [];
        let i = 0;

        while (i < ast.length) {
          if (i < ast.length - 1 &&
            isType(ast[i], 'sign') && ast[i].value === '-') {
            const next = ast[i + 1];
            if (isType(next, 'delimited') && Array.isArray(next.body) && next.body.length > 0 &&
              isType(next.body[0], 'sign') && next.body[0].value === '-') {
              // Remove both negatives
              result.push(...next.body.slice(1));
              i += 2;
              continue;
            }
          }
          result.push(ast[i]);
          i++;
        }

        return result;
      }
    },

    // Rule: Normalize multiplication notation
    // 2x → 2 * x (internal representation)
    {
      name: 'explicit-multiplication',
      description: 'Make implicit multiplication explicit',
      priority: 70,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;
        // Look for number followed by variable without operator
        for (let i = 0; i < ast.length - 1; i++) {
          if (isNumber(ast[i]) && isVariable(ast[i + 1])) {
            return true;
          }
        }
        return false;
      },
      transform: (ast) => {
        const result = [];
        let i = 0;

        while (i < ast.length) {
          result.push(ast[i]);

          // Check if next is a variable (implicit multiplication)
          if (i < ast.length - 1 && isNumber(ast[i]) && isVariable(ast[i + 1])) {
            result.push({ type: 'operator', op: '\\cdot' });
          }

          i++;
        }

        return result;
      }
    },

    // Rule: Expand simple exponents
    // (x + y)^2 → x^2 + 2xy + y^2 (for small integer exponents)
    {
      name: 'expand-binomial-square',
      description: 'Expand (a + b)^2 to a^2 + 2ab + b^2',
      priority: 60,
      region: ['US', 'UK', 'EU'],
      match: (node) => {
        if (!isType(node, 'power')) return false;
        // Check if exponent is 2
        if (!Array.isArray(node.exponent) || node.exponent.length !== 1) return false;
        const exp = node.exponent[0];
        if (!isNumber(exp) || getNumber(exp) !== 2) return false;

        // Check if base is a sum of two terms
        const base = node.base;
        if (!isType(base, 'delimited')) return false;
        const terms = extractTerms(base.body);
        return terms.length === 2;
      },
      transform: (node) => {
        const base = node.base;
        const terms = extractTerms(base.body);
        const [a, b] = terms;

        // Return a^2 + 2ab + b^2 (simplified AST representation)
        return [
          {
            type: 'power',
            base: a,
            exponent: [{ type: 'number', value: 2 }]
          },
          { type: 'operator', op: '+' },
          { type: 'number', value: 2 },
          { type: 'operator', op: '\\cdot' },
          ...a,
          { type: 'operator', op: '\\cdot' },
          ...b,
          { type: 'operator', op: '+' },
          {
            type: 'power',
            base: b,
            exponent: [{ type: 'number', value: 2 }]
          }
        ];
      }
    }
  ];
}

/**
 * Helper function to strip loc data from AST for comparison
 */
function stripLoc(node) {
  if (!node) return node;
  if (Array.isArray(node)) {
    return node.map(stripLoc);
  }
  if (typeof node === 'object') {
    const copy = {};
    for (const key in node) {
      if (key !== 'loc') {
        copy[key] = stripLoc(node[key]);
      }
    }
    return copy;
  }
  return node;
}

/**
 * Helper function to extract coefficient and variable part from a term
 * Examples:
 *   [2, *, x] -> { coefficient: 2, variablePart: [x] }
 *   [x] -> { coefficient: 1, variablePart: [x] }
 *   [-, 3, *, x] -> { coefficient: -3, variablePart: [x] }
 *   [5] -> { coefficient: 5, variablePart: null }
 */
function extractCoefficientAndVariables(term) {
  if (!Array.isArray(term) || term.length === 0) {
    return { coefficient: 0, variablePart: null };
  }

  let coefficient = 1;
  let startIndex = 0;

  // Check for leading negative sign
  if (isType(term[0], 'sign') && term[0].value === '-') {
    coefficient = -1;
    startIndex = 1;
  }

  // Check if first element (after potential sign) is a number
  if (startIndex < term.length && isNumber(term[startIndex])) {
    coefficient *= getNumber(term[startIndex]);
    startIndex++;

    // Skip multiplication operator if present
    if (startIndex < term.length &&
        isType(term[startIndex], 'operator') &&
        (term[startIndex].op === '\\cdot' || term[startIndex].op === '\\times' || term[startIndex].op === '*')) {
      startIndex++;
    }
  }

  // Extract variable part (everything after coefficient)
  const variablePart = startIndex < term.length ? term.slice(startIndex) : null;

  return { coefficient, variablePart };
}
