#!/usr/bin/env node

/**
 * Test Duplicate Response Fix and Performance Improvement
 * Verify that duplicate responses are prevented and response time is optimized
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const WebhookController = require('./src/controllers/webhookController');
const MessageController = require('./src/controllers/messageController');

class DuplicateResponseFixTest {
  constructor() {
    this.webhookController = new WebhookController();
    this.messageController = new MessageController();
    this.sentMessages = [];
    this.responseTimes = [];
    
    // Mock WhatsApp service to capture messages and measure timing
    const mockWhatsAppService = {
      sendMessage: async (phone, message) => {
        const timestamp = Date.now();
        this.sentMessages.push({ 
          phone, 
          message, 
          timestamp,
          type: 'message' 
        });
        console.log(`📱 MESSAGE SENT: ${message.substring(0, 60)}...`);
        return { success: true, messageId: `mock_${timestamp}` };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        const timestamp = Date.now();
        this.sentMessages.push({ 
          phone, 
          text, 
          buttons, 
          timestamp,
          type: 'buttons' 
        });
        console.log(`🔘 BUTTONS SENT: ${text.substring(0, 60)}...`);
        return { success: true };
      },
      markAsRead: async (messageId) => {
        console.log(`✅ Marked as read: ${messageId}`);
        return { success: true };
      }
    };
    
    // Replace WhatsApp services in both controllers
    this.webhookController.whatsappService = mockWhatsAppService;
    this.messageController.whatsappService = mockWhatsAppService;
  }

  async testDuplicateMessagePrevention() {
    console.log('🧪 Testing Duplicate Message Prevention\n');
    
    try {
      const testPhone = '+1234567890';
      const testMessageId = 'test_msg_12345';
      const testMessage = {
        id: testMessageId,
        from: testPhone,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: 'text',
        text: { body: 'Menu' }
      };
      
      console.log('1. Sending first message...');
      const startTime1 = Date.now();
      this.sentMessages = [];
      
      await this.webhookController.handleIncomingMessage(testMessage, {});
      
      const endTime1 = Date.now();
      const responseTime1 = endTime1 - startTime1;
      this.responseTimes.push(responseTime1);
      
      const messagesAfterFirst = this.sentMessages.length;
      console.log(`   ✅ First message processed in ${responseTime1}ms`);
      console.log(`   📊 Messages sent: ${messagesAfterFirst}`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('\n2. Sending duplicate message (same ID)...');
      const startTime2 = Date.now();
      const initialMessageCount = this.sentMessages.length;
      
      await this.webhookController.handleIncomingMessage(testMessage, {});
      
      const endTime2 = Date.now();
      const responseTime2 = endTime2 - startTime2;
      
      const messagesAfterDuplicate = this.sentMessages.length;
      const duplicateProcessed = messagesAfterDuplicate > initialMessageCount;
      
      console.log(`   ⚡ Duplicate handled in ${responseTime2}ms`);
      console.log(`   📊 Additional messages sent: ${messagesAfterDuplicate - initialMessageCount}`);
      console.log(`   ✅ Duplicate prevention: ${!duplicateProcessed ? 'WORKING' : 'FAILED'}`);
      
      return {
        duplicatePrevented: !duplicateProcessed,
        firstResponseTime: responseTime1,
        duplicateResponseTime: responseTime2,
        messagesAfterFirst: messagesAfterFirst,
        messagesAfterDuplicate: messagesAfterDuplicate
      };
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      return { duplicatePrevented: false, error: error.message };
    }
  }

  async testConcurrentMessagePrevention() {
    console.log('\n🧪 Testing Concurrent Message Prevention\n');
    
    try {
      const testPhone = '+1234567891';
      
      // Create two different messages from same user
      const message1 = {
        id: 'concurrent_msg_1',
        from: testPhone,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: 'text',
        text: { body: 'Hello' }
      };
      
      const message2 = {
        id: 'concurrent_msg_2',
        from: testPhone,
        timestamp: Math.floor((Date.now() + 1000) / 1000).toString(),
        type: 'text',
        text: { body: 'Menu' }
      };
      
      console.log('1. Sending concurrent messages from same user...');
      this.sentMessages = [];
      
      // Send both messages concurrently
      const startTime = Date.now();
      const promises = [
        this.webhookController.handleIncomingMessage(message1, {}),
        this.webhookController.handleIncomingMessage(message2, {})
      ];
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      const totalResponseTime = endTime - startTime;
      const totalMessages = this.sentMessages.length;
      
      console.log(`   ⚡ Both messages handled in ${totalResponseTime}ms`);
      console.log(`   📊 Total messages sent: ${totalMessages}`);
      
      // Check if messages were processed sequentially (not duplicated)
      const uniqueMessages = new Set(this.sentMessages.map(msg => msg.message || msg.text));
      const noDuplicateResponses = uniqueMessages.size === this.sentMessages.length;
      
      console.log(`   ✅ Sequential processing: ${noDuplicateResponses ? 'WORKING' : 'FAILED'}`);
      
      return {
        sequentialProcessing: noDuplicateResponses,
        totalResponseTime: totalResponseTime,
        totalMessages: totalMessages,
        uniqueMessages: uniqueMessages.size
      };
      
    } catch (error) {
      console.log(`   ❌ Concurrent test failed: ${error.message}`);
      return { sequentialProcessing: false, error: error.message };
    }
  }

  async testResponseTimeImprovement() {
    console.log('\n🧪 Testing Response Time Improvement\n');
    
    try {
      const testPhone = '+1234567892';
      const responseTimes = [];
      
      console.log('1. Testing multiple requests to measure caching effect...');
      
      for (let i = 0; i < 3; i++) {
        const message = {
          id: `perf_test_${i}`,
          from: testPhone,
          timestamp: Math.floor((Date.now() + i * 1000) / 1000).toString(),
          type: 'text',
          text: { body: 'Menu' }
        };
        
        const startTime = Date.now();
        this.sentMessages = [];
        
        await this.webhookController.handleIncomingMessage(message, {});
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
        
        console.log(`   Request ${i + 1}: ${responseTime}ms`);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const firstResponse = responseTimes[0];
      const avgSubsequentResponse = responseTimes.slice(1).reduce((a, b) => a + b, 0) / (responseTimes.length - 1);
      const improvement = ((firstResponse - avgSubsequentResponse) / firstResponse) * 100;
      
      console.log(`\n2. Performance Analysis:`);
      console.log(`   First response: ${firstResponse}ms`);
      console.log(`   Avg subsequent: ${avgSubsequentResponse.toFixed(1)}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}%`);
      
      const significantImprovement = improvement > 10; // At least 10% improvement
      
      return {
        responseTimesImproved: significantImprovement,
        firstResponse: firstResponse,
        avgSubsequentResponse: avgSubsequentResponse,
        improvementPercentage: improvement,
        allResponseTimes: responseTimes
      };
      
    } catch (error) {
      console.log(`   ❌ Performance test failed: ${error.message}`);
      return { responseTimesImproved: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Duplicate Response Fix and Performance Tests\n');
    console.log('=' * 70);
    
    const testResults = {
      duplicateMessagePrevention: await this.testDuplicateMessagePrevention(),
      concurrentMessagePrevention: await this.testConcurrentMessagePrevention(),
      responseTimeImprovement: await this.testResponseTimeImprovement()
    };
    
    console.log('=' * 70);
    console.log('🏁 Duplicate Response Fix and Performance Tests Complete!\n');
    
    console.log('📊 Test Results Summary:');
    
    const duplicateFixed = testResults.duplicateMessagePrevention.duplicatePrevented;
    const concurrentFixed = testResults.concurrentMessagePrevention.sequentialProcessing;
    const performanceImproved = testResults.responseTimeImprovement.responseTimesImproved;
    
    console.log(`   Duplicate Message Prevention: ${duplicateFixed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Concurrent Message Prevention: ${concurrentFixed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Response Time Improvement: ${performanceImproved ? '✅ PASS' : '❌ FAIL'}`);
    
    const passedTests = [duplicateFixed, concurrentFixed, performanceImproved].filter(Boolean).length;
    const totalTests = 3;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
    
    if (successRate >= 80) {
      console.log('\n✅ DUPLICATE RESPONSE FIX: WORKING PERFECTLY');
      console.log('\n🚀 Key Improvements Verified:');
      console.log('- Duplicate message detection and prevention');
      console.log('- Concurrent message processing locks');
      console.log('- User and session data caching');
      console.log('- Improved response times');
      console.log('- Clean, non-duplicate user experience');
      
      if (testResults.responseTimeImprovement.improvementPercentage) {
        console.log(`- ${testResults.responseTimeImprovement.improvementPercentage.toFixed(1)}% response time improvement`);
      }
    } else {
      console.log('\n⚠️ Duplicate response fix needs improvements');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new DuplicateResponseFixTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Duplicate response issue is fixed and performance improved!');
    console.log('Bot will no longer send duplicate messages and responds faster.');
  } else {
    console.log('\n🔧 CONCLUSION: Further improvements needed for duplicate prevention or performance.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DuplicateResponseFixTest;
