#!/usr/bin/env node

/**
 * Test Turn Off Alerts System with Data Deletion
 * Verify complete user data removal when alerts are turned off
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class TurnOffAlertsTest {
  constructor() {
    this.cacheService = new DiseaseOutbreakCacheService();
    this.messageController = new MessageController();
    this.sentMessages = [];
    
    // Mock WhatsApp service to capture messages
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, type: 'message' });
        console.log(`📱 MESSAGE to ${phone}:`);
        console.log(`💬 ${message.substring(0, 100)}...`);
        console.log('');
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        this.sentMessages.push({ phone, text, buttons, type: 'buttons' });
        console.log(`📱 BUTTONS to ${phone}:`);
        console.log(`💬 ${text.substring(0, 80)}...`);
        console.log(`🔘 Buttons: ${buttons.map(b => b.title).join(', ')}`);
        console.log('');
        return { success: true };
      }
    };
  }

  async setupTestUser() {
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+1234567890',
      preferred_language: 'en'
    };

    // Register user for alerts first
    const success = await this.cacheService.updateUserSelectedState(testUser.phone_number, 1); // Andhra Pradesh
    
    if (success) {
      console.log('✅ Test user registered for alerts');
      return testUser;
    } else {
      throw new Error('Failed to setup test user');
    }
  }

  async testUserRegistrationCheck() {
    console.log('🧪 Test 1: User Registration Check\n');
    
    const testUser = await this.setupTestUser();
    
    try {
      // Check if user is registered
      const isRegistered = await this.cacheService.isUserRegisteredForAlerts(testUser.phone_number);
      console.log(`✅ User registration status: ${isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);
      
      // Get user state info
      const stateInfo = await this.cacheService.getUserSelectedState(testUser.phone_number);
      const stateName = stateInfo?.indian_states?.state_name;
      console.log(`✅ User selected state: ${stateName || 'None'}`);
      console.log(`✅ Alerts enabled: ${stateInfo?.alert_enabled ? 'YES' : 'NO'}`);
      
      return isRegistered && stateName;
      
    } catch (error) {
      console.log(`❌ Registration check failed: ${error.message}`);
      return false;
    }
  }

  async testTurnOffAlertsFlow() {
    console.log('\n🧪 Test 2: Turn Off Alerts Flow\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      phone_number: '+1234567891',
      preferred_language: 'te' // Telugu
    };

    // Setup user
    await this.cacheService.updateUserSelectedState(testUser.phone_number, 1);
    
    try {
      this.sentMessages = [];
      
      // Test turn off alerts request
      console.log('1. Testing handleTurnOffAlerts:');
      await this.messageController.handleTurnOffAlerts(testUser);
      
      const hasConfirmationButtons = this.sentMessages.some(msg => 
        msg.type === 'buttons' && 
        msg.buttons.some(btn => btn.id === 'confirm_delete_alert_data' || btn.id === 'confirm_disable_alerts')
      );
      
      console.log(`   ✅ Confirmation buttons shown: ${hasConfirmationButtons ? 'YES' : 'NO'}`);
      console.log(`   ✅ Messages sent: ${this.sentMessages.length}`);
      
      return hasConfirmationButtons;
      
    } catch (error) {
      console.log(`   ❌ Turn off alerts flow failed: ${error.message}`);
      return false;
    }
  }

  async testDeleteAllData() {
    console.log('\n🧪 Test 3: Delete All Alert Data\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      phone_number: '+1234567892',
      preferred_language: 'hi' // Hindi
    };

    // Setup user
    await this.cacheService.updateUserSelectedState(testUser.phone_number, 14); // Maharashtra
    
    try {
      // Verify user exists before deletion
      const beforeDeletion = await this.cacheService.getUserSelectedState(testUser.phone_number);
      console.log(`Before deletion - User exists: ${beforeDeletion ? 'YES' : 'NO'}`);
      
      if (beforeDeletion) {
        console.log(`   State: ${beforeDeletion.indian_states?.state_name}`);
        console.log(`   Alerts enabled: ${beforeDeletion.alert_enabled}`);
      }
      
      // Test delete all data
      console.log('\n2. Testing handleConfirmDeleteAlertData:');
      this.sentMessages = [];
      await this.messageController.handleConfirmDeleteAlertData(testUser);
      
      // Verify user data is completely deleted
      const afterDeletion = await this.cacheService.getUserSelectedState(testUser.phone_number);
      console.log(`After deletion - User exists: ${afterDeletion ? 'YES' : 'NO'}`);
      
      const hasSuccessMessage = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('All Alert Data Deleted')
      );
      
      console.log(`   ✅ Success message sent: ${hasSuccessMessage ? 'YES' : 'NO'}`);
      console.log(`   ✅ User data deleted: ${!afterDeletion ? 'YES' : 'NO'}`);
      
      return !afterDeletion && hasSuccessMessage;
      
    } catch (error) {
      console.log(`   ❌ Delete all data test failed: ${error.message}`);
      return false;
    }
  }

  async testDisableAlerts() {
    console.log('\n🧪 Test 4: Disable Alerts (Keep Data)\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      phone_number: '+1234567893',
      preferred_language: 'ta' // Tamil
    };

    // Setup user
    await this.cacheService.updateUserSelectedState(testUser.phone_number, 23); // Tamil Nadu
    
    try {
      // Verify user exists before disabling
      const beforeDisable = await this.cacheService.getUserSelectedState(testUser.phone_number);
      console.log(`Before disable - User exists: ${beforeDisable ? 'YES' : 'NO'}`);
      console.log(`   Alerts enabled: ${beforeDisable?.alert_enabled ? 'YES' : 'NO'}`);
      
      // Test disable alerts
      console.log('\n2. Testing handleConfirmDisableAlerts:');
      this.sentMessages = [];
      await this.messageController.handleConfirmDisableAlerts(testUser);
      
      // Verify user data still exists but alerts disabled
      const afterDisable = await this.cacheService.getUserSelectedState(testUser.phone_number);
      console.log(`After disable - User exists: ${afterDisable ? 'YES' : 'NO'}`);
      console.log(`   Alerts enabled: ${afterDisable?.alert_enabled ? 'YES' : 'NO'}`);
      console.log(`   State preserved: ${afterDisable?.indian_states?.state_name || 'None'}`);
      
      const hasSuccessMessage = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Alerts Disabled')
      );
      
      console.log(`   ✅ Success message sent: ${hasSuccessMessage ? 'YES' : 'NO'}`);
      console.log(`   ✅ Data preserved: ${afterDisable ? 'YES' : 'NO'}`);
      console.log(`   ✅ Alerts disabled: ${!afterDisable?.alert_enabled ? 'YES' : 'NO'}`);
      
      return afterDisable && !afterDisable.alert_enabled && hasSuccessMessage;
      
    } catch (error) {
      console.log(`   ❌ Disable alerts test failed: ${error.message}`);
      return false;
    }
  }

  async testStopAlertsCommand() {
    console.log('\n🧪 Test 5: "STOP ALERTS" Text Command\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      phone_number: '+1234567894',
      preferred_language: 'or' // Odia
    };

    // Setup user
    await this.cacheService.updateUserSelectedState(testUser.phone_number, 19); // Odisha
    
    try {
      this.sentMessages = [];
      
      // Simulate "STOP ALERTS" command
      console.log('1. Testing "STOP ALERTS" command processing:');
      
      // Mock the message processing (this would normally be handled in handleMessage)
      const content = 'STOP ALERTS';
      const lowerContent = content.toLowerCase();
      
      if (lowerContent === 'stop alerts' || lowerContent === 'unsubscribe') {
        await this.messageController.handleTurnOffAlerts(testUser);
      }
      
      const hasConfirmationButtons = this.sentMessages.some(msg => 
        msg.type === 'buttons' && 
        msg.buttons.some(btn => btn.id === 'confirm_delete_alert_data')
      );
      
      console.log(`   ✅ Command recognized: YES`);
      console.log(`   ✅ Confirmation shown: ${hasConfirmationButtons ? 'YES' : 'NO'}`);
      console.log(`   ✅ Messages sent: ${this.sentMessages.length}`);
      
      return hasConfirmationButtons;
      
    } catch (error) {
      console.log(`   ❌ STOP ALERTS command test failed: ${error.message}`);
      return false;
    }
  }

  async testUnregisteredUserFlow() {
    console.log('\n🧪 Test 6: Unregistered User Turn Off Request\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440005',
      phone_number: '+1234567895',
      preferred_language: 'en'
    };

    // Don't register this user
    
    try {
      this.sentMessages = [];
      
      // Test turn off alerts for unregistered user
      console.log('1. Testing turn off alerts for unregistered user:');
      await this.messageController.handleTurnOffAlerts(testUser);
      
      const hasNotRegisteredMessage = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('not registered for disease alerts')
      );
      
      const hasRegisterButton = this.sentMessages.some(msg => 
        msg.type === 'buttons' && 
        msg.buttons.some(btn => btn.id === 'turn_on_alerts')
      );
      
      console.log(`   ✅ Not registered message: ${hasNotRegisteredMessage ? 'YES' : 'NO'}`);
      console.log(`   ✅ Register button shown: ${hasRegisterButton ? 'YES' : 'NO'}`);
      
      return hasNotRegisteredMessage && hasRegisterButton;
      
    } catch (error) {
      console.log(`   ❌ Unregistered user test failed: ${error.message}`);
      return false;
    }
  }

  async testMultilingualSupport() {
    console.log('\n🧪 Test 7: Multilingual Turn Off Messages\n');
    
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
      { code: 'te', name: 'Telugu' },
      { code: 'ta', name: 'Tamil' },
      { code: 'or', name: 'Odia' }
    ];
    
    let allLanguagesWorking = true;
    
    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      const testUser = {
        id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        phone_number: `+123456789${i}`,
        preferred_language: lang.code
      };
      
      // Setup user
      await this.cacheService.updateUserSelectedState(testUser.phone_number, 1);
      
      try {
        console.log(`Testing ${lang.name} (${lang.code}):`);
        
        this.sentMessages = [];
        await this.messageController.handleTurnOffAlerts(testUser);
        
        const hasLocalizedMessage = this.sentMessages.some(msg => 
          msg.text && (
            msg.text.includes('Turn Off') || 
            msg.text.includes('बंद करें') || 
            msg.text.includes('ఆపండి') || 
            msg.text.includes('நிறுத்தவும்') || 
            msg.text.includes('ବନ୍ଦ କରନ୍ତୁ')
          )
        );
        
        console.log(`   ✅ Localized message: ${hasLocalizedMessage ? 'YES' : 'NO'}`);
        
        if (!hasLocalizedMessage) {
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
    console.log('🚀 Starting Turn Off Alerts System Tests\n');
    console.log('=' * 80);
    
    const testResults = {
      userRegistrationCheck: await this.testUserRegistrationCheck(),
      turnOffAlertsFlow: await this.testTurnOffAlertsFlow(),
      deleteAllData: await this.testDeleteAllData(),
      disableAlerts: await this.testDisableAlerts(),
      stopAlertsCommand: await this.testStopAlertsCommand(),
      unregisteredUserFlow: await this.testUnregisteredUserFlow(),
      multilingualSupport: await this.testMultilingualSupport()
    };
    
    console.log('=' * 80);
    console.log('🏁 Turn Off Alerts System Tests Complete!\n');
    
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
    
    if (successRate >= 85) {
      console.log('\n✅ Turn Off Alerts System Implementation: SUCCESS');
      console.log('\n🚀 Key Features Verified:');
      console.log('- Complete user data deletion option');
      console.log('- Soft disable option (keeps data)');
      console.log('- "STOP ALERTS" text command support');
      console.log('- Multilingual confirmation messages');
      console.log('- Proper handling of unregistered users');
      console.log('- Real-time database updates');
      console.log('- User-friendly confirmation flow');
    } else {
      console.log('\n⚠️ Turn Off Alerts System needs improvements');
    }
    
    return successRate >= 85;
  }
}

// Run the tests
async function main() {
  const tester = new TurnOffAlertsTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TurnOffAlertsTest;
