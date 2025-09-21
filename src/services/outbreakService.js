const { GoogleGenerativeAI } = require('@google/generative-ai');
const OutbreakAlert = require('../models/OutbreakAlert');
const cron = require('node-cron');

class OutbreakService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use Gemini Pro with grounding for real-time information
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-pro",
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.7
          }
        }
      }]
    });
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

  // Fetch latest national outbreak data from Gemini with grounding
  async fetchNationalOutbreakData() {
    const prompt = `You are a disease outbreak monitoring system for India. Using the latest real-time information available, provide current disease outbreak information for India as of today's date.

CRITICAL INSTRUCTIONS:
1. Use REAL-TIME DATA and latest news sources to identify ACTIVE, CURRENT outbreaks happening NOW in India
2. Search for recent health ministry announcements, WHO reports, and news about disease outbreaks
3. Include only diseases with significant public health impact based on current reports
4. Provide accurate, factual information from reliable sources like Ministry of Health, WHO, ICMR
5. If no major outbreaks are currently active based on latest news, mention seasonal diseases to watch for

SEARCH FOR LATEST INFORMATION ON:
- Recent disease outbreak reports in India
- Ministry of Health and Family Welfare announcements
- WHO India health alerts
- State health department notifications
- Current epidemiological surveillance data
- Recent news about infectious disease outbreaks

Required JSON Response Format:
{
  "hasActiveOutbreaks": true/false,
  "nationalAlert": {
    "title": "Disease Outbreak Alert - [Current Date]",
    "description": "Brief overview of current outbreak situation in India based on latest reports",
    "primaryDisease": "Main disease of concern from recent data",
    "severity": "low/medium/high/critical",
    "affectedStates": ["State1", "State2"],
    "symptoms": ["symptom1", "symptom2", "symptom3"],
    "preventionTips": ["tip1", "tip2", "tip3", "tip4"],
    "estimatedCases": "approximate number or range from latest reports",
    "lastUpdated": "current date",
    "sources": ["source1", "source2"]
  },
  "additionalDiseases": [
    {
      "disease": "Disease name",
      "severity": "low/medium/high",
      "affectedAreas": ["areas"],
      "briefDescription": "short description based on latest data"
    }
  ]
}

Focus on current reports about:
- Dengue, Chikungunya, Malaria outbreaks
- H1N1, COVID-19 variants, respiratory infections
- Seasonal flu and viral fever outbreaks
- Food poisoning and water-borne disease clusters
- Any emerging infectious diseases in the news
- Vector-borne diseases during current season

Use real-time search to provide the most current, actionable health information for Indian citizens.`;

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

  // Fetch state-specific outbreak data from Gemini with grounding
  async fetchStateOutbreakData(state) {
    const prompt = `You are a disease outbreak monitoring system for India. Using the latest real-time information available, provide current disease outbreak information specifically for ${state} state as of today's date.

CRITICAL INSTRUCTIONS:
1. Use REAL-TIME DATA and latest news sources to identify ACTIVE, CURRENT outbreaks happening NOW in ${state} state
2. Search for recent ${state} health department announcements, local news, and state-specific health alerts
3. Focus ONLY on ${state} state - include active outbreaks, seasonal diseases, and health advisories
4. Provide state-specific prevention tips and local health contacts based on current information
5. Include district-wise information if available from recent reports

SEARCH FOR LATEST INFORMATION ON:
- Recent disease outbreak reports in ${state} state
- ${state} Health Department announcements and notifications
- Local news about infectious disease outbreaks in ${state}
- District-wise health surveillance data for ${state}
- Current epidemiological situation in ${state}
- State-specific health advisories and alerts

Required JSON Response Format:
{
  "hasStateOutbreaks": true/false,
  "stateAlert": {
    "title": "${state} Disease Outbreak Update - [Current Date]",
    "description": "Current disease outbreak situation in ${state} based on latest reports",
    "primaryDisease": "Main disease of concern in ${state} from recent data",
    "severity": "low/medium/high/critical",
    "affectedDistricts": ["District1", "District2"],
    "symptoms": ["symptom1", "symptom2", "symptom3"],
    "preventionTips": ["state-specific tip1", "tip2", "tip3", "tip4"],
    "estimatedCases": "approximate number in ${state} from latest reports",
    "stateHealthDepartmentContact": "contact info",
    "lastUpdated": "current date",
    "sources": ["source1", "source2"]
  },
  "seasonalDiseases": [
    {
      "disease": "Disease name",
      "riskLevel": "low/medium/high",
      "affectedDistricts": ["districts"],
      "briefDescription": "description for ${state} based on current data"
    }
  ]
}

Consider current ${state}-specific factors:
- Climate and seasonal patterns affecting ${state}
- Common diseases currently reported in ${state}
- Local health infrastructure and response in ${state}
- Cultural and geographical factors specific to ${state}
- Recent health department advisories for ${state}

Use real-time search to provide the most current, actionable information for ${state} residents.`;

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
