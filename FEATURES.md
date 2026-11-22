# Features & Phase Plan (v2: data source, PopCornmeter and permissions approved; features F0-F6 awaiting final OK)

Nothing below is built until the owner approves it. Device at planning: desktop.

## What the server does today (manual)
A forum channel `#movie-recommendations`. Each post is one movie:
- Title: `Movie Name (Year)`
- Tag: `To Watch` / `Watched` / `Coming Soon`
- First message: IMDb rating, Rotten Tomatoes %, PopCornmeter %, description, duration, poster image.
The bot should do all of this automatically.

## Decisions so far
- Purpose: automate the movie forum channel (repo: `movie-discord-bot`).
- Per-server settings (owner, 2026-11-22): each server picks its own forum channel.
- Stack: Node.js, discord.js (scaffolded). Storage: SQLite (P03).
- Hosting: the owner's PC for now.
- Data sources: **TMDB plus OMDb (NEW, needs approval)**. TMDB gives title, year, plot, runtime, poster, release date.
  OMDb is the usual source for the IMDb rating and the Rotten Tomatoes score. Both need free API keys in `.env`
  (`TMDB_API_KEY`, `OMDB_API_KEY`). I will confirm exactly which fields each returns by reading their docs in P02.
- **Known gap:** the PopCornmeter (RT audience score) is, as far as I know, not offered by either API. Options:
  (a) leave it out, (b) let the user type it in as an optional command field, (c) scrape RT (not recommended: against
  their terms and fragile). Owner to choose.

## Owner decisions (2026-11-22)
- PopCornmeter: optional command field, left out of the post if blank.
- OMDb approved alongside TMDB.
- `/addmovie`, `/watched`, `/unwatched` are limited to a role chosen in `/setup` (stored per server).

## Proposed features
| ID | Feature | Commands | Storage |
|----|---------|----------|---------|
| F0 NEW | Setup: pick the forum channel for this server | `/setup channel:<forum>` (admin only) | yes |
| F1 NEW | Add a movie: bot searches, then creates the forum post with title `Name (Year)`, ratings, description, duration, poster and the right tag (`Coming Soon` if the release date is in the future, else `To Watch`) | `/addmovie title:<text> [year]` | yes (link post to movie) |
| F2 NEW | Mark watched / unwatched: swaps the tag on the post | `/watched`, `/unwatched` (run inside the post) | yes |
| F3 | Movie info without posting (quick lookup) | `/movie title:<text>` | no |
| F4 | Recommendations by genre, or similar to a movie | `/recommend`, `/similar` | no |
| F5 | Movie night polls with scheduling and reminders | `/movienight poll`, `schedule` | yes |
| F6 NEW | Refresh: update ratings, and flip `Coming Soon` to `To Watch` after release | `/refresh`, or automatic | yes |

Open points on F1: the poll of several search matches (choose from a dropdown when a title is ambiguous),
duplicate check (do not post the same movie twice), and who may use it (everyone, or a role).

## Added during build (owner requested, 2026-11-22)
- **F7 `/apiusage`** (admins, Manage Server): shows OMDb requests used today against the free tier's 1,000/day.
  OMDb does not report remaining quota (its docs state no such endpoint), so the bot counts its own requests per UTC day;
  OMDb also does not say when its limit resets. If OMDb replies "limit reached", `/refresh` and the daily refresh stop early.
- **Daily refresh (F6) is automatic**, checked hourly, run once per 24 hours; `/refresh` runs it on demand.
- **`/watched` and `/unwatched`** work only inside posts the bot created (not hand-made posts).

