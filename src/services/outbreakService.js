const { GoogleGenerativeAI } = require('@google/generative-ai');
const OutbreakAlert = require('../models/OutbreakAlert');
const cron = require('node-cron');

class OutbreakService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use Gemini 2.0 Flash with grounding for real-time information
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      tools: [{
        googleSearch: {}  // Correct format for Gemini 2.0 Flash
      }],
      generationConfig: {
        temperature: 0.1,  // Lower temperature for more factual responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,  // Higher token limit for Gemini 2.0 Flash
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

    const prompt = `You are a comprehensive disease outbreak monitoring system for India. Today is ${currentDate}. 

🔍 MANDATORY: USE GOOGLE SEARCH to find the LATEST, MOST COMPREHENSIVE disease outbreak information for India as of TODAY (${currentDate}).

CRITICAL SEARCH REQUIREMENTS:
1. MANDATORY: Search for current disease outbreaks in India from TODAY (${currentDate}) and this week
2. MANDATORY: Find detailed information about "brain-eating amoeba" cases in Kerala from ${currentMonth}
3. MANDATORY: Search for H3N2 influenza cases in Delhi from ${currentMonth}
4. MANDATORY: Look for Nipah virus updates in Kerala from ${currentMonth}
5. MANDATORY: Find dengue, chikungunya, malaria cases across India from ${currentMonth}
6. MANDATORY: Search for water-borne disease outbreaks in flood-affected areas
7. MANDATORY: Look for any emerging infectious diseases in India from ${currentMonth}

SEARCH QUERIES TO USE:
- "India disease outbreaks September 2025 current"
- "brain eating amoeba Kerala cases deaths ${currentMonth}"
- "H3N2 influenza Delhi outbreak ${currentMonth}"
- "Nipah virus Kerala cases ${currentMonth}"
- "dengue malaria chikungunya India cases ${currentMonth}"
- "WHO India disease alerts ${currentMonth}"
- "Ministry of Health India outbreak reports ${currentMonth}"

RESPONSE FORMAT - Create a comprehensive news-style report:
{
  "dataFreshness": "TODAY/THIS_WEEK/THIS_MONTH",
  "searchDate": "${currentDate}",
  "hasActiveOutbreaks": true/false,
  "nationalAlert": {
    "title": "India Grapples with Multiple Disease Outbreaks in ${currentMonth}",
    "description": "Comprehensive overview: As of ${currentDate}, India is contending with several disease outbreaks across various states. Write a detailed 3-4 paragraph summary covering: 1) Brain-eating amoeba in Kerala with specific case/death numbers, 2) H3N2 influenza in Delhi, 3) Nipah virus concerns in Kerala, 4) Seasonal diseases like dengue/malaria, 5) Any flood-related health risks. Include specific locations, case numbers, and health authority responses.",
    "primaryDisease": "Multiple (Naegleria fowleri, H3N2 Influenza, Nipah Virus, Vector-borne diseases)",
    "severity": "high",
    "affectedStates": ["Kerala", "Delhi", "Maharashtra", "Punjab", "West Bengal", "Karnataka"],
    "symptoms": ["Fever", "Headache", "Respiratory distress", "Body aches", "Persistent cough", "Neurological symptoms"],
    "preventionTips": ["Avoid swimming in untreated freshwater", "Use mosquito nets and repellents", "Maintain personal hygiene", "Consume safe food and water", "Seek immediate medical attention for fever", "Follow health advisories"],
    "estimatedCases": "Specific numbers from latest reports: Naegleria fowleri cases and deaths, H3N2 cases in Delhi, etc.",
    "lastUpdated": "${currentDate}",
    "sources": ["WHO India reports", "Kerala Health Department", "Delhi Health Department", "Ministry of Health India", "NCDC surveillance data"],
    "dataAge": "Current week data"
  },
  "additionalDiseases": [
    {
      "disease": "Naegleria fowleri (Brain-eating Amoeba)",
      "severity": "critical",
      "affectedAreas": ["Kerala"],
      "briefDescription": "Specific case numbers and deaths, locations affected, health advisories issued",
      "lastReported": "Latest report date from ${currentMonth}"
    },
    {
      "disease": "H3N2 Influenza",
      "severity": "medium",
      "affectedAreas": ["Delhi", "NCR"],
      "briefDescription": "Current case trends, vulnerable populations affected",
      "lastReported": "Latest report date from ${currentMonth}"
    },
    {
      "disease": "Nipah Virus",
      "severity": "high",
      "affectedAreas": ["Kerala"],
      "briefDescription": "Current surveillance status, containment measures",
      "lastReported": "Latest report date from ${currentMonth}"
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
      console.log('🔍 Requesting Gemini 2.0 Flash with grounding for latest outbreak data...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Log if grounding was used
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        console.log('✅ Gemini 2.0 Flash Google Search was used successfully');
        console.log(`🔍 Search results: ${groundingMetadata.groundingChunks?.length || 0} chunks`);
        console.log(`📊 Grounding support score: ${groundingMetadata.groundingSupport || 'N/A'}`);
      } else {
        console.log('⚠️ Gemini 2.0 Flash Google Search may not have been used');
      }
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini 2.0 Flash response');
      }

      const outbreakData = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully fetched national outbreak data with Gemini 2.0 Flash grounding');
      return outbreakData;
    } catch (error) {
      console.error('❌ Error fetching national outbreak data with Gemini 2.0 Flash:', error);
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

    const prompt = `You are a comprehensive disease outbreak monitoring system for ${state} state, India. Today is ${currentDate}. 

🔍 MANDATORY: USE GOOGLE SEARCH to find the LATEST, MOST COMPREHENSIVE disease outbreak information specifically for ${state} state as of TODAY (${currentDate}).

CRITICAL SEARCH REQUIREMENTS FOR ${state}:
1. MANDATORY: Search for current disease outbreaks in ${state} from TODAY (${currentDate}) and this week
2. MANDATORY: Find detailed district-wise outbreak information in ${state} from ${currentMonth}
3. MANDATORY: Search for ${state} Health Department bulletins and alerts from ${currentMonth}
4. MANDATORY: Look for water-borne diseases in ${state} (especially if flood-affected)
5. MANDATORY: Find vector-borne disease cases (dengue, chikungunya, malaria) in ${state}
6. MANDATORY: Search for any mysterious illness or health emergencies in ${state} districts
7. MANDATORY: Look for seasonal disease patterns specific to ${state}'s climate

SEARCH QUERIES TO USE FOR ${state}:
- "${state} disease outbreak September 2025 current"
- "${state} health department alerts ${currentMonth}"
- "${state} dengue malaria chikungunya cases ${currentMonth}"
- "${state} district health emergency ${currentMonth}"
- "${state} water borne diseases ${currentMonth}"
- "${state} mysterious illness outbreak ${currentMonth}"
- "${state} health bulletin latest ${currentMonth}"

RESPONSE FORMAT - Create comprehensive ${state}-specific report:
{
  "dataFreshness": "TODAY/THIS_WEEK/THIS_MONTH",
  "searchDate": "${currentDate}",
  "stateName": "${state}",
  "hasStateOutbreaks": true/false,
  "stateAlert": {
    "title": "Health Alerts in ${state} Amidst Outbreaks of [Specific Diseases] in ${currentMonth}",
    "description": "Comprehensive ${state} overview: As of ${currentDate}, health authorities across ${state} are responding to disease outbreaks in several districts. Write a detailed 2-3 paragraph summary covering: 1) Specific diseases affecting ${state}, 2) District-wise breakdown with case numbers, 3) Health department responses and containment measures, 4) Any unique challenges in ${state} (floods, climate, population density). Include specific locations, case numbers, and local health authority actions.",
    "primaryDisease": "Main disease(s) currently affecting ${state}",
    "severity": "low/medium/high/critical",
    "affectedDistricts": ["Specific districts in ${state} with current outbreaks"],
    "symptoms": ["Disease-specific symptoms relevant to ${state} outbreaks"],
    "preventionTips": ["${state}-specific prevention measures", "Local health advisory recommendations", "District-specific precautions", "Climate-appropriate measures"],
    "estimatedCases": "Specific case numbers and trends in ${state} from latest health bulletins",
    "stateHealthDepartmentContact": "${state} State Health Department contact information",
    "lastUpdated": "${currentDate}",
    "sources": ["${state} Health Department", "District health bulletins", "Local media reports", "State surveillance data"],
    "dataAge": "Current week data for ${state}"
  },
  "seasonalDiseases": [
    {
      "disease": "Specific disease name affecting ${state}",
      "riskLevel": "low/medium/high/critical",
      "affectedDistricts": ["Specific districts in ${state}"],
      "briefDescription": "Detailed description of disease situation in ${state} with case numbers and trends",
      "lastReported": "Latest report date from ${state} authorities"
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
      console.log(`🔍 Requesting Gemini 2.0 Flash with grounding for latest ${state} outbreak data...`);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Log if grounding was used
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata) {
        console.log(`✅ Gemini 2.0 Flash Google Search was used successfully for ${state}`);
        console.log(`🔍 Search results for ${state}: ${groundingMetadata.groundingChunks?.length || 0} chunks`);
        console.log(`📊 Grounding support score for ${state}: ${groundingMetadata.groundingSupport || 'N/A'}`);
      } else {
        console.log(`⚠️ Gemini 2.0 Flash Google Search may not have been used for ${state}`);
      }
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini 2.0 Flash response');
      }

      const stateData = JSON.parse(jsonMatch[0]);
      console.log(`✅ Successfully fetched outbreak data for ${state} with Gemini 2.0 Flash grounding`);
      return stateData;
    } catch (error) {
      console.error(`❌ Error fetching outbreak data for ${state} with Gemini 2.0 Flash:`, error);
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

  // Fetch state-specific alerts for multiple states (with caching)
  async fetchStateSpecificAlerts(states) {
    try {
      console.log(`🔍 Fetching state-specific alerts for: ${states.join(', ')}`);
      
      const stateAlerts = [];
      const today = new Date().toISOString().split('T')[0];
      
      // Process each state
      for (const state of states.slice(0, 5)) {
        try {
          // Check if we already have today's data for this state
          const existingAlert = await OutbreakAlert.getStateAlert(state);
          
          if (existingAlert) {
            console.log(`📋 Using cached alert for ${state}`);
            stateAlerts.push(existingAlert);
            continue;
          }

          console.log(`📍 Fetching new alert for ${state}...`);
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
            console.log(`✅ Created and cached state alert for ${state}: ${stateAlert.alert_id}`);
          }
        } catch (stateError) {
          console.error(`⚠️ Error fetching alert for ${state}:`, stateError);
          // Continue with other states
        }
      }
      
      console.log(`✅ Processed ${stateAlerts.length} state-specific alerts (cached + new)`);
      return stateAlerts;
      
    } catch (error) {
      console.error('❌ Error in fetchStateSpecificAlerts:', error);
      return [];
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
        priority: this.getSeverityPriority(alert.severity),
        // Rich fields
        estimatedCases: alert.estimatedCases || null,
        lastUpdated: alert.lastUpdated || outbreakData.searchDate || new Date().toISOString(),
        dataAge: alert.dataAge || null,
        dataFreshness: outbreakData.dataFreshness || null,
        searchDate: outbreakData.searchDate || null,
        sources: alert.sources || [],
        additionalDiseases: Array.isArray(outbreakData.additionalDiseases) ? outbreakData.additionalDiseases : []
      });

      console.log(`✅ Created national outbreak alert: ${outbreakAlert.alert_id}`);
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
        priority: this.getSeverityPriority(alert.severity),
        // Rich fields
        estimatedCases: alert.estimatedCases || null,
        lastUpdated: alert.lastUpdated || stateData.searchDate || new Date().toISOString(),
        dataAge: alert.dataAge || null,
        dataFreshness: stateData.dataFreshness || null,
        searchDate: stateData.searchDate || null,
        sources: alert.sources || [],
        additionalDiseases: Array.isArray(stateData.seasonalDiseases) ? stateData.seasonalDiseases : []
      });

      console.log(`✅ Created state outbreak alert for ${state}: ${outbreakAlert.alert_id}`);
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
