import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sharp from 'sharp';
import fetch from 'node-fetch';
import express from 'express';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add logging utility at the top
const logger = {
  info: (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO:`, ...args);
  },
  error: (...args) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR:`, ...args);
  }
};

// Bot configuration
const BOT_TOKEN = '8086833979:AAEcLny1Ilz0Uwdv6a_Hl073IJlc58YgsPM';
const GEMINI_KEY = 'AIzaSyDupj63frb_4b5RNDBI1B-_TzeQnDoAcJU';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const MODEL_NAME = "gemini-1.5-flash";
const MODEL_NAME_VISION = "gemini-1.5-flash"; // Using same model for vision as web version
const ADMIN_ID = 6135009699;
const GROUP_PREVIEW_IMAGE = "https://i.ibb.co.com/grMFYG6/4245e66b-d27f-40f9-80d1-7bbaf1108a8d.jpg";
const GROUP_LINKS = {
  group1: "https://t.me/+SpL6wJ5_4MVhZDll",
  group2: "https://t.me/+HtfDVNyNaPcxNWVl"
};

const SYSTEM_PROMPT = `System Definition:
You are a friendly Bangladeshi membership assistant. Use natural Banglish, but keep responses concise and clear. Cost is 100 Taka monthly for premium groups.

Key Behaviors:
• Use minimal emojis (1 per message maximum)
• Keep responses short but helpful
• Be casual
• Vary your responses naturally
• Don't be robotic or over-enthusiastic

Payment Details:
Personal Numbers (Send Money Only):
• Bkash: 01779335569
• Nagad: 01744136943

Rules:
• Share numbers only when asked
• make sure payment is from Bkash or Nagad
• Mention they're personal numbers
• Don't share group links
• Emphasize Send Money option
• Share one number at a time

Common Scenarios & Responses:

1. Content Questions:
Q: "[Name] er video ase?"
A: "Ji ache bhaiya, premium e available. Payment confirm hole dekhte parben"

Q: "New content ase?"
A: "Regular update hoy bhaiya. Interest thakle number diye dei?"

2. Payment:
Q: "Bkash number"
A: "Personal number: 01779335569. Send Money option e pathaben"

Q: "Payment korbo"
A: "Ok, Send Money e 100tk pathaben. Merchant na. Done hole ss den"

3. Screenshots:
- Wrong Type: "Bhaiya eta merchant payment er ss. Personal number e Send Money korte hobe"
- Unclear: "Screenshot ta clear na. Amount/number dekha jacche na"
- Success: "Done! Ei nen group links. Join request diye rakhen"

4. Group Join:
Q: "Request dilam"
A: "Ok, admin approve kore nibe"

Q: "Koto time lagbe?"
A: "Admin online hole approve korbe. Exact time bolta parbo na"

5. Common Issues:
Q: "Link kaj kore na"
A: "Check kori... Abar try koren, notun link dorkar hole bolen"

Q: "Add hocche na"
A: "Admin approve korle auto add hobe. Wait koren"

Error Handling:
• For unclear screenshots: Explain exactly what's wrong
• For wrong payment type: Guide to correct method
• For technical issues: Provide clear next steps

Remember:
• Use natural Banglish
• Keep responses brief but clear
• Use minimal emojis
• Be helpful but not over-friendly
• Maintain professional tone
• Give clear instructions

Payment Verification:
• Must be Send Money screenshot
• Amount 100+ taka
• Correct number
• Clear transaction details`;

// Rate limiting and queue management
const API_LIMIT = 7; // Reduced from 10 to be more conservative
const QUEUE_TIMEOUT = 60000; // 1 minute in milliseconds
const CONVERSATION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute window for rate limiting
const MIN_DELAY_BETWEEN_CALLS = 4000; // 4 seconds minimum between calls
const MAX_PENDING_MESSAGES = 2; // Maximum pending messages per chat

