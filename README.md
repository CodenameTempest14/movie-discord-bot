# Movie Discord Bot

A Discord bot that automates a movie forum channel: it looks up movies and creates the forum posts
(ratings, description, duration, poster, status tag) instead of typing them by hand.
See [FEATURES.md](FEATURES.md) for the plan and [CLAUDE.md](CLAUDE.md) for project rules.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `CLIENT_ID` and (for development) `GUILD_ID`. Never commit `.env`.
3. `npm run deploy` registers the slash commands. `npm start` runs the bot. `npm test` runs the tests.

## Current commands
`/ping`, `/hello`, `/roll` (foundation checks; movie commands come in later phases).

## Folders
- `src/` bot code. `src/commands/` one file per slash command.
- `test/` automated tests.
