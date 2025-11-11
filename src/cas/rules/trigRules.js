/**
 * Trigonometric Canonicalization Rules
 * Rules for normalizing trigonometric expressions
 */

import { isType, isNumber, getNumber } from './ruleEngine.js';

/**
 * Get all trigonometry canonicalization rules
 */
export function getTrigRules() {
  return [
    // Rule: sin^2(x) + cos^2(x) = 1
    {
      name: 'pythagorean-identity',
      description: 'sin²(x) + cos²(x) → 1',
      priority: 100,
      region: ['US', 'UK', 'EU'],
      match: (ast) => {
        if (!Array.isArray(ast)) return false;

        // Look for pattern: sin^2(...) + cos^2(...)
        let hasSinSquared = false;
        let hasCosSquared = false;
        let sameArg = null;

        for (let i = 0; i < ast.length; i++) {
          const node = ast[i];

          if (isType(node, 'power')) {
            const base = node.base;
            const exp = node.exponent;

            // Check if exponent is 2
            if (Array.isArray(exp) && exp.length === 1 && isNumber(exp[0]) && getNumber(exp[0]) === 2) {
              // Check if base is sin or cos function
              if (isType(base, 'function')) {
                const arg = JSON.stringify(base.arg);
                if (base.name === 'sin') {
                  hasSinSquared = true;
                  if (sameArg === null) sameArg = arg;
                  else if (sameArg !== arg) return false;
                } else if (base.name === 'cos') {
                  hasCosSquared = true;
                  if (sameArg === null) sameArg = arg;
                  else if (sameArg !== arg) return false;
                }
              }
            }
          }
        }

        return hasSinSquared && hasCosSquared;
      },
      transform: (ast) => {
        return [{ type: 'number', value: 1 }];
      }
    },

    // Rule: tan(x) = sin(x) / cos(x)
    {
      name: 'tan-identity',
      description: 'tan(x) → sin(x)/cos(x)',
      priority: 80,
      region: ['US', 'UK', 'EU'],
      match: (node) => {
        return isType(node, 'function') && node.name === 'tan';
      },
      transform: (node) => {
        return {
          type: 'fraction',
          numerator: [{
            type: 'function',
            name: 'sin',
            arg: node.arg
          }],
          denominator: [{
            type: 'function',
            name: 'cos',
            arg: node.arg
          }]
        };
      }
    },

    // Rule: sin(-x) = -sin(x)
    {
      name: 'sin-odd-function',
      description: 'sin(-x) → -sin(x)',
      priority: 90,
      region: ['US', 'UK', 'EU'],
      match: (node) => {
        if (!isType(node, 'function') || node.name !== 'sin') return false;
        // Check if argument starts with negative sign
        const arg = node.arg;
        if (Array.isArray(arg) && arg.length > 0) {
          return isType(arg[0], 'sign') && arg[0].value === '-';
        }
        return false;
      },
      transform: (node) => {
        const newArg = node.arg.slice(1); // Remove negative sign
        return [
          { type: 'sign', value: '-' },
          {
            type: 'function',
            name: 'sin',
            arg: newArg
          }
        ];
      }
    },

    // Rule: cos(-x) = cos(x)
    {
      name: 'cos-even-function',
      description: 'cos(-x) → cos(x)',
      priority: 90,
      region: ['US', 'UK', 'EU'],
      match: (node) => {
        if (!isType(node, 'function') || node.name !== 'cos') return false;
        // Check if argument starts with negative sign
        const arg = node.arg;
        if (Array.isArray(arg) && arg.length > 0) {
          return isType(arg[0], 'sign') && arg[0].value === '-';
        }
        return false;
      },
      transform: (node) => {
        const newArg = node.arg.slice(1); // Remove negative sign
        return {
          type: 'function',
          name: 'cos',
          arg: newArg
        };
      }
    },

    // Rule: sin(0) = 0, cos(0) = 1, etc.
    {
      name: 'trig-special-values',
      description: 'Evaluate trig functions at special angles',
      priority: 95,
      region: ['US', 'UK', 'EU'],
      match: (node) => {
        if (!isType(node, 'function')) return false;
        if (!['sin', 'cos', 'tan'].includes(node.name)) return false;

        // Check if argument is 0 or π
        const arg = node.arg;
        if (Array.isArray(arg) && arg.length === 1) {
          const val = getNumber(arg[0]);
          if (val === 0 || val === Math.PI) return true;

          // Check for \pi symbol
          if (isType(arg[0], 'symbol') && arg[0].value === '\\pi') return true;
        }

        return false;
      },
      transform: (node) => {
        const arg = node.arg;
        let angle = 0;

        if (Array.isArray(arg) && arg.length === 1) {
          angle = getNumber(arg[0]) || 0;
          if (isType(arg[0], 'symbol') && arg[0].value === '\\pi') {
            angle = Math.PI;
          }
        }

        let value;
        switch (node.name) {
          case 'sin':
            value = Math.abs(Math.sin(angle)) < 1e-10 ? 0 : Math.sin(angle);
            break;
          case 'cos':
            value = Math.abs(Math.cos(angle)) < 1e-10 ? 0 : Math.cos(angle);
            value = Math.abs(value - 1) < 1e-10 ? 1 : value;
            value = Math.abs(value + 1) < 1e-10 ? -1 : value;
            break;
          case 'tan':
            value = Math.abs(Math.tan(angle)) < 1e-10 ? 0 : Math.tan(angle);
            break;
          default:
            return node;
        }

        return { type: 'number', value };
      }
    }
  ];
}
