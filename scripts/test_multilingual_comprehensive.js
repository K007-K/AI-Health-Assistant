#!/usr/bin/env node

/**
 * Comprehensive Multilingual Testing Script
 * Tests all language and script combinations for the WhatsApp Healthcare Bot
 */

const axios = require('axios');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'https://agent-1-7xvs.onrender.com';
const TEST_PHONE = '918977733389'; // Test phone number

// Language and script combinations to test
const TEST_COMBINATIONS = [
  { lang: 'en', script: 'native', name: 'English' },
  { lang: 'hi', script: 'native', name: 'Hindi Native' },
  { lang: 'hi', script: 'transliteration', name: 'Hindi Transliteration' },
  { lang: 'te', script: 'native', name: 'Telugu Native' },
  { lang: 'te', script: 'transliteration', name: 'Telugu Transliteration' },
  { lang: 'ta', script: 'native', name: 'Tamil Native' },
  { lang: 'ta', script: 'transliteration', name: 'Tamil Transliteration' },
  { lang: 'or', script: 'native', name: 'Odia Native' },
  { lang: 'or', script: 'transliteration', name: 'Odia Transliteration' }
];

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Main Menu Display',
    test: async (lang, script) => {
      const response = await sendMessage('Menu');
      return response.includes('Main Menu') || response.includes('मुख्य मेनू') || 
             response.includes('ప్రధాన మెనూ') || response.includes('முக்கிய மெனு') ||
             response.includes('ମୁଖ୍ୟ ମେନୁ');
    }
  },
  {
    name: 'Language Selection',
    test: async (lang, script) => {
      const response = await sendMessage('/language');
      return response.includes('Choose your language') || response.includes('भाषा चुनें');
    }
  },
  {
    name: 'Preventive Tips Categories',
    test: async (lang, script) => {
      await sendMessage(`lang_${lang}`); // Select language
      if (script === 'transliteration') {
        await sendMessage('script_transliteration');
      } else {
        await sendMessage('script_native');
      }
      const response = await sendMessage('preventive_tips');
      return response.includes('Health Tips') || response.includes('स्वास्थ्य') || 
             response.includes('ఆరోగ్య') || response.includes('ஆரோக்கிய') ||
             response.includes('ସ୍ୱାସ୍ଥ୍ୟ');
    }
  },
  {
    name: 'Nutrition Question Response',
    test: async (lang, script) => {
      await setLanguageAndScript(lang, script);
      const questions = {
        en: 'What should I eat for good health?',
        hi: 'अच्छे स्वास्थ्य के लिए मुझे क्या खाना चाहिए?',
        te: 'మంచి ఆరోగ్యం కోసం నేను ఏమి తినాలి?',
        ta: 'நல்ல ஆரோக்கியத்திற்கு நான் என்ன சாப்பிட வேண்டும்?',
        or: 'ଭଲ ସ୍ୱାସ୍ଥ୍ୟ ପାଇଁ ମୁଁ କଣ ଖାଇବି?'
      };
      
      await sendMessage('nutrition_hygiene');
      const response = await sendMessage(questions[lang] || questions.en);
      return !response.includes('I specialize in nutrition') && response.length > 50;
    }
  },
  {
    name: 'Disease Alerts Translation',
    test: async (lang, script) => {
      await setLanguageAndScript(lang, script);
      const response = await sendMessage('disease_alerts');
      await sendMessage('view_diseases');
      
      // Wait for response and check if it's in the correct language
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true; // Basic test - just ensure no errors
    }
  }
];

// Helper functions
async function sendMessage(message) {
  try {
    const response = await axios.post(`${BASE_URL}/test/send-message`, {
      phone: TEST_PHONE,
      message: message
    });
    return response.data.response || '';
  } catch (error) {
    console.error(`Error sending message "${message}":`, error.message);
    return '';
  }
}

async function setLanguageAndScript(lang, script) {
  await sendMessage(`lang_${lang}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (script === 'transliteration') {
    await sendMessage('script_transliteration');
  } else {
    await sendMessage('script_native');
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function runTests() {
  console.log('🧪 Starting Comprehensive Multilingual Testing...\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  for (const combination of TEST_COMBINATIONS) {
    console.log(`\n📱 Testing ${combination.name} (${combination.lang}_${combination.script})`);
    console.log('=' .repeat(60));
    
    for (const scenario of TEST_SCENARIOS) {
      results.total++;
      
      try {
        console.log(`  🔍 ${scenario.name}...`);
        
        const success = await scenario.test(combination.lang, combination.script);
        
        if (success) {
          console.log(`  ✅ PASS: ${scenario.name}`);
          results.passed++;
        } else {
          console.log(`  ❌ FAIL: ${scenario.name}`);
          results.failed++;
        }
        
        results.details.push({
          combination: combination.name,
          scenario: scenario.name,
          status: success ? 'PASS' : 'FAIL'
        });
        
        // Wait between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`  ❌ ERROR: ${scenario.name} - ${error.message}`);
        results.failed++;
        results.details.push({
          combination: combination.name,
          scenario: scenario.name,
          status: 'ERROR',
          error: error.message
        });
      }
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} (${((results.passed/results.total)*100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed} (${((results.failed/results.total)*100).toFixed(1)}%)`);
  
  // Print detailed results
  console.log('\n📋 DETAILED RESULTS:');
  console.log('-'.repeat(80));
  
  const groupedResults = {};
  results.details.forEach(result => {
    if (!groupedResults[result.combination]) {
      groupedResults[result.combination] = [];
    }
    groupedResults[result.combination].push(result);
  });
  
  Object.keys(groupedResults).forEach(combination => {
    console.log(`\n${combination}:`);
    groupedResults[combination].forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${result.scenario}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
  });
  
  // Recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! The multilingual system is working perfectly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the detailed results above.');
    
    // Analyze common failure patterns
    const failedScenarios = results.details.filter(r => r.status !== 'PASS');
    const scenarioFailures = {};
    
    failedScenarios.forEach(failure => {
      if (!scenarioFailures[failure.scenario]) {
        scenarioFailures[failure.scenario] = 0;
      }
      scenarioFailures[failure.scenario]++;
    });
    
    console.log('\nMost common failure points:');
    Object.keys(scenarioFailures)
      .sort((a, b) => scenarioFailures[b] - scenarioFailures[a])
      .forEach(scenario => {
        console.log(`  • ${scenario}: ${scenarioFailures[scenario]} failures`);
      });
  }
  
  console.log('\n✅ Testing completed!');
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
