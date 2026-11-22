const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchMovie, getRelatedMovies } = require('../movie-api');
const { postTitle } = require('../movie-logic');
const { pickSuggestions, formatSuggestionList } = require('../recommend-logic');

const TMDB_NOTICE = 'This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.';
const HOW_MANY = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('similar')
    .setDescription('Find movies similar to one you like')
    .addStringOption((o) => o.setName('title').setDescription('Movie title').setRequired(true).setMaxLength(100))
    .addIntegerOption((o) =>
      o.setName('year').setDescription('Release year, to pick the right movie').setMinValue(1888).setMaxValue(2100),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const title = interaction.options.getString('title', true).trim();
    const year = interaction.options.getInteger('year');

    const hit = await searchMovie(title, year);
    if (!hit) {
      await interaction.editReply(`I couldn't find a movie called **${title}**${year ? ` (${year})` : ''}.`);
      return;
    }

    // "recommendations" first; if TMDB has none for this movie, fall back to "similar" (genre + keyword match).
    let picks = pickSuggestions(await getRelatedMovies(hit.id, 'recommendations'), HOW_MANY, { excludeId: hit.id });
    if (picks.length === 0) {
      picks = pickSuggestions(await getRelatedMovies(hit.id, 'similar'), HOW_MANY, { excludeId: hit.id });
    }
    if (picks.length === 0) {
      await interaction.editReply(`I found **${postTitle(hit.title, hit.release_date)}** but no similar movies.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Similar to ${postTitle(hit.title, hit.release_date)}`)
      .setDescription(formatSuggestionList(picks))
      .setFooter({ text: TMDB_NOTICE });
    await interaction.editReply({ embeds: [embed] });
  },
};
