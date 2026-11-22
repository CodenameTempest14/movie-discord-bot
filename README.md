# Movie Discord Bot

A Discord bot that automates a movie forum channel: it looks up movies and creates the forum posts
(ratings, description, duration, poster, status tag) instead of typing them by hand.
See [FEATURES.md](FEATURES.md) for the plan and [CLAUDE.md](CLAUDE.md) for project rules.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `CLIENT_ID` and (for development) `GUILD_ID`. Never commit `.env`.
3. `npm run deploy` registers the slash commands. `npm start` runs the bot. `npm test` runs the tests.

## Commands
- `/setup forum role1 [role2]`: choose the movie forum and who may add movies (needs Manage Server). Checks tags and permissions.
- `/addmovie title [year] [popcornmeter]`: create a forum post with ratings, description, duration, poster and a status tag.
- `/movie title [year] [popcornmeter]`: look a movie up without posting.
- `/watched`, `/unwatched`: run inside a bot-made post to change its status tag.
- `/refresh`: update ratings and Coming Soon tags now. This also runs automatically once a day.
- `/apiusage`: OMDb requests used today against the free 1,000/day limit (counted by the bot).
- `/ping`, `/hello`, `/roll`: foundation checks.

The forum needs three tags named To Watch, Watched and Coming Soon (emoji in the name are fine).

## Data and credits
Movie data and posters come from TMDB, and ratings from OMDb. This application uses TMDB and the TMDB APIs but is not
endorsed, certified, or otherwise approved by TMDB. The bot keeps only IDs in `data/bot.sqlite` (gitignored).

## Folders
- `src/` bot code. `src/commands/` one file per slash command.
- `test/` automated tests.
