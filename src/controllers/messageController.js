const WhatsAppService = require('../services/whatsappService');
const UserService = require('../services/userService');
const ConversationService = require('../services/conversationService');
const GeminiService = require('../services/geminiService');
const { LanguageUtils } = require('../utils/languageUtils');

class MessageController {
  constructor() {
    this.whatsappService = new WhatsAppService();
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.geminiService = new GeminiService();
  }

  // Main message handler - routes messages to appropriate handlers
  async handleMessage(messageData) {
    try {
      const { phoneNumber, content, type, messageId, timestamp, mediaData } = messageData;

      // Get or create user
      const user = await this.userService.getOrCreateUser(phoneNumber);
      const userSession = await this.userService.getUserSession(user.id);

      // Detect intent
      const currentState = userSession?.session_state || 'main_menu';
      const intent = this.conversationService.detectIntent(content, currentState);

      // Save user message
      await this.conversationService.saveUserMessage(user.id, content, {
        messageId,
        type,
        timestamp,
        mediaData,
        intent,
        language: user.preferred_language
      });

      // Check for emergency first
      if (intent === 'emergency' || LanguageUtils.detectEmergency(content, user.preferred_language)) {
        await this.handleEmergency(user, content);
        return;
      }

      // Handle accessibility commands
      if (intent === 'accessibility_command') {
        await this.handleAccessibilityCommand(user, content);
        return;
      }

      // Route to specific handlers based on intent and current state
      switch (intent) {
        case 'greeting':
          await this.handleGreeting(user);
          break;

        case 'language_selection':
          await this.handleLanguageSelection(user, content);
          break;

        case 'script_selection':
          await this.handleScriptSelection(user, content);
          break;

        case 'ai_chat':
        case 'ai_chat_message':
          await this.handleAIChat(user, content);
          break;

        case 'symptom_check':
        case 'symptom_input':
          await this.handleSymptomCheck(user, content, currentState);
          break;

        case 'preventive_tips':
        case 'preventive_tips_request':
          await this.handlePreventiveTips(user, content, currentState);
          break;

        case 'appointments':
          await this.handleAppointments(user);
          break;

        case 'more_options':
          await this.showMoreOptionsMenu(user);
          break;

        case 'back_to_menu':
          await this.showMainMenu(user);
          break;

        case 'outbreak_alerts':
          await this.handleOutbreakAlerts(user);
          break;

        case 'feedback':
        case 'feedback_input':
          await this.handleFeedback(user, content, currentState);
          break;

        case 'menu_request':
          await this.showMainMenu(user);
          break;

        default:
          await this.handleGeneralMessage(user, content);
          break;
      }

    } catch (error) {
      console.error('Error in handleMessage:', error);
      await this.handleError(messageData.phoneNumber, error);
    }
  }

  // Handle new user greeting or returning user
  async handleGreeting(user) {
    try {
      if (await this.userService.hasCompletedOnboarding(user.id)) {
        // Returning user - show main menu
        await this.showMainMenu(user);
      } else {
        // New user - show language selection
        await this.showLanguageSelection(user);
      }
    } catch (error) {
      console.error('Error in handleGreeting:', error);
      throw error;
    }
  }

  // Show language selection using list (supports 5 languages)
  async showLanguageSelection(user) {
    try {
      const welcomeText = LanguageUtils.getText('welcome', 'en');
      const languageList = this.whatsappService.getLanguageSelectionList();

      await this.whatsappService.sendList(
        user.phone_number,
        welcomeText,
        languageList.sections,
        'Choose Language'
      );

      await this.userService.updateUserSession(user.id, 'language_selection');
      
      await this.conversationService.saveBotMessage(
        user.id,
        welcomeText,
        'language_selection',
        'en'
      );
    } catch (error) {
      console.error('Error in showLanguageSelection:', error);
      throw error;
    }
  }

  // Handle language selection
  async handleLanguageSelection(user, selection) {
    try {
      const language = LanguageUtils.getLanguageFromButtonId(selection);
      
      if (!language || !LanguageUtils.isValidLanguage(language)) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          'Please select a valid language option.'
        );
        return;
      }

      // Update user language preference
      await this.userService.updateUserPreferences(user.id, {
        preferred_language: language
      });

