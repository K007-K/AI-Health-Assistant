#!/usr/bin/env node

/**
 * Test Disease Location Priority - Verify local diseases show first
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

class DiseaseLocationPriorityTest {
  constructor() {
    this.messageController = new MessageController();
  }

  testLocationPrioritization() {
    console.log('🧪 Testing Disease Location Prioritization...\n');
    
    // Mock disease data (similar to what AI service would return)
    const mockDiseases = [
      {
        name: 'H3N2 Influenza A',
        location: 'Delhi-NCR (Delhi, Gurugram, Noida, Faridabad, Ghaziabad), Kolkata',
        cases: '69% of households in Delhi-NCR reported flu-like symptoms',
        symptoms: 'Fever, cough, sore throat, body aches, headaches, fatigue',
        prevention: 'Maintain hygiene, wash hands frequently, avoid close contact'
      },
      {
        name: 'Nipah Virus (NiV)',
        location: 'Kerala (Malappuram and Palakkad districts)',
        cases: '4 confirmed cases reported between May and July 2025, with 2 deaths',
        symptoms: 'Fever, headaches, myalgia, vomiting, sore throat, dizziness',
        prevention: 'Awareness of risk factors, avoiding contact with infected animals'
      },
      {
        name: 'Dengue Fever',
        location: 'Andhra Pradesh (Visakhapatnam, Vijayawada, Guntur)',
        cases: 'Rising cases in coastal districts, 150+ cases reported this month',
        symptoms: 'High fever, severe headache, pain behind eyes, muscle pain',
        prevention: 'Remove stagnant water, use mosquito nets, wear protective clothing'
      },
      {
        name: 'Chikungunya',
        location: 'Telangana (Hyderabad, Warangal)',
        cases: 'Outbreak in urban areas, 80+ confirmed cases',
        symptoms: 'Sudden fever, severe joint pain, muscle pain, headache',
        prevention: 'Control mosquito breeding, use repellents'
      },
      {
        name: 'Malaria',
        location: 'Odisha (Koraput, Malkangiri districts)',
        cases: 'Seasonal increase, 200+ cases in tribal areas',
        symptoms: 'Fever, chills, sweating, headache, nausea',
        prevention: 'Use bed nets, eliminate standing water'
      }
    ];

    // Test different user locations
    const testLocations = [
      {
        name: 'Visakhapatnam, Andhra Pradesh',
        location: { state: 'Andhra Pradesh', district: 'Visakhapatnam' },
        expectedFirst: 'Dengue Fever' // Local disease
      },
      {
        name: 'Hyderabad, Telangana', 
        location: { state: 'Telangana', district: 'Hyderabad' },
        expectedFirst: 'Chikungunya' // State disease
      },
      {
        name: 'Chennai, Tamil Nadu',
        location: { state: 'Tamil Nadu', district: 'Chennai' },
        expectedFirst: 'Dengue Fever' // Nearby state (Andhra Pradesh)
      },
      {
        name: 'Mumbai, Maharashtra',
        location: { state: 'Maharashtra', district: 'Mumbai' },
        expectedFirst: 'Chikungunya' // Nearby state (Telangana)
      }
    ];

    console.log('🎯 Testing location-based disease prioritization:\n');

    testLocations.forEach((testCase, index) => {
      console.log(`${index + 1}. User Location: ${testCase.name}`);
      
      // Test prioritization logic
      const prioritizedDiseases = this.messageController.prioritizeDiseasesByLocation(
        mockDiseases, 
        testCase.location
      );
      
      console.log('   Prioritized order:');
      prioritizedDiseases.forEach((disease, i) => {
        const priorityLabel = {
          1: '🚨 LOCAL',
          2: '⚠️ STATE', 
          3: '📍 NEARBY',
          4: '🔍 NATIONAL'
        }[disease.priority] || '❓ UNKNOWN';
        
        console.log(`   ${i + 1}. ${priorityLabel} - ${disease.name} (Priority: ${disease.priority})`);
      });
      
      const actualFirst = prioritizedDiseases[0]?.name;
      const isCorrect = actualFirst === testCase.expectedFirst;
      
      console.log(`   Expected first: ${testCase.expectedFirst}`);
      console.log(`   Actual first: ${actualFirst} ${isCorrect ? '✅' : '❌'}`);
      console.log('');
    });
  }

  testLocationMatching() {
    console.log('🧪 Testing Location Matching Logic...\n');
    
    const testCases = [
      {
        userState: 'andhra pradesh',
        userDistrict: 'visakhapatnam',
        diseaseLocation: 'Andhra Pradesh (Visakhapatnam, Vijayawada)',
        expectedPriority: 1, // Local match
        expectedFlags: { isLocal: true, isState: false, isNearby: false }
      },
      {
        userState: 'andhra pradesh',
        userDistrict: 'guntur',
        diseaseLocation: 'Andhra Pradesh (Visakhapatnam, Vijayawada)',
        expectedPriority: 2, // State match (different district)
        expectedFlags: { isLocal: false, isState: true, isNearby: false }
      },
      {
        userState: 'tamil nadu',
        userDistrict: 'chennai',
        diseaseLocation: 'Andhra Pradesh (Visakhapatnam)',
        expectedPriority: 3, // Nearby state
        expectedFlags: { isLocal: false, isState: false, isNearby: true }
      },
      {
        userState: 'maharashtra',
        userDistrict: 'mumbai',
        diseaseLocation: 'Kerala (Malappuram)',
        expectedPriority: 4, // National (distant)
        expectedFlags: { isLocal: false, isState: false, isNearby: false }
      }
    ];

    console.log('🎯 Testing location matching accuracy:\n');

    testCases.forEach((testCase, index) => {
      console.log(`${index + 1}. User: ${testCase.userState}, ${testCase.userDistrict}`);
      console.log(`   Disease Location: ${testCase.diseaseLocation}`);
      
      const mockDisease = {
        name: 'Test Disease',
        location: testCase.diseaseLocation
      };
      
      const userLocation = {
        state: testCase.userState,
        district: testCase.userDistrict
      };
      
      const result = this.messageController.prioritizeDiseasesByLocation([mockDisease], userLocation)[0];
      
      console.log(`   Expected Priority: ${testCase.expectedPriority}, Got: ${result.priority} ${result.priority === testCase.expectedPriority ? '✅' : '❌'}`);
      console.log(`   Expected isLocal: ${testCase.expectedFlags.isLocal}, Got: ${result.isLocal} ${result.isLocal === testCase.expectedFlags.isLocal ? '✅' : '❌'}`);
      console.log(`   Expected isState: ${testCase.expectedFlags.isState}, Got: ${result.isState} ${result.isState === testCase.expectedFlags.isState ? '✅' : '❌'}`);
      console.log(`   Expected isNearby: ${testCase.expectedFlags.isNearby}, Got: ${result.isNearby} ${result.isNearby === testCase.expectedFlags.isNearby ? '✅' : '❌'}`);
      console.log('');
    });
  }

  testMessageFormatting() {
    console.log('🧪 Testing Location-Aware Message Formatting...\n');
    
    const mockDisease = {
      name: 'Dengue Fever',
      location: 'Andhra Pradesh (Visakhapatnam)',
      cases: '150+ cases reported this month',
      symptoms: 'High fever, severe headache, pain behind eyes',
      prevention: 'Remove stagnant water, use mosquito nets',
      isLocal: true,
      priority: 1
    };
    
    const userLocation = {
      state: 'Andhra Pradesh',
      district: 'Visakhapatnam'
    };
    
    console.log('📱 Formatted message for local disease:');
    const message = this.messageController.formatLocationAwareDiseaseNews(mockDisease, userLocation);
    console.log(message);
    console.log('');
    
    // Test different priority levels
    const priorityTests = [
      { priority: 1, isLocal: true, label: 'LOCAL', expectedEmoji: '🚨' },
      { priority: 2, isState: true, label: 'STATE', expectedEmoji: '⚠️' },
      { priority: 3, isNearby: true, label: 'NEARBY', expectedEmoji: '📍' },
      { priority: 4, label: 'NATIONAL', expectedEmoji: '🔍' }
    ];
    
    console.log('🎯 Testing priority indicators:');
    priorityTests.forEach(test => {
      const testDisease = { ...mockDisease, ...test };
      const formatted = this.messageController.formatLocationAwareDiseaseNews(testDisease, userLocation);
      const hasCorrectEmoji = formatted.includes(test.expectedEmoji);
      console.log(`   ${test.label}: ${hasCorrectEmoji ? '✅' : '❌'} (${test.expectedEmoji})`);
    });
  }

  runAllTests() {
    console.log('🚀 Starting Disease Location Priority Tests\n');
    console.log('=' * 60);
    
    this.testLocationPrioritization();
    this.testLocationMatching();
    this.testMessageFormatting();
    
    console.log('=' * 60);
    console.log('🏁 Disease Location Priority Tests Complete!');
    console.log('\n✅ Expected Results:');
    console.log('- Local diseases show first (🚨)');
    console.log('- State diseases show second (⚠️)');
    console.log('- Nearby state diseases show third (📍)');
    console.log('- National diseases show last (🔍)');
    console.log('- Clear section headers for different regions');
  }
}

// Run the tests
async function main() {
  const tester = new DiseaseLocationPriorityTest();
  tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DiseaseLocationPriorityTest;
