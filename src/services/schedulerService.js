const cron = require('node-cron');
const AIDiseaseMonitorService = require('./aiDiseaseMonitorService');
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
    this.scheduleDailyMorningBroadcast();

    // Daily outbreak fetch and broadcast at 10:00 PM IST
    this.scheduleDailyEveningBroadcast();

    // TEST: Disease alert broadcast at 4:31 PM IST (for testing)
    this.scheduleTestBroadcast();

    // Cleanup old alerts daily at 2:00 AM IST
    this.scheduleCleanupOldAlerts();

    this.isInitialized = true;
    console.log('✅ Disease Outbreak Scheduler initialized successfully');
  }

  // Schedule daily morning outbreak broadcast at 10:00 AM IST
  scheduleDailyMorningBroadcast() {
    cron.schedule('0 10 * * *', async () => {
      console.log('🌅 Starting daily morning outbreak broadcast at 10:00 AM IST');
      
      try {
        // Create AI service instance
        const aiService = new AIDiseaseMonitorService();
        
        // Fetch today's national outbreak data
        const nationalAlert = await aiService.fetchNationwideDiseases();
        
        if (nationalAlert) {
          console.log(`📢 Broadcasting morning national alert`);
          
          // Broadcast to all subscribed users
          await broadcastService.broadcastToAllUsers(nationalAlert);
          
          console.log('✅ Daily morning outbreak broadcast completed successfully');
        } else {
          console.log('ℹ️ No national outbreak alert to broadcast this morning');
        }
        
      } catch (error) {
        console.error('❌ Error in daily morning outbreak broadcast:', error);
        
        // Send error notification to admin (if configured)
        await this.notifyAdminOfError('Daily Morning Outbreak Broadcast Failed', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    console.log('🌅 Daily morning outbreak broadcast scheduled for 10:00 AM IST');
  }

  // Schedule daily evening outbreak broadcast at 10:00 PM IST
  scheduleDailyEveningBroadcast() {
    cron.schedule('0 22 * * *', async () => {
      console.log('🌙 Starting daily evening outbreak broadcast at 10:00 PM IST');
      
      try {
        // Create AI service instance
        const aiService = new AIDiseaseMonitorService();
        
        // Fetch fresh evening outbreak data (may have updates from morning)
        const nationalAlert = await aiService.fetchNationwideDiseases();
        
        if (nationalAlert) {
          console.log(`📢 Broadcasting evening national alert`);
          
          // Broadcast to all subscribed users
          await broadcastService.broadcastToAllUsers(nationalAlert);
          
          console.log('✅ Daily evening outbreak broadcast completed successfully');
        } else {
          console.log('ℹ️ No national outbreak alert to broadcast this evening');
        }
        
      } catch (error) {
        console.error('❌ Error in daily evening outbreak broadcast:', error);
        
        // Send error notification to admin (if configured)
        await this.notifyAdminOfError('Daily Evening Outbreak Broadcast Failed', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    console.log('🌙 Daily evening outbreak broadcast scheduled for 10:00 PM IST');
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



  // Manual trigger for testing
  async triggerManualBroadcast() {
    console.log('🔧 Manual trigger: Starting outbreak broadcast...');
    
    try {
      // Create AI service instance
      const aiService = new AIDiseaseMonitorService();
      
      const nationalAlert = await aiService.fetchNationwideDiseases();
      
      if (nationalAlert) {
        await broadcastService.broadcastToAllUsers(nationalAlert);
        console.log('✅ Manual outbreak broadcast completed successfully');
        return { success: true, message: 'Outbreak broadcast completed successfully' };
      } else {
        console.log('ℹ️ No outbreak alert to broadcast');
        return { success: false, message: 'No outbreak alert available to broadcast' };
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
        morningBroadcast: {
          schedule: '0 10 * * *',
          description: 'Daily morning outbreak broadcast at 10:00 AM IST'
        },
        eveningBroadcast: {
          schedule: '0 22 * * *',
          description: 'Daily evening outbreak broadcast at 10:00 PM IST'
        },
        cleanup: {
          schedule: '0 2 * * *',
          description: 'Cleanup old alerts at 2:00 AM IST'
        }
      }
    };
  }

  // TEST: Schedule disease alert broadcast at 4:35 PM IST (for testing)
  scheduleTestBroadcast() {
    cron.schedule('35 16 * * *', async () => {
      console.log('🧪 TEST: Starting disease alert broadcast at 4:35 PM IST');
      
      try {
        // Create AI service instance
        const aiService = new AIDiseaseMonitorService();
        
        // Fetch today's national outbreak data
        const nationalAlert = await aiService.fetchNationwideDiseases();
        
        if (nationalAlert) {
          console.log(`📢 TEST: Broadcasting national alert`);
          
          // Broadcast to all subscribed users
          await broadcastService.broadcastToAllUsers(nationalAlert);
          
          console.log('✅ TEST: Disease alert broadcast completed successfully at 4:35 PM');
        } else {
          console.log('ℹ️ TEST: No national outbreak alert to broadcast');
        }
      } catch (error) {
        console.error('❌ TEST: Error during 4:35 PM disease alert broadcast:', error);
        await this.notifyAdminOfError('TEST Disease Alert Broadcast Failed', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
    
    console.log('🧪 TEST: Scheduled disease alert broadcast for 4:35 PM IST');
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
