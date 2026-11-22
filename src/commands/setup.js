const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { missingTags, REQUIRED_TAGS } = require('../movie-logic');

// What the bot needs in the forum channel to create posts and change their tags.
const NEEDED = [
  ['ViewChannel', 'View Channel'],
  ['SendMessages', 'Create Posts'],
  ['SendMessagesInThreads', 'Send Messages in Posts'],
  ['AttachFiles', 'Attach Files'],
  ['ManageThreads', 'Manage Posts'],
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Choose the movie forum channel and who may add movies')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(0) // guild only
    .addChannelOption((o) =>
      o.setName('forum').setDescription('The movie forum channel').addChannelTypes(ChannelType.GuildForum).setRequired(true),
    )
    .addRoleOption((o) => o.setName('role1').setDescription('Role allowed to add movies (e.g. Admin)').setRequired(true))
    .addRoleOption((o) => o.setName('role2').setDescription('Another allowed role (e.g. Vice-Admin)')),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const forum = await interaction.guild.channels.fetch(interaction.options.getChannel('forum', true).id);
    const roleIds = [
      ...new Set([interaction.options.getRole('role1', true).id, interaction.options.getRole('role2')?.id].filter(Boolean)),
    ];

    interaction.client.db.saveSettings(interaction.guildId, { forumChannelId: forum.id, roleIds });

    const problems = [];
    const noTags = missingTags(forum.availableTags);
    if (noTags.length) problems.push(`Missing forum tags: ${noTags.map((t) => `**${t}**`).join(', ')} (needed: ${REQUIRED_TAGS.join(', ')}).`);

    const perms = forum.permissionsFor(interaction.guild.members.me);
    const noPerms = NEEDED.filter(([flag]) => !perms.has(PermissionFlagsBits[flag])).map(([, label]) => `**${label}**`);
    if (noPerms.length) problems.push(`The bot lacks these permissions in ${forum}: ${noPerms.join(', ')}.`);

    const lines = [
      `Saved. Movie forum: ${forum}. Allowed roles: ${roleIds.map((id) => `<@&${id}>`).join(', ')} (plus server administrators).`,
      ...(problems.length ? ['', '⚠️ Fix these, then movies can be added:', ...problems.map((p) => `• ${p}`)] : ['', '✅ Tags and permissions look good.']),
    ];
    await interaction.editReply({ content: lines.join('\n'), allowedMentions: { parse: [] } });
  },
};
