const axios = require('axios');
const config = require('../config/environment');

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.accessToken = config.whatsapp.accessToken;
  }

  // Send a text message
  async sendMessage(to, message, options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message },
        ...options
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send interactive button message
  async sendInteractiveButtons(to, text, buttons, header = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: text },
          action: {
            buttons: buttons.map((button, index) => ({
              type: 'reply',
              reply: {
                id: button.id || `btn_${index}`,
                title: button.title.substring(0, 20) // WhatsApp limit
              }
            }))
          }
        }
      };

      if (header) {
        payload.interactive.header = { type: 'text', text: header };
      }

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending interactive buttons:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send list message (for menu options)
  async sendList(to, text, sections, buttonText = 'Choose Option') {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: text },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending list message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send image message
  async sendImage(to, imageUrl, caption = '') {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending image:', error.response?.data || error.message);
      throw error;
    }
  }

  // Mark message as read
  async markAsRead(messageId) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error.response?.data || error.message);
    }
  }

  // Get media URL
  async getMediaUrl(mediaId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.url;
    } catch (error) {
      console.error('Error getting media URL:', error.response?.data || error.message);
      throw error;
    }
  }

  // Download media content
  async downloadMedia(mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading media:', error.response?.data || error.message);
      throw error;
    }
  }

  // Language selection buttons
  getLanguageSelectionButtons() {
    return [
      { id: 'lang_en', title: '🇺🇸 English' },
      { id: 'lang_hi', title: '🇮🇳 हिंदी' },
      { id: 'lang_te', title: '🇮🇳 తెలుగు' },
      { id: 'lang_ta', title: '🇮🇳 தமிழ்' },
      { id: 'lang_or', title: '🇮🇳 ଓଡ଼ିଆ' }
    ];
  }

  // Script preference buttons for Indian languages
  getScriptPreferenceButtons(language) {
    const scripts = {
      hi: ['🇮🇳 हिंदी script', '🔤 English letters'],
      te: ['🇮🇳 తెలుగు script', '🔤 English letters'],
      ta: ['🇮🇳 தமிழ் script', '🔤 English letters'],
      or: ['🇮🇳 ଓଡ଼ିଆ script', '🔤 English letters']
    };

    if (!scripts[language]) return [];

    return [
      { id: 'script_native', title: scripts[language][0] },
      { id: 'script_trans', title: scripts[language][1] }
    ];
  }

  // Main menu buttons
  getMainMenuButtons(language = 'en') {
    const menus = {
      en: [
        { id: 'chat_ai', title: '🤖 Chat with AI' },
        { id: 'appointments', title: '📅 Appointments' },
        { id: 'preventive_tips', title: '🌱 Health Tips' },
        { id: 'symptom_check', title: '🩺 Check Symptoms' },
        { id: 'outbreak_alerts', title: '🚨 Outbreak Alerts' },
        { id: 'feedback', title: '📊 Feedback' }
      ],
      hi: [
        { id: 'chat_ai', title: '🤖 AI se baat' },
        { id: 'appointments', title: '📅 Appointment' },
        { id: 'preventive_tips', title: '🌱 Swasthya tips' },
        { id: 'symptom_check', title: '🩺 Lakshan check' },
        { id: 'outbreak_alerts', title: '🚨 Bimari alert' },
        { id: 'feedback', title: '📊 Feedback' }
      ]
      // Add other languages as needed
    };

    return menus[language] || menus.en;
  }
}

module.exports = WhatsAppService;