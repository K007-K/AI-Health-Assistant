const GeminiService = require('../src/services/geminiService');

// Test general chat redirects for food/nutrition items
async function testGeneralChatRedirects() {
  console.log('🔄 GENERAL CHAT REDIRECTS TEST');
  console.log('==============================\n');

  const geminiService = new GeminiService();
  
  // Test cases for general chat redirects
  const testCases = [
    {
      name: 'Food Item - Chocolate',
      query: 'chocolate',
      expected: 'redirect',
      description: 'Should redirect to nutrition menu'
    },
    {
      name: 'Food Item - Milk',
      query: 'milk',
      expected: 'redirect',
      description: 'Should redirect to nutrition menu'
    },
    {
      name: 'Nutrient - Vitamins',
      query: 'vitamins',
      expected: 'redirect',
      description: 'Should redirect to nutrition menu'
    },
    {
      name: 'Exercise - Running',
      query: 'running',
      expected: 'redirect',
      description: 'Should redirect to exercise menu'
    },
    {
      name: 'Valid Health - Diabetes',
      query: 'diabetes',
      expected: 'health_info',
      description: 'Should provide health information'
    },
    {
      name: 'Valid Health - Fever',
      query: 'fever',
      expected: 'health_info',
      description: 'Should provide health information'
    }
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`📝 Query: "${testCase.query}"`);
    console.log(`🎯 Expected: ${testCase.expected}`);
    console.log(`📋 Description: ${testCase.description}`);
    
    try {
      const startTime = Date.now();
      const result = await geminiService.generateResponse(
        testCase.query,
        'en',
        'native',
        [],
        'normal',
        3,
        'general'  // Using general conversation mode
      );
      const endTime = Date.now();
      
      console.log(`⏱️ Response time: ${endTime - startTime}ms`);
      console.log(`📄 Response: ${result.substring(0, 300)}${result.length > 300 ? '...' : ''}`);
      
      // Validate response based on expected type
      let testPassed = false;
      
      if (testCase.expected === 'redirect') {
        // Check for redirect message
        const hasRedirect = result.includes('related to nutrition') || 
                           result.includes('related to exercise') ||
                           result.includes('menu option') ||
                           result.includes('Nutrition & Hygiene') ||
                           result.includes('Exercise & Lifestyle');
        
        if (hasRedirect) {
          testPassed = true;
          console.log(`✅ PASS - Proper redirect provided`);
        } else {
          console.log(`❌ FAIL - No redirect detected, providing general info instead`);
        }
      } else if (testCase.expected === 'health_info') {
        // Check for health information (not redirect)
        const hasHealthInfo = !result.includes('menu option') && 
                             (result.includes('•') || result.includes('health') || result.includes('medical'));
        
        if (hasHealthInfo) {
          testPassed = true;
          console.log(`✅ PASS - Health information provided`);
        } else {
          console.log(`❌ FAIL - Expected health info but got redirect or other response`);
        }
      }
      
      if (testPassed) {
        passedTests++;
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log(`🎯 Result: FAIL - API Error`);
    }
    
    // Add delay to avoid rate limits
    if (totalTests < testCases.length) {
      console.log('⏳ Waiting 2000ms to avoid rate limits...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final report
  console.log('\n==============================');
  console.log('📊 GENERAL CHAT REDIRECTS TEST REPORT');
  console.log('==============================\n');
  
  console.log(`🎯 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed Tests: ${passedTests}`);
  console.log(`   Failed Tests: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All general chat redirect tests passed!');
    console.log('✅ Food/nutrition items properly redirected to menu options');
  } else {
    console.log('⚠️ Some general chat redirect tests failed');
    console.log('🔧 General chat redirects need further debugging');
  }
  
  console.log('\n==============================\n');
  
  return passedTests === totalTests;
}

// Run the test
testGeneralChatRedirects()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
