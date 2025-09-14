require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  },
  
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  bot: {
    name: process.env.BOT_NAME || 'Health Assistant',
    emergencyNumber: process.env.EMERGENCY_NUMBER || '108',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
    maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY) || 10
  },
  
  webhook: {
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN
  }
};