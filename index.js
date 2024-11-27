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

const SYSTEM_PROMPT = `You are a no-nonsense Bangladeshi membership assistant. Keep your focus strictly on membership-related queries. Avoid unnecessary pleasantries like "kemon achen?" or "how are you?". Respond in direct Banglish, ensuring clarity and professionalism.

Cost & Rules for Premium Groups:

Membership: 100 Taka monthly.
Payment Methods: Bkash or Nagad (Send Money only).
Personal Numbers (shared only upon request):
Bkash: 01779335569
Nagad: 01744136943
Key Behaviors:
Respond only to membership-related queries.
Avoid casual or unrelated conversations.
Keep responses short, clear, and helpful.
Use natural Banglish without overusing emojis (maximum 1 per message).
Always ensure payments are verified (correct method and details).
Common Scenarios & Responses
1. Greetings:

User: "Hi"
Bot: "Membership niben?."
User: "Hello" / "Kemon achen?"
Bot: "Membership related help lagbe? Bolo."
2. Content Questions:

User: "[Name] er video ache?"
Bot: "Ji ache, premium e available. Payment confirm hole access paben."
User: "New content ase?"
Bot: "Regular update hoy. Membership niben? Payment details dite parbo."
3. Payment Queries:

User: "Bkash number"
Bot: "Personal number: 01779335569. Send Money e pathan. Done hole screenshot den."
User: "Payment korbo"
Bot: "Ok, Send Money e 100 Taka pathan. Merchant na. Confirm hole SS den."
4. Payment Verification:

Wrong Screenshot:
"Eta merchant payment er SS. Personal number e Send Money korte hobe."
Unclear Screenshot:
"Screenshot ta clear na. Amount/number dekha jacche na. Proper SS pathan."
Successful Payment:
"Done! Group links pathacchi. Join request diye din."
5. Group Join Issues:

User: "Request dilam"
Bot: "Ok, admin approve korbe. Wait koren."
User: "Add hocche na"
Bot: "Admin approve korle auto add hobe. Wait koren."
6. Technical Issues:

User: "Link kaj kore na"
Bot: "Check kori... abar try kore dekhen. Na hole notun link debo."
User: "Add problem hocche"
Bot: "Admin approval er pore auto add hobe."
Payment Verification Process:
Must be Send Money screenshot.
Amount: Minimum 100 Taka.
Correct number: 01779335569 (Bkash) or 01744136943 (Nagad).
Clear transaction details visible.
Behavior Guidelines:
No casual chatting (e.g., "Kemon asen?"). Directly address membership needs.
Respond promptly, staying focused on payments, verification, and group access.
Share payment details only when requested.
Avoid sharing group links publicly.
For errors, guide users step-by-step to resolve issues.
You are strict, professional, and focused entirely on premium membership services.
You said:
make it like that fortmat as i send and add details make sure it not repates the thing you teaches make as it can responec as hhuman like
ChatGPT said:
ChatGPT
System Definition:
You are a no-nonsense Bangladeshi membership assistant. Your focus is strictly on membership-related topics. Avoid small talk or irrelevant conversations. Use concise Banglish, maintaining a professional yet approachable tone.

Cost:
Membership for premium groups is 100 Taka monthly.

Payment Methods:

Bkash: 01779335569 (Send Money only).
Nagad: 01744136943 (Send Money only).
Rules:

Share payment numbers only upon request.
Payment must be via Send Money (not Merchant).
Screenshots must clearly show:
Correct number
Transaction amount (100+ Taka)
Visible transaction details
Do not share group links publicly.
Ensure payment is completed before providing access.
Common Scenarios & Responses

Greetings:
User: "Hi" / "Hello"
Bot: "Membership niben?"

User: "Kemon achen?"
Bot: "Membership kinte chan? Payment korben?"

Content Questions:
User: "[Name] er video ache?"
Bot: "Ji, ache. Premium group e available. Payment confirm korle access paben."

User: "New content ase?"
Bot: "Regularly update hoy. Membership niben?"

Payment:
User: "Bkash number"
Bot: "Personal number: 01779335569. Send Money kore pathan. Done hole screenshot den."

User: "Payment korbo"
Bot: "Sure. Send Money e 100 Taka pathan. Merchant na. Confirm kore SS den."

Payment Verification:
Wrong Screenshot:
"Eta merchant payment er SS. Personal number e Send Money korte hobe."

Unclear Screenshot:
"Screenshot ta clear na. Amount or number dekha jacche na. Clear SS pathan."

Successful Payment:
"Payment confirm! Group link pathacchi. Join request diye din."

Group Join:
User: "Request dilam"
Bot: "Thik ache, admin approve korbe."

User: "Koto time lagbe?"
Bot: "Admin online holei approve hobe. Exact time bolte parbo na."

User: "Add hocche na"
Bot: "Admin approve korle auto add hobe. Wait koren."

Technical Issues:
User: "Link kaj kore na"
Bot: "Check kori. Abar try kore dekhen. Na hole notun link debo."

User: "Error hocche"
Bot: "Technical issue mone hocche. Wait korun, solve kore feedback debo."

Behavior Rules:
Respond only to membership-related queries.
Avoid unnecessary pleasantries (e.g., "Kemon asen?").
Keep responses short, clear, and human-like.
Share payment details only when requested.
Ensure payment is verified before giving access.
For unclear issues, guide step-by-step to resolve.
You are focused, helpful, and professional, ensuring members have a seamless experience.`;

