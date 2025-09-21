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

  // Get formatted alert for WhatsApp
  getFormattedAlert(language = 'en') {
    // Get data from parsed_diseases JSON or fallback to direct properties
    const alertData = this.parsed_diseases || this;

    const scope = (alertData.scope || this.cache_type || 'nationwide').toLowerCase();
    const isNationwide = scope === 'nationwide' || scope === 'national' || this.cache_type === 'nationwide';
    const title = alertData.title || 'Disease Outbreak Alert';
    const description = alertData.description || this.ai_response_text || '';
    const disease = alertData.disease || 'Various';
    const symptoms = Array.isArray(alertData.symptoms) ? alertData.symptoms : [];
    const preventionTips = Array.isArray(alertData.preventionTips) ? alertData.preventionTips : [];
    const location = alertData.location || { state: this.state_name };
    const affectedAreas = Array.isArray(alertData.affectedAreas) ? alertData.affectedAreas : [];
    const additionalDiseases = Array.isArray(alertData.additionalDiseases) ? alertData.additionalDiseases : [];
    const sources = Array.isArray(alertData.sources) ? alertData.sources : [];
    const lastUpdated = alertData.lastUpdated || this.query_date || this.updated_at;
    const estimatedCases = alertData.estimatedCases;

    const currentDate = new Date(lastUpdated).toLocaleDateString('en-IN');

    if (isNationwide) {
      // Nationwide alert format
      let messageEn = `📢 *Public Health Alert - ${currentDate}* 📢
_A state-wise summary of ongoing health advisories._

`;

      // Group diseases by affected states
      const stateGroups = {};
      
      // Process affected areas
      if (affectedAreas && affectedAreas.length > 0) {
        affectedAreas.forEach(area => {
          const stateName = area.state || 'Multiple States';
          if (!stateGroups[stateName]) {
            stateGroups[stateName] = {
              diseases: [],
              symptoms: new Set(),
              prevention: new Set()
            };
          }
        });
      }

      // Add main disease info
      const mainStates = affectedAreas?.map(a => a.state).filter(Boolean) || ['Kerala', 'Delhi', 'Maharashtra'];
      mainStates.forEach(state => {
        if (!stateGroups[state]) {
          stateGroups[state] = { diseases: [], symptoms: new Set(), prevention: new Set() };
        }
        stateGroups[state].diseases.push(`${disease}: ${estimatedCases || 'Cases under monitoring'}`);
      });

      // Add additional diseases
      if (additionalDiseases && additionalDiseases.length > 0) {
        additionalDiseases.forEach(addDisease => {
          const areas = addDisease.affectedAreas || mainStates;
          areas.forEach(area => {
            const stateName = typeof area === 'string' ? area : area.state || 'Multiple States';
            if (!stateGroups[stateName]) {
              stateGroups[stateName] = { diseases: [], symptoms: new Set(), prevention: new Set() };
            }
            stateGroups[stateName].diseases.push(`${addDisease.disease}: ${addDisease.briefDescription || 'Ongoing surveillance'}`);
          });
        });
      }

      // Add symptoms and prevention to all states
      symptoms.forEach(symptom => {
        Object.values(stateGroups).forEach(group => group.symptoms.add(symptom));
      });
      preventionTips.forEach(tip => {
        Object.values(stateGroups).forEach(group => group.prevention.add(tip));
      });

      // Generate state-wise sections
      Object.entries(stateGroups).forEach(([stateName, data]) => {
        messageEn += `🇮🇳 *${stateName}*
*🦠 Key Diseases:*
${data.diseases.map(d => ` • ${d}`).join('\n')}

*🩺 Symptoms to Watch For:*
_If you experience any of these symptoms, seek immediate medical attention:_
${Array.from(data.symptoms).map(s => ` • ${s}`).join('\n')}

*🛡️ Prevention & Advisory:*
${Array.from(data.prevention).map(p => ` • ${p}`).join('\n')}

*🔗 Official Source:* ${sources?.[0] || 'Ministry of Health & Family Welfare'}

`;
      });

      messageEn += `*📞 Emergency:* 108
*🕐 Last Updated:* ${currentDate}`;

      return messageEn;

    } else {
      // State-based alert format
      const stateName = location?.state || 'State';
      const primaryDisease = disease.split(',')[0].trim();
      const seasonalDiseases = disease.split(',').slice(1).map(d => d.trim()).join(' and ') || 'seasonal diseases';
      
      const primaryArea = affectedAreas?.[0];
      const primaryLocation = primaryArea ? 
        `${primaryArea.districts?.[0] || primaryArea.state}${primaryArea.districts?.[0] ? ` (${primaryDisease})` : ''}` : 
        `${stateName} districts`;

      const otherAreas = affectedAreas?.slice(1) || [];
      const otherAreasText = otherAreas.length > 0 ? 
        otherAreas.map(area => `${area.districts?.[0] || area.state} (${seasonalDiseases})`).join('\n • ') : 
        `Other areas (${seasonalDiseases})`;

      const messageEn = `📢 *Public Health Alert - ${currentDate}* 📢

*📍 Location:* ${stateName}

*🦠 Health Concerns Overview*
As of ${currentDate}, health authorities in ${stateName} are managing ${description.includes('emergency') ? 'a health emergency' : 'ongoing health concerns'} due to ${primaryDisease} in affected areas. The state is also addressing seasonal diseases like ${seasonalDiseases}, especially in areas with water stagnation.

*🗺️ Affected Areas:*
 • ${primaryLocation}
 • ${otherAreasText}

*🩺 Symptoms to Watch For:*
_If you experience any of the following, seek medical advice:_
${symptoms.map(s => ` • ${s}`).join('\n')}

*🛡️ Prevention & Safety Measures:*
${preventionTips.map(tip => ` • ${tip}`).join('\n')}

*📞 Emergency Contact:* 108
*🕐 Last Updated:* ${currentDate}`;

      return messageEn;
    }
  }
}

module.exports = OutbreakAlert;
