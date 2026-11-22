// Storage with Node's built-in SQLite. Only IDs are stored (never TMDB data), because TMDB's terms limit caching.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'bot.sqlite');

function openDb(file = DEFAULT_PATH) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id         TEXT PRIMARY KEY,
      forum_channel_id TEXT NOT NULL,
      role_ids         TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS movies (
      guild_id  TEXT NOT NULL,
      tmdb_id   INTEGER NOT NULL,
      thread_id TEXT NOT NULL UNIQUE,
      PRIMARY KEY (guild_id, tmdb_id)
    );
  `);

  const getSettingsStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
  const saveSettingsStmt = db.prepare(`
    INSERT INTO guild_settings (guild_id, forum_channel_id, role_ids) VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET forum_channel_id = excluded.forum_channel_id, role_ids = excluded.role_ids
  `);
  const addMovieStmt = db.prepare('INSERT INTO movies (guild_id, tmdb_id, thread_id) VALUES (?, ?, ?)');
  const byTmdbStmt = db.prepare('SELECT * FROM movies WHERE guild_id = ? AND tmdb_id = ?');
  const byThreadStmt = db.prepare('SELECT * FROM movies WHERE thread_id = ?');

  const movieRow = (r) => (r ? { guildId: r.guild_id, tmdbId: r.tmdb_id, threadId: r.thread_id } : null);

  return {
    getSettings(guildId) {
      const r = getSettingsStmt.get(guildId);
      return r ? { guildId: r.guild_id, forumChannelId: r.forum_channel_id, roleIds: JSON.parse(r.role_ids) } : null;
    },
    saveSettings(guildId, { forumChannelId, roleIds }) {
      saveSettingsStmt.run(guildId, forumChannelId, JSON.stringify(roleIds));
    },
    // Returns false if this movie (or forum post) is already recorded.
    addMovie({ guildId, tmdbId, threadId }) {
      try {
        addMovieStmt.run(guildId, tmdbId, threadId);
        return true;
      } catch (err) {
        if (/UNIQUE|constraint/i.test(err.message)) return false;
        throw err;
      }
    },
    findMovieByTmdb: (guildId, tmdbId) => movieRow(byTmdbStmt.get(guildId, tmdbId)),
    findMovieByThread: (threadId) => movieRow(byThreadStmt.get(threadId)),
  };
}

module.exports = { openDb };