// API call tracking
const apiCalls = {
  count: 0,
  lastResetTime: Date.now(),
  lastCallTime: Date.now(),
  history: [], // Track timestamps of API calls
  
  // Add new API call
  addCall() {
    const now = Date.now();
    this.count++;
    this.lastCallTime = now;
    this.history.push(now);
    
    // Remove old calls from history
    const windowStart = now - RATE_LIMIT_WINDOW;
    this.history = this.history.filter(time => time > windowStart);
  },
  
  // Check if we can make a new call
  canMakeCall() {
    const now = Date.now();
    
    // Clean up old history
    const windowStart = now - RATE_LIMIT_WINDOW;
    this.history = this.history.filter(time => time > windowStart);
    
    // Check minimum delay
    if (now - this.lastCallTime < MIN_DELAY_BETWEEN_CALLS) {
      return false;
    }
    
    // Check if we're within limits
    return this.history.length < API_LIMIT;
  },
  
  // Get wait time if needed
  getWaitTime() {
    const now = Date.now();
    if (this.history.length === 0) return MIN_DELAY_BETWEEN_CALLS;
    
    // If we've hit the limit, calculate wait time until oldest call expires
    if (this.history.length >= API_LIMIT) {
      return (this.history[0] + RATE_LIMIT_WINDOW) - now;
    }
    
    // Ensure minimum delay between calls
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < MIN_DELAY_BETWEEN_CALLS) {
      return MIN_DELAY_BETWEEN_CALLS - timeSinceLastCall;
    }
    
    return MIN_DELAY_BETWEEN_CALLS;
  }
};

const messageQueue = [];
let isProcessing = false;

async function addToMessageQueue({ chatId, userMessage, priority }) {
  messageQueue.push({
    chatId,
    userMessage,
    priority,
    timestamp: Date.now()
  });

  if (!isProcessing) {
    processQueue();
  }
}

async function processQueue() {
  if (messageQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;

  try {
    const { chatId, userMessage } = messageQueue[0];
    const session = await sessionManager.getSession(chatId);

    if (!session || !session.chat) {
      messageQueue.shift();
      return;
    }

    try {
      const result = await session.chat.sendMessage(userMessage);
      const response = await result.response;
      session.lastActivity = new Date();
      
      // Update and save conversation history
      await sessionManager.updateHistory(chatId, userMessage, response.text());
      
      // Send response to user
      await bot.sendMessage(chatId, response.text());
    } catch (error) {
      logger.error('Error processing message:', error);
      if (error.message?.includes('quota')) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW));
        messageQueue.push(messageQueue.shift());
        return;
      }
    } finally {
      session.pendingMessages--;
      messageQueue.shift();
    }

    // Force delay between processing messages
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_BETWEEN_CALLS));
    
    // Process next message
    processQueue();
  } catch (error) {
    logger.error('Queue processing error:', error);
    messageQueue.shift();
    processQueue();
  }
}

