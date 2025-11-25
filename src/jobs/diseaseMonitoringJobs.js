const cron = require('node-cron');
const AIDiseaseMonitorService = require('../services/aiDiseaseMonitorService');
const BroadcastService = require('../services/broadcastService');
const DiseaseAlertService = require('../services/diseaseAlertService');

class DiseaseMonitoringJobs {
    constructor() {
        this.aiMonitor = new AIDiseaseMonitorService();
        this.broadcastService = BroadcastService;
        this.alertService = new DiseaseAlertService();
        this.jobs = [];
    }

    // Start all background jobs
    startJobs() {
        console.log('⏰ Starting disease monitoring background jobs...');

        // 1. Daily Disease Scan (Every morning at 8:00 AM)
        this.jobs.push(
            cron.schedule('0 8 * * *', async () => {
                console.log('🔍 Running scheduled daily disease scan...');
                await this.runDailyScan();
            })
        );

        // 2. Daily Alert Broadcast (Every morning at 10:00 AM)
        this.jobs.push(
            cron.schedule('0 10 * * *', async () => {
                console.log('📢 Running scheduled daily alert broadcast...');
                await this.runDailyBroadcast();
            })
        );

        console.log(`✅ ${this.jobs.length} background jobs scheduled`);
    }

    // Run daily scan manually or via cron
    async runDailyScan() {
        try {
            console.log('🤖 Triggering AI Disease Scan...');
            const results = await this.aiMonitor.scanForDiseaseOutbreaks();
            console.log('✅ Daily scan completed:', results);
            return results;
        } catch (error) {
            console.error('❌ Error in daily scan:', error);
            throw error;
        }
    }

    // Run daily broadcast manually or via cron
    async runDailyBroadcast() {
        try {
            console.log('📢 Preparing daily broadcast...');

            // Get nationwide alert
            const nationalAlert = await this.aiMonitor.fetchNationwideDiseases();

            if (nationalAlert) {
                // Broadcast to all users
                const result = await this.broadcastService.broadcastNationalAlert({
                    alert_id: `daily_${new Date().toISOString().split('T')[0]}`,
                    getFormattedAlert: () => nationalAlert,
                    markAsSent: async () => true
                });

                console.log('✅ Daily broadcast completed:', result);
                return result;
            } else {
                console.log('ℹ️ No national alert to broadcast today');
                return { success: true, message: 'No alert to broadcast' };
            }
        } catch (error) {
            console.error('❌ Error in daily broadcast:', error);
            throw error;
        }
    }

    // Manual triggers for testing
    async manualDataCollection() {
        return await this.runDailyScan();
    }

    async manualAlertProcessing() {
        return await this.runDailyBroadcast();
    }

    // Get job status
    getJobStatus() {
        return {
            active_jobs: this.jobs.length,
            status: 'running',
            next_scan: '08:00 AM',
            next_broadcast: '10:00 AM'
        };
    }

    // Format morning summary
    formatMorningSummary(diseases, user) {
        return `🌅 *Good Morning, ${user.district || 'User'}!*\n\n` +
            `Here is your daily health update:\n` +
            `${diseases.map(d => `• ${d.disease.disease_name}: ${d.disease.risk_level} Risk`).join('\n')}`;
    }
}

module.exports = DiseaseMonitoringJobs;
