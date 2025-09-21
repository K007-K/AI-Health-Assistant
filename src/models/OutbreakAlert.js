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

    const severityEmojis = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' };
    const scopeEmojis = { national: '🇮🇳', nationwide: '🇮🇳', state: '🏛️', district: '🏘️' };

    const scope = (alertData.scope || this.cache_type || 'nationwide').toLowerCase();
    const severity = (alertData.severity || 'medium').toLowerCase();
    const title = alertData.title || 'Disease Outbreak Alert';
    const description = alertData.description || this.ai_response_text || '';
    const disease = alertData.disease || 'Various';
    const symptoms = Array.isArray(alertData.symptoms) ? alertData.symptoms : [];
    const preventionTips = Array.isArray(alertData.preventionTips) ? alertData.preventionTips : [];
    const location = alertData.location || { state: this.state_name };
    const affectedAreas = Array.isArray(alertData.affectedAreas) ? alertData.affectedAreas : [];
    const additional = Array.isArray(alertData.additionalDiseases) ? alertData.additionalDiseases : [];
    const sources = Array.isArray(alertData.sources) ? alertData.sources : [];
    const lastUpdated = alertData.lastUpdated || this.query_date || this.updated_at;
    const estimatedCases = alertData.estimatedCases;
    const dataFreshness = alertData.dataFreshness;

    const locationLine = location?.state ? `\n📍 *Location:* ${location.state}` : '';
    const scopeLine = `${scopeEmojis[scope] || '🗺️'} *Scope:* ${scope === 'nationwide' ? 'National' : scope.charAt(0).toUpperCase() + scope.slice(1)}`;

    const affectedLine = affectedAreas.length > 0
      ? `\n🗺️ *Affected Areas:* ${affectedAreas
          .map(a => a.state ? `${a.state}${a.districts && a.districts.length ? ` (${a.districts.join(', ')})` : ''}` : a)
          .join(', ')}`
      : '';

    const keyFacts = [
      estimatedCases ? `• Estimated cases: ${estimatedCases}` : null,
      dataFreshness ? `• Data freshness: ${dataFreshness}` : null,
    ].filter(Boolean).join('\n');

    const additionalBlock = additional.length > 0
      ? `\n\n📰 *Other Notable Outbreaks:*
${additional.slice(0, 5).map((d, idx) => {
  const name = d.disease || d.name || 'Disease';
  const sev = (d.severity || d.riskLevel || '').toString();
  const areas = Array.isArray(d.affectedAreas || d.affectedDistricts) ? (d.affectedAreas || d.affectedDistricts).join(', ') : '';
  const last = d.lastReported || d.lastUpdated || '';
  return `• ${name}${sev ? ` — ${sev}` : ''}${areas ? ` — ${areas}` : ''}${last ? ` (last: ${last})` : ''}`;
}).join('\n')}`
      : '';

    const sourcesBlock = sources.length > 0
      ? `\n\n🔎 *Sources:*
${sources.slice(0, 3).map((s, i) => `• ${typeof s === 'string' ? s : (s.title || s.name || 'Source')} `).join('\n')}`
      : '';

    const symptomsBlock = symptoms.length > 0
      ? `\n\n*🩺 Symptoms to Watch:*
${symptoms.map(s => `• ${s}`).join('\n')}`
      : '';

    const preventionBlock = preventionTips.length > 0
      ? `\n\n*🛡️ Prevention Tips:*
${preventionTips.map(tip => `• ${tip}`).join('\n')}`
      : '';

    const messageEn = `${severityEmojis[severity] || '🟠'} *${title}*
${scopeLine}${locationLine}

*🦠 Disease:* ${disease}

*📋 Overview:*
_${description}_
${affectedLine}
${keyFacts ? `\n*Key facts:*\n${keyFacts}` : ''}
${symptomsBlock}
${preventionBlock}
${additionalBlock}
${sourcesBlock}

*📞 Emergency:* 108
*🕐 Last Updated:* ${new Date(lastUpdated).toLocaleDateString('en-IN')}

_Stay safe. For medical emergencies, contact your nearest healthcare facility._`;

    if (language === 'en') return messageEn;

    // Keep Hindi fallback minimal but functional (can be expanded similarly)
    const messageHi = `${severityEmojis[severity] || '🟠'} *${title}*
${scopeEmojis[scope] || '🗺️'} *क्षेत्र:* ${scope === 'nationwide' ? 'राष्ट्रीय' : scope === 'state' ? 'राज्य' : 'जिला'}${location?.state ? `\n📍 *स्थान:* ${location.state}` : ''}

*🦠 बीमारी:* ${disease}

*📋 विवरण:*
_${description}_

*🕐 अंतिम अपडेट:* ${new Date(lastUpdated).toLocaleDateString('hi-IN')}`;

    return messageHi;
  }
}

module.exports = OutbreakAlert;
