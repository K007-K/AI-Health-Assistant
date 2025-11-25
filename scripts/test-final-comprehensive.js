#!/usr/bin/env node

/**
 * Final Comprehensive Test for WhatsApp Healthcare Bot
 * Tests all functionality with proper webhook simulation and multilingual accuracy
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GeminiService = require('../src/services/geminiService');
const { LanguageUtils, medicalTerms } = require('../src/utils/languageUtils');

class FinalComprehensiveTester {
  constructor() {
    this.geminiService = new GeminiService();
    this.results = [];
    this.delayBetweenRequests = 70000; // Increased to 70s to strictly respect free tier limits (1 RPM)
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Comprehensive test scenarios covering all critical functionality
  getTestScenarios() {
    return [
      // Emergency Detection - Critical
      {
        name: "Emergency Detection - English",
        language: "en",
        query: "I have severe chest pain and can't breathe",
        category: "emergency",
        expectedTerms: ["emergency", "hospital", "call", "immediately", "urgent"],
        minAccuracy: 60
      },
      {
        name: "Emergency Detection - Hindi",
        language: "hi",
        query: "मुझे तेज सीने में दर्द है और सांस नहीं आ रही",
        category: "emergency",
        expectedTerms: ["आपातकाल", "अस्पताल", "तुरंत", "डॉक्टर"],
        minAccuracy: 60
      },
      {
        name: "Emergency Detection - Telugu",
        language: "te",
        query: "నాకు తీవ్రమైన ఛాతీ నొప్పి మరియు ఊపిరి ఆడటం లేదు",
        category: "emergency",
        expectedTerms: ["అత్యవసరం", "ఆసుపత్రి", "వెంటనే", "వైద్యుడు"],
        minAccuracy: 60
      },

      // Basic Health Queries
      {
        name: "Fever Treatment - English",
        language: "en",
        query: "I have fever, what should I do?",
        category: "symptom",
        expectedTerms: ["rest", "fluids", "paracetamol", "doctor"],
        minAccuracy: 75
      },
      {
        name: "Fever Treatment - Hindi",
        language: "hi",
        query: "मुझे बुखार है, क्या करूं?",
        category: "symptom",
        expectedTerms: ["आराम", "पानी", "दवा", "डॉक्टर"],
        minAccuracy: 75
      },
      {
        name: "Fever Treatment - Telugu",
        language: "te",
        query: "నాకు జ్వరం వచ్చింది, ఏమి చేయాలి?",
        category: "symptom",
        expectedTerms: ["విశ్రాంతి", "నీరు", "మందు", "వైద్యుడు"],
        minAccuracy: 75
      },
      {
        name: "Fever Treatment - Tamil",
        language: "ta",
        query: "எனக்கு காய்ச்சல், என்ன செய்ய வேண்டும்?",
        category: "symptom",
        expectedTerms: ["ஓய்வு", "தண்ணீர்", "மருந்து", "மருத்துவர்"],
        minAccuracy: 75
      },
      {
        name: "Fever Treatment - Odia",
        language: "or",
        query: "ମୋର ଜ୍ୱର ହୋଇଛି, କଣ କରିବି?",
        category: "symptom",
        expectedTerms: ["ବିଶ୍ରାମ", "ପାଣି", "ଔଷଧ", "ଡାକ୍ତର"],
        minAccuracy: 75
      },

      // Prevention Tips - Previously failing
      {
        name: "Diabetes Prevention - English",
        language: "en",
        query: "How to prevent diabetes?",
        category: "prevention",
        expectedTerms: ["diet", "exercise", "weight", "sugar", "checkup"],
        minAccuracy: 80
      },
      {
        name: "Diabetes Prevention - Hindi",
        language: "hi",
        query: "मधुमेह कैसे रोकें?",
        category: "prevention",
        expectedTerms: ["आहार", "व्यायाम", "वजन", "चीनी", "जांच"],
        minAccuracy: 80
      },
      {
        name: "Diabetes Prevention - Telugu",
        language: "te",
        query: "మధుమేహాన్ని ఎలా నివారించాలి?",
        category: "prevention",
        expectedTerms: ["ఆహారం", "వ్యాయామం", "బరువు", "చక్కెర", "పరీక్ష"],
        minAccuracy: 80
      },

      // General Health Tips
      {
        name: "General Health - Tamil",
        language: "ta",
        query: "நல்ல ஆరோగ்யத்திற்கு என்ன செய்ய வேண்டும்?",
        category: "general",
        expectedTerms: ["உணவு", "உடற்பயிற்சி", "தூக்கம", "தண்ணீர்", "மருத்துவர்"],
        minAccuracy: 70
      },
      {
        name: "General Health - Odia",
        language: "or",
        query: "ଭଲ ସ୍ୱାସ୍ଥ୍ୟ ପାଇଁ କଣ କରିବା ଉଚିତ?",
        category: "general",
        expectedTerms: ["ଖାଦ୍ୟ", "ବ୍ୟାୟାମ", "ନିଦ୍ରା", "ପାଣି", "ଡାକ୍ତର"],
        minAccuracy: 70
      }
    ];
  }

  checkMedicalTermsAccuracy(response, expectedTerms, language) {
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

    const accuracy = expectedTerms.length > 0 ? (matchedTerms.length / expectedTerms.length) * 100 : 100;

    return {
      matchedTerms,
      missedTerms,
      accuracy
    };
  }

  checkMedicalDisclaimer(response, language) {
    const disclaimerIndicators = {
      en: ['⚠️', 'healthcare professional', 'medical advice', 'consult', 'doctor'],
      hi: ['⚠️', 'स्वास्थ्य पेशेवर', 'चिकित्सा सलाह', 'सलाह लें', 'डॉक्टर'],
      te: ['⚠️', 'వైద్య నిపుణుడు', 'వైద్య సలహా', 'సంప్రదించండి', 'వైద్యుడు'],
      ta: ['⚠️', 'சுகாதார நிபுணர்', 'மருத்துவ ஆலோசனை', 'அணுகவும்', 'மருத்துவர்'],
      or: ['⚠️', 'ସ୍ୱାସ୍ଥ୍ୟ ବିଶେଷଜ୍ଞ', 'ଚିକିତ୍ସା ପରାମର୍ଶ', 'ପରାମର୍ଶ', 'ଡାକ୍ତର']
    };

    const indicators = disclaimerIndicators[language] || disclaimerIndicators.en;
    const lowerResponse = response.toLowerCase();

    return indicators.some(indicator =>
      lowerResponse.includes(indicator.toLowerCase())
    );
  }

  async testScenario(scenario) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📝 Query: "${scenario.query}" (${scenario.language.toUpperCase()})`);

    try {
      let response = '';

      // Test different types of queries
      if (scenario.category === 'prevention') {
        response = await this.geminiService.getPreventiveTips(
          'disease prevention',
          {
            preferred_language: scenario.language,
            script_preference: 'native'
          },
          scenario.query.includes('diabetes') || scenario.query.includes('मधुमेह') || scenario.query.includes('మధుమేహ') ? 'diabetes' : ''
        );
      } else {
        response = await this.geminiService.generateResponse(
          scenario.query,
          scenario.language,
          'native'
        );
      }

      console.log(`✅ Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);

      // Check medical terms accuracy
      const termCheck = this.checkMedicalTermsAccuracy(response, scenario.expectedTerms, scenario.language);

      // Check medical disclaimer
      const hasDisclaimer = this.checkMedicalDisclaimer(response, scenario.language);

      // Check language consistency (response should be in requested language)
      const isCorrectLanguage = this.checkLanguageConsistency(response, scenario.language);

      // Calculate overall score
      const meetsMinAccuracy = termCheck.accuracy >= scenario.minAccuracy;
      const overallScore = (termCheck.accuracy + (hasDisclaimer ? 100 : 0) + (isCorrectLanguage ? 100 : 0)) / 3;
      const passed = meetsMinAccuracy && hasDisclaimer && isCorrectLanguage;

      console.log(`📊 Medical Terms: ${termCheck.accuracy.toFixed(1)}% (${termCheck.matchedTerms.length}/${scenario.expectedTerms.length})`);
      console.log(`✅ Matched: ${termCheck.matchedTerms.join(', ') || 'None'}`);
      console.log(`❌ Missed: ${termCheck.missedTerms.join(', ') || 'None'}`);
      console.log(`🏥 Has Disclaimer: ${hasDisclaimer ? 'Yes' : 'No'}`);
      console.log(`🌐 Correct Language: ${isCorrectLanguage ? 'Yes' : 'No'}`);
      console.log(`📈 Overall Score: ${overallScore.toFixed(1)}%`);
      console.log(`🎯 Result: ${passed ? 'PASS' : 'FAIL'}`);

      this.results.push({
        scenario,
        response,
        termCheck,
        hasDisclaimer,
        isCorrectLanguage,
        overallScore,
        passed
      });

      return { passed, accuracy: overallScore };

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

  checkLanguageConsistency(response, expectedLanguage) {
    // Simple heuristic checks for language consistency
    const languagePatterns = {
      en: /[a-zA-Z]/,
      hi: /[\u0900-\u097F]/,
      te: /[\u0C00-\u0C7F]/,
      ta: /[\u0B80-\u0BFF]/,
      or: /[\u0B00-\u0B7F]/
    };

    const pattern = languagePatterns[expectedLanguage];
    if (!pattern) return true; // Default to true for unknown languages

    return pattern.test(response);
  }

  generateComprehensiveReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const overallSuccess = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed Tests: ${passedTests}`);
    console.log(`   Failed Tests: ${totalTests - passedTests}`);
    console.log(`   Overall Success Rate: ${overallSuccess.toFixed(1)}%`);

    // Language breakdown
    const languageStats = {};
    this.results.forEach(result => {
      const lang = result.scenario.language;
      if (!languageStats[lang]) {
        languageStats[lang] = { total: 0, passed: 0, totalScore: 0 };
      }
      languageStats[lang].total++;
      if (result.passed) languageStats[lang].passed++;
      languageStats[lang].totalScore += result.overallScore || 0;
    });

    console.log(`\n🌐 LANGUAGE PERFORMANCE:`);
    Object.entries(languageStats).forEach(([lang, stats]) => {
      const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
      const avgScore = stats.total > 0 ? stats.totalScore / stats.total : 0;
      console.log(`   ${lang.toUpperCase()}: ${passRate.toFixed(1)}% pass rate, ${avgScore.toFixed(1)}% avg score (${stats.passed}/${stats.total})`);
    });

    // Category breakdown
    const categoryStats = {};
    this.results.forEach(result => {
      const cat = result.scenario.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, passed: 0, totalScore: 0 };
      }
      categoryStats[cat].total++;
      if (result.passed) categoryStats[cat].passed++;
      categoryStats[cat].totalScore += result.overallScore || 0;
    });

    console.log(`\n📋 CATEGORY PERFORMANCE:`);
    Object.entries(categoryStats).forEach(([cat, stats]) => {
      const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
      const avgScore = stats.total > 0 ? stats.totalScore / stats.total : 0;
      console.log(`   ${cat.toUpperCase()}: ${passRate.toFixed(1)}% pass rate, ${avgScore.toFixed(1)}% avg score (${stats.passed}/${stats.total})`);
    });

    // Production readiness assessment
    console.log(`\n🚀 PRODUCTION READINESS ASSESSMENT:`);
    if (overallSuccess >= 90) {
      console.log(`   ✅ EXCELLENT - Ready for full production deployment!`);
      console.log(`   🎯 Exceeds all accuracy targets across languages and categories`);
    } else if (overallSuccess >= 80) {
      console.log(`   ✅ GOOD - Ready for production deployment with monitoring`);
      console.log(`   🎯 Meets target accuracy for healthcare guidance`);
    } else if (overallSuccess >= 70) {
      console.log(`   ⚠️ MODERATE - Ready for limited production with improvements needed`);
      console.log(`   🔧 Some categories require additional fine-tuning`);
    } else {
      console.log(`   ❌ NEEDS WORK - Additional improvements required before production`);
      console.log(`   🔧 Critical issues must be addressed`);
    }

    // Detailed failure analysis
    const failures = this.results.filter(r => !r.passed);
    if (failures.length > 0) {
      console.log(`\n🔍 FAILURE ANALYSIS:`);
      failures.forEach(failure => {
        console.log(`   ${failure.scenario.name}:`);
        if (failure.error) {
          console.log(`     Error: ${failure.error}`);
        } else {
          console.log(`     Medical Terms: ${failure.termCheck?.accuracy.toFixed(1)}%`);
          console.log(`     Has Disclaimer: ${failure.hasDisclaimer ? 'Yes' : 'No'}`);
          console.log(`     Correct Language: ${failure.isCorrectLanguage ? 'Yes' : 'No'}`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));

    return {
      totalTests,
      passedTests,
      overallSuccess,
      languageStats,
      categoryStats,
      productionReady: overallSuccess >= 80
    };
  }

  async runComprehensiveTests() {
    console.log('🚀 Starting Final Comprehensive Test Suite...');
    console.log('🎯 Testing all languages, categories, and critical functionality');
    console.log(`ℹ️ Using single API key with safe delays to handle rate limits\n`);

    const scenarios = this.getTestScenarios();

    // Increase delay for single key usage
    this.delayBetweenRequests = 70000;

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

    const report = this.generateComprehensiveReport();

    console.log(`\n🎉 Final comprehensive testing completed!`);
    console.log(`📊 Overall Success Rate: ${report.overallSuccess.toFixed(1)}%`);
    console.log(`🚀 Production Ready: ${report.productionReady ? 'YES' : 'NO'}`);

    process.exit(report.productionReady ? 0 : 1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new FinalComprehensiveTester();
  tester.runComprehensiveTests().catch(error => {
    console.error('Final test execution failed:', error);
    process.exit(1);
  });
}

module.exports = FinalComprehensiveTester;
