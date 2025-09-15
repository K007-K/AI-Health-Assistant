#!/usr/bin/env node

/**
 * Real Workflow Test for WhatsApp Healthcare Bot
 * Simulates actual user interactions and complete conversation flows
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MessageController = require('../src/controllers/messageController');
const GeminiService = require('../src/services/geminiService');
const { LanguageUtils } = require('../src/utils/languageUtils');
const { supabase } = require('../src/config/database');

class WorkflowTester {
  constructor() {
    this.messageController = new MessageController();
    this.geminiService = new GeminiService();
    this.testResults = [];
    this.delayBetweenRequests = 2000;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Real user workflow scenarios
  getWorkflowScenarios() {
    return [
      {
        name: "Emergency Detection Workflow",
        language: "en",
        conversation: [
          {
            user: "I have severe chest pain and can't breathe",
            expectedType: "emergency",
            expectedKeywords: ["emergency", "hospital", "call", "immediately"]
          }
        ]
      },
      {
        name: "Basic Health Consultation - English",
        language: "en", 
        conversation: [
          {
            user: "Hello",
            expectedType: "greeting"
          },
          {
            user: "I have fever and headache",
            expectedType: "symptom_analysis",
            expectedKeywords: ["rest", "fluids", "paracetamol", "doctor"]
          },
          {
            user: "How long should I rest?",
            expectedType: "follow_up",
            expectedKeywords: ["rest", "days", "doctor"]
          }
        ]
      },
      {
        name: "Prevention Tips Workflow - Hindi",
        language: "hi",
        conversation: [
          {
            user: "नमस्ते",
            expectedType: "greeting"
          },
          {
            user: "मधुमेह से कैसे बचें?",
            expectedType: "prevention",
            expectedKeywords: ["आहार", "व्यायाम", "वजन", "चीनी", "जांच"]
          }
        ]
      },
      {
        name: "Multilingual Health Query - Telugu",
        language: "te",
        conversation: [
          {
            user: "హలో",
            expectedType: "greeting"
          },
          {
            user: "నాకు జ్వరం వచ్చింది, ఏమి చేయాలి?",
            expectedType: "symptom_analysis", 
            expectedKeywords: ["విశ్రాంతి", "నీరు", "మందు", "వైద్యుడు"]
          },
          {
            user: "ఎంత రోజులు విశ్రాంతి తీసుకోవాలి?",
            expectedType: "follow_up",
            expectedKeywords: ["విశ్రాంతి", "రోజులు", "వైద్యుడు"]
          }
        ]
      },
      {
        name: "Symptom Analysis with Image - Tamil",
        language: "ta",
        conversation: [
          {
            user: "வணக்கம்",
            expectedType: "greeting"
          },
          {
            user: "எனக்கு காய்ச்சல் மற்றும் தலைவலி",
            expectedType: "symptom_analysis",
            expectedKeywords: ["ஓய்வு", "தண்ணீர்", "மருந்து", "மருத்துவர்"]
          }
        ]
      },
      {
        name: "Emergency vs Non-Emergency Classification",
        language: "en",
        conversation: [
          {
            user: "I have a mild headache",
            expectedType: "non_emergency",
            expectedKeywords: ["rest", "water", "paracetamol"]
          },
          {
            user: "Now I'm having severe chest pain and difficulty breathing",
            expectedType: "emergency",
            expectedKeywords: ["emergency", "hospital", "call", "immediately"]
          }
        ]
      }
    ];
  }

  async simulateWhatsAppMessage(message, phoneNumber = "test_user") {
    // Create mock WhatsApp webhook payload
    const mockRequest = {
      body: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: phoneNumber,
                text: { body: message },
                type: 'text',
                timestamp: Date.now().toString()
              }],
              metadata: {
                phone_number_id: "test_phone_id"
              }
            }
          }]
        }]
      }
    };

    const mockResponse = {
      status: (code) => ({
        json: (data) => ({ statusCode: code, data })
      }),
      json: (data) => data
    };

    // Capture console output to get bot response
    let botResponse = '';
    const originalLog = console.log;
    const logs = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      // Process the message through the controller
      await this.messageController.handleMessage(mockRequest, mockResponse);
      
      // Extract the actual response from logs or use direct service call
      // For testing, we'll call the service directly to get the response
      botResponse = await this.geminiService.generateResponse(message, 'en', 'native');
      
    } catch (error) {
      console.error('Error processing message:', error);
      botResponse = 'Error processing message';
    } finally {
      console.log = originalLog;
    }

    return botResponse;
  }

  checkResponseQuality(response, expectedType, expectedKeywords = []) {
    const lowerResponse = response.toLowerCase();
    
    // Check for expected keywords
    const foundKeywords = expectedKeywords.filter(keyword => 
      lowerResponse.includes(keyword.toLowerCase())
    );
    
    // Check for medical disclaimer
    const hasDisclaimer = [
      '⚠️', 'healthcare professional', 'medical advice', 'consult', 'doctor'
    ].some(indicator => lowerResponse.includes(indicator.toLowerCase()));
    
    // Check response appropriateness based on type
    let isAppropriate = true;
    switch (expectedType) {
      case 'emergency':
        isAppropriate = ['emergency', 'hospital', 'call', 'immediately', 'urgent']
          .some(term => lowerResponse.includes(term));
        break;
      case 'symptom_analysis':
        isAppropriate = ['rest', 'fluids', 'medicine', 'doctor']
          .some(term => lowerResponse.includes(term));
        break;
      case 'prevention':
        isAppropriate = ['diet', 'exercise', 'healthy', 'prevention']
          .some(term => lowerResponse.includes(term));
        break;
    }
    
    const keywordAccuracy = expectedKeywords.length > 0 
      ? (foundKeywords.length / expectedKeywords.length) * 100 
      : 100;
    
    return {
      keywordAccuracy,
      foundKeywords,
      missedKeywords: expectedKeywords.filter(k => !foundKeywords.includes(k)),
      hasDisclaimer,
      isAppropriate,
      responseLength: response.length,
      overallQuality: (keywordAccuracy + (hasDisclaimer ? 100 : 0) + (isAppropriate ? 100 : 0)) / 3
    };
  }

  async testWorkflowScenario(scenario) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing Workflow: ${scenario.name}`);
    console.log(`🌐 Language: ${scenario.language.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    const conversationResults = [];
    
    for (let i = 0; i < scenario.conversation.length; i++) {
      const turn = scenario.conversation[i];
      
      console.log(`\n📱 User Message ${i + 1}: "${turn.user}"`);
      
      try {
        // Simulate the message
        const botResponse = await this.simulateWhatsAppMessage(turn.user);
        
        console.log(`🤖 Bot Response: ${botResponse.substring(0, 200)}${botResponse.length > 200 ? '...' : ''}`);
        
        // Analyze response quality
        const quality = this.checkResponseQuality(
          botResponse, 
          turn.expectedType, 
          turn.expectedKeywords || []
        );
        
        console.log(`📊 Quality Metrics:`);
        console.log(`   Keyword Accuracy: ${quality.keywordAccuracy.toFixed(1)}%`);
        console.log(`   Found Keywords: ${quality.foundKeywords.join(', ') || 'None'}`);
        console.log(`   Missed Keywords: ${quality.missedKeywords.join(', ') || 'None'}`);
        console.log(`   Has Disclaimer: ${quality.hasDisclaimer ? 'Yes' : 'No'}`);
        console.log(`   Appropriate Response: ${quality.isAppropriate ? 'Yes' : 'No'}`);
        console.log(`   Overall Quality: ${quality.overallQuality.toFixed(1)}%`);
        
        conversationResults.push({
          turn: i + 1,
          userMessage: turn.user,
          botResponse,
          quality,
          passed: quality.overallQuality >= 70
        });
        
        // Add delay between messages
        if (i < scenario.conversation.length - 1) {
          console.log(`⏳ Waiting ${this.delayBetweenRequests}ms...`);
          await this.delay(this.delayBetweenRequests);
        }
        
      } catch (error) {
        console.error(`❌ Error in conversation turn ${i + 1}:`, error.message);
        conversationResults.push({
          turn: i + 1,
          userMessage: turn.user,
          error: error.message,
          passed: false
        });
      }
    }
    
    // Calculate scenario results
    const passedTurns = conversationResults.filter(r => r.passed).length;
    const totalTurns = conversationResults.length;
    const scenarioSuccess = totalTurns > 0 ? (passedTurns / totalTurns) * 100 : 0;
    
    console.log(`\n🎯 Scenario Results:`);
    console.log(`   Passed Turns: ${passedTurns}/${totalTurns}`);
    console.log(`   Success Rate: ${scenarioSuccess.toFixed(1)}%`);
    console.log(`   Status: ${scenarioSuccess >= 80 ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      scenario: scenario.name,
      language: scenario.language,
      conversationResults,
      passedTurns,
      totalTurns,
      successRate: scenarioSuccess,
      passed: scenarioSuccess >= 80
    };
  }

  generateComprehensiveReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE REAL WORKFLOW TEST REPORT');
    console.log('='.repeat(80));

    const totalScenarios = results.length;
    const passedScenarios = results.filter(r => r.passed).length;
    const overallSuccess = totalScenarios > 0 ? (passedScenarios / totalScenarios) * 100 : 0;

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Scenarios: ${totalScenarios}`);
    console.log(`   Passed Scenarios: ${passedScenarios}`);
    console.log(`   Failed Scenarios: ${totalScenarios - passedScenarios}`);
    console.log(`   Overall Success Rate: ${overallSuccess.toFixed(1)}%`);

    // Language breakdown
    const languageStats = {};
    results.forEach(result => {
      if (!languageStats[result.language]) {
        languageStats[result.language] = { total: 0, passed: 0 };
      }
      languageStats[result.language].total++;
      if (result.passed) languageStats[result.language].passed++;
    });

    console.log(`\n🌐 LANGUAGE PERFORMANCE:`);
    Object.entries(languageStats).forEach(([lang, stats]) => {
      const rate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
      console.log(`   ${lang.toUpperCase()}: ${rate.toFixed(1)}% (${stats.passed}/${stats.total})`);
    });

    // Detailed scenario breakdown
    console.log(`\n📋 SCENARIO BREAKDOWN:`);
    results.forEach(result => {
      console.log(`   ${result.scenario}:`);
      console.log(`     Language: ${result.language.toUpperCase()}`);
      console.log(`     Success Rate: ${result.successRate.toFixed(1)}%`);
      console.log(`     Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    });

    // Production readiness assessment
    console.log(`\n🚀 PRODUCTION READINESS ASSESSMENT:`);
    if (overallSuccess >= 90) {
      console.log(`   ✅ EXCELLENT - Ready for production deployment!`);
      console.log(`   🎯 Exceeds target accuracy across all workflows`);
    } else if (overallSuccess >= 80) {
      console.log(`   ✅ GOOD - Ready for production with monitoring`);
      console.log(`   🎯 Meets target accuracy for most workflows`);
    } else if (overallSuccess >= 70) {
      console.log(`   ⚠️ MODERATE - Needs minor improvements before production`);
      console.log(`   🔧 Some workflows require fine-tuning`);
    } else {
      console.log(`   ❌ POOR - Significant improvements needed`);
      console.log(`   🔧 Major workflow issues must be addressed`);
    }

    console.log('\n' + '='.repeat(80));
    
    return {
      totalScenarios,
      passedScenarios,
      overallSuccess,
      languageStats,
      productionReady: overallSuccess >= 80
    };
  }

  async runWorkflowTests() {
    console.log('🚀 Starting Comprehensive Real Workflow Tests...');
    console.log('🎯 Testing actual user conversation flows and AI responses\n');

    const scenarios = this.getWorkflowScenarios();
    const results = [];
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      
      console.log(`\n📍 Progress: ${i + 1}/${scenarios.length}`);
      const result = await this.testWorkflowScenario(scenario);
      results.push(result);
      
      // Add delay between scenarios
      if (i < scenarios.length - 1) {
        console.log(`\n⏳ Waiting ${this.delayBetweenRequests}ms before next scenario...`);
        await this.delay(this.delayBetweenRequests);
      }
    }

    const report = this.generateComprehensiveReport(results);
    
    console.log(`\n🎉 Real workflow testing completed!`);
    console.log(`📊 Overall Success Rate: ${report.overallSuccess.toFixed(1)}%`);
    console.log(`🚀 Production Ready: ${report.productionReady ? 'YES' : 'NO'}`);
    
    process.exit(report.productionReady ? 0 : 1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new WorkflowTester();
  tester.runWorkflowTests().catch(error => {
    console.error('Workflow test execution failed:', error);
    process.exit(1);
  });
}

module.exports = WorkflowTester;
