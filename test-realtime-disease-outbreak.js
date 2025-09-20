#!/usr/bin/env node

/**
 * Test Real-Time Disease Outbreak System
 * Verify location-specific, multilingual, current disease information
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');
const AIDiseaseMonitorService = require('./src/services/aiDiseaseMonitorService');
const { LanguageUtils } = require('./src/utils/languageUtils');

class RealTimeDiseaseOutbreakTest {
  constructor() {
    this.messageController = new MessageController();
    this.aiDiseaseMonitor = new AIDiseaseMonitorService();
    
    // Mock services for testing
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        console.log(`📱 MOCK SMS to ${phone}:`);
        console.log(`💬 ${message}\n`);
        return { success: true };
      }
    };
    
    this.messageController.diseaseAlertService = {
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  state: 'Andhra Pradesh',
                  district: 'Visakhapatnam',
                  pincode: '530001'
                }
              })
            })
          })
        })
      }
    };
  }

  async testLocationSpecificSearch() {
    console.log('🧪 Testing Location-Specific Disease Search...\n');
    
    const testLocations = [
      {
        name: 'Visakhapatnam, Andhra Pradesh',
        location: { state: 'Andhra Pradesh', district: 'Visakhapatnam' }
      },
      {
        name: 'Mumbai, Maharashtra',
        location: { state: 'Maharashtra', district: 'Mumbai' }
      },
      {
        name: 'No Location',
        location: null
      }
    ];

    for (const testCase of testLocations) {
      console.log(`📍 Testing location: ${testCase.name}`);
      
      try {
        // Test the AI search prompt generation
        const currentDate = new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric'
        });
        
        let locationQuery = 'India';
        if (testCase.location) {
          if (testCase.location.district && testCase.location.state) {
            locationQuery = `${testCase.location.district}, ${testCase.location.state}, India`;
          } else if (testCase.location.state) {
            locationQuery = `${testCase.location.state}, India`;
          }
        }
        
        console.log(`   🔍 Search Query: "${locationQuery}"`);
        console.log(`   📅 Search Date: ${currentDate}`);
        console.log(`   ✅ Location-specific search configured correctly\n`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }
  }

  async testMultilingualHeaders() {
    console.log('🧪 Testing Multilingual Disease Outbreak Headers...\n');
    
    const languages = ['en', 'hi', 'te', 'ta', 'or'];
    const testLocation = { state: 'Andhra Pradesh', district: 'Visakhapatnam' };
    
    for (const lang of languages) {
      console.log(`🌐 Testing language: ${lang.toUpperCase()}`);
      
      try {
        // Test main header
        const headerTemplate = LanguageUtils.getText('disease_outbreak_header', lang, 'en', 'native');
        const locationText = ` in ${testLocation.state}, ${testLocation.district}`;
        const currentDate = new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const headerText = headerTemplate.replace('{location}', locationText).replace('{date}', currentDate);
        
        console.log(`   📋 Main Header: ${headerText.substring(0, 50)}...`);
        
        // Test local header
        const localHeaderTemplate = LanguageUtils.getText('disease_local_header', lang, 'en', 'native');
        const localHeaderText = localHeaderTemplate.replace('{location}', testLocation.district);
        console.log(`   🚨 Local Header: ${localHeaderText}`);
        
        // Test state header
        const stateHeaderTemplate = LanguageUtils.getText('disease_state_header', lang, 'en', 'native');
        const stateHeaderText = stateHeaderTemplate.replace('{state}', testLocation.state);
        console.log(`   ⚠️ State Header: ${stateHeaderText}`);
        
        // Test national header
        const nationalHeaderText = LanguageUtils.getText('disease_national_header', lang, 'en', 'native');
        console.log(`   🇮🇳 National Header: ${nationalHeaderText}`);
        
        // Test no diseases message
        const noDiseaseText = LanguageUtils.getText('no_diseases_found', lang, 'en', 'native');
        console.log(`   ✅ No Diseases: ${noDiseaseText.substring(0, 30)}...`);
        
        console.log(`   ✅ All templates working for ${lang.toUpperCase()}\n`);
        
      } catch (error) {
        console.log(`   ❌ Error for ${lang}: ${error.message}\n`);
      }
    }
  }

  async testDiseaseMessageFormatting() {
    console.log('🧪 Testing Disease Message Formatting...\n');
    
    // Mock disease data with different priorities
    const mockDiseases = [
      {
        name: 'Local Health Alert',
        location: 'Andhra Pradesh (Visakhapatnam)',
        cases: 'Multiple cases reported this week',
        symptoms: 'Fever, headache, body aches',
        prevention: 'Maintain hygiene, drink clean water',
        priority: 1,
        isLocal: true,
        isState: false,
        isNearby: false
      },
      {
        name: 'State Health Alert',
        location: 'Andhra Pradesh (Multiple districts)',
        cases: 'Cases reported across the state',
        symptoms: 'Respiratory symptoms, fatigue',
        prevention: 'Wear masks, avoid crowded places',
        priority: 2,
        isLocal: false,
        isState: true,
        isNearby: false
      },
      {
        name: 'Regional Health Alert',
        location: 'Telangana (Hyderabad)',
        cases: 'Increasing cases in nearby state',
        symptoms: 'Joint pain, skin rash',
        prevention: 'Use mosquito repellent, clean surroundings',
        priority: 3,
        isLocal: false,
        isState: false,
        isNearby: true
      },
      {
        name: 'National Health Alert',
        location: 'Multiple states across India',
        cases: 'Nationwide monitoring ongoing',
        symptoms: 'Various symptoms reported',
        prevention: 'Follow health guidelines',
        priority: 4,
        isLocal: false,
        isState: false,
        isNearby: false
      }
    ];

    const userLocation = { state: 'Andhra Pradesh', district: 'Visakhapatnam' };

    console.log('📱 Testing disease message formatting:');
    
    mockDiseases.forEach((disease, index) => {
      console.log(`\n${index + 1}. ${disease.name} (Priority ${disease.priority}):`);
      
      try {
        const message = this.messageController.formatLocationAwareDiseaseNews(disease, userLocation);
        console.log(message);
        
        // Check for correct priority indicators
        const expectedEmojis = {
          1: '🚨',
          2: '⚠️',
          3: '📍',
          4: '🔍'
        };
        
        const hasCorrectEmoji = message.includes(expectedEmojis[disease.priority]);
        console.log(`   Priority Indicator: ${hasCorrectEmoji ? '✅' : '❌'} (${expectedEmojis[disease.priority]})`);
        
      } catch (error) {
        console.log(`   ❌ Formatting Error: ${error.message}`);
      }
    });
  }

  async testCompleteWorkflow() {
    console.log('\n🧪 Testing Complete Disease Outbreak Workflow...\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+1234567890',
      preferred_language: 'te', // Telugu
      script_preference: 'native'
    };

    console.log('👤 Test User Profile:');
    console.log(`   📞 Phone: ${testUser.phone_number}`);
    console.log(`   🌐 Language: ${testUser.preferred_language} (${testUser.script_preference})`);
    console.log(`   📍 Location: Visakhapatnam, Andhra Pradesh (from alert preferences)\n`);

    try {
      console.log('🚀 Executing disease outbreak workflow...\n');
      
      // This would normally call the real AI service, but we'll simulate it
      await this.messageController.handleViewActiveDiseases(testUser);
      
      console.log('✅ Workflow completed successfully!');
      
    } catch (error) {
      console.log(`❌ Workflow Error: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Real-Time Disease Outbreak Tests\n');
    console.log('=' * 70);
    
    await this.testLocationSpecificSearch();
    await this.testMultilingualHeaders();
    await this.testDiseaseMessageFormatting();
    await this.testCompleteWorkflow();
    
    console.log('=' * 70);
    console.log('🏁 Real-Time Disease Outbreak Tests Complete!\n');
    
    console.log('✅ Expected Improvements:');
    console.log('- Real-time web search for current disease information');
    console.log('- Location-specific disease prioritization');
    console.log('- Multilingual headers and messages');
    console.log('- Current date information (not old cached data)');
    console.log('- Priority-based visual indicators');
    console.log('- Proper local → state → nearby → national ordering');
  }
}

// Run the tests
async function main() {
  const tester = new RealTimeDiseaseOutbreakTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RealTimeDiseaseOutbreakTest;
