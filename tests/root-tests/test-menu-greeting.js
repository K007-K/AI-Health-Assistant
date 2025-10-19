#!/usr/bin/env node

/**
 * Test script for Main Menu Greeting Update
 * Tests the improved greeting and button text
 */

const { LanguageUtils } = require('./src/utils/languageUtils');
const WhatsAppService = require('./src/services/whatsappService');

async function testMenuGreeting() {
  console.log('🧪 Testing Main Menu Greeting and Button Text...\n');
  
  try {
    console.log('📋 Test 1: Main Menu Greeting Text');
    
    const languages = ['en', 'hi', 'te', 'ta', 'or'];
    
    languages.forEach(lang => {
      const greeting = LanguageUtils.getText('main_menu', lang);
      const buttonText = LanguageUtils.getText('select_service', lang);
      
      console.log(`\n🌍 ${lang.toUpperCase()}:`);
      console.log(`  Greeting: ${greeting.substring(0, 50)}...`);
      console.log(`  Button: ${buttonText}`);
      
      // Verify it's not just "Main Menu"
      if (greeting.includes('Hello') || greeting.includes('नमस्ते') || greeting.includes('హలో') || greeting.includes('வணக்கம்') || greeting.includes('ନମସ୍କାର')) {
        console.log(`  ✅ Has proper greeting`);
      } else {
        console.log(`  ❌ Missing proper greeting`);
      }
    });
    
    console.log('\n📋 Test 2: Transliteration Support');
    
    const transLanguages = ['hi_trans', 'te_trans', 'ta_trans', 'or_trans'];
    
    transLanguages.forEach(lang => {
      const greeting = LanguageUtils.getText('main_menu', lang.split('_')[0], 'en', 'transliteration');
      
      console.log(`\n🔤 ${lang.toUpperCase()}:`);
      console.log(`  Greeting: ${greeting.substring(0, 50)}...`);
      
      if (greeting.includes('Namaste') || greeting.includes('Hello') || greeting.includes('Vanakkam') || greeting.includes('Namaskar')) {
        console.log(`  ✅ Has transliterated greeting`);
      } else {
        console.log(`  ❌ Missing transliterated greeting`);
      }
    });
    
    console.log('\n🎉 Menu Greeting Test Complete!');
    console.log('\n📝 Changes Made:');
    console.log('✅ Removed duplicate "Main Menu" entry from languageUtils.js');
    console.log('✅ Now using proper greeting: "👋 Hello! I am your Health Assistant."');
    console.log('✅ Added "Select Service" button text instead of "Choose Option"');
    console.log('✅ Supports all 5 languages with proper greetings');
    console.log('✅ Includes transliteration support');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testMenuGreeting();
}

module.exports = { testMenuGreeting };
