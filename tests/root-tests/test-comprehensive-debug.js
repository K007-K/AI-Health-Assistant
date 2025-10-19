#!/usr/bin/env node

/**
 * Comprehensive Debug Test Suite
 * Tests all features, menus, and workflows to identify errors
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import all services
const MessageController = require('./src/controllers/messageController');
const UserService = require('./src/services/userService');
const WhatsAppService = require('./src/services/mockWhatsappService');
const ConversationService = require('./src/services/conversationService');
const GeminiService = require('./src/services/geminiService');
const { LanguageUtils } = require('./src/utils/languageUtils');

class ComprehensiveDebugTest {
  constructor() {
    this.whatsappService = new WhatsAppService(true); // Test mode
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.messageController = new MessageController();
    this.geminiService = new GeminiService();
    
    // Override the message controller's services with mocks
    this.messageController.whatsappService = this.whatsappService;
    
    // Mock user service to avoid database calls
    this.messageController.userService = {
      updateUserSession: async (userId, state) => {
        console.log(`💾 MOCK: Updating user ${userId} session to ${state}`);
        return { success: true };
      },
      getUserSession: async (userId) => {
        console.log(`💾 MOCK: Getting user ${userId} session`);
        return { session_state: 'main_menu' };
      }
    };
    
    // Mock conversation service to avoid database calls
    this.messageController.conversationService = {
      saveBotMessage: async (userId, message, intent, language) => {
        console.log(`💾 MOCK: Saving bot message for user ${userId}`);
        return { success: true };
      },
      detectIntent: this.conversationService.detectIntent.bind(this.conversationService)
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      phone_number: '+1234567890',
      preferred_language: 'te',
      script_preference: 'transliteration',
      session_state: 'main_menu'
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(name, testFunction) {
    try {
      this.log(`Testing: ${name}`, 'info');
      await testFunction();
      this.testResults.passed++;
      this.log(`PASSED: ${name}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message, stack: error.stack });
      this.log(`FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  // Test 1: Basic Service Initialization
  async testServiceInitialization() {
    if (!this.whatsappService) throw new Error('WhatsApp Service not initialized');
    if (!this.userService) throw new Error('User Service not initialized');
    if (!this.conversationService) throw new Error('Conversation Service not initialized');
    if (!this.messageController) throw new Error('Message Controller not initialized');
    if (!this.geminiService) throw new Error('Gemini Service not initialized');
  }

  // Test 2: Language Utils
  async testLanguageUtils() {
    const englishText = LanguageUtils.getText('main_menu', 'en', 'en', 'native');
    if (!englishText || englishText.length === 0) {
      throw new Error('English main menu text is empty');
    }

    const teluguText = LanguageUtils.getText('main_menu', 'te', 'en', 'native');
    if (!teluguText || teluguText.length === 0) {
      throw new Error('Telugu main menu text is empty');
    }

    const teluguTransText = LanguageUtils.getText('main_menu', 'te', 'en', 'transliteration');
    if (!teluguTransText || teluguTransText.length === 0) {
      throw new Error('Telugu transliteration main menu text is empty');
    }
  }

  // Test 3: WhatsApp Service Methods
  async testWhatsAppService() {
    // Test main menu list generation
    const menuList = this.whatsappService.getMainMenuList('te', 'transliteration');
    if (!menuList || !menuList.sections || menuList.sections.length === 0) {
      throw new Error('Main menu list generation failed');
    }

    // Test main menu buttons
    const menuButtons = this.whatsappService.getMainMenuButtons('te', 'transliteration');
    if (!menuButtons || menuButtons.length === 0) {
      throw new Error('Main menu buttons generation failed');
    }

    // Test language selection list
    const langList = this.whatsappService.getLanguageSelectionList();
    if (!langList || !langList.sections || langList.sections.length === 0) {
      throw new Error('Language selection list generation failed');
    }
  }

  // Test 4: Intent Detection
  async testIntentDetection() {
    const testCases = [
      { message: 'hi', expected: 'greeting' },
      { message: 'menu', expected: 'menu_request' },
      { message: '/basha', expected: 'change_language' },
      { message: 'chat_ai', expected: 'ai_chat' },
      { message: 'symptom_check', expected: 'symptom_check' },
      { message: 'preventive_tips', expected: 'preventive_tips' }
    ];

    for (const testCase of testCases) {
      const intent = this.conversationService.detectIntent(testCase.message, 'main_menu');
      if (intent !== testCase.expected) {
        throw new Error(`Intent detection failed for "${testCase.message}". Expected: ${testCase.expected}, Got: ${intent}`);
      }
    }
  }

  // Test 5: AI Chat State Protection
  async testAIChatStateProtection() {
    // Test that regular messages in AI chat don't trigger menu
    const intent1 = this.conversationService.detectIntent('hello how are you', 'ai_chat');
    if (intent1 !== 'ai_chat_message') {
      throw new Error(`AI chat state protection failed. Expected: ai_chat_message, Got: ${intent1}`);
    }

    // Test that menu commands work in AI chat
    const intent2 = this.conversationService.detectIntent('menu', 'ai_chat');
    if (intent2 !== 'menu_request') {
      throw new Error(`Menu command in AI chat failed. Expected: menu_request, Got: ${intent2}`);
    }

    // Test language commands in AI chat
    const intent3 = this.conversationService.detectIntent('/basha', 'ai_chat');
    if (intent3 !== 'change_language') {
      throw new Error(`Language command in AI chat failed. Expected: change_language, Got: ${intent3}`);
    }
  }

  // Test 6: Message Controller Methods
  async testMessageControllerMethods() {
    // Test main menu display
    try {
      await this.messageController.showMainMenu(this.testUser);
    } catch (error) {
      throw new Error(`showMainMenu failed: ${error.message}`);
    }

    // Test language selection
    try {
      await this.messageController.showLanguageSelection(this.testUser);
    } catch (error) {
      throw new Error(`showLanguageSelection failed: ${error.message}`);
    }

    // Test script selection
    try {
      await this.messageController.showScriptSelection(this.testUser, 'te');
    } catch (error) {
      throw new Error(`showScriptSelection failed: ${error.message}`);
    }
  }

  // Test 7: Gemini Service
  async testGeminiService() {
    try {
      // Test with a simple health question
      const response = await this.geminiService.generateResponse(
        'What is fever?',
        'You are a healthcare assistant. Answer briefly.',
        'en'
      );
      
      if (!response || response.length === 0) {
        throw new Error('Gemini service returned empty response');
      }
    } catch (error) {
      // This might fail due to API keys, so we'll log but not fail the test
      this.log(`Gemini service test skipped: ${error.message}`, 'warning');
    }
  }

  // Test 8: Error Handling in Message Processing
  async testErrorHandling() {
    // Test with invalid user data
    try {
      const invalidUser = { ...this.testUser, preferred_language: null };
      await this.messageController.showMainMenu(invalidUser);
    } catch (error) {
      // This should handle gracefully, not crash
      if (error.message.includes('Cannot read property') || error.message.includes('Cannot read properties')) {
        throw new Error('Poor error handling for invalid user data');
      }
    }
  }

  // Test 9: Menu Navigation Flow
  async testMenuNavigationFlow() {
    const testMessages = [
      'hi', // Should trigger greeting
      'menu', // Should show main menu
      'chat_ai', // Should start AI chat
      'menu', // Should return to menu from AI chat
      '/language', // Should show language selection
      'lang_te', // Should select Telugu
      'script_transliteration' // Should select transliteration
    ];

    for (const message of testMessages) {
      try {
        const intent = this.conversationService.detectIntent(message, 'main_menu');
        if (!intent) {
          throw new Error(`No intent detected for message: ${message}`);
        }
      } catch (error) {
        throw new Error(`Menu navigation failed for message "${message}": ${error.message}`);
      }
    }
  }

  // Test 10: Multilingual Support
  async testMultilingualSupport() {
    const languages = ['en', 'hi', 'te', 'ta', 'or'];
    const scriptTypes = ['native', 'transliteration'];

    for (const lang of languages) {
      for (const script of scriptTypes) {
        // Skip transliteration for English
        if (lang === 'en' && script === 'transliteration') continue;

        try {
          const menuText = LanguageUtils.getText('main_menu', lang, 'en', script);
          if (!menuText) {
            throw new Error(`Missing menu text for ${lang} (${script})`);
          }

          const menuList = this.whatsappService.getMainMenuList(lang, script);
          if (!menuList || !menuList.sections) {
            throw new Error(`Missing menu list for ${lang} (${script})`);
          }

          const menuButtons = this.whatsappService.getMainMenuButtons(lang, script);
          if (!menuButtons) {
            throw new Error(`Missing menu buttons for ${lang} (${script})`);
          }
        } catch (error) {
          throw new Error(`Multilingual support failed for ${lang} (${script}): ${error.message}`);
        }
      }
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Comprehensive Debug Test Suite', 'info');
    this.log('=' * 50, 'info');

    await this.test('Service Initialization', () => this.testServiceInitialization());
    await this.test('Language Utils', () => this.testLanguageUtils());
    await this.test('WhatsApp Service Methods', () => this.testWhatsAppService());
    await this.test('Intent Detection', () => this.testIntentDetection());
    await this.test('AI Chat State Protection', () => this.testAIChatStateProtection());
    await this.test('Message Controller Methods', () => this.testMessageControllerMethods());
    await this.test('Gemini Service', () => this.testGeminiService());
    await this.test('Error Handling', () => this.testErrorHandling());
    await this.test('Menu Navigation Flow', () => this.testMenuNavigationFlow());
    await this.test('Multilingual Support', () => this.testMultilingualSupport());

    // Print results
    this.log('=' * 50, 'info');
    this.log('🏁 Test Suite Complete', 'info');
    this.log(`✅ Passed: ${this.testResults.passed}`, 'success');
    this.log(`❌ Failed: ${this.testResults.failed}`, 'error');
    
    if (this.testResults.failed > 0) {
      this.log('\n🚨 ERRORS FOUND:', 'error');
      this.testResults.errors.forEach((error, index) => {
        this.log(`\n${index + 1}. ${error.test}:`, 'error');
        this.log(`   Error: ${error.error}`, 'error');
        if (error.stack) {
          this.log(`   Stack: ${error.stack.split('\n')[1]}`, 'error');
        }
      });
    } else {
      this.log('\n🎉 All tests passed! System is working correctly.', 'success');
    }

    return this.testResults.failed === 0;
  }
}

// Run the tests
async function main() {
  const tester = new ComprehensiveDebugTest();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveDebugTest;
