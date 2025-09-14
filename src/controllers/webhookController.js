const crypto = require('crypto');
const config = require('../config/environment');
const WhatsAppService = require('../services/whatsappService');
const MessageController = require('./messageController');

class WebhookController {
  constructor() {
    this.whatsappService = new WhatsAppService();
    this.messageController = new MessageController();
  }

  // Verify webhook (required by WhatsApp)
  async verifyWebhook(req, res) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Check if mode and token are correct
      if (mode === 'subscribe' && token === config.webhook.verifyToken) {
        console.log('✅ Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.error('❌ Webhook verification failed');
        res.status(403).send('Verification failed');
      }
    } catch (error) {
      console.error('Webhook verification error:', error);
      res.status(500).send('Internal server error');
    }
  }

  // Handle incoming webhook messages
  async handleWebhook(req, res) {
    try {
      const body = req.body;

      // Check if it's a WhatsApp webhook
      if (body.object !== 'whatsapp_business_account') {
        return res.status(400).send('Invalid webhook object');
      }

      // Process each entry in the webhook
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await this.processMessages(change.value);
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Internal server error');
    }
  }

  // Process incoming messages
  async processMessages(value) {
    try {
      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await this.handleIncomingMessage(message, value.metadata);
        }
      }

      // Handle message status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.handleMessageStatus(status);
        }
      }
    } catch (error) {
      console.error('Message processing error:', error);
    }
  }

  // Handle individual incoming message
  async handleIncomingMessage(message, metadata) {
    try {
      const phoneNumber = message.from;
      const messageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);

      console.log(`📱 Incoming message from ${phoneNumber}: ${JSON.stringify(message)}`);

      // Mark message as read
      await this.whatsappService.markAsRead(messageId);

      // Extract message content based on type
      let messageContent = '';
      let messageType = message.type;
      let mediaData = null;

      switch (message.type) {
        case 'text':
          messageContent = message.text.body;
          break;
        
        case 'interactive':
          if (message.interactive.type === 'button_reply') {
            messageContent = message.interactive.button_reply.id;
            messageType = 'button_reply';
          } else if (message.interactive.type === 'list_reply') {
            messageContent = message.interactive.list_reply.id;
            messageType = 'list_reply';
          }
          break;
        
        case 'image':
          messageContent = message.image.caption || '';
          mediaData = {
            id: message.image.id,
            mime_type: message.image.mime_type,
            sha256: message.image.sha256
          };
          
          // Download the actual image data for analysis
          try {
            console.log('🖼️ Downloading image for analysis...');
            const imageUrl = await this.whatsappService.getMediaUrl(message.image.id);
            const imageBuffer = await this.whatsappService.downloadMedia(imageUrl);
            mediaData.data = imageBuffer;
            console.log('✅ Image downloaded successfully');
          } catch (downloadError) {
            console.error('❌ Error downloading image:', downloadError);
            // Continue without image data, will fallback to text analysis
          }
          break;
        
        case 'audio':
          mediaData = {
            id: message.audio.id,
            mime_type: message.audio.mime_type,
            sha256: message.audio.sha256
          };
          break;
        
        case 'document':
          messageContent = message.document.caption || message.document.filename || '';
          mediaData = {
            id: message.document.id,
            mime_type: message.document.mime_type,
            sha256: message.document.sha256,
            filename: message.document.filename
          };
          break;
        
        default:
          console.log(`Unsupported message type: ${message.type}`);
          await this.whatsappService.sendMessage(
            phoneNumber,
            'Sorry, I can only process text messages and images at the moment. Please send a text message.'
          );
          return;
      }

      // Create message data object
      const messageData = {
        phoneNumber,
        messageId,
        content: messageContent,
        type: messageType,
        timestamp,
        mediaData,
        context: message.context // For replies
      };

      // Route message to appropriate handler
      await this.messageController.handleMessage(messageData);

    } catch (error) {
      console.error('Error handling incoming message:', error);
      
      // Send error message to user
      try {
        await this.whatsappService.sendMessage(
          message.from,
          'Sorry, I encountered an error processing your message. Please try again later.'
        );
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  }

  // Handle message status updates (delivered, read, etc.)
  async handleMessageStatus(status) {
    try {
      console.log(`📊 Message status update: ${status.id} - ${status.status}`);
      
      // You can implement status tracking here if needed
      // For example, update delivery status in database
      
    } catch (error) {
      console.error('Error handling message status:', error);
    }
  }

  // Validate webhook signature (optional security measure)
  validateSignature(req) {
    try {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        return false;
      }

      const elements = signature.split('=');
      const signatureHash = elements[1];
      
      const expectedHash = crypto
        .createHmac('sha256', config.whatsapp.clientSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }
}

module.exports = WebhookController;