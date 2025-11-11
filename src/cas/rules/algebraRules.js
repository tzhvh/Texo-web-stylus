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
