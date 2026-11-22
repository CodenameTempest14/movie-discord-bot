const test = require('node:test');
const assert = require('node:assert/strict');
const { applyStatus, currentStatus, extractPopcornmeter, refreshedStatus, shouldRefresh } = require('../src/movie-logic');
const { openDb } = require('../src/db');

const ids = { 'To Watch': 'tw', Watched: 'w', 'Coming Soon': 'cs' };

test('applyStatus: replaces the old status tag and keeps unrelated tags', () => {
  assert.deepEqual(applyStatus(['tw', 'horror'], ids, 'Watched'), ['horror', 'w']);
  assert.deepEqual(applyStatus(['cs'], ids, 'To Watch'), ['tw']);
});

test('applyStatus: never duplicates the tag', () => {
  assert.deepEqual(applyStatus(['w'], ids, 'Watched'), ['w']);
});

test('applyStatus: works when there is no status tag yet', () => {
  assert.deepEqual(applyStatus([], ids, 'Coming Soon'), ['cs']);
});

test('currentStatus: reads the status tag, or null', () => {
  assert.equal(currentStatus(['x', 'w'], ids), 'Watched');
  assert.equal(currentStatus(['cs'], ids), 'Coming Soon');
  assert.equal(currentStatus(['x'], ids), null);
});

test('extractPopcornmeter: reads the value typed in the post, or null', () => {
  assert.equal(extractPopcornmeter('IMDb Rating ⭐ 6/10\nPopCornmeter 🍿 : 76%\nDuration ⏱️ : 1h'), '76%');
  assert.equal(extractPopcornmeter('IMDb Rating ⭐ 6/10\nDuration ⏱️ : 1h'), null);
  assert.equal(extractPopcornmeter(''), null);
  assert.equal(extractPopcornmeter(undefined), null);
});

test('refreshedStatus: Watched stays Watched', () => {
  assert.equal(refreshedStatus('Watched', '2030-01-01', new Date('2026-11-22')), 'Watched');
  assert.equal(refreshedStatus('Watched', '2020-01-01', new Date('2026-11-22')), 'Watched');
});

test('refreshedStatus: Coming Soon flips to To Watch after release', () => {
  assert.equal(refreshedStatus('Coming Soon', '2026-11-22', new Date('2026-11-22')), 'To Watch');
  assert.equal(refreshedStatus('Coming Soon', '2027-01-01', new Date('2026-11-22')), 'Coming Soon');
});

test('refreshedStatus: an unreleased movie that was To Watch goes back to Coming Soon if its date moved later', () => {
  assert.equal(refreshedStatus('To Watch', '2027-06-01', new Date('2026-11-22')), 'Coming Soon');
  assert.equal(refreshedStatus('To Watch', '2020-06-01', new Date('2026-11-22')), 'To Watch');
});

test('shouldRefresh: never run, or 24 hours or more ago', () => {
  const now = Date.UTC(2026, 10, 22, 12);
  assert.equal(shouldRefresh(null, now), true);
  assert.equal(shouldRefresh(now - 24 * 3600 * 1000, now), true);
  assert.equal(shouldRefresh(now - 23 * 3600 * 1000, now), false);
});

test('db: list all movies, remove one by post id', () => {
  const db = openDb(':memory:');
  db.addMovie({ guildId: 'g1', tmdbId: 1, threadId: 't1' });
  db.addMovie({ guildId: 'g2', tmdbId: 2, threadId: 't2' });
  assert.equal(db.listMovies().length, 2);
  assert.equal(db.listMovies('g1').length, 1);
  db.removeMovieByThread('t1');
  assert.equal(db.findMovieByThread('t1'), null);
  assert.equal(db.listMovies().length, 1);
});

test('db: meta values save and read back', () => {
  const db = openDb(':memory:');
  assert.equal(db.getMeta('last_refresh'), null);
  db.setMeta('last_refresh', '123');
  assert.equal(db.getMeta('last_refresh'), '123');
  db.setMeta('last_refresh', '456');
  assert.equal(db.getMeta('last_refresh'), '456');
});
