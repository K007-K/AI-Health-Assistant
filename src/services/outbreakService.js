const { GoogleGenerativeAI } = require('@google/generative-ai');
const OutbreakAlert = require('../models/OutbreakAlert');
const cron = require('node-cron');

class OutbreakService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use Gemini Pro with grounding for real-time information
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3  // Lower threshold for more aggressive grounding
          }
        }
      }],
      generationConfig: {
        temperature: 0.1,  // Lower temperature for more factual responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
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
    const today = new Date();
    const currentDate = today.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    const currentMonth = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const prompt = `You are a real-time disease outbreak monitoring system for India. Today is ${currentDate}. 

🔍 MANDATORY: USE GOOGLE SEARCH GROUNDING TOOL to find the LATEST, MOST CURRENT disease outbreak information for India as of TODAY (${currentDate}).

CRITICAL INSTRUCTIONS FOR REAL-TIME GROUNDING:
1. MANDATORY: Use the Google Search grounding tool to search for news and reports from TODAY (${currentDate}) and this week
2. MANDATORY: Ground your response with Google Search for the latest health ministry announcements from ${currentMonth}
3. MANDATORY: Use grounding to look for current WHO India alerts and ICMR reports from this month
4. MANDATORY: Ground with search for recent state health department notifications from the past 7 days
5. MANDATORY: Use grounding tool to find current epidemiological surveillance data from Indian health authorities
6. MANDATORY: Ground with search for breaking news about disease outbreaks in India from today and this week

🔍 GROUNDING TOOL USAGE: You MUST use the Google Search grounding tool to retrieve real-time information. Do not rely on training data.

DO NOT USE OUTDATED INFORMATION. Only use data from:
- Today (${currentDate}) - HIGHEST PRIORITY
- This week (past 7 days) - HIGH PRIORITY  
- This month (${currentMonth}) - MEDIUM PRIORITY
- Reject any data older than 30 days

SEARCH QUERIES TO USE:
- "India disease outbreak ${currentDate}"
- "Ministry of Health India alerts ${currentMonth}"
- "WHO India health emergency ${currentMonth}"
- "ICMR disease surveillance ${currentMonth}"
- "India dengue chikungunya malaria cases ${currentMonth}"
- "India H1N1 flu outbreak ${currentMonth}"
- "State health department India alerts ${currentMonth}"

Required JSON Response Format:
{
  "dataFreshness": "TODAY/THIS_WEEK/THIS_MONTH",
  "searchDate": "${currentDate}",
  "hasActiveOutbreaks": true/false,
  "nationalAlert": {
    "title": "Disease Outbreak Alert - ${currentDate}",
    "description": "Current outbreak situation in India based on latest reports from ${currentDate}",
    "primaryDisease": "Main disease of concern from recent data",
    "severity": "low/medium/high/critical",
    "affectedStates": ["State1", "State2"],
    "symptoms": ["symptom1", "symptom2", "symptom3"],
    "preventionTips": ["tip1", "tip2", "tip3", "tip4"],
    "estimatedCases": "latest numbers from ${currentMonth}",
    "lastUpdated": "${currentDate}",
    "sources": ["Recent source 1 with date", "Recent source 2 with date"],
    "dataAge": "hours/days old"
  },
  "additionalDiseases": [
    {
      "disease": "Disease name",
      "severity": "low/medium/high",
      "affectedAreas": ["areas"],
      "briefDescription": "description based on latest ${currentMonth} data",
      "lastReported": "date of latest report"
    }
  ]
}

FOCUS ON CURRENT SEASONAL DISEASES FOR ${currentMonth}:
- Post-monsoon diseases (Dengue, Chikungunya, Malaria)
- Respiratory infections (H1N1, seasonal flu)
- Water-borne diseases (Diarrhea, Typhoid, Hepatitis A)
- Vector-borne diseases appropriate for current season
- Any emerging infectious diseases in current news

MANDATORY: Include source dates and ensure all information is from ${currentMonth} or newer.`;

    try {
      console.log('🔍 Requesting Gemini with grounding for latest outbreak data...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Log if grounding was used
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        console.log('✅ Grounding tool was used successfully');
        console.log(`🔍 Grounding sources: ${groundingMetadata.groundingChunks?.length || 0} chunks`);
      } else {
        console.log('⚠️ Grounding tool may not have been used');
      }
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const outbreakData = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully fetched national outbreak data with grounding');
      return outbreakData;
    } catch (error) {
      console.error('❌ Error fetching national outbreak data:', error);
      throw error;
    }
  }

  // Fetch state-specific outbreak data from Gemini with grounding
  async fetchStateOutbreakData(state) {
    const today = new Date();
    const currentDate = today.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    const currentMonth = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const prompt = `You are a real-time disease outbreak monitoring system for ${state} state, India. Today is ${currentDate}. 

🔍 MANDATORY: USE GOOGLE SEARCH GROUNDING TOOL to find the LATEST, MOST CURRENT disease outbreak information specifically for ${state} state as of TODAY (${currentDate}).

CRITICAL INSTRUCTIONS FOR REAL-TIME ${state} GROUNDING:
1. MANDATORY: Use the Google Search grounding tool to search for news and reports about ${state} from TODAY (${currentDate}) and this week
2. MANDATORY: Ground your response with Google Search for latest ${state} Health Department announcements from ${currentMonth}
3. MANDATORY: Use grounding to look for current ${state} state health alerts and district-wise reports from this month
4. MANDATORY: Ground with search for recent local news about disease outbreaks in ${state} from the past 7 days
5. MANDATORY: Use grounding tool to find current epidemiological surveillance data from ${state} health authorities
6. MANDATORY: Ground with search for breaking news about disease outbreaks in ${state} districts from today and this week

🔍 GROUNDING TOOL USAGE: You MUST use the Google Search grounding tool to retrieve real-time information about ${state}. Do not rely on training data.

DO NOT USE OUTDATED INFORMATION FOR ${state}. Only use data from:
- Today (${currentDate}) - HIGHEST PRIORITY
- This week (past 7 days) - HIGH PRIORITY  
- This month (${currentMonth}) - MEDIUM PRIORITY
- Reject any data older than 30 days

SEARCH QUERIES TO USE FOR ${state}:
- "${state} disease outbreak ${currentDate}"
- "${state} Health Department alerts ${currentMonth}"
- "${state} dengue chikungunya malaria cases ${currentMonth}"
- "${state} district wise disease surveillance ${currentMonth}"
- "${state} health emergency ${currentMonth}"
- "${state} state health bulletin ${currentMonth}"
- "Disease outbreak ${state} districts ${currentMonth}"

Required JSON Response Format:
{
  "dataFreshness": "TODAY/THIS_WEEK/THIS_MONTH",
  "searchDate": "${currentDate}",
  "stateName": "${state}",
  "hasStateOutbreaks": true/false,
  "stateAlert": {
    "title": "${state} Disease Outbreak Update - ${currentDate}",
    "description": "Current disease outbreak situation in ${state} based on latest reports from ${currentDate}",
    "primaryDisease": "Main disease of concern in ${state} from recent data",
    "severity": "low/medium/high/critical",
    "affectedDistricts": ["District1", "District2"],
    "symptoms": ["symptom1", "symptom2", "symptom3"],
    "preventionTips": ["${state}-specific tip1", "tip2", "tip3", "tip4"],
    "estimatedCases": "latest numbers in ${state} from ${currentMonth}",
    "stateHealthDepartmentContact": "${state} health dept contact",
    "lastUpdated": "${currentDate}",
    "sources": ["Recent ${state} source 1 with date", "Recent ${state} source 2 with date"],
    "dataAge": "hours/days old"
  },
  "seasonalDiseases": [
    {
      "disease": "Disease name",
      "riskLevel": "low/medium/high",
      "affectedDistricts": ["districts in ${state}"],
      "briefDescription": "description for ${state} based on latest ${currentMonth} data",
      "lastReported": "date of latest report in ${state}"
    }
  ]
}

FOCUS ON CURRENT SEASONAL DISEASES IN ${state} FOR ${currentMonth}:
- Post-monsoon diseases common in ${state} (Dengue, Chikungunya, Malaria)
- Respiratory infections in ${state} (H1N1, seasonal flu)
- Water-borne diseases in ${state} (Diarrhea, Typhoid, Hepatitis A)
- Vector-borne diseases specific to ${state}'s climate
- Any emerging infectious diseases in ${state} from current news

MANDATORY: Include ${state}-specific source dates and ensure all information is from ${currentMonth} or newer for ${state}.`;

    try {
      console.log(`🔍 Requesting Gemini with grounding for latest ${state} outbreak data...`);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Log if grounding was used
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        console.log(`✅ Grounding tool was used successfully for ${state}`);
        console.log(`🔍 Grounding sources for ${state}: ${groundingMetadata.groundingChunks?.length || 0} chunks`);
      } else {
        console.log(`⚠️ Grounding tool may not have been used for ${state}`);
      }
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const stateData = JSON.parse(jsonMatch[0]);
      console.log(`✅ Successfully fetched outbreak data for ${state} with grounding`);
      return stateData;
    } catch (error) {
      console.error(`❌ Error fetching outbreak data for ${state}:`, error);
      throw error;
    }
  }

  // Fetch and broadcast national outbreaks
  async fetchAndBroadcastNationalOutbreaks() {
    try {
      console.log('🔄 Starting daily national outbreak fetch...');
      
      // Fetch latest outbreak data from Gemini
      const outbreakData = await this.fetchNationalOutbreakData();
      
      if (outbreakData.hasActiveOutbreaks && outbreakData.nationalAlert) {
        // Create outbreak alert in database
        const alert = await OutbreakAlert.createAlert({
          title: outbreakData.nationalAlert.title,
          description: outbreakData.nationalAlert.description,
          disease: outbreakData.nationalAlert.primaryDisease,
          severity: outbreakData.nationalAlert.severity,
          scope: 'national',
          location: { country: 'India' },
          affectedAreas: outbreakData.nationalAlert.affectedStates?.map(state => ({
            state: state,
            districts: [],
            cases: 0
          })) || [],
          preventionTips: outbreakData.nationalAlert.preventionTips || [],
          symptoms: outbreakData.nationalAlert.symptoms || [],
          queryType: 'daily_national',
          priority: outbreakData.nationalAlert.severity === 'critical' ? 1 : 
                   outbreakData.nationalAlert.severity === 'high' ? 2 : 3
        });

        console.log(`✅ Created national outbreak alert: ${alert.alert_id}`);
        
        // Also fetch state-specific alerts for affected states
        if (outbreakData.nationalAlert.affectedStates && outbreakData.nationalAlert.affectedStates.length > 0) {
          console.log('🏛️ Fetching state-specific alerts for affected states...');
          await this.fetchStateSpecificAlerts(outbreakData.nationalAlert.affectedStates);
        }
        
        return alert;
      } else {
        console.log('ℹ️ No active national outbreaks found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error in fetchAndBroadcastNationalOutbreaks:', error);
      throw error;
    }
  }

  // Fetch state-specific alerts for multiple states
  async fetchStateSpecificAlerts(states) {
    try {
      console.log(`🔍 Fetching state-specific alerts for: ${states.join(', ')}`);
      
      const stateAlerts = [];
      
      // Fetch alerts for each state (limit to top 5 to avoid rate limits)
      const statesToProcess = states.slice(0, 5);
      
      for (const state of statesToProcess) {
        try {
          console.log(`📍 Fetching alert for ${state}...`);
          const stateData = await this.fetchStateOutbreakData(state);
          
          if (stateData.hasStateOutbreaks && stateData.stateAlert) {
            // Create state-specific alert
            const stateAlert = await OutbreakAlert.createAlert({
              title: stateData.stateAlert.title,
              description: stateData.stateAlert.description,
              disease: stateData.stateAlert.primaryDisease,
              severity: stateData.stateAlert.severity,
              scope: 'state',
              location: { 
                country: 'India',
                state: state
              },
              affectedAreas: stateData.stateAlert.affectedDistricts?.map(district => ({
                state: state,
                districts: [district],
                cases: 0
              })) || [],
              preventionTips: stateData.stateAlert.preventionTips || [],
              symptoms: stateData.stateAlert.symptoms || [],
              queryType: 'state_specific',
              priority: stateData.stateAlert.severity === 'critical' ? 1 : 
                       stateData.stateAlert.severity === 'high' ? 2 : 3
            });

            stateAlerts.push(stateAlert);
            console.log(`✅ Created state alert for ${state}: ${stateAlert.alert_id}`);
          }
        } catch (stateError) {
          console.error(`⚠️ Error fetching alert for ${state}:`, stateError);
          // Continue with other states
        }
      }
      
      console.log(`✅ Created ${stateAlerts.length} state-specific alerts`);
      return stateAlerts;
      
    } catch (error) {
      console.error('❌ Error in fetchStateSpecificAlerts:', error);
      return [];
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
