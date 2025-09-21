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
    
    const prompt = `Search for current disease outbreaks in ${locationQuery} as of ${currentDate}.
    
    Return the results in this template format:
    
    📢 Public Health Alert - ${currentDate} 📢
    A state-wise summary of ongoing health advisories.
    
    🇮🇳 [State Name]
    🦠 Key Diseases:
     - [Disease Name]: [Brief description with case numbers]
     - [Disease Name]: [Brief description with case numbers]
    
    🩺 Symptoms to Watch For:
    If you experience any of these symptoms, seek immediate medical attention:
     - [Symptom 1] • [Symptom 2] • [Symptom 3]
    
    🛡️ Prevention & Advisory:
     - [Prevention tip 1]
     - [Prevention tip 2]
     - [Prevention tip 3]
    
    🔗 Official Source: [Source name]
    
    Repeat for each affected state. Use real current data from search results.`;

    try {
      const response = await this.geminiService.generateResponseWithGrounding(
        prompt,
        'en',
        3
      );

      // Parse the structured text response
      const diseases = this.parseTextResponse(response);
      console.log(`📊 Found ${diseases.length} diseases from AI scan`);
      
      return {
        diseases: diseases,
        data_date: new Date().toISOString().split('T')[0],
        sources: ['Google Search', 'Health Department Reports']
      };
      
    } catch (error) {
      console.error('Error fetching disease data from AI:', error);
      
      // Fallback to manual monitoring for known diseases
      return this.getFallbackDiseaseData();
    }
  }

  // Parse enhanced structured text response from AI with location relevance
  parseTextResponse(response) {
    const diseases = [];
    
    // Split response into disease blocks
    const diseaseBlocks = response.split(/DISEASE \d+:/).slice(1);
    
    for (const block of diseaseBlocks) {
      try {
        const lines = block.trim().split('\n');
        const disease = {
          name: '',
          location: '',
          cases: '',
          symptoms: '',
          prevention: '',
          relevance: 'NATIONAL',
          priority: 4,
          isLocal: false,
          isState: false,
          isNearby: false
        };
        
        // Extract disease name from first line
        if (lines[0]) {
          disease.name = lines[0].trim();
        }
        
        // Parse each field
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('LOCATION:')) {
            disease.location = trimmedLine.replace('LOCATION:', '').trim();
          }
          
          if (trimmedLine.startsWith('CASES:')) {
            disease.cases = trimmedLine.replace('CASES:', '').trim();
          }
          
          if (trimmedLine.startsWith('SYMPTOMS:')) {
            disease.symptoms = trimmedLine.replace('SYMPTOMS:', '').trim();
          }
          
          if (trimmedLine.startsWith('PREVENTION:')) {
            disease.prevention = trimmedLine.replace('PREVENTION:', '').trim();
          }
          
          if (trimmedLine.startsWith('RELEVANCE:')) {
            const relevance = trimmedLine.replace('RELEVANCE:', '').trim();
            disease.relevance = relevance;
            
            // Set priority and flags based on relevance
            switch (relevance) {
              case 'LOCAL':
                disease.priority = 1;
                disease.isLocal = true;
                break;
              case 'STATE':
                disease.priority = 2;
                disease.isState = true;
                break;
              case 'NEARBY':
                disease.priority = 3;
                disease.isNearby = true;
                break;
              default:
                disease.priority = 4;
            }
          }
        }
        
        // Only add if we have a name
        if (disease.name) {
          diseases.push(disease);
        }
        
      } catch (error) {
        console.error('Error parsing disease block:', error);
        continue;
      }
    }
    
    return diseases;
  }

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
        `Search for current disease outbreaks specifically in ${stateName} state, India from recent news and health reports. 
        
        Provide information in this EXACT format:
        
        DISEASE 1: [Disease Name]
        LOCATION: [Specific districts/cities in ${stateName}]
        CASES: [Number if available, or "Cases reported"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 2: [Disease Name]
        LOCATION: [Specific districts/cities in ${stateName}]
        CASES: [Number if available, or "Cases reported"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 3: [Disease Name]
        LOCATION: [Specific districts/cities in ${stateName}]
        CASES: [Number if available, or "Cases reported"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        Focus on any current disease outbreaks, health alerts, or surveillance reports specifically in ${stateName} state. Include vector-borne, respiratory, water-borne, or emerging infectious diseases.`,
        'en',
        3
      );
      
      const diseases = this.parseSimpleTextResponse(response);
      console.log(`✅ Found ${diseases.length} diseases in ${stateName}`);
      return diseases;
      
    } catch (error) {
      console.error(`Error fetching diseases for ${stateName}:`, error);
      return [];
    }
  }

  // Fetch nationwide disease outbreaks (excluding user's state to avoid duplication)
  async fetchNationwideDiseases() {
    console.log('🇮🇳 Fetching nationwide disease outbreaks...');
    
    try {
      const response = await this.geminiService.generateResponseWithGrounding(
        `Search for the most significant current disease outbreaks across India from recent news and health reports. Focus on national-level outbreaks affecting multiple states.
        
        Provide information in this EXACT format:
        
        DISEASE 1: [Disease Name]
        LOCATION: [Multiple states/regions affected across India]
        CASES: [National numbers if available, or "Cases reported nationwide"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 2: [Disease Name]
        LOCATION: [Multiple states/regions affected across India]
        CASES: [National numbers if available, or "Cases reported nationwide"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 3: [Disease Name]
        LOCATION: [Multiple states/regions affected across India]
        CASES: [National numbers if available, or "Cases reported nationwide"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 4: [Disease Name]
        LOCATION: [Multiple states/regions affected across India]
        CASES: [National numbers if available, or "Cases reported nationwide"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        Focus on major nationwide outbreaks, health alerts, or surveillance reports affecting multiple Indian states. Include any vector-borne, respiratory, water-borne, or emerging infectious diseases.`,
        'en',
        4
      );
      
      const diseases = this.parseSimpleTextResponse(response);
      console.log(`✅ Found ${diseases.length} nationwide diseases`);
      return diseases;
      
    } catch (error) {
      console.error('Error fetching nationwide diseases:', error);
      return [];
    }
  }
  
  // Parse simple text response into disease objects
  parseSimpleTextResponse(response) {
    const diseases = [];
    const diseaseBlocks = response.split(/DISEASE \d+:/).slice(1);
    
    for (const block of diseaseBlocks) {
      try {
        const lines = block.trim().split('\n');
        const disease = {};
        
        // Extract disease name from first line
        if (lines[0]) {
          disease.name = lines[0].trim();
        }
        
        // Parse each field
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('LOCATION:')) {
            disease.location = trimmedLine.replace('LOCATION:', '').trim();
          }
          
          if (trimmedLine.startsWith('CASES:')) {
            disease.cases = trimmedLine.replace('CASES:', '').trim();
          }
          
          if (trimmedLine.startsWith('SYMPTOMS:')) {
            disease.symptoms = trimmedLine.replace('SYMPTOMS:', '').trim();
          }
          
          if (trimmedLine.startsWith('PREVENTION:')) {
            disease.prevention = trimmedLine.replace('PREVENTION:', '').trim();
          }
        }
        
        // Only add if we have a name
        if (disease.name) {
          diseases.push(disease);
        }
        
      } catch (error) {
        console.error('Error parsing disease block:', error);
        continue;
      }
    }
    
    return diseases;
  }

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

  // AI-powered disease name extraction
  async extractDiseaseName(text) {
    // Simple regex patterns for common diseases
    const diseasePatterns = [
      /dengue/i, /malaria/i, /chikungunya/i, /covid-19/i, /coronavirus/i,
      /tuberculosis/i, /hepatitis/i, /cholera/i, /typhoid/i, /influenza/i,
      /h1n1/i, /zika/i, /ebola/i, /mpox/i, /monkeypox/i
    ];
    
    for (const pattern of diseasePatterns) {
      if (pattern.test(text)) {
        return text.match(pattern)[0].toLowerCase();
      }
    }
    
    return 'unknown';
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
