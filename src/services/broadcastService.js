const User = require('../models/User');
const OutbreakAlert = require('../models/OutbreakAlert');
const WhatsAppService = require('./whatsappService');

class BroadcastService {
  constructor() {
    this.isProcessing = false;
    this.batchSize = 50; // Send messages in batches to avoid rate limits
    this.delayBetweenBatches = 2000; // 2 seconds delay between batches
    this.whatsappService = new WhatsAppService();
  }

  // Broadcast national outbreak alert to all users
  async broadcastNationalAlert(alert) {
    if (this.isProcessing) {
      console.log('⏳ Broadcast already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log(`📢 Starting broadcast for alert: ${alert.alert_id}`);
      
      // Get all subscribed users
      const subscribedUsers = await User.getSubscribedUsers();
      
      if (subscribedUsers.length === 0) {
        console.log('ℹ️ No subscribed users found for broadcast');
        return { success: true, userCount: 0 };
      }

      console.log(`👥 Broadcasting to ${subscribedUsers.length} subscribed users`);
      
      let successCount = 0;
      let errorCount = 0;

      // Process users in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < subscribedUsers.length; i += batchSize) {
        const batch = subscribedUsers.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            // Get formatted alert for user's language
            const language = user.language || 'en';
            const formattedAlert = alert.getFormattedAlert(language);
            
            // Send WhatsApp message
            await this.whatsappService.sendMessage(user.phone_number, formattedAlert);
            
            // Also check for state-specific alerts for this user
            await this.sendStateSpecificAlert(user);
            
            // Mark alert as sent to this user
            await alert.markAsSent(user.phone_number);
            
            successCount++;
            console.log(`✅ Sent alert to ${user.phone_number}`);
            
          } catch (userError) {
            console.error(`❌ Failed to send to ${user.phone_number}:`, userError);
            errorCount++;
          }
        }));

        // Add delay between batches to respect rate limits
        if (i + batchSize < subscribedUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      console.log(`📊 Broadcast completed: ${successCount} success, ${errorCount} errors`);
      
      return {
        success: true,
        userCount: subscribedUsers.length,
        successCount: successCount,
        errorCount: errorCount
      };
      
    } catch (error) {
      console.error('❌ Error in broadcastNationalAlert:', error);
      throw error;
    }
  }

  // Send state-specific alert to user if available
  async sendStateSpecificAlert(user) {
    try {
      // Check if user has alert preferences with state information
      const userState = user.alertPreferences?.state;
      
      if (!userState) {
        console.log(`ℹ️ No state preferences for user ${user.phone_number}, skipping state alert`);
        return;
      }

      // Get today's state-specific alert (cached or fresh)
      const stateAlert = await OutbreakAlert.getStateAlert(userState);
      
      if (stateAlert) {
        const language = user.preferred_language || 'en';
        const formattedStateAlert = stateAlert.getFormattedAlert(language);
        
        // Add state-specific header with district info
        const district = user.alertPreferences?.district;
        const stateHeader = {
          en: `\n\n🏛️ *${userState} State Alert*${district ? ` (${district} District)` : ''}\n\n`,
          hi: `\n\n🏛️ *${userState} राज्य अलर्ट*${district ? ` (${district} जिला)` : ''}\n\n`
        };
        
        const stateMessage = (stateHeader[language] || stateHeader.en) + formattedStateAlert;
        
        // Send state-specific alert
        await this.whatsappService.sendMessage(user.phone_number, stateMessage);
        
        console.log(`🏛️ Sent cached state alert for ${userState} to ${user.phone_number}`);
      } else {
        console.log(`ℹ️ No state alert available for ${userState} today`);
      }
      
    } catch (error) {
      console.error(`⚠️ Error sending state alert to ${user.phone_number}:`, error);
      // Don't throw - this is supplementary to national alert
    }
  }

  // Send alert to individual user
  async sendAlertToUser(user, alert) {
    try {
      const language = user.language || 'en';
      const formattedMessage = alert.getFormattedAlert(language);
      
      // Add broadcast header
      const broadcastMessage = `🚨 *HEALTH ALERT BROADCAST*\n\n${formattedMessage}\n\n_This is an automated health alert. Reply 'STOP ALERTS' to unsubscribe._`;

      await this.whatsappService.sendMessage(user.phoneNumber, broadcastMessage);
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

      await this.whatsappService.sendMessage(phoneNumber, stateMessage);
      
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

      await this.whatsappService.sendMessage(phoneNumber, unsubscribeMessage);
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

      await this.whatsappService.sendMessage(phoneNumber, resubscribeMessage);
      console.log(`✅ User ${phoneNumber} resubscribed to alerts`);
    } catch (error) {
      console.error(`❌ Error resubscribing ${phoneNumber}:`, error);
    }
  }
}

module.exports = new BroadcastService();
