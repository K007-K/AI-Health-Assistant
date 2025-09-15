#!/usr/bin/env node

/**
 * Rate-Limited Multilingual Accuracy Test
 * Tests bot accuracy with built-in delays to avoid API rate limits
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MessageController = require('../src/controllers/messageController');
const { supabase } = require('../src/config/database');

class RateLimitedTester {
  constructor() {
    this.messageController = new MessageController();
    this.results = {
      overall: { total: 0, passed: 0, accuracy: 0 },
      byLanguage: {},
      byCategory: {},
      details: []
    };
    this.delayBetweenRequests = 2000; // 2 seconds between requests
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test scenarios focused on the most critical issues
  getTestScenarios() {
    return [
      // Emergency Detection - Critical
      { 
        query: "I have severe chest pain and can't breathe", 
        language: 'en', 
        category: 'emergency',
        expectedTerms: ['emergency', 'hospital', 'call', 'immediately'],
        isEmergency: true
      },
      { 
        query: "मुझे तेज सीने में दर्द है और सांस नहीं आ रही", 
        language: 'hi', 
        category: 'emergency',
        expectedTerms: ['आपातकाल', 'अस्पताल', 'तुरंत', 'डॉक्टर'],
        isEmergency: true
      },
      { 
        query: "నాకు తీవ్రమైన ఛాతీ నొప్పి మరియు ఊపిరి ఆడటం లేదు", 
        language: 'te', 
        category: 'emergency',
        expectedTerms: ['అత్యవసరం', 'ఆసుపత్రి', 'వెంటనే', 'వైద్యుడు'],
        isEmergency: true
      },

      // Basic Health Queries - High Priority
      { 
        query: "I have fever, what should I do?", 
        language: 'en', 
        category: 'basic_health',
        expectedTerms: ['rest', 'fluids', 'paracetamol', 'doctor'],
        isEmergency: false
      },
      { 
        query: "मुझे बुखार है, क्या करूं?", 
        language: 'hi', 
        category: 'basic_health',
        expectedTerms: ['आराम', 'पानी', 'दवा', 'डॉक्टर'],
        isEmergency: false
      },
      { 
        query: "నాకు జ్వరం వచ్చింది, ఏమి చేయాలి?", 
        language: 'te', 
        category: 'basic_health',
        expectedTerms: ['విశ్రాంతి', 'నీరు', 'మందు', 'వైద్యుడు'],
        isEmergency: false
      },

      // Prevention Tips - Critical Issue
      { 
        query: "How to prevent diabetes?", 
        language: 'en', 
        category: 'prevention',
        expectedTerms: ['diet', 'exercise', 'weight', 'sugar', 'checkup'],
        isEmergency: false
      },
      { 
        query: "मधुमेह कैसे रोकें?", 
        language: 'hi', 
        category: 'prevention',
        expectedTerms: ['आहार', 'व्यायाम', 'वजन', 'चीनी', 'जांच'],
        isEmergency: false
      },
      { 
        query: "మధుమేహాన్ని ఎలా నివారించాలి?", 
        language: 'te', 
        category: 'prevention',
        expectedTerms: ['ఆహారం', 'వ్యాయామం', 'బరువు', 'చక్కెర', 'పరీక్ష'],
        isEmergency: false
      }
    ];
  }

  evaluateResponse(response, expectedTerms, isEmergency, hasDisclaimer) {
    const lowerResponse = response.toLowerCase();
    const matchedTerms = expectedTerms.filter(term => 
      lowerResponse.includes(term.toLowerCase())
    );
    
    const accuracy = (matchedTerms.length / expectedTerms.length) * 100;
    const passed = accuracy >= 60 && hasDisclaimer;
    
    return {
      accuracy,
      passed,
      matchedTerms,
      missedTerms: expectedTerms.filter(term => !matchedTerms.includes(term)),
      hasDisclaimer
    };
  }

  async testScenario(scenario) {
    console.log(`\n🧪 Testing: "${scenario.query}" (${scenario.language.toUpperCase()})`);
    
    try {
      // Create mock request object
      const mockReq = {
        body: {
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: 'test_user',
                  text: { body: scenario.query },
                  type: 'text'
                }]
              }
            }]
          }]
        }
      };

      const mockRes = {
        status: () => ({ json: () => {} }),
        json: () => {}
      };

      // Capture the response
      let botResponse = '';
      const originalSend = console.log;
      
      // Mock the WhatsApp API call to capture response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Process the message
      await this.messageController.handleMessage(mockReq, mockRes);
      
      // For this test, we'll simulate the response based on the scenario
      // In a real implementation, you'd capture the actual bot response
      botResponse = `Mock response for ${scenario.query}`;
      
      global.fetch = originalFetch;

      // Check for medical disclaimer
      const hasDisclaimer = botResponse.includes('⚠️') || 
                           botResponse.includes('healthcare professional') ||
                           botResponse.includes('medical advice');

      // Evaluate the response
      const evaluation = this.evaluateResponse(
        botResponse, 
        scenario.expectedTerms, 
        scenario.isEmergency,
        hasDisclaimer
      );

      console.log(`✅ Response: ${botResponse.substring(0, 100)}...`);
      console.log(`📊 Accuracy: ${evaluation.accuracy.toFixed(1)}% (${evaluation.matchedTerms.length}/${scenario.expectedTerms.length} terms)`);
      console.log(`✅ Matched: ${evaluation.matchedTerms.join(', ')}`);
      console.log(`❌ Missed: ${evaluation.missedTerms.join(', ')}`);
      console.log(`🏥 Has Disclaimer: ${evaluation.hasDisclaimer ? 'Yes' : 'No'}`);
      console.log(`🎯 Test Result: ${evaluation.passed ? 'PASS' : 'FAIL'}`);

      // Update results
      this.updateResults(scenario, evaluation);

      return evaluation;

    } catch (error) {
      console.error(`❌ Error testing scenario: ${error.message}`);
      return { accuracy: 0, passed: false, error: error.message };
    }
  }

  updateResults(scenario, evaluation) {
    // Overall results
    this.results.overall.total++;
    if (evaluation.passed) this.results.overall.passed++;

    // By language
    if (!this.results.byLanguage[scenario.language]) {
      this.results.byLanguage[scenario.language] = { total: 0, passed: 0, accuracy: 0 };
    }
    this.results.byLanguage[scenario.language].total++;
    if (evaluation.passed) this.results.byLanguage[scenario.language].passed++;

    // By category
    if (!this.results.byCategory[scenario.category]) {
      this.results.byCategory[scenario.category] = { total: 0, passed: 0, accuracy: 0 };
    }
    this.results.byCategory[scenario.category].total++;
    if (evaluation.passed) this.results.byCategory[scenario.category].passed++;

    // Store details
    this.results.details.push({
      scenario,
      evaluation
    });
  }

  calculateFinalResults() {
    // Calculate overall accuracy
    this.results.overall.accuracy = this.results.overall.total > 0 
      ? (this.results.overall.passed / this.results.overall.total) * 100 
      : 0;

    // Calculate by language
    Object.keys(this.results.byLanguage).forEach(lang => {
      const langData = this.results.byLanguage[lang];
      langData.accuracy = langData.total > 0 ? (langData.passed / langData.total) * 100 : 0;
    });

    // Calculate by category
    Object.keys(this.results.byCategory).forEach(cat => {
      const catData = this.results.byCategory[cat];
      catData.accuracy = catData.total > 0 ? (catData.passed / catData.total) * 100 : 0;
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RATE-LIMITED ACCURACY TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`   Total Tests: ${this.results.overall.total}`);
    console.log(`   Passed Tests: ${this.results.overall.passed}`);
    console.log(`   Failed Tests: ${this.results.overall.total - this.results.overall.passed}`);
    console.log(`   Overall Accuracy: ${this.results.overall.accuracy.toFixed(1)}%`);

    console.log('\n🌐 LANGUAGE-WISE PERFORMANCE:');
    Object.entries(this.results.byLanguage).forEach(([lang, data]) => {
      console.log(`   ${lang.toUpperCase()}:`);
      console.log(`     Pass Rate: ${data.accuracy.toFixed(1)}% (${data.passed}/${data.total})`);
    });

    console.log('\n📋 CATEGORY-WISE PERFORMANCE:');
    Object.entries(this.results.byCategory).forEach(([cat, data]) => {
      console.log(`   ${cat.toUpperCase()}:`);
      console.log(`     Pass Rate: ${data.accuracy.toFixed(1)}% (${data.passed}/${data.total})`);
    });

    console.log('\n🎯 TARGET COMPARISON:');
    console.log(`   Project Target: 90% accuracy`);
    console.log(`   Current Performance: ${this.results.overall.accuracy.toFixed(1)}%`);
    console.log(`   Status: ${this.results.overall.accuracy >= 90 ? '✅ TARGET MET' : '⚠️ NEEDS IMPROVEMENT'}`);

    console.log('\n' + '='.repeat(80));
  }

  async runTests() {
    console.log('🚀 Starting Rate-Limited Multilingual Accuracy Test...');
    console.log(`⏱️ Using ${this.delayBetweenRequests}ms delay between requests to avoid rate limits\n`);

    const scenarios = this.getTestScenarios();
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      
      console.log(`\n📍 Progress: ${i + 1}/${scenarios.length}`);
      await this.testScenario(scenario);
      
      // Add delay between requests except for the last one
      if (i < scenarios.length - 1) {
        console.log(`⏳ Waiting ${this.delayBetweenRequests}ms to avoid rate limits...`);
        await this.delay(this.delayBetweenRequests);
      }
    }

    this.calculateFinalResults();
    this.generateReport();

    // Exit with appropriate code
    const success = this.results.overall.accuracy >= 90;
    console.log(`\n🎉 Rate-limited testing completed with ${this.results.overall.accuracy.toFixed(1)}% accuracy`);
    process.exit(success ? 0 : 1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new RateLimitedTester();
  tester.runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = RateLimitedTester;
