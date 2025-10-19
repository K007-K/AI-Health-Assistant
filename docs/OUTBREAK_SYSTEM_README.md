# 🦠 Disease Outbreak Alert System

## Overview

The Disease Outbreak Alert System is a comprehensive real-time monitoring and notification system integrated into the WhatsApp Healthcare Bot. It automatically queries Gemini AI for the latest disease outbreak information, stores it in the database, and broadcasts alerts to users based on their preferences and location.

## 🚀 Key Features

### ✅ **Automated Daily Broadcasts**
- **Schedule**: Every day at 10:00 AM IST
- **Coverage**: Nationwide disease outbreak information
- **Delivery**: Sent to all subscribed users automatically
- **Caching**: Single query result shared with all users

### ✅ **State-Specific Alerts**
- **On-Demand**: Users can request state-specific outbreak information
- **Caching**: State data cached for 24 hours to avoid redundant API calls
- **Personalized**: Tailored information for specific states
- **Efficient**: Reuses cached data for users from the same state

### ✅ **Intelligent AI Integration**
- **Data Source**: Gemini AI for latest outbreak information
- **Smart Queries**: Structured prompts for accurate, actionable data
- **Multilingual**: Supports English and Hindi responses
- **Reliable**: Error handling and fallback mechanisms

### ✅ **User Management**
- **Subscription Control**: Users can enable/disable alerts
- **Quick Commands**: "STOP ALERTS" and "START ALERTS"
- **Broadcast Tracking**: Monitors delivery success rates
- **Rate Limiting**: Batch processing to respect WhatsApp limits

## 📋 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Scheduler     │    │  Outbreak        │    │  Broadcast      │
│   Service       │───▶│  Service         │───▶│  Service        │
│                 │    │                  │    │                 │
│ • Daily 10 AM   │    │ • Gemini AI      │    │ • User Batching │
│ • Cleanup 2 AM  │    │ • Data Processing│    │ • Rate Limiting │
└─────────────────┘    │ • Caching Logic  │    │ • Delivery Track│
                       └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │   Database       │
                       │                  │
                       │ • OutbreakAlert  │
                       │ • User Prefs     │
                       │ • Delivery Logs  │
                       └──────────────────┘
```

## 🛠️ Implementation Details

### **1. Database Schema**

```javascript
OutbreakAlert {
  alertId: String (unique),
  title: String,
  description: String,
  disease: String,
  severity: 'low' | 'medium' | 'high' | 'critical',
  scope: 'national' | 'state' | 'district',
  location: { state, district, country },
  affectedAreas: [{ state, districts, cases }],
  preventionTips: [String],
  symptoms: [String],
  queryType: 'daily_national' | 'state_specific',
  expiresAt: Date (24 hours),
  sentToUsers: [{ phoneNumber, sentAt }],
  totalRecipients: Number
}
```

### **2. Scheduled Jobs**

#### **Daily Outbreak Broadcast (10:00 AM IST)**
```javascript
cron.schedule('0 10 * * *', async () => {
  // 1. Query Gemini for national outbreak data
  // 2. Process and save to database
  // 3. Broadcast to all subscribed users
  // 4. Track delivery statistics
});
```

#### **Cleanup Job (2:00 AM IST)**
```javascript
cron.schedule('0 2 * * *', async () => {
  // Remove alerts older than 7 days
  // Optimize database performance
});
```

### **3. User Interaction Flows**

#### **Disease Alerts Menu**
```
🦠 Disease Outbreak Alerts

📅 Daily National Alerts: Sent every day at 10:00 AM
🏛️ State-Specific Alerts: Request alerts for your state
🚨 Emergency Alerts: Critical outbreak notifications

[🦠 View Outbreaks] [🔔 Enable Alerts] [🔕 Disable Alerts]
```

#### **State-Specific Requests**
- Pattern: "outbreak in Maharashtra", "disease alert for Karnataka"
- Caching: 24-hour cache per state
- Response: Formatted state-specific outbreak information

### **4. Broadcast System**

#### **Batch Processing**
- **Batch Size**: 50 users per batch
- **Delay**: 2 seconds between batches
- **Rate Limiting**: Respects WhatsApp API limits
- **Error Handling**: Tracks failed deliveries

#### **Message Formatting**
```javascript
🚨 HEALTH ALERT BROADCAST

🔴 Dengue Outbreak Alert - [Date]

🇮🇳 Scope: National
📍 Location: Multiple States

🦠 Disease: Dengue

📋 Description:
Seasonal dengue outbreak reported across multiple states...

🩺 Symptoms to Watch:
• High fever (above 101°F)
• Severe headache and body aches
• Nausea and vomiting

🛡️ Prevention Tips:
• Use mosquito nets and repellents
• Remove stagnant water sources
• Wear long-sleeved clothing

📞 Emergency Contact: 108
🕐 Last Updated: [Date]