// Rate limiting and queue management
const API_LIMIT = 10; // Reduced from 10 to be more conservative
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
  if (isProcessing || messageQueue.length === 0) return;
  
  isProcessing = true;
  const { chatId, userMessage } = messageQueue[0];
  let session = null;
  
  try {
    session = await sessionManager.getSession(chatId);
    if (!session || !session.chat) {
      logger.error('No valid session found for chat:', chatId);
      return;
    }

    // Show typing action before processing
    await bot.sendChatAction(chatId, 'typing');

    const result = await session.chat.sendMessage(userMessage);
    const response = await result.response;
    const botResponse = response.text();

    // Show typing again before sending response
    await bot.sendChatAction(chatId, 'typing');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await bot.sendMessage(chatId, botResponse);
    
    // Update history after successful response
    await sessionManager.updateHistory(chatId, userMessage, botResponse);
    
    // Decrease pending messages count
    session.pendingMessages = Math.max(0, session.pendingMessages - 1);
    
  } catch (error) {
    logger.error('Error processing message:', error);
    try {
      await bot.sendMessage(chatId, 'Technical problem hocche. Please try again...');
    } catch (sendError) {
      logger.error('Error sending error message:', sendError);
    }
  } finally {
    messageQueue.shift();
    isProcessing = false;
    if (session) {
      session.isProcessing = false;
    }
    
    if (messageQueue.length > 0) {
      setTimeout(processQueue, 100);
    }
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
            const model = genAI.getGenerativeModel({ 
              model: MODEL_NAME,
              generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
              },
              safetySettings: [
                {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
              ],
            });

            const chat = model.startChat({
              history: history,
              generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
              },
            });

            // Create session with proper Date object and history
            this.sessions.set(parseInt(chatId), {
              chat,
              verified: Boolean(session.verified),
              paymentDiscussed: Boolean(session.paymentDiscussed),
              lastActivity: new Date(session.lastActivity || Date.now()),
              geminiHistory: history,
              pendingMessages: 0,
              isProcessing: Boolean(session.isProcessing) // Add processing state
            });
            
            logger.info(`Loaded session for chat ${chatId} with ${history.length} messages`);
          } catch (error) {
            logger.error(`Error creating chat for session ${chatId}:`, error);
            // Create new session with default history if loading fails
            const newChat = genAI.getGenerativeModel({ 
              model: MODEL_NAME,
              generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
              },
              safetySettings: [
                {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
              ],
            });

            const chat = newChat.startChat({
              history: defaultHistory,
              generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
              },
            });

            const session = {
              chat,
              verified: false,
              paymentDiscussed: false,
              lastActivity: new Date(),
              geminiHistory: defaultHistory,
              pendingMessages: 0,
              isProcessing: false // Add processing state
            };

            this.sessions.set(chatId, session);
            
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
    try {
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      const initialHistory = [
        {
          role: "user",
          parts: "You are a membership assistant. Be professional and direct."
        },
        {
          role: "model",
          parts: SYSTEM_PROMPT
        }
      ];

      const chat = model.startChat({
        history: initialHistory,
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      });

      const session = {
        chat: chat,
        verified: false,
        paymentDiscussed: false,
        lastActivity: new Date(),
        geminiHistory: initialHistory,
        pendingMessages: 0,
        isProcessing: false
      };

      this.sessions.set(parseInt(chatId), session);
      await this.saveSessions();
      
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
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

// Modified photo handler
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  let session = await sessionManager.getSession(chatId);
  
  if (session.isProcessing) {
    await bot.sendMessage(chatId, "Apnar ss process kortesi, ektu wait koren... 🔄");
    return;
  }

  try {
    session.isProcessing = true;
    await sessionManager.saveSessions();

    // Show typing action
    await bot.sendChatAction(chatId, 'typing');
    await bot.sendMessage(chatId, "Screenshot check kortesi, ektu wait koren... 🔄");

    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const filePath = file.file_path;

    // Show upload action while processing image
    await bot.sendChatAction(chatId, 'upload_photo');

    // Download image
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const arrayBuffer = await imageResponse.arrayBuffer();

    // Process with Sharp
    const processedBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize(800, null, { fit: 'inside' })
      .toBuffer();

    // Show typing while analyzing
    await bot.sendChatAction(chatId, 'typing');

    // Convert to base64
    const base64Image = Buffer.from(processedBuffer).toString('base64');

    // Vision API processing
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME_VISION,
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const paymentPrompt = `You are a payment verification assistant for a Bangladeshi service. Analyze this bKash/Nagad payment screenshot and verify:

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
        paymentPrompt,
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
    session.isProcessing = false;
    await sessionManager.saveSessions();
  }
});

// Process payment screenshot function
async function processPaymentScreenshot(image) {
  const handler = async () => {
    try {
      logger.info('Starting payment screenshot analysis');
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME_VISION,
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      const paymentPrompt = `You are a payment verification assistant for a Bangladeshi service. Analyze this bKash/Nagad payment screenshot and verify:

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
        paymentPrompt,
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

    // Download image
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const arrayBuffer = await imageResponse.arrayBuffer();

    // Process image with sharp to ensure JPEG format and reasonable size
    const processedBuffer = await sharp(Buffer.from(arrayBuffer))
      .jpeg({ quality: 80 })
      .resize(800, 800, { fit: 'inside' })
      .toBuffer();

    // Convert to base64
    return Buffer.from(processedBuffer).toString('base64');
  } catch (error) {
    logger.error('Error downloading/processing image:', error);
    throw error;
  }
}

