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

      // Get top 3 affected states from real-time data only (no hardcoding!)
      let mainStates = [];
      
      // Extract states from real additionalDiseases data
      if (additionalDiseases && additionalDiseases.length > 0) {
        const statesFromRealData = new Set();
        
        additionalDiseases.forEach(disease => {
          const locationText = disease.location || disease.affectedAreas || '';
          // Extract state names from location text
          const stateMatches = locationText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
          stateMatches.forEach(state => {
            if (['Kerala', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Haryana', 'Punjab', 'West Bengal', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Madhya Pradesh', 'Himachal Pradesh', 'Uttarakhand', 'Goa', 'Manipur', 'Meghalaya', 'Tripura', 'Mizoram', 'Arunachal Pradesh', 'Nagaland', 'Sikkim', 'Telangana'].includes(state)) {
              statesFromRealData.add(state);
            }
          });
        });
        
        mainStates = Array.from(statesFromRealData).slice(0, 3);
      }
      
      // If no real states found, extract from affectedAreas
      if (mainStates.length === 0) {
        mainStates = affectedAreas?.map(a => a.state).filter(Boolean).slice(0, 3) || [];
      }
      
      // Only proceed if we have real states (no fallback to hardcoded states)
      if (mainStates.length === 0) {
        mainStates = ['Current Monitoring']; // Generic fallback without specific states
      }
      
      // Create concise state summary using real data structure
      const statesSummary = mainStates.map(state => {
        // Find disease data for this state from real API structure
        const stateData = additionalDiseases?.find(d => {
          const locationText = d.location || d.affectedAreas || '';
          return locationText.toLowerCase().includes(state.toLowerCase());
        });
        
        const mainDisease = stateData?.name || stateData?.disease || disease.split(',')[0].trim();
        const casesInfo = stateData?.cases || estimatedCases || '';
        
        return `🇮🇳 *${state}*: ${mainDisease}${casesInfo ? ` (${casesInfo.substring(0, 50)}...)` : ''}`;
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
    
    // For nationwide alerts, create concise overview instead of state-wise messages
    const additionalDiseases = Array.isArray(alertData.additionalDiseases) ? alertData.additionalDiseases : [];
    const sources = Array.isArray(alertData.sources) ? alertData.sources : [];
    const lastUpdated = alertData.lastUpdated || this.query_date || this.updated_at;
    const currentDate = new Date(lastUpdated).toLocaleDateString('en-IN');
    const messages = [];
    
    // Create concise disease summaries
    const diseaseEntries = [];
    
    additionalDiseases.forEach(diseaseInfo => {
      const disease = diseaseInfo.name || diseaseInfo.disease || 'Health Alert';
      const locationText = diseaseInfo.location || diseaseInfo.affectedAreas || 'Various locations';
      const cases = diseaseInfo.cases || diseaseInfo.estimatedCases || 'Under monitoring';
      const symptomsText = diseaseInfo.symptoms || diseaseInfo.briefDescription || '';
      
      // Determine seriousness
      let seriousness = 'Moderate';
      const diseaseKey = disease.toLowerCase();
      if (diseaseKey.includes('brain-eating') || diseaseKey.includes('naegleria') || diseaseKey.includes('meningoencephalitis')) {
        seriousness = 'Critical';
      } else if (diseaseKey.includes('nipah') || diseaseKey.includes('h5n1') || diseaseKey.includes('h1n1') || diseaseKey.includes('melioidosis')) {
        seriousness = 'High';
      } else if (diseaseKey.includes('dengue') || diseaseKey.includes('malaria') || diseaseKey.includes('chikungunya')) {
        seriousness = 'Moderate';
      }
      
      // Clean up location text (remove extra words)
      const cleanLocation = locationText.replace(/Multiple states across India, including/gi, '')
                                       .replace(/Rising cases reported across the country, including/gi, '')
                                       .replace(/Cases reported in/gi, '')
                                       .trim();
      
      // Clean up symptoms (first 2-3 main symptoms)
      const symptoms = symptomsText.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3).slice(0, 3).join(', ');
      
      // Clean up cases (keep it short)
      const shortCases = cases.length > 80 ? cases.substring(0, 80) + '...' : cases;
      
      diseaseEntries.push({
        disease,
        location: cleanLocation,
        cases: shortCases,
        symptoms: symptoms || 'Fever, body aches',
        seriousness
      });
    });
    
    // Split into multiple messages if too long (max 3 diseases per message)
    const maxDiseasesPerMessage = 3;
    for (let i = 0; i < diseaseEntries.length; i += maxDiseasesPerMessage) {
      const chunk = diseaseEntries.slice(i, i + maxDiseasesPerMessage);
      
      let overviewMessage = `🇮🇳 *India Disease Overview* 🇮🇳
_${currentDate} Update_

`;

      chunk.forEach((entry, index) => {
        const emoji = entry.seriousness === 'Critical' ? '🚨' : 
                     entry.seriousness === 'High' ? '⚠️' : '📢';
        
        overviewMessage += `${emoji} *${entry.disease}*
📍 *Places:* ${entry.location}
🩺 *Symptoms:* ${entry.symptoms}
⚖️ *Seriousness:* ${entry.seriousness}
📊 *Cases:* ${entry.cases}

`;
      });
      
      overviewMessage += `*📞 Emergency:* 108 | *🔗 Source:* ${sources?.[0] || 'Health Ministry India'}`;
      
      messages.push(overviewMessage);
    }
    
    // If no messages generated, fallback to general message
    if (messages.length === 0) {
      const fallbackMessage = `📢 *Health Alert Update* 📢
_${currentDate}_

*📋 Overview:*
Monitoring ongoing health situations across India.

*📞 Emergency:* 108 | *🔗 Source:* Health Ministry India
*🕐 Updated:* ${currentDate}`;
      
      messages.push(fallbackMessage);
    }
    
    // Prioritize critical diseases (brain-eating amoeba, Nipah, etc.) and limit to max 6 messages
    const criticalDiseases = ['amoebic', 'meningoencephalitis', 'pam', 'brain-eating', 'nipah', 'h5n1', 'h1n1'];
    
    // Sort messages to prioritize critical diseases
    const sortedMessages = messages.sort((a, b) => {
      const aIsCritical = criticalDiseases.some(critical => a.toLowerCase().includes(critical));
      const bIsCritical = criticalDiseases.some(critical => b.toLowerCase().includes(critical));
      
      if (aIsCritical && !bIsCritical) return -1;
      if (!aIsCritical && bIsCritical) return 1;
      return 0;
    });
    
    return sortedMessages.slice(0, 6); // Allow up to 6 messages to include critical diseases
  }

  // Get formatted alert chunks for WhatsApp (backward compatibility)
  getFormattedAlertChunks(language = 'en') {
    // Use state-based messages for better delivery
    return this.getStateBasedAlertMessages(language);
  }
}

module.exports = OutbreakAlert;
