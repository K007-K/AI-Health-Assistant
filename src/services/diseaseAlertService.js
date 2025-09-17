const { createClient } = require('@supabase/supabase-js');
const WhatsAppService = require('./whatsappService');
const MockWhatsAppService = require('./mockWhatsappService');

class DiseaseAlertService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    // Use mock service in test environment
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_WHATSAPP === 'true';
    this.whatsappService = isTestMode ? new MockWhatsAppService() : new WhatsAppService();
  }

  // Register user for disease alerts
  async registerUserForAlerts(phoneNumber, userId, location) {
    console.log(`📍 Registering user ${phoneNumber} for disease alerts`);
    
    try {
      // Check if user already registered
      const { data: existing } = await this.supabase
        .from('user_alert_preferences')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (existing) {
        // Update existing registration
        const { data, error } = await this.supabase
          .from('user_alert_preferences')
          .update({
            state: location.state,
            district: location.district,
            pincode: location.pincode,
            alert_enabled: true,
            updated_at: new Date()
          })
          .eq('phone_number', phoneNumber)
          .select()
          .single();

        if (error) throw error;
        console.log(`✅ Updated alert preferences for ${phoneNumber}`);
        return { success: true, message: 'Alert preferences updated', data };
      } else {
        // Create new registration
        const { data, error } = await this.supabase
          .from('user_alert_preferences')
          .insert({
            phone_number: phoneNumber,
            user_id: userId,
            state: location.state,
            district: location.district,
            pincode: location.pincode,
            alert_enabled: true
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`✅ Registered ${phoneNumber} for disease alerts`);
        return { success: true, message: 'Successfully registered for alerts', data };
      }
    } catch (error) {
      console.error('Error registering user for alerts:', error);
      return { success: false, error: error.message };
    }
  }

  // Unregister user from alerts
  async unregisterUserFromAlerts(phoneNumber) {
    console.log(`🔕 Unregistering user ${phoneNumber} from disease alerts`);
    
    try {
      const { error } = await this.supabase
        .from('user_alert_preferences')
        .delete()
        .eq('phone_number', phoneNumber);

      if (error) throw error;
      
      console.log(`✅ Unregistered ${phoneNumber} from alerts`);
      return { success: true, message: 'Successfully unregistered from alerts' };
      
    } catch (error) {
      console.error('Error unregistering user:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is registered for alerts
  async isUserRegistered(phoneNumber) {
    const { data } = await this.supabase
      .from('user_alert_preferences')
      .select('alert_enabled')
      .eq('phone_number', phoneNumber)
      .single();

    return data?.alert_enabled || false;
  }

  // Send alerts to users based on their location
  async sendLocationBasedAlerts() {
    console.log('🚨 Processing location-based disease alerts...');
    
    try {
      // Get all users with alerts enabled
      const { data: users } = await this.supabase
        .from('user_alert_preferences')
        .select('*')
        .eq('alert_enabled', true);

      if (!users || users.length === 0) {
        console.log('No users registered for alerts');
        return { success: true, alertsSent: 0 };
      }

      let totalAlertsSent = 0;

      for (const user of users) {
        const alertsSent = await this.processUserAlerts(user);
        totalAlertsSent += alertsSent;
      }

      console.log(`✅ Sent ${totalAlertsSent} disease alerts`);
      return { success: true, alertsSent: totalAlertsSent };
      
    } catch (error) {
      console.error('Error sending location-based alerts:', error);
      return { success: false, error: error.message };
    }
  }

  // Process alerts for a specific user
  async processUserAlerts(user) {
    let alertsSent = 0;
    
    try {
      // Get diseases active in user's location
      const diseases = await this.getDiseasesInLocation(
        user.state,
        user.district,
        user.pincode
      );

      for (const diseaseCase of diseases) {
        // Check if we need to send alert for this disease
        if (await this.shouldSendAlert(user, diseaseCase)) {
          await this.sendDiseaseAlert(user, diseaseCase);
          alertsSent++;
        }
      }
      
    } catch (error) {
      console.error(`Error processing alerts for user ${user.phone_number}:`, error);
    }
    
    return alertsSent;
  }

  // Get diseases active in a specific location
  async getDiseasesInLocation(state, district = null, pincode = null) {
    let query = this.supabase
      .from('disease_cases_location')
      .select(`
        *,
        disease:active_diseases(*)
      `)
      .eq('state', state)
      .gt('active_cases', 0);

    // Add district filter if provided
    if (district) {
      query = query.or(`district.eq.${district},district.is.null`);
    }

    // Add pincode filter if provided  
    if (pincode) {
      query = query.or(`pincode.eq.${pincode},pincode.is.null`);
    }

    const { data, error } = await query
      .order('active_cases', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Check if alert should be sent
  async shouldSendAlert(user, diseaseCase) {
    // Check severity threshold
    const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const userThreshold = riskLevels[user.severity_threshold || 'medium'];
    const diseaseRisk = riskLevels[diseaseCase.disease?.risk_level || 'low'];
    
    if (diseaseRisk < userThreshold) {
      return false;
    }

    // Check if alert was recently sent
    const { data: recentAlert } = await this.supabase
      .from('disease_alert_history')
      .select('sent_at')
      .eq('phone_number', user.phone_number)
      .eq('disease_id', diseaseCase.disease.id)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .single();

    if (recentAlert) {
      return false; // Already sent alert recently
    }

    // Check for significant changes (new outbreak or surge)
    if (diseaseCase.week_trend === 'increasing' || diseaseCase.cases_today > 10) {
      return true;
    }

    return false;
  }

  // Send disease alert to user
  async sendDiseaseAlert(user, diseaseCase) {
    const disease = diseaseCase.disease;
    const message = this.formatAlertMessage(user, disease, diseaseCase);
    
    try {
      // Send WhatsApp message
      const messageId = await this.whatsappService.sendMessage(
        user.phone_number,
        message
      );

      // Record alert in history
      await this.supabase
        .from('disease_alert_history')
        .insert({
          user_id: user.user_id,
          phone_number: user.phone_number,
          disease_id: disease.id,
          alert_type: diseaseCase.week_trend === 'increasing' ? 'case_surge' : 'nearby_cases',
          message_content: message,
          location_context: {
            state: diseaseCase.state,
            district: diseaseCase.district,
            pincode: diseaseCase.pincode,
            active_cases: diseaseCase.active_cases
          },
          delivery_status: 'sent',
          whatsapp_message_id: messageId,
          sent_at: new Date()
        });

      // Update user's last alert time
      await this.supabase
        .from('user_alert_preferences')
        .update({
          last_alert_sent: new Date()
        })
        .eq('id', user.id);

      console.log(`✅ Alert sent to ${user.phone_number} for ${disease.disease_name}`);
      
    } catch (error) {
      console.error(`Failed to send alert to ${user.phone_number}:`, error);
      throw error;
    }
  }

  // Format alert message
  formatAlertMessage(user, disease, caseData) {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴',
      critical: '🚨'
    };

    const emoji = riskEmoji[disease.risk_level] || '⚠️';
    const trend = caseData.week_trend === 'increasing' ? '📈 Rising' : 
                 caseData.week_trend === 'decreasing' ? '📉 Declining' : '➡️ Stable';

    let message = `${emoji} *DISEASE ALERT - ${disease.disease_name.toUpperCase()}*\n\n`;
    message += `📍 *Location:* ${caseData.district || caseData.state}\n`;
    message += `📊 *Active Cases:* ${caseData.active_cases || 'Unknown'}\n`;
    message += `📈 *Trend:* ${trend}\n`;
    message += `⚠️ *Risk Level:* ${disease.risk_level.toUpperCase()}\n\n`;
    
    message += `*🦠 Symptoms:*\n`;
    if (disease.symptoms && disease.symptoms.length > 0) {
      disease.symptoms.slice(0, 4).forEach(symptom => {
        message += `• ${symptom}\n`;
      });
    }
    message += `\n`;
    
    message += `*🛡️ Safety Measures:*\n`;
    if (disease.safety_measures && disease.safety_measures.length > 0) {
      disease.safety_measures.slice(0, 3).forEach(measure => {
        message += `• ${measure}\n`;
      });
    }
    message += `\n`;
    
    message += `*💊 Prevention:*\n`;
    if (disease.prevention_methods && disease.prevention_methods.length > 0) {
      disease.prevention_methods.slice(0, 3).forEach(method => {
        message += `• ${method}\n`;
      });
    }
    message += `\n`;
    
    message += `_⚠️ This is a health alert based on current data. Follow local health guidelines._\n`;
    message += `_Reply 'STOP ALERTS' to unsubscribe from disease alerts._`;
    
    return message;
  }

  // Get disease information for display
  async getActiveDiseaseInfo(diseaseName = null) {
    let query = this.supabase
      .from('active_diseases')
      .select(`
        *,
        national_stats:disease_national_stats(*),
        location_cases:disease_cases_location(
          state,
          district,
          active_cases,
          week_trend
        )
      `)
      .eq('is_active', true);

    if (diseaseName) {
      query = query.eq('disease_name', diseaseName);
    }

    const { data, error } = await query
      .order('risk_level', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Format disease information for display
  formatDiseaseInfo(disease, userLocation = null) {
    const stats = disease.national_stats?.[0] || {};
    
    let message = `🦠 *${disease.disease_name.toUpperCase()}*\n\n`;
    
    message += `*📊 National Statistics:*\n`;
    message += `• Total Cases: ${stats.total_cases || 'N/A'}\n`;
    message += `• Active Cases: ${stats.total_active_cases || 'N/A'}\n`;
    message += `• States Affected: ${stats.states_affected || 'N/A'}\n\n`;
    
    if (userLocation) {
      // Find cases in user's location
      const localCases = disease.location_cases?.find(
        loc => loc.state === userLocation.state && 
               (!userLocation.district || loc.district === userLocation.district)
      );
      
      if (localCases) {
        message += `*📍 Your Location (${userLocation.district || userLocation.state}):*\n`;
        message += `• Active Cases: ${localCases.active_cases}\n`;
        message += `• Trend: ${localCases.week_trend}\n\n`;
      }
    }
    
    message += `*🦠 Symptoms:*\n`;
    disease.symptoms?.forEach(symptom => {
      message += `• ${symptom}\n`;
    });
    message += `\n`;
    
    message += `*🛡️ Safety Measures:*\n`;
    disease.safety_measures?.forEach(measure => {
      message += `• ${measure}\n`;
    });
    message += `\n`;
    
    message += `*💊 Prevention:*\n`;
    disease.prevention_methods?.forEach(method => {
      message += `• ${method}\n`;
    });
    message += `\n`;
    
    message += `*🚶 Transmission:* ${disease.transmission_mode || 'Unknown'}\n`;
    message += `*⚠️ Risk Level:* ${disease.risk_level?.toUpperCase() || 'Unknown'}\n\n`;
    
    message += `_Last Updated: ${new Date(disease.last_updated).toLocaleDateString()}_`;
    
    return message;
  }
}

module.exports = DiseaseAlertService;