// Session storage path
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Session manager with persistent storage
const sessionManager = {
  sessions: new Map(),
  
  // Load sessions from file
  loadSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        Object.entries(data).forEach(([chatId, session]) => {
          // Create default history if none exists
          const defaultHistory = [
            {
              role: "user",
              parts: "Hi, what services do you offer?"
            },
            {
              role: "model",
              parts: SYSTEM_PROMPT
            }
          ];

          // Ensure history is in correct format
          let history = defaultHistory;
          if (session.geminiHistory && Array.isArray(session.geminiHistory)) {
            history = session.geminiHistory;
          }

          try {
            // Create new chat instance with validated history
            const chat = genAI.getGenerativeModel({ model: MODEL_NAME }).startChat({
              history: history
            });
            
            // Create session with proper Date object and history
            this.sessions.set(parseInt(chatId), {
              chat,
              verified: Boolean(session.verified),
              paymentDiscussed: Boolean(session.paymentDiscussed),
              lastActivity: new Date(session.lastActivity || Date.now()),
              geminiHistory: history,
              pendingMessages: 0,
              isProcessing: false // Add processing state
            });
            
            logger.info(`Loaded session for chat ${chatId} with ${history.length} messages`);
          } catch (error) {
            logger.error(`Error creating chat for session ${chatId}:`, error);
            // Create new session with default history if loading fails
            const newChat = genAI.getGenerativeModel({ model: MODEL_NAME }).startChat({
              history: defaultHistory
            });
            
            this.sessions.set(parseInt(chatId), {
              chat: newChat,
              verified: Boolean(session.verified),
              paymentDiscussed: Boolean(session.paymentDiscussed),
              lastActivity: new Date(session.lastActivity || Date.now()),
              geminiHistory: defaultHistory,
              pendingMessages: 0,
              isProcessing: false // Add processing state
            });
            
            logger.info(`Created new session for chat ${chatId} with default history`);
          }
        });
      }
    } catch (error) {
      logger.error('Error loading sessions:', error);
    }
  },

  // Save sessions to file
  saveSessions() {
    try {
      const data = {};
      this.sessions.forEach((session, chatId) => {
        // Ensure lastActivity is a Date object
        const lastActivity = session.lastActivity instanceof Date 
          ? session.lastActivity 
          : new Date(session.lastActivity || Date.now());

        // Get current chat history
        let geminiHistory = [];
        try {
          geminiHistory = session.chat?.getHistory() || [];
        } catch (error) {
          logger.error(`Error getting chat history for ${chatId}:`, error);
        }

        // Convert the session to a serializable format
        const serializedSession = {
          verified: Boolean(session.verified),
          paymentDiscussed: Boolean(session.paymentDiscussed),
          lastActivity: lastActivity.toISOString(),
          geminiHistory: geminiHistory,
          isProcessing: Boolean(session.isProcessing) // Add processing state
        };
        data[chatId] = serializedSession;
      });
      
      // Pretty print JSON for readability
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
      logger.info('Sessions saved successfully');
    } catch (error) {
      logger.error('Error saving sessions:', error);
    }
  },

  // Get session with automatic loading
  async getSession(chatId) {
    let session = this.sessions.get(chatId);
    
    if (!session) {
      // Try to load from persistent storage first
      this.loadSessions();
      session = this.sessions.get(chatId);
    }
    
    if (session) {
      // Ensure lastActivity is a Date object
      if (!(session.lastActivity instanceof Date)) {
        session.lastActivity = new Date(session.lastActivity || Date.now());
      }
      
      // Check if session is expired
      const now = new Date();
      if (now - session.lastActivity > CONVERSATION_TIMEOUT) {
        this.sessions.delete(chatId);
        return null;
      }
      
      session.lastActivity = now;
      return session;
    }
    return null;
  },

  // Create new session
  async createSession(chatId) {
    // Initialize with system prompt
    const initialHistory = [
      {
        role: "user",
        parts: "Hi, what services do you offer?"
      },
      {
        role: "model",
        parts: SYSTEM_PROMPT
      }
    ];

    const chat = genAI.getGenerativeModel({ model: MODEL_NAME }).startChat({
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      history: initialHistory
    });

    const session = {
      chat,
      verified: false,
      paymentDiscussed: false,
      lastActivity: new Date(),
      geminiHistory: initialHistory,
      pendingMessages: 0,
      isProcessing: false // Add processing state
    };

    this.sessions.set(chatId, session);
    
    try {
      await this.saveSessions();
      logger.info(`Created new session for chat ${chatId}`);
    } catch (error) {
      logger.error(`Error saving new session for chat ${chatId}:`, error);
    }
    
    return session;
  },

  // Update conversation history
  async updateHistory(chatId, userMessage, botResponse) {
    const session = this.sessions.get(chatId);
    if (session) {
      try {
        // Get updated history after the new message
        session.geminiHistory = session.chat?.getHistory() || [];
        await this.saveSessions();
      } catch (error) {
        logger.error(`Error updating history for chat ${chatId}:`, error);
      }
    }
  }
};

// Initialize sessions on startup
sessionManager.loadSessions();

// Modified message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  // Skip if it's a command or photo
  if (msg.text?.startsWith('/') || msg.photo) return;

  try {
    const session = await sessionManager.getSession(chatId);
    
    // Check for demo request
    const text = msg.text.toLowerCase();
    if (text.includes('demo') || text.includes('preview') || text.includes('sample') || 
        text.includes('dekhan') || text.includes('dekan') || text.includes('demo den')) {
      await bot.sendPhoto(chatId, GROUP_PREVIEW_IMAGE, {
        caption: "Premium group er demo. Full access er jonno payment koren 😊\n\nRate: 100 Taka (Monthly)"
      });
      return;
    }

    // If message queue is too long, ask user to wait
    if (session.pendingMessages > MAX_PENDING_MESSAGES) {
      await bot.sendMessage(chatId, 'Ektu slow response dicchi, queue full. Please wait...');
      return;
    }

    const chat = session.chat;
    if (!chat) {
      logger.error(`No chat instance found for session ${chatId}`);
      return;
    }

    session.pendingMessages++;
    
    // Add message to queue
    addToMessageQueue({
      chatId,
      userMessage: msg.text,
      priority: session.pendingMessages
    });

  } catch (error) {
    logger.error('Error in message handler:', error);
    await bot.sendMessage(chatId, 'Technical problem hocche. Please try again...');
  }
});

