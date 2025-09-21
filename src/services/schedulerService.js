const cron = require('node-cron');
const outbreakService = require('./outbreakService');
const broadcastService = require('./broadcastService');

class SchedulerService {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize all scheduled jobs
  initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Scheduler already initialized');
      return;
    }

    console.log('🚀 Initializing Disease Outbreak Scheduler...');

    // Daily outbreak fetch and broadcast at 10:00 AM IST
    this.scheduleDailyOutbreakBroadcast();

    // Cleanup old alerts daily at 2:00 AM IST
    this.scheduleCleanupOldAlerts();

    // TEST ALERT: Schedule for 4:00 PM TODAY (for testing)
    this.scheduleTestAlert();

    this.isInitialized = true;
    console.log('✅ Disease Outbreak Scheduler initialized successfully');
  }

  // Schedule daily outbreak broadcast at 10:00 AM IST
  scheduleDailyOutbreakBroadcast() {
    cron.schedule('0 10 * * *', async () => {
      console.log('🕙 Starting daily outbreak broadcast at 10:00 AM IST');
      
      try {
        // Fetch today's national outbreak data
        const nationalAlert = await outbreakService.fetchAndBroadcastNationalOutbreaks();
        
        if (nationalAlert) {
          const alertId = nationalAlert.alert_id || nationalAlert.parsed_diseases?.alertId || nationalAlert.id || 'unknown';
          console.log(`📢 Broadcasting national alert: ${alertId}`);
          
          // Broadcast to all users
          await broadcastService.broadcastNationalAlert(nationalAlert);
          
          console.log('✅ Daily outbreak broadcast completed successfully');
        } else {
          console.log('ℹ️ No national outbreak alert to broadcast today');
        }
        
      } catch (error) {
        console.error('❌ Error in daily outbreak broadcast:', error);
        
        // Send error notification to admin (if configured)
        await this.notifyAdminOfError('Daily Outbreak Broadcast Failed', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    console.log('⏰ Daily outbreak broadcast scheduled for 10:00 AM IST');
  }

  // Schedule cleanup of old alerts at 2:00 AM IST
  scheduleCleanupOldAlerts() {
    cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Starting cleanup of old outbreak alerts at 2:00 AM IST');
      
      try {
        const OutbreakAlert = require('../models/OutbreakAlert');
        
        // Delete alerts older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const result = await OutbreakAlert.deleteMany({
          createdAt: { $lt: sevenDaysAgo }
        });
        
        console.log(`🗑️ Cleaned up ${result.deletedCount} old outbreak alerts`);
        
      } catch (error) {
        console.error('❌ Error in cleanup job:', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    console.log('🧹 Cleanup job scheduled for 2:00 AM IST');
  }

  // Schedule test alert for 6:28 PM TODAY (for testing purposes)
  scheduleTestAlert() {
    cron.schedule('28 18 * * *', async () => {
      console.log('🧪 TEST ALERT: Starting outbreak broadcast at 6:28 PM IST');
      
      try {
        // Fetch and create national outbreak alert
        const nationalAlert = await outbreakService.fetchAndBroadcastNationalOutbreaks();
        
        if (nationalAlert) {
          const alertId = nationalAlert.alert_id || nationalAlert.parsed_diseases?.alertId || nationalAlert.id || 'unknown';
          console.log(`📢 TEST BROADCAST: Broadcasting national alert: ${alertId}`);
          
          // Broadcast to all users
          await broadcastService.broadcastNationalAlert(nationalAlert);
          console.log('✅ TEST ALERT: Demo alert broadcast completed at 6:28 PM');
        } else {
          console.log('ℹ️ TEST ALERT: No national outbreak alert to broadcast at 6:28 PM');
        }
        
      } catch (error) {
        console.error('❌ Error in 4:00 PM test outbreak broadcast:', error);
        
        // Send error notification to admin (if configured)
        await this.notifyAdminOfError('4:00 PM Test Outbreak Broadcast Failed', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    console.log('🧪 TEST ALERT: Outbreak broadcast scheduled for 6:28 PM IST TODAY');
  }

  // Create a test alert for demonstration purposes
  async createTestAlert() {
    try {
      const OutbreakAlert = require('../models/OutbreakAlert');
      
      const testAlert = await OutbreakAlert.createAlert({
        title: 'TEST: Disease Outbreak Alert - System Demo',
        description: 'This is a test alert to demonstrate the real-time outbreak notification system. The system is working correctly and ready for production use.',
        disease: 'System Test',
        severity: 'medium',
        scope: 'national',
        location: {
          country: 'India'
        },
        affectedAreas: [{
          state: 'All States',
          districts: ['Testing Districts'],
          cases: 0
        }],
        preventionTips: [
          'This is a system test - no action required',
          'The outbreak alert system is functioning correctly',
          'Real alerts will contain actual health information',
          'Contact 108 for any medical emergencies'
        ],
        symptoms: [
          'This is a test alert',
          'No actual symptoms to report',
          'System functioning normally'
        ],
        queryType: 'daily_national',
        priority: 3
      });

      console.log(`✅ Created test alert for demonstration: ${testAlert.alertId}`);
      return testAlert;
      
    } catch (error) {
      console.error('❌ Error creating test alert:', error);
      return null;
    }
  }

  // Manual trigger for testing
  async triggerManualBroadcast() {
    console.log('🔧 Manual trigger: Starting outbreak broadcast...');
    
    try {
      const nationalAlert = await outbreakService.fetchAndBroadcastNationalOutbreaks();
      
      if (nationalAlert) {
        await broadcastService.broadcastNationalAlert(nationalAlert);
        console.log('✅ Manual broadcast completed successfully');
        return { success: true, alert: nationalAlert };
      } else {
        console.log('ℹ️ No alert to broadcast');
        return { success: true, message: 'No alert to broadcast' };
      }
      
    } catch (error) {
      console.error('❌ Error in manual broadcast:', error);
      return { success: false, error: error.message };
    }
  }

  // Get scheduler status
  getStatus() {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    return {
      initialized: this.isInitialized,
      timezone: 'Asia/Kolkata',
      currentTime: currentTime,
      jobs: {
        dailyBroadcast: {
          schedule: '0 10 * * *',
          description: 'Daily outbreak broadcast at 10:00 AM IST'
        },
        testAlert: {
          schedule: '28 18 * * *',
          description: 'TEST ALERT: Outbreak broadcast at 6:28 PM IST TODAY',
          status: 'ACTIVE - Will trigger in 3 minutes!'
        },
        cleanup: {
          schedule: '0 2 * * *',
          description: 'Cleanup old alerts at 2:00 AM IST'
        }
      }
    };
  }

  // Notify admin of errors (placeholder for future implementation)
  async notifyAdminOfError(title, error) {
    // This could send email, Slack notification, etc.
    console.error(`🚨 ADMIN NOTIFICATION: ${title}`, error);
    
    // Future: Send notification to admin phone number
    // const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    // if (adminPhone) {
    //   await sendMessage(adminPhone, `🚨 ${title}: ${error.message}`);
    // }
  }
}

module.exports = new SchedulerService();
