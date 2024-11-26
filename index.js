import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sharp from 'sharp';
import fetch from 'node-fetch';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Bot configuration
const BOT_TOKEN = '8086833979:AAEcLny1Ilz0Uwdv6a_Hl073IJlc58YgsPM';
const GEMINI_KEY = 'AIzaSyB30nZc-cAavmcbC2uykbeY_sZ2o5gPuI0';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const MODEL_NAME = "gemini-1.5-pro";
const MODEL_NAME_VISION = "gemini-1.5-flash"; // Using same model for vision as web version
const ADMIN_ID = 6135009699;
const GROUP_PREVIEW_IMAGE = "https://i.ibb.co.com/grMFYG6/4245e66b-d27f-40f9-80d1-7bbaf1108a8d.jpg";
const GROUP_LINKS = {
  group1: "https://t.me/+SpL6wJ5_4MVhZDll",
  group2: "https://t.me/+HtfDVNyNaPcxNWVl"
};

// Track user sessions
const userSessions = new Map();

// Welcome messages for variety
const welcomeMessages = [
  "Assalamu alaikum! Ki khobor bhaiya? Premium membership niye janben? 🙂",
  "Hi bhaiya, welcome! Premium content er jonno help lagbe? 😊",
  "Assalamu alaikum! Premium membership niye help korbo, bolen ki dorkar?",
  "Hello bhaiya! Premium content access niben? Help korte pari?",
  "Assalamu alaikum! Premium service niye details janben? Bolen"
];

async function initializeChat(chatId) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
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
    ];

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        {
          role: "user",
          parts: `System Definition:
You are a friendly Bangladeshi membership assistant. Use natural Banglish, but keep responses concise and clear. Cost is 100 Taka monthly for premium groups.

Key Behaviors:
• Use minimal emojis (1-2 per message maximum)
• Keep responses short but helpful
• Be casual but professional
• Vary your responses naturally
• Don't be robotic or over-enthusiastic

Payment Details:
Personal Numbers (Send Money Only):
• Bkash: 0179335569
• Nagad: 01744136943

Rules:
• Share numbers only when asked
• Mention they're personal numbers
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
A: "Personal number: 0179335569. Send Money option e pathaben"

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
• Keep responses brief but clear
• Use minimal emojis
• Be helpful but not over-friendly
• Maintain professional tone
• Give clear instructions

Payment Verification:
• Must be Send Money screenshot
• Amount 100+ taka
• Correct number
• Clear transaction details`,
        },
        {
          role: "assistant",
          parts: "Assalamu alaikum! Premium membership niye janben? Bolen ki help lagbe",
        },
      ],
    });

    userSessions.set(chatId, { chat, verified: false, paymentDiscussed: false });
    return chat;
  } catch (error) {
    console.error("Error initializing chat:", error);
    throw error;
  }
}

