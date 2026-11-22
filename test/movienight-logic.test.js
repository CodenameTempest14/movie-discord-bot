const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidTimezone } = require('../src/movienight-logic');

test('isValidTimezone: real IANA names are accepted', () => {
  assert.equal(isValidTimezone('America/New_York'), true);
  assert.equal(isValidTimezone('Europe/London'), true);
  assert.equal(isValidTimezone('Asia/Manila'), true);
  assert.equal(isValidTimezone('UTC'), true);
});

test('isValidTimezone: made-up names, blanks and non-strings are rejected', () => {
  assert.equal(isValidTimezone('Mars/Base'), false);
  assert.equal(isValidTimezone('New York'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone('   '), false);
  assert.equal(isValidTimezone(null), false);
  assert.equal(isValidTimezone(undefined), false);
  assert.equal(isValidTimezone(123), false);
  assert.equal(isValidTimezone('x'.repeat(100)), false);
});

test('isValidTimezone: surrounding spaces are not silently accepted', () => {
  assert.equal(isValidTimezone(' UTC '), false);
});
