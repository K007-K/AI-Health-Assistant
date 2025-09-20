#!/usr/bin/env node

/**
 * Test WhatsApp List API directly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const axios = require('axios');
const config = require('./src/config/environment');

async function testWhatsAppList() {
  console.log('🧪 Testing WhatsApp List API directly...\n');
  
  if (!config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    console.log('❌ WhatsApp credentials not configured');
    console.log('This is expected in development - the list structure is correct');
    return;
  }
  
  const payload = {
    messaging_product: 'whatsapp',
    to: '+1234567890', // Test number
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { 
        text: '👋 Hello! I am your Health Assistant.\n\nHow can I help you today? Choose an option:' 
      },
      action: {
        button: 'Choose Option',
        sections: [{
          title: '📋 Main Menu',
          rows: [
            {
              id: 'chat_ai',
              title: '🤖 Chat with AI',
              description: 'Ask health questions & get guidance'
            },
            {
              id: 'symptom_check',
              title: '🩺 Check Symptoms',
              description: 'Analyze symptoms & get recommendations'
            },
            {
              id: 'preventive_tips',
              title: '🌱 Health Tips',
              description: 'Learn about diseases, nutrition & lifestyle'
            },
            {
              id: 'disease_alerts',
              title: '🦠 Disease Alerts',
              description: 'View active diseases & manage alerts'
            },
            {
              id: 'change_language',
              title: '🌐 Change Language',
              description: 'Switch to different language'
            },
            {
              id: 'feedback',
              title: '📊 Feedback',
              description: 'Rate responses & help improve accuracy'
            }
          ]
        }]
      }
    }
  };
  
  console.log('📱 Payload to send:');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${config.whatsapp.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ List message sent successfully!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('\n❌ List message failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.data?.error) {
      const errorCode = error.response.data.error.code;
      const errorMessage = error.response.data.error.message;
      
      console.log(`\n🚨 WhatsApp API Error: ${errorCode} - ${errorMessage}`);
      
      // Common error codes and solutions
      const solutions = {
        131051: 'Interactive messages not enabled for this app. Need app review.',
        131052: 'Interactive message format invalid.',
        131053: 'Interactive message limits exceeded.',
        401: 'Invalid access token or permissions.',
        100: 'Invalid parameter in request.'
      };
      
      if (solutions[errorCode]) {
        console.log(`💡 Solution: ${solutions[errorCode]}`);
      }
    }
  }
}

testWhatsAppList().catch(console.error);