async function processPaymentScreenshot(image) {
  try {
    console.log("Processing payment screenshot...");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Debug the image data
    console.log("Image data received:", image ? "Yes" : "No");
    if (!image) {
      console.error("No image data received");
      return false;
    }

    // Convert image to base64 if it's not already
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    console.log("Sending to Gemini Vision API...");

    const result = await model.generateContent([
      {
        text: "You are a payment verification assistant. Your task is to verify if this is a valid payment screenshot:\n1. Check if it's from bKash or Nagad\n2. Find the payment amount\n3. Verify if amount is 100 or more\n\nIf it's a valid bKash/Nagad payment of 100+ taka, say 'VALID'. Otherwise, say 'INVALID' and explain why."
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
    console.log("Gemini response:", text);
    return text.includes('valid');
  } catch (error) {
    console.error("Error processing screenshot:", error);
    return false;
  }
}

async function downloadImage(fileId, chatId) {
  try {
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
    
    return processedBuffer.toString('base64');
  } catch (error) {
    console.error('Error downloading image:', error);
    await bot.sendMessage(chatId, 
      'Image process korte problem hocche. Please check:\n' +
      '• Image size kom rakhen\n' +
      '• Clear screenshot pathaben\n' +
      '• Internet connection check koren'
    );
    return null;
  }
}

// Start command with random welcome message
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await initializeChat(chatId);
    await bot.sendMessage(chatId, "Assalamu alaikum! Premium membership niye help korbo. Ki help lagbe bolen 🙂");
  } catch (error) {
    console.error('Error in start command:', error);
    await bot.sendMessage(chatId, 'Technical problem hocche. amader admin @fattasuck er sathe kotha bolen ami ektu issue face korchi');
  }
});

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.text?.startsWith('/')) return;

  try {
    let session = userSessions.get(chatId);
    if (!session) {
      session = await initializeChat(chatId);
    }

    await bot.sendChatAction(chatId, 'typing');

    // Handle payment screenshots
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      const base64Image = await downloadImage(photo.file_id, chatId);
      
      if (!base64Image) {
        return;
      }

      try {
        const isValid = await processPaymentScreenshot(base64Image);

        if (isValid) {
          session.verified = true;
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
          
          await bot.sendMessage(ADMIN_ID, adminMsg, { reply_markup: keyboard });
          await bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);

          await bot.sendMessage(chatId, 
            'Payment verified! Ei nen group links:\n\n' +
            `Group 1: ${GROUP_LINKS.group1}\n` +
            `Group 2: ${GROUP_LINKS.group2}\n\n` +
            'Join request diye rakhen. Admin approve kore nibe'
          );
        } else {
          // Check if user has talked about payment before
          if (session.paymentDiscussed) {
            await bot.sendMessage(chatId, 
              'Screenshot ta thik nai. Please check:\n\n' +
              '• Bkash/Nagad Send Money screenshot\n' +
              '• Amount 100+ taka\n' +
              '• Correct number use korechen\n' +
              '• Transaction details clear ache\n\n' +
              'Abar try koren'
            );
          } else {
            // For random images, respond about content availability
            await bot.sendMessage(chatId, 
              "Ji bhai, full collection available ache. Regular update hoy. " +
              "Payment confirm holei dekhte parben 🙂"
            );
          }
        }
      } catch (error) {
        console.error("Error processing screenshot:", error);
        await bot.sendMessage(chatId, 
          "Bhaiya, amader admin @fattasuck er sathe kotha bolen. " +
          "Ami ektu technical issue face korchi 🙏"
        );
      }
      return;
    }

    // Handle text messages
    if (msg.text) {
      // Set payment discussed flag if user talks about payment
      if (msg.text.toLowerCase().includes('payment') || 
          msg.text.toLowerCase().includes('pay') ||
          msg.text.toLowerCase().includes('tk') ||
          msg.text.toLowerCase().includes('taka') ||
          msg.text.toLowerCase().includes('bkash') ||
          msg.text.toLowerCase().includes('nagad')) {
        session.paymentDiscussed = true;
      }

      // Check for group preview requests
      if (msg.text.toLowerCase().includes('screenshot') || 
          msg.text.toLowerCase().includes('ss') || 
          msg.text.toLowerCase().includes('preview') ||
          msg.text.toLowerCase().includes('demo')) {
        await bot.sendPhoto(chatId, GROUP_PREVIEW_IMAGE, {
          caption: "Ei nen bhai, premium content er ekta preview. Full access er jonno payment koren 😊"
        });
        return;
      }

      // Always respond positively about content availability
      if (msg.text.toLowerCase().includes('video') || 
          msg.text.toLowerCase().includes('collection') ||
          msg.text.toLowerCase().includes('content')) {
        await bot.sendMessage(chatId, 
          "Ji ache bhai, full collection available. Regular update hoy. " +
          "Payment confirm holei full access paben 🙂"
        );
        return;
      }

      const result = await session.chat.sendMessage(msg.text);
      const response = result.response.text();
      await bot.sendMessage(chatId, response);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(chatId, 'Technical problem hocche. amader admin @fattasuck er sathe kotha bolen ami ektu issue face korchi');
  }
});

// Handle admin callback queries (button clicks)
bot.on('callback_query', async (query) => {
  const action = query.data.split('_')[0];
  const userChatId = query.data.split('_')[1];

  if (action === 'approve') {
    await bot.sendMessage(userChatId, 
      "Congratulations! Apnar payment verify hoye geche. " +
      "Group e add kore deya hoyeche. Please check koren 🎉"
    );
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });
  } else if (action === 'reject') {
    await bot.sendMessage(userChatId, 
      "Bhaiya, payment ta verify korte problem hocche. " +
      "Please admin @fattasuck er sathe contact koren 🙏"
    );
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });
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
  console.log(`Health check server listening on port ${PORT}`);
});

console.log('Bot started successfully!');
