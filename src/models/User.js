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

  // Static method to get subscribed users (from user_alert_preferences table)
  static async getSubscribedUsers() {
    const { data, error } = await supabase
      .from('user_alert_preferences')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('alert_enabled', true)
      .eq('users.consent_outbreak_alerts', true);

    if (error) throw error;
    
    // Return users with their alert preferences
    return data.map(pref => {
      const user = new User(pref.users);
      user.alertPreferences = pref;
      return user;
    });
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
