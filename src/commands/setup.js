const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { missingTags, REQUIRED_TAGS } = require('../movie-logic');
const { isValidTimezone } = require('../movienight-logic');

// What the bot needs in the announcement channel to post polls and reminders.
const ANNOUNCE_NEEDED = [
  ['ViewChannel', 'View Channel'],
  ['SendMessages', 'Send Messages'],
  ['EmbedLinks', 'Embed Links'],
];

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
    .addRoleOption((o) => o.setName('role2').setDescription('Another allowed role (e.g. Vice-Admin)'))
    .addChannelOption((o) =>
      o
        .setName('announce_channel')
        .setDescription('Text channel for movie night polls and reminders')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addStringOption((o) =>
      o.setName('timezone').setDescription('Server timezone for movie nights, e.g. America/New_York').setMaxLength(64),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Check the timezone before saving anything, so a typo does not leave half the settings changed.
    const timezone = interaction.options.getString('timezone');
    if (timezone !== null && !isValidTimezone(timezone)) {
      await interaction.editReply(
        `"${timezone}" is not a timezone I know. Use a name like \`America/New_York\`, \`Europe/London\` or \`Asia/Manila\` (no spaces).`,
      );
      return;
    }

    const forum = await interaction.guild.channels.fetch(interaction.options.getChannel('forum', true).id);
    const roleIds = [
      ...new Set([interaction.options.getRole('role1', true).id, interaction.options.getRole('role2')?.id].filter(Boolean)),
    ];

    interaction.client.db.saveSettings(interaction.guildId, { forumChannelId: forum.id, roleIds });

    // Movie night settings are optional here; leaving them out keeps whatever was saved before.
    const announceOption = interaction.options.getChannel('announce_channel');
    const announce = announceOption ? await interaction.guild.channels.fetch(announceOption.id) : null;
    interaction.client.db.saveMovieNightSettings(interaction.guildId, {
      announceChannelId: announce?.id ?? null,
      timezone,
    });
    const saved = interaction.client.db.getSettings(interaction.guildId);

    const problems = [];
    if (announce) {
      const announcePerms = announce.permissionsFor(interaction.guild.members.me);
      const noAnnounce = ANNOUNCE_NEEDED.filter(([flag]) => !announcePerms.has(PermissionFlagsBits[flag])).map(([, label]) => `**${label}**`);
      if (noAnnounce.length) problems.push(`The bot lacks these permissions in ${announce}: ${noAnnounce.join(', ')}.`);
    }
    const noTags = missingTags(forum.availableTags);
    if (noTags.length) problems.push(`Missing forum tags: ${noTags.map((t) => `**${t}**`).join(', ')} (needed: ${REQUIRED_TAGS.join(', ')}).`);

    const perms = forum.permissionsFor(interaction.guild.members.me);
    const noPerms = NEEDED.filter(([flag]) => !perms.has(PermissionFlagsBits[flag])).map(([, label]) => `**${label}**`);
    if (noPerms.length) problems.push(`The bot lacks these permissions in ${forum}: ${noPerms.join(', ')}.`);

    const lines = [
      `Saved. Movie forum: ${forum}. Allowed roles: ${roleIds.map((id) => `<@&${id}>`).join(', ')} (plus server administrators).`,
      `Movie night: announcements in ${saved.announceChannelId ? `<#${saved.announceChannelId}>` : '**not set yet**'}, timezone ${saved.timezone ? `**${saved.timezone}**` : '**not set yet**'}.`,
      ...(problems.length ? ['', '⚠️ Fix these, then movies can be added:', ...problems.map((p) => `• ${p}`)] : ['', '✅ Tags and permissions look good.']),
    ];
    await interaction.editReply({ content: lines.join('\n'), allowedMentions: { parse: [] } });
  },
};
