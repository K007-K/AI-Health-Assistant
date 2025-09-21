const mongoose = require('mongoose');

const outbreakAlertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  disease: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  scope: {
    type: String,
    enum: ['national', 'state', 'district'],
    required: true
  },
  location: {
    state: String,
    district: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  affectedAreas: [{
    state: String,
    districts: [String],
    cases: Number
  }],
  preventionTips: [String],
  symptoms: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1 // 1 = highest priority
  },
  source: {
    type: String,
    default: 'Gemini AI'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours for caching
  },
  sentToUsers: [{
    userId: String,
    phoneNumber: String,
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalRecipients: {
    type: Number,
    default: 0
  },
  queryType: {
    type: String,
    enum: ['daily_national', 'state_specific'],
    required: true
  }
}, {
  timestamps: true
});

// Auto-expire old alerts
outbreakAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for performance
outbreakAlertSchema.index({ alertId: 1 });
outbreakAlertSchema.index({ disease: 1 });
outbreakAlertSchema.index({ 'location.state': 1 });
outbreakAlertSchema.index({ severity: 1 });
outbreakAlertSchema.index({ isActive: 1 });
outbreakAlertSchema.index({ createdAt: -1 });
outbreakAlertSchema.index({ queryType: 1, scope: 1 });

// Methods
outbreakAlertSchema.methods.markAsSent = function(phoneNumber) {
  this.sentToUsers.push({
    phoneNumber: phoneNumber,
    sentAt: new Date()
  });
  this.totalRecipients += 1;
  return this.save();
};

outbreakAlertSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

outbreakAlertSchema.methods.getFormattedAlert = function(language = 'en') {
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
${this.location.state ? `📍 *Location:* ${this.location.state}` : ''}

*🦠 Disease:* ${this.disease}

*📋 Description:*
_${this.description}_

${this.symptoms.length > 0 ? `*🩺 Symptoms to Watch:*
${this.symptoms.map(s => `• ${s}`).join('\n')}` : ''}

${this.preventionTips.length > 0 ? `*🛡️ Prevention Tips:*
${this.preventionTips.map(tip => `• ${tip}`).join('\n')}` : ''}

*📞 Emergency Contact:* 108
*🕐 Last Updated:* ${this.lastUpdated.toLocaleDateString()}

_Stay safe and follow health guidelines. For medical emergencies, contact your nearest healthcare facility._`,

    hi: `${severityEmojis[this.severity]} *${this.title}*

${scopeEmojis[this.scope]} *क्षेत्र:* ${this.scope === 'national' ? 'राष्ट्रीय' : this.scope === 'state' ? 'राज्य' : 'जिला'}
${this.location.state ? `📍 *स्थान:* ${this.location.state}` : ''}

*🦠 बीमारी:* ${this.disease}

*📋 विवरण:*
_${this.description}_

${this.symptoms.length > 0 ? `*🩺 लक्षण:*
${this.symptoms.map(s => `• ${s}`).join('\n')}` : ''}

${this.preventionTips.length > 0 ? `*🛡️ बचाव के तरीके:*
${this.preventionTips.map(tip => `• ${tip}`).join('\n')}` : ''}

*📞 आपातकालीन संपर्क:* 108
*🕐 अंतिम अपडेट:* ${this.lastUpdated.toLocaleDateString()}

_सुरक्षित रहें और स्वास्थ्य दिशानिर्देशों का पालन करें। चिकित्सा आपातकाल के लिए अपनी निकटतम स्वास्थ्य सुविधा से संपर्क करें।_`
  }[language] || this.getFormattedAlert('en');
};

// Static methods
outbreakAlertSchema.statics.getTodaysNationalAlert = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.findOne({
    queryType: 'daily_national',
    scope: 'national',
    createdAt: { $gte: today },
    isActive: true
  }).sort({ createdAt: -1 });
};

outbreakAlertSchema.statics.getStateAlert = function(state) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.findOne({
    queryType: 'state_specific',
    'location.state': state,
    createdAt: { $gte: today },
    isActive: true
  }).sort({ createdAt: -1 });
};

outbreakAlertSchema.statics.createAlert = function(alertData) {
  const alertId = `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return this.create({
    ...alertData,
    alertId
  });
};

module.exports = mongoose.model('OutbreakAlert', outbreakAlertSchema);
