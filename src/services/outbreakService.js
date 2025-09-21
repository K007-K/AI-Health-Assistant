const { GoogleGenerativeAI } = require('@google/generative-ai');
const OutbreakAlert = require('../models/OutbreakAlert');
const cron = require('node-cron');

class OutbreakService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.initializeScheduler();
  }

  // Initialize daily scheduler for 10 AM
  initializeScheduler() {
    // Schedule daily at 10:00 AM IST
    cron.schedule('0 10 * * *', async () => {
      console.log('🕙 Running daily outbreak check at 10:00 AM IST');
      try {
        await this.fetchAndBroadcastNationalOutbreaks();
      } catch (error) {
        console.error('❌ Error in daily outbreak check:', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    console.log('⏰ Daily outbreak scheduler initialized for 10:00 AM IST');
  }

  // Fetch latest national outbreak data from Gemini
  async fetchNationalOutbreakData() {
    const prompt = `You are a disease outbreak monitoring system for India. Provide the latest disease outbreak information for India as of today's date.

CRITICAL INSTRUCTIONS:
1. Focus on ACTIVE, CURRENT outbreaks happening NOW in India
2. Include only diseases with significant public health impact
3. Provide accurate, factual information from reliable sources
4. If no major outbreaks are currently active, mention seasonal diseases to watch for

Required JSON Response Format:
{
  "hasActiveOutbreaks": true/false,
  "nationalAlert": {
    "title": "Disease Outbreak Alert - [Date]",
    "description": "Brief overview of current outbreak situation in India",
    "primaryDisease": "Main disease of concern",
    "severity": "low/medium/high/critical",
    "affectedStates": ["State1", "State2"],
    "symptoms": ["symptom1", "symptom2", "symptom3"],
    "preventionTips": ["tip1", "tip2", "tip3", "tip4"],
    "estimatedCases": "approximate number or range",
    "lastUpdated": "current date"
  },
  "additionalDiseases": [
    {
      "disease": "Disease name",
      "severity": "low/medium/high",
      "affectedAreas": ["areas"],
      "briefDescription": "short description"
    }
  ]
}

Focus on diseases like:
- Dengue, Chikungunya, Malaria (monsoon season)
- H1N1, COVID-19 variants
- Seasonal flu outbreaks
- Food poisoning outbreaks
- Water-borne diseases
- Any emerging infectious diseases

Provide current, actionable health information for Indian citizens.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const outbreakData = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully fetched national outbreak data');
      return outbreakData;
    } catch (error) {
      console.error('❌ Error fetching national outbreak data:', error);
      throw error;
    }
  }

  // Fetch state-specific outbreak data from Gemini
  async fetchStateOutbreakData(state) {
    const prompt = `You are a disease outbreak monitoring system for India. Provide the latest disease outbreak information specifically for ${state} state as of today's date.

CRITICAL INSTRUCTIONS:
1. Focus ONLY on ${state} state
2. Include active outbreaks, seasonal diseases, and health advisories for ${state}
3. Provide state-specific prevention tips and local health contacts
4. Include district-wise information if available

Required JSON Response Format:
{
  "hasStateOutbreaks": true/false,
  "stateAlert": {
    "title": "${state} Disease Outbreak Update - [Date]",
    "description": "Current disease outbreak situation in ${state}",
    "primaryDisease": "Main disease of concern in ${state}",
    "severity": "low/medium/high/critical",
    "affectedDistricts": ["District1", "District2"],
    "symptoms": ["symptom1", "symptom2", "symptom3"],
    "preventionTips": ["state-specific tip1", "tip2", "tip3", "tip4"],
    "estimatedCases": "approximate number in ${state}",
    "stateHealthDepartmentContact": "contact info",
    "lastUpdated": "current date"
  },
  "seasonalDiseases": [
    {
      "disease": "Disease name",
      "riskLevel": "low/medium/high",
      "affectedDistricts": ["districts"],
      "briefDescription": "description for ${state}"
    }
  ]
}

Consider ${state}-specific factors:
- Climate and seasonal patterns
- Common diseases in ${state}
- Local health infrastructure
- Cultural and geographical factors
- Recent health department advisories

Provide actionable information for ${state} residents.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const stateData = JSON.parse(jsonMatch[0]);
      console.log(`✅ Successfully fetched outbreak data for ${state}`);
      return stateData;
    } catch (error) {
      console.error(`❌ Error fetching outbreak data for ${state}:`, error);
      throw error;
    }
  }

  // Process and save national outbreak alert
  async processNationalOutbreak(outbreakData) {
    try {
      if (!outbreakData.hasActiveOutbreaks) {
        console.log('ℹ️ No active national outbreaks detected');
        return null;
      }

      const alert = outbreakData.nationalAlert;
      
      const outbreakAlert = await OutbreakAlert.createAlert({
        title: alert.title,
        description: alert.description,
        disease: alert.primaryDisease,
        severity: alert.severity,
        scope: 'national',
        location: {
          country: 'India'
        },
        affectedAreas: alert.affectedStates?.map(state => ({
          state: state,
          districts: [],
          cases: 0
        })) || [],
        preventionTips: alert.preventionTips || [],
        symptoms: alert.symptoms || [],
        queryType: 'daily_national',
        priority: this.getSeverityPriority(alert.severity)
      });

      console.log(`✅ Created national outbreak alert: ${outbreakAlert.alertId}`);
      return outbreakAlert;
    } catch (error) {
      console.error('❌ Error processing national outbreak:', error);
      throw error;
    }
  }

  // Process and save state-specific outbreak alert
  async processStateOutbreak(stateData, state) {
    try {
      if (!stateData.hasStateOutbreaks) {
        console.log(`ℹ️ No active outbreaks detected for ${state}`);
        return null;
      }

      const alert = stateData.stateAlert;
      
      const outbreakAlert = await OutbreakAlert.createAlert({
        title: alert.title,
        description: alert.description,
        disease: alert.primaryDisease,
        severity: alert.severity,
        scope: 'state',
        location: {
          state: state,
          country: 'India'
        },
        affectedAreas: [{
          state: state,
          districts: alert.affectedDistricts || [],
          cases: 0
        }],
        preventionTips: alert.preventionTips || [],
        symptoms: alert.symptoms || [],
        queryType: 'state_specific',
        priority: this.getSeverityPriority(alert.severity)
      });

      console.log(`✅ Created state outbreak alert for ${state}: ${outbreakAlert.alertId}`);
      return outbreakAlert;
    } catch (error) {
      console.error(`❌ Error processing state outbreak for ${state}:`, error);
      throw error;
    }
  }

  // Get priority number based on severity
  getSeverityPriority(severity) {
    const priorities = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    return priorities[severity] || 3;
  }

  // Main function: Fetch and broadcast national outbreaks (called daily at 10 AM)
  async fetchAndBroadcastNationalOutbreaks() {
    try {
      console.log('🔄 Starting daily national outbreak fetch...');
      
      // Check if we already have today's national alert
      const existingAlert = await OutbreakAlert.getTodaysNationalAlert();
      if (existingAlert) {
        console.log('ℹ️ National alert already exists for today');
        return existingAlert;
      }

      // Fetch new data from Gemini
      const outbreakData = await this.fetchNationalOutbreakData();
      
      // Process and save the alert
      const alert = await this.processNationalOutbreak(outbreakData);
      
      if (alert) {
        // Broadcast to all users will be handled by the broadcast service
        console.log('📢 National outbreak alert ready for broadcast');
        return alert;
      }

      return null;
    } catch (error) {
      console.error('❌ Error in fetchAndBroadcastNationalOutbreaks:', error);
      throw error;
    }
  }

  // Get state-specific outbreak (with caching)
  async getStateOutbreak(state) {
    try {
      console.log(`🔄 Fetching outbreak data for ${state}...`);
      
      // Check if we have cached data for today
      const existingAlert = await OutbreakAlert.getStateAlert(state);
      if (existingAlert) {
        console.log(`ℹ️ Using cached outbreak data for ${state}`);
        return existingAlert;
      }

      // Fetch new data from Gemini
      const stateData = await this.fetchStateOutbreakData(state);
      
      // Process and save the alert
      const alert = await this.processStateOutbreak(stateData, state);
      
      if (alert) {
        console.log(`✅ State outbreak alert created for ${state}`);
        return alert;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting state outbreak for ${state}:`, error);
      throw error;
    }
  }

  // Get today's national alert for broadcasting
  async getTodaysNationalAlert() {
    return await OutbreakAlert.getTodaysNationalAlert();
  }

  // Manual trigger for testing
  async triggerManualNationalFetch() {
    console.log('🔧 Manual trigger: Fetching national outbreak data...');
    return await this.fetchAndBroadcastNationalOutbreaks();
  }
}

module.exports = new OutbreakService();
