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

  // Static method to get subscribed users
  static async getSubscribedUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .eq('alerts_enabled', true);

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

  // Enable alerts
  async enableAlerts() {
    const { data, error } = await supabase
      .from('users')
      .update({
        alerts_enabled: true,
        unsubscribed_at: null,
        updated_at: new Date()
      })
      .eq('phone_number', this.phone_number)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, data);
    return this;
  }

  // Disable alerts
  async disableAlerts() {
    const { data, error } = await supabase
      .from('users')
      .update({
        alerts_enabled: false,
        unsubscribed_at: new Date(),
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
