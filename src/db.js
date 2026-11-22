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
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_usage (
      api   TEXT NOT NULL,
      day   TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (api, day)
    );
    CREATE TABLE IF NOT EXISTS movies (
      guild_id  TEXT NOT NULL,
      tmdb_id   INTEGER NOT NULL,
      thread_id TEXT NOT NULL UNIQUE,
      PRIMARY KEY (guild_id, tmdb_id)
    );
  `);

  // Upgrade a database made before movie night: add the new columns if they are missing (existing rows keep their data).
  const settingsColumns = db.prepare('PRAGMA table_info(guild_settings)').all().map((c) => c.name);
  if (!settingsColumns.includes('announce_channel_id')) db.exec('ALTER TABLE guild_settings ADD COLUMN announce_channel_id TEXT');
  if (!settingsColumns.includes('timezone')) db.exec('ALTER TABLE guild_settings ADD COLUMN timezone TEXT');

  const getSettingsStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
  // Only fills in the values that are given (null keeps what is already stored).
  const saveMovieNightStmt = db.prepare(`
    UPDATE guild_settings
    SET announce_channel_id = COALESCE(?, announce_channel_id), timezone = COALESCE(?, timezone)
    WHERE guild_id = ?
  `);
  const saveSettingsStmt = db.prepare(`
    INSERT INTO guild_settings (guild_id, forum_channel_id, role_ids) VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET forum_channel_id = excluded.forum_channel_id, role_ids = excluded.role_ids
  `);
  const addMovieStmt = db.prepare('INSERT INTO movies (guild_id, tmdb_id, thread_id) VALUES (?, ?, ?)');
  const byTmdbStmt = db.prepare('SELECT * FROM movies WHERE guild_id = ? AND tmdb_id = ?');
  const byThreadStmt = db.prepare('SELECT * FROM movies WHERE thread_id = ?');

  const listAllStmt = db.prepare('SELECT * FROM movies');
  const listGuildStmt = db.prepare('SELECT * FROM movies WHERE guild_id = ?');
  const removeStmt = db.prepare('DELETE FROM movies WHERE thread_id = ?');
  const getMetaStmt = db.prepare('SELECT value FROM meta WHERE key = ?');
  const setMetaStmt = db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  const bumpUsageStmt = db.prepare(
    'INSERT INTO api_usage (api, day, count) VALUES (?, ?, 1) ON CONFLICT(api, day) DO UPDATE SET count = count + 1',
  );
  const getUsageStmt = db.prepare('SELECT count FROM api_usage WHERE api = ? AND day = ?');

  const movieRow = (r) => (r ? { guildId: r.guild_id, tmdbId: r.tmdb_id, threadId: r.thread_id } : null);

  return {
    close: () => db.close(),
    getSettings(guildId) {
      const r = getSettingsStmt.get(guildId);
      return r
        ? {
            guildId: r.guild_id,
            forumChannelId: r.forum_channel_id,
            roleIds: JSON.parse(r.role_ids),
            announceChannelId: r.announce_channel_id ?? null,
            timezone: r.timezone ?? null,
          }
        : null;
    },
    // Movie night settings. Returns false if the server has not run /setup yet (nothing to attach them to).
    saveMovieNightSettings(guildId, { announceChannelId = null, timezone = null }) {
      return saveMovieNightStmt.run(announceChannelId, timezone, guildId).changes > 0;
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
    listMovies: (guildId) => (guildId ? listGuildStmt.all(guildId) : listAllStmt.all()).map(movieRow),
    removeMovieByThread: (threadId) => void removeStmt.run(threadId),
    getMeta: (key) => getMetaStmt.get(key)?.value ?? null,
    setMeta: (key, value) => void setMetaStmt.run(key, String(value)),
    // Our own count of API requests per UTC day (the APIs do not report remaining quota).
    recordApiCall: (api, day) => void bumpUsageStmt.run(api, day),
    getApiUsage: (api, day) => getUsageStmt.get(api, day)?.count ?? 0,
  };
}

module.exports = { openDb };
