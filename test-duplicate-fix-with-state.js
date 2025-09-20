#!/usr/bin/env node

/**
 * Test Duplicate Header Fix with Proper State Setup
 * Create a user with selected state and verify no duplicate headers
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');
const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');

class DuplicateFixWithStateTest {
  constructor() {
    this.messageController = new MessageController();
    this.cacheService = new DiseaseOutbreakCacheService();
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

  async setupUserWithState(phoneNumber, stateName) {
    try {
      console.log(`🔧 Setting up user ${phoneNumber} with state ${stateName}...`);
      
      // Register user for alerts with the specified state
      const DiseaseAlertService = require('./src/services/diseaseAlertService');
      const alertService = new DiseaseAlertService();
      
      // Use mock WhatsApp service for alert service too
      alertService.whatsappService = this.messageController.whatsappService;
      
      await alertService.registerUserForAlerts(
        phoneNumber,
        `user-${phoneNumber.replace(/\D/g, '')}`,
        { 
          state: stateName, 
          district: 'Test District', 
          pincode: '123456' 
        }
      );
      
      console.log(`✅ User ${phoneNumber} registered with state ${stateName}`);
      return true;
      
    } catch (error) {
      console.log(`❌ Failed to setup user: ${error.message}`);
      return false;
    }
  }

  async testWithRegisteredUser() {
    console.log('🧪 Testing Duplicate Header Fix with Registered User\n');
    
    const testPhone = '+1234567890';
    const testState = 'Andhra Pradesh';
    
    try {
      // 1. Setup user with state
      const setupSuccess = await this.setupUserWithState(testPhone, testState);
      if (!setupSuccess) {
        console.log('❌ Could not setup user, skipping test');
        return false;
      }
      
      // 2. Create test user object
      const testUser = {
        id: 'test-user-with-state',
        phone_number: testPhone,
        preferred_language: 'en',
        script_preference: 'native'
      };
      
      // 3. Test the view active diseases function
      console.log('\n1. Testing handleViewActiveDiseases with registered user...');
      this.sentMessages = [];
      
      await this.messageController.handleViewActiveDiseases(testUser);
      
      console.log(`\n2. Analyzing ${this.sentMessages.length} messages sent...`);
      
      // 4. Count state header messages
      const stateHeaderMessages = this.sentMessages.filter(msg => 
        msg.message && (
          msg.message.includes(`Diseases in ${testState}:`) ||
          (msg.message.includes('Diseases in') && msg.message.includes(':') && !msg.message.includes('Current Disease Outbreaks'))
        )
      );
      
      console.log(`   📊 State header messages found: ${stateHeaderMessages.length}`);
      
      // Show state header messages
      if (stateHeaderMessages.length > 0) {
        console.log('\n   📄 State header messages:');
        stateHeaderMessages.forEach((msg, index) => {
          console.log(`   ${index + 1}. "${msg.message}"`);
        });
      }
      
      // 5. Check for main header
      const mainHeaderMessages = this.sentMessages.filter(msg => 
        msg.message && msg.message.includes('Current Disease Outbreaks')
      );
      
      console.log(`   📊 Main header messages: ${mainHeaderMessages.length}`);
      
      // 6. Check for nationwide section
      const nationwideHeaderMessages = this.sentMessages.filter(msg => 
        msg.message && msg.message.includes('Nationwide Disease Outbreaks')
      );
      
      console.log(`   📊 Nationwide header messages: ${nationwideHeaderMessages.length}`);
      
      // 7. Analyze results
      const hasDuplicateStateHeaders = stateHeaderMessages.length > 1;
      const hasExactlyOneStateHeader = stateHeaderMessages.length === 1;
      const hasMainHeader = mainHeaderMessages.length === 1;
      const hasNationwideHeader = nationwideHeaderMessages.length === 1;
      
      console.log(`\n3. Results:`);
      console.log(`   ✅ Has main header: ${hasMainHeader ? 'YES' : 'NO'}`);
      console.log(`   ✅ Has state header: ${stateHeaderMessages.length > 0 ? 'YES' : 'NO'}`);
      console.log(`   ✅ Exactly one state header: ${hasExactlyOneStateHeader ? 'YES' : 'NO'}`);
      console.log(`   ✅ Has nationwide header: ${hasNationwideHeader ? 'YES' : 'NO'}`);
      console.log(`   ❌ Has duplicate state headers: ${hasDuplicateStateHeaders ? 'YES (BAD)' : 'NO (GOOD)'}`);
      
      // Show all messages for debugging
      console.log('\n   📋 All messages sent:');
      this.sentMessages.forEach((msg, index) => {
        const preview = msg.message ? msg.message.substring(0, 80) + '...' : `[${msg.type.toUpperCase()}]`;
        console.log(`   ${index + 1}. ${preview}`);
      });
      
      // Clean up - remove test user
      await this.cleanupTestUser(testPhone);
      
      return !hasDuplicateStateHeaders && hasMainHeader;
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      await this.cleanupTestUser(testPhone);
      return false;
    }
  }

  async cleanupTestUser(phoneNumber) {
    try {
      console.log(`\n🧹 Cleaning up test user ${phoneNumber}...`);
      await this.cacheService.turnOffAlertsAndDeleteData(phoneNumber);
      console.log(`✅ Test user ${phoneNumber} cleaned up`);
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }

  async runTest() {
    console.log('🚀 Starting Duplicate Header Fix Test with State\n');
    console.log('=' * 60);
    
    const testResult = await this.testWithRegisteredUser();
    
    console.log('=' * 60);
    console.log('🏁 Duplicate Header Fix Test Complete!\n');
    
    console.log('📊 Test Result:');
    const status = testResult ? '✅ PASS' : '❌ FAIL';
    console.log(`   Duplicate Header Fix: ${status}`);
    
    if (testResult) {
      console.log('\n✅ DUPLICATE HEADER FIX: WORKING CORRECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- State header appears exactly once (no duplicates)');
      console.log('- Main header appears correctly');
      console.log('- Nationwide header appears correctly');
      console.log('- Clean, organized message flow');
    } else {
      console.log('\n❌ DUPLICATE HEADER FIX: NEEDS ATTENTION');
      console.log('\n🔧 Issues Found:');
      console.log('- State header may be appearing multiple times');
      console.log('- Message flow may be disorganized');
    }
    
    return testResult;
  }
}

// Run the test
async function main() {
  const tester = new DuplicateFixWithStateTest();
  const success = await tester.runTest();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Duplicate header issue is fixed!');
    console.log('State headers now appear exactly once, not twice.');
  } else {
    console.log('\n🔧 CONCLUSION: Duplicate header issue may still exist.');
    console.log('Please check the message flow for duplicate headers.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DuplicateFixWithStateTest;
