/**
 * Smart Disease Outbreak Caching Service
 * Eliminates redundant API queries by caching responses per state/nationwide
 */

const { createClient } = require('@supabase/supabase-js');
const AIDiseaseMonitorService = require('./aiDiseaseMonitorService');

class DiseaseOutbreakCacheService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.aiDiseaseMonitor = new AIDiseaseMonitorService();
  }

  /**
   * Get disease outbreak data with smart caching
   * @param {string|null} stateName - State name or null for nationwide
   * @returns {Promise<Object>} Cached or fresh disease data
   */
  async getDiseaseOutbreakData(stateName = null) {
    const cacheType = stateName ? 'state' : 'nationwide';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`🔍 Checking cache for ${cacheType} data${stateName ? ` (${stateName})` : ''} for ${today}`);

    try {
      // 1. Check if we have cached data for today
      const cachedData = await this.getCachedData(cacheType, stateName, today);
      
      if (cachedData) {
        console.log(`✅ Using cached ${cacheType} data from database`);
        return {
          diseases: cachedData.parsed_diseases,
          source: 'cache',
          cached_at: cachedData.created_at
        };
      }

      // 2. No cache found, query AI and cache the result
      console.log(`🤖 No cache found, querying AI for fresh ${cacheType} data`);
      const freshData = await this.queryAndCacheData(cacheType, stateName);
      
      return {
        diseases: freshData.diseases,
        source: 'fresh',
        cached_at: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error in getDiseaseOutbreakData:`, error);
      
      // Fallback: try to get yesterday's cache if today fails
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const fallbackCache = await this.getCachedData(cacheType, stateName, yesterdayStr);
      if (fallbackCache) {
        console.log(`⚠️ Using yesterday's cache as fallback`);
        return {
          diseases: fallbackCache.parsed_diseases,
          source: 'fallback_cache',
          cached_at: fallbackCache.created_at
        };
      }

      throw error;
    }
  }

  /**
   * Get cached data from database
   * @param {string} cacheType - 'nationwide' or 'state'
   * @param {string|null} stateName - State name or null
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object|null>} Cached data or null
   */
  async getCachedData(cacheType, stateName, date) {
    let query = this.supabase
      .from('disease_outbreak_cache')
      .select('*')
      .eq('cache_type', cacheType)
      .eq('query_date', date);

    if (cacheType === 'state') {
      query = query.eq('state_name', stateName);
    } else {
      query = query.is('state_name', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching cached data:', error);
      return null;
    }

    return data;
  }

  /**
   * Query AI and cache the result
   * @param {string} cacheType - 'nationwide' or 'state'
   * @param {string|null} stateName - State name or null
   * @returns {Promise<Object>} Fresh disease data
   */
  async queryAndCacheData(cacheType, stateName) {
    try {
      // Prepare location for AI query
      const userLocation = stateName ? { state: stateName } : null;
      
      // Query AI service
      const aiResponse = await this.aiDiseaseMonitor.fetchLocationSpecificDiseases(userLocation);
      
      if (!aiResponse || !aiResponse.diseases) {
        throw new Error('Invalid AI response received');
      }

      // Cache the response
      await this.cacheResponse(cacheType, stateName, aiResponse);

      console.log(`💾 Cached fresh ${cacheType} data for future use`);
      
      return aiResponse;

    } catch (error) {
      console.error(`❌ Error querying and caching ${cacheType} data:`, error);
      throw error;
    }
  }

  /**
   * Cache AI response in database
   * @param {string} cacheType - 'nationwide' or 'state'
   * @param {string|null} stateName - State name or null
   * @param {Object} aiResponse - AI response to cache
   */
  async cacheResponse(cacheType, stateName, aiResponse) {
    const cacheData = {
      cache_type: cacheType,
      state_name: stateName,
      ai_response_text: aiResponse.rawResponse || JSON.stringify(aiResponse),
      parsed_diseases: aiResponse.diseases,
      query_date: new Date().toISOString().split('T')[0]
    };

    // Use upsert to handle duplicate key conflicts
    const { error } = await this.supabase
      .from('disease_outbreak_cache')
      .upsert(cacheData, {
        onConflict: 'cache_type,state_name,query_date'
      });

    if (error) {
      console.error('Error caching response:', error);
      throw error;
    }
  }

  /**
   * Get all Indian states for selection interface
   * @param {string} searchTerm - Optional search term to filter states
   * @returns {Promise<Array>} List of states
   */
  async getIndianStates(searchTerm = '') {
    let query = this.supabase
      .from('indian_states')
      .select('id, state_name, state_code, region, capital, is_union_territory')
      .order('state_name');

    if (searchTerm) {
      query = query.ilike('state_name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching Indian states:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get states grouped by region for better UX
   * @returns {Promise<Object>} States grouped by region
   */
  async getStatesGroupedByRegion() {
    const { data, error } = await this.supabase
      .from('indian_states')
      .select('id, state_name, state_code, region, is_union_territory')
      .order('region, state_name');

    if (error) {
      console.error('Error fetching states by region:', error);
      throw error;
    }

    // Group by region
    const grouped = {};
    data.forEach(state => {
      const region = state.is_union_territory ? 'Union Territories' : state.region;
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(state);
    });

    return grouped;
  }

  /**
   * Update user's selected state
   * @param {string} phoneNumber - User's phone number
   * @param {number} stateId - Selected state ID
   * @returns {Promise<boolean>} Success status
   */
  async updateUserSelectedState(phoneNumber, stateId) {
    try {
      // First, ensure user has alert preferences record
      const { data: existingPrefs } = await this.supabase
        .from('user_alert_preferences')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (!existingPrefs) {
        // Get state information to populate required fields
        const { data: stateData } = await this.supabase
          .from('indian_states')
          .select('state_name')
          .eq('id', stateId)
          .single();

        if (!stateData) {
          console.error('State not found for ID:', stateId);
          return false;
        }

        // Create new alert preferences with required fields
        const { error: insertError } = await this.supabase
          .from('user_alert_preferences')
          .insert({
            phone_number: phoneNumber,
            state: stateData.state_name,
            district: 'All Districts', // Default value
            pincode: '000000', // Default value
            selected_state_id: stateId,
            alert_enabled: true,
            alert_frequency: 'daily'
          });

        if (insertError) {
          console.error('Error creating user alert preferences:', insertError);
          return false;
        }
      } else {
        // Get state information for update
        const { data: stateData } = await this.supabase
          .from('indian_states')
          .select('state_name')
          .eq('id', stateId)
          .single();

        if (!stateData) {
          console.error('State not found for ID:', stateId);
          return false;
        }

        // Update existing preferences
        const { error: updateError } = await this.supabase
          .from('user_alert_preferences')
          .update({
            state: stateData.state_name,
            selected_state_id: stateId,
            alert_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number', phoneNumber);

        if (updateError) {
          console.error('Error updating user alert preferences:', updateError);
          return false;
        }
      }

      console.log(`✅ Updated user ${phoneNumber} selected state to ID: ${stateId}`);
      return true;

    } catch (error) {
      console.error('Error updating user selected state:', error);
      return false;
    }
  }

  /**
   * Get user's selected state information
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object|null>} User's state info or null
   */
  async getUserSelectedState(phoneNumber) {
    try {
      const { data, error } = await this.supabase
        .from('user_alert_preferences')
        .select(`
          selected_state_id,
          alert_enabled,
          alert_frequency,
          indian_states (
            id,
            state_name,
            state_code,
            region
          )
        `)
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user selected state:', error);
        return null;
      }

      // Debug logging to help identify issues
      if (data) {
        console.log(`🔍 getUserSelectedState for ${phoneNumber}:`, {
          alert_enabled: data.alert_enabled,
          selected_state_id: data.selected_state_id,
          has_state_data: !!data.indian_states,
          state_name: data.indian_states?.state_name
        });
      }

      return data;

    } catch (error) {
      console.error('Error getting user selected state:', error);
      return null;
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStatistics() {
    try {
      const { data, error } = await this.supabase
        .from('disease_outbreak_cache')
        .select('cache_type, state_name, query_date, created_at');

      if (error) {
        console.error('Error fetching cache statistics:', error);
        return null;
      }

      const stats = {
        total_entries: data.length,
        nationwide_entries: data.filter(d => d.cache_type === 'nationwide').length,
        state_entries: data.filter(d => d.cache_type === 'state').length,
        unique_states: [...new Set(data.filter(d => d.state_name).map(d => d.state_name))].length,
        latest_update: data.length > 0 ? Math.max(...data.map(d => new Date(d.created_at))) : null
      };

      return stats;

    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return null;
    }
  }

  /**
   * Turn off alerts and delete user alert data (comprehensive cleanup)
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<boolean>} Success status
   */
  async turnOffAlertsAndDeleteData(phoneNumber) {
    try {
      console.log(`🔕 Turning off alerts and deleting data for user: ${phoneNumber}`);
      
      // First, get all records for this phone number (in case there are duplicates)
      const { data: existingRecords, error: selectError } = await this.supabase
        .from('user_alert_preferences')
        .select('id, phone_number, alert_enabled')
        .eq('phone_number', phoneNumber);

      if (selectError) {
        console.error('Error fetching user records for deletion:', selectError);
        return false;
      }

      if (!existingRecords || existingRecords.length === 0) {
        console.log(`ℹ️ No records found for ${phoneNumber} - already deleted`);
        return true;
      }

      console.log(`📋 Found ${existingRecords.length} record(s) for ${phoneNumber}`);

      // Delete ALL records for this phone number
      const { error: deleteError } = await this.supabase
        .from('user_alert_preferences')
        .delete()
        .eq('phone_number', phoneNumber);

      if (deleteError) {
        console.error('Error deleting user alert preferences:', deleteError);
        return false;
      }

      // Verify deletion was successful
      const { data: verifyRecords } = await this.supabase
        .from('user_alert_preferences')
        .select('id')
        .eq('phone_number', phoneNumber);

      if (verifyRecords && verifyRecords.length > 0) {
        console.error(`⚠️ Deletion verification failed: ${verifyRecords.length} records still exist`);
        return false;
      }

      console.log(`✅ Successfully deleted all alert data for user: ${phoneNumber}`);
      return true;

    } catch (error) {
      console.error('Error turning off alerts and deleting data:', error);
      return false;
    }
  }

  /**
   * Check if user is registered for alerts
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<boolean>} Registration status
   */
  async isUserRegisteredForAlerts(phoneNumber) {
    try {
      const { data, error } = await this.supabase
        .from('user_alert_preferences')
        .select('id, alert_enabled')
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking user registration:', error);
        return false;
      }

      return data && data.alert_enabled;

    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  }

  /**
   * Disable alerts without deleting data (soft disable)
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<boolean>} Success status
   */
  async disableAlerts(phoneNumber) {
    try {
      const { error } = await this.supabase
        .from('user_alert_preferences')
        .update({
          alert_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('phone_number', phoneNumber);

      if (error) {
        console.error('Error disabling alerts:', error);
        return false;
      }

      console.log(`✅ Successfully disabled alerts for user: ${phoneNumber}`);
      return true;

    } catch (error) {
      console.error('Error disabling alerts:', error);
      return false;
    }
  }

  /**
   * Clean up old cache entries (called by background job)
   * @param {number} daysToKeep - Number of days to keep (default: 7)
   * @returns {Promise<number>} Number of entries deleted
   */
  async cleanupOldCache(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('disease_outbreak_cache')
        .delete()
        .lt('query_date', cutoffDateStr);

      if (error) {
        console.error('Error cleaning up old cache:', error);
        return 0;
      }

      const deletedCount = data ? data.length : 0;
      console.log(`🧹 Cleaned up ${deletedCount} old cache entries`);
      
      return deletedCount;

    } catch (error) {
      console.error('Error in cache cleanup:', error);
      return 0;
    }
  }
}

module.exports = DiseaseOutbreakCacheService;
