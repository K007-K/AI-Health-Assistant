const { supabase } = require('../config/database');

// OutbreakAlert model for Supabase
class OutbreakAlert {
  constructor(data) {
    Object.assign(this, data);
  }

  // Static method to create alert
  static async createAlert(alertData) {
    const alertId = `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Map to actual disease_outbreak_cache schema
    const alertRecord = {
      cache_type: alertData.scope === 'national' ? 'nationwide' : 'state',
      state_name: alertData.location?.state || null,
      ai_response_text: `${alertData.title}\n\n${alertData.description}`,
      parsed_diseases: {
        alertId: alertId,
        title: alertData.title,
        description: alertData.description,
        disease: alertData.disease,
        severity: alertData.severity,
        scope: alertData.scope,
        location: alertData.location,
        affectedAreas: alertData.affectedAreas || [],
        preventionTips: alertData.preventionTips || [],
        symptoms: alertData.symptoms || [],
        priority: alertData.priority || 1,
        queryType: alertData.queryType,
        // Rich fields from Gemini output
        estimatedCases: alertData.estimatedCases || null,
        lastUpdated: alertData.lastUpdated || new Date().toISOString(),
        dataAge: alertData.dataAge || null,
        dataFreshness: alertData.dataFreshness || null,
        searchDate: alertData.searchDate || null,
        sources: alertData.sources || [],
        additionalDiseases: alertData.additionalDiseases || []
      },
      query_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      created_at: new Date(),
      updated_at: new Date()
    };

    const { data, error } = await supabase
      .from('disease_outbreak_cache')
      .insert([alertRecord])
      .select()
      .single();

    if (error) throw error;
    
    // Return with alertId from parsed_diseases
    const result = new OutbreakAlert(data);
    result.alert_id = alertId;
    return result;
  }

  // Get today's national alert
  static async getTodaysNationalAlert() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data, error } = await supabase
      .from('disease_outbreak_cache')
      .select('*')
      .eq('cache_type', 'nationwide')
      .eq('query_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data ? new OutbreakAlert(data) : null;
  }

  // Get state alert
  static async getStateAlert(state) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data, error } = await supabase
      .from('disease_outbreak_cache')
      .select('*')
      .eq('cache_type', 'state')
      .eq('state_name', state)
      .eq('query_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new OutbreakAlert(data) : null;
  }

  // Mark as sent to user
  async markAsSent(phoneNumber) {
    // Update the parsed_diseases JSON with sent user info
    const updatedParsedDiseases = {
      ...this.parsed_diseases,
      sentUsers: [...(this.parsed_diseases?.sentUsers || []), {
        phoneNumber: phoneNumber,
        sentAt: new Date()
      }],
      totalRecipients: (this.parsed_diseases?.totalRecipients || 0) + 1
    };

    const { data, error } = await supabase
      .from('disease_outbreak_cache')
      .update({
        parsed_diseases: updatedParsedDiseases,
        updated_at: new Date()
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, data);
    return this;
  }

  // Check if expired (using query_date)
  isExpired() {
    const today = new Date().toISOString().split('T')[0];
    return this.query_date < today;
  }

  // Get formatted alert for WhatsApp (concise version under 4096 chars)
  getFormattedAlert(language = 'en') {
    // Get data from parsed_diseases JSON or fallback to direct properties
    const alertData = this.parsed_diseases || this;

    const scope = (alertData.scope || this.cache_type || 'nationwide').toLowerCase();
    const isNationwide = scope === 'nationwide' || scope === 'national' || this.cache_type === 'nationwide';
    const title = alertData.title || 'Disease Outbreak Alert';
    const description = alertData.description || this.ai_response_text || '';
    const disease = alertData.disease || 'Various';
    const symptoms = Array.isArray(alertData.symptoms) ? alertData.symptoms.slice(0, 5) : []; // Limit symptoms
    const preventionTips = Array.isArray(alertData.preventionTips) ? alertData.preventionTips.slice(0, 4) : []; // Limit tips
    const location = alertData.location || { state: this.state_name };
    const affectedAreas = Array.isArray(alertData.affectedAreas) ? alertData.affectedAreas : [];
    const additionalDiseases = Array.isArray(alertData.additionalDiseases) ? alertData.additionalDiseases : [];
    const sources = Array.isArray(alertData.sources) ? alertData.sources : [];
    const lastUpdated = alertData.lastUpdated || this.query_date || this.updated_at;
    const estimatedCases = alertData.estimatedCases;

    const currentDate = new Date(lastUpdated).toLocaleDateString('en-IN');

    if (isNationwide) {
      // Concise nationwide alert format
      let messageEn = `📢 *Public Health Alert - ${currentDate}* 📢
_Nationwide health advisory summary_

`;

      // Get top 3 affected states only
      const mainStates = affectedAreas?.map(a => a.state).filter(Boolean).slice(0, 3) || ['Kerala', 'Delhi', 'Maharashtra'];
      
      // Create concise state summary
      const statesSummary = mainStates.map(state => {
        const stateData = additionalDiseases?.find(d => d.affectedAreas?.includes(state));
        const mainDisease = stateData?.disease || disease.split(',')[0].trim();
        return `🇮🇳 *${state}*: ${mainDisease}${estimatedCases ? ` (${estimatedCases})` : ''}`;
      }).join('\n');

      messageEn += statesSummary + '\n\n';

      // Concise symptoms (top 5)
      if (symptoms.length > 0) {
        messageEn += `*🩺 Key Symptoms:*\n${symptoms.slice(0, 5).map(s => `• ${s}`).join('\n')}\n\n`;
      }

      // Concise prevention (top 4)
      if (preventionTips.length > 0) {
        messageEn += `*🛡️ Prevention:*\n${preventionTips.slice(0, 4).map(p => `• ${p}`).join('\n')}\n\n`;
      }

      messageEn += `*📞 Emergency:* 108 | *🔗 Source:* ${sources?.[0] || 'Health Ministry'}
*🕐 Updated:* ${currentDate}`;

      return messageEn;

    } else {
      // Concise state-based alert format
      const stateName = location?.state || 'State';
      const primaryDisease = disease.split(',')[0].trim();
      
      const primaryArea = affectedAreas?.[0];
      const primaryLocation = primaryArea?.districts?.[0] || primaryArea?.state || `${stateName} districts`;

      // Create concise description
      const alertType = description.includes('emergency') ? 'Health Emergency' : 'Health Advisory';
      
      const messageEn = `📢 *${alertType} - ${currentDate}* 📢

*📍 ${stateName}* - ${primaryDisease}
*🗺️ Area:* ${primaryLocation}${estimatedCases ? ` (${estimatedCases})` : ''}

*🩺 Key Symptoms:*
${symptoms.slice(0, 5).map(s => `• ${s}`).join('\n')}

*🛡️ Prevention:*
${preventionTips.slice(0, 4).map(tip => `• ${tip}`).join('\n')}

*📞 Emergency:* 108 | *🔗 Source:* ${sources?.[0] || 'Health Dept'}
*🕐 Updated:* ${currentDate}`;

      return messageEn;
    }
  }

  // Get individual state-based alert messages for WhatsApp
  getStateBasedAlertMessages(language = 'en') {
    const alertData = this.parsed_diseases || this;
    const scope = (alertData.scope || this.cache_type || 'nationwide').toLowerCase();
    const isNationwide = scope === 'nationwide' || scope === 'national' || this.cache_type === 'nationwide';
    
    if (!isNationwide) {
      // For state alerts, return single message
      return [this.getFormattedAlert(language)];
    }
    
    // For nationwide alerts, create separate messages for each state
    const disease = alertData.disease || 'Various';
    const symptoms = Array.isArray(alertData.symptoms) ? alertData.symptoms.slice(0, 5) : [];
    const preventionTips = Array.isArray(alertData.preventionTips) ? alertData.preventionTips.slice(0, 4) : [];
    const affectedAreas = Array.isArray(alertData.affectedAreas) ? alertData.affectedAreas : [];
    const additionalDiseases = Array.isArray(alertData.additionalDiseases) ? alertData.additionalDiseases : [];
    const sources = Array.isArray(alertData.sources) ? alertData.sources : [];
    const lastUpdated = alertData.lastUpdated || this.query_date || this.updated_at;
    const estimatedCases = alertData.estimatedCases;
    const currentDate = new Date(lastUpdated).toLocaleDateString('en-IN');
    
    const messages = [];
    
    // Get top 3 affected states
    const mainStates = affectedAreas?.map(a => a.state).filter(Boolean).slice(0, 3) || ['Kerala', 'Delhi', 'Maharashtra'];
    
    mainStates.forEach((state, index) => {
      // Find state-specific disease info
      const stateData = additionalDiseases?.find(d => 
        d.affectedAreas?.some(area => 
          (typeof area === 'string' ? area : area.state) === state
        )
      );
      
      const mainDisease = stateData?.disease || disease.split(',')[0].trim();
      const stateDescription = stateData?.briefDescription || `Ongoing health monitoring for ${mainDisease}`;
      
      let stateMessage = `📢 *Health Alert - ${state}* 📢
_${currentDate} Update_

🇮🇳 *${state} Health Advisory*
*🦠 Primary Concern:* ${mainDisease}
${estimatedCases ? `*📊 Status:* ${estimatedCases}` : '*📊 Status:* Under monitoring'}

*🔍 Overview:*
${stateDescription}

`;

      // Add symptoms if available
      if (symptoms.length > 0) {
        stateMessage += `*🩺 Key Symptoms:*
${symptoms.slice(0, 4).map(s => `• ${s}`).join('\n')}

`;
      }

      // Add prevention tips
      if (preventionTips.length > 0) {
        stateMessage += `*🛡️ Prevention:*
${preventionTips.slice(0, 3).map(p => `• ${p}`).join('\n')}

`;
      }

      stateMessage += `*📞 Emergency:* 108 | *🔗 Source:* ${sources?.[0] || 'Health Ministry'}
*🕐 Updated:* ${currentDate}`;

      messages.push(stateMessage);
    });
    
    return messages;
  }

  // Get formatted alert chunks for WhatsApp (backward compatibility)
  getFormattedAlertChunks(language = 'en') {
    // Use state-based messages for better delivery
    return this.getStateBasedAlertMessages(language);
  }
}

module.exports = OutbreakAlert;
