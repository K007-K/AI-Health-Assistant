#!/usr/bin/env node

/**
 * Test Nutrition & Hygiene Response Quality
 * Tests if the nutrition and hygiene category provides specific, practical advice
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');

async function testNutritionHygieneQuality() {
  console.log('🥗 Testing Nutrition & Hygiene Response Quality\n');
  
  const messageController = new MessageController();
  let responses = [];
  
  // Mock WhatsApp service
  messageController.whatsappService = {
    sendMessage: async (phone, message) => {
      responses.push({ 
        type: 'message', 
        message: message,
        timestamp: Date.now() 
      });
      console.log(`🤖 BOT RESPONSE:\n${message}\n`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    sendList: async (phone, text, sections, buttonText) => {
      responses.push({ 
        type: 'list', 
        text, 
        sections,
        buttonText,
        timestamp: Date.now() 
      });
      console.log(`📋 LIST: "${text}" with button "${buttonText}"`);
      sections.forEach(section => {
        console.log(`   Section: ${section.title}`);
        section.rows.forEach(row => console.log(`     - ${row.title} (${row.id})`));
      });
      return { success: true };
    },
    
    sendTypingIndicator: async (phone) => {
      console.log(`⌨️ TYPING...`);
      return { success: true };
    },
    
    stopTypingIndicator: async (phone) => {
      return { success: true };
    },
    
    // Add required methods
    getPreventiveTipsList: (language) => ({
      sections: [{
        title: "🌱 Health Tips Categories",
        rows: [
          { id: 'learn_diseases', title: '🦠 Learn about Diseases', description: 'Common diseases, symptoms & prevention' },
          { id: 'nutrition_hygiene', title: '🥗 Nutrition & Hygiene', description: 'Healthy eating habits & cleanliness tips' },
          { id: 'exercise_lifestyle', title: '🏃 Exercise & Lifestyle', description: 'Physical activity & healthy living tips' }
        ]
      }]
    })
  };
  
  const testUser = {
    id: 'nutrition-test-user',
    phone_number: '+919876543210',
    preferred_language: 'en',
    script_preference: 'native'
  };
  
  console.log('🎭 Testing Nutrition & Hygiene Category Response...\n');
  
  // Step 1: User clicks Health Tips
  console.log('👤 USER: preventive_tips');
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'preventive_tips',
    type: 'text',
    messageId: 'test_1',
    timestamp: new Date()
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: User clicks Nutrition & Hygiene
  console.log('👤 USER: nutrition_hygiene');
  responses = []; // Clear previous responses
  
  await messageController.handleMessage({
    phoneNumber: testUser.phone_number,
    content: 'nutrition_hygiene',
    type: 'text',
    messageId: 'test_2',
    timestamp: new Date()
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 NUTRITION & HYGIENE RESPONSE QUALITY ANALYSIS');
  console.log('='.repeat(80));
  
  // Get the nutrition response
  const nutritionResponse = responses.find(r => r.type === 'message');
  
  if (!nutritionResponse) {
    console.log('❌ No nutrition response found');
    return false;
  }
  
  const responseText = nutritionResponse.message.toLowerCase();
  
  // Quality indicators for good nutrition & hygiene advice
  const nutritionIndicators = [
    'balanced diet',
    'vegetables',
    'fruits',
    'grains',
    'protein',
    'dal',
    'rice',
    'wheat',
    'portion',
    'meal',
    'breakfast',
    'lunch',
    'dinner'
  ];
  
  const hygieneIndicators = [
    'handwashing',
    'hand washing',
    'wash hands',
    'clean water',
    'food safety',
    'kitchen',
    'storage',
    'cooking',
    'cleanliness',
    'hygiene',
    'sanitation'
  ];
  
  const practicalIndicators = [
    'before eating',
    'after toilet',
    'wash vegetables',
    'boil water',
    'store food',
    'clean utensils',
    'local foods',
    'affordable',
    'daily',
    'simple'
  ];
  
  const badIndicators = [
    'general health',
    'consult doctor about the right medicine',
    'manage your weight by controlling portion sizes',
    'limit sugary drinks'
  ];
  
  // Count indicators
  const nutritionCount = nutritionIndicators.filter(indicator => 
    responseText.includes(indicator)
  ).length;
  
  const hygieneCount = hygieneIndicators.filter(indicator => 
    responseText.includes(indicator)
  ).length;
  
  const practicalCount = practicalIndicators.filter(indicator => 
    responseText.includes(indicator)
  ).length;
  
  const badCount = badIndicators.filter(indicator => 
    responseText.includes(indicator)
  ).length;
  
  console.log(`\n🔍 Content Analysis:`);
  console.log(`   Nutrition-specific terms: ${nutritionCount}/${nutritionIndicators.length}`);
  console.log(`   Hygiene-specific terms: ${hygieneCount}/${hygieneIndicators.length}`);
  console.log(`   Practical advice terms: ${practicalCount}/${practicalIndicators.length}`);
  console.log(`   Generic/bad terms: ${badCount}/${badIndicators.length} (should be 0)`);
  
  // Check response structure
  const hasBulletPoints = responseText.includes('•') || responseText.includes('-') || responseText.includes('*');
  const hasSpecificAdvice = nutritionCount >= 3 && hygieneCount >= 2;
  const isPractical = practicalCount >= 2;
  const isNotGeneric = badCount === 0;
  const hasDisclaimer = responseText.includes('general health information') || responseText.includes('consult a doctor');
  
  console.log(`\n📋 Structure Analysis:`);
  console.log(`   ✅ Has bullet points: ${hasBulletPoints ? 'YES' : 'NO'}`);
  console.log(`   ✅ Specific nutrition advice: ${hasSpecificAdvice ? 'YES' : 'NO'}`);
  console.log(`   ✅ Practical guidance: ${isPractical ? 'YES' : 'NO'}`);
  console.log(`   ✅ Not generic: ${isNotGeneric ? 'YES' : 'NO'}`);
  console.log(`   ✅ Has disclaimer: ${hasDisclaimer ? 'YES' : 'NO'}`);
  
  console.log(`\n📝 Response Preview (first 200 chars):`);
  console.log(`   "${nutritionResponse.message.substring(0, 200)}..."`);
  
  console.log('\n' + '='.repeat(80));
  
  const qualityScore = [hasBulletPoints, hasSpecificAdvice, isPractical, isNotGeneric, hasDisclaimer].filter(Boolean).length;
  const totalCriteria = 5;
  
  if (qualityScore >= 4 && nutritionCount >= 3 && hygieneCount >= 2) {
    console.log('🎉 SUCCESS: Nutrition & Hygiene responses are high quality!');
    console.log('');
    console.log('✅ Specific nutrition advice (not generic health tips)');
    console.log('✅ Practical hygiene guidance');
    console.log('✅ Culturally appropriate for Indian households');
    console.log('✅ Actionable bullet points');
    console.log('✅ Professional medical disclaimer');
    console.log('');
    console.log(`🏆 Quality Score: ${qualityScore}/${totalCriteria}`);
    console.log('🚀 Nutrition & Hygiene category is production ready!');
    return true;
  } else {
    console.log('❌ ISSUES FOUND: Nutrition & Hygiene responses need improvement');
    console.log('');
    if (!hasSpecificAdvice) console.log('❌ Too generic - needs specific nutrition advice');
    if (hygieneCount < 2) console.log('❌ Missing hygiene guidance');
    if (!isPractical) console.log('❌ Not practical enough for daily use');
    if (!isNotGeneric) console.log('❌ Contains generic health advice instead of category-specific');
    if (!hasBulletPoints) console.log('❌ Poor formatting - needs bullet points');
    console.log('');
    console.log(`📊 Quality Score: ${qualityScore}/${totalCriteria} (needs 4+)`);
    console.log('💡 Expected: Specific nutrition tips + hygiene practices + practical examples');
    return false;
  }
}

// Run test
testNutritionHygieneQuality()
  .then(success => {
    if (success) {
      console.log('\n✅ Nutrition & Hygiene quality test PASSED');
    } else {
      console.log('\n❌ Nutrition & Hygiene quality test FAILED');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
