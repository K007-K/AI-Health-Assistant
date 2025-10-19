#!/usr/bin/env node

/**
 * Test Deletion Fix
 * Verify that the "already registered" issue is resolved
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class DeletionFixTest {
  constructor() {
    this.cacheService = new DiseaseOutbreakCacheService();
    this.messageController = new MessageController();
    this.sentMessages = [];
    
    // Mock WhatsApp service
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, type: 'message' });
        console.log(`📱 MESSAGE: ${message.substring(0, 80)}...`);
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        this.sentMessages.push({ phone, text, buttons, type: 'buttons' });
        console.log(`📱 BUTTONS: ${text.substring(0, 60)}... (${buttons.length} buttons)`);
        return { success: true };
      }
    };
  }

  async testDeletionFix() {
    console.log('🧪 Testing Deletion Fix\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+9876543210',
      preferred_language: 'en'
    };

    try {
      // Step 1: Register user
      console.log('1. Registering user for alerts...');
      const registerSuccess = await this.cacheService.updateUserSelectedState(testUser.phone_number, 1);
      console.log(`   Registration: ${registerSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      // Step 2: Verify registration
      console.log('\n2. Verifying registration...');
      this.sentMessages = [];
      await this.messageController.handleTurnOnAlerts(testUser);
      
      const hasAlreadyRegistered = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('already registered')
      );
      console.log(`   Shows "already registered": ${hasAlreadyRegistered ? '✅ YES' : '❌ NO'}`);
      
      // Step 3: Delete user data
      console.log('\n3. Deleting user data...');
      const deleteSuccess = await this.cacheService.turnOffAlertsAndDeleteData(testUser.phone_number);
      console.log(`   Deletion: ${deleteSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      // Step 4: Test after deletion (this should NOT show "already registered")
      console.log('\n4. Testing after deletion...');
      this.sentMessages = [];
      await this.messageController.handleTurnOnAlerts(testUser);
      
      const stillShowsRegistered = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('already registered')
      );
      
      const showsStateSelection = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Select Your State')
      );
      
      console.log(`   Still shows "already registered": ${stillShowsRegistered ? '❌ YES (BUG!)' : '✅ NO (FIXED!)'}`);
      console.log(`   Shows state selection: ${showsStateSelection ? '✅ YES' : '❌ NO'}`);
      
      // Step 5: Verify database is clean
      console.log('\n5. Verifying database cleanup...');
      const finalCheck = await this.cacheService.getUserSelectedState(testUser.phone_number);
      console.log(`   User exists in database: ${finalCheck ? '❌ YES (NOT DELETED!)' : '✅ NO (PROPERLY DELETED)'}`);
      
      // Test result
      const isFixed = !stillShowsRegistered && showsStateSelection && !finalCheck;
      console.log(`\n🎯 DELETION FIX TEST: ${isFixed ? '✅ PASSED' : '❌ FAILED'}`);
      
      return isFixed;
      
    } catch (error) {
      console.error('Test failed:', error);
      return false;
    }
  }

  async testEdgeCases() {
    console.log('\n🧪 Testing Edge Cases\n');
    
    const testCases = [
      {
        name: 'User with incomplete data',
        phone: '+1111111111',
        setupData: { alert_enabled: true, selected_state_id: null } // Missing state
      },
      {
        name: 'User with disabled alerts',
        phone: '+2222222222', 
        setupData: { alert_enabled: false, selected_state_id: 1 }
      },
      {
        name: 'User with invalid state ID',
        phone: '+3333333333',
        setupData: { alert_enabled: true, selected_state_id: 999 } // Non-existent state
      }
    ];

    let allPassed = true;

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      
      try {
        // Setup test data directly in database
        const { error: insertError } = await this.cacheService.supabase
          .from('user_alert_preferences')
          .insert({
            phone_number: testCase.phone,
            state: 'Test State',
            district: 'Test District',
            pincode: '000000',
            ...testCase.setupData
          });

        if (insertError) {
          console.log(`   ❌ Setup failed: ${insertError.message}`);
          continue;
        }

        // Test handleTurnOnAlerts
        const testUser = {
          id: `test-${Date.now()}`,
          phone_number: testCase.phone,
          preferred_language: 'en'
        };

        this.sentMessages = [];
        await this.messageController.handleTurnOnAlerts(testUser);

        const showsAlreadyRegistered = this.sentMessages.some(msg => 
          msg.message && msg.message.includes('already registered')
        );

        const showsStateSelection = this.sentMessages.some(msg => 
          msg.message && msg.message.includes('Select Your State')
        );

        console.log(`   Already registered: ${showsAlreadyRegistered ? 'YES' : 'NO'}`);
        console.log(`   State selection: ${showsStateSelection ? 'YES' : 'NO'}`);

        // For edge cases, we expect state selection (not "already registered")
        const expectedBehavior = !showsAlreadyRegistered && showsStateSelection;
        console.log(`   Result: ${expectedBehavior ? '✅ CORRECT' : '❌ INCORRECT'}`);

        if (!expectedBehavior) {
          allPassed = false;
        }

        // Cleanup
        await this.cacheService.turnOffAlertsAndDeleteData(testCase.phone);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        allPassed = false;
      }

      console.log('');
    }

    console.log(`🎯 EDGE CASES TEST: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    return allPassed;
  }

  async runAllTests() {
    console.log('🚀 Starting Deletion Fix Tests\n');
    console.log('=' * 60);
    
    const mainTest = await this.testDeletionFix();
    const edgeTest = await this.testEdgeCases();
    
    console.log('=' * 60);
    console.log('🏁 Deletion Fix Tests Complete!\n');
    
    const overallSuccess = mainTest && edgeTest;
    
    console.log('📊 Results Summary:');
    console.log(`   Main deletion test: ${mainTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Edge cases test: ${edgeTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Overall: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS WORK'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 DELETION FIX IS WORKING!');
      console.log('✅ Users can properly turn off alerts');
      console.log('✅ Data is completely deleted from database');
      console.log('✅ No more "already registered" after deletion');
      console.log('✅ State selection works properly after deletion');
    } else {
      console.log('\n⚠️ DELETION FIX NEEDS MORE WORK');
    }
    
    return overallSuccess;
  }
}

// Run the tests
async function main() {
  const tester = new DeletionFixTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DeletionFixTest;
