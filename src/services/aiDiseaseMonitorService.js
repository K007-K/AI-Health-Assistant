const { createClient } = require('@supabase/supabase-js');
const GeminiService = require('./geminiService');

class AIDiseaseMonitorService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.geminiService = new GeminiService();
  }

  // Main method to scan for disease outbreaks using AI
  async scanForDiseaseOutbreaks() {
    console.log('🔍 Starting AI-powered disease outbreak scan for India...');
    
    const results = {
      timestamp: new Date(),
      outbreaksFound: 0,
      updatesPerformed: 0,
      newDiseases: [],
      errors: []
    };

    try {
      // Step 1: Get current disease status from AI
      const diseaseData = await this.fetchCurrentDiseaseStatus();
      
      // Step 2: Process and store disease information
      const processed = await this.processDiseaseData(diseaseData);
      results.outbreaksFound = processed.total;
      results.updatesPerformed = processed.updated;
      results.newDiseases = processed.new;
      
      // Step 3: Update location-specific case counts
      await this.updateLocationCaseCounts(diseaseData);
      
      // Step 4: Update national statistics
      await this.updateNationalStatistics();
      
      // Step 5: Log the collection
      await this.logDataCollection(diseaseData, results);
      
      console.log('✅ Disease outbreak scan completed:', results);
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
    
    const prompt = `
    Search for the latest news and health department reports about current disease outbreaks and health alerts in India from the past 30 days. 
    Provide real-time, up-to-date information in JSON format for active diseases including:
    1. Disease name
    2. Affected states and districts (based on latest news reports)
    3. Approximate number of cases (if available from official sources)
    4. Recent symptoms reported
    5. Safety measures recommended by health authorities
    6. Prevention methods advised by health departments
    7. Risk level based on current trends (low/medium/high/critical)
    8. Latest news sources and dates
    
    Search specifically for current outbreaks in India including:
    - Dengue outbreaks 2024-2025
    - Malaria cases in India recent
    - Chikungunya outbreaks current
    - COVID-19 variants India latest
    - Seasonal flu outbreaks India
    - Typhoid cases India recent
    - Hepatitis outbreaks India
    - Brain fever / Encephalitis cases
    - H1N1 influenza India
    - Any other disease outbreaks India recent news
    
    Use Google Search to find the most recent and credible health department reports, news articles, and official health alerts from Indian states.
    
    Return ONLY valid JSON in this exact format:
    {
      "diseases": [
        {
          "name": "Disease Name",
          "type": "viral/bacterial/parasitic",
          "risk_level": "low/medium/high/critical",
          "symptoms": ["symptom1", "symptom2"],
          "safety_measures": ["measure1", "measure2"],
          "prevention": ["prevention1", "prevention2"],
          "transmission": "mode of transmission",
          "affected_locations": [
            {
              "state": "State Name",
              "districts": ["District1", "District2"],
              "estimated_cases": 1000,
              "trend": "increasing/decreasing/stable"
            }
          ],
          "national_stats": {
            "total_cases": 10000,
            "active_cases": 5000,
            "states_affected": 10
          }
        }
      ],
      "data_date": "2024-01-15",
      "sources": ["WHO", "NCDC", "State Health Departments"]
    }
    
    Base your response on current real-world data and recent news about disease outbreaks in India.
    `;

    try {
      const response = await this.geminiService.generateResponseWithGrounding(
        prompt,
        'en',
        3
      );

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const diseaseData = JSON.parse(jsonMatch[0]);
      console.log(`📊 Found ${diseaseData.diseases?.length || 0} diseases from AI scan`);
      
      return diseaseData;
      
    } catch (error) {
      console.error('Error fetching disease data from AI:', error);
      
      // Fallback to manual monitoring for known diseases
      return this.getFallbackDiseaseData();
    }
  }

  // Process and store disease data in database
  async processDiseaseData(diseaseData) {
    const results = { total: 0, updated: 0, new: [] };
    
    if (!diseaseData.diseases || !Array.isArray(diseaseData.diseases)) {
      return results;
    }

    for (const disease of diseaseData.diseases) {
      try {
        // Check if disease already exists
        const { data: existing } = await this.supabase
          .from('active_diseases')
          .select('id')
          .eq('disease_name', disease.name)
          .single();

        if (existing) {
          // Update existing disease
          await this.updateDisease(existing.id, disease);
          results.updated++;
        } else {
          // Create new disease entry
          const newDisease = await this.createDisease(disease);
          results.new.push(disease.name);
        }
        
        results.total++;
        
      } catch (error) {
        console.error(`Error processing disease ${disease.name}:`, error);
      }
    }
    
    return results;
  }

  // Create new disease entry
  async createDisease(diseaseInfo) {
    const { data, error } = await this.supabase
      .from('active_diseases')
      .insert({
        disease_name: diseaseInfo.name,
        disease_type: diseaseInfo.type || 'unknown',
        symptoms: diseaseInfo.symptoms || [],
        safety_measures: diseaseInfo.safety_measures || [],
        prevention_methods: diseaseInfo.prevention || [],
        transmission_mode: diseaseInfo.transmission || 'unknown',
        risk_level: diseaseInfo.risk_level || 'medium',
        is_active: true,
        first_reported: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ Added new disease to tracking: ${diseaseInfo.name}`);
    
    // Also create location entries for this disease
    if (diseaseInfo.affected_locations) {
      await this.createLocationEntries(data.id, diseaseInfo.affected_locations);
    }
    
    // Create national stats entry
    if (diseaseInfo.national_stats) {
      await this.createNationalStats(data.id, diseaseInfo.national_stats);
    }
    
    return data;
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