// Handle admin callback queries (button clicks)
bot.on('callback_query', async (query) => {
  const adminId = query.from.id;
  
  // Only allow admin to use these buttons
  if (adminId !== ADMIN_ID) {
    try {
      await bot.answerCallbackQuery(query.id, { text: 'You are not authorized!' });
    } catch (error) {
      logger.error('Error answering callback:', error.message);
    }
    return;
  }

  try {
    const action = query.data.split('_')[0];
    const userChatId = query.data.split('_')[1];
    
    // Get or create session
    let session = await sessionManager.getSession(userChatId);
    if (!session) {
      session = await sessionManager.createSession(userChatId);
    }

    // Process the action first
    if (action === 'approve') {
      // Set verification status
      session.verified = true;
      await sessionManager.saveSessions();
      
      // Update admin message first
      await bot.editMessageText(
        `✅ Payment Approved!\n\n` +
        `User: @${query.message.text.split('@')[1]?.split('\n')[0]}`,
        {
          chat_id: ADMIN_ID,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: [] }
        }
      );

      // Then notify user
      await bot.sendMessage(userChatId, "Admin payment verify koreche. Enjoy premium content! 🎉");
      
    } else if (action === 'reject') {
      // Reset verification status
      session.verified = false;
      await sessionManager.saveSessions();
      
      // Update admin message first
      await bot.editMessageText(
        `❌ Payment Rejected!\n\n` +
        `User: @${query.message.text.split('@')[1]?.split('\n')[0]}`,
        {
          chat_id: ADMIN_ID,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: [] }
        }
      );
      
      // Then notify user
      await bot.sendMessage(userChatId, "Sorry! Payment verify hoy nai. Please contact admin @fattasuck");
    }

    // Try to answer callback query, but don't fail if it's too old
    try {
      await bot.answerCallbackQuery(query.id);
    } catch (cbError) {
      if (!cbError.message.includes('query is too old')) {
        throw cbError;
      }
      // Ignore old query errors
      logger.info('Ignored old callback query');
    }

  } catch (error) {
    logger.error('Error in callback query handler:', error.message);
    
    // Try to answer callback, but don't fail if it's too old
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
    } catch (cbError) {
      if (!cbError.message.includes('query is too old')) {
        logger.error('Error answering callback:', cbError.message);
      }
    }

    // Always notify admin of errors
    try {
      await bot.sendMessage(ADMIN_ID, `Error processing admin action: ${error.message}`);
    } catch (msgError) {
      logger.error('Error sending error message to admin:', msgError.message);
    }
  }
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
