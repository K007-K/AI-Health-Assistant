const { supabase } = require('../config/database');

// OutbreakAlert model for Supabase
class OutbreakAlert {
  constructor(data) {
    Object.assign(this, data);
  }

  // Static method to create alert
  static async createAlert(alertData) {
    const alertId = `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alertRecord = {
      alert_id: alertId,
      title: alertData.title,
      description: alertData.description,
      disease: alertData.disease,
      severity: alertData.severity,
      scope: alertData.scope,
      location: alertData.location,
      affected_areas: alertData.affectedAreas || [],
      prevention_tips: alertData.preventionTips || [],
      symptoms: alertData.symptoms || [],
      query_type: alertData.queryType,
      priority: alertData.priority || 1,
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      sent_to_users: [],
      total_recipients: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    const { data, error } = await supabase
      .from('outbreak_alerts')
      .insert([alertRecord])
      .select()
      .single();

    if (error) throw error;
    return new OutbreakAlert(data);
  }

  // Get today's national alert
  static async getTodaysNationalAlert() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .eq('query_type', 'daily_national')
      .eq('scope', 'national')
      .eq('is_active', true)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data ? new OutbreakAlert(data) : null;
  }

  // Get state alert
  static async getStateAlert(state) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .eq('query_type', 'state_specific')
      .eq('location->state', state)
      .eq('is_active', true)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new OutbreakAlert(data) : null;
  }

  // Mark as sent to user
  async markAsSent(phoneNumber) {
    const sentUsers = this.sent_to_users || [];
    sentUsers.push({
      phoneNumber: phoneNumber,
      sentAt: new Date()
    });

    const { data, error } = await supabase
      .from('outbreak_alerts')
      .update({
        sent_to_users: sentUsers,
        total_recipients: (this.total_recipients || 0) + 1,
        updated_at: new Date()
      })
      .eq('alert_id', this.alert_id)
      .select()
      .single();

    if (error) throw error;
    Object.assign(this, data);
    return this;
  }

  // Check if expired
  isExpired() {
    return new Date() > new Date(this.expires_at);
  }

  // Get formatted alert for WhatsApp
  getFormattedAlert(language = 'en') {
    const severityEmojis = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    const scopeEmojis = {
      national: '🇮🇳',
      state: '🏛️',
      district: '🏘️'
    };

    return {
      en: `${severityEmojis[this.severity]} *${this.title}*

${scopeEmojis[this.scope]} *Scope:* ${this.scope.charAt(0).toUpperCase() + this.scope.slice(1)}
${this.location && this.location.state ? `📍 *Location:* ${this.location.state}` : ''}

*🦠 Disease:* ${this.disease}

*📋 Description:*
_${this.description}_

${this.symptoms && this.symptoms.length > 0 ? `*🩺 Symptoms to Watch:*
${this.symptoms.map(s => `• ${s}`).join('\n')}` : ''}

${this.prevention_tips && this.prevention_tips.length > 0 ? `*🛡️ Prevention Tips:*
${this.prevention_tips.map(tip => `• ${tip}`).join('\n')}` : ''}

*📞 Emergency Contact:* 108
*🕐 Last Updated:* ${new Date(this.updated_at).toLocaleDateString()}

_Stay safe and follow health guidelines. For medical emergencies, contact your nearest healthcare facility._`,

      hi: `${severityEmojis[this.severity]} *${this.title}*

${scopeEmojis[this.scope]} *क्षेत्र:* ${this.scope === 'national' ? 'राष्ट्रीय' : this.scope === 'state' ? 'राज्य' : 'जिला'}
${this.location && this.location.state ? `📍 *स्थान:* ${this.location.state}` : ''}

*🦠 बीमारी:* ${this.disease}

*📋 विवरण:*
_${this.description}_

${this.symptoms && this.symptoms.length > 0 ? `*🩺 लक्षण:*
${this.symptoms.map(s => `• ${s}`).join('\n')}` : ''}

${this.prevention_tips && this.prevention_tips.length > 0 ? `*🛡️ बचाव के तरीके:*
${this.prevention_tips.map(tip => `• ${tip}`).join('\n')}` : ''}

*📞 आपातकालीन संपर्क:* 108
*🕐 अंतिम अपडेट:* ${new Date(this.updated_at).toLocaleDateString()}

_सुरक्षित रहें और स्वास्थ्य दिशानिर्देशों का पालन करें। चिकित्सा आपातकाल के लिए अपनी निकटतम स्वास्थ्य सुविधा से संपर्क करें।_`
    }[language] || this.getFormattedAlert('en');
  }
}

module.exports = OutbreakAlert;
