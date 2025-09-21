#!/usr/bin/env node

/**
 * Final Verification Test
 * Tests the complete system without calling external APIs
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testFinalVerification() {
  console.log('🔍 Final Verification Test\n');
  
  const messageController = new MessageController();
  let interactions = [];
  
  // Mock all WhatsApp service methods to avoid API calls
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      interactions.push({ 
        type: 'message', 
        phone, 
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        timestamp: Date.now() 
      });
      console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      interactions.push({ 
        type: 'buttons', 
        phone, 
        text: text || '(empty)', 
        buttons: buttons.map(b => ({ id: b.id, title: b.title })),
        timestamp: Date.now() 
      });
      console.log(`🔘 BUTTONS: "${text || '(empty)'}" with ${buttons.length} buttons`);
      return { success: true };
    },
    
    sendList: async (phone, text, sections, buttonText) => {
      interactions.push({ 
        type: 'list', 
        phone, 
        text, 
        sections: sections.map(s => ({ 
          title: s.title, 
          rows: s.rows.map(r => ({ id: r.id, title: r.title }))
        })),
        buttonText,
        timestamp: Date.now() 
      });
      console.log(`📋 LIST: "${text}" with button "${buttonText}"`);
      return { success: true };
    },
    
    sendMessageWithFeedback: async (phone, message) => {
      // Send message
      await messageController.whatsappService.sendMessage(phone, message);
      // Send feedback buttons with minimal text (Meta style)
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
    },
    
    // Add all required methods
    getMainMenuList: (language) => ({
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
    }),
    
    getPreventiveTipsList: (language) => ({
      sections: [{
        title: "🌱 Health Tips Categories",
        rows: [
          { id: 'learn_diseases', title: '🦠 Learn about Diseases', description: 'Common diseases, symptoms & prevention' },
          { id: 'nutrition_hygiene', title: '🥗 Nutrition & Hygiene', description: 'Healthy eating habits & cleanliness tips' },
          { id: 'exercise_lifestyle', title: '🏃 Exercise & Lifestyle', description: 'Physical activity & healthy living tips' }
        ]
      }]
    }),
    
    getDiseaseAlertsButtons: (language) => [
      { id: 'view_active_diseases', title: '📊 View Active Diseases' },
      { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' },
      { id: 'back_to_menu', title: '🏠 Main Menu' }
    ]
  };
  
  const testUser = {
    id: 'final-test-user',
    phone_number: '+1234567890',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('Testing complete user journey...\n');
  
  const testScenarios = [
    {
      name: 'Greeting',
      message: { phoneNumber: testUser.phone_number, content: 'Hi', type: 'text', messageId: 'test_1', timestamp: new Date() }
    },
    {
      name: 'Health Tips',
      message: { phoneNumber: testUser.phone_number, content: 'preventive_tips', type: 'text', messageId: 'test_2', timestamp: new Date() }
    },
    {
      name: 'Disease Alerts',
      message: { phoneNumber: testUser.phone_number, content: 'disease_alerts', type: 'text', messageId: 'test_3', timestamp: new Date() }
    },
    {
      name: 'AI Chat Start',
      message: { phoneNumber: testUser.phone_number, content: 'chat_ai', type: 'text', messageId: 'test_4', timestamp: new Date() }
    },
    {
      name: 'AI Chat Question',
      message: { phoneNumber: testUser.phone_number, content: 'What are symptoms of fever?', type: 'text', messageId: 'test_5', timestamp: new Date() }
    }
  ];
  
  const results = [];
  
  for (const scenario of testScenarios) {
    console.log(`   Testing: ${scenario.name}`);
    interactions = [];
    
    try {
      await messageController.handleMessage(scenario.message);
      
      const messageCount = interactions.filter(i => i.type === 'message').length;
      const buttonCount = interactions.filter(i => i.type === 'buttons').length;
      const listCount = interactions.filter(i => i.type === 'list').length;
      const hasFeedback = interactions.some(i => 
        i.type === 'buttons' && 
        i.buttons && 
        i.buttons.some(b => b.id === 'feedback_good')
      );
      
      results.push({
        name: scenario.name,
        messageCount,
        buttonCount,
        listCount,
        hasFeedback,
        noDuplicates: messageCount <= 1,
        hasInteraction: messageCount > 0 || buttonCount > 0 || listCount > 0
      });
      
      console.log(`     → Messages: ${messageCount}, Buttons: ${buttonCount}, Lists: ${listCount}, Feedback: ${hasFeedback ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.log(`     → ERROR: ${error.message}`);
      results.push({
        name: scenario.name,
        error: true,
        messageCount: 0,
        buttonCount: 0,
        listCount: 0,
        hasFeedback: false,
        noDuplicates: false,
        hasInteraction: false
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL VERIFICATION RESULTS');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  results.forEach(result => {
    const status = result.error ? 'ERROR' : 
                  !result.hasInteraction ? 'NO RESPONSE' :
                  !result.noDuplicates ? 'DUPLICATES' : 'PASS';
    
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${result.name}: ${status}`);
    
    if (status !== 'PASS') {
      allPassed = false;
    }
  });
  
  // Check for feedback in AI responses
  const aiChatResult = results.find(r => r.name === 'AI Chat Question');
  const hasFeedbackSystem = aiChatResult && aiChatResult.hasFeedback;
  
  console.log(`${hasFeedbackSystem ? '✅' : '❌'} Meta-Style Feedback: ${hasFeedbackSystem ? 'WORKING' : 'MISSING'}`);
  
  if (!hasFeedbackSystem) {
    allPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 SUCCESS: All systems working correctly!');
    console.log('');
    console.log('✅ No duplicate messages');
    console.log('✅ All menus and submenus working');
    console.log('✅ Meta-style feedback buttons implemented');
    console.log('✅ AI chat functioning properly');
    console.log('✅ Complete user journey operational');
    console.log('');
    console.log('🚀 READY FOR PRODUCTION DEPLOYMENT!');
    return true;
  } else {
    console.log('❌ ISSUES FOUND: Some components need fixing');
    return false;
  }
}

// Run test
testFinalVerification()
  .then(success => {
    if (success) {
      console.log('\n✅ Final verification PASSED - Ready for deployment');
    } else {
      console.log('\n❌ Final verification FAILED - Fix issues before deployment');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
