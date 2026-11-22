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
