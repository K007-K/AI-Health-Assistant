#!/usr/bin/env node

/**
 * Edge Cases and Error Scenarios Test
 * Tests for potential issues that might occur in production
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testEdgeCasesAndErrors() {
  console.log('🔍 Testing Edge Cases and Error Scenarios\n');
  
  const messageController = new MessageController();
  let interactions = [];
  let errors = [];
  let warnings = [];
  
  // Mock WhatsApp service with error simulation
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      if (message.length > 4096) {
        throw new Error('Message too long for WhatsApp API');
      }
      interactions.push({ type: 'message', phone, messageLength: message.length });
      return { success: true };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      if (buttons.length > 3) {
        throw new Error('Too many buttons - WhatsApp limit is 3');
      }
      interactions.push({ type: 'buttons', phone, buttonCount: buttons.length });
      return { success: true };
    },
    
    sendList: async (phone, text, sections, buttonText) => {
      const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);
      if (totalRows > 10) {
        throw new Error('Too many list items - WhatsApp limit is 10');
      }
      interactions.push({ type: 'list', phone, totalRows });
      return { success: true };
    },
    
    sendTypingIndicator: async () => ({ success: true }),
    stopTypingIndicator: async () => ({ success: true }),
    
    // Real service methods
    getMainMenuList: (language, scriptType) => {
      const languageKey = scriptType === 'transliteration' ? `${language}_trans` : language;
      return {
        sections: [{
          title: "📋 Main Menu",
          rows: [
            { id: 'chat_ai', title: '🤖 Chat with AI' },
            { id: 'symptom_check', title: '🩺 Check Symptoms' },
            { id: 'preventive_tips', title: '🌱 Health Tips' },
            { id: 'disease_alerts', title: '🦠 Disease Outbreak Alerts' },
            { id: 'change_language', title: '🌐 Change Language' }
          ]
        }]
      };
    },
    
    getPreventiveTipsList: (language) => ({
      sections: [{
        title: "🌱 Health Tips Categories",
        rows: [
          { id: 'learn_diseases', title: '🦠 Learn about Diseases' },
          { id: 'nutrition_hygiene', title: '🥗 Nutrition & Hygiene' },
          { id: 'exercise_lifestyle', title: '🏃 Exercise & Lifestyle' }
        ]
      }]
    }),
    
    getDiseaseAlertsButtons: () => [
      { id: 'view_active_diseases', title: '📊 View Active Diseases' },
      { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' }
    ]
  };
  
  // Mock services with potential failure scenarios
  let sessionFailureMode = false;
  let dbFailureMode = false;
  
  messageController.userService = {
    getOrCreateUser: async (phoneNumber) => {
      if (dbFailureMode) {
        throw new Error('Database connection failed');
      }
      return {
        id: 'test-user',
        phone_number: phoneNumber,
        preferred_language: 'en',
        script_preference: 'native',
        accessibility_mode: false
      };
    },
    getUserSession: async (userId) => {
      if (sessionFailureMode) {
        throw new Error('Session retrieval failed');
      }
      return { session_state: 'main_menu', context_data: {} };
    },
    updateUserSession: async (userId, state, contextData) => {
      if (sessionFailureMode) {
        throw new Error('Session update failed');
      }
      return { success: true };
    },
    hasCompletedOnboarding: async () => true
  };
  
  messageController.conversationService = {
    saveBotMessage: async () => ({ success: true }),
    saveUserMessage: async () => ({ success: true }),
    getRecentContext: async () => [],
    detectIntent: (content, state) => {
      // Simulate intent detection edge cases
      if (content.length > 1000) {
        return 'general'; // Very long messages default to general
      }
      if (content.includes('🤖💥')) {
        throw new Error('Invalid characters in message');
      }
      
      const intentMap = {
        'preventive_tips': 'preventive_tips',
        'disease_alerts': 'disease_alerts',
        'invalid_intent': 'unknown_intent'
      };
      return intentMap[content] || 'general';
    }
  };
  
  messageController.geminiService = {
    generateResponse: async (prompt, language, scriptType, context, accessibilityMode, maxRetries, conversationType) => {
      // Simulate AI service failures
      if (prompt.includes('FAIL_AI')) {
        throw new Error('AI service temporarily unavailable');
      }
      if (prompt.length > 10000) {
        throw new Error('Prompt too long for AI service');
      }
      
      // Simulate very long responses
      if (conversationType === 'long_response') {
        return 'A'.repeat(5000); // Very long response
      }
      
      return 'Test AI response that is appropriately sized';
    }
  };
  
  messageController.aiDiseaseMonitorService = {
    fetchNationwideDiseases: async () => {
      // Simulate service failures
      if (Math.random() < 0.1) { // 10% failure rate
        throw new Error('Disease monitoring service unavailable');
      }
      return 'Disease alert information';
    },
    fetchStateSpecificDiseases: async () => 'State-specific disease information'
  };
  
  // Test scenarios for edge cases
  const edgeCaseTests = [
    {
      name: 'Very Long Message Input',
      setup: () => {},
      test: async () => {
        const longMessage = 'A'.repeat(2000);
        await sendTestMessage(longMessage, 'Should handle very long messages gracefully');
      }
    },
    {
      name: 'Invalid Characters in Message',
      setup: () => {},
      test: async () => {
        await sendTestMessage('🤖💥', 'Should handle invalid characters without crashing');
      }
    },
    {
      name: 'Database Failure Scenario',
      setup: () => { dbFailureMode = true; },
      test: async () => {
        await sendTestMessage('Menu', 'Should handle database failures gracefully');
      },
      cleanup: () => { dbFailureMode = false; }
    },
    {
      name: 'Session Failure Scenario',
      setup: () => { sessionFailureMode = true; },
      test: async () => {
        await sendTestMessage('preventive_tips', 'Should handle session failures gracefully');
      },
      cleanup: () => { sessionFailureMode = false; }
    },
    {
      name: 'AI Service Failure',
      setup: () => {},
      test: async () => {
        await sendTestMessage('FAIL_AI What is fever?', 'Should handle AI service failures gracefully');
      }
    },
    {
      name: 'Unknown Intent Handling',
      setup: () => {},
      test: async () => {
        await sendTestMessage('invalid_intent', 'Should handle unknown intents gracefully');
      }
    },
    {
      name: 'Empty Message Input',
      setup: () => {},
      test: async () => {
        await sendTestMessage('', 'Should handle empty messages gracefully');
      }
    },
    {
      name: 'Special Characters and Emojis',
      setup: () => {},
      test: async () => {
        await sendTestMessage('🏥🩺💊 Health question with emojis', 'Should handle emojis and special characters');
      }
    },
    {
      name: 'Rapid Sequential Messages',
      setup: () => {},
      test: async () => {
        // Simulate rapid user input
        await sendTestMessage('Menu', 'First rapid message');
        await sendTestMessage('preventive_tips', 'Second rapid message');
        await sendTestMessage('nutrition_hygiene', 'Third rapid message');
      }
    },
    {
      name: 'Language Switching Mid-Conversation',
      setup: () => {},
      test: async () => {
        await sendTestMessage('preventive_tips', 'Start in English');
        await sendTestMessage('change_language', 'Switch language mid-conversation');
      }
    }
  ];
  
  // Helper function to send test messages and capture errors
  async function sendTestMessage(content, description) {
    try {
      const message = {
        phoneNumber: '+1234567890',
        content: content,
        type: 'text',
        messageId: `test_${Date.now()}`,
        timestamp: new Date()
      };
      
      await messageController.handleMessage(message);
      return { success: true };
    } catch (error) {
      errors.push({
        description,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
  
  // Run edge case tests
  for (const test of edgeCaseTests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log('─'.repeat(50));
    
    interactions = [];
    
    try {
      if (test.setup) test.setup();
      
      await test.test();
      
      console.log(`  ✅ Test completed - ${interactions.length} interactions`);
      
      if (test.cleanup) test.cleanup();
      
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
      errors.push({
        description: test.name,
        content: 'Test execution',
        error: error.message
      });
      
      if (test.cleanup) test.cleanup();
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Check for potential performance issues
  console.log('\n🔍 Checking for Performance Issues...');
  
  const performanceTests = [
    {
      name: 'Message Length Validation',
      check: () => {
        const longMessage = 'A'.repeat(5000);
        return longMessage.length > 4096 ? 'Messages over 4096 chars will fail WhatsApp API' : null;
      }
    },
    {
      name: 'Button Count Validation',
      check: () => {
        const buttons = Array(5).fill().map((_, i) => ({ id: `btn_${i}`, title: `Button ${i}` }));
        return buttons.length > 3 ? 'More than 3 buttons will fail WhatsApp API' : null;
      }
    },
    {
      name: 'List Item Validation',
      check: () => {
        const items = Array(15).fill().map((_, i) => ({ id: `item_${i}`, title: `Item ${i}` }));
        return items.length > 10 ? 'More than 10 list items will fail WhatsApp API' : null;
      }
    }
  ];
  
  performanceTests.forEach(test => {
    const issue = test.check();
    if (issue) {
      warnings.push({ test: test.name, issue });
      console.log(`  ⚠️  ${test.name}: ${issue}`);
    } else {
      console.log(`  ✅ ${test.name}: OK`);
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 EDGE CASES AND ERROR SCENARIOS TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n📈 Tests Run: ${edgeCaseTests.length}`);
  console.log(`❌ Errors Found: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.description}`);
      console.log(`   Content: "${error.content}"`);
      console.log(`   Error: ${error.error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning.test}: ${warning.issue}`);
    });
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n🎉 SUCCESS: All edge cases handled properly, no critical issues found!');
    return true;
  } else if (errors.length === 0) {
    console.log('\n✅ GOOD: No critical errors, only minor warnings to consider');
    return true;
  } else {
    console.log('\n❌ ISSUES FOUND: Critical errors need to be addressed');
    return false;
  }
}

// Run test
testEdgeCasesAndErrors()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
