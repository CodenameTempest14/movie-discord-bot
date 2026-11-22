# CLAUDE.md — Discord Bot

A Discord bot (Node.js, CommonJS). Entry point `src/index.js`; slash commands live in `src/commands/`
(`hello`, `ping`, `roll`), loaded by `src/load-commands.js` and registered with `src/deploy-commands.js`.
Run with `npm start`; register commands with `npm run deploy`.
The owner is learning: explain before/while implementing.
Rules below are adapted from the Init heat-monitoring project (`D:\init-heat-monitoring-repo\CLAUDE.md`).

## ⛔ HARD RULES (owner): never skip these
1. **Session start AND end: show the Phase Progress table** with percentages, in the Start and Close Reports.
   Keep the table by hand.
2. **Session end: leave a continuation prompt** the owner can copy and paste into the next session, and
   **show it in the final message**. No prompt, no finished session.
3. **Device check and pull reminder.** **Always ask the owner which device they are working on right now:
   laptop or desktop.** Record it in the Start Report and in the continuation prompt, so the next session knows which
   device the previous one used. If the previous session was on the other device, **remind the owner to pull from
   `main` first** (`git pull origin main`) before any change. Pulling is the owner's to approve; ask first.

## Every session
- **Device:** the first reply asks which device the owner is on (hard rule 3) and, if it differs from the last session's, reminds them to pull `main`.
- **Model advice:** the first reply says which Claude model to use and why. The Close Report recommends the model for the next session.
- **Start:** write a Session Start Report before any change.
- **Open every reply with a status line**, e.g. `[P00 · Planning · 0/0 done · 0 blocked · unverified 0]`.
- **End:** Session Close Report (with Phase Progress table), update the state file and progress log, answer
  *"Which parts did you actually run, and what are you unsure about?"*, commit, then show the continuation prompt.

## Hard rules
- **No new feature is planned, designed or built until the owner approves it** in a features doc. Propose, then wait.
- At most **one** unverified change at a time. A blocked check still counts.
- Tick checklist items in the **same commit** as the work, with evidence. Never from memory.
- Test-first for anything with a correct answer (e.g. the dice roll logic); watch the test fail first.
- A green test is not a fix. Run the bot and try the command in Discord.
- The repo wins over the docs: flag conflicts, fix the doc, continue.
- Validate all user input from Discord (command options) on the bot side.
- Secrets (`DISCORD_TOKEN`, `CLIENT_ID`, any API keys) never get committed. Use `.env` (gitignored); keep `.env.example` current.
- No real user data (Discord IDs, usernames, message content) in screenshots, fixtures or logs.
- Ask the owner before: push, merge to main, force-push, history rewrite, deleting data, architecture/scope changes.
- Every folder has a README.md.

## Open decisions
Feature list, hosting, phase plan.
