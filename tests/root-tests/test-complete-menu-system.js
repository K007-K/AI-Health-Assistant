#!/usr/bin/env node

/**
 * Complete Menu System Test
 * Tests all menu options and submenus to ensure they work properly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testCompleteMenuSystem() {
  console.log('🧪 Testing Complete Menu System\n');
  
  const messageController = new MessageController();
  let sentMessages = [];
  let sentButtons = [];
  let sentLists = [];
  
  // Mock WhatsApp service to capture all interactions
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      sentMessages.push({ type: 'message', phone, message, timestamp: Date.now() });
      console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      sentButtons.push({ type: 'buttons', phone, text, buttons, timestamp: Date.now() });
      console.log(`🔘 BUTTONS: "${text}" with ${buttons.length} buttons`);
      buttons.forEach(btn => console.log(`   - ${btn.title || btn.reply?.title} (${btn.id || btn.reply?.id})`));
      return { success: true };
    },
    
    sendList: async (phone, text, sections, buttonText) => {
      sentLists.push({ type: 'list', phone, text, sections, buttonText, timestamp: Date.now() });
      console.log(`📋 LIST: "${text}" with button "${buttonText}"`);
      sections.forEach(section => {
        console.log(`   Section: ${section.title}`);
        section.rows.forEach(row => console.log(`     - ${row.title} (${row.id})`));
      });
      return { success: true };
    },
    
    // Add missing methods
    getMainMenuList: (language) => {
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
    },
    
    sendTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING ON: ${phone}`);
      return { success: true };
    },
    
    stopTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING OFF: ${phone}`);
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      await messageController.whatsappService.sendMessage(phone, message);
      await messageController.whatsappService.sendInteractiveButtons(phone, ' ', [
        { id: 'feedback_good', title: '👍' },
        { id: 'feedback_bad', title: '👎' }
      ]);
      return { success: true };
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
        accessibility_mode: false
      };
    },
    getUserSession: async (userId) => {
      return { session_state: 'main_menu' };
    },
    updateUserSession: async (userId, state) => {
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
      
      // Greetings
      if (['hi', 'hello', 'hey'].includes(lowerContent)) {
        return 'greeting';
      }
      
      // Map button clicks to intents
      const intentMap = {
        'preventive_tips': 'preventive_tips',
        'disease_alerts': 'disease_alerts',
        'chat_ai': 'ai_chat',
        'symptom_check': 'symptom_check',
        'change_language': 'change_language'
      };
      return intentMap[content] || 'general';
    }
  };
  
  messageController.geminiService = {
    generateResponse: async () => {
      return 'Test AI response';
    },
    getPreventiveTips: async () => {
      return 'Test preventive tips';
    }
  };
  
  const testUser = {
    id: 'test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('1. Testing Main Menu Display...');
  sentMessages = []; sentButtons = []; sentLists = [];
  
  // Test main menu
  const greetingMessage = {
    phoneNumber: testUser.phone_number,
    content: 'Hi',
    type: 'text',
    messageId: 'test_greeting',
    timestamp: new Date()
  };
  
  await messageController.handleMessage(greetingMessage);
  
  console.log(`   Messages: ${sentMessages.length}, Buttons: ${sentButtons.length}, Lists: ${sentLists.length}`);
  const hasMainMenu = sentButtons.some(b => b.buttons.some(btn => 
    (btn.title || btn.reply?.title || '').includes('Health Tips')
  )) || sentLists.some(l => l.sections.some(s => s.rows.some(r => r.id === 'preventive_tips')));
  
  console.log(`   ✅ Main menu displayed: ${hasMainMenu ? 'YES' : 'NO'}`);
  
  console.log('\n2. Testing Health Tips Submenu...');
  sentMessages = []; sentButtons = []; sentLists = [];
  
  const healthTipsMessage = {
    phoneNumber: testUser.phone_number,
    content: 'preventive_tips',
    type: 'text',
    messageId: 'test_health_tips',
    timestamp: new Date()
  };
  
  await messageController.handleMessage(healthTipsMessage);
  
  console.log(`   Messages: ${sentMessages.length}, Buttons: ${sentButtons.length}, Lists: ${sentLists.length}`);
  const hasHealthTipsSubmenu = sentLists.some(l => 
    l.sections.some(s => s.rows.some(r => 
      r.id === 'learn_diseases' || r.id === 'nutrition_hygiene' || r.id === 'exercise_lifestyle'
    ))
  );
  
  console.log(`   ✅ Health tips submenu: ${hasHealthTipsSubmenu ? 'YES' : 'NO'}`);
  
  console.log('\n3. Testing Disease Outbreak Alerts Submenu...');
  sentMessages = []; sentButtons = []; sentLists = [];
  
  const diseaseAlertsMessage = {
    phoneNumber: testUser.phone_number,
    content: 'disease_alerts',
    type: 'text',
    messageId: 'test_disease_alerts',
    timestamp: new Date()
  };
  
  await messageController.handleMessage(diseaseAlertsMessage);
  
  console.log(`   Messages: ${sentMessages.length}, Buttons: ${sentButtons.length}, Lists: ${sentLists.length}`);
  const hasDiseaseAlertsSubmenu = sentButtons.some(b => 
    b.buttons.some(btn => 
      (btn.title || btn.reply?.title || '').includes('View Active') ||
      (btn.title || btn.reply?.title || '').includes('Turn ON')
    )
  );
  
  console.log(`   ✅ Disease alerts submenu: ${hasDiseaseAlertsSubmenu ? 'YES' : 'NO'}`);
  
  console.log('\n4. Testing AI Chat...');
  sentMessages = []; sentButtons = []; sentLists = [];
  
  const aiChatMessage = {
    phoneNumber: testUser.phone_number,
    content: 'chat_ai',
    type: 'text',
    messageId: 'test_ai_chat',
    timestamp: new Date()
  };
  
  await messageController.handleMessage(aiChatMessage);
  
  console.log(`   Messages: ${sentMessages.length}, Buttons: ${sentButtons.length}, Lists: ${sentLists.length}`);
  const hasAiChatResponse = sentMessages.some(m => 
    m.message.includes('AI Chat Mode Activated') || m.message.includes('chat freely')
  );
  
  console.log(`   ✅ AI chat working: ${hasAiChatResponse ? 'YES' : 'NO'}`);
  
  console.log('\n5. Testing Symptom Check...');
  sentMessages = []; sentButtons = []; sentLists = [];
  
  const symptomCheckMessage = {
    phoneNumber: testUser.phone_number,
    content: 'symptom_check',
    type: 'text',
    messageId: 'test_symptom_check',
    timestamp: new Date()
  };
  
  await messageController.handleMessage(symptomCheckMessage);
  
  console.log(`   Messages: ${sentMessages.length}, Buttons: ${sentButtons.length}, Lists: ${sentLists.length}`);
  const hasSymptomCheckResponse = sentMessages.some(m => 
    m.message.includes('symptoms') || m.message.includes('describe')
  );
  
  console.log(`   ✅ Symptom check working: ${hasSymptomCheckResponse ? 'YES' : 'NO'}`);
  
  // Final Assessment
  const allWorking = hasMainMenu && hasHealthTipsSubmenu && hasDiseaseAlertsSubmenu && hasAiChatResponse && hasSymptomCheckResponse;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 COMPLETE MENU SYSTEM TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Main Menu: ${hasMainMenu ? 'WORKING' : 'BROKEN'}`);
  console.log(`✅ Health Tips Submenu: ${hasHealthTipsSubmenu ? 'WORKING' : 'BROKEN'}`);
  console.log(`✅ Disease Alerts Submenu: ${hasDiseaseAlertsSubmenu ? 'WORKING' : 'BROKEN'}`);
  console.log(`✅ AI Chat: ${hasAiChatResponse ? 'WORKING' : 'BROKEN'}`);
  console.log(`✅ Symptom Check: ${hasSymptomCheckResponse ? 'WORKING' : 'BROKEN'}`);
  
  if (allWorking) {
    console.log('\n🎉 SUCCESS: All menu options working!');
    return true;
  } else {
    console.log('\n❌ FAILED: Some menu options are broken');
    return false;
  }
}

// Run test
testCompleteMenuSystem()
  .then(success => {
    if (success) {
      console.log('\n✅ Complete menu system test passed');
    } else {
      console.log('\n❌ Complete menu system test failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
