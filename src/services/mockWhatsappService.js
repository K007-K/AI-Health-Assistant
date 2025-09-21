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
    console.log(`📱 MOCK: Sending message to ${phoneNumber}`);
    console.log(`💬 Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.sentMessages.push({
      id: mockMessageId,
      to: phoneNumber,
      message: message,
      timestamp: new Date(),
      status: 'sent',
      type: 'text'
    });
    
    return { messages: [{ id: mockMessageId }] };
  }

  // Mock send interactive buttons
  async sendInteractiveButtons(phoneNumber, message, buttons, header = null) {
    console.log(`📱 MOCK: Sending interactive buttons to ${phoneNumber}`);
    console.log(`💬 Message: ${message}`);
    console.log(`🔘 Buttons: ${buttons.length} buttons`);
    
    const mockMessageId = `mock_buttons_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.sentMessages.push({
      id: mockMessageId,
      to: phoneNumber,
      message: message,
      buttons: buttons,
      header: header,
      timestamp: new Date(),
      status: 'sent',
      type: 'interactive_buttons'
    });
    
    return { messages: [{ id: mockMessageId }] };
  }

  // Mock send interactive list (simplified interface)
  async sendInteractiveList(phoneNumber, message, buttonText, items) {
    console.log(`📱 MOCK: Sending interactive list to ${phoneNumber}`);
    console.log(`💬 Message: ${message}`);
    console.log(`🔘 Button: ${buttonText}`);
    console.log(`📋 Items: ${items.length} items`);
    
    // Convert items to sections format and use sendList
    const sections = [{
      title: 'Options',
      rows: items.map(item => ({
        id: item.id,
        title: item.title.length > 24 ? item.title.substring(0, 21) + '...' : item.title,
        description: item.description || ''
      }))
    }];
    
    return await this.sendList(phoneNumber, message, sections, buttonText);
  }

  // Mock send list
  async sendList(phoneNumber, message, sections, buttonText) {
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
    
    return { 
      messages: [{ id: mockMessageId }],
      success: true 
    };
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
            { id: 'change_language', title: '🌐 Change Language', description: 'Switch to different language' }
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

  // Get inline feedback buttons (thumbs up/down)
  getInlineFeedbackButtons(language = 'en') {
    return [
      { id: 'feedback_good', title: '👍' },
      { id: 'feedback_bad', title: '👎' }
    ];
  }

  // Mock typing indicator
  async sendTypingIndicator(to) {
    console.log(`⌨️ MOCK: Typing indicator ON for ${to}`);
    return { success: true };
  }

  // Mock stop typing indicator
  async stopTypingIndicator(to) {
    console.log(`⌨️ MOCK: Typing indicator OFF for ${to}`);
    return { success: true };
  }

  // Mock send message with inline feedback buttons (Meta style)
  async sendMessageWithFeedback(to, text, messageId = null) {
    console.log(`📱 MOCK: Sending message with feedback to ${to}`);
    console.log(`💬 Message: ${text.substring(0, 100)}...`);
    console.log(`👍👎 Feedback buttons: Meta style (no text, just icons)`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  // Get main menu buttons (same as real service)
  getMainMenuButtons(language = 'en', scriptType = 'native') {
    const buttons = {
      en: [
        { type: 'reply', reply: { id: 'chat_ai', title: '🤖 Chat with AI' } },
        { type: 'reply', reply: { id: 'symptom_check', title: '🩺 Check Symptoms' } },
        { type: 'reply', reply: { id: 'more_options', title: '⚙️ More Options' } }
      ],
      hi: [
        { type: 'reply', reply: { id: 'chat_ai', title: '🤖 AI से बात करें' } },
        { type: 'reply', reply: { id: 'symptom_check', title: '🩺 लक्षण जांचें' } },
        { type: 'reply', reply: { id: 'more_options', title: '⚙️ और विकल्प' } }
      ],
      te: [
        { type: 'reply', reply: { id: 'chat_ai', title: '🤖 AI తో చాట్' } },
        { type: 'reply', reply: { id: 'symptom_check', title: '🩺 లక్షణాలు చూడండి' } },
        { type: 'reply', reply: { id: 'more_options', title: '⚙️ మరిన్ని ఆప్షన్స్' } }
      ],
      hi_trans: [
        { type: 'reply', reply: { id: 'chat_ai', title: '🤖 AI se baat karo' } },
        { type: 'reply', reply: { id: 'symptom_check', title: '🩺 Lakshan jancho' } },
        { type: 'reply', reply: { id: 'more_options', title: '⚙️ Aur vikalp' } }
      ],
      te_trans: [
        { type: 'reply', reply: { id: 'chat_ai', title: '🤖 AI tho chat cheyandi' } },
        { type: 'reply', reply: { id: 'symptom_check', title: '🩺 Lakshanalu chudandi' } },
        { type: 'reply', reply: { id: 'more_options', title: '⚙️ Marini options' } }
      ]
    };
    
    // Check for transliterated version first
    if (scriptType === 'transliteration' && language !== 'en') {
      const transKey = `${language}_trans`;
      if (buttons[transKey]) {
        return buttons[transKey];
      }
    }
    
    return buttons[language] || buttons.en;
  }

  // Get script preference buttons
  getScriptPreferenceButtons(language) {
    return [
      { type: 'reply', reply: { id: 'script_native', title: `📜 Native Script` } },
      { type: 'reply', reply: { id: 'script_transliteration', title: `🅰️ Roman Letters` } }
    ];
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
