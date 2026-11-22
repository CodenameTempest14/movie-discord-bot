# Current State (updated 2026-11-22, end of session 2, DESKTOP)

## Phase progress
| Phase | Status | % |
|---|---|---|
| P00 Planning | Done | 100% |
| P01 Foundation | Done | 100% |
| P02 Movie data (/movie, TMDB + OMDb) | Done | 100% |
| P03 Forum automation (/setup, /addmovie, SQLite) | Done | 100% |
| P04 Watched + refresh (/watched, /unwatched, /refresh, daily refresh, /apiusage) | Done | 100% |
| P05 Recommendations (/recommend, /similar) | Done, verified in Discord (session 2) | 100% |
| P06 Movie night (polls, schedule, reminders) | In progress: design approved; step 1 of 3 built but NOT verified in Discord | 20% |
| P07 Hosting | Decided: stay on the owner's PC for now; Oracle Cloud Always Free is the first thing to try later | 20% (decision and research only) |

## Where things are
- Repo: https://github.com/CodenameTempest14/movie-discord-bot (branch `main`). Everything is pushed at the end of session 2.
- The bot runs from the owner's PC: `npm start` (needs the PC awake and the terminal open). Commands are registered per guild with `npm run deploy`.
- The bot is in ONE server, "Software Dev`", which holds the real forum `#movie-recommendations`. The old test forum was deleted by the owner.
- Tests: `npm test` (80 passing). Secrets live only in `.env` (gitignored): DISCORD_TOKEN, CLIENT_ID, GUILD_ID, TMDB_API_KEY, OMDB_API_KEY.
- Owner-facing guide: `docs/Movie-Bot-Guide.pdf` (source `docs/Movie-Bot-Guide.html`). Does not cover movie night yet; update it when P06 is built.
- Icon and banner: source SVGs in `assets/`; PNGs were uploaded by the owner in the Developer Portal.

## Verified in Discord (session 2)
- P05: `/recommend` (one genre, two genres + min_rating, no-match message), `/similar` (Inception, nonsense title).
  Not checked: that two runs of the same `/recommend` give different picks.
- `/watched` refused outside a movie post; `/movie Dune: Part Three` (unreleased) shows no ratings. The `/apiusage` count was not
  compared before/after, so "zero OMDb requests" for unreleased movies is not proven.
- Real forum: `/setup` passed, `/addmovie` (Monster House 2006), `/watched`, `/unwatched`, and `/refresh` (forgot the 2 deleted test posts).
- Allowed roles, owner's decision: Thesis-Member and Officer (Moderator), plus server administrators.

## UNVERIFIED (one change, needs a Discord check first thing next session)
**P06 step 1: `/setup` got two optional options, `announce_channel` (text channel) and `timezone` (IANA name, e.g. `Asia/Manila` for the Philippines).**
Built test-first (80 tests pass, incl. DB upgrade of an old database and timezone validation), registered with `npm run deploy`, but never run in Discord.
The owner could not see `timezone` in the picker; Discord's API confirmed it is registered (`forum*, role1*, role2, announce_channel, timezone`),
so it was a stale Discord client (reload with Ctrl+R) or the optional-options list. Checks to run:
1. `/setup forum:#movie-recommendations role1:Thesis-Member role2:Officer announce_channel:<text channel> timezone:Asia/Manila`: expect "Saved", a "Movie night: announcements in ..., timezone Asia/Manila" line, and "Tags and permissions look good".
2. `/setup` with `timezone:New York` (space): must be refused with the "not a timezone I know" message.
3. `/setup` with only forum + roles: the movie night line must still show the saved channel and timezone.
Database was backed up before the upgrade (session scratchpad, may be gone); the upgrade only adds two columns to `guild_settings`.

## P06 plan (approved by owner; full text in FEATURES.md "F5 details")
- Step 1 (built, unverified): `/setup` movie night options. Settings stored per server in SQLite.
- Step 2: `/movienight poll [count:2-5, default 4] [hours:1-168, default 24]`: random `To Watch` posts, native Discord poll in the announcement channel, winner announced when it ends (tie announced as a tie, no random pick). Poll saved in SQLite; on bot start, catch up on polls that ended while the bot was off.
- Step 3: `/movienight schedule movie:<winner/post> when:<YYYY-MM-DD HH:MM in the server timezone>`: announcement plus a reminder 1 hour before (stored in SQLite, catches up after downtime). No Discord Scheduled Event.
- Roles for poll/schedule: Thesis-Member, Officer, admins.
- Discord poll facts read from the docs (session 2): answer text max 55 chars, question max 300, up to 10 answers, duration in hours (default 24), results have `is_finalized` and per-answer counts, `GUILD_MESSAGE_POLLS` intent is not privileged, discord.js `Poll` has `end()`, `fetch()`, `expiresAt`, `resultsFinalized`. Not confirmed: reading votes without MESSAGE_CONTENT, and discord.js `PollAnswer.voteCount`. Test these against real Discord, do not assume.
- Read the Discord poll docs page again before building (docs moved to docs.discord.com).

## Known notes / risks
- Windows Controlled Folder Access blocks new programs in `D:\Documents` (PowerShell cannot write there; `node` and the editor tools can).
- Network to Discord is sometimes slow on new connections; keep-alive agent in `src/index.js` mitigates it.
- A bot started BEFORE a command file existed does not know the command ("The application did not respond"): restart the bot after code changes. Never run it on two PCs at once.
- `data/bot.sqlite` is gitignored: a second PC (laptop) has its own empty movie list, so use one PC as the bot's home.
- OMDb reports no remaining quota; `/apiusage` counts the bot's own requests per UTC day.
- TMDB terms: show the TMDB notice, no commercial use, do not cache TMDB data over 6 months (only IDs are stored).
- PopCornmeter is typed by hand (optional `popcornmeter:` option); no API provides it.

## Open decisions
Hosting later (Oracle Cloud Always Free first, small paid VPS as fallback), whether to rebuild links by scanning the forum, dropdown to choose between ambiguous search results.
