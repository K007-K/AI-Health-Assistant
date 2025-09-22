const GeminiService = require('./geminiService');

class AIDiseaseMonitorService {
  constructor() {
    this.geminiService = new GeminiService();
    this.dailyCache = null;
    this.cacheDate = null;
  }

  // Main method to scan for disease outbreaks using AI (now just updates cache)
  async scanForDiseaseOutbreaks() {
    console.log('🔍 Starting daily disease outbreak cache update...');
    
    const results = {
      timestamp: new Date(),
      outbreaksFound: 0,
      updatesPerformed: 0,
      newDiseases: [],
      errors: []
    };

    try {
      // Update the daily cache
      const diseases = await this.getDailyDiseaseOutbreaks();
      
      results.outbreaksFound = diseases.length;
      results.updatesPerformed = diseases.length;
      
      console.log(`✅ Disease outbreak scan completed:`, results);
      return results;
      
    } catch (error) {
      console.error('❌ Error in disease outbreak scan:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  // Fetch location-specific disease status using real-time web search
  async fetchLocationSpecificDiseases(userLocation = null) {
    console.log('🤖 Querying Gemini with Google Search for location-specific disease outbreaks...');
    
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
    // Create location-specific search query
    let locationQuery = 'India';
    if (userLocation) {
      if (userLocation.district && userLocation.state) {
        locationQuery = `${userLocation.district}, ${userLocation.state}, India`;
      } else if (userLocation.state) {
        locationQuery = `${userLocation.state}, India`;
      }
    }
    
    const prompt = `Search for CURRENT disease outbreaks in ${locationQuery} from the LATEST news and health reports published in the last 30 days only.
    
    CRITICAL SEARCH REQUIREMENTS:
    - Only include diseases with ACTIVE outbreaks reported in the last 30 days
    - COMPLETELY EXCLUDE: COVID-19, dengue, malaria, diarrhea, chikungunya (unless extraordinary circumstances)
    - Focus ONLY on: EMERGING diseases, RARE diseases, UNUSUAL outbreaks, or SIGNIFICANT health emergencies
    - Look for diseases like: Nipah virus, brain-eating amoeba, H5N1, HMPV, unusual bacterial infections, rare viral outbreaks
    - Search for recent health ministry alerts, WHO reports, state health department notifications
    
    Return in this EXACT format:
    
    📢 Public Health Alert - ${currentDate} 📢
    A state-wise summary of ongoing health advisories.
    
    🇮🇳 [State Name 1]
    🦠 Key Diseases:
     - [Disease Name]: [Brief description with recent case numbers and dates]
     - [Disease Name]: [Brief description with recent case numbers and dates]
    
    🇮🇳 [State Name 2]
    🦠 Key Diseases:
     - [Disease Name]: [Brief description with recent case numbers and dates]
    
    🩺 Symptoms to Watch For:
    If you experience any of these symptoms, seek immediate medical attention:
     - [Symptom 1] • [Symptom 2] • [Symptom 3]
    
    🛡️ Prevention & Advisory:
     - [Prevention tip 1]
     - [Prevention tip 2]
     - [Prevention tip 3]
    
    🔗 Official Source: [Recent source name with date]
    
    If no significant current outbreaks found, return: "No major disease outbreaks reported in ${locationQuery} in the last 30 days."`;

    try {
      const response = await this.geminiService.generateResponseWithGrounding(
        prompt,
        'en',
        3
      );

      console.log(`✅ Generated location template for ${locationQuery}`);
      return response; // Return the complete template directly
      
    } catch (error) {
      console.error('Error fetching disease data from AI:', error);
      
      return `📢 Public Health Alert - ${currentDate} 📢\nA state-wise summary of ongoing health advisories.\n\n🇮🇳 ${locationQuery}\n🦠 Key Diseases:\n - No current nationwide alerts\n\n📞 Emergency Contact: 108`;
    }
  }

  // This method is no longer needed since we return complete templates directly
  // Kept for compatibility but not used in current implementation

  // Get comprehensive disease outbreaks (state-specific + nationwide)
  async getDailyDiseaseOutbreaks(userState = null) {
    const today = new Date().toDateString();
    const cacheKey = userState ? `${today}_${userState}` : today;
    
    // Return cached data if available for today
    if (this.dailyCache && this.cacheDate === cacheKey) {
      console.log('💾 Using cached disease outbreak data for today');
      return this.dailyCache;
    }
    
    console.log('🔄 Fetching comprehensive disease outbreak data (state + nationwide)...');
    
    try {
      // Fetch both state-specific and nationwide data
      const stateData = userState ? await this.fetchStateSpecificDiseases(userState) : [];
      const nationwideData = await this.fetchNationwideDiseases();
      
      const comprehensiveData = {
        stateSpecific: stateData,
        nationwide: nationwideData,
        timestamp: new Date(),
        userState: userState
      };
      
      // Cache the results for today
      this.dailyCache = comprehensiveData;
      this.cacheDate = cacheKey;
      
      console.log(`📊 Cached ${stateData.length} state diseases + ${nationwideData.length} nationwide diseases`);
      return comprehensiveData;
      
    } catch (error) {
      console.error('Error fetching comprehensive disease outbreaks:', error);
      
      // Return fallback data if everything fails
      return {
        stateSpecific: [],
        diseases: [],
        timestamp: new Date(),
        userState: userState
      };
    }
  }

  // Fetch state-specific disease outbreaks
  async fetchStateSpecificDiseases(stateName) {
    console.log(`🏛️ Fetching diseases specific to ${stateName}...`);
    
    try {
      const response = await this.geminiService.generateResponseWithGrounding(
        `Search for CURRENT disease outbreaks in ${stateName}, India from the LATEST verified health news and official reports published in the LAST 30 DAYS only.  

        STRICT SEARCH RULES FOR ${stateName}:  
        - ✅ Include ONLY active outbreaks in ${stateName} state.  
        - ❌ EXCLUDE common seasonal diseases (COVID-19, dengue, malaria, diarrhoea, chikungunya) UNLESS an outbreak is extraordinary or unusual.  
        - 🎯 PRIORITIZE: Emerging diseases, rare infections, unusual outbreaks, significant state/district-level health alerts.  
        - 🔍 Look for ${stateName} Health Department advisories, district-level alerts, local hospital reports.  
        - ❌ Do NOT include nationwide/general alerts — only ${stateName}-specific.  
        - 🗺️ Must mention specific districts/cities affected in ${stateName}.
        
        Return in this EXACT format:
        
        📢 Public Health Alert - [Current Date] 📢
        A state-wise summary of ongoing health advisories.
        
        🇮🇳 ${stateName}
        🦠 Key Diseases:
         - [Disease Name]: [Brief description with recent case numbers and dates]
         - [Disease Name]: [Brief description with recent case numbers and dates]
        
        🗺️ Affected Areas:
         - [District/City 1]: [Disease and case details from recent reports]
         - [District/City 2]: [Disease and case details from recent reports]
        
        🩺 Symptoms to Watch For:
        If you experience any of these symptoms, seek immediate medical attention:
         - [Symptom 1] • [Symptom 2] • [Symptom 3]
        
        🛡️ Prevention & Advisory:
         - [Prevention tip 1]
         - [Prevention tip 2]
         - [Prevention tip 3]
        
        🔗 Official Source: [Recent source name with date]
        📞 Emergency Contact: 108
        
        If no current outbreaks found in ${stateName}, return: "No significant disease outbreaks reported in ${stateName} in the last 30 days."`,
        'en',
        3
      );
      
      console.log(`✅ Generated state template for ${stateName}`);
      return response; // Return the complete template directly
      
    } catch (error) {
      console.error(`Error fetching diseases for ${stateName}:`, error);
      return `📢 Public Health Alert - ${new Date().toLocaleDateString()} 📢\nA state-wise summary of ongoing health advisories.\n\n🇮🇳 ${stateName}\n🦠 Key Diseases:\n - No current health alerts for ${stateName}\n\n📞 Emergency Contact: 108`;
    }
  }

  // Fetch nationwide disease outbreaks (excluding user's state to avoid duplication)
  async fetchNationwideDiseases() {
    console.log('🇮🇳 Fetching nationwide disease outbreaks...');
    
    try {
      const response = await this.geminiService.generateResponseWithGrounding(
        `Search for SIGNIFICANT CURRENT disease outbreaks across MULTIPLE STATES in India from the LATEST verified health news and official reports published in the LAST 30 DAYS only.  

        STRICT SEARCH RULES (NATIONWIDE):  
        - ✅ Include ONLY diseases affecting 2 or more states, or those flagged as NATIONAL emergencies.  
        - ❌ EXCLUDE seasonal/common diseases (COVID-19, dengue, malaria, diarrhoea, chikungunya) UNLESS an outbreak is extraordinary or unusual.  
        - 🎯 PRIORITIZE: Emerging diseases, rare outbreaks, unusual infections, or major national health emergencies.  
        - 🔍 Sources: Health Ministry of India, WHO, NCDC, national advisories, multi-state news reports.  
        - ❌ Do NOT include single-state outbreaks (those go into state alerts).
        
        Return in this EXACT format:
        
        📢 Public Health Alert - [Current Date] 📢
        A state-wise summary of ongoing health advisories.
        
        🇮🇳 [State Name 1]
        🦠 Key Diseases:
         - [Disease Name]: [Brief description with recent case numbers and dates]
         - [Disease Name]: [Brief description with recent case numbers and dates]
        
        🇮🇳 [State Name 2]
        🦠 Key Diseases:
         - [Disease Name]: [Brief description with recent case numbers and dates]
         - [Disease Name]: [Brief description with recent case numbers and dates]
        
        🇮🇳 [State Name 3]
        🦠 Key Diseases:
         - [Disease Name]: [Brief description with recent case numbers and dates]
        
        🩺 Symptoms to Watch For:
        If you experience any of these symptoms, seek immediate medical attention:
         - [Symptom 1] • [Symptom 2] • [Symptom 3]
        
        🛡️ Prevention & Advisory:
         - [Prevention tip 1]
         - [Prevention tip 2]
         - [Prevention tip 3]
        
        🔗 Official Source: [Recent source name with date]
        
        If no significant current outbreaks found, return: "No major disease outbreaks reported across India in the last 30 days."`,
        'en',
        4
      );
      
      console.log(`✅ Generated nationwide template`);
      return response; // Return the complete template directly
      
    } catch (error) {
      console.error('Error fetching nationwide diseases:', error);
      return `📢 Public Health Alert - ${new Date().toLocaleDateString()} 📢\nA state-wise summary of ongoing health advisories.\n\n🇮🇳 India\n🦠 Key Diseases:\n - No current nationwide alerts\n\n📞 Emergency Contact: 108`;
    }
  }
  
  // This method is no longer needed since we return complete templates directly
  // Kept for compatibility but not used in current implementation

  // Legacy method - no longer needed with caching approach
  async processDiseaseData(diseaseData) {
    // This method is kept for compatibility but does nothing
    // since we now use daily caching instead of database storage
    return { total: 0, updated: 0, new: [] };
  }

  // Legacy method - no longer needed with caching approach
  async createDisease(diseaseInfo) {
    // This method is kept for compatibility but does nothing
    return null;
  }

  // Update existing disease
  async updateDisease(diseaseId, diseaseInfo) {
    await this.supabase
      .from('active_diseases')
      .update({
        symptoms: diseaseInfo.symptoms,
        safety_measures: diseaseInfo.safety_measures,
        prevention_methods: diseaseInfo.prevention,
        risk_level: diseaseInfo.risk_level,
        transmission_mode: diseaseInfo.transmission,
        last_updated: new Date()
      })
      .eq('id', diseaseId);
  }

  // Create location case entries
  async createLocationEntries(diseaseId, locations) {
    for (const location of locations) {
      if (!location.districts || location.districts.length === 0) {
        // State-level data only
        await this.upsertLocationCase(diseaseId, {
          state: location.state,
          district: null,
          pincode: null,
          active_cases: location.estimated_cases || 0,
          week_trend: location.trend || 'stable'
        });
      } else {
        // District-level data
        for (const district of location.districts) {
          await this.upsertLocationCase(diseaseId, {
            state: location.state,
            district: district,
            pincode: null,
            active_cases: Math.floor((location.estimated_cases || 0) / location.districts.length),
            week_trend: location.trend || 'stable'
          });
        }
      }
    }
  }

  // Upsert location case data
  async upsertLocationCase(diseaseId, locationData) {
    const { error } = await this.supabase
      .from('disease_cases_location')
      .upsert({
        disease_id: diseaseId,
        state: locationData.state,
        district: locationData.district,
        pincode: locationData.pincode,
        active_cases: locationData.active_cases,
        cases_today: locationData.cases_today || 0,
        week_trend: locationData.week_trend,
        last_updated: new Date(),
        data_source: 'AI Gemini Scan'
      }, {
        onConflict: 'disease_id,state,district,pincode'
      });

    if (error && !error.message.includes('duplicate')) {
      console.error('Error upserting location case:', error);
    }
  }

  // Create or update national statistics
  async createNationalStats(diseaseId, stats) {
    const { error } = await this.supabase
      .from('disease_national_stats')
      .upsert({
        disease_id: diseaseId,
        total_active_cases: stats.active_cases || stats.total_cases || 0,
        total_cases: stats.total_cases || 0,
        states_affected: stats.states_affected || 1,
        new_cases_today: stats.new_cases || 0,
        last_updated: new Date()
      }, {
        onConflict: 'disease_id'
      });

    if (error && !error.message.includes('duplicate')) {
      console.error('Error upserting national stats:', error);
    }
  }

  // Update location case counts from various sources
  async updateLocationCaseCounts(diseaseData) {
    if (!diseaseData.diseases) return;

    for (const disease of diseaseData.diseases) {
      if (!disease.affected_locations) continue;

      const { data: dbDisease } = await this.supabase
        .from('active_diseases')
        .select('id')
        .eq('disease_name', disease.name)
        .single();

      if (dbDisease) {
        await this.createLocationEntries(dbDisease.id, disease.affected_locations);
      }
    }
  }

  // AI-powered disease name extraction - removed hardcoded patterns
  async extractDiseaseName(text) {
    // Use AI to extract disease names instead of hardcoded patterns
    try {
      const prompt = `Extract the disease name from this text: "${text}". Return only the disease name, nothing else.`;
      const result = await this.geminiService.generateResponse(prompt, 'en');
      return result.trim().toLowerCase();
    } catch (error) {
      console.error('Error extracting disease name:', error);
      return 'unknown';
    }
  }

  // Calculate severity based on case numbers and spread
  calculateSeverity(cases, deaths = 0) {
    const mortalityRate = deaths / Math.max(cases, 1);
    
    if (cases >= 1000 || mortalityRate > 0.1) return 'critical';
    if (cases >= 100 || mortalityRate > 0.05) return 'high';
    if (cases >= 10) return 'medium';
    return 'low';
  }

  // Update national statistics
  async updateNationalStatistics() {
    console.log('📈 Updating national disease statistics...');

    const { data: diseases } = await this.supabase
      .from('active_diseases')
      .select('id, disease_name')
      .eq('is_active', true);

    if (!diseases) return;

    for (const disease of diseases) {
      // Aggregate location data to get national stats
      const { data: locationStats } = await this.supabase
        .from('disease_cases_location')
        .select('active_cases, recovered_cases, death_cases')
        .eq('disease_id', disease.id);

      if (locationStats && locationStats.length > 0) {
        const totalActive = locationStats.reduce((sum, loc) => sum + (loc.active_cases || 0), 0);
        const totalRecovered = locationStats.reduce((sum, loc) => sum + (loc.recovered_cases || 0), 0);
        const totalDeaths = locationStats.reduce((sum, loc) => sum + (loc.death_cases || 0), 0);

        // Count affected states
        const { count: statesCount } = await this.supabase
          .from('disease_cases_location')
          .select('state', { count: 'exact', head: true })
          .eq('disease_id', disease.id)
          .gt('active_cases', 0);

        await this.supabase
          .from('disease_national_stats')
          .upsert({
            disease_id: disease.id,
            total_active_cases: totalActive,
            total_recovered_cases: totalRecovered,
            total_deaths: totalDeaths,
            states_affected: statesCount || 0,
            recovery_rate: totalRecovered > 0 ? (totalRecovered / (totalActive + totalRecovered + totalDeaths) * 100) : 0,
            mortality_rate: totalDeaths > 0 ? (totalDeaths / (totalActive + totalRecovered + totalDeaths) * 100) : 0,
            last_updated: new Date()
          }, {
            onConflict: 'disease_id'
          });
      }
    }
  }

  // Get fallback disease data if AI fails (NO HARDCODED DISEASES)
  getFallbackDiseaseData() {
    console.log('⚠️ AI service failed - returning empty result instead of hardcoded fallback');
    
    // Return empty result instead of hardcoded diseases
    // This prevents showing fake/outdated information
    return {
      diseases: [], // Empty - no hardcoded diseases
      data_date: new Date().toISOString().split('T')[0],
      sources: ['AI service temporarily unavailable'],
      message: 'Disease monitoring service is temporarily unavailable. Please try again later.'
    };
  }

  // Log data collection activity
  async logDataCollection(diseaseData, results) {
    await this.supabase
      .from('ai_data_collection_logs')
      .insert({
        source_type: 'gemini',
        query_text: 'Disease outbreak scan for India',
        response_data: diseaseData,
        extracted_diseases: diseaseData.diseases?.map(d => d.name) || [],
        new_outbreaks_found: results.newDiseases.length,
        updates_made: results.updatesPerformed,
        processing_status: results.errors.length > 0 ? 'failed' : 'processed',
        error_message: results.errors.join(', ') || null,
        execution_time_ms: Date.now() - results.timestamp.getTime()
      });
  }

  // Get active diseases for display
  async getActiveDiseases() {
    const { data, error } = await this.supabase
      .from('active_diseases')
      .select(`
        *,
        national_stats:disease_national_stats(*)
      `)
      .eq('is_active', true)
      .order('risk_level', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get disease info for a specific location
  async getDiseaseInfoForLocation(state, district = null, pincode = null) {
    let query = this.supabase
      .from('disease_cases_location')
      .select(`
        *,
        disease:active_diseases(*)
      `)
      .eq('state', state)
      .gt('active_cases', 0);

    if (district) {
      query = query.eq('district', district);
    }
    if (pincode) {
      query = query.eq('pincode', pincode);
    }

    const { data, error } = await query.order('active_cases', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

module.exports = AIDiseaseMonitorService;
