// TMDB (details, runtime, poster) and OMDb (IMDb + Rotten Tomatoes ratings) clients.
// Errors thrown here never contain the request URL, because the URL holds the API key.

const TIMEOUT_MS = 15_000;

async function getJson(url, label) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new Error(`${label} request failed (${err.cause?.code || err.name})`);
  }
  if (!res.ok && res.status !== 401) throw new Error(`${label} returned HTTP ${res.status}`);
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new Error(`${label} rejected the API key`);
  return body;
}

function requireKey(name) {
  const key = process.env[name];
  if (!key) throw new Error(`Missing ${name} in .env`);
  return key;
}

// Best match for a title (optionally a year). Returns the first TMDB result, or null.
async function searchMovie(title, year) {
  const params = new URLSearchParams({ api_key: requireKey('TMDB_API_KEY'), query: title, include_adult: 'false' });
  if (year) params.set('year', String(year));
  const body = await getJson(`https://api.themoviedb.org/3/search/movie?${params}`, 'TMDB search');
  return body?.results?.[0] ?? null;
}

async function getMovieDetails(tmdbId) {
  const params = new URLSearchParams({ api_key: requireKey('TMDB_API_KEY') });
  return getJson(`https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}?${params}`, 'TMDB details');
}

// Raw OMDb body for an IMDb id (parse it with parseOmdbRatings). Returns null if there is no IMDb id.
async function getOmdb(imdbId) {
  if (!imdbId) return null;
  const params = new URLSearchParams({ apikey: requireKey('OMDB_API_KEY'), i: imdbId });
  return getJson(`https://www.omdbapi.com/?${params}`, 'OMDb');
}

module.exports = { searchMovie, getMovieDetails, getOmdb };
