#!/usr/bin/env node

/**
 * Quick test script to verify LanguageUtils import fix
 */

console.log('🧪 Testing LanguageUtils import fix...\n');

try {
  // Test the import that was failing
  const { LanguageUtils } = require('../src/utils/languageUtils');
  console.log('✅ LanguageUtils import successful');
  
  // Test the getText method that was failing
  const testText = LanguageUtils.getText('main_menu', 'en');
  console.log('✅ LanguageUtils.getText method works');
  console.log(`   Sample text: "${testText}"`);
  
  // Test with different languages
  const hindiText = LanguageUtils.getText('main_menu', 'hi');
  const teluguText = LanguageUtils.getText('main_menu', 'te');
  
  console.log('✅ Multilingual getText works');
  console.log(`   Hindi: "${hindiText}"`);
  console.log(`   Telugu: "${teluguText}"`);
  
  // Test WhatsApp service import
  const WhatsAppService = require('../src/services/whatsappService');
  const whatsappService = new WhatsAppService();
  
  console.log('✅ WhatsApp service import successful');
  
  // Test the method that was failing
  const menuList = whatsappService.getMainMenuList('en', 'native');
  console.log('✅ getMainMenuList method works');
  console.log(`   Menu sections: ${menuList.sections.length}`);
  
  console.log('\n🎉 ALL TESTS PASSED! The LanguageUtils fix is working correctly.');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
