const GeminiService = require('../src/services/geminiService');
const { LanguageUtils } = require('../src/utils/languageUtils');

class MultilingualAccuracyTester {
  constructor() {
    this.geminiService = new GeminiService();
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      languages: {},
      categories: {},
      languageCategories: {}
    };
  }

  // Comprehensive test scenarios for all 5 languages
  getMultilingualTestScenarios() {
    return {
      basicHealthQueries: [
        // English
        { query: "What should I do for a fever?", language: "en", expectedCriteria: ["rest", "fluids", "paracetamol", "doctor", "temperature"], category: "basic_health" },
        { query: "How to prevent diabetes?", language: "en", expectedCriteria: ["diet", "exercise", "weight", "sugar", "regular checkup"], category: "prevention" },
        // Hindi
        { query: "मुझे सिरदर्द है, क्या करूं?", language: "hi", expectedCriteria: ["आराम", "पानी", "दवा", "डॉक्टर"], category: "basic_health" },
        { query: "मधुमेह से कैसे बचें?", language: "hi", expectedCriteria: ["आहार", "व्यायाम", "वजन", "चीनी", "जांच"], category: "prevention" },
        // Telugu
        { query: "నాకు జ్వరం వచ్చింది, ఏం చేయాలి?", language: "te", expectedCriteria: ["విశ్రాంతి", "నీరు", "మందు", "వైద్యుడు"], category: "basic_health" },
        { query: "మధుమేహాన్ని ఎలా నివారించాలి?", language: "te", expectedCriteria: ["ఆహారం", "వ్యాయామం", "బరువు", "చక్కెర", "పరీక్ష"], category: "prevention" },
        // Tamil
        { query: "எனக்கு காய்ச்சல் வந்துள்ளது, என்ன செய்வது?", language: "ta", expectedCriteria: ["ஓய்வு", "தண்ணீர்", "மருந்து", "மருத்துவர்"], category: "basic_health" },
        { query: "நீரிழிவை எப்படி தடுப்பது?", language: "ta", expectedCriteria: ["உணவு", "உடற்பயிற்சி", "எடை", "சர்க்கரை", "பரிசோதனை"], category: "prevention" },
        // Odia
        { query: "ମୋର ଜ୍ୱର ହୋଇଛି, କଣ କରିବି?", language: "or", expectedCriteria: ["ବିଶ୍ରାମ", "ପାଣି", "ଔଷଧ", "ଡାକ୍ତର"], category: "basic_health" },
        { query: "ମଧୁମେହକୁ କିପରି ରୋକିବେ?", language: "or", expectedCriteria: ["ଖାଦ୍ୟ", "ବ୍ୟାୟାମ", "ଓଜନ", "ଚିନି", "ପରୀକ୍ଷା"], category: "prevention" }
      ],
      symptomAnalysis: [
        // English
        { symptoms: "I have chest pain and difficulty breathing", language: "en", expectedCriteria: ["emergency", "immediate", "hospital", "urgent", "call"], category: "emergency_symptoms", urgencyLevel: "high" },
        { symptoms: "I have mild headache and runny nose", language: "en", expectedCriteria: ["rest", "fluids", "monitor", "common cold"], category: "mild_symptoms", urgencyLevel: "low" },
        // Hindi
        { symptoms: "मुझे सीने में दर्द और सांस लेने में तकलीफ है", language: "hi", expectedCriteria: ["आपातकाल", "तुरंत", "अस्पताल", "गंभीर", "कॉल"], category: "emergency_symptoms", urgencyLevel: "high" },
        { symptoms: "मुझे बुखार और खांसी है", language: "hi", expectedCriteria: ["बुखार", "खांसी", "आराम", "डॉक्टर"], category: "common_symptoms" },
        // Telugu
        { symptoms: "నాకు ఛాతీ నొప్పి మరియు ఊపిరి తీసుకోవడంలో ఇబ్బంది ఉంది", language: "te", expectedCriteria: ["అత్యవసరం", "వెంటనే", "ఆసుపత్రి", "తీవ్రమైన", "కాల్"], category: "emergency_symptoms", urgencyLevel: "high" },
        { symptoms: "నాకు తలనొప్పి మరియు జలుబు ఉంది", language: "te", expectedCriteria: ["తలనొప్పి", "జలుబు", "విశ్రాంతి", "వైద్యుడు"], category: "mild_symptoms" },
        // Tamil
        { symptoms: "எனக்கு மார்பு வலி மற்றும் மூச்சு விடுவதில் சிரமம் உள்ளது", language: "ta", expectedCriteria: ["அவசரம்", "உடனடியாக", "மருத்துவமனை", "கடுமையான", "அழைப்பு"], category: "emergency_symptoms", urgencyLevel: "high" },
        { symptoms: "எனக்கு தலைவலி மற்றும் சளி உள்ளது", language: "ta", expectedCriteria: ["தலைவலி", "சளி", "ஓய்வு", "மருத்துவர்"], category: "mild_symptoms" },
        // Odia
        { symptoms: "ମୋର ଛାତି ଯନ୍ତ୍ରଣା ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି", language: "or", expectedCriteria: ["ଜରୁରୀ", "ତୁରନ୍ତ", "ଡାକ୍ତରଖାନା", "ଗମ୍ଭୀର", "କଲ୍"], category: "emergency_symptoms", urgencyLevel: "high" },
        { symptoms: "ମୋର ମୁଣ୍ଡ ବ୍ୟଥା ଏବଂ ଥଣ୍ଡା ଲାଗିଛି", language: "or", expectedCriteria: ["ମୁଣ୍ଡ ବ୍ୟଥା", "ଥଣ୍ଡା", "ବିଶ୍ରାମ", "ଡାକ୍ତର"], category: "mild_symptoms" }
      ],
      emergencyDetection: [
        // English
        { message: "I can't breathe, help me!", language: "en", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "I have severe chest pain", language: "en", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "I have a mild headache", language: "en", shouldDetectEmergency: false, category: "non_emergency" },
        // Hindi
        { message: "आपातकाल! मुझे तुरंत मदद चाहिए", language: "hi", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "मुझे गंभीर सीने में दर्द है", language: "hi", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "मुझे हल्का सिरदर्द है", language: "hi", shouldDetectEmergency: false, category: "non_emergency" },
        // Telugu
        { message: "అత్యవసర పరిస్థితి! నాకు వెంటనే సహాయం కావాలి", language: "te", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "నాకు తీవ్రమైన ఛాతీ నొప్పి ఉంది", language: "te", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "నాకు తేలికపాటి తలనొప్పి ఉంది", language: "te", shouldDetectEmergency: false, category: "non_emergency" },
        // Tamil
        { message: "அவசரநிலை! எனக்கு உடனடி உதவி வேண்டும்", language: "ta", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "எனக்கு கடுமையான மார்பு வலி உள்ளது", language: "ta", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "எனக்கு லேசான தலைவலி உள்ளது", language: "ta", shouldDetectEmergency: false, category: "non_emergency" },
        // Odia
        { message: "ଜରୁରୀ ଅବସ୍ଥା! ମୋତେ ତୁରନ୍ତ ସାହାଯ୍ୟ ଦରକାର", language: "or", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "ମୋର ତୀବ୍ର ଛାତି ଯନ୍ତ୍ରଣା ଅଛି", language: "or", shouldDetectEmergency: true, category: "emergency_detection" },
        { message: "ମୋର ହାଲୁକା ମୁଣ୍ଡ ବ୍ୟଥା ଅଛି", language: "or", shouldDetectEmergency: false, category: "non_emergency" }
      ],
      preventiveTips: [
        // English
        { category: "nutrition and hygiene", language: "en", expectedCriteria: ["nutrition", "diet", "hygiene", "wash hands", "vegetables"], testCategory: "preventive_tips" },
        { category: "exercise and lifestyle", language: "en", expectedCriteria: ["exercise", "physical activity", "lifestyle", "cardio", "strength"], testCategory: "preventive_tips" },
        // Hindi
        { category: "nutrition and hygiene", language: "hi", expectedCriteria: ["पोषण", "आहार", "स्वच्छता", "हाथ धोना", "सब्जियां"], testCategory: "preventive_tips" },
        { category: "exercise and lifestyle", language: "hi", expectedCriteria: ["व्यायाम", "शारीरिक गतिविधि", "जीवनशैली", "कार्डियो", "शक्ति"], testCategory: "preventive_tips" },
        // Telugu
        { category: "nutrition and hygiene", language: "te", expectedCriteria: ["పోషణ", "ఆహారం", "పరిశుభ్రత", "చేతులు కడుక్కోవడం", "కూరగాయలు"], testCategory: "preventive_tips" },
        { category: "exercise and lifestyle", language: "te", expectedCriteria: ["వ్యాయామం", "శారీరక కార్యకలాపాలు", "జీవనశైలి", "కార్డియో", "బలం"], testCategory: "preventive_tips" },
        // Tamil
        { category: "nutrition and hygiene", language: "ta", expectedCriteria: ["ஊட்டச்சத்து", "உணவு", "சுகாதாரம", "கை கழுவுதல்", "காய்கறிகள்"], testCategory: "preventive_tips" },
        { category: "exercise and lifestyle", language: "ta", expectedCriteria: ["உடற்பயிற்சி", "உடல் செயல்பாடு", "வாழ்க்கை முறை", "கார்டியோ", "வலிமை"], testCategory: "preventive_tips" },
        // Odia
        { category: "nutrition and hygiene", language: "or", expectedCriteria: ["ପୋଷଣ", "ଖାଦ୍ୟ", "ପରିଷ୍କାରତା", "ହାତ ଧୋଇବା", "ପନିପରିବା"], testCategory: "preventive_tips" },
        { category: "exercise and lifestyle", language: "or", expectedCriteria: ["ବ୍ୟାୟାମ", "ଶାରୀରିକ କାର୍ଯ୍ୟକଳାପ", "ଜୀବନଶୈଳୀ", "କାର୍ଡିଓ", "ଶକ୍ତି"], testCategory: "preventive_tips" }
      ]
    };
  }

  // Evaluate response quality with language-specific criteria
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
      hasDisclaimer: this.checkDisclaimer(lowerResponse, testInfo.language)
    };
  }

  // Check for medical disclaimer in multiple languages
  checkDisclaimer(lowerResponse, language) {
    const disclaimerKeywords = {
      en: ['consult', 'doctor', 'healthcare professional', 'medical professional'],
      hi: ['डॉक्टर', 'चिकित्सक', 'स्वास्थ्य पेशेवर', 'सलाह'],
      te: ['వైద్యుడు', 'వైద్య నిపుణుడు', 'ఆరోగ్య నిపుణుడు', 'సలహా'],
      ta: ['மருத்துவர்', 'மருத்துவ நிபுணர்', 'சுகாதார நிபுணர்', 'ஆலோசனை'],
      or: ['ଡାକ୍ତର', 'ଚିକିତ୍ସକ', 'ସ୍ୱାସ୍ଥ୍ୟ ବିଶେଷଜ୍ଞ', 'ପରାମର୍ଶ']
    };

    const keywords = disclaimerKeywords[language] || disclaimerKeywords.en;
    return keywords.some(keyword => lowerResponse.includes(keyword.toLowerCase()));
  }

  // Test all categories across all languages
  async testBasicHealthQueries() {
    console.log('\n🔍 Testing Basic Health Queries Across All Languages...');
    const scenarios = this.getMultilingualTestScenarios().basicHealthQueries;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n📝 Query: "${scenario.query}" (${scenario.language.toUpperCase()})`);
        
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

        this.recordTestResult(scenario.category, scenario.language, evaluation.passed, evaluation.accuracy);

      } catch (error) {
        console.log(`❌ Error testing query: ${error.message}`);
        this.recordTestResult(scenario.category, scenario.language, false, 0);
      }
    }
  }

  async testSymptomAnalysis() {
    console.log('\n🩺 Testing Symptom Analysis Across All Languages...');
    const scenarios = this.getMultilingualTestScenarios().symptomAnalysis;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n🔍 Symptoms: "${scenario.symptoms}" (${scenario.language.toUpperCase()})`);
        
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
        console.log(`🚨 Urgency Detection: ${scenario.urgencyLevel || 'N/A'}`);
        console.log(`🏥 Has Medical Disclaimer: ${evaluation.hasDisclaimer ? 'Yes' : 'No'}`);

        this.recordTestResult(scenario.category, scenario.language, evaluation.passed, evaluation.accuracy);

      } catch (error) {
        console.log(`❌ Error testing symptoms: ${error.message}`);
        this.recordTestResult(scenario.category, scenario.language, false, 0);
      }
    }
  }

  async testEmergencyDetection() {
    console.log('\n🚨 Testing Emergency Detection Across All Languages...');
    const scenarios = this.getMultilingualTestScenarios().emergencyDetection;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n⚠️ Message: "${scenario.message}" (${scenario.language.toUpperCase()})`);
        
        const isEmergency = LanguageUtils.detectEmergency(scenario.message, scenario.language);
        const correct = isEmergency === scenario.shouldDetectEmergency;
        
        console.log(`🎯 Expected Emergency: ${scenario.shouldDetectEmergency}`);
        console.log(`🤖 Detected Emergency: ${isEmergency}`);
        console.log(`✅ Correct Detection: ${correct ? 'Yes' : 'No'}`);

        this.recordTestResult(scenario.category, scenario.language, correct, correct ? 100 : 0);

      } catch (error) {
        console.log(`❌ Error testing emergency detection: ${error.message}`);
        this.recordTestResult(scenario.category, scenario.language, false, 0);
      }
    }
  }

  async testPreventiveTips() {
    console.log('\n🌱 Testing Preventive Tips Across All Languages...');
    const scenarios = this.getMultilingualTestScenarios().preventiveTips;
    
    for (const scenario of scenarios) {
      try {
        console.log(`\n📚 Category: "${scenario.category}" (${scenario.language.toUpperCase()})`);
        
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

        this.recordTestResult(scenario.testCategory, scenario.language, evaluation.passed, evaluation.accuracy);

      } catch (error) {
        console.log(`❌ Error testing preventive tips: ${error.message}`);
        this.recordTestResult(scenario.testCategory, scenario.language, false, 0);
      }
    }
  }

  // Record test results with language and category tracking
  recordTestResult(category, language, passed, accuracy) {
    this.testResults.totalTests++;
    if (passed) {
      this.testResults.passedTests++;
    } else {
      this.testResults.failedTests++;
    }

    // Track by language
    if (!this.testResults.languages[language]) {
      this.testResults.languages[language] = { total: 0, passed: 0, totalAccuracy: 0 };
    }
    this.testResults.languages[language].total++;
    if (passed) this.testResults.languages[language].passed++;
    this.testResults.languages[language].totalAccuracy += accuracy;

    // Track by category
    if (!this.testResults.categories[category]) {
      this.testResults.categories[category] = { total: 0, passed: 0, totalAccuracy: 0 };
    }
    this.testResults.categories[category].total++;
    if (passed) this.testResults.categories[category].passed++;
    this.testResults.categories[category].totalAccuracy += accuracy;

    // Track by language-category combination
    const langCatKey = `${language}_${category}`;
    if (!this.testResults.languageCategories[langCatKey]) {
      this.testResults.languageCategories[langCatKey] = { total: 0, passed: 0, totalAccuracy: 0 };
    }
    this.testResults.languageCategories[langCatKey].total++;
    if (passed) this.testResults.languageCategories[langCatKey].passed++;
    this.testResults.languageCategories[langCatKey].totalAccuracy += accuracy;
  }

  // Generate comprehensive multilingual accuracy report
  generateMultilingualReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE MULTILINGUAL ACCURACY REPORT');
    console.log('='.repeat(80));

    const overallAccuracy = this.testResults.totalTests > 0 
      ? Math.round((this.testResults.passedTests / this.testResults.totalTests) * 100)
      : 0;

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(`   Passed Tests: ${this.testResults.passedTests}`);
    console.log(`   Failed Tests: ${this.testResults.failedTests}`);
    console.log(`   Overall Pass Rate: ${overallAccuracy}%`);

    // Language-wise breakdown
    console.log(`\n🌐 LANGUAGE-WISE PERFORMANCE:`);
    const languageNames = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', or: 'Odia' };

    Object.entries(this.testResults.languages).forEach(([lang, stats]) => {
      const langAccuracy = stats.total > 0 ? Math.round(stats.totalAccuracy / stats.total) : 0;
      const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

      console.log(`   ${languageNames[lang] || lang.toUpperCase()}:`);
      console.log(`     Pass Rate: ${passRate}% (${stats.passed}/${stats.total})`);
      console.log(`     Avg Accuracy: ${langAccuracy}%`);
    });

    // Category-wise breakdown
    console.log(`\n📋 CATEGORY-WISE PERFORMANCE:`);
    Object.entries(this.testResults.categories).forEach(([category, stats]) => {
      const categoryAccuracy = stats.total > 0 ? Math.round(stats.totalAccuracy / stats.total) : 0;
      const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

      console.log(`   ${category.toUpperCase().replace(/_/g, ' ')}:`);
      console.log(`     Pass Rate: ${passRate}% (${stats.passed}/${stats.total})`);
      console.log(`     Avg Accuracy: ${categoryAccuracy}%`);
    });

    console.log(`\n🎯 TARGET COMPARISON:`);
    console.log(`   Project Target: 90% accuracy across all languages and categories`);
    console.log(`   Current Performance: ${overallAccuracy}%`);
    console.log(`   Status: ${overallAccuracy >= 90 ? '✅ TARGET MET' : '⚠️ NEEDS IMPROVEMENT'}`);

    console.log('\n' + '='.repeat(80));
    return overallAccuracy;
  }

  // Run all multilingual tests
  async runAllMultilingualTests() {
    console.log('🧪 Starting Comprehensive Multilingual Accuracy Testing...\n');
    
    try {
      await this.testBasicHealthQueries();
      await this.testSymptomAnalysis();
      await this.testEmergencyDetection();
      await this.testPreventiveTips();
      
      const finalAccuracy = this.generateMultilingualReport();
      return finalAccuracy;
      
    } catch (error) {
      console.error('❌ Error during multilingual accuracy testing:', error);
      return 0;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MultilingualAccuracyTester();
  tester.runAllMultilingualTests().then(accuracy => {
    console.log(`\n🎉 Multilingual testing completed with ${accuracy}% overall accuracy`);
    process.exit(accuracy >= 90 ? 0 : 1);
  }).catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
}

module.exports = MultilingualAccuracyTester;
