const test = require('node:test');
const assert = require('node:assert/strict');
const { rollDie } = require('../src/roll-logic');

test('lowest random value gives 1', () => {
  assert.equal(rollDie(6, () => 0), 1);
});

test('highest random value gives the number of sides', () => {
  assert.equal(rollDie(6, () => 0.999999), 6);
  assert.equal(rollDie(20, () => 0.999999), 20);
});

test('result is always within 1..sides', () => {
  for (let i = 0; i < 1000; i++) {
    const r = rollDie(10);
    assert.ok(r >= 1 && r <= 10);
  }
});

test('rejects invalid sides', () => {
  assert.throws(() => rollDie(1), RangeError);
  assert.throws(() => rollDie(0), RangeError);
  assert.throws(() => rollDie(2.5), RangeError);
  assert.throws(() => rollDie('6'), RangeError);
});
