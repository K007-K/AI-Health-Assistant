#!/usr/bin/env node

/**
 * Test Full State Selection Flow
 * Simulate the exact user experience to identify why text fallback is happening
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class FullFlowTest {
  constructor() {
    this.cacheService = new DiseaseOutbreakCacheService();
    this.messageController = new MessageController();
    this.sentMessages = [];
    this.errors = [];
    
    // Mock WhatsApp service with detailed logging
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, type: 'message' });
        console.log(`📱 TEXT MESSAGE: ${message.substring(0, 100)}...`);
        return { success: true };
      },
      sendInteractiveList: async (phone, text, buttonText, items) => {
        this.sentMessages.push({ phone, text, buttonText, items, type: 'interactive_list' });
        console.log(`📱 INTERACTIVE LIST: ${text}`);
        console.log(`   Button: ${buttonText}`);
        console.log(`   Items: ${items.length} items`);
        console.log(`   Sample: ${items.slice(0, 3).map(i => i.title).join(', ')}`);
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        this.sentMessages.push({ phone, text, buttons, type: 'interactive_buttons' });
        console.log(`📱 INTERACTIVE BUTTONS: ${text}`);
        console.log(`   Buttons: ${buttons.length} buttons`);
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

  async testCompleteFlow() {
    console.log('🧪 Testing Complete State Selection Flow\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+1234567890',
      preferred_language: 'en'
    };

    try {
      this.sentMessages = [];
      this.errors = [];
      
      console.log('1. Starting handleTurnOnAlerts...');
      
      // Override console.error to catch any errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        this.errors.push(args.join(' '));
        originalConsoleError(...args);
      };
      
      await this.messageController.handleTurnOnAlerts(testUser);
      
      // Restore console.error
      console.error = originalConsoleError;
      
      console.log('\n2. Analyzing sent messages...');
      
      const textMessages = this.sentMessages.filter(msg => msg.type === 'message');
      const interactiveLists = this.sentMessages.filter(msg => msg.type === 'interactive_list');
      const interactiveButtons = this.sentMessages.filter(msg => msg.type === 'interactive_buttons');
      
      console.log(`   📱 Text messages: ${textMessages.length}`);
      console.log(`   📋 Interactive lists: ${interactiveLists.length}`);
      console.log(`   🔘 Interactive buttons: ${interactiveButtons.length}`);
      console.log(`   ❌ Errors captured: ${this.errors.length}`);
      
      // Check for fallback to text input
      const hasFallbackText = textMessages.some(msg => 
        msg.message.includes('Please type your state name')
      );
      
      console.log(`\n3. Results analysis:`);
      console.log(`   ✅ Has header message: ${textMessages.some(msg => msg.message.includes('Select Your State')) ? 'YES' : 'NO'}`);
      console.log(`   ✅ Has interactive lists: ${interactiveLists.length > 0 ? 'YES' : 'NO'}`);
      console.log(`   ❌ Has text fallback: ${hasFallbackText ? 'YES (BAD)' : 'NO (GOOD)'}`);
      
      // Show errors if any
      if (this.errors.length > 0) {
        console.log(`\n4. Errors detected:`);
        this.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      
      // Show all messages
      console.log(`\n5. All messages sent:`);
      this.sentMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.type.toUpperCase()}: ${msg.message || msg.text || 'Interactive content'}`);
      });
      
      const isWorking = interactiveLists.length > 0 && !hasFallbackText && this.errors.length === 0;
      
      console.log(`\n🎯 FLOW RESULT: ${isWorking ? '✅ WORKING' : '❌ NOT WORKING'}`);
      
      return isWorking;
      
    } catch (error) {
      console.log(`❌ Flow test failed: ${error.message}`);
      console.log(`❌ Stack trace: ${error.stack}`);
      return false;
    }
  }

  async testEnvironmentDetection() {
    console.log('\n🧪 Testing Environment Detection\n');
    
    console.log('Environment variables:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   MOCK_WHATSAPP: ${process.env.MOCK_WHATSAPP || 'undefined'}`);
    console.log(`   WHATSAPP_ACCESS_TOKEN: ${process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'NOT SET'}`);
    console.log(`   WHATSAPP_PHONE_NUMBER_ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID ? 'SET' : 'NOT SET'}`);
    
    // Check if the real WhatsApp service would be used
    const WhatsAppService = require('./src/services/whatsappService');
    const realService = new WhatsAppService();
    
    console.log(`\n   Real WhatsApp service would be used: ${!process.env.MOCK_WHATSAPP && process.env.NODE_ENV !== 'test' ? 'YES' : 'NO'}`);
    
    return true;
  }

  async testDirectServiceCall() {
    console.log('\n🧪 Testing Direct Service Call\n');
    
    try {
      const testItems = [
        { id: 'state_1', title: 'Andhra Pradesh', description: 'State' },
        { id: 'state_14', title: 'Maharashtra', description: 'State' },
        { id: 'state_9', title: 'Delhi', description: 'Union Territory' }
      ];
      
      console.log('Testing direct sendInteractiveList call...');
      
      const result = await this.messageController.whatsappService.sendInteractiveList(
        '+1234567890',
        'Test message',
        'Choose State',
        testItems
      );
      
      console.log(`   Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return result.success;
      
    } catch (error) {
      console.log(`   ❌ Direct service call failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Full Flow Tests\n');
    console.log('=' * 60);
    
    const testResults = {
      completeFlow: await this.testCompleteFlow(),
      environmentDetection: await this.testEnvironmentDetection(),
      directServiceCall: await this.testDirectServiceCall()
    };
    
    console.log('=' * 60);
    console.log('🏁 Full Flow Tests Complete!\n');
    
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
    
    if (testResults.completeFlow) {
      console.log('\n✅ INTERACTIVE LISTS: WORKING CORRECTLY');
      console.log('The system should now show scrollable lists instead of text input!');
    } else {
      console.log('\n❌ INTERACTIVE LISTS: NOT WORKING');
      console.log('\n🔧 Possible Issues:');
      console.log('- WhatsApp API credentials not configured');
      console.log('- Interactive lists not supported in test environment');
      console.log('- Error in the message controller logic');
      console.log('- Missing environment variables');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new FullFlowTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Interactive lists should be working!');
    console.log('If you still see text input, it might be a WhatsApp API configuration issue.');
  } else {
    console.log('\n🔧 CONCLUSION: Interactive lists need fixes.');
    console.log('The system is falling back to text input due to errors.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FullFlowTest;
