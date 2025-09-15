#!/usr/bin/env node

/**
 * Focused Test for Bot Improvements
 * Tests specific scenarios that were failing before improvements
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GeminiService = require('../src/services/geminiService');
const { LanguageUtils, medicalTerms } = require('../src/utils/languageUtils');

class ImprovementTester {
  constructor() {
    this.geminiService = new GeminiService();
    this.results = [];
    this.delayBetweenRequests = 3000; // 3 seconds to avoid rate limits
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test scenarios that were previously failing
  getTestScenarios() {
    return [
      // Preventive tips - was 0% accuracy
      {
        category: 'preventive_tips',
        query: 'diabetes prevention',
        language: 'en',
        expectedTerms: ['diet', 'exercise', 'weight', 'sugar', 'checkup'],
        testType: 'prevention'
      },
      {
        category: 'preventive_tips', 
        query: 'मधुमेह रोकथाम',
        language: 'hi',
        expectedTerms: ['आहार', 'व्यायाम', 'वजन', 'चीनी', 'जांच'],
        testType: 'prevention'
      },
      {
        category: 'preventive_tips',
        query: 'మధుమేహ నివారణ',
        language: 'te', 
        expectedTerms: ['ఆహారం', 'వ్యాయామం', 'బరువు', 'చక్కెర', 'పరీక్ష'],
        testType: 'prevention'
      },

      // Basic health queries - regional languages were poor
      {
        category: 'basic_health',
        query: 'I have fever',
        language: 'en',
        expectedTerms: ['rest', 'fluids', 'medicine', 'doctor'],
        testType: 'symptom'
      },
      {
        category: 'basic_health',
        query: 'నాకు జ్వరం వచ్చింది',
        language: 'te',
        expectedTerms: ['విశ్రాంతి', 'నీరు', 'మందు', 'వైద్యుడు'],
        testType: 'symptom'
      },
      {
        category: 'basic_health',
        query: 'எனக்கு காய்ச்சல்',
        language: 'ta',
        expectedTerms: ['ஓய்வு', 'தண்ணீர்', 'மருந்து', 'மருத்துவர்'],
        testType: 'symptom'
      }
    ];
  }

  checkMedicalTerms(response, expectedTerms, language) {
    const lowerResponse = response.toLowerCase();
    const matchedTerms = [];
    const missedTerms = [];

    expectedTerms.forEach(term => {
      if (lowerResponse.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      } else {
        missedTerms.push(term);
      }
    });

    return {
      matchedTerms,
      missedTerms,
      accuracy: (matchedTerms.length / expectedTerms.length) * 100
    };
  }

  checkDisclaimer(response) {
    const disclaimerIndicators = [
      '⚠️',
      'healthcare professional',
      'medical advice',
      'consult',
      'doctor',
      'physician',
      'सलाह लें',
      'సంప్రదించండి',
      'அணுகவும்',
      'ପରାମର୍ଶ'
    ];

    return disclaimerIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  async testScenario(scenario) {
    console.log(`\n🧪 Testing: ${scenario.category} in ${scenario.language.toUpperCase()}`);
    console.log(`📝 Query: "${scenario.query}"`);

    try {
      let response = '';
      
      if (scenario.testType === 'prevention') {
        // Test preventive tips
        response = await this.geminiService.getPreventiveTips(
          'disease prevention',
          { 
            preferred_language: scenario.language,
            script_preference: 'native'
          },
          scenario.query.includes('diabetes') || scenario.query.includes('मधुमेह') || scenario.query.includes('మధుమేహ') ? 'diabetes' : ''
        );
      } else {
        // Test basic health response
        response = await this.geminiService.generateResponse(
          scenario.query,
          scenario.language,
          'native'
        );
      }

      console.log(`✅ Response: ${response.substring(0, 150)}...`);

      // Check medical terms
      const termCheck = this.checkMedicalTerms(response, scenario.expectedTerms, scenario.language);
      
      // Check disclaimer
      const hasDisclaimer = this.checkDisclaimer(response);

      // Calculate overall accuracy
      const passed = termCheck.accuracy >= 60 && hasDisclaimer;

      console.log(`📊 Medical Terms: ${termCheck.accuracy.toFixed(1)}% (${termCheck.matchedTerms.length}/${scenario.expectedTerms.length})`);
      console.log(`✅ Matched: ${termCheck.matchedTerms.join(', ')}`);
      console.log(`❌ Missed: ${termCheck.missedTerms.join(', ')}`);
      console.log(`🏥 Has Disclaimer: ${hasDisclaimer ? 'Yes' : 'No'}`);
      console.log(`🎯 Result: ${passed ? 'PASS' : 'FAIL'}`);

      this.results.push({
        scenario,
        response,
        termCheck,
        hasDisclaimer,
        passed
      });

      return { passed, accuracy: termCheck.accuracy };

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      this.results.push({
        scenario,
        error: error.message,
        passed: false
      });
      return { passed: false, accuracy: 0 };
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 IMPROVEMENT TEST REPORT');
    console.log('='.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const overallAccuracy = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${overallAccuracy.toFixed(1)}%`);

    // Category breakdown
    const categories = {};
    this.results.forEach(result => {
      const cat = result.scenario.category;
      if (!categories[cat]) {
        categories[cat] = { total: 0, passed: 0 };
      }
      categories[cat].total++;
      if (result.passed) categories[cat].passed++;
    });

    console.log(`\n📋 CATEGORY BREAKDOWN:`);
    Object.entries(categories).forEach(([cat, data]) => {
      const rate = data.total > 0 ? (data.passed / data.total) * 100 : 0;
      console.log(`   ${cat}: ${rate.toFixed(1)}% (${data.passed}/${data.total})`);
    });

    // Language breakdown
    const languages = {};
    this.results.forEach(result => {
      const lang = result.scenario.language;
      if (!languages[lang]) {
        languages[lang] = { total: 0, passed: 0 };
      }
      languages[lang].total++;
      if (result.passed) languages[lang].passed++;
    });

    console.log(`\n🌐 LANGUAGE BREAKDOWN:`);
    Object.entries(languages).forEach(([lang, data]) => {
      const rate = data.total > 0 ? (data.passed / data.total) * 100 : 0;
      console.log(`   ${lang.toUpperCase()}: ${rate.toFixed(1)}% (${data.passed}/${data.total})`);
    });

    console.log(`\n🎯 IMPROVEMENT STATUS:`);
    if (overallAccuracy >= 90) {
      console.log(`   ✅ EXCELLENT - Target exceeded!`);
    } else if (overallAccuracy >= 80) {
      console.log(`   ✅ GOOD - Target met!`);
    } else if (overallAccuracy >= 60) {
      console.log(`   ⚠️ MODERATE - Needs improvement`);
    } else {
      console.log(`   ❌ POOR - Major improvements needed`);
    }

    console.log('\n' + '='.repeat(80));
  }

  async runTests() {
    console.log('🚀 Starting Focused Improvement Test...');
    console.log('🎯 Testing previously failing scenarios after improvements\n');

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

    this.generateReport();

    const passedTests = this.results.filter(r => r.passed).length;
    const successRate = this.results.length > 0 ? (passedTests / this.results.length) * 100 : 0;
    
    console.log(`\n🎉 Improvement test completed with ${successRate.toFixed(1)}% success rate`);
    process.exit(successRate >= 80 ? 0 : 1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new ImprovementTester();
  tester.runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ImprovementTester;
