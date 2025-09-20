#!/usr/bin/env node

/**
 * Debug Deletion Issue
 * Check if user data is actually being deleted and why "already registered" still shows
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DiseaseOutbreakCacheService = require('./src/services/diseaseOutbreakCacheService');

async function debugDeletionIssue() {
  const cacheService = new DiseaseOutbreakCacheService();
  const testPhone = '+9999999999';
  
  console.log('🔍 Debugging Deletion Issue\n');
  
  try {
    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerSuccess = await cacheService.updateUserSelectedState(testPhone, 1); // Andhra Pradesh
    console.log(`   Registration result: ${registerSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    // Step 2: Check user state after registration
    console.log('\n2. Checking user state after registration...');
    const afterRegistration = await cacheService.getUserSelectedState(testPhone);
    console.log(`   User exists: ${afterRegistration ? 'YES' : 'NO'}`);
    if (afterRegistration) {
      console.log(`   State: ${afterRegistration.indian_states?.state_name}`);
      console.log(`   Alert enabled: ${afterRegistration.alert_enabled}`);
      console.log(`   Selected state ID: ${afterRegistration.selected_state_id}`);
    }
    
    // Step 3: Check registration status
    console.log('\n3. Checking registration status...');
    const isRegistered = await cacheService.isUserRegisteredForAlerts(testPhone);
    console.log(`   Is registered: ${isRegistered ? 'YES' : 'NO'}`);
    
    // Step 4: Delete user data
    console.log('\n4. Deleting user data...');
    const deleteSuccess = await cacheService.turnOffAlertsAndDeleteData(testPhone);
    console.log(`   Deletion result: ${deleteSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    // Step 5: Check user state after deletion
    console.log('\n5. Checking user state after deletion...');
    const afterDeletion = await cacheService.getUserSelectedState(testPhone);
    console.log(`   User exists: ${afterDeletion ? 'YES' : 'NO'}`);
    if (afterDeletion) {
      console.log(`   ⚠️ WARNING: User still exists after deletion!`);
      console.log(`   State: ${afterDeletion.indian_states?.state_name}`);
      console.log(`   Alert enabled: ${afterDeletion.alert_enabled}`);
      console.log(`   Selected state ID: ${afterDeletion.selected_state_id}`);
    }
    
    // Step 6: Check registration status after deletion
    console.log('\n6. Checking registration status after deletion...');
    const isRegisteredAfter = await cacheService.isUserRegisteredForAlerts(testPhone);
    console.log(`   Is registered: ${isRegisteredAfter ? 'YES' : 'NO'}`);
    
    // Step 7: Direct database query to verify deletion
    console.log('\n7. Direct database verification...');
    const { data: directQuery, error } = await cacheService.supabase
      .from('user_alert_preferences')
      .select('*')
      .eq('phone_number', testPhone);
    
    if (error) {
      console.log(`   Database query error: ${error.message}`);
    } else {
      console.log(`   Records found in database: ${directQuery.length}`);
      if (directQuery.length > 0) {
        console.log(`   ⚠️ WARNING: Records still exist in database!`);
        directQuery.forEach((record, index) => {
          console.log(`   Record ${index + 1}:`);
          console.log(`     ID: ${record.id}`);
          console.log(`     Phone: ${record.phone_number}`);
          console.log(`     State: ${record.state}`);
          console.log(`     Alert enabled: ${record.alert_enabled}`);
          console.log(`     Selected state ID: ${record.selected_state_id}`);
        });
      }
    }
    
    // Step 8: Test the condition that causes "already registered" message
    console.log('\n8. Testing handleTurnOnAlerts condition...');
    const existingState = await cacheService.getUserSelectedState(testPhone);
    const wouldShowAlreadyRegistered = existingState && existingState.alert_enabled;
    console.log(`   existingState: ${existingState ? 'EXISTS' : 'NULL'}`);
    console.log(`   existingState.alert_enabled: ${existingState?.alert_enabled}`);
    console.log(`   Would show "already registered": ${wouldShowAlreadyRegistered ? 'YES' : 'NO'}`);
    
    // Final cleanup
    console.log('\n9. Final cleanup...');
    if (directQuery && directQuery.length > 0) {
      for (const record of directQuery) {
        const { error: deleteError } = await cacheService.supabase
          .from('user_alert_preferences')
          .delete()
          .eq('id', record.id);
        
        if (deleteError) {
          console.log(`   Failed to delete record ${record.id}: ${deleteError.message}`);
        } else {
          console.log(`   Deleted record ${record.id}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}

// Run the debug
debugDeletionIssue().catch(console.error);
