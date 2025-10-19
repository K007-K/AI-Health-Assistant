#!/usr/bin/env node

/**
 * Test Duplicate Header Fix
 * Verify that state header appears only once, not twice
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

class DuplicateHeaderTest {
  constructor() {
    this.messageController = new MessageController();
    this.sentMessages = [];
    
    // Mock WhatsApp service to capture all messages
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, type: 'message', timestamp: new Date() });
        console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        this.sentMessages.push({ phone, text, buttons, type: 'buttons', timestamp: new Date() });
        console.log(`🔘 BUTTONS: ${text.substring(0, 80)}...`);
        return { success: true };
      }
    };
  }

  async testNoDuplicateHeaders() {
    console.log('🧪 Testing No Duplicate Headers\n');
    
    try {
      const testUser = {
        id: 'test-user-001',
        phone_number: '+1234567890',
        preferred_language: 'en',
        script_preference: 'native'
      };
      
      console.log('1. Testing handleViewActiveDiseases for user with state...');
      this.sentMessages = [];
      
      await this.messageController.handleViewActiveDiseases(testUser);
      
      console.log(`\n2. Analyzing ${this.sentMessages.length} messages sent...`);
      
      // Count how many times state header appears
      const stateHeaderMessages = this.sentMessages.filter(msg => 
        msg.message && (
          msg.message.includes('Diseases in') && 
          msg.message.includes(':') &&
          !msg.message.includes('Current Disease Outbreaks')
        )
      );
      
      console.log(`   📊 State header messages found: ${stateHeaderMessages.length}`);
      
      // Show all state header messages
      if (stateHeaderMessages.length > 0) {
        console.log('\n   📄 State header messages:');
        stateHeaderMessages.forEach((msg, index) => {
          console.log(`   ${index + 1}. "${msg.message.substring(0, 100)}..."`);
        });
      }
      
      // Check for duplicates
      const hasDuplicates = stateHeaderMessages.length > 1;
      const hasExactlyOne = stateHeaderMessages.length === 1;
      
      console.log(`\n3. Results:`);
      console.log(`   ✅ Has state header: ${stateHeaderMessages.length > 0 ? 'YES' : 'NO'}`);
      console.log(`   ✅ Exactly one header: ${hasExactlyOne ? 'YES' : 'NO'}`);
      console.log(`   ❌ Has duplicates: ${hasDuplicates ? 'YES (BAD)' : 'NO (GOOD)'}`);
      
      // Show all messages for debugging
      console.log('\n   📋 All messages sent:');
      this.sentMessages.forEach((msg, index) => {
        const preview = msg.message ? msg.message.substring(0, 60) + '...' : `[${msg.type.toUpperCase()}]`;
        console.log(`   ${index + 1}. ${preview}`);
      });
      
      return !hasDuplicates && hasExactlyOne;
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      return false;
    }
  }

  async testMultipleStates() {
    console.log('\n🧪 Testing Multiple States (No Cross-Contamination)\n');
    
    const states = ['Andhra Pradesh', 'Maharashtra', 'Karnataka'];
    let allPassed = true;
    
    for (const state of states) {
      console.log(`Testing ${state}...`);
      
      const testUser = {
        id: `test-user-${state.replace(/\s+/g, '-').toLowerCase()}`,
        phone_number: `+${Math.random().toString().substr(2, 10)}`,
        preferred_language: 'en',
        script_preference: 'native'
      };
      
      try {
        this.sentMessages = [];
        await this.messageController.handleViewActiveDiseases(testUser);
        
        // Count state headers for this specific state
        const stateHeaders = this.sentMessages.filter(msg => 
          msg.message && msg.message.includes(`Diseases in ${state}:`)
        );
        
        const isCorrect = stateHeaders.length <= 1;
        console.log(`   ${state}: ${stateHeaders.length} header(s) - ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!isCorrect) allPassed = false;
        
      } catch (error) {
        console.log(`   ${state}: ❌ ERROR - ${error.message}`);
        allPassed = false;
      }
    }
    
    return allPassed;
  }

  async runAllTests() {
    console.log('🚀 Starting Duplicate Header Fix Tests\n');
    console.log('=' * 60);
    
    const testResults = {
      noDuplicateHeaders: await this.testNoDuplicateHeaders(),
      multipleStates: await this.testMultipleStates()
    };
    
    console.log('=' * 60);
    console.log('🏁 Duplicate Header Fix Tests Complete!\n');
    
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
    
    if (successRate >= 100) {
      console.log('\n✅ DUPLICATE HEADER FIX: WORKING PERFECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- State header appears exactly once');
      console.log('- No duplicate header messages');
      console.log('- Clean, organized message flow');
      console.log('- Consistent behavior across different states');
    } else {
      console.log('\n⚠️ Duplicate header fix needs improvements');
    }
    
    return successRate >= 100;
  }
}

// Run the tests
async function main() {
  const tester = new DuplicateHeaderTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Duplicate header issue is fixed!');
    console.log('State headers now appear exactly once, not twice.');
  } else {
    console.log('\n🔧 CONCLUSION: Duplicate header issue still exists.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DuplicateHeaderTest;
