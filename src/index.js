require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const requiredEnvironment = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length > 0) {
  throw new Error(`Missing environment variables: ${missingEnvironment.join(', ')}`);
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
].map((command) => command.toJSON());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim().toLowerCase() === 'can i speak with mariah') {
    await message.reply('Mariah is not available right now, but I can help you here.');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || !interaction.guild) return;

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