Stay safe and follow health guidelines...
```

## 🔧 API Endpoints

### **Manual Testing Endpoints**

#### **Trigger Manual Broadcast**
```bash
POST /api/trigger-outbreak-broadcast
```
Response:
```json
{
  "success": true,
  "alert": {
    "alertId": "ALERT_1234567890_abc123",
    "title": "National Disease Outbreak Alert",
    "disease": "Dengue",
    "severity": "medium"
  }
}
```

#### **Get Scheduler Status**
```bash
GET /api/outbreak-status
```
Response:
```json
{
  "initialized": true,
  "timezone": "Asia/Kolkata",
  "jobs": {
    "dailyBroadcast": {
      "schedule": "0 10 * * *",
      "description": "Daily outbreak broadcast at 10:00 AM IST"
    },
    "cleanup": {
      "schedule": "0 2 * * *",
      "description": "Cleanup old alerts at 2:00 AM IST"
    }
  }
}
```

## 🧪 Testing

### **Run Comprehensive Tests**
```bash
node scripts/test-outbreak-system.js
```

### **Test Coverage**
- ✅ Database Models (Creation, Formatting, Expiration)
- ✅ Outbreak Service (National/State Data Fetch, Caching)
- ✅ Broadcast Service (Statistics, Batching, Delivery)
- ✅ Scheduler Service (Initialization, Manual Triggers)
- ✅ User Interaction Flows (State Requests, Caching Logic)

### **Expected Results**
```
📊 TEST RESULTS SUMMARY
========================
Total Tests: 12
Passed: 12
Failed: 0
Success Rate: 100.0%
========================

🎉 ALL TESTS PASSED! Disease Outbreak System is ready for production.
```

## 🚀 Deployment Instructions

### **1. Environment Setup**
Ensure these environment variables are configured:
```bash
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
```

### **2. Database Setup**
The system uses MongoDB with Mongoose. The OutbreakAlert model will be created automatically.

### **3. Start the System**
```bash
npm start
```

The system will automatically:
- Initialize the outbreak scheduler
- Set up daily broadcast jobs
- Configure cleanup routines

### **4. Verify Deployment**
```bash
# Check system health
curl http://localhost:3000/health

# Check scheduler status
curl http://localhost:3000/api/outbreak-status

# Trigger manual test
curl -X POST http://localhost:3000/api/trigger-outbreak-broadcast
```

## 📊 Monitoring & Analytics

### **Key Metrics**
- **Daily Broadcast Success Rate**: % of successful message deliveries
- **User Engagement**: Alert subscription rates
- **System Performance**: API response times, cache hit rates
- **Data Quality**: Gemini AI response accuracy

### **Logs to Monitor**
```bash
# Successful broadcasts
✅ Daily outbreak broadcast completed: 1,234 sent, 12 failed

# Scheduler status
⏰ Daily outbreak scheduler initialized for 10:00 AM IST

# Cache performance
ℹ️ Using cached outbreak data for Maharashtra

# Error tracking
❌ Error in daily outbreak broadcast: [error details]
```

## 🔒 Security & Privacy

### **Data Protection**
- **No Personal Health Data**: Only general outbreak information
- **Anonymized Tracking**: User delivery tracking without personal details
- **Secure API Calls**: Encrypted communication with Gemini AI
- **Rate Limiting**: Prevents system abuse

### **User Privacy**
- **Opt-in System**: Users must explicitly enable alerts
- **Easy Unsubscribe**: "STOP ALERTS" command
- **No Data Retention**: Old alerts automatically deleted after 7 days

## 🆘 Troubleshooting

### **Common Issues**

#### **No Alerts Being Sent**
1. Check scheduler initialization in logs
2. Verify Gemini API key configuration
3. Test manual broadcast trigger
4. Check database connectivity

#### **Users Not Receiving Alerts**
1. Verify user subscription status
2. Check WhatsApp API rate limits
3. Review broadcast batch processing logs
4. Test with manual user message

#### **Gemini API Errors**
1. Verify API key validity
2. Check rate limit status
3. Review prompt formatting
4. Test with manual API call

### **Debug Commands**
```bash
# Test Gemini connectivity
node -e "require('./src/services/outbreakService').fetchNationalOutbreakData().then(console.log)"

# Check database connection
node -e "require('./src/models/OutbreakAlert').find().then(console.log)"

# Manual broadcast test
curl -X POST http://localhost:3000/api/trigger-outbreak-broadcast
```

## 📈 Future Enhancements

### **Planned Features**
- **District-Level Alerts**: More granular location targeting
- **Multi-Disease Tracking**: Separate alerts for different diseases
- **Severity-Based Filtering**: Users choose alert severity levels
- **Historical Data**: Outbreak trend analysis and reporting
- **Integration with Health APIs**: Real-time data from government sources

### **Technical Improvements**
- **Redis Caching**: Faster data retrieval and better scalability
- **Message Queuing**: More robust broadcast delivery system
- **Analytics Dashboard**: Real-time monitoring and reporting
- **A/B Testing**: Optimize message formats and timing

---

## 📞 Support

For technical support or questions about the Disease Outbreak Alert System:

- **Documentation**: This README and inline code comments
- **Testing**: Use the comprehensive test suite
- **Monitoring**: Check system logs and health endpoints
- **Emergency**: Review troubleshooting section

---

**🎯 System Status: Production Ready**
- ✅ Comprehensive testing completed
- ✅ Error handling implemented
- ✅ Monitoring and logging configured
- ✅ User privacy and security ensured
- ✅ Scalable architecture designed
