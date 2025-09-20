#!/usr/bin/env node

/**
 * Debug Specific User Issue
 * Check the exact user that's showing "already registered" after deletion
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');
const DiseaseAlertService = require('./src/services/diseaseAlertService');

async function debugSpecificUser() {
  const cacheService = new DiseaseOutbreakCacheService();
  const oldAlertService = new DiseaseAlertService();
  
  console.log('🔍 Debugging Specific User Issue\n');
  console.log('Please enter the phone number that\'s showing "already registered":');
  
  // For testing, let's use a common test number - you can replace this with the actual number
  const testPhone = process.argv[2] || '+1234567890'; // You can pass phone number as argument
  
  console.log(`Testing phone number: ${testPhone}\n`);
  
  try {
    // Check all possible places where user data might exist
    
    console.log('1. Checking with NEW cache service...');
    const newServiceResult = await cacheService.getUserSelectedState(testPhone);
    console.log(`   New service - User exists: ${newServiceResult ? 'YES' : 'NO'}`);
    if (newServiceResult) {
      console.log(`   State: ${newServiceResult.indian_states?.state_name}`);
      console.log(`   Alert enabled: ${newServiceResult.alert_enabled}`);
      console.log(`   Selected state ID: ${newServiceResult.selected_state_id}`);
    }
    
    console.log('\n2. Checking with OLD alert service...');
    const oldServiceResult = await oldAlertService.isUserRegistered(testPhone);
    console.log(`   Old service - Is registered: ${oldServiceResult ? 'YES' : 'NO'}`);
    
    console.log('\n3. Direct database query for ALL records...');
    const { data: allRecords, error } = await cacheService.supabase
      .from('user_alert_preferences')
      .select('*')
      .eq('phone_number', testPhone);
    
    if (error) {
      console.log(`   Database error: ${error.message}`);
    } else {
      console.log(`   Total records found: ${allRecords.length}`);
      
      if (allRecords.length > 0) {
        console.log(`   ⚠️ FOUND RECORDS! This explains the issue.`);
        allRecords.forEach((record, index) => {
          console.log(`\n   Record ${index + 1}:`);
          console.log(`     ID: ${record.id}`);
          console.log(`     Phone: ${record.phone_number}`);
          console.log(`     State: ${record.state}`);
          console.log(`     District: ${record.district}`);
          console.log(`     Pincode: ${record.pincode}`);
          console.log(`     Alert enabled: ${record.alert_enabled}`);
          console.log(`     Selected state ID: ${record.selected_state_id}`);
          console.log(`     Created: ${record.created_at}`);
          console.log(`     Updated: ${record.updated_at}`);
        });
      }
    }
    
    console.log('\n4. Testing the exact condition from handleTurnOnAlerts...');
    const existingState = await cacheService.getUserSelectedState(testPhone);
    const condition = existingState && existingState.alert_enabled;
    console.log(`   existingState: ${existingState ? 'EXISTS' : 'NULL'}`);
    console.log(`   existingState.alert_enabled: ${existingState?.alert_enabled}`);
    console.log(`   Condition (existingState && existingState.alert_enabled): ${condition}`);
    console.log(`   Would show "already registered": ${condition ? 'YES' : 'NO'}`);
    
    if (condition) {
      console.log(`\n   🎯 FOUND THE ISSUE! User has alert_enabled = true`);
      console.log(`   State name: ${existingState.indian_states?.state_name || 'Unknown'}`);
    }
    
    console.log('\n5. Testing both deletion methods...');
    
    // Test new cache service deletion
    console.log('   Testing NEW cache service deletion...');
    const newDeletionResult = await cacheService.turnOffAlertsAndDeleteData(testPhone);
    console.log(`   New deletion result: ${newDeletionResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Test old service unregistration (if it exists)
    console.log('   Testing OLD service unregistration...');
    try {
      if (typeof oldAlertService.unregisterUserFromAlerts === 'function') {
        const oldDeletionResult = await oldAlertService.unregisterUserFromAlerts(testPhone);
        console.log(`   Old deletion result: ${oldDeletionResult?.success ? 'SUCCESS' : 'FAILED'}`);
      } else {
        console.log(`   Old service doesn't have unregisterUserFromAlerts method`);
      }
    } catch (error) {
      console.log(`   Old service deletion error: ${error.message}`);
    }
    
    console.log('\n6. Final verification...');
    const finalCheck = await cacheService.getUserSelectedState(testPhone);
    console.log(`   User exists after deletion: ${finalCheck ? 'YES' : 'NO'}`);
    
    const { data: finalRecords } = await cacheService.supabase
      .from('user_alert_preferences')
      .select('*')
      .eq('phone_number', testPhone);
    
    console.log(`   Records in database: ${finalRecords.length}`);
    
    if (finalRecords.length > 0) {
      console.log(`\n   ⚠️ DELETION FAILED! Records still exist:`);
      finalRecords.forEach((record, index) => {
        console.log(`   Record ${index + 1}: ID=${record.id}, alert_enabled=${record.alert_enabled}`);
      });
      
      // Force delete all records
      console.log('\n7. Force deleting all records...');
      for (const record of finalRecords) {
        const { error: forceDeleteError } = await cacheService.supabase
          .from('user_alert_preferences')
          .delete()
          .eq('id', record.id);
        
        if (forceDeleteError) {
          console.log(`   Failed to force delete ${record.id}: ${forceDeleteError.message}`);
        } else {
          console.log(`   Force deleted record ${record.id}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

console.log('Usage: node debug-specific-user.js [phone_number]');
console.log('Example: node debug-specific-user.js +1234567890\n');

// Run the debug
debugSpecificUser().catch(console.error);
