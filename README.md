# Optimist Haven

A small Discord bot with basic moderation commands.

## Setup

1. Install Node.js 18.17 or newer.
2. Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
3. Enable the **Message Content Intent** for the bot.
4. Copy `.env.example` to `.env` and set the bot token, application ID, and test server ID.
5. Invite the bot with the `bot` and `applications.commands` scopes and the permissions it needs.
6. Install dependencies and start the bot:

```sh
npm install
npm start
```

## Commands

- `/kick member reason?`
- `/ban member reason?`
- `/timeout member minutes reason?`
- `/clear amount`

When someone says `Can I speak with Mariah`, the bot replies that Mariah is unavailable and offers help here.