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

  // Fetch current disease status using Gemini AI with Google Search grounding
  async fetchCurrentDiseaseStatus() {
    console.log('🤖 Querying Gemini with Google Search for current disease outbreaks in India...');
    
    const prompt = `Search for current disease outbreaks in India from recent news and health reports. 
    
    Provide information about 3 most significant current disease outbreaks in India in this EXACT format:
    
    DISEASE 1: [Disease Name]
    LOCATION: [States/regions affected]
    CASES: [Number if available, or "Multiple cases reported"]
    SYMPTOMS: [Main symptoms]
    PREVENTION: [Key prevention measure]
    
    DISEASE 2: [Disease Name]
    LOCATION: [States/regions affected] 
    CASES: [Number if available, or "Multiple cases reported"]
    SYMPTOMS: [Main symptoms]
    PREVENTION: [Key prevention measure]
    
    DISEASE 3: [Disease Name]
    LOCATION: [States/regions affected]
    CASES: [Number if available, or "Multiple cases reported"]
    SYMPTOMS: [Main symptoms]
    PREVENTION: [Key prevention measure]
    
    Focus on recent outbreaks like Nipah virus, H1N1, Dengue, Chikungunya, viral fever, or any other current health alerts in India. Use Google Search to find the most recent information.`;

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

  // Parse structured text response from AI
  parseTextResponse(response) {
    const diseases = [];
    
    // Split response into disease blocks
    const diseaseBlocks = response.split(/DISEASE \d+:/).slice(1);
    
    for (const block of diseaseBlocks) {
      try {
        const lines = block.trim().split('\n');
        const disease = {
          name: '',
          affected_locations: [],
          symptoms: [],
          safety_measures: [],
          national_stats: {}
        };
        
        // Extract disease name from first line
        if (lines[0]) {
          disease.name = lines[0].trim();
        }
        
        // Parse each field
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('LOCATION:')) {
            const location = trimmedLine.replace('LOCATION:', '').trim();
            disease.affected_locations.push({
              state: location,
              estimated_cases: 'Multiple cases reported',
              trend: 'monitoring'
            });
          }
          
          if (trimmedLine.startsWith('CASES:')) {
            const cases = trimmedLine.replace('CASES:', '').trim();
            disease.national_stats.total_cases = cases;
          }
          
          if (trimmedLine.startsWith('SYMPTOMS:')) {
            const symptoms = trimmedLine.replace('SYMPTOMS:', '').trim();
            disease.symptoms = symptoms.split(',').map(s => s.trim());
          }
          
          if (trimmedLine.startsWith('PREVENTION:')) {
            const prevention = trimmedLine.replace('PREVENTION:', '').trim();
            disease.safety_measures = [prevention];
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

  // Get daily disease outbreaks with caching
  async getDailyDiseaseOutbreaks() {
    const today = new Date().toDateString();
    
    // Return cached data if available for today
    if (this.dailyCache && this.cacheDate === today) {
      console.log('💾 Using cached disease outbreak data for today');
      return this.dailyCache;
    }
    
    console.log('🔄 Fetching fresh disease outbreak data for today...');
    
    try {
      // Fetch fresh data using the simplified text approach
      const response = await this.geminiService.generateResponseWithGrounding(
        `Search for the 3 most significant current disease outbreaks in India from recent news and health reports. 
        
        Provide information in this EXACT format:
        
        DISEASE 1: [Disease Name]
        LOCATION: [States/regions affected]
        CASES: [Number if available, or "Multiple cases reported"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 2: [Disease Name]
        LOCATION: [States/regions affected] 
        CASES: [Number if available, or "Multiple cases reported"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        DISEASE 3: [Disease Name]
        LOCATION: [States/regions affected]
        CASES: [Number if available, or "Multiple cases reported"]
        SYMPTOMS: [Main symptoms]
        PREVENTION: [Key prevention measure]
        
        Focus on recent outbreaks like Nipah virus, H1N1, Dengue, Chikungunya, viral fever, or any other current health alerts in India.`,
        'en',
        3
      );
      
      // Parse the response into simple objects
      const diseases = this.parseSimpleTextResponse(response);
      
      // Cache the results for today
      this.dailyCache = diseases;
      this.cacheDate = today;
      
      console.log(`📊 Cached ${diseases.length} disease outbreaks for today`);
      return diseases;
      
    } catch (error) {
      console.error('Error fetching daily disease outbreaks:', error);
      
      // Return fallback data if everything fails
      return [
        {
          name: 'Seasonal Flu Outbreak',
          location: 'Multiple states',
          cases: 'Cases reported across India',
          symptoms: 'fever, cough, body aches',
          prevention: 'wear masks, maintain hygiene'
        },
        {
          name: 'Dengue Cases',
          location: 'Urban areas',
          cases: 'Increasing cases in cities',
          symptoms: 'high fever, headache, joint pain',
          prevention: 'eliminate stagnant water, use repellents'
        }
      ];
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

  // Get fallback disease data if AI fails
  getFallbackDiseaseData() {
    return {
      diseases: [
        {
          name: 'Dengue',
          type: 'viral',
          risk_level: 'high',
          symptoms: ['High fever', 'Severe headache', 'Joint pain', 'Skin rash'],
          safety_measures: ['Use mosquito repellents', 'Wear full-sleeve clothes', 'Use mosquito nets'],
          prevention: ['Eliminate standing water', 'Keep surroundings clean', 'Use mosquito nets'],
          transmission: 'Mosquito-borne (Aedes mosquito)',
          affected_locations: [
            {
              state: 'Delhi',
              districts: ['New Delhi', 'North Delhi'],
              estimated_cases: 500,
              trend: 'increasing'
            }
          ]
        },
        {
          name: 'Seasonal Flu',
          type: 'viral',
          risk_level: 'medium',
          symptoms: ['Fever', 'Cough', 'Body aches', 'Fatigue'],
          safety_measures: ['Wear masks', 'Maintain hygiene', 'Avoid crowded places'],
          prevention: ['Get vaccinated', 'Wash hands frequently', 'Boost immunity'],
          transmission: 'Airborne',
          affected_locations: [
            {
              state: 'Maharashtra',
              districts: ['Mumbai', 'Pune'],
              estimated_cases: 1000,
              trend: 'stable'
            }
          ]
        }
      ],
      data_date: new Date().toISOString().split('T')[0],
      sources: ['Fallback data']
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