// Start command with random welcome message
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await sessionManager.createSession(chatId);
    await bot.sendMessage(chatId, "Assalamu alaikum! Premium membership niye help korbo. Ki help lagbe bolen 🙂");
  } catch (error) {
    logger.error('Error in start command:', error);
    await bot.sendMessage(chatId, 'Technical problem hocche. amader admin @fattasuck er sathe kotha bolen ami ektu issue face korchi');
  }
});

// Modified payment screenshot handler
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  let session = await sessionManager.getSession(chatId);
  
  if (session.isProcessing) {
    await bot.sendMessage(chatId, "Apnar ss process kortesi, ektu wait koren... 🔄");
    return;
  }

  try {
    session.isProcessing = true; // Set processing state
    await sessionManager.saveSessions();

    await bot.sendMessage(chatId, "Screenshot check kortesi, ektu wait koren... 🔄");

    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const filePath = file.file_path;

    // Download image
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const arrayBuffer = await imageResponse.arrayBuffer();

    // Process with Sharp
    const processedBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize(800, null, { fit: 'inside' })
      .toBuffer();

    // Convert to base64
    const base64Image = Buffer.from(processedBuffer).toString('base64');

    // Vision API processing
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME_VISION });

    const prompt = `You are a payment verification assistant for a Bangladeshi service. Analyze this bKash/Nagad payment screenshot and verify:

1. Is this a Send Money transaction? (not merchant payment)
2. Is the amount 100 taka or more?
3. Are the transaction details clear and visible?
4. Is the date/time visible?

Important: Focus mainly on verifying if it's a Send Money transaction with 100+ taka. Don't strictly verify the phone number.

Respond with ONLY "VALID" or "INVALID" followed by a brief reason.
Examples:
"VALID: Send Money transaction, 100tk paid, clear details"
"INVALID: Merchant payment instead of Send Money"
"INVALID: Amount less than 100tk"
"INVALID: Unclear screenshot/details not visible"`;

    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        }
      ]);

      const aiResponse = await result.response;
      const text = aiResponse.text().toLowerCase();

      if (text.startsWith('valid')) {
        session.verified = true;
        
        // Send group links immediately
        await bot.sendMessage(chatId, "Perfect! Payment confirm hoise. Group links gula pathacchi...");
        await bot.sendMessage(chatId, `Group 1: ${GROUP_LINKS.group1}\nGroup 2: ${GROUP_LINKS.group2}`);
        await bot.sendMessage(chatId, "Join request diye rakhen, admin approve kore nibe 😊");
        
        // Send payment notification to admin with buttons
        const adminMsg = `New Payment Received!\n\n` +
                      `User: ${msg.from.first_name} ${msg.from.last_name || ''}\n` +
                      `Username: @${msg.from.username || 'No username'}\n` +
                      `User ID: ${msg.from.id}\n` +
                      `Chat ID: ${chatId}\n\n` +
                      `Please verify and choose action:`;
        
        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve_${chatId}` },
              { text: '❌ Reject', callback_data: `reject_${chatId}` }
            ]
          ]
        };
        
        // Forward screenshot to admin
        await bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);
        
        // Send admin notification with buttons
        await bot.sendMessage(ADMIN_ID, adminMsg, { reply_markup: keyboard });
        
      } else {
        const reason = text.split(':')[1]?.trim() || 'Screenshot thik moto verify kora jacche na';
        await bot.sendMessage(chatId, `Sorry bhai, payment verify korte parini. Reason: ${reason}. Arekta clear screenshot den.`);
      }
    } catch (error) {
      logger.error('Gemini API Error:', error);
      if (error.message?.includes('deprecated')) {
        await bot.sendMessage(chatId, "System update hocche. Please admin @fattasuck er sathe contact korun.");
      } else {
        await bot.sendMessage(chatId, "Screenshot verify korte problem hocche. Arektu pore abar try koren, or admin @fattasuck er sathe contact korun.");
      }
      throw error; // Re-throw to be caught by outer catch block
    }

  } catch (error) {
    logger.error('Error processing screenshot:', error);
    await bot.sendMessage(chatId, "Technical problem hocche. Screenshot abar try koren, or admin @fattasuck er sathe contact korun.");
  } finally {
    session.isProcessing = false; // Reset processing state
    await sessionManager.saveSessions();
  }
});

// Process payment screenshot function
async function processPaymentScreenshot(image) {
  const handler = async () => {
    try {
      logger.info('Starting payment screenshot analysis');
      const model = genAI.getGenerativeModel({ model: MODEL_NAME_VISION });
      
      if (!image) {
        logger.error('No image data received');
        return false;
      }

      // Convert image to base64 if it's not already
      let base64Data = image;
      if (image.includes('base64,')) {
        base64Data = image.split('base64,')[1];
      }

      logger.info('Sending to Gemini Vision API for analysis');
      const result = await model.generateContent([
        {
          text: "You are a payment verification assistant. Your task is to verify if this is a valid payment screenshot:\n1. Check if it's from bKash or Nagad\n2. Find the payment amount\n3. Verify if amount is 100 or more\n4. Are transaction details clear and visible?\n5. Is the date/time visible?\n\nIf it's a valid bKash/Nagad payment of 100+ taka, say 'VALID'. Otherwise, say 'INVALID' and explain why."
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        }
      ]);

      const response = await result.response;
      const text = response.text().toLowerCase();
      logger.info('Gemini Vision API response:', text);
      return text.includes('valid');
    } catch (error) {
      logger.error('Error in payment screenshot analysis:', error);
      return false;
    }
  };

  return await addToMessageQueue({ 
    handler, 
    priority: 1, // High priority for payment processing
    timestamp: Date.now() 
  });
}

// Download image function
async function downloadImage(fileId, chatId) {
  try {
    logger.info('Downloading and processing image');
    const file = await bot.getFile(fileId);
    const filePath = file.file_path;
    const response = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Process image with sharp to ensure JPEG format and reasonable size
    const processedBuffer = await sharp(buffer)
      .jpeg({ quality: 80 })
      .resize(800, 800, { fit: 'inside' }) // Resize if too large
      .toBuffer();
    
    logger.info('Image processed successfully');
    return processedBuffer.toString('base64');
  } catch (error) {
    logger.error('Error processing image:', error);
    return null;
  }
}

// Handle admin callback queries (button clicks)
bot.on('callback_query', async (query) => {
  const adminId = query.from.id;
  
  // Only allow admin to use these buttons
  if (adminId !== ADMIN_ID) {
    await bot.answerCallbackQuery(query.id, { text: 'You are not authorized!' });
    return;
  }

  const action = query.data.split('_')[0];
  const userChatId = query.data.split('_')[1];
  const session = await sessionManager.getSession(userChatId);

  if (action === 'approve') {
    // Notify user of approval
    await bot.sendMessage(userChatId, "Admin payment verify koreche. Enjoy premium content! 🎉");
    
    // Update admin message
    await bot.editMessageText(
      `✅ Payment Approved!\n\nUser: @${query.message.text.split('@')[1]?.split('\n')[0]}`,
      {
        chat_id: ADMIN_ID,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: [] }
      }
    );
  } else if (action === 'reject') {
    // Reset verification status
    session.verified = false;
    await sessionManager.saveSessions();
    
    // Notify user
    await bot.sendMessage(userChatId, "Sorry! Payment verify hoy nai. Please contact admin @fattasuck");
    
    // Update admin message
    await bot.editMessageText(
      `❌ Payment Rejected!\n\nUser: @${query.message.text.split('@')[1]?.split('\n')[0]}`,
      {
        chat_id: ADMIN_ID,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: [] }
      }
    );
  }

  await bot.answerCallbackQuery(query.id);
});

// Create Express app for health check
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Start Express server
app.listen(PORT, () => {
  logger.info(`Health check server listening on port ${PORT}`);
});

logger.info('Bot started successfully!');
