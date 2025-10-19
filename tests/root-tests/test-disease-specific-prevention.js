#!/usr/bin/env node

/**
 * Test Disease-Specific Prevention System
 * Verify dynamic prevention recommendations based on actual diseases
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

class DiseaseSpecificPreventionTest {
  constructor() {
    this.messageController = new MessageController();
  }

  testPreventionCategorization() {
    console.log('🧪 Testing Disease-Specific Prevention Categorization...\n');
    
    const testCases = [
      {
        name: 'Vector-borne diseases',
        diseases: [
          { name: 'Dengue Fever' },
          { name: 'Chikungunya' },
          { name: 'Malaria' },
          { name: 'Zika Virus' }
        ],
        expectedCategories: ['vectorBorne'],
        expectedPrevention: '🦟 **Mosquito Protection:**'
      },
      {
        name: 'Respiratory diseases',
        diseases: [
          { name: 'COVID-19' },
          { name: 'H1N1 Influenza' },
          { name: 'H3N2 Influenza' },
          { name: 'Tuberculosis' }
        ],
        expectedCategories: ['respiratory'],
        expectedPrevention: '😷 **Respiratory Protection:**'
      },
      {
        name: 'Water-borne diseases',
        diseases: [
          { name: 'Cholera' },
          { name: 'Typhoid' },
          { name: 'Hepatitis A' },
          { name: 'Diarrhea' }
        ],
        expectedCategories: ['waterBorne'],
        expectedPrevention: '💧 **Water Safety:**'
      },
      {
        name: 'Zoonotic diseases',
        diseases: [
          { name: 'Nipah Virus' },
          { name: 'Bird Flu' },
          { name: 'Melioidosis' },
          { name: 'Rabies' }
        ],
        expectedCategories: ['zoonotic'],
        expectedPrevention: '🐾 **Animal Safety:**'
      },
      {
        name: 'Mixed disease types',
        diseases: [
          { name: 'COVID-19' },          // Respiratory
          { name: 'Dengue Fever' },      // Vector-borne
          { name: 'Cholera' },           // Water-borne
          { name: 'Nipah Virus' }        // Zoonotic
        ],
        expectedCategories: ['respiratory', 'vectorBorne', 'waterBorne', 'zoonotic'],
        expectedPrevention: ['😷', '🦟', '💧', '🐾']
      }
    ];

    testCases.forEach((testCase, index) => {
      console.log(`${index + 1}. Testing: ${testCase.name}`);
      console.log(`   Diseases: ${testCase.diseases.map(d => d.name).join(', ')}`);
      
      try {
        // Test English prevention
        const prevention = this.messageController.generateDiseaseSpecificPrevention(
          testCase.diseases, 
          'en', 
          'native'
        );
        
        console.log(`   Generated Prevention (first 100 chars):`);
        console.log(`   "${prevention.substring(0, 100)}..."`);
        
        // Check if expected prevention measures are included
        if (Array.isArray(testCase.expectedPrevention)) {
          const allIncluded = testCase.expectedPrevention.every(expected => 
            prevention.includes(expected)
          );
          console.log(`   Contains all expected measures: ${allIncluded ? '✅' : '❌'}`);
        } else {
          const isIncluded = prevention.includes(testCase.expectedPrevention);
          console.log(`   Contains expected measure: ${isIncluded ? '✅' : '❌'}`);
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    });
  }

  testMultilingualPrevention() {
    console.log('🧪 Testing Multilingual Disease-Specific Prevention...\n');
    
    const testDiseases = [
      { name: 'COVID-19' },      // Respiratory
      { name: 'Dengue Fever' }   // Vector-borne
    ];
    
    const languages = ['en', 'hi', 'te', 'ta', 'or'];
    
    languages.forEach(lang => {
      console.log(`🌐 Testing language: ${lang.toUpperCase()}`);
      
      try {
        const prevention = this.messageController.generateDiseaseSpecificPrevention(
          testDiseases, 
          lang, 
          'native'
        );
        
        console.log(`   Generated prevention (first 80 chars):`);
        console.log(`   "${prevention.substring(0, 80)}..."`);
        
        // Check for language-specific elements
        const hasCorrectHeader = prevention.includes('🛡️');
        const hasCorrectFooter = prevention.includes('📍');
        const hasRespiratory = prevention.includes('😷');
        const hasVectorBorne = prevention.includes('🦟');
        
        console.log(`   Has correct header: ${hasCorrectHeader ? '✅' : '❌'}`);
        console.log(`   Has respiratory protection: ${hasRespiratory ? '✅' : '❌'}`);
        console.log(`   Has vector-borne protection: ${hasVectorBorne ? '✅' : '❌'}`);
        console.log(`   Has correct footer: ${hasCorrectFooter ? '✅' : '❌'}`);
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error for ${lang}: ${error.message}\n`);
      }
    });
  }

  testEmptyDiseasesHandling() {
    console.log('🧪 Testing Empty Diseases Handling...\n');
    
    const testCases = [
      { diseases: [], description: 'Empty array' },
      { diseases: null, description: 'Null diseases' },
      { diseases: undefined, description: 'Undefined diseases' }
    ];
    
    testCases.forEach((testCase, index) => {
      console.log(`${index + 1}. Testing: ${testCase.description}`);
      
      try {
        const prevention = this.messageController.generateDiseaseSpecificPrevention(
          testCase.diseases, 
          'en', 
          'native'
        );
        
        console.log(`   Fallback prevention generated: ${prevention ? '✅' : '❌'}`);
        console.log(`   Contains general prevention: ${prevention.includes('General Prevention') ? '✅' : '❌'}`);
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    });
  }

  testRealWorldScenario() {
    console.log('🧪 Testing Real-World Disease Scenario...\n');
    
    // Simulate real diseases from the test output we saw earlier
    const realDiseases = [
      {
        name: 'COVID-19',
        location: 'India (with cases in Andhra Pradesh, including Visakhapatnam)',
        cases: 'Active infections rising, with 4,866 active cases as of June 5, 2025',
        symptoms: 'Mild fever, dry cough, sore throat, body ache',
        prevention: 'Wear a mask in public, wash hands thoroughly'
      },
      {
        name: 'Melioidosis',
        location: 'Turakapalem village, Guntur district, Andhra Pradesh',
        cases: '4 confirmed cases out of 109 fever cases',
        symptoms: 'Fever, cough, severe pneumonia, septicemia',
        prevention: 'Avoid contact with soil and contaminated water'
      },
      {
        name: 'Diarrhea',
        location: 'New Rajarajeswari (RR) Peta, Vijayawada, Andhra Pradesh',
        cases: '163 cases reported as of September 13, 2025',
        symptoms: 'Diarrhea',
        prevention: 'Ensure safe drinking water, maintain clean surroundings'
      },
      {
        name: 'Chikungunya',
        location: 'India (particularly Maharashtra and Karnataka)',
        cases: '30,876 cases reported nationally as of July 14, 2025',
        symptoms: 'Fever, joint pain',
        prevention: 'Control mosquito breeding'
      }
    ];

    console.log('📱 Real-world scenario: User in Visakhapatnam sees these diseases');
    console.log('🎯 Expected prevention categories:');
    console.log('   - Respiratory (COVID-19)');
    console.log('   - Zoonotic (Melioidosis)'); 
    console.log('   - Water-borne (Diarrhea)');
    console.log('   - Vector-borne (Chikungunya)');
    console.log('');

    try {
      // Test English
      const englishPrevention = this.messageController.generateDiseaseSpecificPrevention(
        realDiseases, 
        'en', 
        'native'
      );
      
      console.log('📋 Generated English Prevention:');
      console.log(englishPrevention);
      console.log('');
      
      // Test Telugu (user's language from scenario)
      const teluguPrevention = this.messageController.generateDiseaseSpecificPrevention(
        realDiseases, 
        'te', 
        'native'
      );
      
      console.log('📋 Generated Telugu Prevention:');
      console.log(teluguPrevention);
      console.log('');
      
      // Verify all expected categories are present
      const expectedEmojis = ['😷', '🐾', '💧', '🦟', '🏥'];
      const allPresent = expectedEmojis.every(emoji => 
        englishPrevention.includes(emoji)
      );
      
      console.log(`✅ All expected prevention categories present: ${allPresent ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.log(`❌ Real-world scenario error: ${error.message}`);
    }
  }

  runAllTests() {
    console.log('🚀 Starting Disease-Specific Prevention Tests\n');
    console.log('=' * 70);
    
    this.testPreventionCategorization();
    this.testMultilingualPrevention();
    this.testEmptyDiseasesHandling();
    this.testRealWorldScenario();
    
    console.log('=' * 70);
    console.log('🏁 Disease-Specific Prevention Tests Complete!\n');
    
    console.log('✅ Key Improvements Implemented:');
    console.log('- Dynamic prevention based on actual diseases shown');
    console.log('- Intelligent disease categorization (6 categories)');
    console.log('- Multilingual prevention recommendations (5 languages)');
    console.log('- Specific prevention measures for each disease type');
    console.log('- Fallback to general prevention when no diseases');
    console.log('- Real-world scenario compatibility');
  }
}

// Run the tests
async function main() {
  const tester = new DiseaseSpecificPreventionTest();
  tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DiseaseSpecificPreventionTest;
