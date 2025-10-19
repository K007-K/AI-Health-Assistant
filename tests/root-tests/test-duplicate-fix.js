#!/usr/bin/env node

/**
 * Test Duplicate Response Fix
 * Verify that clicking "Chat with AI" doesn't send duplicate messages
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testDuplicateFix() {
  console.log('🧪 Testing Duplicate Response Fix\n');
  
  const messageController = new MessageController();
  let sentMessages = [];
  
  // Mock WhatsApp service to capture messages
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      sentMessages.push({ type: 'message', phone, message, timestamp: Date.now() });
      console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      sentMessages.push({ type: 'buttons', phone, text, buttons, timestamp: Date.now() });
      console.log(`🔘 BUTTONS: "${text}" with ${buttons.length} buttons`);
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      await messageController.whatsappService.sendMessage(phone, message);
      await messageController.whatsappService.sendInteractiveButtons(phone, 'Was this helpful?', [
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
    getUserSession: async (userId) => {
      return { session_state: 'main_menu' }; // Simulate first time
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
    getRecentContext: async (userId) => {
      return [];
    }
  };
  
  const testUser = {
    id: 'test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('1. Testing initial "Chat with AI" button click...');
  sentMessages = [];
  
  // Simulate user clicking "Chat with AI" button
  await messageController.handleAIChat(testUser, 'chat_ai');
  
  console.log('\n2. Results after button click:');
  console.log(`   Total messages sent: ${sentMessages.length}`);
  
  const messagesSent = sentMessages.filter(m => m.type === 'message');
  const buttonsSent = sentMessages.filter(m => m.type === 'buttons');
  
  console.log(`   Text messages: ${messagesSent.length}`);
  console.log(`   Button sets: ${buttonsSent.length}`);
  
  // Check if instruction message was sent
  const hasInstructions = messagesSent.some(m => 
    m.message.includes('AI Chat Mode Activated')
  );
  
  // Check if there are any duplicate or system prompt messages
  const hasSystemPrompt = messagesSent.some(m => 
    m.message.includes('I will answer all health questions with accurate') ||
    m.message.includes('bullet points') ||
    m.message.includes('medical disclaimer')
  );
  
  console.log(`   ✅ Instructions sent: ${hasInstructions ? 'YES' : 'NO'}`);
  console.log(`   ❌ System prompt sent: ${hasSystemPrompt ? 'YES (BAD)' : 'NO (GOOD)'}`);
  console.log(`   ✅ Single message only: ${messagesSent.length === 1 ? 'YES' : 'NO'}`);
  
  console.log('\n3. Testing actual user question...');
  
  // Now test with an actual user question
  sentMessages = [];
  
  await messageController.handleAIChat(testUser, 'What are symptoms of fever?');
  
  const actualResponseMessages = sentMessages.filter(m => m.type === 'message');
  const actualResponseButtons = sentMessages.filter(m => m.type === 'buttons');
  
  console.log(`   Messages for user question: ${actualResponseMessages.length}`);
  console.log(`   Feedback buttons: ${actualResponseButtons.length}`);
  
  const hasActualResponse = actualResponseMessages.some(m => 
    !m.message.includes('AI Chat Mode Activated')
  );
  
  console.log(`   ✅ AI response generated: ${hasActualResponse ? 'YES' : 'NO'}`);
  
  // Final assessment
  const isFixed = hasInstructions && !hasSystemPrompt && messagesSent.length === 1 && hasActualResponse;
  
  if (isFixed) {
    console.log('\n🎉 SUCCESS: Duplicate response issue is FIXED!');
    console.log('✅ Button click sends only instructions');
    console.log('✅ No system prompt or duplicate messages');
    console.log('✅ User questions get proper AI responses');
    return true;
  } else {
    console.log('\n❌ FAILED: Duplicate response issue still exists');
    return false;
  }
}

// Run test
testDuplicateFix()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed - Duplicate issue is fixed');
    } else {
      console.log('\n❌ Tests failed - Still has duplicate responses');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
