require('dotenv').config();
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { Agent } = require('undici');
const loadCommands = require('./load-commands');
const { openDb } = require('./db');
const { setOmdbRequestRecorder } = require('./movie-api');
const { refreshAll } = require('./refresh');
const { shouldRefresh, utcDay } = require('./movie-logic');

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Discord only gives 3 seconds to answer a command. On some networks, opening a NEW connection to Discord is
// slow (1-10s), so keep connections open for a long time and reuse them.
const agent = new Agent({ keepAliveTimeout: 60_000, keepAliveMaxTimeout: 600_000, connect: { timeout: 10_000 } });

const client = new Client({ intents: [GatewayIntentBits.Guilds], rest: { agent } });
const commands = loadCommands();
client.db = openDb();

// Count our own OMDb requests per UTC day (shown by /apiusage).
setOmdbRequestRecorder(() => client.db.recordApiCall('omdb', utcDay()));

// Daily refresh of ratings and Coming Soon tags. Checks hourly whether 24 hours have passed since the last run,
// so a restart or a day with the bot off does not skip a refresh or repeat it too soon.
async function maybeRefresh() {
  const last = client.db.getMeta('last_refresh');
  if (!shouldRefresh(last === null ? null : Number(last), Date.now())) return;
  const counts = await refreshAll(client, client.db);
  if (!counts) return; // another refresh is already running
  client.db.setMeta('last_refresh', Date.now());
  console.log(`Daily refresh: ${JSON.stringify(counts)}`);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag} with ${commands.size} commands loaded.`);
  setTimeout(() => maybeRefresh().catch((e) => console.warn(`[warn] refresh error: ${e.message}`)), 30_000);
  setInterval(() => maybeRefresh().catch((e) => console.warn(`[warn] refresh error: ${e.message}`)), 60 * 60 * 1000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const msg = { content: 'Something went wrong running that command.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
