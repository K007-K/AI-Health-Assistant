const { supabase, supabaseAdmin } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UserService {
  constructor() {
    // User cache for faster lookups (in-memory cache)
    this.userCache = new Map();
    this.sessionCache = new Map();
    
    // Cache cleanup every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
  }
  
  // Clean up old cache entries
  cleanupCache() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    // Clean user cache
    for (const [phoneNumber, userData] of this.userCache.entries()) {
      if (now - userData.cachedAt > maxAge) {
        this.userCache.delete(phoneNumber);
      }
    }
    
    // Clean session cache
    for (const [userId, sessionData] of this.sessionCache.entries()) {
      if (now - sessionData.cachedAt > maxAge) {
        this.sessionCache.delete(userId);
      }
    }
  }
  // Get or create user by phone number
  async getOrCreateUser(phoneNumber) {
    try {
      // Check cache first for faster response
      const cachedUser = this.userCache.get(phoneNumber);
      if (cachedUser && (Date.now() - cachedUser.cachedAt) < 5 * 60 * 1000) { // 5 minutes cache
        console.log(`💾 Using cached user data for ${phoneNumber}`);
        // Still update activity but don't wait for it
        this.updateUserActivity(cachedUser.user.id).catch(console.error);
        return cachedUser.user;
      }

      // First, try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (existingUser && !fetchError) {
        // Cache the user data
        this.userCache.set(phoneNumber, {
          user: existingUser,
          cachedAt: Date.now()
        });
        
        // Update last active timestamp (async, don't wait)
        this.updateUserActivity(existingUser.id).catch(console.error);
        
        return existingUser;
      }

      // Create new user if doesn't exist
      const newUser = {
        id: uuidv4(),
        phone_number: phoneNumber,
        preferred_language: 'en', // Default to English, will be updated during onboarding
        script_preference: 'native',
        accessibility_mode: 'normal',
        consent_data_collection: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      console.log(`👤 New user created: ${phoneNumber}`);
      return createdUser;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  }

  // Update user preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const updateData = {
        ...preferences,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user preferences:', error);
        throw error;
      }

      console.log(`✅ User preferences updated: ${userId}`);
      return data;
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      throw error;
    }
  }

  // Update user activity timestamp
  async updateUserActivity(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user activity:', error);
      }
    } catch (error) {
      console.error('Error in updateUserActivity:', error);
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  // Get user session state
  async getUserSession(userId) {
    try {
      // Check cache first for faster response
      const cachedSession = this.sessionCache.get(userId);
      if (cachedSession && (Date.now() - cachedSession.cachedAt) < 2 * 60 * 1000) { // 2 minutes cache
        console.log(`💾 Using cached session data for user ${userId}`);
        return cachedSession.session;
      }

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user session:', error);
        throw error;
      }

      // Cache the session data
      if (data) {
        this.sessionCache.set(userId, {
          session: data,
          cachedAt: Date.now()
        });
      }

      return data || null;
    } catch (error) {
      console.error('Error in getUserSession:', error);
      return null;
    }
  }

  // Update user session state
  async updateUserSession(userId, sessionState, contextData = {}) {
    try {
      // First, check if session exists
      const existingSession = await this.getUserSession(userId);

      if (existingSession) {
        // Update existing session
        const { data, error } = await supabase
          .from('user_sessions')
          .update({
            session_state: sessionState,
            context_data: contextData,
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          })
          .eq('id', existingSession.id)
          .select()
          .single();

        if (error) throw error;
        
        // Invalidate cache after update
        this.sessionCache.delete(userId);
        
        return data;
      } else {
        // Create new session
        const newSession = {
          id: uuidv4(),
          user_id: userId,
          session_state: sessionState,
          context_data: contextData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('user_sessions')
          .insert([newSession])
          .select()
          .single();

        if (error) throw error;
        
        // Cache the new session
        this.sessionCache.set(userId, {
          session: data,
          cachedAt: Date.now()
        });
        
        return data;
      }
    } catch (error) {
      console.error('Error in updateUserSession:', error);
      throw error;
    }
  }

  // Clear user session (logout/reset)
  async clearUserSession(userId) {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing user session:', error);
        throw error;
      }

      console.log(`🗑️ User session cleared: ${userId}`);
    } catch (error) {
      console.error('Error in clearUserSession:', error);
      throw error;
    }
  }

  // Check if user has completed onboarding
  async hasCompletedOnboarding(userId) {
    try {
      const user = await this.getUserById(userId);
      return user && user.onboarding_completed === true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  // Get user statistics for admin dashboard
  async getUserStats() {
    try {
      const { data: totalUsers, error: totalError } = await supabase
        .from('users')
        .select('id', { count: 'exact' });

      const { data: activeUsers, error: activeError } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      const { data: languageStats, error: langError } = await supabase
        .from('users')
        .select('preferred_language', { count: 'exact' })
        .not('preferred_language', 'is', null);

      if (totalError || activeError || langError) {
        throw new Error('Error fetching user statistics');
      }

      return {
        totalUsers: totalUsers.length,
        activeUsers: activeUsers.length,
        languageDistribution: languageStats
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      throw error;
    }
  }

  // Update user profile information
  async updateUserProfile(userId, profileData) {
    try {
      const allowedFields = ['first_name', 'age', 'gender', 'location_pincode', 'emergency_contact'];
      const updateData = {};

      // Only update allowed fields
      for (const field of allowedFields) {
        if (profileData.hasOwnProperty(field)) {
          updateData[field] = profileData[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid profile fields to update');
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }

      console.log(`👤 User profile updated: ${userId}`);
      return data;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  }

  // Update consent preferences
  async updateConsent(userId, consentType, value) {
    try {
      const allowedConsents = ['consent_outbreak_alerts', 'consent_data_collection'];
      
      if (!allowedConsents.includes(consentType)) {
        throw new Error('Invalid consent type');
      }

      const updateData = {
        [consentType]: value,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating consent:', error);
        throw error;
      }

      console.log(`🔒 User consent updated: ${userId} - ${consentType}: ${value}`);
      return data;
    } catch (error) {
      console.error('Error in updateConsent:', error);
      throw error;
    }
  }

  // Clean up expired sessions (maintenance function)
  async cleanupExpiredSessions() {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        throw error;
      }

      console.log('🧹 Expired sessions cleaned up');
    } catch (error) {
      console.error('Error in cleanupExpiredSessions:', error);
      throw error;
    }
  }
}

module.exports = UserService;