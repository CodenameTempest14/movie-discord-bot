require('dotenv').config();
const { REST, Routes } = require('discord.js');
const loadCommands = require('./load-commands');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Set DISCORD_TOKEN and CLIENT_ID in .env first.');
  process.exit(1);
}

const body = [...loadCommands().values()].map((c) => c.data.toJSON());
const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  // Guild commands update instantly; global commands can take up to an hour.
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);
  await rest.put(route, { body });
  console.log(`Registered ${body.length} commands ${GUILD_ID ? `to guild ${GUILD_ID}` : 'globally'}.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
