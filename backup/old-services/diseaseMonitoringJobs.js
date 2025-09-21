const cron = require('node-cron');
const AIDiseaseMonitorService = require('../services/aiDiseaseMonitorService');
const DiseaseAlertService = require('../services/diseaseAlertService');

class DiseaseMonitoringJobs {
  constructor() {
    this.aiDiseaseMonitor = new AIDiseaseMonitorService();
    this.diseaseAlertService = new DiseaseAlertService();
    this.jobs = new Map();
  }

  // Start all disease monitoring jobs
  startJobs() {
    console.log('🚀 Starting disease monitoring background jobs...');
    
    // Job 1: AI-powered disease data collection - Every 6 hours
    this.jobs.set('aiDataCollection', cron.schedule('0 */6 * * *', async () => {
      console.log('🤖 Running AI disease data collection job...');
      try {
        const result = await this.aiDiseaseMonitor.scanForDiseaseOutbreaks();
        console.log('📊 AI scan completed:', result);
        
        // If new outbreaks found, trigger immediate alert processing
        if (result.newDiseases && result.newDiseases.length > 0) {
          console.log('🚨 New diseases detected, triggering immediate alerts...');
          await this.diseaseAlertService.sendLocationBasedAlerts();
        }
      } catch (error) {
        console.error('❌ AI data collection job failed:', error);
      }
    }, { scheduled: false }));

    // Job 2: Send location-based alerts - Every hour
    this.jobs.set('alertProcessing', cron.schedule('0 * * * *', async () => {
      console.log('📬 Running disease alert processing job...');
      try {
        const result = await this.diseaseAlertService.sendLocationBasedAlerts();
        console.log('✅ Alert processing completed:', result);
      } catch (error) {
        console.error('❌ Alert processing job failed:', error);
      }
    }, { scheduled: false }));

    // Job 3: Morning disease summary - Daily at 8 AM
    this.jobs.set('morningSummary', cron.schedule('0 8 * * *', async () => {
      console.log('☀️ Running morning disease summary job...');
      try {
        await this.sendMorningSummaryToUsers();
      } catch (error) {
        console.error('❌ Morning summary job failed:', error);
      }
    }, { scheduled: false }));

    // Job 4: Data cleanup - Daily at 2 AM
    this.jobs.set('dataCleanup', cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running disease data cleanup job...');
      try {
        await this.cleanupOldData();
      } catch (error) {
        console.error('❌ Data cleanup job failed:', error);
      }
    }, { scheduled: false }));

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started ${name} job`);
    });

    // Run initial data collection on startup
    this.runInitialScan();

    console.log('🎯 All disease monitoring jobs started successfully');
  }

  // Stop all jobs
  stopJobs() {
    console.log('🛑 Stopping disease monitoring jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped ${name} job`);
    });
    
    this.jobs.clear();
    console.log('✅ All disease monitoring jobs stopped');
  }

  // Run initial scan on startup
  async runInitialScan() {
    console.log('🔄 Running initial disease data scan...');
    try {
      // Wait 10 seconds for services to initialize
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const result = await this.aiDiseaseMonitor.scanForDiseaseOutbreaks();
      console.log('✅ Initial scan completed:', result);
      
      // Send alerts if needed
      if (result.outbreaksFound > 0) {
        await this.diseaseAlertService.sendLocationBasedAlerts();
      }
    } catch (error) {
      console.error('❌ Initial scan failed:', error);
    }
  }

  // Send morning summary to registered users
  async sendMorningSummaryToUsers() {
    try {
      // Get all users registered for alerts
      const { data: users } = await this.diseaseAlertService.supabase
        .from('user_alert_preferences')
        .select('*')
        .eq('alert_enabled', true);

      if (!users || users.length === 0) {
        console.log('No users registered for morning summaries');
        return;
      }

      for (const user of users) {
        try {
          // Get diseases in user's area
          const diseases = await this.diseaseAlertService.getDiseasesInLocation(
            user.state,
            user.district,
            user.pincode
          );

          if (diseases.length > 0) {
            const message = this.formatMorningSummary(diseases, user);
            await this.diseaseAlertService.whatsappService.sendMessage(
              user.phone_number,
              message
            );
          }
          
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error sending morning summary to ${user.phone_number}:`, error);
        }
      }
      
      console.log('✅ Morning summaries sent successfully');
      
    } catch (error) {
      console.error('Error sending morning summaries:', error);
    }
  }

  // Format morning summary message
  formatMorningSummary(diseases, user) {
    const activeCount = diseases.filter(d => d.active_cases > 0).length;
    const highRiskCount = diseases.filter(d => d.disease?.risk_level === 'high' || d.disease?.risk_level === 'critical').length;
    
    let message = `☀️ *Good Morning! Daily Health Update*\n\n`;
    message += `📍 *Location:* ${user.district}, ${user.state}\n`;
    message += `📊 *Active Diseases:* ${activeCount}\n`;
    if (highRiskCount > 0) {
      message += `⚠️ *High Risk Alerts:* ${highRiskCount}\n`;
    }
    message += `\n`;

    // List top 2 diseases
    diseases.slice(0, 2).forEach(diseaseCase => {
      const disease = diseaseCase.disease;
      const riskEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🔴',
        critical: '🚨'
      }[disease?.risk_level] || '⚠️';
      
      message += `${riskEmoji} *${disease?.disease_name}*: ${diseaseCase.active_cases} cases\n`;
    });

    message += `\n💡 *Stay Safe Today:*\n`;
    message += `• Wash hands frequently\n`;
    message += `• Maintain social distance\n`;
    message += `• Stay hydrated\n`;
    message += `\n`;
    message += `_Reply 'VIEW DISEASES' for detailed information_`;
    
    return message;
  }

  // Cleanup old data
  async cleanupOldData() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Mark old diseases as inactive
      await this.aiDiseaseMonitor.supabase
        .from('active_diseases')
        .update({ is_active: false })
        .lt('last_updated', thirtyDaysAgo.toISOString());

      // Delete old alert history
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      await this.diseaseAlertService.supabase
        .from('disease_alert_history')
        .delete()
        .lt('created_at', sixtyDaysAgo.toISOString());

      // Delete old AI collection logs
      await this.aiDiseaseMonitor.supabase
        .from('ai_data_collection_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      console.log('✅ Old data cleanup completed');
      
    } catch (error) {
      console.error('Error during data cleanup:', error);
    }
  }

  // Manual trigger methods for testing
  async manualDataCollection() {
    console.log('🔧 Manually triggering AI disease data collection...');
    return await this.aiDiseaseMonitor.scanForDiseaseOutbreaks();
  }

  async manualAlertProcessing() {
    console.log('🔧 Manually triggering alert processing...');
    return await this.diseaseAlertService.sendLocationBasedAlerts();
  }

  async manualMorningSummary() {
    console.log('🔧 Manually triggering morning summary...');
    return await this.sendMorningSummaryToUsers();
  }

  // Get job status
  getJobStatus() {
    const status = {};
    
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        nextRun: job.nextDate?.() || null
      };
    });
    
    return status;
  }
}

module.exports = DiseaseMonitoringJobs;
