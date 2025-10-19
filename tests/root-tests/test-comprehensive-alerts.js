#!/usr/bin/env node

/**
 * Test Comprehensive Disease Alerts (State + Nationwide)
 * Verify that alerts show both user's state data and nationwide statistics
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseAlertService = require('./src/services/diseaseAlertService');

class ComprehensiveAlertTest {
  constructor() {
    this.alertService = new DiseaseAlertService();
    this.sentMessages = [];
    
    // Mock WhatsApp service to capture messages
    this.alertService.whatsappService = {
      sendMessage: async (phone, message) => {
        this.sentMessages.push({ phone, message, timestamp: new Date() });
        console.log(`📱 ALERT SENT TO: ${phone}`);
        console.log(`📄 MESSAGE LENGTH: ${message.length} characters`);
        console.log(`📝 MESSAGE PREVIEW: ${message.substring(0, 200)}...`);
        return { success: true, messageId: `mock_${Date.now()}` };
      }
    };
  }

  async testComprehensiveAlertStructure() {
    console.log('🧪 Testing Comprehensive Alert Structure\n');
    
    try {
      // Create test user with state preference
      const testUser = {
        id: 'test-user-001',
        user_id: 'test-user-001',
        phone_number: '+1234567890',
        state: 'Andhra Pradesh'
      };
      
      // Register user for alerts first
      await this.alertService.registerUserForAlerts(
        testUser.phone_number,
        testUser.user_id,
        { state: 'Andhra Pradesh', district: 'Visakhapatnam', pincode: '530001' }
      );
      
      // Create test disease case
      const testDiseaseCase = {
        disease: {
          id: 1,
          disease_name: 'Dengue Fever',
          risk_level: 'high',
          symptoms: ['High fever', 'Severe headache', 'Muscle pain', 'Nausea'],
          safety_measures: ['Use mosquito nets', 'Eliminate stagnant water', 'Wear protective clothing'],
          prevention_methods: ['Clean surroundings', 'Use repellents', 'Seek medical help early']
        },
        state: 'Andhra Pradesh',
        district: 'Visakhapatnam',
        active_cases: 45,
        cases_today: 8,
        week_trend: 'increasing'
      };
      
      console.log('1. Sending comprehensive alert...');
      this.sentMessages = [];
      
      await this.alertService.sendDiseaseAlert(testUser, testDiseaseCase);
      
      if (this.sentMessages.length === 0) {
        console.log('   ❌ No alert message sent');
        return false;
      }
      
      const alertMessage = this.sentMessages[0].message;
      
      console.log('\n2. Analyzing alert structure...');
      
      // Check for required sections
      const hasStateSection = alertMessage.includes('IN YOUR STATE') && alertMessage.includes('ANDHRA PRADESH');
      const hasNationwideSection = alertMessage.includes('NATIONWIDE STATUS') && alertMessage.includes('🇮🇳');
      const hasSymptoms = alertMessage.includes('Key Symptoms');
      const hasSafetyMeasures = alertMessage.includes('Safety Measures');
      const hasPrevention = alertMessage.includes('Prevention');
      const hasRiskLevel = alertMessage.includes('Risk Level');
      
      console.log(`   ✅ State-specific section: ${hasStateSection ? 'YES' : 'NO'}`);
      console.log(`   ✅ Nationwide section: ${hasNationwideSection ? 'YES' : 'NO'}`);
      console.log(`   ✅ Symptoms included: ${hasSymptoms ? 'YES' : 'NO'}`);
      console.log(`   ✅ Safety measures: ${hasSafetyMeasures ? 'YES' : 'NO'}`);
      console.log(`   ✅ Prevention methods: ${hasPrevention ? 'YES' : 'NO'}`);
      console.log(`   ✅ Risk level: ${hasRiskLevel ? 'YES' : 'NO'}`);
      
      // Check for specific data points
      const hasActiveCases = alertMessage.includes('Active Cases:');
      const hasTodayCases = alertMessage.includes('Today\'s Cases:');
      const hasTrend = alertMessage.includes('Trend:');
      const hasAffectedDistricts = alertMessage.includes('Affected Districts:');
      const hasTotalCases = alertMessage.includes('Total Cases:');
      const hasAffectedStates = alertMessage.includes('Affected States:');
      
      console.log(`   ✅ Active cases data: ${hasActiveCases ? 'YES' : 'NO'}`);
      console.log(`   ✅ Today's cases: ${hasTodayCases ? 'YES' : 'NO'}`);
      console.log(`   ✅ Trend information: ${hasTrend ? 'YES' : 'NO'}`);
      console.log(`   ✅ District data: ${hasAffectedDistricts ? 'YES' : 'NO'}`);
      console.log(`   ✅ National total: ${hasTotalCases ? 'YES' : 'NO'}`);
      console.log(`   ✅ Affected states: ${hasAffectedStates ? 'YES' : 'NO'}`);
      
      const allSectionsPresent = hasStateSection && hasNationwideSection && hasSymptoms && 
                                hasSafetyMeasures && hasPrevention && hasRiskLevel;
      
      const allDataPresent = hasActiveCases && hasTodayCases && hasTrend && 
                            hasAffectedDistricts && hasTotalCases && hasAffectedStates;
      
      console.log(`\n3. Overall structure: ${allSectionsPresent && allDataPresent ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
      
      return allSectionsPresent && allDataPresent;
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      return false;
    }
  }

  async testAlertDataProcessing() {
    console.log('\n🧪 Testing Alert Data Processing\n');
    
    try {
      const testUser = {
        phone_number: '+1234567891',
        state: 'Maharashtra'
      };
      
      const testDisease = {
        id: 2,
        disease_name: 'Chikungunya',
        risk_level: 'medium'
      };
      
      console.log('1. Testing getComprehensiveAlertData...');
      
      const alertData = await this.alertService.getComprehensiveAlertData(testUser, testDisease);
      
      console.log('   Alert data structure:');
      console.log(`   • User State: ${alertData.userState}`);
      console.log(`   • State Cases: ${alertData.state.total_cases}`);
      console.log(`   • State Trend: ${alertData.state.trend}`);
      console.log(`   • Nationwide Cases: ${alertData.nationwide.total_cases}`);
      console.log(`   • Affected States: ${alertData.nationwide.affected_states}`);
      console.log(`   • National Trend: ${alertData.nationwide.trend}`);
      
      const hasValidStructure = alertData.state && alertData.nationwide && alertData.userState;
      const hasStateData = typeof alertData.state.total_cases === 'number';
      const hasNationwideData = typeof alertData.nationwide.total_cases === 'number';
      
      console.log(`\n   ✅ Valid structure: ${hasValidStructure ? 'YES' : 'NO'}`);
      console.log(`   ✅ State data: ${hasStateData ? 'YES' : 'NO'}`);
      console.log(`   ✅ Nationwide data: ${hasNationwideData ? 'YES' : 'NO'}`);
      
      return hasValidStructure && hasStateData && hasNationwideData;
      
    } catch (error) {
      console.log(`   ❌ Data processing test failed: ${error.message}`);
      return false;
    }
  }

  async testMessageFormatting() {
    console.log('\n🧪 Testing Message Formatting\n');
    
    try {
      const testUser = { phone_number: '+1234567892' };
      
      const testDisease = {
        disease_name: 'Malaria',
        risk_level: 'high',
        symptoms: ['Fever', 'Chills', 'Headache'],
        safety_measures: ['Use bed nets', 'Take prophylaxis'],
        prevention_methods: ['Eliminate breeding sites', 'Use repellents']
      };
      
      const testAlertData = {
        userState: 'Karnataka',
        state: {
          total_cases: 120,
          cases_today: 15,
          trend: 'increasing',
          affected_districts: 8
        },
        nationwide: {
          total_cases: 2500,
          affected_states: 12,
          trend: 'stable',
          top_affected_states: [
            { state: 'Odisha', total_cases: 450 },
            { state: 'Jharkhand', total_cases: 380 },
            { state: 'Karnataka', total_cases: 320 }
          ]
        }
      };
      
      console.log('1. Testing formatComprehensiveAlertMessage...');
      
      const formattedMessage = this.alertService.formatComprehensiveAlertMessage(
        testUser, 
        testDisease, 
        testAlertData
      );
      
      console.log(`   Message length: ${formattedMessage.length} characters`);
      
      // Check message components
      const hasHeader = formattedMessage.includes('DISEASE OUTBREAK ALERT');
      const hasDiseaseName = formattedMessage.includes('MALARIA');
      const hasStateSection = formattedMessage.includes('IN YOUR STATE (KARNATAKA)');
      const hasNationalSection = formattedMessage.includes('NATIONWIDE STATUS');
      const hasStateCases = formattedMessage.includes('Active Cases: 120');
      const hasNationalCases = formattedMessage.includes('Total Cases: 2500');
      const hasTopStates = formattedMessage.includes('Most Affected:');
      const hasSymptoms = formattedMessage.includes('Fever');
      const hasSafety = formattedMessage.includes('Use bed nets');
      const hasPrevention = formattedMessage.includes('Eliminate breeding sites');
      
      console.log(`   ✅ Alert header: ${hasHeader ? 'YES' : 'NO'}`);
      console.log(`   ✅ Disease name: ${hasDiseaseName ? 'YES' : 'NO'}`);
      console.log(`   ✅ State section: ${hasStateSection ? 'YES' : 'NO'}`);
      console.log(`   ✅ National section: ${hasNationalSection ? 'YES' : 'NO'}`);
      console.log(`   ✅ State cases: ${hasStateCases ? 'YES' : 'NO'}`);
      console.log(`   ✅ National cases: ${hasNationalCases ? 'YES' : 'NO'}`);
      console.log(`   ✅ Top affected states: ${hasTopStates ? 'YES' : 'NO'}`);
      console.log(`   ✅ Symptoms: ${hasSymptoms ? 'YES' : 'NO'}`);
      console.log(`   ✅ Safety measures: ${hasSafety ? 'YES' : 'NO'}`);
      console.log(`   ✅ Prevention: ${hasPrevention ? 'YES' : 'NO'}`);
      
      const allComponentsPresent = hasHeader && hasDiseaseName && hasStateSection && 
                                  hasNationalSection && hasStateCases && hasNationalCases &&
                                  hasSymptoms && hasSafety && hasPrevention;
      
      console.log(`\n   Overall formatting: ${allComponentsPresent ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
      
      if (allComponentsPresent) {
        console.log('\n   📄 Sample formatted message:');
        console.log('   ' + '='.repeat(50));
        console.log(formattedMessage.split('\n').map(line => `   ${line}`).join('\n'));
        console.log('   ' + '='.repeat(50));
      }
      
      return allComponentsPresent;
      
    } catch (error) {
      console.log(`   ❌ Message formatting test failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Alert Tests\n');
    console.log('=' * 70);
    
    const testResults = {
      comprehensiveAlertStructure: await this.testComprehensiveAlertStructure(),
      alertDataProcessing: await this.testAlertDataProcessing(),
      messageFormatting: await this.testMessageFormatting()
    };
    
    console.log('=' * 70);
    console.log('🏁 Comprehensive Alert Tests Complete!\n');
    
    console.log('📊 Test Results Summary:');
    Object.entries(testResults).forEach(([test, result]) => {
      const status = result ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`   ${testName}: ${status}`);
    });
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
    
    if (successRate >= 80) {
      console.log('\n✅ COMPREHENSIVE ALERTS: WORKING PERFECTLY');
      console.log('\n🚀 Key Features Verified:');
      console.log('- State-specific disease data included');
      console.log('- Nationwide statistics provided');
      console.log('- Comprehensive alert structure');
      console.log('- Proper data processing and formatting');
      console.log('- Complete health information included');
      console.log('- User-friendly message layout');
    } else {
      console.log('\n⚠️ Comprehensive alerts need improvements');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new ComprehensiveAlertTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 CONCLUSION: Comprehensive alert system is working perfectly!');
    console.log('Users will now receive both state-specific and nationwide disease information.');
  } else {
    console.log('\n🔧 CONCLUSION: Comprehensive alert system needs fixes.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ComprehensiveAlertTest;
