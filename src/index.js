require('dotenv').config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  RoleSelectMenuBuilder,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const requiredEnvironment = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
const configDirectory = path.join(__dirname, '..', 'data');
const configPath = path.join(configDirectory, 'guild-config.json');

if (missingEnvironment.length > 0) {
  throw new Error(`Missing environment variables: ${missingEnvironment.join(', ')}`);
}

function loadGuildConfig() {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveGuildConfig(config) {
  fs.mkdirSync(configDirectory, { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function getGuildConfig(guildId) {
  const config = loadGuildConfig();
  return config[guildId] || {};
}

function hasStaffAccess(interaction) {
  const guildConfig = getGuildConfig(interaction.guildId);
  return interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    || (guildConfig.adminRoleId && interaction.member.roles.cache.has(guildConfig.adminRoleId));
}

function setupEmbed(guildId) {
  const guildConfig = getGuildConfig(guildId);
  const channel = (id) => id ? `<#${id}>` : 'Noch nicht gesetzt';
  const role = (id) => id ? `<@&${id}>` : 'Noch nicht gesetzt';

  return new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('Optimist Haven Setup')
    .setDescription('Wähle unten die Kanäle und Staff-Rollen für diesen Server aus.')
    .addFields(
      { name: 'Welcome-Kanal', value: channel(guildConfig.welcomeChannelId), inline: true },
      { name: 'Log-Kanal', value: channel(guildConfig.logChannelId), inline: true },
      { name: 'Moderations-Kanal', value: channel(guildConfig.moderationChannelId), inline: true },
      { name: 'Moderator-Rolle', value: role(guildConfig.moderatorRoleId), inline: true },
      { name: 'Supervisor-Rolle', value: role(guildConfig.supervisorRoleId), inline: true },
      { name: 'Admin-Rolle', value: role(guildConfig.adminRoleId), inline: true },
    )
    .setFooter({ text: 'Nur Administratoren und die konfigurierte Admin-Rolle können das Setup ändern.' });
}

function channelSetupComponents() {
  const channelSelect = (id, placeholder) => new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1)
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
  );
  return [
    channelSelect('setup:welcome-channel', 'Welcome-Kanal auswählen'),
    channelSelect('setup:log-channel', 'Log-Kanal auswählen'),
    channelSelect('setup:moderation-channel', 'Moderations-Kanal auswählen'),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('setup:staff')
        .setLabel('Staff-Rollen konfigurieren')
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

function roleSetupComponents() {
  const roleSelect = (id, placeholder) => new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1),
  );

  return [
    roleSelect('setup:moderator-role', 'Moderator-Rolle auswählen'),
    roleSelect('setup:supervisor-role', 'Supervisor-Rolle auswählen'),
    roleSelect('setup:admin-role', 'Admin-Rolle auswählen'),
  ];
}

const commands = [
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server.')
    .addUserOption((option) => option.setName('member').setDescription('Member to kick').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server.')
    .addUserOption((option) => option.setName('member').setDescription('Member to ban').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for the ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Times out a member for up to 28 days.')
    .addUserOption((option) => option.setName('member').setDescription('Member to time out').setRequired(true))
    .addIntegerOption((option) => option
      .setName('minutes')
      .setDescription('Timeout length in minutes')
      .setMinValue(1)
      .setMaxValue(40320)
      .setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for the timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes recent messages in this channel.')
    .addIntegerOption((option) => option
      .setName('amount')
      .setDescription('Number of messages to delete')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Konfiguriert Kanäle und Staff-Rollen für Optimist Haven.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((command) => command.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );
  console.log('Registered Optimist Haven moderation commands.');
}

client.once('ready', (readyClient) => {
  console.log(`${readyClient.user.tag} is online.`);
});

client.on('guildMemberAdd', async (member) => {
  const welcomeChannelId = getGuildConfig(member.guild.id).welcomeChannelId;
  const welcomeChannel = welcomeChannelId && member.guild.channels.cache.get(welcomeChannelId);
  if (welcomeChannel?.isTextBased()) {
    await welcomeChannel.send(`Willkommen auf Optimist Haven, ${member}!`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim().toLowerCase() === 'can i speak with mariah') {
    await message.reply('Mariah is not available right now, but I can help you here.');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;

  if (interaction.isButton() && interaction.customId === 'setup:staff') {
    if (!hasStaffAccess(interaction)) {
      await interaction.reply({ content: 'Nur Administratoren oder die konfigurierte Admin-Rolle können das Setup ändern.', ephemeral: true });
      return;
    }
    await interaction.reply({
      embeds: [setupEmbed(interaction.guildId).setTitle('Optimist Haven Staff-Rollen')],
      components: roleSetupComponents(),
      ephemeral: true,
    });
    return;
  }

  if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
    if (!interaction.customId.startsWith('setup:')) return;
    if (!hasStaffAccess(interaction)) {
      await interaction.reply({ content: 'Nur Administratoren oder die konfigurierte Admin-Rolle können das Setup ändern.', ephemeral: true });
      return;
    }

    const config = loadGuildConfig();
    config[interaction.guildId] = config[interaction.guildId] || {};
    const selectedId = interaction.values[0];
    const settingByCustomId = {
      'setup:welcome-channel': 'welcomeChannelId',
      'setup:log-channel': 'logChannelId',
      'setup:moderation-channel': 'moderationChannelId',
      'setup:moderator-role': 'moderatorRoleId',
      'setup:supervisor-role': 'supervisorRoleId',
      'setup:admin-role': 'adminRoleId',
    };
    config[interaction.guildId][settingByCustomId[interaction.customId]] = selectedId;
    saveGuildConfig(config);
    await interaction.update({
      embeds: [setupEmbed(interaction.guildId)],
      components: interaction.customId.includes('role') ? roleSetupComponents() : channelSetupComponents(),
    });
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setup') {
    if (!hasStaffAccess(interaction)) {
      await interaction.reply({ content: 'Nur Administratoren oder die konfigurierte Admin-Rolle können das Setup öffnen.', ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [setupEmbed(interaction.guildId)], components: channelSetupComponents() });
    return;
  }

  const member = interaction.options.getMember('member');
  const reason = interaction.options.getString('reason') || `Action by ${interaction.user.tag}`;

  try {
    if (interaction.commandName === 'kick') {
      await member.kick(reason);
      await interaction.reply(`Kicked ${member.user.tag}. Reason: ${reason}`);
    } else if (interaction.commandName === 'ban') {
      await member.ban({ reason });
      await interaction.reply(`Banned ${member.user.tag}. Reason: ${reason}`);
    } else if (interaction.commandName === 'timeout') {
      const minutes = interaction.options.getInteger('minutes');
      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.reply(`Timed out ${member.user.tag} for ${minutes} minutes. Reason: ${reason}`);
    } else if (interaction.commandName === 'clear') {
      const amount = interaction.options.getInteger('amount');
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ content: `Deleted ${deleted.size} messages.`, ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    const reply = { content: 'I could not complete that moderation action. Check my permissions and the target role hierarchy.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
    else await interaction.reply(reply);
  }
});

registerCommands()
  .then(() => client.login(process.env.DISCORD_TOKEN))
  .catch((error) => {
    console.error('Startup failed:', error);
    process.exitCode = 1;
  });