const GeminiService = require('../src/services/geminiService');

// Test image analysis functionality
async function testImageAnalysis() {
  console.log('🖼️ IMAGE ANALYSIS TEST');
  console.log('====================\n');

  const geminiService = new GeminiService();
  
  // Test cases with different image formats
  const testCases = [
    {
      name: 'Base64 String Test',
      description: 'Testing with base64 encoded image data',
      imageData: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // 1x1 pixel test image
      symptoms: 'I have a small red spot on my skin'
    },
    {
      name: 'Data URL Test',
      description: 'Testing with data URL format',
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      symptoms: 'I noticed this mark after a fall'
    },
    {
      name: 'Object Format Test',
      description: 'Testing with formatted object',
      imageData: {
        data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        mimeType: 'image/jpeg'
      },
      symptoms: 'Skin irritation that appeared yesterday'
    }
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`🩺 Symptoms: "${testCase.symptoms}"`);
    
    try {
      const startTime = Date.now();
      const result = await geminiService.analyzeHealthImage(
        testCase.imageData,
        testCase.symptoms,
        'en'
      );
      const endTime = Date.now();
      
      console.log(`✅ Analysis completed in ${endTime - startTime}ms`);
      console.log(`📋 Result: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
      
      // Validate response format
      const hasVisualObservations = result.includes('Visual Observations') || result.includes('👁️');
      const hasHealthAssessment = result.includes('Health Assessment') || result.includes('🤔');
      const hasFollowUpQuestions = result.includes('Follow-up Questions') || result.includes('📋');
      const hasUrgencyLevel = result.includes('Urgency Level') || result.includes('⚠️');
      const hasDisclaimer = result.includes('medical diagnosis') || result.includes('healthcare professional');
      
      if (hasVisualObservations && hasHealthAssessment && hasFollowUpQuestions && hasUrgencyLevel && hasDisclaimer) {
        console.log(`🎯 Result: PASS - Complete structured analysis`);
        passedTests++;
      } else {
        console.log(`❌ Result: FAIL - Missing required sections`);
        console.log(`   Visual Observations: ${hasVisualObservations ? '✓' : '✗'}`);
        console.log(`   Health Assessment: ${hasHealthAssessment ? '✓' : '✗'}`);
        console.log(`   Follow-up Questions: ${hasFollowUpQuestions ? '✓' : '✗'}`);
        console.log(`   Urgency Level: ${hasUrgencyLevel ? '✓' : '✗'}`);
        console.log(`   Medical Disclaimer: ${hasDisclaimer ? '✓' : '✗'}`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log(`🎯 Result: FAIL - ${error.message.includes('SAFETY') ? 'Safety filter triggered' : 'API Error'}`);
    }
    
    // Add delay to avoid rate limits
    if (totalTests < testCases.length) {
      console.log('⏳ Waiting 3000ms to avoid rate limits...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Test error handling
  console.log(`\n🧪 Test: Error Handling`);
  console.log(`📝 Description: Testing with invalid image data`);
  
  try {
    totalTests++;
    const result = await geminiService.analyzeHealthImage(
      'invalid_data',
      'Test symptoms',
      'en'
    );
    
    if (result.includes('having trouble analyzing') || result.includes('describe what you\'re seeing')) {
      console.log(`✅ Fallback message returned correctly`);
      console.log(`🎯 Result: PASS - Error handled gracefully`);
      passedTests++;
    } else {
      console.log(`❌ Result: FAIL - Unexpected response to invalid data`);
    }
  } catch (error) {
    console.log(`✅ Error caught and handled: ${error.message}`);
    console.log(`🎯 Result: PASS - Error handling working`);
    passedTests++;
  }

  // Final report
  console.log('\n====================');
  console.log('📊 IMAGE ANALYSIS TEST REPORT');
  console.log('====================\n');
  
  console.log(`🎯 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed Tests: ${passedTests}`);
  console.log(`   Failed Tests: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All image analysis tests passed!');
    console.log('✅ Image analysis functionality working correctly');
  } else {
    console.log('⚠️ Some image analysis tests failed');
    console.log('🔧 Image analysis needs further debugging');
  }
  
  console.log('\n====================\n');
  
  return passedTests === totalTests;
}

// Run the test
testImageAnalysis()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
