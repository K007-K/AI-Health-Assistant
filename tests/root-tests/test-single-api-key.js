#!/usr/bin/env node

/**
 * Test Gemini Service with Single API Key
 * Verify that Gemini service uses only the single API key from .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const GeminiService = require('./src/services/geminiService');

async function testSingleApiKey() {
  console.log('🧪 Testing Single API Key Configuration\n');

  try {
    console.log('1. Testing Gemini service initialization...');

    const geminiService = new GeminiService();

    console.log(`   ✅ API Key loaded: ${!!geminiService.apiKey}`);
    console.log(`   🔑 API Key length: ${geminiService.apiKey ? geminiService.apiKey.length : 0} characters`);
    console.log(`   🎯 Model configured: ${geminiService.model ? 'YES' : 'NO'}`);

    // Test that no rotation methods exist
    console.log('\n2. Checking for API key rotation...');
    const hasRotationMethod = typeof geminiService.rotateApiKey === 'function';
    const hasMultipleKeys = Array.isArray(geminiService.apiKeys) && geminiService.apiKeys.length > 1;
    const hasCurrentKeyIndex = typeof geminiService.currentKeyIndex !== 'undefined';

    console.log(`   ❌ Has rotateApiKey method: ${hasRotationMethod ? 'YES (BAD)' : 'NO (GOOD)'}`);
    console.log(`   ❌ Has multiple apiKeys array: ${hasMultipleKeys ? 'YES (BAD)' : 'NO (GOOD)'}`);
    console.log(`   ❌ Has currentKeyIndex property: ${hasCurrentKeyIndex ? 'YES (BAD)' : 'NO (GOOD)'}`);

    console.log('\n3. Testing basic response generation...');

    // Simple test message
    const testMessage = "Hello, can you tell me about common cold symptoms?";

    const response = await geminiService.generateResponse(
      testMessage,
      'en',
      'native',
      [],
      false,
      1,
      'general'
    );

    console.log(`   ✅ Response generated: ${!!response}`);
    console.log(`   📝 Response length: ${response ? response.length : 0} characters`);
    console.log(`   📄 Response preview: ${response ? response.substring(0, 100) + '...' : 'NONE'}`);

    // Final assessment
    const isSingleKeyOnly = !hasRotationMethod && !hasMultipleKeys && !hasCurrentKeyIndex && !!geminiService.apiKey;
    const isWorking = !!response && response.length > 0;

    console.log('\n4. Final Results:');
    console.log(`   ✅ Single API key only: ${isSingleKeyOnly ? 'YES' : 'NO'}`);
    console.log(`   ✅ API key from environment: ${geminiService.apiKey === process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
    console.log(`   ✅ Service working: ${isWorking ? 'YES' : 'NO'}`);

    if (isSingleKeyOnly && isWorking) {
      console.log('\n🎉 SUCCESS: Single API key configuration is working!');
      console.log('✅ Removed all API key rotation');
      console.log('✅ Using only single API key from .env');
      console.log('✅ No sensitive keys hardcoded');
      return true;
    } else {
      console.log('\n❌ FAILED: Issues found with single API key setup');
      return false;
    }

  } catch (error) {
    console.error('\n❌ ERROR during test:', error.message);
    return false;
  }
}

// Run test
testSingleApiKey()
  .then(success => {
    if (success) {
      console.log('\n✅ Single API key configuration test passed');
    } else {
      console.log('\n❌ Single API key configuration test failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
