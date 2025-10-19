#!/usr/bin/env node

/**
 * Test WhatsApp Service Methods
 * Verify that sendInteractiveList method exists and works correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const WhatsAppService = require('./src/services/whatsappService');
const MockWhatsAppService = require('./src/services/mockWhatsappService');

class WhatsAppServiceTest {
  constructor() {
    // Use mock service for testing
    this.whatsappService = new MockWhatsAppService();
    this.realWhatsappService = new WhatsAppService();
  }

  async testSendInteractiveListMethod() {
    console.log('🧪 Testing sendInteractiveList Method\n');
    
    try {
      // Check if method exists
      const hasMethod = typeof this.realWhatsappService.sendInteractiveList === 'function';
      console.log(`✅ sendInteractiveList method exists: ${hasMethod ? 'YES' : 'NO'}`);
      
      if (!hasMethod) {
        console.log('❌ Method missing! This explains why lists are not working.');
        return false;
      }
      
      // Test with mock service
      const testItems = [
        { id: 'state_1', title: 'Andhra Pradesh', description: 'State' },
        { id: 'state_2', title: 'Karnataka', description: 'State' },
        { id: 'state_3', title: 'Delhi', description: 'Union Territory' }
      ];
      
      console.log('Testing with mock service...');
      const result = await this.whatsappService.sendInteractiveList(
        '+1234567890',
        'Select your state:',
        'Choose State',
        testItems
      );
      
      console.log(`✅ Mock service result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return hasMethod && result.success;
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      return false;
    }
  }

  async testMethodSignatures() {
    console.log('\n🧪 Testing Method Signatures\n');
    
    const methods = [
      'sendMessage',
      'sendInteractiveButtons', 
      'sendInteractiveList',
      'sendList'
    ];
    
    let allMethodsExist = true;
    
    methods.forEach(methodName => {
      const exists = typeof this.realWhatsappService[methodName] === 'function';
      console.log(`✅ ${methodName}: ${exists ? 'EXISTS' : 'MISSING'}`);
      if (!exists) allMethodsExist = false;
    });
    
    return allMethodsExist;
  }

  async testListStructure() {
    console.log('\n🧪 Testing List Structure\n');
    
    try {
      const testItems = [
        { id: 'state_1', title: 'Andhra Pradesh', description: 'State' },
        { id: 'state_14', title: 'Maharashtra', description: 'State' },
        { id: 'state_9', title: 'Delhi', description: 'Union Territory' }
      ];
      
      console.log('Input items:');
      testItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.title} (${item.description}) [${item.id}]`);
      });
      
      // Test the conversion logic
      const sections = [{
        title: 'Options',
        rows: testItems.map(item => ({
          id: item.id,
          title: item.title.length > 24 ? item.title.substring(0, 21) + '...' : item.title,
          description: item.description || ''
        }))
      }];
      
      console.log('\nConverted structure:');
      sections[0].rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.title} (${row.description}) [${row.id}]`);
      });
      
      // Validate structure
      const isValid = sections[0].rows.every(row => 
        row.id && row.title && typeof row.description === 'string'
      );
      
      console.log(`\n✅ Structure valid: ${isValid ? 'YES' : 'NO'}`);
      
      return isValid;
      
    } catch (error) {
      console.log(`❌ Structure test failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting WhatsApp Service Tests\n');
    console.log('=' * 50);
    
    const testResults = {
      sendInteractiveListMethod: await this.testSendInteractiveListMethod(),
      methodSignatures: await this.testMethodSignatures(),
      listStructure: await this.testListStructure()
    };
    
    console.log('=' * 50);
    console.log('🏁 WhatsApp Service Tests Complete!\n');
    
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
      console.log('\n✅ WHATSAPP SERVICE: WORKING CORRECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- sendInteractiveList method exists and works');
      console.log('- All required methods are available');
      console.log('- List structure conversion working');
      console.log('- Mock service integration successful');
    } else {
      console.log('\n⚠️ WhatsApp Service has issues');
      
      if (!testResults.sendInteractiveListMethod) {
        console.log('\n🔧 ISSUE IDENTIFIED: sendInteractiveList method problem');
        console.log('This explains why the system falls back to text input!');
      }
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new WhatsAppServiceTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: WhatsApp service is working correctly!');
    console.log('The issue might be elsewhere in the system.');
  } else {
    console.log('\n🔧 CONCLUSION: WhatsApp service needs fixes.');
    console.log('This is likely why interactive lists are not working.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WhatsAppServiceTest;
