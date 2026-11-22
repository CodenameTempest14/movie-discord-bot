const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { refreshAll } = require('../refresh');
const { canManageMovies } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refresh')
    .setDescription('Update ratings and Coming Soon tags on this server\'s movie posts now')
    .setContexts(0),
  async execute(interaction) {
    const settings = interaction.client.db.getSettings(interaction.guildId);
    const allowed = canManageMovies({
      isAdministrator: interaction.memberPermissions.has('Administrator'),
      memberRoleIds: [...interaction.member.roles.cache.keys()],
      allowedRoleIds: settings?.roleIds ?? [],
    });
    if (!allowed) {
      return interaction.reply({ content: 'Only admins and the roles chosen in `/setup` can do this.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const c = await refreshAll(interaction.client, interaction.client.db, { guildId: interaction.guildId });
    if (!c) return interaction.editReply('A refresh is already running. Try again in a minute.');

    const lines = [
      `Checked **${c.checked}** movie post(s): **${c.updated}** updated, ${c.unchanged} unchanged.`,
      ...(c.removed ? [`${c.removed} deleted post(s) were forgotten.`] : []),
      ...(c.skipped ? [`${c.skipped} skipped (forum tags missing or post not found).`] : []),
      ...(c.failed ? [`${c.failed} failed (see the bot log).`] : []),
      ...(c.stoppedByLimit ? ['⚠️ Stopped early: the OMDb daily request limit is used up. Try again later.'] : []),
    ];
    await interaction.editReply(lines.join('\n'));
  },
};
