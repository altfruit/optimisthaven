# Optimist Haven

A small Discord bot with basic moderation commands.

## Setup

1. Install Node.js 18.17 or newer.
2. Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
3. Enable the **Message Content Intent** for the bot.
4. Enable the **Server Members Intent** for welcome messages.
5. Copy `.env.example` to `.env` and set the bot token, application ID, and test server ID.
6. Invite the bot with the `bot` and `applications.commands` scopes and the permissions it needs.
7. Install dependencies and start the bot:

```sh
npm install
npm start
```

## Render

The repository includes `render.yaml` for a Render background worker. Create a new Blueprint on Render, select this repository, and enter `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` when prompted. Render background workers use the Starter plan.

## FadeHost

The repository also includes a `Dockerfile` for FadeHost or any Docker-compatible hosting panel:

1. Create a Node.js/Docker server on FadeHost and connect the GitHub repository, or upload the project files.
2. Use the repository `Dockerfile` as the startup configuration. If FadeHost asks for a command instead, use `npm ci --omit=dev && npm start`.
3. Add these environment variables in the FadeHost panel: `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
4. Enable automatic deploys or restart-on-failure in FadeHost.
5. Deploy or restart the server and check the console for `is online.`.

Do not upload `.env` or paste the Discord token into GitHub. The bot must be kept running as a worker process; it does not need an HTTP port.
## Commands

- `/kick member reason?`
- `/ban member reason?`
- `/timeout member minutes reason?`
- `/clear amount`
- `/setup` opens a dropdown embed for the Welcome-, Log- and Moderationskanal and the Moderator-, Supervisor- and Admin-Rolle.

Messages in channels whose name starts with `ticket` receive an automatic response (with a 30-second cooldown per channel). Staff can send `!stop` in that ticket to disable the automatic response for that channel.

When someone says `Can I speak with Mariah`, the bot replies that Mariah is unavailable and offers help here.