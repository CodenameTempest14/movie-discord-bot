const test = require('node:test');
const assert = require('node:assert/strict');
const { usageSummary, isOmdbLimitError, utcDay, shouldFetchRatings } = require('../src/movie-logic');

test('shouldFetchRatings: only for movies already released (saves OMDb quota)', () => {
  const now = new Date('2026-11-22');
  assert.equal(shouldFetchRatings('2023-07-19', now), true);
  assert.equal(shouldFetchRatings('2026-11-22', now), true);
  assert.equal(shouldFetchRatings('2026-12-18', now), false);
  assert.equal(shouldFetchRatings('', now), false);
  assert.equal(shouldFetchRatings(null, now), false);
});
const { openDb } = require('../src/db');

test('usageSummary: used, remaining and percent', () => {
  assert.deepEqual(usageSummary(250, 1000), { used: 250, limit: 1000, remaining: 750, percent: 25, level: 'ok' });
});

test('usageSummary: warns from 80 percent', () => {
  assert.equal(usageSummary(799, 1000).level, 'ok');
  assert.equal(usageSummary(800, 1000).level, 'warning');
  assert.equal(usageSummary(999, 1000).level, 'warning');
});

test('usageSummary: exceeded at the limit, remaining never negative', () => {
  const s = usageSummary(1200, 1000);
  assert.equal(s.level, 'exceeded');
  assert.equal(s.remaining, 0);
  assert.equal(usageSummary(1000, 1000).level, 'exceeded');
});

test('isOmdbLimitError: recognises the limit-reached reply only', () => {
  assert.equal(isOmdbLimitError({ Response: 'False', Error: 'Request limit reached!' }), true);
  assert.equal(isOmdbLimitError({ Response: 'False', Error: 'Movie not found!' }), false);
  assert.equal(isOmdbLimitError({ Response: 'True' }), false);
  assert.equal(isOmdbLimitError(null), false);
});

test('utcDay: formats as YYYY-MM-DD in UTC', () => {
  assert.equal(utcDay(new Date('2026-11-22T23:59:59Z')), '2026-11-22');
  assert.equal(utcDay(new Date('2026-11-23T00:00:00Z')), '2026-11-23');
});

test('db: api usage counts per api and per day', () => {
  const db = openDb(':memory:');
  assert.equal(db.getApiUsage('omdb', '2026-11-22'), 0);
  db.recordApiCall('omdb', '2026-11-22');
  db.recordApiCall('omdb', '2026-11-22');
  db.recordApiCall('omdb', '2026-11-23');
  db.recordApiCall('tmdb', '2026-11-22');
  assert.equal(db.getApiUsage('omdb', '2026-11-22'), 2);
  assert.equal(db.getApiUsage('omdb', '2026-11-23'), 1);
  assert.equal(db.getApiUsage('tmdb', '2026-11-22'), 1);
});
