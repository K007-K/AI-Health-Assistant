#!/usr/bin/env node

/**
 * Production Ready Test
 * Final comprehensive test to verify all features work correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testProductionReady() {
  console.log('🚀 Production Ready Test\n');
  
  const messageController = new MessageController();
  let allMessages = [];
  let messageCount = 0;
  
  // Track all interactions
  const originalSendMessage = messageController.whatsappService.sendMessage;
  messageController.whatsappService.sendMessage = async (phone, message) => {
    messageCount++;
    allMessages.push({ 
      id: messageCount, 
      type: 'message', 
      phone, 
      message: message.substring(0, 100) + '...', 
      timestamp: Date.now() 
    });
    console.log(`📱 MSG #${messageCount}: ${message.substring(0, 80)}...`);
    return originalSendMessage.call(messageController.whatsappService, phone, message);
  };
  
  const originalSendButtons = messageController.whatsappService.sendInteractiveButtons;
  messageController.whatsappService.sendInteractiveButtons = async (phone, text, buttons) => {
    allMessages.push({ 
      type: 'buttons', 
      phone, 
      text: text || '(empty)', 
      buttonCount: buttons.length,
      timestamp: Date.now() 
    });
    console.log(`🔘 BUTTONS: "${text || '(empty)'}" with ${buttons.length} buttons`);
    return originalSendButtons.call(messageController.whatsappService, phone, text, buttons);
  };
  
  const testUser = {
    id: 'prod-test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('1. Testing Complete User Journey...\n');
  
  // Step 1: User says Hi
  console.log('   Step 1: User greets bot');
  messageCount = 0;
  allMessages = [];
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'Hi',
    type: 'text',
    messageId: 'prod_test_1',
    timestamp: new Date()
  });
  
  const greetingMessages = messageCount;
  console.log(`   → Bot responses: ${greetingMessages}`);
  
  // Step 2: User clicks Health Tips
  console.log('\n   Step 2: User clicks Health Tips');
  messageCount = 0;
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'preventive_tips',
    type: 'text',
    messageId: 'prod_test_2',
    timestamp: new Date()
  });
  
  const healthTipsMessages = messageCount;
  console.log(`   → Bot responses: ${healthTipsMessages}`);
  
  // Step 3: User clicks Disease Alerts
  console.log('\n   Step 3: User clicks Disease Alerts');
  messageCount = 0;
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'disease_alerts',
    type: 'text',
    messageId: 'prod_test_3',
    timestamp: new Date()
  });
  
  const diseaseAlertsMessages = messageCount;
  console.log(`   → Bot responses: ${diseaseAlertsMessages}`);
  
  // Step 4: User starts AI Chat
  console.log('\n   Step 4: User starts AI Chat');
  messageCount = 0;
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'chat_ai',
    type: 'text',
    messageId: 'prod_test_4',
    timestamp: new Date()
  });
  
  const aiChatInitMessages = messageCount;
  console.log(`   → Bot responses: ${aiChatInitMessages}`);
  
  // Step 5: User asks AI question
  console.log('\n   Step 5: User asks AI question');
  messageCount = 0;
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'What are symptoms of fever?',
    type: 'text',
    messageId: 'prod_test_5',
    timestamp: new Date()
  });
  
  const aiResponseMessages = messageCount;
  console.log(`   → Bot responses: ${aiResponseMessages}`);
  
  // Step 6: Check for feedback buttons
  const hasFeedbackButtons = allMessages.some(msg => 
    msg.type === 'buttons' && msg.buttonCount === 2 && msg.text === '(empty)'
  );
  
  console.log(`   → Feedback buttons: ${hasFeedbackButtons ? 'YES' : 'NO'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 PRODUCTION READY TEST RESULTS');
  console.log('='.repeat(60));
  
  // Check each step
  const results = {
    greeting: greetingMessages === 1,
    healthTips: healthTipsMessages === 1,
    diseaseAlerts: diseaseAlertsMessages === 1,
    aiChatInit: aiChatInitMessages === 1,
    aiResponse: aiResponseMessages === 1,
    feedbackButtons: hasFeedbackButtons
  };
  
  console.log(`✅ Greeting Response: ${results.greeting ? 'SINGLE' : 'DUPLICATE'} (${greetingMessages} messages)`);
  console.log(`✅ Health Tips Submenu: ${results.healthTips ? 'SINGLE' : 'DUPLICATE'} (${healthTipsMessages} messages)`);
  console.log(`✅ Disease Alerts Submenu: ${results.diseaseAlerts ? 'SINGLE' : 'DUPLICATE'} (${diseaseAlertsMessages} messages)`);
  console.log(`✅ AI Chat Initialization: ${results.aiChatInit ? 'SINGLE' : 'DUPLICATE'} (${aiChatInitMessages} messages)`);
  console.log(`✅ AI Response: ${results.aiResponse ? 'SINGLE' : 'DUPLICATE'} (${aiResponseMessages} messages)`);
  console.log(`✅ Meta-Style Feedback: ${results.feedbackButtons ? 'WORKING' : 'MISSING'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 SUCCESS: Production Ready!');
    console.log('');
    console.log('✅ No duplicate messages');
    console.log('✅ All submenus working');
    console.log('✅ Meta-style feedback buttons');
    console.log('✅ AI chat working properly');
    console.log('✅ Complete user journey functional');
    console.log('');
    console.log('🚀 READY FOR DEPLOYMENT!');
    return true;
  } else {
    console.log('❌ FAILED: Issues found');
    console.log('');
    console.log('Fix the failing components before deployment.');
    return false;
  }
}

// Run test
testProductionReady()
  .then(success => {
    if (success) {
      console.log('\n✅ Production ready test PASSED');
    } else {
      console.log('\n❌ Production ready test FAILED');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
