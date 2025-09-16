const GeminiService = require('../src/services/geminiService');

// Test disease awareness functionality
async function testDiseaseAwareness() {
  console.log('🦠 DISEASE AWARENESS TEST');
  console.log('========================\n');

  const geminiService = new GeminiService();
  
  // Test cases for disease detection and redirects
  const testCases = [
    {
      name: 'Valid Disease - Diabetes',
      query: 'diabetes',
      expected: 'disease_info',
      description: 'Should provide structured disease information'
    },
    {
      name: 'Valid Disease - Malaria', 
      query: 'malaria',
      expected: 'disease_info',
      description: 'Should provide structured disease information'
    },
    {
      name: 'Food Item - Chocolate',
      query: 'chocolate',
      expected: 'redirect',
      description: 'Should redirect to nutrition section'
    },
    {
      name: 'Food Item - Milk',
      query: 'milk',
      expected: 'redirect', 
      description: 'Should redirect to nutrition section'
    },
    {
      name: 'Nutrient - Vitamins',
      query: 'vitamins',
      expected: 'redirect',
      description: 'Should redirect to nutrition section'
    },
    {
      name: 'Exercise Topic - Running',
      query: 'running',
      expected: 'redirect',
      description: 'Should redirect to exercise section'
    },
    {
      name: 'Growth Topic - Height',
      query: 'height increase',
      expected: 'redirect',
      description: 'Should redirect to appropriate section'
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
        'disease_awareness'
      );
      const endTime = Date.now();
      
      console.log(`⏱️ Response time: ${endTime - startTime}ms`);
      console.log(`📄 Response: ${result.substring(0, 300)}${result.length > 300 ? '...' : ''}`);
      
      // Validate response based on expected type
      let testPassed = false;
      
      if (testCase.expected === 'disease_info') {
        // Check for structured disease information
        const hasWhatIs = result.includes('What is') || result.includes('**');
        const hasSymptoms = result.includes('Symptoms') || result.includes('symptom');
        const hasPrevention = result.includes('Prevention') || result.includes('prevent');
        const hasTreatment = result.includes('Treatment') || result.includes('treat');
        const hasDisclaimer = result.includes('disease awareness') || result.includes('consult a doctor') || result.includes('healthcare professional');
        
        if (hasWhatIs && hasSymptoms && hasPrevention && hasTreatment && hasDisclaimer) {
          testPassed = true;
          console.log(`✅ PASS - Complete disease information provided`);
        } else {
          console.log(`❌ FAIL - Missing disease information sections:`);
          console.log(`   What is: ${hasWhatIs ? '✓' : '✗'}`);
          console.log(`   Symptoms: ${hasSymptoms ? '✓' : '✗'}`);
          console.log(`   Prevention: ${hasPrevention ? '✓' : '✗'}`);
          console.log(`   Treatment: ${hasTreatment ? '✓' : '✗'}`);
          console.log(`   Disclaimer: ${hasDisclaimer ? '✓' : '✗'}`);
        }
      } else if (testCase.expected === 'redirect') {
        // Check for redirect message
        const hasRedirect = result.includes('related to nutrition') || 
                           result.includes('related to exercise') ||
                           result.includes('appropriate menu option') ||
                           result.includes('Please use') ||
                           result.includes('nutrition/exercise');
        
        if (hasRedirect) {
          testPassed = true;
          console.log(`✅ PASS - Proper redirect provided`);
        } else {
          console.log(`❌ FAIL - No redirect detected, treating as disease`);
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
  console.log('\n========================');
  console.log('📊 DISEASE AWARENESS TEST REPORT');
  console.log('========================\n');
  
  console.log(`🎯 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed Tests: ${passedTests}`);
  console.log(`   Failed Tests: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All disease awareness tests passed!');
    console.log('✅ Disease detection and redirects working correctly');
  } else {
    console.log('⚠️ Some disease awareness tests failed');
    console.log('🔧 Disease awareness needs further debugging');
  }
  
  console.log('\n========================\n');
  
  return passedTests === totalTests;
}

// Run the test
testDiseaseAwareness()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
