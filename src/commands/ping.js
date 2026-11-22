const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot latency'),
  async execute(interaction) {
    const { resource } = await interaction.reply({ content: 'Pinging...', withResponse: true });
    const rtt = resource.message.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Round trip: ${rtt}ms | WebSocket: ${interaction.client.ws.ping}ms`);
  },
};
