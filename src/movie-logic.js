// Pure movie helpers (no Discord, no network) so they can be tested.

const FORUM_TITLE_MAX = 100; // Discord forum post title limit

// 125 -> "2h 5m", 120 -> "2h", 45 -> "45m", missing/0 -> null
function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// "Name (Year)"; the name is shortened (with "...") so the whole title fits Discord's limit and keeps the year.
function postTitle(name, releaseDate) {
  const year = typeof releaseDate === 'string' && /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : null;
  const suffix = year ? ` (${year})` : '';
  const room = FORUM_TITLE_MAX - suffix.length;
  const base = name.length > room ? `${name.slice(0, room - 3)}...` : name;
  return base + suffix;
}

// Future release (or unknown date) -> "Coming Soon", otherwise "To Watch". Dates are compared as UTC days.
function statusTag(releaseDate, now = new Date()) {
  if (typeof releaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return 'Coming Soon';
  const today = now.toISOString().slice(0, 10);
  return releaseDate > today ? 'Coming Soon' : 'To Watch';
}

// TMDB image URL (size w500, per the TMDB image docs), or null if the movie has no poster.
function posterUrl(posterPath) {
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
}

const present = (v) => typeof v === 'string' && v.trim() !== '' && v.trim().toUpperCase() !== 'N/A';

// Reads the ratings we need from an OMDb response. Anything missing, "N/A" or an error body becomes null.
function parseOmdbRatings(body) {
  const out = { imdb: null, rottenTomatoes: null };
  if (!body || typeof body !== 'object' || body.Response === 'False') return out;
  const ratings = Array.isArray(body.Ratings) ? body.Ratings : [];
  const find = (source) => ratings.find((r) => r && r.Source === source && present(r.Value))?.Value ?? null;
  out.imdb = find('Internet Movie Database') ?? (present(body.imdbRating) ? `${body.imdbRating}/10` : null);
  out.rottenTomatoes = find('Rotten Tomatoes');
  return out;
}

const POST_BODY_MAX = 2000; // Discord message limit

// The first message of a movie post, in the layout the server uses today. Lines with no value are left out.
function formatPostBody({ imdb, rottenTomatoes, popcornmeter, description, runtime }) {
  const lines = [];
  if (present(imdb)) lines.push(`IMDb Rating ⭐ ${imdb}`);
  if (present(rottenTomatoes)) lines.push(`Rotten Tomatoes 🍅 : ${rottenTomatoes}`);
  if (present(popcornmeter)) lines.push(`PopCornmeter 🍿 : ${popcornmeter}`);
  if (present(description)) lines.push(`Description 🗒️ : ${description.trim()}`);
  if (present(runtime)) lines.push(`Duration ⏱️ : ${runtime}`);
  const text = lines.join('\n');
  return text.length > POST_BODY_MAX ? `${text.slice(0, POST_BODY_MAX - 3)}...` : text;
}

const REQUIRED_TAGS = ['To Watch', 'Watched', 'Coming Soon'];

// Compare tag names by their words only: case, emoji, punctuation and extra spaces are ignored,
// so "To Watch 🍿" and "to  watch" both match "To Watch".
const tagKey = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Id of the forum tag with this name, or null.
function findTagId(availableTags, name) {
  const wanted = tagKey(name);
  return availableTags.find((t) => tagKey(t.name) === wanted)?.id ?? null;
}

// Which of the three required tags the forum is missing.
function missingTags(availableTags) {
  return REQUIRED_TAGS.filter((name) => findTagId(availableTags, name) === null);
}

const STATUS_NAMES = ['To Watch', 'Watched', 'Coming Soon'];

// Tag ids after setting a movie's status: the old status tag is removed, other tags are kept, no duplicates.
// `ids` maps each status name to its forum tag id.
function applyStatus(currentTagIds, ids, status) {
  const statusIds = new Set(STATUS_NAMES.map((n) => ids[n]));
  const kept = currentTagIds.filter((id) => !statusIds.has(id));
  return [...kept, ids[status]];
}

// Which status a post has right now, from its tag ids (null if none).
function currentStatus(currentTagIds, ids) {
  return STATUS_NAMES.find((n) => currentTagIds.includes(ids[n])) ?? null;
}

// The PopCornmeter value someone typed into a post ("PopCornmeter 🍿 : 76%"), so a refresh can keep it.
function extractPopcornmeter(body) {
  if (typeof body !== 'string') return null;
  const m = body.match(/PopCornmeter[^:\n]*:\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

// Status after a refresh: Watched always stays; otherwise it follows the (possibly changed) release date.
function refreshedStatus(current, releaseDate, now = new Date()) {
  return current === 'Watched' ? 'Watched' : statusTag(releaseDate, now);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// True if the daily refresh has never run or last ran 24 hours or more ago.
function shouldRefresh(lastRunMs, nowMs, intervalMs = DAY_MS) {
  return lastRunMs === null || lastRunMs === undefined || nowMs - lastRunMs >= intervalMs;
}

// Daily request budget summary. level: "ok", "warning" (80% or more) or "exceeded" (at or over the limit).
function usageSummary(used, limit) {
  const percent = Math.round((used / limit) * 100);
  const level = used >= limit ? 'exceeded' : used >= limit * 0.8 ? 'warning' : 'ok';
  return { used, limit, remaining: Math.max(0, limit - used), percent, level };
}

// OMDb answers {"Response":"False","Error":"Request limit reached!"} when the daily limit is used up.
function isOmdbLimitError(body) {
  return !!body && body.Response === 'False' && typeof body.Error === 'string' && /limit/i.test(body.Error);
}

// Calendar day in UTC, e.g. "2026-11-22" (OMDb does not say when its limit resets, so this is our best guess).
const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

// Unreleased movies have no ratings yet, so do not spend an OMDb request (free tier: 1,000/day) on them.
function shouldFetchRatings(releaseDate, now = new Date()) {
  return statusTag(releaseDate, now) === 'To Watch';
}

module.exports = {
  shouldFetchRatings,
  STATUS_NAMES,
  usageSummary,
  isOmdbLimitError,
  utcDay,
  applyStatus,
  currentStatus,
  extractPopcornmeter,
  refreshedStatus,
  shouldRefresh,
  formatRuntime,
  postTitle,
  statusTag,
  posterUrl,
  parseOmdbRatings,
  formatPostBody,
  findTagId,
  missingTags,
  REQUIRED_TAGS,
};
