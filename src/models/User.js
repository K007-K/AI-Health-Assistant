const { supabase } = require('../config/database');

// User model for Supabase
class User {
  constructor(data) {
    Object.assign(this, data);
  }

  // Static method to find user by phone number
  static async findByPhoneNumber(phoneNumber) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new User(data) : null;
  }

  // Static method to get all active users
  static async getActiveUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data.map(user => new User(user));
  }

  // Static method to get subscribed users (simplified approach)
  static async getSubscribedUsers() {
    try {
      // First get all users who have consented to outbreak alerts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('consent_outbreak_alerts', true);

      if (usersError) {
        console.error('Error fetching consented users:', usersError);
        throw usersError;
      }

      if (!users || users.length === 0) {
        console.log('ℹ️ No users with consent_outbreak_alerts=true found');
        return [];
      }

      console.log(`📊 Found ${users.length} users with consent_outbreak_alerts=true`);

      // Get their alert preferences if they exist
      const subscribedUsers = [];
      for (const user of users) {
        const { data: prefs, error: prefsError } = await supabase
          .from('user_alert_preferences')
          .select('*')
          .eq('phone_number', user.phone_number)
          .eq('alert_enabled', true)
          .single();

        if (!prefsError && prefs) {
          const userObj = new User(user);
          userObj.alertPreferences = prefs;
          subscribedUsers.push(userObj);
          console.log(`✅ User ${user.phone_number} has alert preferences`);
        } else {
          // User consented but no preferences yet - still include them
          const userObj = new User(user);
          subscribedUsers.push(userObj);
          console.log(`📝 User ${user.phone_number} consented but no preferences yet`);
        }
      }

      console.log(`👥 Total subscribed users: ${subscribedUsers.length}`);
      return subscribedUsers;

    } catch (error) {
      console.error('❌ Error in getSubscribedUsers:', error);
      throw error;
    }
  }

  // Static method to create or update user
  static async createOrUpdateUser(phoneNumber, userData = {}) {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        phone_number: phoneNumber,
        ...userData,
        last_interaction: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    return new User(data);
  }

  // Enable disease outbreak alerts
  async enableDiseaseAlerts() {
    const { data, error } = await supabase
      .from('users')
      .update({
        consent_outbreak_alerts: true,
        updated_at: new Date()
      })
      .eq('phone_number', this.phone_number)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, data);
    return this;
  }

  // Disable disease outbreak alerts and clear all preferences
  async disableDiseaseAlerts() {
    const { data, error } = await supabase
      .from('users')
      .update({
        consent_outbreak_alerts: false,
        updated_at: new Date()
      })
      .eq('phone_number', this.phone_number)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, data);
    
    // Also clean up related alert data
    await this.cleanupAlertData();
    
    return this;
  }

  // Clean up all alert-related data from other tables
  async cleanupAlertData() {
    try {
      // Delete user-specific alert preferences from user_alert_preferences table
      const { error: prefError } = await supabase
        .from('user_alert_preferences')
        .delete()
        .eq('phone_number', this.phone_number);

      if (prefError && prefError.code !== 'PGRST116') {
        console.error('⚠️ Error cleaning user_alert_preferences:', prefError);
      }

      console.log(`🗑️ Cleaned up all alert data for user: ${this.phone_number}`);
    } catch (error) {
      console.error('⚠️ Error in cleanupAlertData (non-critical):', error);
      // Don't throw error - this is cleanup, not critical
    }
  }
}

module.exports = User;
