#!/usr/bin/env node

/**
 * Test Menu Format - Debug list vs buttons
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const WhatsAppService = require('./src/services/whatsappService');
const { LanguageUtils } = require('./src/utils/languageUtils');

async function testMenuFormat() {
  console.log('🧪 Testing Menu Format...\n');
  
  const whatsappService = new WhatsAppService();
  
  // Test user
  const testUser = {
    preferred_language: 'te',
    script_preference: 'transliteration',
    phone_number: '+1234567890'
  };
  
  console.log('1. Testing Menu Text Generation:');
  const menuText = LanguageUtils.getText('main_menu', testUser.preferred_language, 'en', testUser.script_preference);
  console.log('Menu Text:', menuText.substring(0, 100) + '...\n');
  
  console.log('2. Testing Menu List Structure:');
  const menuList = whatsappService.getMainMenuList(testUser.preferred_language, testUser.script_preference);
  console.log('Menu List Structure:');
  console.log(JSON.stringify(menuList, null, 2));
  
  console.log('\n3. Testing List Payload Generation:');
  
  // Simulate the list payload creation
  const sections = menuList.sections;
  const buttonText = 'Choose Option';
  
  // Validate sections structure
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    console.error('❌ Invalid sections structure');
    return;
  }
  
  // Validate and truncate titles if needed (WhatsApp limit: 24 chars)
  const validatedSections = sections.map(section => ({
    title: section.title || 'Options',
    rows: section.rows.map(row => ({
      id: row.id,
      title: row.title.length > 24 ? row.title.substring(0, 21) + '...' : row.title,
      description: row.description && row.description.length > 72 ? row.description.substring(0, 69) + '...' : row.description
    }))
  }));

  const payload = {
    messaging_product: 'whatsapp',
    to: testUser.phone_number,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: menuText },
      action: {
        button: buttonText,
        sections: validatedSections
      }
    }
  };
  
  console.log('Generated Payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  console.log('\n4. Payload Validation:');
  
  // Check payload structure
  const checks = [
    { name: 'messaging_product', value: payload.messaging_product === 'whatsapp' },
    { name: 'to field', value: !!payload.to },
    { name: 'type is interactive', value: payload.type === 'interactive' },
    { name: 'interactive.type is list', value: payload.interactive.type === 'list' },
    { name: 'body text exists', value: !!payload.interactive.body.text },
    { name: 'action button exists', value: !!payload.interactive.action.button },
    { name: 'sections exist', value: Array.isArray(payload.interactive.action.sections) },
    { name: 'sections not empty', value: payload.interactive.action.sections.length > 0 },
    { name: 'first section has title', value: !!payload.interactive.action.sections[0]?.title },
    { name: 'first section has rows', value: Array.isArray(payload.interactive.action.sections[0]?.rows) },
    { name: 'rows not empty', value: payload.interactive.action.sections[0]?.rows.length > 0 }
  ];
  
  checks.forEach(check => {
    console.log(`${check.value ? '✅' : '❌'} ${check.name}: ${check.value}`);
  });
  
  console.log('\n5. Row Details:');
  payload.interactive.action.sections[0].rows.forEach((row, index) => {
    console.log(`Row ${index + 1}:`);
    console.log(`  ID: ${row.id}`);
    console.log(`  Title: "${row.title}" (${row.title.length} chars)`);
    console.log(`  Description: "${row.description}" (${row.description?.length || 0} chars)`);
  });
  
  console.log('\n6. WhatsApp API Limits Check:');
  const limits = [
    { name: 'Max sections', limit: 10, actual: payload.interactive.action.sections.length },
    { name: 'Max rows per section', limit: 10, actual: payload.interactive.action.sections[0].rows.length },
    { name: 'Button text length', limit: 20, actual: payload.interactive.action.button.length },
    { name: 'Section title length', limit: 24, actual: payload.interactive.action.sections[0].title.length }
  ];
  
  limits.forEach(limit => {
    const withinLimit = limit.actual <= limit.limit;
    console.log(`${withinLimit ? '✅' : '❌'} ${limit.name}: ${limit.actual}/${limit.limit}`);
  });
  
  // Check individual row limits
  payload.interactive.action.sections[0].rows.forEach((row, index) => {
    const titleOk = row.title.length <= 24;
    const descOk = !row.description || row.description.length <= 72;
    console.log(`${titleOk && descOk ? '✅' : '❌'} Row ${index + 1} limits: title ${row.title.length}/24, desc ${row.description?.length || 0}/72`);
  });
  
  console.log('\n🏁 Menu Format Test Complete!');
}

testMenuFormat().catch(console.error);
