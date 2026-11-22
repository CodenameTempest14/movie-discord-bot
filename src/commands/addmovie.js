const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { searchMovie, getMovieDetails, getOmdb } = require('../movie-api');
const {
  formatRuntime,
  postTitle,
  statusTag,
  posterUrl,
  parseOmdbRatings,
  formatPostBody,
  findTagId,
  missingTags,
} = require('../movie-logic');
const { canManageMovies } = require('../permissions');

const reply = (interaction, content) =>
  interaction.editReply({ content, allowedMentions: { parse: [] } });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmovie')
    .setDescription('Create a forum post for a movie, with ratings, description, duration and poster')
    .setContexts(0) // guild only
    .addStringOption((o) => o.setName('title').setDescription('Movie title').setRequired(true).setMaxLength(100))
    .addIntegerOption((o) =>
      o.setName('year').setDescription('Release year, to pick the right movie').setMinValue(1888).setMaxValue(2100),
    )
    .addStringOption((o) =>
      o.setName('popcornmeter').setDescription('Rotten Tomatoes audience score to show, e.g. 76%').setMaxLength(10),
    ),
  async execute(interaction) {
    // Acknowledge first (Discord allows only 3 seconds); the lookups below can be slow.
    await interaction.deferReply();

    const db = interaction.client.db;
    const settings = db.getSettings(interaction.guildId);
    if (!settings) return reply(interaction, 'This server is not set up yet. An admin needs to run `/setup` first.');

    const allowed = canManageMovies({
      isAdministrator: interaction.memberPermissions.has('Administrator'),
      memberRoleIds: [...interaction.member.roles.cache.keys()],
      allowedRoleIds: settings.roleIds,
    });
    if (!allowed) return reply(interaction, 'Only admins and the roles chosen in `/setup` can add movies.');

    const forum = await interaction.guild.channels.fetch(settings.forumChannelId).catch(() => null);
    if (!forum || forum.type !== ChannelType.GuildForum) {
      return reply(interaction, 'The saved movie forum no longer exists. An admin needs to run `/setup` again.');
    }
    const noTags = missingTags(forum.availableTags);
    if (noTags.length) return reply(interaction, `The forum is missing these tags: ${noTags.join(', ')}. Add them, then try again.`);

    const title = interaction.options.getString('title', true).trim();
    const year = interaction.options.getInteger('year');
    const popcornmeter = interaction.options.getString('popcornmeter')?.trim() || null;

    const hit = await searchMovie(title, year);
    if (!hit) return reply(interaction, `I couldn't find a movie called **${title}**${year ? ` (${year})` : ''}.`);

    const existing = db.findMovieByTmdb(interaction.guildId, hit.id);
    if (existing) return reply(interaction, `That movie is already posted: <#${existing.threadId}>`);

    const details = await getMovieDetails(hit.id);

    let ratings = { imdb: null, rottenTomatoes: null };
    try {
      ratings = parseOmdbRatings(await getOmdb(details.imdb_id));
    } catch (err) {
      console.warn(`[warn] ratings unavailable: ${err.message}`);
    }

    const body =
      formatPostBody({ ...ratings, popcornmeter, description: details.overview, runtime: formatRuntime(details.runtime) }) ||
      'No details available.';
    const poster = posterUrl(details.poster_path);
    const tagId = findTagId(forum.availableTags, statusTag(details.release_date));

    const thread = await forum.threads.create({
      name: postTitle(details.title, details.release_date),
      message: { content: body, ...(poster ? { files: [{ attachment: poster, name: 'poster.jpg' }] } : {}) },
      appliedTags: [tagId],
    });

    db.addMovie({ guildId: interaction.guildId, tmdbId: hit.id, threadId: thread.id });
    await reply(interaction, `Added **${thread.name}**: <#${thread.id}>`);
  },
};
