const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'te', 'ta', 'or'],
    default: 'en'
  },
  scriptPreference: {
    type: String,
    enum: ['native', 'transliteration'],
    default: 'native'
  },
  conversationMode: {
    type: String,
    enum: ['general', 'symptom_checker', 'health_tips', 'disease_alerts', 'myth_fact'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  alertsEnabled: {
    type: Boolean,
    default: true
  },
  location: {
    state: String,
    district: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  preferences: {
    easyMode: {
      type: Boolean,
      default: false
    },
    longTextMode: {
      type: Boolean,
      default: false
    },
    audioOptimized: {
      type: Boolean,
      default: false
    }
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  totalInteractions: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  },
  feedback: [{
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  indexes: [
    { phoneNumber: 1 },
    { language: 1 },
    { isActive: 1 },
    { alertsEnabled: 1 },
    { 'location.state': 1 },
    { lastInteraction: -1 }
  ]
});

// Methods
userSchema.methods.updateLastInteraction = function() {
  this.lastInteraction = new Date();
  this.totalInteractions += 1;
  return this.save();
};

userSchema.methods.enableAlerts = function() {
  this.alertsEnabled = true;
  if (this.unsubscribedAt) {
    this.unsubscribedAt = undefined;
  }
  return this.save();
};

userSchema.methods.disableAlerts = function() {
  this.alertsEnabled = false;
  this.unsubscribedAt = new Date();
  return this.save();
};

userSchema.methods.setLocation = function(state, district = null, pincode = null) {
  this.location = {
    state: state,
    district: district,
    pincode: pincode,
    country: 'India'
  };
  return this.save();
};

userSchema.methods.addFeedback = function(rating, comment = '') {
  this.feedback.push({
    rating: rating,
    comment: comment,
    timestamp: new Date()
  });
  return this.save();
};

// Static methods
userSchema.statics.findByPhoneNumber = function(phoneNumber) {
  return this.findOne({ phoneNumber: phoneNumber });
};

userSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true });
};

userSchema.statics.getSubscribedUsers = function() {
  return this.find({ 
    isActive: true, 
    alertsEnabled: true 
  });
};

userSchema.statics.getUsersByState = function(state) {
  return this.find({ 
    'location.state': state,
    isActive: true,
    alertsEnabled: true 
  });
};

userSchema.statics.createOrUpdateUser = function(phoneNumber, userData = {}) {
  return this.findOneAndUpdate(
    { phoneNumber: phoneNumber },
    { 
      ...userData,
      lastInteraction: new Date(),
      $inc: { totalInteractions: 1 }
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    // Ensure phone number is properly formatted
    if (!this.phoneNumber.startsWith('+')) {
      this.phoneNumber = '+91' + this.phoneNumber.replace(/^\+?91/, '');
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
