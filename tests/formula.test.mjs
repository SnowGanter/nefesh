import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFormula } from '../src/lib/formula.mjs';

test('evaluates game formulas, decimals and operator precedence', () => {
  assert.equal(evaluateFormula('M*0,12*((crit_chance*0,12))', { M: 100, crit_chance: 5 }), 7.199999999999999);
  assert.equal(evaluateFormula('2 + 3 * (4 - 1)'), 11);
  assert.equal(evaluateFormula('-2^2 + 2**3'), 4);
  assert.equal(evaluateFormula('topStat × 1,2', { topStat: 50 }), 60);
});

test('rejects code, unknown variables, invalid syntax and nonfinite values', () => {
  for (const source of ['globalThis.alert(1)', 'constructor.constructor(1)', 'M;while(true){}', '1/0', 'unknown+1', '1 2', '(3+2', '2/*evil*/+1', '9'.repeat(2001)]) {
    assert.equal(evaluateFormula(source, { M: 3 }), null, source);
  }
  assert.equal(evaluateFormula('M', { M: '1+9' }), null);
  assert.equal(evaluateFormula('constructor'), null);
});
