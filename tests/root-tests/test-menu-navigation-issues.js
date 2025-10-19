#!/usr/bin/env node

/**
 * Menu Navigation Issues Test
 * Tests for specific real-world navigation problems
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testMenuNavigationIssues() {
  console.log('🔍 Testing Menu Navigation Issues\n');
  
  const messageController = new MessageController();
  let interactions = [];
  let errors = [];
  
  // Mock WhatsApp service to capture detailed interactions
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      interactions.push({ 
        type: 'message', 
        phone, 
        message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
        timestamp: Date.now() 
      });
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendInteractiveButtons: async (phone, text, buttons) => {
      interactions.push({ 
        type: 'buttons', 
        phone, 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        buttons: buttons.map(b => ({
          id: b.id || b.reply?.id,
          title: b.title || b.reply?.title
        })),
        timestamp: Date.now() 
      });
      return { success: true };
    },
    
    sendList: async (phone, text, sections, buttonText) => {
      interactions.push({ 
        type: 'list', 
        phone, 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        sections: sections.map(s => ({
          title: s.title,
          rows: s.rows.map(r => ({ id: r.id, title: r.title }))
        })),
        buttonText,
        timestamp: Date.now() 
      });
      return { success: true };
    },
    
    sendTypingIndicator: async () => ({ success: true }),
    stopTypingIndicator: async () => ({ success: true }),
    
    // Real implementations from the actual service
    getMainMenuList: (language, scriptType) => {
      const languageKey = scriptType === 'transliteration' ? `${language}_trans` : language;
      const menus = {
        en: {
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
        },
        te_trans: {
          sections: [{
            title: "📋 Main Menu",
            rows: [
              { id: 'chat_ai', title: '🤖 AI tho chat cheyandi', description: 'Aarogya prashnalu adigi margadarshanam pondandi' },
              { id: 'symptom_check', title: '🩺 Lakshanalu thanikhi cheyandi', description: 'Lakshanalanu vishleshinchi sifarasulu pondandi' },
              { id: 'preventive_tips', title: '🌱 Aarogya chitkalu', description: 'Vyadhulu, poshanalu & jeevanasheli gurinchi telusukondi' },
              { id: 'disease_alerts', title: '🦠 Vyadhi vyapthi hecharikalu', description: 'Churukaina vyadhulanu chudandi & hecharikalanu nirvahinchandhi' },
              { id: 'change_language', title: '🌐 Bhasha marchandi', description: 'Vere bhashaku marchandi' }
            ]
          }]
        }
      };
      return menus[languageKey] || menus.en;
    },
    
    getPreventiveTipsList: (language) => {
      const lists = {
        en: {
          sections: [{
            title: "🌱 Health Tips Categories",
            rows: [
              { id: 'learn_diseases', title: '🦠 Learn about Diseases', description: 'Common diseases, symptoms & prevention' },
              { id: 'nutrition_hygiene', title: '🥗 Nutrition & Hygiene', description: 'Healthy eating habits & cleanliness tips' },
              { id: 'exercise_lifestyle', title: '🏃 Exercise & Lifestyle', description: 'Physical activity & healthy living tips' }
            ]
          }]
        },
        te_trans: {
          sections: [{
            title: "🌱 Aarogya chitkala vargalu",
            rows: [
              { id: 'learn_diseases', title: '🦠 Vyadhula gurinchi telusukondi', description: 'Sadharana vyadhulu, lakshanalu & nivarana' },
              { id: 'nutrition_hygiene', title: '🥗 Poshana & parishubhrata', description: 'Aarogyakaramaina aahara alavatlalu & parishubhrata chitkalu' },
              { id: 'exercise_lifestyle', title: '🏃 Vyayamam & jeevanasheli', description: 'Sharirika karyakalapalu & aarogyakaramaina jeevana chitkalu' }
            ]
          }]
        }
      };
      return lists[language] || lists.en;
    },
    
    getDiseaseAlertsButtons: () => [
      { id: 'view_active_diseases', title: '📊 View Active Diseases' },
      { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' },
      { id: 'back_to_menu', title: '🏠 Main Menu' }
    ]
  };
  
  // Mock services with session state tracking
  let currentSessionState = 'main_menu';
  let currentContextData = {};
  
  messageController.userService = {
    getOrCreateUser: async (phoneNumber) => {
      return {
        id: 'test-user',
        phone_number: phoneNumber,
        preferred_language: 'te',
        script_preference: 'transliteration',
        accessibility_mode: false,
        consent_outbreak_alerts: false
      };
    },
    getUserSession: async (userId) => {
      return { 
        session_state: currentSessionState,
        context_data: currentContextData
      };
    },
    updateUserSession: async (userId, state, contextData) => {
      currentSessionState = state;
      if (contextData) {
        currentContextData = { ...currentContextData, ...contextData };
      }
      console.log(`📝 Session: ${userId} -> ${state} (${JSON.stringify(contextData || {})})`);
      return { success: true };
    },
    hasCompletedOnboarding: async () => true
  };
  
  messageController.conversationService = {
    saveBotMessage: async () => ({ success: true }),
    saveUserMessage: async () => ({ success: true }),
    getRecentContext: async () => [],
    detectIntent: (content, state) => {
      const intentMap = {
        'preventive_tips': 'preventive_tips',
        'disease_alerts': 'disease_alerts',
        'chat_ai': 'ai_chat',
        'symptom_check': 'symptom_check',
        'change_language': 'change_language',
        'learn_diseases': 'preventive_tips',
        'nutrition_hygiene': 'preventive_tips',
        'exercise_lifestyle': 'preventive_tips',
        'view_active_diseases': 'view_active_diseases',
        'turn_on_alerts': 'turn_on_alerts',
        'back_to_menu': 'back_to_menu'
      };
      return intentMap[content] || 'general';
    }
  };
  
  messageController.geminiService = {
    generateResponse: async (prompt, language, scriptType, context, accessibilityMode, maxRetries, conversationType) => {
      if (conversationType === 'nutrition_hygiene') {
        return '🥗 Aarogyakaramaina aahaaram kosam:\n\n• Rojuki 8 glasses neellu tagandi\n• Pachchi kooralu, pandlu tinandi\n• Processed food takkuva cheyandi\n\nIdi samanya aarogya salaaha. Vyaktigata salaaha kosam doctor ni kalavandi.';
      }
      return 'AI response in Telugu transliteration';
    }
  };
  
  messageController.aiDiseaseMonitorService = {
    fetchNationwideDiseases: async () => 'National disease alert in Telugu transliteration',
    fetchStateSpecificDiseases: async () => 'State disease alert in Telugu transliteration'
  };
  
  // Test scenarios that might reveal issues
  const testScenarios = [
    {
      name: 'Telugu Transliteration Main Menu',
      steps: [
        { action: 'send', content: 'Menu', expected: 'list with Telugu transliteration options' }
      ]
    },
    {
      name: 'Health Tips Navigation',
      steps: [
        { action: 'send', content: 'preventive_tips', expected: 'health tips categories list' },
        { action: 'send', content: 'nutrition_hygiene', expected: 'nutrition conversation mode' },
        { action: 'send', content: 'Aarogyam kosam emi tinalii?', expected: 'specific nutrition advice' }
      ]
    },
    {
      name: 'Disease Alerts Flow',
      steps: [
        { action: 'send', content: 'disease_alerts', expected: 'disease alerts buttons' },
        { action: 'send', content: 'view_active_diseases', expected: 'disease information' },
        { action: 'send', content: 'back_to_menu', expected: 'return to main menu' }
      ]
    },
    {
      name: 'Session State Persistence',
      steps: [
        { action: 'send', content: 'symptom_check', expected: 'symptom checker mode' },
        { action: 'send', content: 'Naku jwaraalu, tala noppi', expected: 'symptom analysis' }
      ]
    }
  ];
  
  // Run test scenarios
  for (const scenario of testScenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log('─'.repeat(50));
    
    interactions = [];
    currentSessionState = 'main_menu';
    currentContextData = {};
    
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      console.log(`\n  Step ${i + 1}: ${step.action} "${step.content}"`);
      console.log(`  Expected: ${step.expected}`);
      
      try {
        const message = {
          phoneNumber: '+1234567890',
          content: step.content,
          type: 'text',
          messageId: `test_${Date.now()}_${i}`,
          timestamp: new Date()
        };
        
        await messageController.handleMessage(message);
        
        const lastInteraction = interactions[interactions.length - 1];
        if (lastInteraction) {
          console.log(`  ✅ Result: ${lastInteraction.type} - ${lastInteraction.type === 'list' ? 'List with ' + lastInteraction.sections.length + ' sections' : lastInteraction.type === 'buttons' ? lastInteraction.buttons.length + ' buttons' : 'Message sent'}`);
          
          if (lastInteraction.type === 'list') {
            lastInteraction.sections.forEach(section => {
              console.log(`    📋 ${section.title}: ${section.rows.length} options`);
            });
          } else if (lastInteraction.type === 'buttons') {
            lastInteraction.buttons.forEach(btn => {
              console.log(`    🔘 ${btn.title} (${btn.id})`);
            });
          }
        } else {
          console.log(`  ⚠️  No interaction captured`);
        }
        
        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        errors.push({
          scenario: scenario.name,
          step: i + 1,
          content: step.content,
          error: error.message
        });
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 MENU NAVIGATION ISSUES TEST SUMMARY');
  console.log('='.repeat(70));
  
  if (errors.length === 0) {
    console.log('✅ No navigation issues found - all menu flows working correctly');
  } else {
    console.log(`❌ Found ${errors.length} navigation issues:`);
    errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.scenario} - Step ${error.step}`);
      console.log(`   Content: "${error.content}"`);
      console.log(`   Error: ${error.error}`);
    });
  }
  
  console.log(`\n📈 Total interactions captured: ${interactions.length}`);
  console.log(`🔄 Final session state: ${currentSessionState}`);
  
  return errors.length === 0;
}

// Run test
testMenuNavigationIssues()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
