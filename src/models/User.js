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

  // Static method to get subscribed users (only those who enabled disease outbreak alerts)
  static async getSubscribedUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .eq('disease_alerts_enabled', true); // Only users who specifically enabled disease outbreak alerts

    if (error) throw error;
    return data.map(user => new User(user));
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
        disease_alerts_enabled: true,
        disease_alerts_unsubscribed_at: null,
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
        disease_alerts_enabled: false,
        disease_alerts_unsubscribed_at: new Date(),
        disease_alert_location: null, // Clear location preferences
        disease_alert_state: null,    // Clear state preferences
        disease_alert_district: null, // Clear district preferences
        disease_alert_pincode: null,  // Clear pincode preferences
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
      // Remove user from any alert tracking records
      const { error: cacheError } = await supabase
        .from('disease_outbreak_cache')
        .update({
          sent_to_users: []
        })
        .contains('sent_to_users', [{ phoneNumber: this.phone_number }]);

      if (cacheError) {
        console.error('⚠️ Error cleaning cache data:', cacheError);
      }

      // Delete user-specific alert preferences if they exist in separate table
      const { error: prefError } = await supabase
        .from('user_disease_alert_preferences')
        .delete()
        .eq('phone_number', this.phone_number);

      if (prefError && prefError.code !== 'PGRST116') {
        console.error('⚠️ Error cleaning preference data:', prefError);
      }

      // Delete user from any location-based alert registrations
      const { error: locationError } = await supabase
        .from('user_alert_locations')
        .delete()
        .eq('phone_number', this.phone_number);

      if (locationError && locationError.code !== 'PGRST116') {
        console.error('⚠️ Error cleaning location data:', locationError);
      }

      console.log(`🗑️ Cleaned up all alert data for user: ${this.phone_number}`);
    } catch (error) {
      console.error('⚠️ Error in cleanupAlertData (non-critical):', error);
      // Don't throw error - this is cleanup, not critical
    }
  }
}

module.exports = User;
