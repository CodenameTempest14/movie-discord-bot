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

module.exports = { formatRuntime, postTitle, statusTag, posterUrl };
