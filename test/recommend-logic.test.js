const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GENRES,
  genreChoices,
  buildDiscoverParams,
  pickSuggestions,
  formatSuggestion,
  formatSuggestionList,
} = require('../src/recommend-logic');

const movie = (id, extra = {}) => ({
  id,
  title: `Movie ${id}`,
  release_date: '2020-05-01',
  vote_average: 7.5,
  overview: 'A plot.',
  adult: false,
  ...extra,
});

test('genreChoices: fits Discord limit (25) and maps name to TMDB id', () => {
  const choices = genreChoices();
  assert.ok(choices.length > 0 && choices.length <= 25);
  assert.deepEqual(choices.find((c) => c.name === 'Horror'), { name: 'Horror', value: 27 });
  assert.equal(GENRES.Comedy, 35);
});

test('buildDiscoverParams: one genre, defaults', () => {
  const p = buildDiscoverParams({ genreIds: [35] });
  assert.equal(p.with_genres, '35');
  assert.equal(p['vote_average.gte'], '6.5');
  assert.equal(p['vote_count.gte'], '300');
  assert.equal(p.sort_by, 'popularity.desc');
  assert.equal(p.include_adult, 'false');
});

test('buildDiscoverParams: two genres are joined with a comma (AND)', () => {
  assert.equal(buildDiscoverParams({ genreIds: [35, 10749] }).with_genres, '35,10749');
});

test('buildDiscoverParams: same genre twice is listed once', () => {
  assert.equal(buildDiscoverParams({ genreIds: [35, 35] }).with_genres, '35');
});

test('buildDiscoverParams: custom min rating', () => {
  assert.equal(buildDiscoverParams({ genreIds: [27], minRating: 8 })['vote_average.gte'], '8');
});

test('buildDiscoverParams: rejects bad input', () => {
  assert.throws(() => buildDiscoverParams({ genreIds: [] }));
  assert.throws(() => buildDiscoverParams({ genreIds: [999999] }));
  assert.throws(() => buildDiscoverParams({ genreIds: ['abc'] }));
  assert.throws(() => buildDiscoverParams({ genreIds: [27], minRating: 11 }));
  assert.throws(() => buildDiscoverParams({ genreIds: [27], minRating: 0 }));
  assert.throws(() => buildDiscoverParams({ genreIds: [27], minRating: NaN }));
});

test('pickSuggestions: returns at most n, no duplicates', () => {
  const results = Array.from({ length: 20 }, (_, i) => movie(i + 1));
  const picked = pickSuggestions(results, 5);
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked.map((m) => m.id)).size, 5);
});

test('pickSuggestions: fewer results than n returns them all', () => {
  assert.equal(pickSuggestions([movie(1), movie(2)], 5).length, 2);
  assert.deepEqual(pickSuggestions([], 5), []);
  assert.deepEqual(pickSuggestions(null, 5), []);
});

test('pickSuggestions: skips adult titles, excluded id and entries with no title', () => {
  const results = [movie(1, { adult: true }), movie(2), movie(3, { title: '' }), movie(4)];
  const ids = pickSuggestions(results, 5, { excludeId: 4 }).map((m) => m.id);
  assert.deepEqual(ids, [2]);
});

test('pickSuggestions: ordering comes from the supplied random function', () => {
  const results = [movie(1), movie(2), movie(3)];
  const first = pickSuggestions(results, 3, { random: () => 0 }).map((m) => m.id);
  const again = pickSuggestions(results, 3, { random: () => 0 }).map((m) => m.id);
  assert.deepEqual(first, again);
  assert.equal(first.length, 3);
});

test('pickSuggestions: does not change the input array', () => {
  const results = [movie(1), movie(2), movie(3)];
  const copy = [...results];
  pickSuggestions(results, 2, { random: () => 0.5 });
  assert.deepEqual(results, copy);
});

test('formatSuggestion: title, year, rating, description', () => {
  assert.equal(formatSuggestion(movie(1)), '**Movie 1 (2020)** ⭐ 7.5 : A plot.');
});

test('formatSuggestion: missing parts are left out', () => {
  const line = formatSuggestion(movie(1, { release_date: '', vote_average: 0, overview: '' }));
  assert.equal(line, '**Movie 1**');
});

test('formatSuggestion: long description is cut to 150 chars with "..."', () => {
  const line = formatSuggestion(movie(1, { overview: 'x'.repeat(400) }));
  const desc = line.split(' : ')[1];
  assert.equal(desc.length, 150);
  assert.ok(desc.endsWith('...'));
});

test('formatSuggestion: rating shown with one decimal', () => {
  assert.ok(formatSuggestion(movie(1, { vote_average: 7.456 })).includes('⭐ 7.5'));
});

test('formatSuggestionList: one line per movie, stays under the embed limit', () => {
  const text = formatSuggestionList([movie(1), movie(2)]);
  assert.equal(text.split('\n').length, 2);
  const big = formatSuggestionList(Array.from({ length: 5 }, (_, i) => movie(i, { overview: 'y'.repeat(1000) })));
  assert.ok(big.length <= 4096);
});

test('formatSuggestionList: empty list gives empty string', () => {
  assert.equal(formatSuggestionList([]), '');
});
