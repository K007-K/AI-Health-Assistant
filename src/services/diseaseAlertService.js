const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const AIDiseaseMonitorService = require('./aiDiseaseMonitorService');
const WhatsAppService = require('./whatsappService');
const { LanguageUtils } = require('../utils/languageUtils');

class DiseaseAlertService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.aiMonitor = new AIDiseaseMonitorService();
        this.whatsappService = new WhatsAppService();
    }

    // Register user for alerts
    async registerUserForAlerts(phoneNumber, userId, locationData) {
        try {
            console.log(`📝 Registering user ${phoneNumber} for alerts in ${locationData.state}`);

            // Update user profile with location and alert preference
            const { error } = await this.supabase
                .from('users')
                .update({
                    location: locationData,
                    consent_outbreak_alerts: true,
                    last_active: new Date()
                })
                .eq('phone_number', phoneNumber);

            if (error) throw error;

            // Add to alert preferences table
            const { error: prefError } = await this.supabase
                .from('user_alert_preferences')
                .upsert({
                    user_id: userId,
                    phone_number: phoneNumber,
                    state: locationData.state,
                    district: locationData.district,
                    pincode: locationData.pincode,
                    alert_types: ['outbreak', 'emergency'],
                    is_active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                }, {
                    onConflict: 'phone_number'
                });

            if (prefError) throw prefError;

            return { success: true };
        } catch (error) {
            console.error('Error registering user for alerts:', error);
            return { success: false, error: error.message };
        }
    }

    // Unregister user from alerts
    async unregisterUserFromAlerts(phoneNumber) {
        try {
            console.log(`📝 Unregistering user ${phoneNumber} from alerts`);

            // Update user profile
            await this.supabase
                .from('users')
                .update({
                    consent_outbreak_alerts: false
                })
                .eq('phone_number', phoneNumber);

            // Remove from preferences
            await this.supabase
                .from('user_alert_preferences')
                .delete()
                .eq('phone_number', phoneNumber);

            return { success: true };
        } catch (error) {
            console.error('Error unregistering user:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user is registered
    async isUserRegistered(phoneNumber) {
        try {
            const { data, error } = await this.supabase
                .from('user_alert_preferences')
                .select('is_active')
                .eq('phone_number', phoneNumber)
                .single();

            if (error || !data) return false;
            return data.is_active;
        } catch (error) {
            return false;
        }
    }

    // Get diseases in location
    async getDiseasesInLocation(state, district) {
        try {
            return await this.aiMonitor.getDiseaseInfoForLocation(state, district);
        } catch (error) {
            console.error('Error getting diseases in location:', error);
            return [];
        }
    }

    // Get active disease info
    async getActiveDiseaseInfo(diseaseName = null) {
        try {
            const diseases = await this.aiMonitor.getActiveDiseases();
            if (diseaseName) {
                return diseases.filter(d => d.disease_name.toLowerCase().includes(diseaseName.toLowerCase()));
            }
            return diseases;
        } catch (error) {
            console.error('Error getting active disease info:', error);
            return [];
        }
    }

    // Format disease info for display
    formatDiseaseInfo(disease, language = 'en') {
        // Basic formatting - in production this would use LanguageUtils
        return `🦠 *${disease.disease_name}*\n\n` +
            `⚠️ Risk Level: ${disease.risk_level}\n` +
            `🤒 Symptoms: ${Array.isArray(disease.symptoms) ? disease.symptoms.join(', ') : disease.symptoms}\n` +
            `🛡️ Prevention: ${Array.isArray(disease.prevention_methods) ? disease.prevention_methods.join(', ') : disease.prevention_methods}`;
    }
}

module.exports = DiseaseAlertService;
