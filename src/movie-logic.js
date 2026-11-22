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

module.exports = { formatRuntime, postTitle, statusTag, posterUrl, parseOmdbRatings, formatPostBody };
