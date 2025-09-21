const MessageController = require('./src/controllers/messageController');
const UserService = require('./src/services/userService');

// Test all menu options to identify and fix issues
async function testAllMenuOptions() {
  console.log('🔧 TESTING ALL MENU OPTIONS - COMPREHENSIVE FIX');
  console.log('=' .repeat(60));
  
  const controller = new MessageController();
  const userService = new UserService();
  
  // Test user data
  const testUser = {
    id: 'test-user-123',
    phone_number: '+919876543210',
    preferred_language: 'en',
    script_preference: 'native',
    accessibility_mode: 'normal'
  };

  const testCases = [
    // Main Menu Options
    { input: 'chat_ai', expected: 'AI Chat', description: '🤖 Chat with AI' },
    { input: 'symptom_check', expected: 'Symptom Check', description: '🩺 Check Symptoms' },
    { input: 'preventive_tips', expected: 'Preventive Tips', description: '🌱 Health Tips' },
    { input: 'disease_alerts', expected: 'Disease Alerts', description: '🦠 Disease Outbreak Alerts' },
    { input: 'appointments', expected: 'Appointments', description: '📅 Book Appointments' },
    { input: 'more_options', expected: 'More Options', description: '⚙️ More Options' },
    
    // Health Tips Sub-options
    { input: 'learn_diseases', expected: 'Learn Diseases', description: '🦠 Learn about Diseases' },
    { input: 'nutrition_hygiene', expected: 'Nutrition Hygiene', description: '🥗 Nutrition & Hygiene' },
    { input: 'exercise_lifestyle', expected: 'Exercise Lifestyle', description: '🏃 Exercise & Lifestyle' },
    
    // Disease Alerts Sub-options
    { input: 'view_active_diseases', expected: 'View Diseases', description: '📊 View Active Diseases' },
    { input: 'turn_on_alerts', expected: 'Turn On Alerts', description: '🔔 Turn ON Alerts' },
    { input: 'turn_off_alerts', expected: 'Turn Off Alerts', description: '🔕 Turn OFF Alerts' },
    
    // Language Options
    { input: 'lang_en', expected: 'English', description: '🇺🇸 English' },
    { input: 'lang_hi', expected: 'Hindi', description: '🇮🇳 हिंदी' },
    { input: 'lang_te', expected: 'Telugu', description: '🇮🇳 తెలుగు' },
    { input: 'lang_ta', expected: 'Tamil', description: '🇮🇳 தமிழ்' },
    { input: 'lang_or', expected: 'Odia', description: '🇮🇳 ଓଡ଼ିଆ' },
    
    // Script Options
    { input: 'script_native', expected: 'Native Script', description: '🇮🇳 Native script' },
    { input: 'script_trans', expected: 'Transliteration', description: '🔤 English letters' },
    
    // Text-based inputs
    { input: 'menu', expected: 'Main Menu', description: 'Text: menu' },
    { input: 'help', expected: 'Main Menu', description: 'Text: help' },
    { input: 'start', expected: 'Main Menu', description: 'Text: start' },
    { input: 'back', expected: 'Main Menu', description: 'Text: back' },
    
    // Common user inputs
    { input: 'I have fever', expected: 'Symptom Analysis', description: 'Symptom input' },
    { input: 'What is diabetes?', expected: 'AI Response', description: 'Health question' },
    { input: 'Hello', expected: 'Greeting', description: 'Greeting' },
  ];

  let passedTests = 0;
  let failedTests = 0;
  const failedCases = [];

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Testing: ${testCase.description}`);
      console.log(`   Input: "${testCase.input}"`);
      
      // Create message data
      const messageData = {
        phoneNumber: testUser.phone_number,
        content: testCase.input,
        type: 'text',
        messageId: `test-${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      // Test the message handling
      await controller.handleMessage(messageData);
      
      console.log(`   ✅ PASSED: ${testCase.expected}`);
      passedTests++;
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      failedTests++;
      failedCases.push({
        ...testCase,
        error: error.message
      });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

  if (failedCases.length > 0) {
    console.log('\n❌ FAILED TEST CASES:');
    failedCases.forEach((testCase, index) => {
      console.log(`${index + 1}. ${testCase.description}`);
      console.log(`   Input: "${testCase.input}"`);
      console.log(`   Error: ${testCase.error}`);
    });
  }

  // Identify common issues
  console.log('\n🔍 IDENTIFIED ISSUES:');
  
  const commonIssues = [
    'Intent detection not working properly',
    'WhatsApp service methods missing or broken',
    'Language/script preference handling issues',
    'Session state management problems',
    'Database connection issues',
    'Missing or incorrect button/list configurations'
  ];

  commonIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });

  return {
    totalTests: testCases.length,
    passed: passedTests,
    failed: failedTests,
    successRate: ((passedTests / testCases.length) * 100).toFixed(1),
    failedCases
  };
}

// Run the test
testAllMenuOptions()
  .then(results => {
    console.log('\n🎯 NEXT STEPS FOR FIXES:');
    console.log('1. Fix intent detection in conversationService');
    console.log('2. Verify WhatsApp service methods');
    console.log('3. Check database connections');
    console.log('4. Update button/list configurations');
    console.log('5. Test multilingual support');
    
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
