const test = require('node:test');
const assert = require('node:assert/strict');
const { formatRuntime, postTitle, statusTag, posterUrl } = require('../src/movie-logic');

test('formatRuntime: hours and minutes', () => {
  assert.equal(formatRuntime(125), '2h 5m');
  assert.equal(formatRuntime(90), '1h 30m');
});

test('formatRuntime: whole hours and under an hour', () => {
  assert.equal(formatRuntime(120), '2h');
  assert.equal(formatRuntime(45), '45m');
});

test('formatRuntime: missing or zero runtime gives null', () => {
  assert.equal(formatRuntime(0), null);
  assert.equal(formatRuntime(null), null);
  assert.equal(formatRuntime(undefined), null);
});

test('postTitle: "Name (Year)"', () => {
  assert.equal(postTitle('Oppenheimer', '2023-07-19'), 'Oppenheimer (2023)');
});

test('postTitle: no release date gives just the name', () => {
  assert.equal(postTitle('Untitled Project', ''), 'Untitled Project');
  assert.equal(postTitle('Untitled Project', null), 'Untitled Project');
});

test('postTitle: stays within the 100 character forum limit and keeps the year', () => {
  const long = 'A'.repeat(200);
  const t = postTitle(long, '2026-01-01');
  assert.ok(t.length <= 100);
  assert.ok(t.endsWith('(2026)'));
});

test('statusTag: future release is Coming Soon', () => {
  assert.equal(statusTag('2027-03-01', new Date('2026-11-22')), 'Coming Soon');
});

test('statusTag: past or same-day release is To Watch', () => {
  assert.equal(statusTag('2023-07-19', new Date('2026-11-22')), 'To Watch');
  assert.equal(statusTag('2026-11-22', new Date('2026-11-22')), 'To Watch');
});

test('statusTag: unknown release date is Coming Soon', () => {
  assert.equal(statusTag('', new Date('2026-11-22')), 'Coming Soon');
  assert.equal(statusTag(null, new Date('2026-11-22')), 'Coming Soon');
});

test('posterUrl: builds the TMDB image URL, or null when missing', () => {
  assert.equal(posterUrl('/abc.jpg'), 'https://image.tmdb.org/t/p/w500/abc.jpg');
  assert.equal(posterUrl(null), null);
  assert.equal(posterUrl(''), null);
});
