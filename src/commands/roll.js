const { SlashCommandBuilder } = require('discord.js');
const { rollDie } = require('../roll-logic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a die')
    .addIntegerOption((o) =>
      o.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(1000),
    ),
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') ?? 6;
    const result = rollDie(sides);
    await interaction.reply(`🎲 You rolled a **${result}** (d${sides})`);
  },
};
