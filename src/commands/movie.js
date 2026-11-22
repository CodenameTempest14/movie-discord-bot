const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchMovie, getMovieDetails, getOmdb } = require('../movie-api');
const {
  formatRuntime,
  postTitle,
  posterUrl,
  parseOmdbRatings,
  formatPostBody,
  shouldFetchRatings,
} = require('../movie-logic');

const TMDB_NOTICE = 'This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('Look up a movie: ratings, description, duration and poster')
    .addStringOption((o) => o.setName('title').setDescription('Movie title').setRequired(true).setMaxLength(100))
    .addIntegerOption((o) =>
      o.setName('year').setDescription('Release year, to pick the right movie').setMinValue(1888).setMaxValue(2100),
    )
    .addStringOption((o) =>
      o.setName('popcornmeter').setDescription('Rotten Tomatoes audience score to show, e.g. 76%').setMaxLength(10),
    ),
  async execute(interaction) {
    // Acknowledge first: Discord only allows 3 seconds, and the lookups below can take longer.
    await interaction.deferReply();

    const title = interaction.options.getString('title', true).trim();
    const year = interaction.options.getInteger('year');
    const popcornmeter = interaction.options.getString('popcornmeter')?.trim() || null;

    const hit = await searchMovie(title, year);
    if (!hit) {
      await interaction.editReply(`I couldn't find a movie called **${title}**${year ? ` (${year})` : ''}.`);
      return;
    }

    const details = await getMovieDetails(hit.id);

    // Ratings are a bonus: if OMDb fails, still show the movie without them.
    let ratings = { imdb: null, rottenTomatoes: null };
    if (shouldFetchRatings(details.release_date)) {
      try {
        ratings = parseOmdbRatings(await getOmdb(details.imdb_id));
      } catch (err) {
        console.warn(`[warn] ratings unavailable: ${err.message}`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(postTitle(details.title, details.release_date))
      .setDescription(
        formatPostBody({
          ...ratings,
          popcornmeter,
          description: details.overview,
          runtime: formatRuntime(details.runtime),
        }) || 'No details available.',
      )
      .setFooter({ text: TMDB_NOTICE });
    const poster = posterUrl(details.poster_path);
    if (poster) embed.setImage(poster);

    await interaction.editReply({ embeds: [embed] });
  },
};
