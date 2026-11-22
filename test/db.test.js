const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../src/db');
const { canManageMovies } = require('../src/permissions');

const fresh = () => openDb(':memory:');

test('settings: none until /setup runs', () => {
  assert.equal(fresh().getSettings('g1'), null);
});

test('settings: save and read back, including roles', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: ['r1', 'r2'] });
  assert.deepEqual(db.getSettings('g1'), { guildId: 'g1', forumChannelId: 'c1', roleIds: ['r1', 'r2'] });
});

test('settings: saving again replaces the old values (upsert)', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: ['r1'] });
  db.saveSettings('g1', { forumChannelId: 'c2', roleIds: [] });
  assert.deepEqual(db.getSettings('g1'), { guildId: 'g1', forumChannelId: 'c2', roleIds: [] });
});

test('settings: servers are independent', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: [] });
  assert.equal(db.getSettings('g2'), null);
});

test('movies: add and find by TMDB id within a server', () => {
  const db = fresh();
  assert.equal(db.addMovie({ guildId: 'g1', tmdbId: 872585, threadId: 't1' }), true);
  assert.deepEqual(db.findMovieByTmdb('g1', 872585), { guildId: 'g1', tmdbId: 872585, threadId: 't1' });
  assert.equal(db.findMovieByTmdb('g2', 872585), null);
});

test('movies: the same movie cannot be added twice to one server', () => {
  const db = fresh();
  assert.equal(db.addMovie({ guildId: 'g1', tmdbId: 1, threadId: 't1' }), true);
  assert.equal(db.addMovie({ guildId: 'g1', tmdbId: 1, threadId: 't2' }), false);
  assert.equal(db.findMovieByTmdb('g1', 1).threadId, 't1');
});

test('movies: the same movie can be in two different servers', () => {
  const db = fresh();
  assert.equal(db.addMovie({ guildId: 'g1', tmdbId: 1, threadId: 't1' }), true);
  assert.equal(db.addMovie({ guildId: 'g2', tmdbId: 1, threadId: 't2' }), true);
});

test('movies: look up by forum post (thread) id', () => {
  const db = fresh();
  db.addMovie({ guildId: 'g1', tmdbId: 5, threadId: 't9' });
  assert.equal(db.findMovieByThread('t9').tmdbId, 5);
  assert.equal(db.findMovieByThread('nope'), null);
});

test('permissions: administrators are always allowed', () => {
  assert.equal(canManageMovies({ isAdministrator: true, memberRoleIds: [], allowedRoleIds: [] }), true);
});

test('permissions: a member with an allowed role is allowed', () => {
  assert.equal(canManageMovies({ isAdministrator: false, memberRoleIds: ['x', 'r2'], allowedRoleIds: ['r1', 'r2'] }), true);
});

test('permissions: other members are not allowed', () => {
  assert.equal(canManageMovies({ isAdministrator: false, memberRoleIds: ['x'], allowedRoleIds: ['r1', 'r2'] }), false);
});

test('permissions: no allowed roles configured means only administrators', () => {
  assert.equal(canManageMovies({ isAdministrator: false, memberRoleIds: ['x'], allowedRoleIds: [] }), false);
});
