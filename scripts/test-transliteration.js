const GeminiService = require('../src/services/geminiService');
const LanguageUtils = require('../src/utils/languageUtils');

// Test transliteration functionality
async function testTransliteration() {
  console.log('🔤 TRANSLITERATION FUNCTIONALITY TEST');
  console.log('=====================================\n');

  const geminiService = new GeminiService();
  
  const testCases = [
    {
      language: 'hi',
      scriptType: 'transliteration',
      query: 'mujhe sar dard hai',
      expectedPattern: /[a-zA-Z\s,.-]+/,
      description: 'Hindi transliteration - headache query'
    },
    {
      language: 'te',
      scriptType: 'transliteration', 
      query: 'naku tala noppi undi',
      expectedPattern: /[a-zA-Z\s,.-]+/,
      description: 'Telugu transliteration - headache query'
    },
    {
      language: 'ta',
      scriptType: 'transliteration',
      query: 'enakku thalai vali irukku',
      expectedPattern: /[a-zA-Z\s,.-]+/,
      description: 'Tamil transliteration - headache query'
    },
    {
      language: 'or',
      scriptType: 'transliteration',
      query: 'mo mathaa byatha',
      expectedPattern: /[a-zA-Z\s,.-]+/,
      description: 'Odia transliteration - headache query'
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`🧪 Testing: ${testCase.description}`);
    console.log(`📝 Query: "${testCase.query}" (${testCase.language.toUpperCase()}, ${testCase.scriptType})`);
    
    try {
      const response = await geminiService.generateResponse(
        testCase.query,
        testCase.language,
        testCase.scriptType,
        [],
        'normal'
      );
      
      console.log(`✅ Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
      
      // Check if response is in Roman letters (transliteration)
      const isTransliterated = testCase.expectedPattern.test(response);
      const hasNativeScript = /[\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F]/.test(response);
      
      console.log(`🔤 Is Transliterated: ${isTransliterated ? 'Yes' : 'No'}`);
      console.log(`📜 Has Native Script: ${hasNativeScript ? 'Yes' : 'No'}`);
      
      if (isTransliterated && !hasNativeScript) {
        console.log(`🎯 Result: PASS`);
        passedTests++;
      } else {
        console.log(`❌ Result: FAIL - Expected transliterated text, got native script`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log(`🎯 Result: FAIL`);
    }
    
    console.log('');
    
    // Add delay to avoid rate limits
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2000ms to avoid rate limits...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final report
  console.log('=====================================');
  console.log('📊 TRANSLITERATION TEST REPORT');
  console.log('=====================================\n');
  
  console.log(`🎯 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed Tests: ${passedTests}`);
  console.log(`   Failed Tests: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All transliteration tests passed!');
    console.log('✅ Transliteration functionality is working correctly');
  } else {
    console.log('⚠️ Some transliteration tests failed');
    console.log('🔧 Transliteration needs fixes');
  }
  
  console.log('\n=====================================\n');
  
  return passedTests === totalTests;
}

// Run the test
testTransliteration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
