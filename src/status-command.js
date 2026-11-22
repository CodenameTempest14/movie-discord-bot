// Shared logic for /watched and /unwatched: run inside a movie post the bot created, swap its status tag.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getMovieDetails } = require('./movie-api');
const { STATUS_NAMES, findTagId, statusTag, applyStatus } = require('./movie-logic');
const { canManageMovies } = require('./permissions');

function makeStatusCommand({ name, description, resolveStatus, doneText }) {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(description).setContexts(0),
    async execute(interaction) {
      const ephemeral = { flags: MessageFlags.Ephemeral };
      const db = interaction.client.db;
      const channel = interaction.channel;

      const movie = channel?.isThread() ? db.findMovieByThread(channel.id) : null;
      if (!movie) {
        return interaction.reply({ content: 'Use this command inside a movie post that I created with `/addmovie`.', ...ephemeral });
      }

      const settings = db.getSettings(interaction.guildId);
      const allowed = canManageMovies({
        isAdministrator: interaction.memberPermissions.has('Administrator'),
        memberRoleIds: [...interaction.member.roles.cache.keys()],
        allowedRoleIds: settings?.roleIds ?? [],
      });
      if (!allowed) return interaction.reply({ content: 'Only admins and the roles chosen in `/setup` can do this.', ...ephemeral });

      await interaction.deferReply();

      const forum = channel.parent ?? (await interaction.client.channels.fetch(channel.parentId));
      const ids = Object.fromEntries(STATUS_NAMES.map((n) => [n, findTagId(forum.availableTags, n)]));
      if (STATUS_NAMES.some((n) => !ids[n])) {
        return interaction.editReply('The forum is missing one of the tags To Watch / Watched / Coming Soon.');
      }

      // /unwatched goes back to To Watch or Coming Soon depending on the release date, so it needs TMDB.
      const status = await resolveStatus(movie, { getMovieDetails, statusTag });
      await channel.setAppliedTags(applyStatus(channel.appliedTags, ids, status));
      await interaction.editReply(doneText(status));
    },
  };
}

module.exports = { makeStatusCommand };
