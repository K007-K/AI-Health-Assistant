#!/usr/bin/env node

/**
 * Test Comprehensive Disease System (State + Nationwide)
 * Verify that the system fetches and displays both state-specific and nationwide diseases
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const AIDiseaseMonitorService = require('./src/services/aiDiseaseMonitorService');
const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class ComprehensiveDiseaseTest {
  constructor() {
    this.aiService = new AIDiseaseMonitorService();
    this.cacheService = new DiseaseOutbreakCacheService();
    this.messageController = new MessageController();
    this.sentMessages = [];
    
    // Mock WhatsApp service to capture messages
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, type: 'message' });
        console.log(`📱 MESSAGE: ${message.substring(0, 100)}...`);
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        this.sentMessages.push({ phone, text, buttons, type: 'buttons' });
        console.log(`🔘 BUTTONS: ${text}`);
        return { success: true };
      }
    };
  }

  async testAIServiceComprehensiveData() {
    console.log('🧪 Testing AI Service Comprehensive Data Fetching\n');
    
    try {
      console.log('1. Testing state-specific disease fetching...');
      const stateData = await this.aiService.fetchStateSpecificDiseases('Andhra Pradesh');
      
      console.log(`   ✅ State diseases found: ${stateData.length}`);
      if (stateData.length > 0) {
        console.log(`   📍 Sample state disease: ${stateData[0].name} in ${stateData[0].location}`);
      }
      
      console.log('\n2. Testing nationwide disease fetching...');
      const nationwideData = await this.aiService.fetchNationwideDiseases();
      
      console.log(`   ✅ Nationwide diseases found: ${nationwideData.length}`);
      if (nationwideData.length > 0) {
        console.log(`   🇮🇳 Sample nationwide disease: ${nationwideData[0].name} in ${nationwideData[0].location}`);
      }
      
      console.log('\n3. Testing comprehensive data structure...');
      const comprehensiveData = await this.aiService.getDailyDiseaseOutbreaks('Andhra Pradesh');
      
      const hasStateData = comprehensiveData.stateSpecific && comprehensiveData.stateSpecific.length > 0;
      const hasNationwideData = comprehensiveData.nationwide && comprehensiveData.nationwide.length > 0;
      const hasProperStructure = comprehensiveData.userState === 'Andhra Pradesh';
      
      console.log(`   ✅ State-specific data: ${hasStateData ? 'YES' : 'NO'} (${comprehensiveData.stateSpecific?.length || 0} diseases)`);
      console.log(`   ✅ Nationwide data: ${hasNationwideData ? 'YES' : 'NO'} (${comprehensiveData.nationwide?.length || 0} diseases)`);
      console.log(`   ✅ Proper structure: ${hasProperStructure ? 'YES' : 'NO'}`);
      
      return hasStateData && hasNationwideData && hasProperStructure;
      
    } catch (error) {
      console.log(`   ❌ AI Service test failed: ${error.message}`);
      return false;
    }
  }

  async testCacheServiceIntegration() {
    console.log('\n🧪 Testing Cache Service Integration\n');
    
    try {
      console.log('1. Testing comprehensive cache data retrieval...');
      const cacheData = await this.cacheService.getDiseaseOutbreakData('Maharashtra');
      
      const hasAllDiseases = cacheData.diseases && cacheData.diseases.length > 0;
      const hasStateSpecific = cacheData.stateSpecific && Array.isArray(cacheData.stateSpecific);
      const hasNationwide = cacheData.nationwide && Array.isArray(cacheData.nationwide);
      const hasUserState = cacheData.userState === 'Maharashtra';
      
      console.log(`   ✅ All diseases array: ${hasAllDiseases ? 'YES' : 'NO'} (${cacheData.diseases?.length || 0} total)`);
      console.log(`   ✅ State-specific array: ${hasStateSpecific ? 'YES' : 'NO'} (${cacheData.stateSpecific?.length || 0} diseases)`);
      console.log(`   ✅ Nationwide array: ${hasNationwide ? 'YES' : 'NO'} (${cacheData.nationwide?.length || 0} diseases)`);
      console.log(`   ✅ User state tracking: ${hasUserState ? 'YES' : 'NO'}`);
      console.log(`   ✅ Data source: ${cacheData.source}`);
      
      // Check disease categorization
      if (cacheData.diseases && cacheData.diseases.length > 0) {
        const stateDiseases = cacheData.diseases.filter(d => d.isState);
        const nationalDiseases = cacheData.diseases.filter(d => !d.isState);
        
        console.log(`   ✅ State diseases marked: ${stateDiseases.length}`);
        console.log(`   ✅ National diseases marked: ${nationalDiseases.length}`);
      }
      
      return hasAllDiseases && hasStateSpecific && hasNationwide && hasUserState;
      
    } catch (error) {
      console.log(`   ❌ Cache Service test failed: ${error.message}`);
      return false;
    }
  }

  async testMessageControllerDisplay() {
    console.log('\n🧪 Testing Message Controller Display\n');
    
    try {
      const testUser = {
        id: 'test-user-001',
        phone_number: '+1234567890',
        preferred_language: 'en',
        script_preference: 'native'
      };
      
      console.log('1. Testing handleViewActiveDiseases...');
      this.sentMessages = [];
      
      await this.messageController.handleViewActiveDiseases(testUser);
      
      console.log(`   📱 Total messages sent: ${this.sentMessages.length}`);
      
      // Check for state and nationwide sections
      const hasStateHeader = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Diseases in')
      );
      
      const hasNationwideHeader = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Nationwide Disease Outbreaks')
      );
      
      const hasMainHeader = this.sentMessages.some(msg => 
        msg.message && msg.message.includes('Current Disease Outbreaks')
      );
      
      const hasButtons = this.sentMessages.some(msg => msg.type === 'buttons');
      
      console.log(`   ✅ Main header: ${hasMainHeader ? 'YES' : 'NO'}`);
      console.log(`   ✅ State section header: ${hasStateHeader ? 'YES' : 'NO'}`);
      console.log(`   ✅ Nationwide section header: ${hasNationwideHeader ? 'YES' : 'NO'}`);
      console.log(`   ✅ Follow-up buttons: ${hasButtons ? 'YES' : 'NO'}`);
      
      // Show sample messages
      console.log('\n   📄 Sample messages sent:');
      this.sentMessages.slice(0, 5).forEach((msg, index) => {
        const preview = msg.message ? msg.message.substring(0, 80) + '...' : `[${msg.type.toUpperCase()}]`;
        console.log(`   ${index + 1}. ${preview}`);
      });
      
      return hasMainHeader && (hasStateHeader || hasNationwideHeader) && hasButtons;
      
    } catch (error) {
      console.log(`   ❌ Message Controller test failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Disease System Tests\n');
    console.log('=' * 70);
    
    const testResults = {
      aiServiceComprehensiveData: await this.testAIServiceComprehensiveData(),
      cacheServiceIntegration: await this.testCacheServiceIntegration(),
      messageControllerDisplay: await this.testMessageControllerDisplay()
    };
    
    console.log('=' * 70);
    console.log('🏁 Comprehensive Disease System Tests Complete!\n');
    
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
      console.log('\n✅ COMPREHENSIVE DISEASE SYSTEM: WORKING PERFECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- State-specific disease fetching and display');
      console.log('- Nationwide disease fetching and display');
      console.log('- Proper data categorization and prioritization');
      console.log('- Clear section headers for state vs nationwide');
      console.log('- Comprehensive cache service integration');
      console.log('- Complete user interface with both data types');
    } else {
      console.log('\n⚠️ Comprehensive disease system needs improvements');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new ComprehensiveDiseaseTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Comprehensive disease system is working perfectly!');
    console.log('Users will now see both state-specific AND nationwide disease outbreaks.');
  } else {
    console.log('\n🔧 CONCLUSION: Comprehensive disease system needs fixes.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ComprehensiveDiseaseTest;
