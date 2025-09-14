const { supabase, supabaseAdmin } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/environment');

class ConversationService {
  constructor() {
    this.maxHistoryLength = config.bot.maxConversationHistory || 10;
  }

  // Save user message
  async saveUserMessage(userId, content, messageData = {}) {
    try {
      const message = {
        id: uuidv4(),
        user_id: userId,
        message_type: 'user',
        content: content,
        message_id: messageData.messageId || null,
        reply_to_message_id: messageData.replyToMessageId || null,
        language: messageData.language || 'en',
        intent: messageData.intent || null,
        metadata: {
          type: messageData.type || 'text',
          timestamp: messageData.timestamp || new Date().toISOString(),
          mediaData: messageData.mediaData || null,
          context: messageData.context || null
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert([message])
        .select()
        .single();

      if (error) {
        console.error('Error saving user message:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in saveUserMessage:', error);
      throw error;
    }
  }

  // Save bot response
  async saveBotMessage(userId, content, intent = null, language = 'en', metadata = {}) {
    try {
      const message = {
        id: uuidv4(),
        user_id: userId,
        message_type: 'bot',
        content: content,
        language: language,
        intent: intent,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert([message])
        .select()
        .single();

      if (error) {
        console.error('Error saving bot message:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in saveBotMessage:', error);
      throw error;
    }
  }

  // Get conversation history for context
  async getConversationHistory(userId, limit = null) {
    try {
      const queryLimit = limit || this.maxHistoryLength;
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(queryLimit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        throw error;
      }

      // Return in chronological order (oldest first)
      return data.reverse();
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      throw error;
    }
  }

  // Get recent context for AI (last few messages)
  async getRecentContext(userId, contextLimit = 5) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('message_type, content, intent, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(contextLimit);

      if (error) {
        console.error('Error fetching recent context:', error);
        throw error;
      }

      // Return in chronological order for context
      return data.reverse();
    } catch (error) {
      console.error('Error in getRecentContext:', error);
      return [];
    }
  }

  // Detect intent from user message
  detectIntent(message, currentState = 'main_menu') {
    const lowerMessage = message.toLowerCase();
    const trimmedMessage = message.trim();

    // Button-based intents (list selections) - exact IDs
    if (message.startsWith('lang_')) return 'language_selection';
    if (message.startsWith('script_')) return 'script_selection';
    if (message === 'chat_ai') return 'ai_chat';
    if (message === 'appointments') return 'appointments';
    if (message === 'preventive_tips') return 'preventive_tips';
    if (message === 'symptom_check') return 'symptom_check';
    if (message === 'outbreak_alerts') return 'outbreak_alerts';
    if (message === 'feedback') return 'feedback';
    
    // Handle text-based selections (when users type the display text)
    // Main menu options
    if (trimmedMessage.includes('🤖 Chat with AI') || lowerMessage.includes('chat with ai')) return 'ai_chat';
    if (trimmedMessage.includes('📅 My Appointments') || lowerMessage.includes('my appointments') || lowerMessage.includes('appointments')) return 'appointments';
    if (trimmedMessage.includes('🌱 Health Tips') || trimmedMessage.includes('🌱 Preventive Healthcare Tips') || lowerMessage.includes('health tips') || lowerMessage.includes('preventive tips')) return 'preventive_tips';
    if (trimmedMessage.includes('🩺 Check Symptoms') || lowerMessage.includes('check symptoms') || lowerMessage.includes('symptom check')) return 'symptom_check';
    if (trimmedMessage.includes('🚨 Outbreak Alerts') || lowerMessage.includes('outbreak alerts')) return 'outbreak_alerts';
    if (trimmedMessage.includes('📊 Feedback') || lowerMessage.includes('feedback & accuracy')) return 'feedback';
    
    // More options menu selections and Change Language from main menu
    if (trimmedMessage.includes('🌐 Change Language') || trimmedMessage.includes('🌐 भाषा बदलें') || trimmedMessage.includes('🌐 భాష మార్చండి') || lowerMessage.includes('change language') || lowerMessage.includes('switch to different language')) return 'change_language';
    if (message === 'change_language') return 'change_language';
    
    // Handle the exact text from main menu list selection
    if (trimmedMessage.includes('Switch to different language')) return 'change_language';
    
    // Language selections
    if (trimmedMessage.includes('English') && (trimmedMessage.includes('🇺🇸') || lowerMessage.includes('english language'))) return 'language_selection';
    if (trimmedMessage.includes('हिंदी') || trimmedMessage.includes('Hindi')) return 'language_selection';
    if (trimmedMessage.includes('తెలుగు') || trimmedMessage.includes('Telugu')) return 'language_selection';
    if (trimmedMessage.includes('தமிழ்') || trimmedMessage.includes('Tamil')) return 'language_selection';
    if (trimmedMessage.includes('ଓଡ଼ିଆ') || trimmedMessage.includes('Odia')) return 'language_selection';
    
    // Preventive tips categories
    if (message === 'learn_diseases' || message === 'nutrition_hygiene' || message === 'exercise_lifestyle') {
      return 'preventive_tips';
    }
    
    // Handle category text selections
    if (trimmedMessage.includes('🦠 Learn about Diseases') || lowerMessage.includes('learn about diseases')) return 'preventive_tips';
    if (trimmedMessage.includes('🥗 Nutrition & Hygiene') || lowerMessage.includes('nutrition') || lowerMessage.includes('hygiene')) return 'preventive_tips';
    if (trimmedMessage.includes('🏃 Exercise & Lifestyle') || lowerMessage.includes('exercise') || lowerMessage.includes('lifestyle')) return 'preventive_tips';
    
    // Navigation commands  
    if (trimmedMessage.includes('📋 Main Menu') || lowerMessage.includes('menu') || lowerMessage.includes('back') || lowerMessage.includes('main menu')) {
      return 'menu_request';
    }
    
    // Language change commands
    if (lowerMessage.includes('change language') || lowerMessage.includes('switch language') || lowerMessage.includes('language settings') || trimmedMessage.includes('🌐')) {
      return 'change_language';
    }

    // Accessibility commands
    if (message.startsWith('/')) {
      return 'accessibility_command';
    }

    // Emergency keywords
    const emergencyKeywords = ['emergency', 'urgent', 'severe pain', 'chest pain', 'breathing', 'unconscious', 'bleeding'];
    if (emergencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'emergency';
    }

    // Health-related keywords
    if (lowerMessage.includes('symptom') || lowerMessage.includes('pain') || lowerMessage.includes('fever')) {
      return 'symptom_inquiry';
    }

    if (lowerMessage.includes('vaccine') || lowerMessage.includes('vaccination')) {
      return 'vaccination_inquiry';
    }

    if (lowerMessage.includes('diet') || lowerMessage.includes('nutrition') || lowerMessage.includes('food')) {
      return 'nutrition_inquiry';
    }

    // Greetings
    const greetings = ['hello', 'hi', 'hey', 'namaste', 'vanakkam', 'namaskar'];
    if (greetings.some(greeting => lowerMessage.includes(greeting))) {
      return 'greeting';
    }

    // Feedback
    if (lowerMessage.includes('feedback') || lowerMessage.includes('rating') || lowerMessage.includes('review')) {
      return 'feedback_request';
    }

    // Default based on current state
    switch (currentState) {
      case 'language_selection':
        return 'language_selection';
      case 'script_selection':
        return 'script_selection';
      case 'ai_chat':
        return 'ai_chat_message'; // Continue in AI chat mode
      case 'symptom_check':
        return 'symptom_input';
      case 'preventive_tips':
        return 'preventive_tips_request';
      case 'feedback':
        return 'feedback_input';
      default:
        return 'general_message';
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(userId, days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('intent, message_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate);

      if (error) {
        console.error('Error fetching conversation analytics:', error);
        throw error;
      }

      // Analyze the data
      const analytics = {
        totalMessages: data.length,
        userMessages: data.filter(msg => msg.message_type === 'user').length,
        botMessages: data.filter(msg => msg.message_type === 'bot').length,
        topIntents: {},
        dailyActivity: {}
      };

      // Count intents
      data.forEach(msg => {
        if (msg.intent) {
          analytics.topIntents[msg.intent] = (analytics.topIntents[msg.intent] || 0) + 1;
        }

        // Daily activity
        const date = new Date(msg.created_at).toISOString().split('T')[0];
        analytics.dailyActivity[date] = (analytics.dailyActivity[date] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      console.error('Error in getConversationAnalytics:', error);
      throw error;
    }
  }

  // Search conversations by content
  async searchConversations(userId, searchTerm, limit = 10) {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching conversations:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in searchConversations:', error);
      throw error;
    }
  }

  // Clean up old conversations (maintenance)
  async cleanupOldConversations(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin
        .from('conversations')
        .delete()
        .lt('created_at', cutoffDate);

      if (error) {
        console.error('Error cleaning up old conversations:', error);
        throw error;
      }

      console.log(`🧹 Conversations older than ${retentionDays} days cleaned up`);
    } catch (error) {
      console.error('Error in cleanupOldConversations:', error);
      throw error;
    }
  }

  // Get conversation statistics for admin
  async getGlobalConversationStats() {
    try {
      const { data: totalConversations, error: totalError } = await supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact' });

      const { data: recentConversations, error: recentError } = await supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      const { data: intentStats, error: intentError } = await supabaseAdmin
        .from('conversations')
        .select('intent')
        .not('intent', 'is', null)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (totalError || recentError || intentError) {
        throw new Error('Error fetching conversation statistics');
      }

      // Count intents
      const intentCounts = {};
      intentStats.forEach(row => {
        if (row.intent) {
          intentCounts[row.intent] = (intentCounts[row.intent] || 0) + 1;
        }
      });

      return {
        totalConversations: totalConversations.length,
        recentConversations: recentConversations.length,
        topIntents: intentCounts
      };
    } catch (error) {
      console.error('Error in getGlobalConversationStats:', error);
      throw error;
    }
  }

  // Update message metadata (for additional context)
  async updateMessageMetadata(messageId, newMetadata) {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({ metadata: newMetadata })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        console.error('Error updating message metadata:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateMessageMetadata:', error);
      throw error;
    }
  }
}

module.exports = ConversationService;