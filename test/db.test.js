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
  assert.deepEqual(db.getSettings('g1'), {
    guildId: 'g1',
    forumChannelId: 'c1',
    roleIds: ['r1', 'r2'],
    announceChannelId: null,
    timezone: null,
  });
});

test('movie night settings: stored per server, other settings untouched', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: ['r1'] });
  assert.equal(db.saveMovieNightSettings('g1', { announceChannelId: 'a1', timezone: 'America/New_York' }), true);
  assert.deepEqual(db.getSettings('g1'), {
    guildId: 'g1',
    forumChannelId: 'c1',
    roleIds: ['r1'],
    announceChannelId: 'a1',
    timezone: 'America/New_York',
  });
});

test('movie night settings: setting one value keeps the other', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: [] });
  db.saveMovieNightSettings('g1', { announceChannelId: 'a1' });
  db.saveMovieNightSettings('g1', { timezone: 'Europe/London' });
  const s = db.getSettings('g1');
  assert.equal(s.announceChannelId, 'a1');
  assert.equal(s.timezone, 'Europe/London');
});

test('movie night settings: saving the forum again keeps them', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: [] });
  db.saveMovieNightSettings('g1', { announceChannelId: 'a1', timezone: 'Europe/London' });
  db.saveSettings('g1', { forumChannelId: 'c2', roleIds: ['r9'] });
  const s = db.getSettings('g1');
  assert.equal(s.forumChannelId, 'c2');
  assert.equal(s.announceChannelId, 'a1');
  assert.equal(s.timezone, 'Europe/London');
});

test('movie night settings: need /setup first (returns false when the server has no settings)', () => {
  const db = fresh();
  assert.equal(db.saveMovieNightSettings('g1', { timezone: 'Europe/London' }), false);
  assert.equal(db.getSettings('g1'), null);
});

test('opening an old database (no movie night columns) upgrades it without losing data', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { DatabaseSync } = require('node:sqlite');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botdb-'));
  const file = path.join(dir, 'old.sqlite');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE guild_settings (guild_id TEXT PRIMARY KEY, forum_channel_id TEXT NOT NULL, role_ids TEXT NOT NULL DEFAULT '[]');
            INSERT INTO guild_settings VALUES ('g1', 'c1', '["r1"]');`);
  old.close();
  const db = openDb(file);
  assert.deepEqual(db.getSettings('g1'), {
    guildId: 'g1',
    forumChannelId: 'c1',
    roleIds: ['r1'],
    announceChannelId: null,
    timezone: null,
  });
  assert.equal(db.saveMovieNightSettings('g1', { timezone: 'Europe/London' }), true);
  db.close(); // Windows cannot delete an open SQLite file
  fs.rmSync(dir, { recursive: true, force: true });
});

test('settings: saving again replaces the old values (upsert)', () => {
  const db = fresh();
  db.saveSettings('g1', { forumChannelId: 'c1', roleIds: ['r1'] });
  db.saveSettings('g1', { forumChannelId: 'c2', roleIds: [] });
  assert.deepEqual(db.getSettings('g1'), {
    guildId: 'g1',
    forumChannelId: 'c2',
    roleIds: [],
    announceChannelId: null,
    timezone: null,
  });
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
