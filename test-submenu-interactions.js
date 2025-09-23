#!/usr/bin/env node

/**
 * Detailed Submenu Interactions Test
 * Tests deeper navigation and responses in submenus
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testSubmenuInteractions() {
  console.log('🧪 Testing Detailed Submenu Interactions\n');
  
  const messageController = new MessageController();
  let sentMessages = [];
  let sentButtons = [];
  let sentLists = [];
  let errors = [];
  
  // Mock WhatsApp service to capture all interactions
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      sentMessages.push({ type: 'message', phone, message, timestamp: Date.now() });
      console.log(`📱 MESSAGE: ${message.substring(0, 100)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      sentButtons.push({ type: 'buttons', phone, text, buttons, timestamp: Date.now() });
      console.log(`🔘 BUTTONS: "${text.substring(0, 50)}..." with ${buttons.length} buttons`);
      buttons.forEach(btn => console.log(`   - ${btn.title || btn.reply?.title} (${btn.id || btn.reply?.id})`));
      return { success: true };
    },
    
    sendList: async (phone, text, sections, buttonText) => {
      sentLists.push({ type: 'list', phone, text, sections, buttonText, timestamp: Date.now() });
      console.log(`📋 LIST: "${text.substring(0, 50)}..." with button "${buttonText}"`);
      sections.forEach(section => {
        console.log(`   Section: ${section.title}`);
        section.rows.forEach(row => console.log(`     - ${row.title} (${row.id})`));
      });
      return { success: true };
    },
    
    sendTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING ON: ${phone}`);
      return { success: true };
    },
    
    stopTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING OFF: ${phone}`);
      return { success: true };
    },
    
    // Add missing methods with proper implementations
    getMainMenuList: (language, scriptType) => {
      return {
        sections: [{
          title: "📋 Main Menu",
          rows: [
            { id: 'chat_ai', title: '🤖 Chat with AI', description: 'Ask health questions & get guidance' },
            { id: 'symptom_check', title: '🩺 Check Symptoms', description: 'Analyze symptoms & get recommendations' },
            { id: 'preventive_tips', title: '🌱 Health Tips', description: 'Learn about diseases, nutrition & lifestyle' },
            { id: 'disease_alerts', title: '🦠 Disease Outbreak Alerts', description: 'View active diseases & manage alerts' },
            { id: 'change_language', title: '🌐 Change Language', description: 'Switch to different language' }
          ]
        }]
      };
    },
    
    getPreventiveTipsList: (language) => {
      return {
        sections: [{
          title: "🌱 Health Tips Categories",
          rows: [
            { id: 'learn_diseases', title: '🦠 Learn about Diseases', description: 'Common diseases, symptoms & prevention' },
            { id: 'nutrition_hygiene', title: '🥗 Nutrition & Hygiene', description: 'Healthy eating habits & cleanliness tips' },
            { id: 'exercise_lifestyle', title: '🏃 Exercise & Lifestyle', description: 'Physical activity & healthy living tips' }
          ]
        }]
      };
    },
    
    getDiseaseAlertsButtons: (language) => {
      return [
        { id: 'view_active_diseases', title: '📊 View Active Diseases' },
        { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' },
        { id: 'back_to_menu', title: '🏠 Main Menu' }
      ];
    }
  };
  
  // Mock services
  messageController.userService = {
    getOrCreateUser: async (phoneNumber) => {
      return {
        id: 'test-user',
        phone_number: phoneNumber,
        preferred_language: 'en',
        script_preference: 'native',
        accessibility_mode: false,
        consent_outbreak_alerts: false
      };
    },
    getUserSession: async (userId) => {
      return { 
        session_state: 'main_menu',
        context_data: {}
      };
    },
    updateUserSession: async (userId, state, contextData) => {
      console.log(`📝 Session updated: ${userId} -> ${state}`);
      return { success: true };
    },
    hasCompletedOnboarding: async (userId) => {
      return true;
    }
  };
  
  messageController.conversationService = {
    saveBotMessage: async (userId, message, type, language) => {
      console.log(`💾 Saved bot message: ${type}`);
      return { success: true };
    },
    saveUserMessage: async (userId, message, metadata) => {
      console.log(`💾 Saved user message`);
      return { success: true };
    },
    getRecentContext: async (userId) => {
      return [];
    },
    detectIntent: (content, state) => {
      const lowerContent = content.toLowerCase();
      
      // Map button clicks to intents
      const intentMap = {
        'preventive_tips': 'preventive_tips',
        'disease_alerts': 'disease_alerts',
        'chat_ai': 'ai_chat',
        'symptom_check': 'symptom_check',
        'change_language': 'change_language',
        'learn_diseases': 'preventive_tips',
        'nutrition_hygiene': 'preventive_tips',
        'exercise_lifestyle': 'preventive_tips',
        'view_active_diseases': 'disease_alerts',
        'turn_on_alerts': 'disease_alerts'
      };
      return intentMap[content] || 'general';
    }
  };
  
  messageController.geminiService = {
    generateResponse: async (prompt, language, scriptType, context, accessibilityMode, maxRetries, conversationType) => {
      if (conversationType === 'nutrition_hygiene') {
        return '🥗 Here are some nutrition tips:\n\n• Eat plenty of fruits and vegetables\n• Drink 8 glasses of water daily\n• Limit processed foods\n• Include protein in every meal\n\nThis is general health information. For personalized advice, consult a doctor.';
      }
      return 'Test AI response for health guidance';
    },
    getPreventiveTips: async (category, language) => {
      return `Test preventive tips for ${category}`;
    }
  };
  
  // Mock AI Disease Monitor Service
  messageController.aiDiseaseMonitorService = {
    fetchNationwideDiseases: async (language, scriptType) => {
      return '📢 *National Health Alert for India*\n\n🇮🇳 Main Health News:\nNo major disease outbreaks reported across India in the last 30 days.\n\n📞 Emergency Contact: 108';
    },
    fetchStateSpecificDiseases: async (stateName, language, scriptType) => {
      return `📢 *Health Alert for ${stateName}*\n\nNo significant disease outbreaks reported in ${stateName} in the last 30 days.\n\n📞 Emergency Contact: 108`;
    }
  };
  
  const testUser = {
    id: 'test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  // Helper function to send message and capture errors
  async function sendTestMessage(content, description) {
    console.log(`\n🔍 Testing: ${description}`);
    sentMessages = []; sentButtons = []; sentLists = [];
    
    try {
      const message = {
        phoneNumber: testUser.phone_number,
        content: content,
        type: 'text',
        messageId: `test_${Date.now()}`,
        timestamp: new Date()
      };
      
      await messageController.handleMessage(message);
      
      console.log(`   📊 Results: ${sentMessages.length} messages, ${sentButtons.length} buttons, ${sentLists.length} lists`);
      return {
        success: true,
        messages: sentMessages.length,
        buttons: sentButtons.length,
        lists: sentLists.length
      };
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      errors.push({ test: description, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Test sequence
  const tests = [
    // Main menu navigation
    { content: 'Menu', description: 'Main Menu Display' },
    
    // Health Tips submenu navigation
    { content: 'preventive_tips', description: 'Health Tips Menu' },
    { content: 'nutrition_hygiene', description: 'Nutrition & Hygiene Selection' },
    { content: 'What should I eat for good health?', description: 'Nutrition Question Response' },
    
    // Disease Alerts submenu
    { content: 'disease_alerts', description: 'Disease Alerts Menu' },
    { content: 'view_active_diseases', description: 'View Active Diseases' },
    { content: 'turn_on_alerts', description: 'Turn On Alerts' },
    
    // AI Chat
    { content: 'chat_ai', description: 'AI Chat Activation' },
    { content: 'What are the symptoms of fever?', description: 'AI Chat Question' },
    
    // Symptom Check
    { content: 'symptom_check', description: 'Symptom Check Activation' },
    { content: 'I have fever and headache', description: 'Symptom Description' },
    
    // Language Change
    { content: 'change_language', description: 'Language Selection Menu' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await sendTestMessage(test.content, test.description);
    results.push({
      test: test.description,
      content: test.content,
      ...result
    });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Analysis
  console.log('\n' + '='.repeat(70));
  console.log('📊 DETAILED SUBMENU INTERACTION TEST RESULTS');
  console.log('='.repeat(70));
  
  let passedTests = 0;
  let failedTests = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const details = result.success ? 
      `(${result.messages}M, ${result.buttons}B, ${result.lists}L)` : 
      `(${result.error})`;
    
    console.log(`${status} ${result.test} ${details}`);
    
    if (result.success) {
      passedTests++;
    } else {
      failedTests++;
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log(`📈 SUMMARY: ${passedTests}/${results.length} tests passed (${((passedTests/results.length)*100).toFixed(1)}%)`);
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  if (failedTests === 0) {
    console.log('\n🎉 SUCCESS: All submenu interactions working perfectly!');
    return true;
  } else {
    console.log(`\n⚠️  WARNING: ${failedTests} submenu interactions have issues`);
    return false;
  }
}

// Run test
testSubmenuInteractions()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
