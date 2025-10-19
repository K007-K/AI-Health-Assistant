#!/usr/bin/env node

/**
 * Test Conversation Flow - Ensure no interruptions during conversations
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MessageController = require('./src/controllers/messageController');
const UserService = require('./src/services/userService');
const WhatsAppService = require('./src/services/mockWhatsappService');
const ConversationService = require('./src/services/conversationService');

class ConversationFlowTest {
  constructor() {
    this.whatsappService = new WhatsAppService(true);
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.messageController = new MessageController();
    
    // Override services with mocks
    this.messageController.whatsappService = this.whatsappService;
    this.messageController.userService = {
      getOrCreateUser: async (phone) => ({
        id: '550e8400-e29b-41d4-a716-446655440000',
        phone_number: phone,
        preferred_language: 'en',
        script_preference: 'native'
      }),
      getUserSession: async (userId) => ({ session_state: 'symptom_check' }),
      updateUserSession: async (userId, state, data) => {
        console.log(`💾 MOCK: Updated session to ${state}`, data || '');
        return { success: true };
      }
    };
    this.messageController.conversationService = {
      saveUserMessage: async () => ({ success: true }),
      saveBotMessage: async () => ({ success: true }),
      detectIntent: this.conversationService.detectIntent.bind(this.conversationService),
      getConversationHistory: async () => []
    };
  }

  async testSymptomCheckFlow() {
    console.log('🧪 Testing Symptom Check Conversation Flow...\n');
    
    const testMessages = [
      'I have fever and headache',
      'It started 2 days ago',
      'They come frequently when I get wet in rains',
      'What should I do?',
      'Any home remedies?'
    ];
    
    console.log('📱 Simulating continuous symptom check conversation:');
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n${i + 1}. User: "${message}"`);
      
      // Clear previous messages to see only current response
      this.whatsappService.clearSentMessages();
      
      try {
        await this.messageController.handleMessage({
          phoneNumber: '+1234567890',
          content: message,
          type: 'text',
          messageId: `msg_${i}`,
          timestamp: new Date().toISOString()
        });
        
        const sentMessages = this.whatsappService.getSentMessages();
        console.log(`   Bot responses: ${sentMessages.length} messages`);
        
        sentMessages.forEach((msg, index) => {
          if (msg.type === 'text') {
            console.log(`   📝 Text: ${msg.message.substring(0, 80)}...`);
          } else if (msg.type === 'interactive_buttons') {
            console.log(`   🔘 Buttons: ${msg.buttons.length} buttons`);
            console.log('   ❌ ISSUE: Buttons shown during conversation!');
          } else if (msg.type === 'list') {
            console.log(`   📋 List: ${msg.sections.length} sections`);
            console.log('   ❌ ISSUE: List shown during conversation!');
          }
        });
        
        // Check if conversation flow was interrupted
        const hasInteractiveElements = sentMessages.some(msg => 
          msg.type === 'interactive_buttons' || msg.type === 'list'
        );
        
        if (hasInteractiveElements) {
          console.log('   🚨 CONVERSATION INTERRUPTED!');
        } else {
          console.log('   ✅ Conversation continues naturally');
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  async testAIChatFlow() {
    console.log('\n🧪 Testing AI Chat Conversation Flow...\n');
    
    // Override session state for AI chat
    this.messageController.userService.getUserSession = async () => ({ session_state: 'ai_chat' });
    
    const testMessages = [
      'What is diabetes?',
      'How can I prevent it?',
      'What foods should I avoid?',
      'Tell me about exercise',
      'Any other tips?'
    ];
    
    console.log('📱 Simulating continuous AI chat conversation:');
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n${i + 1}. User: "${message}"`);
      
      this.whatsappService.clearSentMessages();
      
      try {
        await this.messageController.handleMessage({
          phoneNumber: '+1234567890',
          content: message,
          type: 'text',
          messageId: `ai_msg_${i}`,
          timestamp: new Date().toISOString()
        });
        
        const sentMessages = this.whatsappService.getSentMessages();
        console.log(`   Bot responses: ${sentMessages.length} messages`);
        
        const hasInteractiveElements = sentMessages.some(msg => 
          msg.type === 'interactive_buttons' || msg.type === 'list'
        );
        
        if (hasInteractiveElements) {
          console.log('   🚨 AI CHAT INTERRUPTED!');
        } else {
          console.log('   ✅ AI chat continues naturally');
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  async testIntentDetection() {
    console.log('\n🧪 Testing Intent Detection in Different States...\n');
    
    const testCases = [
      {
        state: 'symptom_check',
        message: 'I have fever',
        expectedIntent: 'symptom_input'
      },
      {
        state: 'symptom_check',
        message: 'menu',
        expectedIntent: 'menu_request'
      },
      {
        state: 'ai_chat',
        message: 'What is diabetes?',
        expectedIntent: 'ai_chat_message'
      },
      {
        state: 'ai_chat',
        message: 'menu',
        expectedIntent: 'menu_request'
      },
      {
        state: 'preventive_tips',
        message: 'Tell me about nutrition',
        expectedIntent: 'preventive_tips_request'
      },
      {
        state: 'preventive_tips',
        message: 'menu',
        expectedIntent: 'menu_request'
      }
    ];
    
    console.log('🎯 Testing intent detection:');
    
    testCases.forEach((testCase, index) => {
      const actualIntent = this.conversationService.detectIntent(testCase.message, testCase.state);
      const isCorrect = actualIntent === testCase.expectedIntent;
      
      console.log(`${index + 1}. State: ${testCase.state}, Message: "${testCase.message}"`);
      console.log(`   Expected: ${testCase.expectedIntent}, Got: ${actualIntent} ${isCorrect ? '✅' : '❌'}`);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Conversation Flow Tests\n');
    console.log('=' * 60);
    
    await this.testSymptomCheckFlow();
    await this.testAIChatFlow();
    await this.testIntentDetection();
    
    console.log('\n' + '=' * 60);
    console.log('🏁 Conversation Flow Tests Complete!');
    console.log('\n✅ Expected Results:');
    console.log('- No buttons/lists during conversations');
    console.log('- Natural conversation flow');
    console.log('- Only "menu" command exits conversations');
    console.log('- Proper intent detection in each state');
  }
}

// Run the tests
async function main() {
  const tester = new ConversationFlowTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ConversationFlowTest;
