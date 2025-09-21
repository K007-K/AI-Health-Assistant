#!/usr/bin/env node

/**
 * Test Current Implementation
 * Simple test to verify inline feedback is working
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testInlineFeedback() {
  console.log('🧪 Testing Current Inline Feedback Implementation\n');
  
  const messageController = new MessageController();
  let sentMessages = [];
  
  // Mock WhatsApp service to capture messages
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      sentMessages.push({ type: 'message', phone, message });
      console.log(`📱 MESSAGE: ${message}`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      sentMessages.push({ type: 'buttons', phone, text, buttons });
      console.log(`🔘 BUTTONS: "${text}" with ${buttons.length} buttons`);
      buttons.forEach(btn => console.log(`   - ${btn.title} (${btn.id})`));
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      // This should send message + feedback buttons
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
    },
    
    getInlineFeedbackButtons: () => [
      { id: 'feedback_good', title: '👍' },
      { id: 'feedback_bad', title: '👎' }
    ]
  };
  
  const testUser = {
    id: 'test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('1. Testing sendMessageWithTypingAndFeedback...');
  sentMessages = [];
  
  await messageController.sendMessageWithTypingAndFeedback(
    testUser.phone_number,
    'Hello! This is a test message with inline feedback.',
    true
  );
  
  console.log('\n2. Results:');
  console.log(`   Messages sent: ${sentMessages.filter(m => m.type === 'message').length}`);
  console.log(`   Button sets sent: ${sentMessages.filter(m => m.type === 'buttons').length}`);
  
  const hasMessage = sentMessages.some(m => m.type === 'message');
  const hasButtons = sentMessages.some(m => m.type === 'buttons' && 
    m.buttons && m.buttons.some(btn => btn.id === 'feedback_good'));
  
  console.log(`   ✅ Message sent: ${hasMessage ? 'YES' : 'NO'}`);
  console.log(`   👍👎 Feedback buttons: ${hasButtons ? 'YES' : 'NO'}`);
  
  console.log('\n3. Testing inline feedback handling...');
  sentMessages = [];
  
  await messageController.handleInlineFeedback(testUser, 'feedback_good', 'test_msg_123');
  
  const confirmationSent = sentMessages.some(m => 
    m.type === 'message' && m.message.includes('Feedback submitted to Helic')
  );
  
  console.log(`   ✅ Confirmation sent: ${confirmationSent ? 'YES' : 'NO'}`);
  
  if (hasMessage && hasButtons && confirmationSent) {
    console.log('\n🎉 SUCCESS: Inline feedback system is working!');
    return true;
  } else {
    console.log('\n❌ FAILED: Some components are not working');
    return false;
  }
}

// Run test
testInlineFeedback()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed - Implementation is working');
    } else {
      console.log('\n❌ Tests failed - Need to fix implementation');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
