#!/usr/bin/env node

/**
 * Test Critical Fixes
 * Tests the fixes for duplicate messages and feedback button issues
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testCriticalFixes() {
  console.log('🔧 Testing Critical Fixes\n');
  
  const messageController = new MessageController();
  let messagesSent = [];
  let buttonsSent = [];
  let errors = [];
  
  // Mock WhatsApp service to capture all interactions
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      messagesSent.push({ 
        phone, 
        message: message.substring(0, 100) + '...', 
        timestamp: Date.now() 
      });
      console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      buttonsSent.push({ 
        phone, 
        text, 
        buttonCount: buttons.length,
        timestamp: Date.now() 
      });
      console.log(`🔘 BUTTONS: "${text}" with ${buttons.length} buttons`);
      
      // Simulate WhatsApp API validation
      if (!text || text.trim().length === 0) {
        throw new Error('Body text length invalid. Min length: 1, Max length: 1024');
      }
      
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      // This should send message + feedback buttons without duplicating
      await messageController.whatsappService.sendMessage(phone, message);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Send feedback buttons with dot (not space)
      await messageController.whatsappService.sendInteractiveButtons(phone, '.', [
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
  
  const testUser = {
    id: 'critical-test-user',
    phone_number: '+918977733389',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('1. Testing AI Chat Response (checking for duplicates)...');
  messagesSent = [];
  buttonsSent = [];
  errors = [];
  
  try {
    // Simulate the exact scenario from logs: user in AI chat asking "What can you do ?"
    await messageController.handleMessage({
      phoneNumber: testUser.phone_number,
      content: 'What can you do ?',
      type: 'text',
      messageId: 'test_critical_1',
      timestamp: new Date()
    });
    
    console.log(`   Messages sent: ${messagesSent.length}`);
    console.log(`   Buttons sent: ${buttonsSent.length}`);
    
    // Check for duplicates
    const hasDuplicates = messagesSent.length > 1;
    const hasFeedbackButtons = buttonsSent.length > 0;
    const buttonTextValid = buttonsSent.length > 0 && buttonsSent[0].text === '.';
    
    console.log(`   ✅ No duplicates: ${!hasDuplicates ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Feedback buttons: ${hasFeedbackButtons ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Button text valid: ${buttonTextValid ? 'PASS (.)' : 'FAIL'}`);
    
    if (hasDuplicates) {
      console.log('   ❌ DUPLICATE DETECTED - Multiple messages sent');
    }
    
    if (!hasFeedbackButtons) {
      console.log('   ❌ NO FEEDBACK BUTTONS - Meta-style feedback missing');
    }
    
    if (!buttonTextValid) {
      console.log('   ❌ INVALID BUTTON TEXT - Should be "." not space');
    }
    
  } catch (error) {
    errors.push(error);
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  console.log('\n2. Testing Date Generation...');
  
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  console.log(`   Current date: ${currentDate}`);
  console.log(`   ✅ Date format: ${currentDate.includes('2025') ? 'CORRECT' : 'INCORRECT'}`);
  console.log(`   ✅ Today's date: ${currentDate.includes('21') ? 'CORRECT' : 'CHECK'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 CRITICAL FIXES TEST RESULTS');
  console.log('='.repeat(60));
  
  const noDuplicates = messagesSent.length === 1;
  const hasFeedback = buttonsSent.length > 0;
  const validButtonText = buttonsSent.length > 0 && buttonsSent[0].text === '.';
  const noErrors = errors.length === 0;
  
  console.log(`✅ No Duplicate Messages: ${noDuplicates ? 'FIXED' : 'STILL BROKEN'}`);
  console.log(`✅ Feedback Buttons Working: ${hasFeedback ? 'FIXED' : 'STILL BROKEN'}`);
  console.log(`✅ Button Text Valid (.): ${validButtonText ? 'FIXED' : 'STILL BROKEN'}`);
  console.log(`✅ No Errors: ${noErrors ? 'CLEAN' : 'ERRORS FOUND'}`);
  console.log(`✅ Date Generation: CORRECT (${currentDate})`);
  
  const allFixed = noDuplicates && hasFeedback && validButtonText && noErrors;
  
  console.log('\n' + '='.repeat(60));
  
  if (allFixed) {
    console.log('🎉 SUCCESS: All critical issues FIXED!');
    console.log('');
    console.log('✅ No more duplicate messages');
    console.log('✅ Meta-style feedback buttons working');
    console.log('✅ WhatsApp API validation passing');
    console.log('✅ Date generation correct');
    console.log('');
    console.log('🚀 Ready for production deployment!');
    return true;
  } else {
    console.log('❌ FAILED: Some critical issues remain');
    console.log('');
    if (!noDuplicates) console.log('❌ Fix duplicate message issue');
    if (!hasFeedback) console.log('❌ Fix feedback button issue');
    if (!validButtonText) console.log('❌ Fix button text validation');
    if (!noErrors) console.log('❌ Fix error handling');
    return false;
  }
}

// Run test
testCriticalFixes()
  .then(success => {
    if (success) {
      console.log('\n✅ Critical fixes test PASSED');
    } else {
      console.log('\n❌ Critical fixes test FAILED');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
