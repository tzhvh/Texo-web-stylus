/**
 * Test Cases for Rule Engine
 */

import { RuleEngine, isType, isNumber, getNumber, isVariable } from '../../cas/rules/ruleEngine.js';
import { getAlgebraRules } from '../../cas/rules/algebraRules.js';

describe('Rule Engine Core', () => {
  test('should create rule engine', () => {
    const engine = new RuleEngine('US');
    expect(engine).toBeDefined();
    expect(engine.region).toBe('US');
  });

  test('should add rules', () => {
    const engine = new RuleEngine('US');
    const rule = {
      name: 'test-rule',
      description: 'Test rule',
      priority: 100,
      region: ['US'],
      match: (ast) => false,
      transform: (ast) => ast
    };

    engine.addRule(rule);
    expect(engine.rules.length).toBe(1);
  });

  test('should filter rules by region', () => {
    const engine = new RuleEngine('US');

    const usRule = {
      name: 'us-rule',
      description: 'US only',
      priority: 100,
      region: ['US'],
      match: (ast) => false,
      transform: (ast) => ast
    };

    const ukRule = {
      name: 'uk-rule',
      description: 'UK only',
      priority: 100,
      region: ['UK'],
      match: (ast) => false,
      transform: (ast) => ast
    };

    engine.addRule(usRule);
    engine.addRule(ukRule);

    expect(engine.rules.length).toBe(1);
    expect(engine.rules[0].name).toBe('us-rule');
  });

  test('should sort rules by priority', () => {
    const engine = new RuleEngine('US');

    const lowPriority = {
      name: 'low',
      priority: 10,
      match: (ast) => false,
      transform: (ast) => ast
    };

    const highPriority = {
      name: 'high',
      priority: 100,
      match: (ast) => false,
      transform: (ast) => ast
    };

    engine.addRule(lowPriority);
    engine.addRule(highPriority);

    expect(engine.rules[0].name).toBe('high');
    expect(engine.rules[1].name).toBe('low');
  });
});

describe('Rule Application', () => {
  test('should apply rule to matching AST', () => {
    const engine = new RuleEngine('US');

    // Use an idempotent rule that reaches fixpoint
    const rule = {
      name: 'make-positive',
      description: 'Convert negative numbers to positive',
      priority: 100,
      match: (node) => isType(node, 'number') && node.value < 0,
      transform: (node) => ({ ...node, value: Math.abs(node.value) })
    };

    engine.addRule(rule);

    const ast = { type: 'number', value: -5 };
    const result = engine.canonicalize(ast);

    expect(result.ast.value).toBe(5);
    expect(result.appliedRules.length).toBe(1); // Should apply exactly once
    expect(result.iterations).toBe(2); // One pass to apply, one to confirm fixpoint
  });

  test('should apply rules until fixpoint', () => {
    const engine = new RuleEngine('US');

    let applicationCount = 0;

    const rule = {
      name: 'increment',
      description: 'Increment until 10',
      priority: 100,
      match: (node) => isType(node, 'number') && node.value < 10,
      transform: (node) => {
        applicationCount++;
        return { ...node, value: node.value + 1 };
      }
    };

    engine.addRule(rule);

    const ast = { type: 'number', value: 0 };
    const result = engine.canonicalize(ast);

    expect(result.ast.value).toBe(10);
    expect(applicationCount).toBe(10);
  });

  test('should prevent infinite loops with max iterations', () => {
    const engine = new RuleEngine('US');

    const infiniteRule = {
      name: 'infinite',
      description: 'Always matches',
      priority: 100,
      match: (node) => isType(node, 'number'),
      transform: (node) => ({ ...node, value: node.value + 1 })
    };

    engine.addRule(infiniteRule);

    const ast = { type: 'number', value: 0 };
    const result = engine.canonicalize(ast, 10);

    expect(result.iterations).toBe(10);
  });
});

describe('Helper Functions', () => {
  test('isType should correctly identify node types', () => {
    const numNode = { type: 'number', value: 5 };
    const symNode = { type: 'symbol', value: 'x' };

    expect(isType(numNode, 'number')).toBe(true);
    expect(isType(numNode, 'symbol')).toBe(false);
    expect(isType(symNode, 'symbol')).toBe(true);
  });

  test('isNumber should identify numeric nodes', () => {
    const numNode = { type: 'number', value: 5 };
    const symNode = { type: 'symbol', value: 'x' };
    const numSymbol = { type: 'symbol', value: '123' };

    expect(isNumber(numNode)).toBe(true);
    expect(isNumber(symNode)).toBe(false);
    expect(isNumber(numSymbol)).toBe(true);
  });

  test('getNumber should extract numeric values', () => {
    const numNode = { type: 'number', value: 5 };
    const numSymbol = { type: 'symbol', value: '123' };
    const symNode = { type: 'symbol', value: 'x' };

    expect(getNumber(numNode)).toBe(5);
    expect(getNumber(numSymbol)).toBe(123);
    expect(getNumber(symNode)).toBe(null);
  });

  test('isVariable should identify variable nodes', () => {
    const varNode = { type: 'symbol', value: 'x' };
    const numNode = { type: 'number', value: 5 };
    const numSymbol = { type: 'symbol', value: '123' };

    expect(isVariable(varNode)).toBe(true);
    expect(isVariable(numNode)).toBe(false);
    expect(isVariable(numSymbol)).toBe(false);
  });
});

describe('Algebra Rules', () => {
  test('should load algebra rules', () => {
    const rules = getAlgebraRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty('name');
    expect(rules[0]).toHaveProperty('match');
    expect(rules[0]).toHaveProperty('transform');
  });

  test('should find specific rule by name', () => {
    const rules = getAlgebraRules();
    const flattenRule = rules.find(r => r.name === 'flatten-addition');
    expect(flattenRule).toBeDefined();
    expect(flattenRule.description).toContain('Flatten');
  });
});

describe('Regional Notation Support', () => {
  test('should support US notation', () => {
    const engine = new RuleEngine('US');
    expect(engine.region).toBe('US');
  });

  test('should support UK notation', () => {
    const engine = new RuleEngine('UK');
    expect(engine.region).toBe('UK');
  });

  test('should support EU notation', () => {
    const engine = new RuleEngine('EU');
    expect(engine.region).toBe('EU');
  });

  test('should apply region-specific rules', () => {
    const usEngine = new RuleEngine('US');
    const ukEngine = new RuleEngine('UK');

    const usOnlyRule = {
      name: 'us-decimal',
      description: 'US decimal notation',
      priority: 100,
      region: ['US'],
      match: (node) => isType(node, 'symbol') && node.value === '.',
      transform: (node) => ({ ...node, value: 'decimal' })
    };

    const ukOnlyRule = {
      name: 'uk-decimal',
      description: 'UK decimal notation',
      priority: 100,
      region: ['UK'],
      match: (node) => isType(node, 'symbol') && node.value === '.',
      transform: (node) => ({ ...node, value: 'point' })
    };

    usEngine.addRule(usOnlyRule);
    usEngine.addRule(ukOnlyRule);
    ukEngine.addRule(usOnlyRule);
    ukEngine.addRule(ukOnlyRule);

    expect(usEngine.rules.length).toBe(1);
    expect(usEngine.rules[0].name).toBe('us-decimal');
    expect(ukEngine.rules.length).toBe(1);
    expect(ukEngine.rules[0].name).toBe('uk-decimal');
  });
});
