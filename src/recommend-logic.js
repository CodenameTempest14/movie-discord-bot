// Pure helpers for /recommend and /similar (no Discord, no network) so they can be tested.

// TMDB movie genre ids (from GET /3/genre/movie/list). A fixed list means /recommend needs no free-text input.
const GENRES = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  'Science Fiction': 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

const DEFAULT_MIN_RATING = 6.5;
const MIN_VOTES = 300; // skip obscure titles whose average rating means little
const DESCRIPTION_MAX = 150;
const LIST_MAX = 4096; // Discord embed description limit

// Choices for a Discord slash command option: [{ name, value }]
function genreChoices() {
  return Object.entries(GENRES).map(([name, value]) => ({ name, value }));
}

// Query parameters for TMDB discover/movie. Throws on input that cannot be valid.
function buildDiscoverParams({ genreIds, minRating = DEFAULT_MIN_RATING }) {
  const known = new Set(Object.values(GENRES));
  if (!Array.isArray(genreIds) || genreIds.length === 0) throw new Error('Pick at least one genre.');
  for (const id of genreIds) {
    if (!known.has(id)) throw new Error('Unknown genre.');
  }
  if (!Number.isFinite(minRating) || minRating < 1 || minRating > 10) {
    throw new Error('min_rating must be between 1 and 10.');
  }
  return {
    // comma = AND in TMDB: the movie must have every listed genre
    with_genres: [...new Set(genreIds)].join(','),
    'vote_average.gte': String(minRating),
    'vote_count.gte': String(MIN_VOTES),
    sort_by: 'popularity.desc',
    include_adult: 'false',
  };
}

// Up to n usable movies in random order. Input is not modified.
function pickSuggestions(results, n, { excludeId = null, random = Math.random } = {}) {
  if (!Array.isArray(results)) return [];
  const pool = results.filter(
    (m) => m && !m.adult && typeof m.title === 'string' && m.title.trim() !== '' && m.id !== excludeId,
  );
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// "**Title (Year)** ⭐ 7.5 : description". Parts that are missing are left out.
function formatSuggestion(movie) {
  const year = typeof movie.release_date === 'string' && /^\d{4}/.test(movie.release_date) ? movie.release_date.slice(0, 4) : null;
  let line = `**${movie.title}${year ? ` (${year})` : ''}**`;
  if (Number.isFinite(movie.vote_average) && movie.vote_average > 0) line += ` ⭐ ${movie.vote_average.toFixed(1)}`;
  const overview = typeof movie.overview === 'string' ? movie.overview.trim() : '';
  if (overview) {
    const short = overview.length > DESCRIPTION_MAX ? `${overview.slice(0, DESCRIPTION_MAX - 3)}...` : overview;
    line += ` : ${short}`;
  }
  return line;
}

function formatSuggestionList(movies) {
  const text = movies.map(formatSuggestion).join('\n');
  return text.length > LIST_MAX ? `${text.slice(0, LIST_MAX - 3)}...` : text;
}

module.exports = {
  GENRES,
  DEFAULT_MIN_RATING,
  genreChoices,
  buildDiscoverParams,
  pickSuggestions,
  formatSuggestion,
  formatSuggestionList,
};
