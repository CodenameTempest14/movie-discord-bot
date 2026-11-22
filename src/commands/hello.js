const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello')
    .addUserOption((o) => o.setName('user').setDescription('Who to greet')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    await interaction.reply(`Hello, ${user}! 👋`);
  },
};
