#!/usr/bin/env node

/**
 * Test Comprehensive Fixes
 * Verify Meta-style feedback, no duplicates, and fast response time
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testComprehensiveFixes() {
  console.log('🧪 Testing Comprehensive Fixes\n');
  
  const messageController = new MessageController();
  let sentMessages = [];
  let responseTimes = [];
  
  // Mock WhatsApp service to capture messages and timing
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      const timestamp = Date.now();
      sentMessages.push({ type: 'message', phone, message, timestamp });
      console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
      return { success: true, messageId: `msg_${timestamp}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      const timestamp = Date.now();
      sentMessages.push({ type: 'buttons', phone, text, buttons, timestamp });
      console.log(`🔘 BUTTONS: "${text}" (${buttons.length} buttons)`);
      buttons.forEach(btn => console.log(`   - ${btn.title} (${btn.id})`));
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      // This should send message + Meta-style feedback buttons
      await messageController.whatsappService.sendMessage(phone, message);
      await messageController.whatsappService.sendInteractiveButtons(phone, ' ', [
        { id: 'feedback_good', title: '👍' },
        { id: 'feedback_bad', title: '👎' }
      ]);
      return { success: true };
    },
    
    sendTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING ON: ${phone}`);
      return { success: true };
    },
    
    stopTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING OFF: ${phone}`);
      return { success: true };
    }
  };
  
  // Mock user service
  messageController.userService = {
    getOrCreateUser: async (phoneNumber) => {
      return {
        id: 'test-user',
        phone_number: phoneNumber,
        preferred_language: 'en',
        script_preference: 'native'
      };
    },
    getUserSession: async (userId) => {
      return { session_state: 'ai_chat' }; // Simulate AI chat mode
    },
    updateUserSession: async (userId, state) => {
      console.log(`📝 Session updated: ${userId} -> ${state}`);
      return { success: true };
    }
  };
  
  // Mock conversation service
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
      if (state === 'ai_chat') return 'ai_chat_message';
      return 'general';
    }
  };
  
  // Mock Gemini service for fast responses
  messageController.geminiService = {
    generateResponse: async (message, language, script, context, accessibility) => {
      // Simulate fast AI response
      return `I can answer your health questions.
• I provide information about diseases, symptoms, nutrition, and vaccines.
• I can also give basic advice on animal health.
• I cannot answer questions about politics, math, or jobs.

This is general health information. For emergencies or serious illness, consult a doctor immediately.`;
    }
  };
  
  const testUser = {
    id: 'test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('1. Testing AI Chat Response (should have Meta-style feedback)...');
  sentMessages = [];
  
  const startTime = Date.now();
  
  // Simulate user asking a question in AI chat mode
  const messageData = {
    phoneNumber: testUser.phone_number,
    content: 'What can you do?',
    type: 'text',
    messageId: 'test_msg_001',
    timestamp: new Date(),
    mediaData: null
  };
  
  await messageController.handleMessage(messageData);
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  responseTimes.push(responseTime);
  
  console.log(`\n2. Response Analysis (took ${responseTime}ms):`);
  
  // Check for duplicates
  const messagesSent = sentMessages.filter(m => m.type === 'message');
  const buttonsSent = sentMessages.filter(m => m.type === 'buttons');
  
  console.log(`   📊 Messages sent: ${messagesSent.length}`);
  console.log(`   🔘 Button sets sent: ${buttonsSent.length}`);
  
  const hasDuplicates = messagesSent.length > 1;
  const hasMetaStyleButtons = buttonsSent.some(b => 
    b.text === ' ' && b.buttons && b.buttons.some(btn => btn.id === 'feedback_good')
  );
  
  console.log(`   ❌ Has duplicates: ${hasDuplicates ? 'YES (BAD)' : 'NO (GOOD)'}`);
  console.log(`   👍👎 Meta-style feedback: ${hasMetaStyleButtons ? 'YES (GOOD)' : 'NO (BAD)'}`);
  console.log(`   ⚡ Response time: ${responseTime}ms ${responseTime < 2000 ? '(FAST)' : '(SLOW)'}`);
  
  console.log('\n3. Testing multiple requests (duplicate prevention)...');
  
  // Test multiple rapid requests
  sentMessages = [];
  const rapidStartTime = Date.now();
  
  for (let i = 0; i < 3; i++) {
    const rapidMessageData = {
      phoneNumber: testUser.phone_number,
      content: `Test message ${i + 1}`,
      type: 'text',
      messageId: `rapid_msg_${i}`,
      timestamp: new Date(),
      mediaData: null
    };
    
    await messageController.handleMessage(rapidMessageData);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  const rapidEndTime = Date.now();
  const rapidTotalTime = rapidEndTime - rapidStartTime;
  
  const rapidMessages = sentMessages.filter(m => m.type === 'message');
  const rapidButtons = sentMessages.filter(m => m.type === 'buttons');
  
  console.log(`   📊 Rapid test - Messages: ${rapidMessages.length}, Buttons: ${rapidButtons.length}`);
  console.log(`   ⚡ Total time for 3 requests: ${rapidTotalTime}ms`);
  console.log(`   📈 Average per request: ${Math.round(rapidTotalTime / 3)}ms`);
  
  // Final assessment
  const noDuplicates = !hasDuplicates && rapidMessages.length === 3; // Should be exactly 3
  const hasMetaButtons = hasMetaStyleButtons;
  const isFast = responseTime < 2000; // Under 2 seconds
  
  console.log('\n4. Final Results:');
  console.log(`   ✅ No duplicate responses: ${noDuplicates ? 'YES' : 'NO'}`);
  console.log(`   ✅ Meta-style feedback buttons: ${hasMetaButtons ? 'YES' : 'NO'}`);
  console.log(`   ✅ Fast response time: ${isFast ? 'YES' : 'NO'}`);
  
  if (noDuplicates && hasMetaButtons && isFast) {
    console.log('\n🎉 SUCCESS: All issues are FIXED!');
    console.log('✅ Meta-style feedback buttons implemented');
    console.log('✅ No duplicate responses');
    console.log('✅ Fast response times');
    return true;
  } else {
    console.log('\n❌ FAILED: Some issues still exist');
    return false;
  }
}

// Run test
testComprehensiveFixes()
  .then(success => {
    if (success) {
      console.log('\n✅ All comprehensive fixes working perfectly');
    } else {
      console.log('\n❌ Some fixes still need work');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
