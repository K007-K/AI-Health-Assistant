const User = require('../models/User');
const OutbreakAlert = require('../models/OutbreakAlert');
const { sendMessage } = require('./whatsappService');

class BroadcastService {
  constructor() {
    this.isProcessing = false;
    this.batchSize = 50; // Send messages in batches to avoid rate limits
    this.delayBetweenBatches = 2000; // 2 seconds delay between batches
  }

  // Broadcast national outbreak alert to all users
  async broadcastNationalAlert(alert) {
    if (this.isProcessing) {
      console.log('⏳ Broadcast already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log(`📢 Starting broadcast of national alert: ${alert.alertId}`);
      
      // Get all active users
      const users = await User.find({ 
        isActive: true,
        phoneNumber: { $exists: true, $ne: null }
      }).select('phoneNumber language scriptPreference');

      console.log(`👥 Found ${users.length} users for broadcast`);

      if (users.length === 0) {
        console.log('ℹ️ No users found for broadcast');
        return;
      }

      // Process users in batches
      const batches = this.createBatches(users, this.batchSize);
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📤 Processing batch ${i + 1}/${batches.length} (${batch.length} users)`);

        const batchPromises = batch.map(user => 
          this.sendAlertToUser(user, alert)
        );

        const results = await Promise.allSettled(batchPromises);
        
        // Count successes and failures
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            totalSent++;
            // Mark as sent in database
            alert.markAsSent(batch[index].phoneNumber);
          } else {
            totalFailed++;
            console.error(`❌ Failed to send to ${batch[index].phoneNumber}:`, result.reason);
          }
        });

        // Delay between batches to respect rate limits
        if (i < batches.length - 1) {
          await this.delay(this.delayBetweenBatches);
        }
      }

      console.log(`✅ Broadcast completed: ${totalSent} sent, ${totalFailed} failed`);
      
      // Update alert statistics
      alert.totalRecipients = totalSent;
      await alert.save();

    } catch (error) {
      console.error('❌ Error in broadcast:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Send alert to individual user
  async sendAlertToUser(user, alert) {
    try {
      const language = user.language || 'en';
      const formattedMessage = alert.getFormattedAlert(language);
      
      // Add broadcast header
      const broadcastMessage = `🚨 *HEALTH ALERT BROADCAST*\n\n${formattedMessage}\n\n_This is an automated health alert. Reply 'STOP ALERTS' to unsubscribe._`;

      await sendMessage(user.phoneNumber, broadcastMessage);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send alert to ${user.phoneNumber}:`, error);
      return false;
    }
  }

  // Send state-specific alert to user
  async sendStateAlertToUser(phoneNumber, alert, language = 'en') {
    try {
      const formattedMessage = alert.getFormattedAlert(language);
      
      // Add state-specific header
      const stateMessage = `🏛️ *STATE HEALTH ALERT*\n\n${formattedMessage}\n\n_This information is specific to your state. For national alerts, they are sent daily at 10 AM._`;

      await sendMessage(phoneNumber, stateMessage);
      
      // Mark as sent
      await alert.markAsSent(phoneNumber);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to send state alert to ${phoneNumber}:`, error);
      return false;
    }
  }

  // Create batches from user array
  createBatches(users, batchSize) {
    const batches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }
    return batches;
  }

  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get broadcast statistics
  async getBroadcastStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await OutbreakAlert.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          queryType: 'daily_national'
        }
      },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          avgRecipients: { $avg: '$totalRecipients' }
        }
      }
    ]);

    return stats[0] || { totalAlerts: 0, totalRecipients: 0, avgRecipients: 0 };
  }

  // Handle user unsubscribe
  async handleUnsubscribe(phoneNumber) {
    try {
      await User.findOneAndUpdate(
        { phoneNumber: phoneNumber },
        { 
          alertsEnabled: false,
          unsubscribedAt: new Date()
        }
      );
      
      const unsubscribeMessage = `✅ *Alert Unsubscribed*

You have been unsubscribed from health alerts.

*To resubscribe:* Reply 'START ALERTS'

_You can still use all other bot features normally._`;

      await sendMessage(phoneNumber, unsubscribeMessage);
      console.log(`✅ User ${phoneNumber} unsubscribed from alerts`);
    } catch (error) {
      console.error(`❌ Error unsubscribing ${phoneNumber}:`, error);
    }
  }

  // Handle user resubscribe
  async handleResubscribe(phoneNumber) {
    try {
      await User.findOneAndUpdate(
        { phoneNumber: phoneNumber },
        { 
          alertsEnabled: true,
          $unset: { unsubscribedAt: 1 }
        }
      );
      
      const resubscribeMessage = `✅ *Alert Resubscribed*

You are now subscribed to daily health alerts!

*📅 Daily Alerts:* Sent every day at 10:00 AM
*🏛️ State Alerts:* Available on request
*🚨 Emergency Alerts:* Sent when critical

_Welcome back to health alerts!_`;

      await sendMessage(phoneNumber, resubscribeMessage);
      console.log(`✅ User ${phoneNumber} resubscribed to alerts`);
    } catch (error) {
      console.error(`❌ Error resubscribing ${phoneNumber}:`, error);
    }
  }
}

module.exports = new BroadcastService();
