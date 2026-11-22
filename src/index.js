require('dotenv').config();
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { Agent } = require('undici');
const loadCommands = require('./load-commands');

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Discord only gives 3 seconds to answer a command. On some networks, opening a NEW connection to Discord is
// slow (1-10s), so keep connections open for a long time and reuse them.
const agent = new Agent({ keepAliveTimeout: 60_000, keepAliveMaxTimeout: 600_000, connect: { timeout: 10_000 } });

const client = new Client({ intents: [GatewayIntentBits.Guilds], rest: { agent } });
const commands = loadCommands();

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag} with ${commands.size} commands loaded.`);
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
