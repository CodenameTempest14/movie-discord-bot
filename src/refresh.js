// Refreshes the movie posts the bot created: updates ratings and flips Coming Soon -> To Watch after release.
// Only IDs are stored in the database; everything else is re-fetched from TMDB/OMDb each time.
const { getMovieDetails, getOmdb } = require('./movie-api');
const {
  STATUS_NAMES,
  findTagId,
  currentStatus,
  refreshedStatus,
  applyStatus,
  extractPopcornmeter,
  formatRuntime,
  formatPostBody,
  parseOmdbRatings,
  postTitle,
} = require('./movie-logic');

const UNKNOWN_CHANNEL = 10003; // Discord error code: the post was deleted
const PAUSE_MS = 400; // be gentle with the APIs

let running = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns { result: 'unchanged' | 'updated' | 'removed' | 'skipped' | 'failed', limit: boolean }
async function refreshOne(client, db, row, now = new Date()) {
  let limit = false;
  try {
    const thread = await client.channels.fetch(row.threadId).catch((err) => {
      if (err.code === UNKNOWN_CHANNEL) return 'gone';
      throw err;
    });
    if (thread === 'gone') {
      db.removeMovieByThread(row.threadId);
      return { result: 'removed', limit };
    }
    if (!thread || !thread.isThread()) return { result: 'skipped', limit };

    const forum = thread.parent ?? (await client.channels.fetch(thread.parentId));
    const ids = Object.fromEntries(STATUS_NAMES.map((n) => [n, findTagId(forum.availableTags, n)]));
    if (STATUS_NAMES.some((n) => !ids[n])) return { result: 'skipped', limit };

    const details = await getMovieDetails(row.tmdbId);
    let ratings = { imdb: null, rottenTomatoes: null };
    try {
      ratings = parseOmdbRatings(await getOmdb(details.imdb_id));
    } catch (err) {
      limit = /limit reached/i.test(err.message);
      console.warn(`[warn] refresh: ratings unavailable (${err.message})`);
    }

    const starter = await thread.fetchStarterMessage().catch(() => null);
    const body = starter
      ? formatPostBody({
          ...ratings,
          popcornmeter: extractPopcornmeter(starter.content),
          description: details.overview,
          runtime: formatRuntime(details.runtime),
        })
      : '';
    // If ratings could not be fetched, keep the lines already in the post rather than deleting them.
    const keepOldRatings = !ratings.imdb && !ratings.rottenTomatoes && /IMDb Rating|Rotten Tomatoes/.test(starter?.content ?? '');
    const newBody = keepOldRatings ? null : body;

    const cur = currentStatus(thread.appliedTags, ids);
    const next = refreshedStatus(cur, details.release_date, now);
    const newTags = cur === next ? null : applyStatus(thread.appliedTags, ids, next);
    const newName = postTitle(details.title, details.release_date);

    const bodyChanged = newBody && starter && newBody !== starter.content;
    const nameChanged = newName !== thread.name;
    if (!bodyChanged && !newTags && !nameChanged) return { result: 'unchanged', limit };

    const wasArchived = thread.archived;
    if (wasArchived) await thread.setArchived(false);
    try {
      if (bodyChanged) await starter.edit({ content: newBody });
      if (newTags) await thread.setAppliedTags(newTags);
      if (nameChanged) await thread.setName(newName);
    } finally {
      if (wasArchived) await thread.setArchived(true).catch(() => {});
    }
    return { result: 'updated', limit };
  } catch (err) {
    console.warn(`[warn] refresh failed for one post: ${err.message}`);
    return { result: 'failed', limit };
  }
}

// Refreshes every recorded movie (or one server's). Returns counts, or null if a refresh is already running.
async function refreshAll(client, db, { guildId } = {}) {
  if (running) return null;
  running = true;
  const counts = { checked: 0, updated: 0, unchanged: 0, removed: 0, skipped: 0, failed: 0, stoppedByLimit: false };
  try {
    for (const row of db.listMovies(guildId)) {
      const { result, limit } = await refreshOne(client, db, row);
      counts.checked++;
      counts[result]++;
      if (limit) {
        counts.stoppedByLimit = true;
        break; // no point asking OMDb again today
      }
      await sleep(PAUSE_MS);
    }
  } finally {
    running = false;
  }
  return counts;
}

module.exports = { refreshAll, refreshOne };