## F4 details (P05, owner approved 2026-11-22; exact behaviour drafted by Claude, owner may adjust)
- **`/recommend genre:<choice> [genre2:<choice>] [min_rating:<1-10>]`**: TMDB `discover/movie` with `with_genres`
  (two genres = both required), `vote_average.gte` (default 6.5), `vote_count.gte` 300 (filters out obscure titles),
  `sort_by=popularity.desc`, no adult titles. Picks 5 at random from the first page (20 results) so repeat runs vary.
  Genres are a fixed dropdown (TMDB's genre ids), so there is no free-text input to validate.
- **`/similar title:<text> [year]`**: finds the movie like `/movie` does, then asks TMDB `/movie/{id}/recommendations`;
  if that is empty it falls back to `/movie/{id}/similar`. Shows the top 5, excluding the movie itself.
- **Output (both):** one embed, one line per movie: `Title (Year) ⭐ 7.8 : short description` (description cut to
  150 chars), the TMDB notice in the footer. TMDB's rating is shown (no OMDb calls, so no OMDb quota is used).
- Open to everyone; replies are public like `/movie`. No storage. Not-found and API errors give a plain message.

## F5 details (P06): PROPOSED, awaiting owner approval
Owner answers (2026-11-22): poll choices come from the To Watch posts, picked randomly; poll and schedule are limited to
Thesis-Member and Officer (plus administrators), the same roles as `/addmovie`; announcements and reminders go to a
separate text channel.
- **`/setup` gets one new optional option**, `announce_channel:<text channel>`, stored per server. Movie night commands
  refuse politely until it is set. The bot needs View Channel, Send Messages and Embed Links there.
- **`/movienight poll [count:2-5, default 4] [hours:1-168, default 24]`**: picks `count` random posts that carry the
  `To Watch` tag (not `Coming Soon`, not `Watched`) and starts a native Discord poll in the announcement channel.
  Fewer To Watch posts than `count` means it uses what exists (needs at least 2, otherwise it says so).
  When the poll ends the bot announces the winner with a link to its post. A tie is announced as a tie, with a random
  pick among the tied movies offered by a second message only if the owner wants that (open point 2).
  Poll state (message id, end time, post ids) is stored in SQLite so a restart does not lose a poll.
- **`/movienight schedule movie:<winner or post link> when:<YYYY-MM-DD HH:MM>`**: records the movie night and posts it in
  the announcement channel, then posts a reminder **1 hour before** (stored in SQLite, so it survives restarts).
  Whether it also creates a Discord Scheduled Event is open point 3.
- **Not included:** voting on movies that are not in the forum, recurring movie nights, per-user reminders.
- **Validation:** `count` and `hours` have min/max in the command; `when` is parsed strictly and must be in the future;
  the movie must be a post the bot created.
- **Tests first** for: choosing random To Watch posts (fixed random function), tally and tie rules, parsing `when`,
  reminder due-time check. Discord behaviour is verified by hand, with the bot running.
- **Open points:** (1) timezone for `when` (server-wide setting, or a `tz` option?), (2) tie handling,
  (3) Discord Scheduled Event as well as the announcement (needs the Manage Events permission), (4) poll default length.

## P07 hosting: PROPOSED options, owner to choose (prices not checked yet; I will read current pricing pages before you decide)
The bot is a long-running process (a Discord connection plus a local SQLite file and timers for refresh, poll results and
reminders). So it needs always-on hosting with a **persistent disk**; serverless and sleeping free tiers do not fit.
| Option | Upside | Downside |
|--------|--------|----------|
| Stay on the owner's PC | Free, nothing to change | Bot is offline when the PC is off or asleep; reminders and poll results are missed |
| Small VPS (a few USD/month) | Always on, full control, SQLite file just works | Monthly cost, owner must manage the server (updates, restarts) |
| Free-tier cloud VM | Free | Signup rules and limits change; may reclaim idle instances |
| App platform (Railway, Fly.io, etc.) | Easy deploys from GitHub | Needs a paid persistent volume for SQLite; cost varies |
Whatever is chosen: secrets go in the host's environment settings (never in git), the bot restarts itself on a crash or reboot,
and the SQLite file is backed up. The `.env` keys (`DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `TMDB_API_KEY`, `OMDB_API_KEY`) are moved by the owner.

## Phases
| Phase | Goal | Done when |
|-------|------|-----------|
| P01 Foundation | Bot created, `.env` filled, 3 existing commands verified, README | Commands answer in Discord |
| P02 Movie data | TMDB + OMDb client, `/movie`, error and not-found handling, tests on parsing | `/movie` verified in Discord |
| P03 Forum automation | SQLite, `/setup`, `/addmovie` (F0, F1), tag logic | A post identical in layout to the manual ones is created |
| P04 Watched + refresh | `/watched`, `/unwatched`, `/refresh` (F2, F6) | Tag swaps and persists after restart |
| P05 Recommendations | F4 | Verified in Discord |
| P06 Movie night | F5 | Poll runs end to end |
| P07 Hosting | Only if always-on is wanted | Bot online without the PC |

## Rules applied in every phase
- Test-first for logic with a correct answer (response parsing, year/tag rules, duration formatting).
- Verify in real Discord, not just tests. One unverified change at a time.
- Validate all command options. Never log Discord IDs, usernames or message content.
- Bot needs forum permissions (create posts, manage tags/threads). Confirmed in P03 against Discord's docs.
- Respect TMDB/OMDb rate limits and attribution terms (read their pages in P02).
