const GeminiService = require('../src/services/geminiService');

// Test conversation modes and guardrails
async function testConversationModes() {
  console.log('🎯 CONVERSATION MODES & GUARDRAILS TEST');
  console.log('==========================================\n');

  const geminiService = new GeminiService();
  
  const testCases = [
    {
      mode: 'general',
      language: 'en',
      queries: [
        {
          query: 'What causes fever?',
          expected: 'health_answer',
          description: 'General health query - should answer fully'
        },
        {
          query: 'What is the capital of India?',
          expected: 'polite_redirect',
          description: 'Non-health query - should politely refuse'
        },
        {
          query: 'How to treat diabetes in dogs?',
          expected: 'health_answer',
          description: 'Animal health query - should answer fully'
        }
      ]
    },
    {
      mode: 'symptom_check',
      language: 'en',
      queries: [
        {
          query: 'I have stomach pain',
          expected: 'clarifying_questions',
          description: 'Symptom input - should ask clarifying questions'
        },
        {
          query: 'What is malaria?',
          expected: 'redirect_to_chat',
          description: 'Disease question - should redirect to Chat with AI'
        }
      ]
    },
    {
      mode: 'disease_awareness',
      language: 'en',
      queries: [
        {
          query: 'Tell me about malaria',
          expected: 'disease_education',
          description: 'Disease query - should provide education'
        },
        {
          query: 'I have fever and headache',
          expected: 'redirect_to_symptoms',
          description: 'Symptom query - should redirect to symptom checker'
        }
      ]
    },
    {
      mode: 'nutrition_hygiene',
      language: 'en',
      queries: [
        {
          query: 'How to wash hands properly?',
          expected: 'hygiene_tips',
          description: 'Hygiene query - should provide bullet tips'
        },
        {
          query: 'I have diabetes, what should I eat?',
          expected: 'nutrition_advice',
          description: 'Nutrition question for condition - should provide dietary tips'
        }
      ]
    },
    {
      mode: 'exercise_lifestyle',
      language: 'en',
      queries: [
        {
          query: 'Simple exercises for daily routine',
          expected: 'exercise_tips',
          description: 'Exercise query - should provide practical tips'
        },
        {
          query: 'I have back pain, what exercises?',
          expected: 'exercise_advice',
          description: 'Exercise question for condition - should provide gentle exercises'
        }
      ]
    }
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const testMode of testCases) {
    console.log(`\n🔹 Testing Mode: ${testMode.mode.toUpperCase()}`);
    console.log('=' + '='.repeat(40));
    
    for (const testQuery of testMode.queries) {
      totalTests++;
      console.log(`\n🧪 Test: ${testQuery.description}`);
      console.log(`📝 Query: "${testQuery.query}"`);
      
      try {
        const response = await geminiService.generateResponse(
          testQuery.query,
          testMode.language,
          'native',
          [],
          'normal',
          3,
          testMode.mode
        );
        
        console.log(`✅ Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
        
        // Evaluate response based on expected behavior
        const evaluation = evaluateResponse(response, testQuery.expected, testQuery.query);
        
        if (evaluation.passed) {
          console.log(`🎯 Result: PASS - ${evaluation.reason}`);
          passedTests++;
        } else {
          console.log(`❌ Result: FAIL - ${evaluation.reason}`);
        }
        
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.log(`🎯 Result: FAIL - API Error`);
      }
      
      // Add delay to avoid rate limits
      console.log('⏳ Waiting 2000ms to avoid rate limits...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final report
  console.log('\n==========================================');
  console.log('📊 CONVERSATION MODES TEST REPORT');
  console.log('==========================================\n');
  
  console.log(`🎯 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed Tests: ${passedTests}`);
  console.log(`   Failed Tests: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All conversation mode tests passed!');
    console.log('✅ Guardrails and redirects working correctly');
  } else {
    console.log('⚠️ Some conversation mode tests failed');
    console.log('🔧 Guardrails need adjustment');
  }
  
  console.log('\n==========================================\n');
  
  return passedTests === totalTests;
}

// Evaluate response based on expected behavior
function evaluateResponse(response, expected, query) {
  const lowerResponse = response.toLowerCase();
  
  switch (expected) {
    case 'health_answer':
      if (lowerResponse.includes('disclaimer') || lowerResponse.includes('doctor') || lowerResponse.includes('consult')) {
        return { passed: true, reason: 'Provided health answer with disclaimer' };
      }
      return { passed: false, reason: 'Missing health disclaimer or incomplete answer' };
      
    case 'polite_redirect':
      if (lowerResponse.includes('health chatbot') || lowerResponse.includes('another ai') || lowerResponse.includes('🙏')) {
        return { passed: true, reason: 'Politely redirected non-health query' };
      }
      return { passed: false, reason: 'Did not redirect non-health query properly' };
      
    case 'clarifying_questions':
      if (lowerResponse.includes('how many days') || lowerResponse.includes('duration') || lowerResponse.includes('after food') || lowerResponse.includes('?')) {
        return { passed: true, reason: 'Asked clarifying questions for symptoms' };
      }
      return { passed: false, reason: 'Did not ask clarifying questions' };
      
    case 'redirect_to_chat':
      if (lowerResponse.includes('chat with ai') || lowerResponse.includes('general health') || lowerResponse.includes('choose')) {
        return { passed: true, reason: 'Redirected to Chat with AI option' };
      }
      return { passed: false, reason: 'Did not redirect to appropriate menu' };
      
    case 'disease_education':
      if ((lowerResponse.includes('what it is') || lowerResponse.includes('symptoms') || lowerResponse.includes('prevention') || lowerResponse.includes('malaria')) && 
          (lowerResponse.includes('•') || lowerResponse.includes('-') || lowerResponse.includes('*'))) {
        return { passed: true, reason: 'Provided structured disease education' };
      }
      return { passed: false, reason: 'Did not provide proper disease education format' };
      
    case 'redirect_to_symptoms':
      if (lowerResponse.includes('symptom') || lowerResponse.includes('check symptoms') || lowerResponse.includes('section is for')) {
        return { passed: true, reason: 'Redirected to symptom checker' };
      }
      return { passed: false, reason: 'Did not redirect to symptom checker' };
      
    case 'hygiene_tips':
      if ((lowerResponse.includes('•') || lowerResponse.includes('-') || lowerResponse.includes('*')) && 
          (lowerResponse.includes('hand') || lowerResponse.includes('clean') || lowerResponse.includes('wash') || lowerResponse.includes('soap'))) {
        return { passed: true, reason: 'Provided bullet-point hygiene tips' };
      }
      return { passed: false, reason: 'Did not provide proper hygiene tips format' };
      
    case 'exercise_tips':
      if ((lowerResponse.includes('•') || lowerResponse.includes('-') || lowerResponse.includes('*')) && 
          (lowerResponse.includes('walk') || lowerResponse.includes('yoga') || lowerResponse.includes('exercise') || lowerResponse.includes('stretch'))) {
        return { passed: true, reason: 'Provided bullet-point exercise tips' };
      }
      return { passed: false, reason: 'Did not provide proper exercise tips format' };
      
    case 'nutrition_advice':
      if ((lowerResponse.includes('•') || lowerResponse.includes('-')) && 
          (lowerResponse.includes('diabetes') || lowerResponse.includes('sugar') || lowerResponse.includes('diet'))) {
        return { passed: true, reason: 'Provided nutrition advice for diabetes' };
      }
      return { passed: false, reason: 'Did not provide proper nutrition advice' };
      
    case 'exercise_advice':
      if ((lowerResponse.includes('•') || lowerResponse.includes('-')) && 
          (lowerResponse.includes('back') || lowerResponse.includes('gentle') || lowerResponse.includes('stretch'))) {
        return { passed: true, reason: 'Provided exercise advice for back pain' };
      }
      return { passed: false, reason: 'Did not provide proper exercise advice' };
      
    case 'redirect_to_menu':
      if (lowerResponse.includes('section is for') || lowerResponse.includes('choose') || lowerResponse.includes('menu')) {
        return { passed: true, reason: 'Redirected to appropriate menu' };
      }
      return { passed: false, reason: 'Did not redirect to appropriate menu' };
      
    default:
      return { passed: false, reason: 'Unknown expected behavior' };
  }
}

// Run the test
testConversationModes()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
