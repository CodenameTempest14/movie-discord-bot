const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { usageSummary, utcDay } = require('../movie-logic');

// OMDb free tier: 1,000 requests per day (stated on omdbapi.com/apikey.aspx).
const OMDB_DAILY_LIMIT = 1000;

const ICON = { ok: '🟢', warning: '🟡', exceeded: '🔴' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apiusage')
    .setDescription('Show how much of the OMDb free daily limit this bot has used')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(0),
  async execute(interaction) {
    const db = interaction.client.db;
    const now = new Date();
    const today = usageSummary(db.getApiUsage('omdb', utcDay(now)), OMDB_DAILY_LIMIT);
    const yesterday = db.getApiUsage('omdb', utcDay(new Date(now.getTime() - 24 * 60 * 60 * 1000)));

    const filled = Math.min(10, Math.round(today.percent / 10));
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [
        `${ICON[today.level]} **OMDb requests today (UTC):** ${today.used} / ${today.limit} (${today.percent}%) ${bar}`,
        `Remaining by this bot's count: **${today.remaining}**. Yesterday: ${yesterday}.`,
        '',
        '_OMDb does not report remaining quota, so this counts only requests made by this bot since it started tracking. ' +
          'OMDb does not say when its daily limit resets; days here are UTC. If the real limit is reached, the bot says so in `/refresh` and in the log._',
      ].join('\n'),
    });
  },
};
