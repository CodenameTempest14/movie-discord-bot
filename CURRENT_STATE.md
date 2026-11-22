# Current State (updated 2026-11-22, end of session 1, desktop)

## Phase progress
| Phase | Status | % |
|---|---|---|
| P00 Planning | Done | 100% |
| P01 Foundation | Done | 100% |
| P02 Movie data (/movie, TMDB + OMDb) | Done | 100% |
| P03 Forum automation (/setup, /addmovie, SQLite) | Done | 100% |
| P04 Watched + refresh (/watched, /unwatched, /refresh, daily refresh, /apiusage) | Done | 100% |
| P05 Recommendations (/recommend, /similar) | Done, verified in Discord 2026-11-22 | 100% |
| P06 Movie night (polls, schedule, reminders) | Not started | 0% |
| P07 Hosting | Not started | 0% |

## Where things are
- Repo: https://github.com/CodenameTempest14/movie-discord-bot (branch `main`). Last pushed: `d9c08dc`. Local only: `c3bf3b2` (skip OMDb for unreleased movies) plus this file.
- Bot runs from the owner's PC (`npm start`); the test forum is `test-movie-server` in the Software Dev` server. The real forum is `#movie-recommendations` (not set up yet).
- P05 verified in Discord (desktop, session 2): `/recommend genre:Comedy`, `genre:Horror genre2:Comedy min_rating:7`,
  `genre:Western min_rating:10` (no-match message), `/similar title:Inception`, `/similar` with a nonsense title (not found).
  Not checked: that two runs of the same `/recommend` give different picks (only one run was screenshotted).
- Icon and banner source SVGs are in `assets/`; the PNGs were rendered into the session scratchpad (Controlled Folder Access
  blocks PowerShell writes in D:\Documents) and uploaded by the owner in the Developer Portal.
- Tests: `npm test` (72 passing). Commands are registered per guild with `npm run deploy`.
- Secrets live only in `.env` (gitignored): DISCORD_TOKEN, CLIENT_ID, GUILD_ID, TMDB_API_KEY (32-char v3 key), OMDB_API_KEY.

## Known notes / risks
- Windows Controlled Folder Access blocks new programs in `D:\Documents`. Git and Node were allowed manually; a new tool may need allowing too.
- Network to Discord is sometimes slow on new connections; keep-alive agent in `src/index.js` mitigates it.
- OMDb reports no remaining quota and no reset time; `/apiusage` counts the bot's own requests per UTC day.
- TMDB terms: show the TMDB notice, no commercial use, do not cache TMDB data over 6 months (only IDs are stored).
- PopCornmeter is typed by hand (optional `popcornmeter:` option); no API provides it.
- Verified in Discord (session 2): `/watched` outside a movie post replies "Use this command inside a movie post that I created with /addmovie."
- Verified in Discord (session 2): `/movie Dune: Part Three` (unreleased, 2026-12-18) shows description, duration and poster with no
  IMDb/Rotten Tomatoes lines. This matches the OMDb skip, but the `/apiusage` count was not compared before/after, so "zero OMDb requests" is not proven.
- Real forum set up (session 2): the bot is in one server, "Software Dev`", which holds both `movie-recommendations` (real) and the old `test-movie-server` forum (owner deleted it; `/refresh` forgot its 2 posts). `/setup` on `#movie-recommendations` passed ("Tags and permissions look good").
- Allowed roles, owner's decision: Thesis-Member and Officer (Moderator), plus server administrators. (Not Admin/Vice-Admin.)
- Verified on the real forum (session 2): `/addmovie` (Monster House 2006: tag, ratings, poster, layout correct), `/watched` and `/unwatched` inside the post.
- P06 proposal is written in FEATURES.md and waits for owner approval (open: timezone, tie handling, Discord Scheduled Event, poll length). Nothing built.
- P07 hosting decided: stay on the owner's PC for now (see ranking in FEATURES.md; Oracle Cloud Always Free is the first thing to try later).

## Open decisions
Real forum setup, hosting (P07), whether to rebuild links by scanning the forum, dropdown to choose between ambiguous search results.
