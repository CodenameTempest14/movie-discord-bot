const { makeStatusCommand } = require('../status-command');

module.exports = makeStatusCommand({
  name: 'unwatched',
  description: 'Move this movie post back to To Watch or Coming Soon (use inside a movie post)',
  resolveStatus: async (movie, { getMovieDetails, statusTag }) => {
    const details = await getMovieDetails(movie.tmdbId);
    return statusTag(details.release_date);
  },
  doneText: (status) => `↩️ Marked as **${status}**.`,
});
