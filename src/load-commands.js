const fs = require('node:fs');
const path = require('node:path');

// Loads every file in src/commands that exports { data, execute }.
module.exports = function loadCommands() {
  const dir = path.join(__dirname, 'commands');
  const commands = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(dir, file));
    if (!command.data || !command.execute) {
      console.warn(`[warn] ${file} is missing "data" or "execute", skipping.`);
      continue;
    }
    commands.set(command.data.name, command);
  }
  return commands;
};
