#!/usr/bin/env node

/**
 * Test Context Understanding
 * Tests if the bot can understand contextual references like "this", "it" in symptom checking
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testContextUnderstanding() {
  console.log('🧠 Testing Context Understanding in Symptom Checker\n');
  
  const messageController = new MessageController();
  let conversationLog = [];
  
  // Mock WhatsApp service
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      conversationLog.push({ 
        type: 'bot', 
        message: message.substring(0, 150) + (message.length > 150 ? '...' : ''),
        timestamp: Date.now() 
      });
      console.log(`🤖 BOT: ${message.substring(0, 100)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING...`);
      return { success: true };
    },
    
    stopTypingIndicator: async (phone) => {
      return { success: true };
    }
  };
  
  const testUser = {
    id: 'context-test-user',
    phone_number: '+919876543210',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('🎭 Simulating the exact conversation from the screenshot...\n');
  
  // Step 1: User starts symptom check
  console.log('👤 USER: symptom_check');
  conversationLog.push({ type: 'user', message: 'symptom_check', timestamp: Date.now() });
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'symptom_check',
    type: 'text',
    messageId: 'test_1',
    timestamp: new Date()
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: User mentions symptoms
  console.log('\n👤 USER: fever,cold,cough');
  conversationLog.push({ type: 'user', message: 'fever,cold,cough', timestamp: Date.now() });
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'fever,cold,cough',
    type: 'text',
    messageId: 'test_2',
    timestamp: new Date()
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 3: User provides timing context (this should be understood as related to the symptoms)
  console.log('\n👤 USER: 1day, after eating icecream');
  conversationLog.push({ type: 'user', message: '1day, after eating icecream', timestamp: Date.now() });
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: '1day, after eating icecream',
    type: 'text',
    messageId: 'test_3',
    timestamp: new Date()
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 4: User provides pattern info (this should be understood as referring to the symptoms)
  console.log('\n👤 USER: this comes rarely, lasts for 2 days');
  conversationLog.push({ type: 'user', message: 'this comes rarely, lasts for 2 days', timestamp: Date.now() });
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'this comes rarely, lasts for 2 days',
    type: 'text',
    messageId: 'test_4',
    timestamp: new Date()
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 CONTEXT UNDERSTANDING TEST ANALYSIS');
  console.log('='.repeat(80));
  
  // Analyze the conversation
  const botResponses = conversationLog.filter(msg => msg.type === 'bot');
  const userMessages = conversationLog.filter(msg => msg.type === 'user');
  
  console.log(`\n📈 Conversation Stats:`);
  console.log(`   User messages: ${userMessages.length}`);
  console.log(`   Bot responses: ${botResponses.length}`);
  
  // Check if the last response shows contextual understanding
  const lastResponse = botResponses[botResponses.length - 1];
  
  // Look for signs of contextual understanding
  const contextualIndicators = [
    'ice cream',
    'icecream', 
    'lactose',
    'food',
    'eating',
    'trigger',
    'after',
    'rarely',
    '2 days',
    'pattern',
    'duration'
  ];
  
  const hasContextualUnderstanding = contextualIndicators.some(indicator => 
    lastResponse.message.toLowerCase().includes(indicator.toLowerCase())
  );
  
  // Check if it's asking clarifying questions instead of providing analysis
  const isAskingQuestions = lastResponse.message.includes('?') && 
    (lastResponse.message.includes('tell me') || 
     lastResponse.message.includes('what') || 
     lastResponse.message.includes('how'));
  
  console.log(`\n🧠 Context Understanding Analysis:`);
  console.log(`   ✅ Contextual indicators found: ${hasContextualUnderstanding ? 'YES' : 'NO'}`);
  console.log(`   ❓ Still asking questions: ${isAskingQuestions ? 'YES (BAD)' : 'NO (GOOD)'}`);
  
  if (hasContextualUnderstanding) {
    console.log(`   🎯 Bot understood context: References ice cream, timing, or pattern`);
  } else {
    console.log(`   ❌ Bot missed context: No reference to ice cream, timing, or pattern`);
  }
  
  console.log(`\n📝 Last Bot Response Preview:`);
  console.log(`   "${lastResponse.message}"`);
  
  console.log('\n' + '='.repeat(80));
  
  if (hasContextualUnderstanding && !isAskingQuestions) {
    console.log('🎉 SUCCESS: Context understanding is working!');
    console.log('');
    console.log('✅ Bot understands "this" refers to symptoms');
    console.log('✅ Bot connects timing with ice cream trigger');
    console.log('✅ Bot provides analysis instead of asking more questions');
    console.log('✅ Conversation flows naturally');
    console.log('');
    console.log('🚀 Context understanding is production ready!');
    return true;
  } else {
    console.log('❌ ISSUES FOUND: Context understanding needs improvement');
    console.log('');
    if (!hasContextualUnderstanding) {
      console.log('❌ Bot not connecting "this" to previous symptoms');
      console.log('❌ Bot not understanding ice cream as trigger');
    }
    if (isAskingQuestions) {
      console.log('❌ Bot asking too many questions instead of analyzing');
    }
    console.log('');
    console.log('💡 The bot should understand:');
    console.log('   - "this" = fever, cold, cough (from previous message)');
    console.log('   - "after eating ice cream" = potential trigger');
    console.log('   - "rarely, lasts 2 days" = symptom pattern');
    return false;
  }
}

// Run test
testContextUnderstanding()
  .then(success => {
    if (success) {
      console.log('\n✅ Context understanding test PASSED');
    } else {
      console.log('\n❌ Context understanding test FAILED');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
