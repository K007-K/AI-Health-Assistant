const GeminiService = require('../src/services/geminiService');
const { LanguageUtils } = require('../src/utils/languageUtils');

class AccuracyTester {
  constructor() {
    this.geminiService = new GeminiService();
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      categories: {}
    };
  }

  // Test scenarios with expected criteria
  getTestScenarios() {
    return {
      basicHealthQueries: [
        {
          query: "What should I do for a fever?",
          language: "en",
          expectedCriteria: ["rest", "fluids", "paracetamol", "doctor", "temperature"],
          category: "basic_health"
        },
        {
          query: "How to prevent diabetes?",
          language: "en", 
          expectedCriteria: ["diet", "exercise", "weight", "sugar", "regular checkup"],
          category: "prevention"
        },
        {
          query: "मुझे सिरदर्द है, क्या करूं?",
          language: "hi",
          expectedCriteria: ["आराम", "पानी", "दवा", "डॉक्टर"],
          category: "basic_health"
        }
      ],
      symptomAnalysis: [
        {
          symptoms: "I have chest pain and difficulty breathing",
          language: "en",
          expectedCriteria: ["emergency", "immediate", "hospital", "urgent", "call"],
          category: "emergency_symptoms",
          urgencyLevel: "high"
        },
        {
          symptoms: "I have mild headache and runny nose",
          language: "en",
          expectedCriteria: ["rest", "fluids", "monitor", "common cold"],
          category: "mild_symptoms",
          urgencyLevel: "low"
        },
        {
          symptoms: "मुझे बुखार और खांसी है",
          language: "hi",
          expectedCriteria: ["बुखार", "खांसी", "आराम", "डॉक्टर"],
          category: "common_symptoms"
        }
      ],
      emergencyDetection: [
        {
          message: "I can't breathe, help me!",
          language: "en",
          shouldDetectEmergency: true,
          category: "emergency_detection"
        },
        {
          message: "I have severe chest pain",
          language: "en", 
          shouldDetectEmergency: true,
          category: "emergency_detection"
        },
        {
          message: "आपातकाल! मुझे तुरंत मदद चाहिए",
          language: "hi",
          shouldDetectEmergency: true,
          category: "emergency_detection"
        },
        {
          message: "I have a mild headache",
          language: "en",
          shouldDetectEmergency: false,
          category: "non_emergency"
        }
      ],
      preventiveTips: [
        {
          category: "nutrition and hygiene",
          language: "en",
          expectedCriteria: ["nutrition", "diet", "hygiene", "wash hands", "vegetables"],
          testCategory: "preventive_tips"
        },
        {
          category: "exercise and lifestyle", 
          language: "en",
          expectedCriteria: ["exercise", "physical activity", "lifestyle", "cardio", "strength"],
          testCategory: "preventive_tips"
        }
      ]
    };
  }

  // Evaluate response quality
  evaluateResponse(response, expectedCriteria, testInfo) {
    const lowerResponse = response.toLowerCase();
    let matchedCriteria = 0;
    let totalCriteria = expectedCriteria.length;
    
    const matchedTerms = [];
    const missedTerms = [];

    expectedCriteria.forEach(criteria => {
      if (lowerResponse.includes(criteria.toLowerCase())) {
        matchedCriteria++;
        matchedTerms.push(criteria);
      } else {
        missedTerms.push(criteria);
      }
    });

    const accuracy = (matchedCriteria / totalCriteria) * 100;
    const passed = accuracy >= 60; // 60% threshold for passing

    return {
      passed,
      accuracy: Math.round(accuracy),
      matchedCriteria,
      totalCriteria,
      matchedTerms,
      missedTerms,
      responseLength: response.length,
      hasDisclaimer: lowerResponse.includes('consult') || lowerResponse.includes('doctor') || lowerResponse.includes('healthcare professional')
    };
  }

  // Test basic health queries
  async testBasicHealthQueries() {
    console.log('\n🔍 Testing Basic Health Queries...');
    const scenarios = this.getTestScenarios().basicHealthQueries;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n📝 Query: "${scenario.query}" (${scenario.language})`);
        
        const response = await this.geminiService.generateResponse(
          scenario.query,
          scenario.language,
          'native',
          [],
          'normal'
        );

        const evaluation = this.evaluateResponse(response, scenario.expectedCriteria, scenario);
        
        console.log(`✅ Response: ${response.substring(0, 100)}...`);
        console.log(`📊 Accuracy: ${evaluation.accuracy}% (${evaluation.matchedCriteria}/${evaluation.totalCriteria} criteria met)`);
        console.log(`✅ Matched: ${evaluation.matchedTerms.join(', ')}`);
        if (evaluation.missedTerms.length > 0) {
          console.log(`❌ Missed: ${evaluation.missedTerms.join(', ')}`);
        }
        console.log(`🏥 Has Medical Disclaimer: ${evaluation.hasDisclaimer ? 'Yes' : 'No'}`);

        this.recordTestResult(scenario.category, evaluation.passed, evaluation.accuracy);

      } catch (error) {
        console.log(`❌ Error testing query: ${error.message}`);
        this.recordTestResult(scenario.category, false, 0);
      }
    }
  }

  // Test symptom analysis accuracy
  async testSymptomAnalysis() {
    console.log('\n🩺 Testing Symptom Analysis...');
    const scenarios = this.getTestScenarios().symptomAnalysis;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n🔍 Symptoms: "${scenario.symptoms}" (${scenario.language})`);
        
        const userProfile = {
          preferred_language: scenario.language,
          script_preference: 'native'
        };

        const analysis = await this.geminiService.analyzeSymptoms(
          scenario.symptoms,
          userProfile
        );

        const evaluation = this.evaluateResponse(analysis, scenario.expectedCriteria, scenario);
        
        console.log(`✅ Analysis: ${analysis.substring(0, 150)}...`);
        console.log(`📊 Accuracy: ${evaluation.accuracy}% (${evaluation.matchedCriteria}/${evaluation.totalCriteria} criteria met)`);
        console.log(`🚨 Urgency Detection: ${scenario.urgencyLevel}`);
        console.log(`🏥 Has Medical Disclaimer: ${evaluation.hasDisclaimer ? 'Yes' : 'No'}`);

        this.recordTestResult(scenario.category, evaluation.passed, evaluation.accuracy);

      } catch (error) {
        console.log(`❌ Error testing symptoms: ${error.message}`);
        this.recordTestResult(scenario.category, false, 0);
      }
    }
  }

  // Test emergency detection
  async testEmergencyDetection() {
    console.log('\n🚨 Testing Emergency Detection...');
    const scenarios = this.getTestScenarios().emergencyDetection;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n⚠️ Message: "${scenario.message}" (${scenario.language})`);
        
        const isEmergency = LanguageUtils.detectEmergency(scenario.message, scenario.language);
        const correct = isEmergency === scenario.shouldDetectEmergency;
        
        console.log(`🎯 Expected Emergency: ${scenario.shouldDetectEmergency}`);
        console.log(`🤖 Detected Emergency: ${isEmergency}`);
        console.log(`✅ Correct Detection: ${correct ? 'Yes' : 'No'}`);

        this.recordTestResult(scenario.category, correct, correct ? 100 : 0);

      } catch (error) {
        console.log(`❌ Error testing emergency detection: ${error.message}`);
        this.recordTestResult(scenario.category, false, 0);
      }
    }
  }

  // Test preventive tips
  async testPreventiveTips() {
    console.log('\n🌱 Testing Preventive Tips...');
    const scenarios = this.getTestScenarios().preventiveTips;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n📚 Category: "${scenario.category}" (${scenario.language})`);
        
        const userProfile = {
          preferred_language: scenario.language,
          script_preference: 'native'
        };

        const tips = await this.geminiService.getPreventiveTips(
          scenario.category,
          userProfile
        );

        const evaluation = this.evaluateResponse(tips, scenario.expectedCriteria, scenario);
        
        console.log(`✅ Tips: ${tips.substring(0, 150)}...`);
        console.log(`📊 Accuracy: ${evaluation.accuracy}% (${evaluation.matchedCriteria}/${evaluation.totalCriteria} criteria met)`);
        console.log(`✅ Matched: ${evaluation.matchedTerms.join(', ')}`);

        this.recordTestResult(scenario.testCategory, evaluation.passed, evaluation.accuracy);

      } catch (error) {
        console.log(`❌ Error testing preventive tips: ${error.message}`);
        this.recordTestResult(scenario.testCategory, false, 0);
      }
    }
  }

  // Record test results
  recordTestResult(category, passed, accuracy) {
    this.testResults.totalTests++;
    if (passed) {
      this.testResults.passedTests++;
    } else {
      this.testResults.failedTests++;
    }

    if (!this.testResults.categories[category]) {
      this.testResults.categories[category] = {
        total: 0,
        passed: 0,
        totalAccuracy: 0
      };
    }

    this.testResults.categories[category].total++;
    if (passed) {
      this.testResults.categories[category].passed++;
    }
    this.testResults.categories[category].totalAccuracy += accuracy;
  }

  // Generate final accuracy report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 WHATSAPP HEALTHCARE BOT - ACCURACY REPORT');
    console.log('='.repeat(60));

    const overallAccuracy = this.testResults.totalTests > 0 
      ? Math.round((this.testResults.passedTests / this.testResults.totalTests) * 100)
      : 0;

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(`   Passed Tests: ${this.testResults.passedTests}`);
    console.log(`   Failed Tests: ${this.testResults.failedTests}`);
    console.log(`   Overall Pass Rate: ${overallAccuracy}%`);

    console.log(`\n📋 CATEGORY BREAKDOWN:`);
    Object.entries(this.testResults.categories).forEach(([category, stats]) => {
      const categoryAccuracy = stats.total > 0 
        ? Math.round(stats.totalAccuracy / stats.total)
        : 0;
      const passRate = stats.total > 0 
        ? Math.round((stats.passed / stats.total) * 100)
        : 0;

      console.log(`   ${category.toUpperCase()}:`);
      console.log(`     Pass Rate: ${passRate}% (${stats.passed}/${stats.total})`);
      console.log(`     Avg Accuracy: ${categoryAccuracy}%`);
    });

    console.log(`\n🎯 TARGET COMPARISON:`);
    console.log(`   Project Target: 80% accuracy`);
    console.log(`   Current Performance: ${overallAccuracy}%`);
    console.log(`   Status: ${overallAccuracy >= 80 ? '✅ TARGET MET' : '⚠️ NEEDS IMPROVEMENT'}`);

    console.log(`\n💡 RECOMMENDATIONS:`);
    if (overallAccuracy >= 80) {
      console.log(`   ✅ Excellent performance! Bot meets accuracy targets.`);
      console.log(`   ✅ Ready for production deployment.`);
    } else if (overallAccuracy >= 60) {
      console.log(`   ⚠️ Good performance but room for improvement.`);
      console.log(`   📝 Consider fine-tuning AI prompts for better accuracy.`);
    } else {
      console.log(`   ❌ Performance below expectations.`);
      console.log(`   🔧 Review AI prompts and add more training data.`);
    }

    console.log('\n' + '='.repeat(60));
    return overallAccuracy;
  }

  // Run all accuracy tests
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Accuracy Testing...\n');
    
    try {
      await this.testBasicHealthQueries();
      await this.testSymptomAnalysis();
      await this.testEmergencyDetection();
      await this.testPreventiveTips();
      
      const finalAccuracy = this.generateReport();
      return finalAccuracy;
      
    } catch (error) {
      console.error('❌ Error during accuracy testing:', error);
      return 0;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AccuracyTester();
  tester.runAllTests().then(accuracy => {
    console.log(`\n🎉 Testing completed with ${accuracy}% overall accuracy`);
    process.exit(accuracy >= 60 ? 0 : 1);
  }).catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
}

module.exports = AccuracyTester;
