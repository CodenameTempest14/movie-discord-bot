const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { discoverMovies } = require('../movie-api');
const {
  genreChoices,
  buildDiscoverParams,
  pickSuggestions,
  formatSuggestionList,
  DEFAULT_MIN_RATING,
} = require('../recommend-logic');

const TMDB_NOTICE = 'This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.';
const HOW_MANY = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Get movie suggestions by genre')
    .addIntegerOption((o) =>
      o.setName('genre').setDescription('Genre').setRequired(true).addChoices(...genreChoices()),
    )
    .addIntegerOption((o) =>
      o.setName('genre2').setDescription('Second genre (movies must match both)').addChoices(...genreChoices()),
    )
    .addNumberOption((o) =>
      o
        .setName('min_rating')
        .setDescription(`Minimum TMDB rating, 1-10 (default ${DEFAULT_MIN_RATING})`)
        .setMinValue(1)
        .setMaxValue(10),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const genre = interaction.options.getInteger('genre', true);
    const genre2 = interaction.options.getInteger('genre2');
    const minRating = interaction.options.getNumber('min_rating') ?? DEFAULT_MIN_RATING;

    // Re-checked here even though Discord limits the options: never trust input.
    let query;
    try {
      query = buildDiscoverParams({ genreIds: genre2 ? [genre, genre2] : [genre], minRating });
    } catch (err) {
      await interaction.editReply(err.message);
      return;
    }

    const picks = pickSuggestions(await discoverMovies(query), HOW_MANY);
    if (picks.length === 0) {
      await interaction.editReply('No movies matched. Try a lower `min_rating` or only one genre.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Movie suggestions')
      .setDescription(formatSuggestionList(picks))
      .setFooter({ text: TMDB_NOTICE });
    await interaction.editReply({ embeds: [embed] });
  },
};
