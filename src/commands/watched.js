const { makeStatusCommand } = require('../status-command');

module.exports = makeStatusCommand({
  name: 'watched',
  description: 'Mark this movie post as watched (use inside a movie post)',
  resolveStatus: async () => 'Watched',
  doneText: () => '✅ Marked as **Watched**.',
});
