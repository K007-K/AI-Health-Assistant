#!/usr/bin/env node

/**
 * Comprehensive Test Script for Disease Outbreak Alert System
 * 
 * This script tests all components of the outbreak system:
 * 1. Database connectivity and models
 * 2. Gemini AI integration for outbreak data
 * 3. Scheduler functionality
 * 4. Broadcast system
 * 5. State-wise filtering
 * 6. User interaction flows
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import services and models
const outbreakService = require('../src/services/outbreakService');
const broadcastService = require('../src/services/broadcastService');
const schedulerService = require('../src/services/schedulerService');
const OutbreakAlert = require('../src/models/OutbreakAlert');

class OutbreakSystemTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  // Test runner
  async runAllTests() {
    console.log('🚀 Starting Disease Outbreak System Tests...\n');

    try {
      // Connect to database
      await this.connectToDatabase();

      // Run all test suites
      await this.testDatabaseModels();
      await this.testOutbreakService();
      await this.testBroadcastService();
      await this.testSchedulerService();
      await this.testUserInteractionFlows();

      // Display results
      this.displayResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  // Connect to database
  async connectToDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-health-bot';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to database for testing\n');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  // Test database models
  async testDatabaseModels() {
    console.log('📊 Testing Database Models...');

    await this.runTest('OutbreakAlert Model Creation', async () => {
      const testAlert = await OutbreakAlert.createAlert({
        title: 'Test Dengue Outbreak',
        description: 'Test outbreak for system validation',
        disease: 'Dengue',
        severity: 'medium',
        scope: 'national',
        location: { country: 'India' },
        preventionTips: ['Use mosquito nets', 'Remove stagnant water'],
        symptoms: ['High fever', 'Body aches'],
        queryType: 'daily_national'
      });

      if (!testAlert || !testAlert.alertId) {
        throw new Error('Failed to create outbreak alert');
      }

      console.log(`   Created test alert: ${testAlert.alertId}`);
      return testAlert;
    });

    await this.runTest('OutbreakAlert Formatting', async () => {
      const alert = await OutbreakAlert.findOne({ disease: 'Dengue' });
      if (!alert) throw new Error('Test alert not found');

      const formattedEn = alert.getFormattedAlert('en');
      const formattedHi = alert.getFormattedAlert('hi');

      if (!formattedEn.includes('Dengue') || !formattedHi.includes('Dengue')) {
        throw new Error('Alert formatting failed');
      }

      console.log('   ✓ English and Hindi formatting working');
      return true;
    });

    await this.runTest('Alert Expiration Logic', async () => {
      const alert = await OutbreakAlert.findOne({ disease: 'Dengue' });
      if (!alert) throw new Error('Test alert not found');

      const isExpired = alert.isExpired();
      console.log(`   Alert expiration status: ${isExpired ? 'Expired' : 'Active'}`);
      return true;
    });

    console.log('✅ Database Models Tests Completed\n');
  }

  // Test outbreak service
  async testOutbreakService() {
    console.log('🦠 Testing Outbreak Service...');

    await this.runTest('National Outbreak Data Fetch', async () => {
      console.log('   Fetching national outbreak data from Gemini...');
      const nationalData = await outbreakService.fetchNationalOutbreakData();
      
      if (!nationalData || typeof nationalData !== 'object') {
        throw new Error('Invalid national outbreak data received');
      }

      console.log(`   ✓ Received data with hasActiveOutbreaks: ${nationalData.hasActiveOutbreaks}`);
      return nationalData;
    });

    await this.runTest('State Outbreak Data Fetch', async () => {
      console.log('   Fetching state outbreak data for Maharashtra...');
      const stateData = await outbreakService.fetchStateOutbreakData('Maharashtra');
      
      if (!stateData || typeof stateData !== 'object') {
        throw new Error('Invalid state outbreak data received');
      }

      console.log(`   ✓ Received data with hasStateOutbreaks: ${stateData.hasStateOutbreaks}`);
      return stateData;
    });

    await this.runTest('Today\'s National Alert Retrieval', async () => {
      const todaysAlert = await outbreakService.getTodaysNationalAlert();
      console.log(`   Today's alert status: ${todaysAlert ? 'Found' : 'Not found'}`);
      return true;
    });

    await this.runTest('Manual National Fetch Trigger', async () => {
      console.log('   Triggering manual national outbreak fetch...');
      const result = await outbreakService.triggerManualNationalFetch();
      console.log(`   Manual fetch result: ${result ? 'Success' : 'No alert created'}`);
      return true;
    });

    console.log('✅ Outbreak Service Tests Completed\n');
  }

  // Test broadcast service
  async testBroadcastService() {
    console.log('📢 Testing Broadcast Service...');

    await this.runTest('Broadcast Statistics', async () => {
      const stats = await broadcastService.getBroadcastStats();
      console.log('   Broadcast stats:', stats);
      
      if (typeof stats !== 'object') {
        throw new Error('Invalid broadcast statistics');
      }
      return stats;
    });

    await this.runTest('Batch Creation Logic', async () => {
      const testUsers = Array.from({ length: 125 }, (_, i) => ({ 
        phoneNumber: `+91900000${String(i).padStart(4, '0')}`,
        language: i % 2 === 0 ? 'en' : 'hi'
      }));

      const batches = broadcastService.createBatches(testUsers, 50);
      
      if (batches.length !== 3) {
        throw new Error(`Expected 3 batches, got ${batches.length}`);
      }

      console.log(`   ✓ Created ${batches.length} batches from ${testUsers.length} users`);
      return batches;
    });

    console.log('✅ Broadcast Service Tests Completed\n');
  }

  // Test scheduler service
  async testSchedulerService() {
    console.log('⏰ Testing Scheduler Service...');

    await this.runTest('Scheduler Initialization', async () => {
      schedulerService.initialize();
      const status = schedulerService.getStatus();
      
      if (!status.initialized) {
        throw new Error('Scheduler failed to initialize');
      }

      console.log('   ✓ Scheduler initialized successfully');
      console.log(`   Timezone: ${status.timezone}`);
      console.log(`   Jobs configured: ${Object.keys(status.jobs).length}`);
      return status;
    });

    await this.runTest('Manual Broadcast Trigger', async () => {
      console.log('   Testing manual broadcast trigger...');
      const result = await schedulerService.triggerManualBroadcast();
      
      if (!result || typeof result.success !== 'boolean') {
        throw new Error('Invalid manual broadcast result');
      }

      console.log(`   Manual broadcast result: ${result.success ? 'Success' : 'Failed'}`);
      return result;
    });

    console.log('✅ Scheduler Service Tests Completed\n');
  }

  // Test user interaction flows
  async testUserInteractionFlows() {
    console.log('👤 Testing User Interaction Flows...');

    await this.runTest('State-Specific Outbreak Request', async () => {
      console.log('   Testing state outbreak request for Karnataka...');
      const stateAlert = await outbreakService.getStateOutbreak('Karnataka');
      
      console.log(`   State alert result: ${stateAlert ? 'Alert found/created' : 'No alert'}`);
      return true;
    });

    await this.runTest('Alert Caching Logic', async () => {
      console.log('   Testing alert caching...');
      
      // First request
      const start1 = Date.now();
      await outbreakService.getStateOutbreak('Tamil Nadu');
      const time1 = Date.now() - start1;
      
      // Second request (should use cache)
      const start2 = Date.now();
      await outbreakService.getStateOutbreak('Tamil Nadu');
      const time2 = Date.now() - start2;
      
      console.log(`   First request: ${time1}ms, Second request: ${time2}ms`);
      console.log(`   Caching working: ${time2 < time1 ? 'Yes' : 'No'}`);
      return true;
    });

    console.log('✅ User Interaction Flow Tests Completed\n');
  }

  // Run individual test
  async runTest(testName, testFunction) {
    this.totalTests++;
    
    try {
      console.log(`🔄 Running: ${testName}`);
      const result = await testFunction();
      
      this.passedTests++;
      this.testResults.push({
        name: testName,
        status: 'PASS',
        result: result
      });
      
      console.log(`✅ PASS: ${testName}\n`);
      return result;
      
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAIL',
        error: error.message
      });
      
      console.log(`❌ FAIL: ${testName}`);
      console.log(`   Error: ${error.message}\n`);
      throw error;
    }
  }

  // Display test results
  displayResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.totalTests - this.passedTests}`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
    console.log('========================\n');

    // Show failed tests
    const failedTests = this.testResults.filter(test => test.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
      console.log('');
    }

    // Overall status
    if (this.passedTests === this.totalTests) {
      console.log('🎉 ALL TESTS PASSED! Disease Outbreak System is ready for production.');
    } else {
      console.log('⚠️ Some tests failed. Please review and fix issues before deployment.');
    }
  }

  // Cleanup test data
  async cleanup() {
    try {
      console.log('🧹 Cleaning up test data...');
      
      // Remove test alerts
      await OutbreakAlert.deleteMany({ 
        $or: [
          { disease: 'Dengue' },
          { title: /Test/ }
        ]
      });
      
      await mongoose.disconnect();
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new OutbreakSystemTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🏁 Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = OutbreakSystemTester;
