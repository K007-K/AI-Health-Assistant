#!/usr/bin/env node

/**
 * Test Menu and Feedback Style Fix
 * Verify feedback is removed from menu and buttons are Meta-style
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const WhatsAppService = require('./src/services/whatsappService');
const MessageController = require('./src/controllers/messageController');

async function testMenuAndFeedbackFix() {
  console.log('🧪 Testing Menu and Feedback Style Fix\n');
  
  const whatsappService = new WhatsAppService();
  const messageController = new MessageController();
  let sentMessages = [];
  
  // Mock WhatsApp service to capture messages
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      sentMessages.push({ type: 'message', phone, message });
      console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      sentMessages.push({ type: 'buttons', phone, text, buttons });
      console.log(`🔘 BUTTONS: "${text}" with ${buttons.length} buttons`);
      buttons.forEach(btn => console.log(`   - ${btn.title} (${btn.id})`));
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      // This should send message + feedback buttons with no text (Meta style)
      await messageController.whatsappService.sendMessage(phone, message);
      await messageController.whatsappService.sendInteractiveButtons(phone, '', [
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
  
  console.log('1. Testing main menu list (should NOT have feedback)...');
  
  // Test main menu list
  const mainMenuList = whatsappService.getMainMenuList('en');
  const menuItems = mainMenuList.sections[0].rows;
  
  console.log('\n   📋 Main menu items:');
  menuItems.forEach(item => {
    console.log(`   - ${item.title} (${item.id})`);
  });
  
  const hasFeedback = menuItems.some(item => 
    item.id === 'feedback' || item.title.includes('Feedback')
  );
  
  console.log(`\n   ❌ Has feedback in menu: ${hasFeedback ? 'YES (BAD)' : 'NO (GOOD)'}`);
  console.log(`   ✅ Menu items count: ${menuItems.length}`);
  
  console.log('\n2. Testing Meta-style feedback buttons...');
  sentMessages = [];
  
  const testUser = {
    id: 'test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  // Test sending message with feedback
  await messageController.sendMessageWithTypingAndFeedback(
    testUser.phone_number,
    'Hello! This is a test message.',
    true
  );
  
  console.log('\n   📊 Feedback button analysis:');
  
  const buttonMessages = sentMessages.filter(m => m.type === 'buttons');
  const feedbackButtonMessage = buttonMessages.find(m => 
    m.buttons && m.buttons.some(btn => btn.id === 'feedback_good')
  );
  
  if (feedbackButtonMessage) {
    console.log(`   ✅ Feedback buttons found: YES`);
    console.log(`   📝 Button text: "${feedbackButtonMessage.text}"`);
    console.log(`   👍👎 Button count: ${feedbackButtonMessage.buttons.length}`);
    
    const isMetaStyle = feedbackButtonMessage.text === '';
    console.log(`   🎨 Meta style (no text): ${isMetaStyle ? 'YES (GOOD)' : 'NO (BAD)'}`);
    
    console.log(`   🔘 Button details:`);
    feedbackButtonMessage.buttons.forEach(btn => {
      console.log(`      - ${btn.title} (${btn.id})`);
    });
  } else {
    console.log(`   ❌ Feedback buttons found: NO`);
  }
  
  // Final assessment
  const menuFixed = !hasFeedback;
  const feedbackStyleFixed = feedbackButtonMessage && feedbackButtonMessage.text === '';
  
  console.log('\n3. Final Results:');
  console.log(`   ✅ Feedback removed from menu: ${menuFixed ? 'YES' : 'NO'}`);
  console.log(`   ✅ Meta-style feedback buttons: ${feedbackStyleFixed ? 'YES' : 'NO'}`);
  
  if (menuFixed && feedbackStyleFixed) {
    console.log('\n🎉 SUCCESS: Both issues are FIXED!');
    console.log('✅ Main menu no longer has feedback option');
    console.log('✅ Feedback buttons are Meta-style (no text, just icons)');
    return true;
  } else {
    console.log('\n❌ FAILED: Some issues still exist');
    return false;
  }
}

// Run test
testMenuAndFeedbackFix()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed - Menu and feedback style fixed');
    } else {
      console.log('\n❌ Tests failed - Issues still exist');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
