#!/usr/bin/env node

/**
 * Test Scrollable State Selection Menu
 * Verify that states are shown in scrollable lists instead of multiple button groups
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class ScrollableMenuTest {
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
      sendInteractiveList: async (phone, text, buttonText, items) => {
        this.sentMessages.push({ phone, text, buttonText, items, type: 'list' });
        console.log(`📱 SCROLLABLE LIST: ${text}`);
        console.log(`   Button: ${buttonText}`);
        console.log(`   Items (${items.length}): ${items.map(i => i.title).join(', ')}`);
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        this.sentMessages.push({ phone, text, buttons, type: 'buttons' });
        console.log(`📱 BUTTONS: ${text} (${buttons.length} buttons)`);
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

  async testScrollableMenu() {
    console.log('🧪 Testing Scrollable State Selection Menu\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+1234567890',
      preferred_language: 'en'
    };

    try {
      this.sentMessages = [];
      
      console.log('1. Testing showStateSelectionMenu with scrollable lists:');
      await this.messageController.showStateSelectionMenu(testUser, this.cacheService);
      
      // Analyze results
      const headerMessages = this.sentMessages.filter(msg => 
        msg.type === 'message' && msg.message.includes('Select Your State')
      );
      
      const listMessages = this.sentMessages.filter(msg => msg.type === 'list');
      const buttonMessages = this.sentMessages.filter(msg => msg.type === 'buttons');
      const totalStatesInLists = listMessages.reduce((total, msg) => total + msg.items.length, 0);
      
      console.log(`   ✅ Header messages: ${headerMessages.length}`);
      console.log(`   ✅ Scrollable lists: ${listMessages.length}`);
      console.log(`   ✅ Button groups (old): ${buttonMessages.length}`);
      console.log(`   ✅ Total states in lists: ${totalStatesInLists}`);
      console.log(`   ✅ Total messages sent: ${this.sentMessages.length}`);
      
      // Show details of lists
      if (listMessages.length > 0) {
        console.log(`\n   📋 List Details:`);
        listMessages.forEach((list, index) => {
          console.log(`     List ${index + 1}: ${list.items.length} items`);
          console.log(`       Title: ${list.text}`);
          console.log(`       Button: ${list.buttonText}`);
          console.log(`       Sample items: ${list.items.slice(0, 3).map(i => i.title).join(', ')}...`);
        });
      }
      
      // Verify it's using lists, not buttons
      const usesScrollableLists = listMessages.length > 0 && buttonMessages.length === 0;
      const hasAllStates = totalStatesInLists >= 36; // Should have all 36 states/UTs
      
      console.log(`\n   🎯 Uses scrollable lists: ${usesScrollableLists ? 'YES' : 'NO'}`);
      console.log(`   🎯 No button groups: ${buttonMessages.length === 0 ? 'YES' : 'NO'}`);
      console.log(`   🎯 Has all states: ${hasAllStates ? 'YES' : 'NO'}`);
      
      return usesScrollableLists && hasAllStates;
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      return false;
    }
  }

  async testListStructure() {
    console.log('\n🧪 Testing List Structure and Content\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      phone_number: '+1234567891',
      preferred_language: 'en'
    };

    try {
      this.sentMessages = [];
      await this.messageController.showStateSelectionMenu(testUser, this.cacheService);
      
      const listMessages = this.sentMessages.filter(msg => msg.type === 'list');
      
      console.log('Analyzing list structure:');
      
      let allItemsValid = true;
      let totalItems = 0;
      
      listMessages.forEach((list, index) => {
        console.log(`\nList ${index + 1}:`);
        console.log(`  Title: ${list.text}`);
        console.log(`  Button: ${list.buttonText}`);
        console.log(`  Items: ${list.items.length}`);
        
        // Check item structure
        list.items.forEach((item, itemIndex) => {
          if (itemIndex < 3) { // Show first 3 items
            console.log(`    ${itemIndex + 1}. ${item.title} (${item.description}) [ID: ${item.id}]`);
          }
          
          // Validate item structure
          if (!item.id || !item.title || !item.description) {
            console.log(`    ❌ Invalid item structure: ${JSON.stringify(item)}`);
            allItemsValid = false;
          }
          
          // Check ID format
          if (!item.id.startsWith('state_')) {
            console.log(`    ❌ Invalid ID format: ${item.id}`);
            allItemsValid = false;
          }
        });
        
        totalItems += list.items.length;
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`  Total lists: ${listMessages.length}`);
      console.log(`  Total items: ${totalItems}`);
      console.log(`  All items valid: ${allItemsValid ? 'YES' : 'NO'}`);
      console.log(`  Expected items: 36 (28 states + 8 UTs)`);
      
      return allItemsValid && totalItems >= 36;
      
    } catch (error) {
      console.log(`   ❌ List structure test failed: ${error.message}`);
      return false;
    }
  }

  async testMultilingualLists() {
    console.log('\n🧪 Testing Multilingual Scrollable Lists\n');
    
    const languages = [
      { code: 'en', name: 'English', buttonText: 'Choose State' },
      { code: 'hi', name: 'Hindi', buttonText: 'राज्य चुनें' },
      { code: 'te', name: 'Telugu', buttonText: 'రాష్ట్రం ఎంచుకోండి' }
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
        
        const listMessages = this.sentMessages.filter(msg => msg.type === 'list');
        const hasCorrectButtonText = listMessages.some(msg => 
          msg.buttonText === lang.buttonText
        );
        
        console.log(`   ✅ Lists sent: ${listMessages.length}`);
        console.log(`   ✅ Correct button text: ${hasCorrectButtonText ? 'YES' : 'NO'}`);
        
        if (listMessages.length === 0 || !hasCorrectButtonText) {
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
    console.log('🚀 Starting Scrollable Menu Tests\n');
    console.log('=' * 60);
    
    const testResults = {
      scrollableMenu: await this.testScrollableMenu(),
      listStructure: await this.testListStructure(),
      multilingualLists: await this.testMultilingualLists()
    };
    
    console.log('=' * 60);
    console.log('🏁 Scrollable Menu Tests Complete!\n');
    
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
      console.log('\n✅ SCROLLABLE MENU: WORKING PERFECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- Single scrollable menu instead of multiple button groups');
      console.log('- All 36 states/UTs available in organized lists');
      console.log('- Proper list structure with titles and descriptions');
      console.log('- Multilingual support for button text');
      console.log('- Clean, organized user experience');
      console.log('- No more cluttered multiple button messages');
    } else {
      console.log('\n⚠️ Scrollable Menu needs improvements');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new ScrollableMenuTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Scrollable menu is working perfectly!');
    console.log('Users now see organized scrollable lists instead of cluttered button groups.');
  } else {
    console.log('\n🔧 CONCLUSION: Scrollable menu needs fixes.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ScrollableMenuTest;
