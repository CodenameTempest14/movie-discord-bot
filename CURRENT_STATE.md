# Current State (updated 2026-11-22, end of session 1, desktop)

## Phase progress
| Phase | Status | % |
|---|---|---|
| P00 Planning | Done | 100% |
| P01 Foundation | Done | 100% |
| P02 Movie data (/movie, TMDB + OMDb) | Done | 100% |
| P03 Forum automation (/setup, /addmovie, SQLite) | Done | 100% |
| P04 Watched + refresh (/watched, /unwatched, /refresh, daily refresh, /apiusage) | Done | 100% |
| P05 Recommendations (/recommend, /similar) | Not started | 0% |
| P06 Movie night (polls, schedule, reminders) | Not started | 0% |
| P07 Hosting | Not started | 0% |

## Where things are
- Repo: https://github.com/CodenameTempest14/movie-discord-bot (branch `main`). Last pushed: `d9c08dc`. Local only: `c3bf3b2` (skip OMDb for unreleased movies) plus this file.
- Bot runs from the owner's PC (`npm start`); the test forum is `test-movie-server` in the Software Dev` server. The real forum is `#movie-recommendations` (not set up yet).
- Tests: `npm test` (55 passing). Commands are registered per guild with `npm run deploy`.
- Secrets live only in `.env` (gitignored): DISCORD_TOKEN, CLIENT_ID, GUILD_ID, TMDB_API_KEY (32-char v3 key), OMDB_API_KEY.

## Known notes / risks
- Windows Controlled Folder Access blocks new programs in `D:\Documents`. Git and Node were allowed manually; a new tool may need allowing too.
- Network to Discord is sometimes slow on new connections; keep-alive agent in `src/index.js` mitigates it.
- OMDb reports no remaining quota and no reset time; `/apiusage` counts the bot's own requests per UTC day.
- TMDB terms: show the TMDB notice, no commercial use, do not cache TMDB data over 6 months (only IDs are stored).
- PopCornmeter is typed by hand (optional `popcornmeter:` option); no API provides it.
- Not yet checked in Discord: `/watched` refusing outside a movie post; the OMDb-skip for unreleased movies (committed after the last test).
- Allowed roles in the test setup: Officer (Moderator), Thesis-Member (plus Administrators). Owner wanted Admin and Vice-Admin; revisit when setting up the real forum.

## Open decisions
Real forum setup, hosting (P07), whether to rebuild links by scanning the forum, dropdown to choose between ambiguous search results.
