const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOmdbRatings, formatPostBody, findTagId, missingTags } = require('../src/movie-logic');

const forumTags = [
  { id: '1', name: 'To Watch' },
  { id: '2', name: 'Watched' },
  { id: '3', name: 'Coming Soon' },
];

test('findTagId: finds a tag by name, ignoring case and spaces at the ends', () => {
  assert.equal(findTagId(forumTags, 'Watched'), '2');
  assert.equal(findTagId(forumTags, ' to watch '), '1');
});

test('findTagId: ignores emoji and extra spaces inside the tag name', () => {
  const emojiTags = [
    { id: '1', name: 'To Watch 🍿' },
    { id: '2', name: '✅ Watched' },
    { id: '3', name: 'Coming  Soon 🎥' },
  ];
  assert.equal(findTagId(emojiTags, 'To Watch'), '1');
  assert.equal(findTagId(emojiTags, 'Watched'), '2');
  assert.equal(findTagId(emojiTags, 'Coming Soon'), '3');
  assert.deepEqual(missingTags(emojiTags), []);
});

test('findTagId: unknown tag gives null', () => {
  assert.equal(findTagId(forumTags, 'Dropped'), null);
  assert.equal(findTagId([], 'Watched'), null);
});

test('missingTags: lists the required tags a forum does not have', () => {
  assert.deepEqual(missingTags(forumTags), []);
  assert.deepEqual(missingTags([{ id: '1', name: 'To Watch' }]), ['Watched', 'Coming Soon']);
});

const omdbOppenheimer = {
  imdbRating: '8.2',
  Ratings: [
    { Source: 'Internet Movie Database', Value: '8.2/10' },
    { Source: 'Rotten Tomatoes', Value: '93%' },
    { Source: 'Metacritic', Value: '90/100' },
  ],
  Response: 'True',
};

test('parseOmdbRatings: reads IMDb and Rotten Tomatoes', () => {
  assert.deepEqual(parseOmdbRatings(omdbOppenheimer), { imdb: '8.2/10', rottenTomatoes: '93%' });
});

test('parseOmdbRatings: missing Rotten Tomatoes gives null for it', () => {
  const body = { imdbRating: '6.1', Ratings: [{ Source: 'Internet Movie Database', Value: '6.1/10' }] };
  assert.deepEqual(parseOmdbRatings(body), { imdb: '6.1/10', rottenTomatoes: null });
});

test('parseOmdbRatings: "N/A", error bodies and null give nulls', () => {
  assert.deepEqual(parseOmdbRatings({ imdbRating: 'N/A', Ratings: [] }), { imdb: null, rottenTomatoes: null });
  assert.deepEqual(parseOmdbRatings({ Response: 'False', Error: 'Movie not found!' }), { imdb: null, rottenTomatoes: null });
  assert.deepEqual(parseOmdbRatings(null), { imdb: null, rottenTomatoes: null });
});

test('parseOmdbRatings: falls back to imdbRating when Ratings has no IMDb entry', () => {
  assert.deepEqual(parseOmdbRatings({ imdbRating: '7.0', Ratings: [] }), { imdb: '7.0/10', rottenTomatoes: null });
});

test('formatPostBody: full layout in the server format', () => {
  const body = formatPostBody({
    imdb: '6.1/10',
    rottenTomatoes: '86%',
    popcornmeter: '76%',
    description: 'A family is transported somewhere unknown.',
    runtime: '1h 40m',
  });
  assert.equal(
    body,
    [
      'IMDb Rating ⭐ 6.1/10',
      'Rotten Tomatoes 🍅 : 86%',
      'PopCornmeter 🍿 : 76%',
      'Description 🗒️ : A family is transported somewhere unknown.',
      'Duration ⏱️ : 1h 40m',
    ].join('\n'),
  );
});

test('formatPostBody: leaves out lines whose value is missing', () => {
  const body = formatPostBody({ imdb: null, rottenTomatoes: '50%', popcornmeter: null, description: 'Plot.', runtime: null });
  assert.equal(body, ['Rotten Tomatoes 🍅 : 50%', 'Description 🗒️ : Plot.'].join('\n'));
});

test('formatPostBody: stays under Discord\'s 2000 character message limit', () => {
  const body = formatPostBody({ description: 'x'.repeat(5000) });
  assert.ok(body.length <= 2000);
});
