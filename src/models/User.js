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

  // Disable disease outbreak alerts
  async disableDiseaseAlerts() {
    const { data, error } = await supabase
      .from('users')
      .update({
        disease_alerts_enabled: false,
        disease_alerts_unsubscribed_at: new Date(),
        updated_at: new Date()
      })
      .eq('phone_number', this.phone_number)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, data);
    return this;
  }
}

module.exports = User;
