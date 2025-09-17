/**
 * Mock WhatsApp Service for Testing
 * Prevents 401 errors during testing by mocking WhatsApp API calls
 */

class MockWhatsAppService {
  constructor() {
    this.sentMessages = [];
    this.isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_WHATSAPP === 'true';
  }

  // Mock send message
  async sendMessage(phoneNumber, message) {
    if (this.isTestMode) {
      console.log(`📱 MOCK: Sending message to ${phoneNumber}`);
      console.log(`💬 Message: ${message.substring(0, 100)}...`);
      
      const mockMessageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.sentMessages.push({
        id: mockMessageId,
        to: phoneNumber,
        message: message,
        timestamp: new Date(),
        status: 'sent'
      });
      
      return mockMessageId;
    }
    
    // In production, this would call the real WhatsApp API
    throw new Error('Real WhatsApp API not configured for testing');
  }

  // Mock send interactive buttons
  async sendInteractiveButtons(phoneNumber, message, buttons) {
    if (this.isTestMode) {
      console.log(`📱 MOCK: Sending interactive buttons to ${phoneNumber}`);
      console.log(`💬 Message: ${message}`);
      console.log(`🔘 Buttons: ${buttons.map(b => b.title).join(', ')}`);
      
      const mockMessageId = `mock_btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.sentMessages.push({
        id: mockMessageId,
        to: phoneNumber,
        message: message,
        buttons: buttons,
        timestamp: new Date(),
        status: 'sent',
        type: 'interactive_buttons'
      });
      
      return mockMessageId;
    }
    
    throw new Error('Real WhatsApp API not configured for testing');
  }

  // Mock send list
  async sendList(phoneNumber, message, sections, buttonText) {
    if (this.isTestMode) {
      console.log(`📱 MOCK: Sending list to ${phoneNumber}`);
      console.log(`💬 Message: ${message}`);
      console.log(`📋 Sections: ${sections.length} sections`);
      
      const mockMessageId = `mock_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.sentMessages.push({
        id: mockMessageId,
        to: phoneNumber,
        message: message,
        sections: sections,
        buttonText: buttonText,
        timestamp: new Date(),
        status: 'sent',
        type: 'list'
      });
      
      return mockMessageId;
    }
    
    throw new Error('Real WhatsApp API not configured for testing');
  }

  // Get language selection list (same as real service)
  getLanguageSelectionList() {
    return {
      sections: [{
        title: "🌐 Select Language",
        rows: [
          { id: 'lang_en', title: 'English', description: '🇺🇸 English Language' },
          { id: 'lang_hi', title: 'हिंदी (Hindi)', description: '🇮🇳 Hindi Language' },
          { id: 'lang_te', title: 'తెలుగు (Telugu)', description: '🇮🇳 Telugu Language' },
          { id: 'lang_ta', title: 'தமிழ் (Tamil)', description: '🇮🇳 Tamil Language' },
          { id: 'lang_or', title: 'ଓଡ଼ିଆ (Odia)', description: '🇮🇳 Odia Language' }
        ]
      }]
    };
  }

  // Get main menu list (same as real service)
  getMainMenuList(language = 'en') {
    const menus = {
      en: {
        sections: [{
          title: "📋 Main Menu",
          rows: [
            { id: 'chat_ai', title: '🤖 Chat with AI', description: 'Ask health questions & get guidance' },
            { id: 'symptom_check', title: '🩺 Check Symptoms', description: 'Analyze symptoms & get recommendations' },
            { id: 'preventive_tips', title: '🌱 Health Tips', description: 'Learn about diseases, nutrition & lifestyle' },
            { id: 'disease_alerts', title: '🦠 Disease Outbreak Alerts', description: 'View active diseases & manage alerts' },
            { id: 'change_language', title: '🌐 Change Language', description: 'Switch to different language' },
            { id: 'feedback', title: '📊 Feedback & Accuracy', description: 'Rate responses & help improve accuracy' }
          ]
        }]
      },
      hi: {
        sections: [{
          title: "📋 मुख्य मेनू",
          rows: [
            { id: 'chat_ai', title: '🤖 AI से बात करें', description: 'स्वास्थ्य प्रश्न पूछें और मार्गदर्शन पाएं' },
            { id: 'symptom_check', title: '🩺 लक्षण जांचें', description: 'लक्षणों का विश्लेषण करें और सिफारिशें पाएं' },
            { id: 'preventive_tips', title: '🌱 स्वास्थ्य सुझाव', description: 'बीमारियों, पोषण और जीवनशैली के बारे में जानें' },
            { id: 'disease_alerts', title: '🦠 रोग प्रकोप अलर्ट', description: 'सक्रिय रोग देखें और अलर्ट प्रबंधित करें' },
            { id: 'change_language', title: '🌐 भाषा बदलें', description: 'अलग भाषा में बदलें' },
            { id: 'feedback', title: '📊 फीडबैक और सटीकता', description: 'प्रतिक्रियाओं को रेट करें और सटीकता सुधारने में मदद करें' }
          ]
        }]
      }
    };
    
    return menus[language] || menus.en;
  }

  // Get sent messages for testing
  getSentMessages() {
    return this.sentMessages;
  }

  // Clear sent messages
  clearSentMessages() {
    this.sentMessages = [];
  }

  // Get message count
  getMessageCount() {
    return this.sentMessages.length;
  }

  // Check if message was sent to phone number
  wasMessageSentTo(phoneNumber) {
    return this.sentMessages.some(msg => msg.to === phoneNumber);
  }

  // Get last message sent to phone number
  getLastMessageTo(phoneNumber) {
    const messages = this.sentMessages.filter(msg => msg.to === phoneNumber);
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }
}

module.exports = MockWhatsAppService;
