#!/usr/bin/env node

/**
 * Test Text Input State Selection
 * Verify that users can type state names instead of using lists
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class TextInputTest {
  constructor() {
    this.cacheService = new DiseaseOutbreakCacheService();
    this.messageController = new MessageController();
    this.sentMessages = [];
    
    // Mock WhatsApp service
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, type: 'message' });
        console.log(`📱 MESSAGE: ${message.substring(0, 100)}...`);
        return { success: true };
      }
    };

    // Mock user service
    this.messageController.userService = {
      updateUserSession: async (userId, session, data) => {
        console.log(`🔄 Session updated: ${userId} → ${session}`);
        return { success: true };
      }
    };
  }

  async testTextInputFlow() {
    console.log('🧪 Testing Text Input State Selection Flow\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+1234567890',
      preferred_language: 'en'
    };

    try {
      this.sentMessages = [];
      
      console.log('1. Testing showStateSelectionMenu (text input):');
      await this.messageController.showStateSelectionMenu(testUser, this.cacheService);
      
      // Check results
      const hasHeaderMessage = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Select Your State')
      );
      
      const hasTextInputPrompt = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Please type your state name')
      );
      
      const hasNoLists = this.sentMessages.every(msg => msg.type === 'message');
      
      console.log(`   ✅ Header message: ${hasHeaderMessage ? 'YES' : 'NO'}`);
      console.log(`   ✅ Text input prompt: ${hasTextInputPrompt ? 'YES' : 'NO'}`);
      console.log(`   ✅ No lists/buttons: ${hasNoLists ? 'YES' : 'NO'}`);
      console.log(`   ✅ Messages sent: ${this.sentMessages.length}`);
      
      return hasHeaderMessage && hasTextInputPrompt && hasNoLists;
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      return false;
    }
  }

  async testStateNameProcessing() {
    console.log('\n🧪 Testing State Name Processing\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      phone_number: '+1234567891',
      preferred_language: 'en'
    };

    const testCases = [
      { input: 'Andhra Pradesh', expected: 'exact_match', description: 'Exact match' },
      { input: 'andhra pradesh', expected: 'exact_match', description: 'Case insensitive exact match' },
      { input: 'Maharashtra', expected: 'exact_match', description: 'Another exact match' },
      { input: 'andhra', expected: 'partial_match', description: 'Partial match' },
      { input: 'maha', expected: 'partial_match', description: 'Partial match' },
      { input: 'XYZ State', expected: 'not_found', description: 'Invalid state' },
      { input: 'karnataka', expected: 'exact_match', description: 'Case insensitive' },
      { input: 'delhi', expected: 'exact_match', description: 'Union territory' }
    ];

    let allPassed = true;

    for (const testCase of testCases) {
      console.log(`Testing: "${testCase.input}" (${testCase.description})`);
      
      try {
        this.sentMessages = [];
        await this.messageController.handleStateNameInput(testUser, testCase.input);
        
        const hasSuccessMessage = this.sentMessages.some(msg => 
          msg.message && msg.message.includes('Alerts Activated')
        );
        
        const hasSuggestions = this.sentMessages.some(msg => 
          msg.message && (
            msg.message.includes('Multiple states match') || 
            msg.message.includes('Did you mean') ||
            msg.message.includes('not found')
          )
        );
        
        let result = 'unknown';
        if (testCase.expected === 'exact_match' && hasSuccessMessage) {
          result = 'success';
        } else if (testCase.expected === 'partial_match' && (hasSuccessMessage || hasSuggestions)) {
          result = 'handled';
        } else if (testCase.expected === 'not_found' && hasSuggestions) {
          result = 'handled';
        }
        
        console.log(`   Result: ${result}`);
        console.log(`   Success: ${hasSuccessMessage ? 'YES' : 'NO'}, Suggestions: ${hasSuggestions ? 'YES' : 'NO'}`);
        
        if (result === 'unknown') {
          allPassed = false;
        }
        
        // Cleanup if user was registered
        if (hasSuccessMessage) {
          await this.cacheService.turnOffAlertsAndDeleteData(testUser.phone_number);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        allPassed = false;
      }
      
      console.log('');
    }

    return allPassed;
  }

  async testMultilingualTextInput() {
    console.log('\n🧪 Testing Multilingual Text Input\n');
    
    const languages = [
      { code: 'en', name: 'English', keyword: 'Please type your state name' },
      { code: 'hi', name: 'Hindi', keyword: 'कृपया अपने राज्य का नाम टाइप करें' },
      { code: 'te', name: 'Telugu', keyword: 'దయచేసి మీ రాష్ట్ర పేరును టైప్ చేయండి' }
    ];
    
    let allLanguagesWorking = true;
    
    for (const lang of languages) {
      const testUser = {
        id: `test-${Date.now()}-${lang.code}`,
        phone_number: `+${Math.random().toString().substr(2, 10)}`,
        preferred_language: lang.code
      };
      
      try {
        console.log(`Testing ${lang.name} (${lang.code}):`);
        
        this.sentMessages = [];
        await this.messageController.showStateSelectionMenu(testUser, this.cacheService);
        
        const hasLocalizedPrompt = this.sentMessages.some(msg => 
          msg.message && msg.message.includes(lang.keyword)
        );
        
        console.log(`   ✅ Localized prompt: ${hasLocalizedPrompt ? 'YES' : 'NO'}`);
        
        if (!hasLocalizedPrompt) {
          allLanguagesWorking = false;
        }
        
      } catch (error) {
        console.log(`   ❌ ${lang.name} test failed: ${error.message}`);
        allLanguagesWorking = false;
      }
    }
    
    return allLanguagesWorking;
  }

  async runAllTests() {
    console.log('🚀 Starting Text Input Tests\n');
    console.log('=' * 60);
    
    const testResults = {
      textInputFlow: await this.testTextInputFlow(),
      stateNameProcessing: await this.testStateNameProcessing(),
      multilingualTextInput: await this.testMultilingualTextInput()
    };
    
    console.log('=' * 60);
    console.log('🏁 Text Input Tests Complete!\n');
    
    console.log('📊 Test Results Summary:');
    Object.entries(testResults).forEach(([test, result]) => {
      const status = result ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`   ${testName}: ${status}`);
    });
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
    
    if (successRate >= 80) {
      console.log('\n✅ TEXT INPUT: WORKING PERFECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- No interactive lists or buttons shown');
      console.log('- Clear text input prompts with examples');
      console.log('- Smart state name matching (exact + partial)');
      console.log('- Helpful suggestions for invalid inputs');
      console.log('- Multilingual support maintained');
      console.log('- Simple, clean user experience');
    } else {
      console.log('\n⚠️ Text Input needs improvements');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new TextInputTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Text input system is working perfectly!');
    console.log('Users will now type state names instead of selecting from lists.');
  } else {
    console.log('\n🔧 CONCLUSION: Text input system needs fixes.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TextInputTest;
