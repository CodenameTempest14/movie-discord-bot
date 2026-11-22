# src/commands

One file per slash command. Each exports `{ data, execute }`; `src/load-commands.js` loads every `.js` file here.
After adding or changing a command's name or options, run `npm run deploy`.
