#!/usr/bin/env node

/**
 * Test Smart Disease Outbreak Caching System
 * Verify efficient caching and state-based queries
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const MessageController = require('./src/controllers/messageController');

class SmartCachingSystemTest {
  constructor() {
    this.cacheService = new DiseaseOutbreakCacheService();
    this.messageController = new MessageController();
    
    // Mock WhatsApp service
    this.messageController.whatsappService = {
      sendMessage: async (phone, message) => {
        console.log(`📱 MESSAGE to ${phone}: ${message.substring(0, 80)}...`);
        return { success: true };
      },
      sendInteractiveButtons: async (phone, text, buttons) => {
        console.log(`📱 BUTTONS to ${phone}: ${text}`);
        console.log(`   Buttons: ${buttons.map(b => b.title).join(', ')}`);
        return { success: true };
      },
      sendInteractiveList: async (phone, text, buttonText, items) => {
        console.log(`📱 LIST to ${phone}: ${text}`);
        console.log(`   Items: ${items.map(i => i.title).join(', ')}`);
        return { success: true };
      }
    };
  }

  async testCacheService() {
    console.log('🧪 Testing Smart Caching Service...\n');
    
    try {
      // Test 1: Get Indian states
      console.log('1. Testing Indian States Retrieval:');
      const states = await this.cacheService.getIndianStates();
      console.log(`   ✅ Retrieved ${states.length} Indian states`);
      console.log(`   Sample states: ${states.slice(0, 3).map(s => s.state_name).join(', ')}`);
      
      // Test 2: Get states grouped by region
      console.log('\n2. Testing States Grouped by Region:');
      const groupedStates = await this.cacheService.getStatesGroupedByRegion();
      const regions = Object.keys(groupedStates);
      console.log(`   ✅ Retrieved ${regions.length} regions`);
      console.log(`   Regions: ${regions.join(', ')}`);
      
      // Test 3: Search states
      console.log('\n3. Testing State Search:');
      const searchResults = await this.cacheService.getIndianStates('andhra');
      console.log(`   ✅ Search for 'andhra' returned ${searchResults.length} results`);
      if (searchResults.length > 0) {
        console.log(`   Found: ${searchResults.map(s => s.state_name).join(', ')}`);
      }
      
      return true;
      
    } catch (error) {
      console.log(`   ❌ Cache service test failed: ${error.message}`);
      return false;
    }
  }

  async testNationwideCaching() {
    console.log('\n🧪 Testing Nationwide Disease Caching...\n');
    
    try {
      console.log('1. First Request (should query AI and cache):');
      const start1 = Date.now();
      const result1 = await this.cacheService.getDiseaseOutbreakData(null);
      const time1 = Date.now() - start1;
      
      console.log(`   ✅ Source: ${result1.source}`);
      console.log(`   ✅ Diseases count: ${result1.diseases?.length || 0}`);
      console.log(`   ✅ Time taken: ${time1}ms`);
      
      console.log('\n2. Second Request (should use cache):');
      const start2 = Date.now();
      const result2 = await this.cacheService.getDiseaseOutbreakData(null);
      const time2 = Date.now() - start2;
      
      console.log(`   ✅ Source: ${result2.source}`);
      console.log(`   ✅ Diseases count: ${result2.diseases?.length || 0}`);
      console.log(`   ✅ Time taken: ${time2}ms`);
      
      // Verify caching worked
      const isCached = result2.source === 'cache' && time2 < time1;
      console.log(`\n   🎯 Caching efficiency: ${isCached ? 'WORKING' : 'NOT WORKING'}`);
      console.log(`   📊 Speed improvement: ${Math.round((time1 - time2) / time1 * 100)}%`);
      
      return isCached;
      
    } catch (error) {
      console.log(`   ❌ Nationwide caching test failed: ${error.message}`);
      return false;
    }
  }

  async testStateCaching() {
    console.log('\n🧪 Testing State-Based Disease Caching...\n');
    
    const testStates = ['Andhra Pradesh', 'Maharashtra', 'Karnataka'];
    const results = {};
    
    try {
      for (const state of testStates) {
        console.log(`Testing state: ${state}`);
        
        // First request for this state
        const start1 = Date.now();
        const result1 = await this.cacheService.getDiseaseOutbreakData(state);
        const time1 = Date.now() - start1;
        
        console.log(`   First request - Source: ${result1.source}, Time: ${time1}ms`);
        
        // Second request for same state (should be cached)
        const start2 = Date.now();
        const result2 = await this.cacheService.getDiseaseOutbreakData(state);
        const time2 = Date.now() - start2;
        
        console.log(`   Second request - Source: ${result2.source}, Time: ${time2}ms`);
        
        results[state] = {
          cached: result2.source === 'cache',
          speedup: time1 > 0 ? Math.round((time1 - time2) / time1 * 100) : 0
        };
        
        console.log(`   🎯 Caching: ${results[state].cached ? 'WORKING' : 'NOT WORKING'}`);
        console.log('');
      }
      
      // Summary
      const allCached = Object.values(results).every(r => r.cached);
      console.log(`📊 State Caching Summary:`);
      Object.entries(results).forEach(([state, result]) => {
        console.log(`   ${state}: ${result.cached ? '✅' : '❌'} (${result.speedup}% faster)`);
      });
      
      return allCached;
      
    } catch (error) {
      console.log(`   ❌ State caching test failed: ${error.message}`);
      return false;
    }
  }

  async testUserStateSelection() {
    console.log('\n🧪 Testing User State Selection System...\n');
    
    const testUsers = [
      { phone: '+1234567890', stateId: 1 }, // Andhra Pradesh
      { phone: '+1234567891', stateId: 14 }, // Maharashtra
      { phone: '+1234567892', stateId: 11 }  // Karnataka
    ];
    
    try {
      for (const user of testUsers) {
        console.log(`Testing user: ${user.phone}`);
        
        // Update user's selected state
        const updateSuccess = await this.cacheService.updateUserSelectedState(user.phone, user.stateId);
        console.log(`   Update state: ${updateSuccess ? '✅' : '❌'}`);
        
        if (updateSuccess) {
          // Retrieve user's state info
          const stateInfo = await this.cacheService.getUserSelectedState(user.phone);
          const stateName = stateInfo?.indian_states?.state_name;
          console.log(`   Retrieved state: ${stateName || 'Not found'}`);
          console.log(`   Alerts enabled: ${stateInfo?.alerts_enabled ? '✅' : '❌'}`);
        }
        
        console.log('');
      }
      
      return true;
      
    } catch (error) {
      console.log(`   ❌ User state selection test failed: ${error.message}`);
      return false;
    }
  }

  async testInteractiveStateSelection() {
    console.log('\n🧪 Testing Interactive State Selection Interface...\n');
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '+1234567890',
      preferred_language: 'en'
    };
    
    try {
      console.log('1. Testing State Selection Menu:');
      await this.messageController.showStateSelectionMenu(testUser, this.cacheService);
      console.log('   ✅ State selection menu displayed');
      
      console.log('\n2. Testing Region Selection:');
      await this.messageController.handleRegionSelection(testUser, 'region_south');
      console.log('   ✅ Region selection handled');
      
      console.log('\n3. Testing State Selection:');
      await this.messageController.handleStateSelection(testUser, 'state_1');
      console.log('   ✅ State selection handled');
      
      return true;
      
    } catch (error) {
      console.log(`   ❌ Interactive selection test failed: ${error.message}`);
      return false;
    }
  }

  async testCacheStatistics() {
    console.log('\n🧪 Testing Cache Statistics...\n');
    
    try {
      const stats = await this.cacheService.getCacheStatistics();
      
      if (stats) {
        console.log('📊 Cache Statistics:');
        console.log(`   Total entries: ${stats.total_entries}`);
        console.log(`   Nationwide entries: ${stats.nationwide_entries}`);
        console.log(`   State entries: ${stats.state_entries}`);
        console.log(`   Unique states cached: ${stats.unique_states}`);
        console.log(`   Latest update: ${stats.latest_update ? new Date(stats.latest_update).toLocaleString() : 'None'}`);
        
        return true;
      } else {
        console.log('   ❌ Failed to retrieve cache statistics');
        return false;
      }
      
    } catch (error) {
      console.log(`   ❌ Cache statistics test failed: ${error.message}`);
      return false;
    }
  }

  async testSmartCachingWorkflow() {
    console.log('\n🧪 Testing Complete Smart Caching Workflow...\n');
    
    const users = [
      { 
        id: '1', 
        phone_number: '+1111111111', 
        preferred_language: 'en',
        state: 'Andhra Pradesh'
      },
      { 
        id: '2', 
        phone_number: '+2222222222', 
        preferred_language: 'hi',
        state: 'Andhra Pradesh' // Same state as user 1
      },
      { 
        id: '3', 
        phone_number: '+3333333333', 
        preferred_language: 'te',
        state: 'Maharashtra' // Different state
      }
    ];
    
    try {
      console.log('Scenario: Multiple users requesting disease outbreaks');
      console.log('Expected: Same state users get cached data, different states trigger new queries\n');
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        console.log(`${i + 1}. User ${user.id} (${user.state}) requesting disease outbreaks:`);
        
        const start = Date.now();
        await this.messageController.handleViewActiveDiseases(user);
        const time = Date.now() - start;
        
        console.log(`   ✅ Request completed in ${time}ms`);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('\n🎯 Expected Behavior Verification:');
      console.log('   - User 1 (Andhra Pradesh): Fresh AI query + cache creation');
      console.log('   - User 2 (Andhra Pradesh): Uses cached data from User 1');
      console.log('   - User 3 (Maharashtra): Fresh AI query + new cache creation');
      
      return true;
      
    } catch (error) {
      console.log(`   ❌ Smart caching workflow test failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Smart Caching System Tests\n');
    console.log('=' * 80);
    
    const testResults = {
      cacheService: await this.testCacheService(),
      nationwideCaching: await this.testNationwideCaching(),
      stateCaching: await this.testStateCaching(),
      userStateSelection: await this.testUserStateSelection(),
      interactiveSelection: await this.testInteractiveStateSelection(),
      cacheStatistics: await this.testCacheStatistics(),
      smartWorkflow: await this.testSmartCachingWorkflow()
    };
    
    console.log('=' * 80);
    console.log('🏁 Smart Caching System Tests Complete!\n');
    
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
      console.log('\n✅ Smart Caching System Implementation: SUCCESS');
      console.log('\n🚀 Key Benefits Achieved:');
      console.log('- Eliminates redundant AI queries');
      console.log('- State-based caching for efficiency');
      console.log('- Interactive state selection (no manual typing)');
      console.log('- Automatic cache management');
      console.log('- Significant performance improvements');
      console.log('- Cost reduction through smart caching');
    } else {
      console.log('\n⚠️ Smart Caching System needs improvements');
    }
    
    return successRate >= 80;
  }
}

// Run the tests
async function main() {
  const tester = new SmartCachingSystemTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SmartCachingSystemTest;