      // Check if language has script options
      if (LanguageUtils.hasScriptOptions(language)) {
        await this.showScriptSelection(user, language);
      } else {
        // Go directly to main menu for English
        await this.showMainMenu(user);
      }
    } catch (error) {
      console.error('Error in handleLanguageSelection:', error);
      throw error;
    }
  }

  // Show script selection for Indian languages
  async showScriptSelection(user, language) {
    try {
      const scriptText = LanguageUtils.getText('script_selection', language);
      const buttons = this.whatsappService.getScriptPreferenceButtons(language);

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        scriptText,
        buttons
      );

      await this.userService.updateUserSession(user.id, 'script_selection', { language });
      
      await this.conversationService.saveBotMessage(
        user.id,
        scriptText,
        'script_selection',
        language
      );
    } catch (error) {
      console.error('Error in showScriptSelection:', error);
      throw error;
    }
  }

  // Handle script selection
  async handleScriptSelection(user, selection) {
    try {
      const scriptType = LanguageUtils.getScriptFromButtonId(selection);

      // Update user script preference
      await this.userService.updateUserPreferences(user.id, {
        script_preference: scriptType
      });

      // Show main menu
      await this.showMainMenu(user);
    } catch (error) {
      console.error('Error in handleScriptSelection:', error);
      throw error;
    }
  }

  // Show main menu using list (supports 6 options)
  async showMainMenu(user) {
    try {
      const menuText = LanguageUtils.getText('main_menu', user.preferred_language);
      const menuList = this.whatsappService.getMainMenuList(user.preferred_language);

      await this.whatsappService.sendList(
        user.phone_number,
        menuText,
        menuList.sections,
        'Choose Option'
      );

      await this.userService.updateUserSession(user.id, 'main_menu');
      
      await this.conversationService.saveBotMessage(
        user.id,
        menuText,
        'main_menu',
        user.preferred_language
      );
    } catch (error) {
      console.error('Error in showMainMenu:', error);
      throw error;
    }
  }

  // Show more options menu
  async showMoreOptionsMenu(user) {
    try {
      const moreOptionsText = LanguageUtils.getText('more_options_menu', user.preferred_language) || 
        'Additional Options — Choose what you need:';
      
      const buttons = this.whatsappService.getMoreOptionsButtons(user.preferred_language);
      
      // Note: Don't add back button here to stay within 3-button limit
      // Users can use the "Main Menu" quick action after any response

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        moreOptionsText,
        buttons
      );

      await this.userService.updateUserSession(user.id, 'more_options');
      
      await this.conversationService.saveBotMessage(
        user.id,
        moreOptionsText,
        'more_options_menu',
        user.preferred_language
      );
    } catch (error) {
      console.error('Error in showMoreOptionsMenu:', error);
      throw error;
    }
  }

  // Handle AI chat - continuous conversation
  async handleAIChat(user, message) {
    try {
      await this.userService.updateUserSession(user.id, 'ai_chat');

      // Get conversation context
      const context = await this.conversationService.getRecentContext(user.id);

      // Generate AI response with better prompts
      const aiResponse = await this.geminiService.generateResponse(
        message,
        user.preferred_language,
        user.script_preference,
        context,
        user.accessibility_mode
      );

      // Send response without menu options (continuous chat)
      await this.whatsappService.sendMessage(user.phone_number, aiResponse);

      // Save bot response
      await this.conversationService.saveBotMessage(
        user.id,
        aiResponse,
        'ai_chat_response',
        user.preferred_language
      );

      // Stay in ai_chat mode - no automatic menu switching
      // User needs to manually type 'menu' or 'back' to exit

    } catch (error) {
      console.error('Error in handleAIChat:', error);
      throw error;
    }
  }

  // Handle symptom checking
  async handleSymptomCheck(user, message, currentState) {
    try {
      if (currentState !== 'symptom_check') {
        // First time - ask for symptoms
        const promptText = this.getLocalizedText('symptom_prompt', user.preferred_language);
        await this.whatsappService.sendMessage(user.phone_number, promptText);
        await this.userService.updateUserSession(user.id, 'symptom_check');
      } else {
        // User provided symptoms - analyze
        const userProfile = {
          preferred_language: user.preferred_language,
          script_preference: user.script_preference,
          age: user.age,
          gender: user.gender
        };

        const analysis = await this.geminiService.analyzeSymptoms(message, userProfile);
        
        await this.whatsappService.sendMessage(user.phone_number, analysis);
        
        await this.conversationService.saveBotMessage(
          user.id,
          analysis,
          'symptom_analysis',
          user.preferred_language
        );

        // Show menu after analysis
        setTimeout(async () => {
          await this.showQuickActions(user);
        }, 1000);
      }
    } catch (error) {
      console.error('Error in handleSymptomCheck:', error);
      throw error;
    }
  }

  // Handle preventive tips
  async handlePreventiveTips(user, message, currentState) {
    try {
      if (currentState !== 'preventive_tips') {
        // Show tip categories using list
        const tipsList = this.whatsappService.getPreventiveTipsList(user.preferred_language);
        
        await this.whatsappService.sendList(
          user.phone_number,
          '🌱 Preventive Healthcare Tips\nChoose a category:',
          tipsList.sections,
          'Choose Category'
        );

        await this.userService.updateUserSession(user.id, 'preventive_tips');
      } else {
        // User selected category - generate tips
        const category = message.replace('learn_', '').replace('_', ' ');
        
        const userProfile = {
          preferred_language: user.preferred_language,
          script_preference: user.script_preference
        };

        const tips = await this.geminiService.getPreventiveTips(category, userProfile);
        
        await this.whatsappService.sendMessage(user.phone_number, tips);
        
        await this.conversationService.saveBotMessage(
          user.id,
          tips,
          'preventive_tips',
          user.preferred_language
        );

        // Return to main menu after tips
        setTimeout(async () => {
          await this.showMainMenu(user);
        }, 2000);
      }
    } catch (error) {
      console.error('Error in handlePreventiveTips:', error);
      throw error;
    }
  }

  // Handle coming soon features
  async handleAppointments(user) {
    const comingSoonText = LanguageUtils.getText('coming_soon', user.preferred_language);
    await this.whatsappService.sendMessage(user.phone_number, comingSoonText);
    
    await this.conversationService.saveBotMessage(
      user.id,
      comingSoonText,
      'coming_soon',
      user.preferred_language
    );

    setTimeout(async () => {
      await this.showMainMenu(user);
    }, 2000);
  }

  async handleOutbreakAlerts(user) {
    const comingSoonText = LanguageUtils.getText('coming_soon', user.preferred_language);
    await this.whatsappService.sendMessage(user.phone_number, comingSoonText);
    
    await this.conversationService.saveBotMessage(
      user.id,
      comingSoonText,
      'coming_soon',
      user.preferred_language
    );

    setTimeout(async () => {
      await this.showMainMenu(user);
    }, 2000);
  }

  // Handle feedback
  async handleFeedback(user, message, currentState) {
    try {
      if (currentState !== 'feedback') {
        // Show feedback options
        const feedbackButtons = [
          { id: 'feedback_good', title: '👍 Helpful' },
          { id: 'feedback_bad', title: '👎 Not Helpful' }
        ];

        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          'Was my last answer helpful?',
          feedbackButtons
        );

        await this.userService.updateUserSession(user.id, 'feedback');
      } else {
        // Process feedback
        await this.processFeedback(user, message);
      }
    } catch (error) {
      console.error('Error in handleFeedback:', error);
      throw error;
    }
  }

  // Process user feedback
  async processFeedback(user, feedback) {
    // This will be implemented in the feedback system task
    const thankYouText = 'Thank you for your feedback! It helps us improve.';
    await this.whatsappService.sendMessage(user.phone_number, thankYouText);
    
    setTimeout(async () => {
      await this.showMainMenu(user);
    }, 1000);
  }

  // Handle emergency situations
  async handleEmergency(user, message) {
    try {
      const emergencyText = LanguageUtils.getText('emergency_detected', user.preferred_language);
      
      await this.whatsappService.sendMessage(user.phone_number, emergencyText);
      
      await this.conversationService.saveBotMessage(
        user.id,
        emergencyText,
        'emergency_response',
        user.preferred_language,
        { trigger_message: message }
      );
    } catch (error) {
      console.error('Error in handleEmergency:', error);
      throw error;
    }
  }

  // Handle accessibility commands
  async handleAccessibilityCommand(user, command) {
    try {
      const commands = LanguageUtils.getAccessibilityCommands();
      let response = '';
      let newMode = user.accessibility_mode;

      switch (command) {
        case '/easy':
          newMode = 'easy';
          response = 'Switching to Easy Mode (simpler words).';
          break;
        case '/long':
          newMode = 'long';
          response = 'Switching to Long Text Mode (more spacing).';
          break;
        case '/audio':
          newMode = 'audio';
          response = 'Audio mode activated (optimized for voice).';
          break;
        case '/poster':
          response = 'Visual mode coming soon!';
          break;
        case '/reset':
          newMode = 'normal';
          response = 'All preferences reset to default.';
          break;
        default:
          response = 'Available commands:\n' + Object.entries(commands).map(([cmd, desc]) => `${cmd} - ${desc}`).join('\n');
      }

      if (newMode !== user.accessibility_mode) {
        await this.userService.updateUserPreferences(user.id, {
          accessibility_mode: newMode
        });
      }

      await this.whatsappService.sendMessage(user.phone_number, response);
      
      await this.conversationService.saveBotMessage(
        user.id,
        response,
        'accessibility_command',
        user.preferred_language
      );
    } catch (error) {
      console.error('Error in handleAccessibilityCommand:', error);
      throw error;
    }
  }

  // Handle general messages
  async handleGeneralMessage(user, message) {
    try {
      // Use AI to respond to general queries
      const context = await this.conversationService.getRecentContext(user.id);

      const aiResponse = await this.geminiService.generateResponse(
        message,
        user.preferred_language,
        user.script_preference,
        context,
        user.accessibility_mode
      );

      await this.whatsappService.sendMessage(user.phone_number, aiResponse);
      
      await this.conversationService.saveBotMessage(
        user.id,
        aiResponse,
        'general_response',
        user.preferred_language
      );

      // Show quick actions after response
      setTimeout(async () => {
        await this.showQuickActions(user);
      }, 1000);
    } catch (error) {
      console.error('Error in handleGeneralMessage:', error);
      throw error;
    }
  }

  // Show quick action buttons
  async showQuickActions(user) {
    try {
      const quickActions = [
        { id: 'menu', title: '📋 Main Menu' },
        { id: 'chat_ai', title: '🤖 Ask AI' },
        { id: 'feedback', title: '📊 Feedback' }
      ];

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        'What would you like to do next?',
        quickActions
      );
    } catch (error) {
      console.error('Error in showQuickActions:', error);
      // Fail silently for quick actions
    }
  }

  // Handle errors
  async handleError(phoneNumber, error) {
    try {
      const errorMessage = 'Sorry, I encountered an error. Please try again later or type "menu" for options.';
      await this.whatsappService.sendMessage(phoneNumber, errorMessage);
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }

  // Helper to get localized text
  getLocalizedText(key, language) {
    const texts = {
      symptom_prompt: {
        en: '🩺 Symptom Checker — please type your symptoms (e.g., "fever, cough") or attach supported images.\n⚠️ If you have severe chest pain, heavy bleeding, or trouble breathing, CALL 108 immediately.',
        hi: '🩺 लक्षण जांचकर्ता — कृपया अपने लक्षण लिखें (जैसे "बुखार, खांसी") या समर्थित चित्र संलग्न करें।\n⚠️ यदि आपको गंभीर छाती में दर्द, भारी रक्तस्राव, या सांस लेने में परेशानी है, तुरंत 108 पर कॉल करें।',
        te: '🩺 లక్షణ తనిఖీదారు — దయచేసి మీ లక్షణాలను టైప్ చేయండి (ఉదా. "జ్వరం, దగ్గు") లేదా మద్దతు ఉన్న చిత్రాలను అటాచ్ చేయండి।\n⚠️ మీకు తీవ్రమైన ఛాతీ నొప్పి, భారీ రక్తస్రావం లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంటే, వెంటనే 108కు కాల్ చేయండి।'
      }
    };

    return texts[key]?.[language] || texts[key]?.en || `Text not found: ${key}`;
  }
}

module.exports = MessageController;