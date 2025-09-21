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
        queryType: alertData.queryType
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
    
    const severityEmojis = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    const scopeEmojis = {
      national: '🇮🇳',
      nationwide: '🇮🇳',
      state: '🏛️',
      district: '🏘️'
    };

    const scope = alertData.scope || this.cache_type;
    const severity = alertData.severity || 'medium';
    const title = alertData.title || 'Disease Outbreak Alert';
    const description = alertData.description || this.ai_response_text;
    const disease = alertData.disease || 'Various';
    const symptoms = alertData.symptoms || [];
    const preventionTips = alertData.preventionTips || [];
    const location = alertData.location || { state: this.state_name };

    return {
      en: `${severityEmojis[severity]} *${title}*

${scopeEmojis[scope]} *Scope:* ${scope === 'nationwide' ? 'National' : scope.charAt(0).toUpperCase() + scope.slice(1)}
${location && location.state ? `📍 *Location:* ${location.state}` : ''}

*🦠 Disease:* ${disease}

*📋 Description:*
_${description}_

${symptoms && symptoms.length > 0 ? `*🩺 Symptoms to Watch:*
${symptoms.map(s => `• ${s}`).join('\n')}` : ''}

${preventionTips && preventionTips.length > 0 ? `*🛡️ Prevention Tips:*
${preventionTips.map(tip => `• ${tip}`).join('\n')}` : ''}

*📞 Emergency Contact:* 108
*🕐 Last Updated:* ${new Date(this.updated_at).toLocaleDateString()}

_Stay safe and follow health guidelines. For medical emergencies, contact your nearest healthcare facility._`,

      hi: `${severityEmojis[severity]} *${title}*

${scopeEmojis[scope]} *क्षेत्र:* ${scope === 'nationwide' ? 'राष्ट्रीय' : scope === 'state' ? 'राज्य' : 'जिला'}
${location && location.state ? `📍 *स्थान:* ${location.state}` : ''}

*🦠 बीमारी:* ${disease}

*📋 विवरण:*
_${description}_

${symptoms && symptoms.length > 0 ? `*🩺 लक्षण:*
${symptoms.map(s => `• ${s}`).join('\n')}` : ''}

${preventionTips && preventionTips.length > 0 ? `*🛡️ बचाव के तरीके:*
${preventionTips.map(tip => `• ${tip}`).join('\n')}` : ''}

*📞 आपातकालीन संपर्क:* 108
*🕐 अंतिम अपडेट:* ${new Date(this.updated_at).toLocaleDateString()}

_सुरक्षित रहें और स्वास्थ्य दिशानिर्देशों का पालन करें। चिकित्सा आपातकाल के लिए अपनी निकटतम स्वास्थ्य सुविधा से संपर्क करें।_`
    }[language] || this.getFormattedAlert('en');
  }
}

module.exports = OutbreakAlert;
