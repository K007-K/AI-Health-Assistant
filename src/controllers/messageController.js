const WhatsAppService = require('../services/whatsappService');
const MockWhatsAppService = require('../services/mockWhatsappService');
const UserService = require('../services/userService');
const ConversationService = require('../services/conversationService');
const GeminiService = require('../services/geminiService');
const UserFeedbackService = require('../services/feedbackService');
const { LanguageUtils } = require('../utils/languageUtils');
const DiseaseAlertService = require('../services/diseaseAlertService');
const AIDiseaseMonitorService = require('../services/aiDiseaseMonitorService');

class MessageController {
  constructor() {
    // Use mock service in test environment
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_WHATSAPP === 'true';
    this.whatsappService = isTestMode ? new MockWhatsAppService() : new WhatsAppService();
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.geminiService = new GeminiService();
    this.userFeedbackService = new UserFeedbackService();
    this.diseaseAlertService = new DiseaseAlertService();
    this.aiDiseaseMonitorService = new AIDiseaseMonitorService();
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
      console.log(`🎯 Intent Detection: "${content}" → ${intent} (state: ${currentState})`);
      
      // Special handling for language change requests
      if (content.includes('Switch to different language') || content.includes('🌐 Change Language')) {
        console.log('🌐 Language change detected via special handling');
        await this.handleChangeLanguage(user);
        return;
      }

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

      // Handle special commands
      const lowerContent = content.toLowerCase();
      if (lowerContent === 'menu' || lowerContent === 'help' || lowerContent === 'start') {
        await this.showMainMenu(user);
        return;
      }

      // Handle STOP ALERTS command
      if (lowerContent === 'stop alerts' || lowerContent === 'unsubscribe') {
        await this.handleTurnOffAlerts(user);
        return;
      }

      // Handle waiting for alert location
      if (currentState === 'waiting_for_alert_location') {
        await this.handleAlertLocationInput(user, content);
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
          
        case 'change_language':
          console.log('🌐 Handling change_language intent');
          await this.handleChangeLanguage(user);
          break;

        case 'script_selection':
          await this.handleScriptSelection(user, content);
          break;

        case 'ai_chat':
        case 'ai_chat_message':
          await this.handleAIChat(user, content, mediaData);
          break;

        case 'symptom_check':
        case 'symptom_input':
          await this.handleSymptomCheck(user, content, currentState, mediaData);
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
        case 'feedback_button':
        case 'accuracy_report':
        case 'data_accuracy':
          await this.handleFeedback(user, content, messageId);
          break;

        case 'disease_alerts':
          await this.handleDiseaseAlerts(user);
          break;

        case 'view_active_diseases':
          await this.handleViewActiveDiseases(user);
          break;

        case 'turn_on_alerts':
          await this.handleTurnOnAlerts(user);
          break;

        case 'turn_off_alerts':
          await this.handleTurnOffAlerts(user);
          break;

        case 'confirm_turn_off_alerts':
          await this.handleConfirmTurnOffAlerts(user);
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
      console.log('🌍 Language selection received:', selection);
      
      let language = '';
      
      // Handle button IDs and numbered selections ONLY - no free text
      if (selection.startsWith('lang_')) {
        language = LanguageUtils.getLanguageFromButtonId(selection);
      } else if (selection === '1' || selection === '1️⃣') {
        language = 'en';
      } else if (selection === '2' || selection === '2️⃣') {
        language = 'hi';
      } else if (selection === '3' || selection === '3️⃣') {
        language = 'te';
      } else if (selection === '4' || selection === '4️⃣') {
        language = 'ta';
      } else if (selection === '5' || selection === '5️⃣') {
        language = 'or';
      } else {
        // Invalid selection - show language options again
        await this.whatsappService.sendMessage(
          user.phone_number,
          'Please select a valid option (1, 2, 3, 4, or 5) or use the interactive buttons above.'
        );
        return;
      }
      
      if (!language || !LanguageUtils.isValidLanguage(language)) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          'Please select a valid language option from the menu.'
        );
        return;
      }

      // Update user language preference
      const updatedUser = await this.userService.updateUserPreferences(user.id, {
        preferred_language: language
      });
      
      // Update the user object with new preferences
      user.preferred_language = language;
      const confirmationTexts = {
        en: '✅ Language changed to English successfully!',
        hi: '✅ भाषा सफलतापूर्वक हिंदी में बदल गई!',
        te: '✅ భాష విజయవంతంగా తెలుగులో మారింది!',
        ta: '✅ மெழி வெற்றிகரமாக தமிழ் இல் மாற்றப்பட்டது!',
        or: '✅ ଭାଷା ସଫଳତାରେ ଓଡ଼ିଆରେ ବଦଳାଇଲା!'
      };
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        confirmationTexts[language] || confirmationTexts.en
      );
      
      // Send language change instruction message
      const languageChangeInstructions = {
        en: '🔄 To change language later, just type "/language" at any time.',
        hi: '🔄 बाद में भाषा बदलने के लिए, कभी भी "/language" टाइप करें।',
        te: '🔄 తరువాత భాష మార్చాలి అనుకుంటే, ఏ సమయంలోనైనా "/language" టైప్ చేయండి.',
        ta: '🔄 பின்னர் மொழி மாற்ற வேண்டுமென்றால், ஏதைய நேரத்திலும் "/language" டைப் செய்யவும்.',
        or: '🔄 ପରେ ଭାଷା ବଦଳାଇବା ପାଇଁ, ଯେ କୋଣସି ସମୟରେ "/language" ଟାଇପ୍ କରନ୍ତୁ।'
      };
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        languageChangeInstructions[language] || languageChangeInstructions.en
      );

      // Check if language has script options (for Indian languages)
      if (LanguageUtils.hasScriptOptions(language)) {
        await this.showScriptSelection(user, language);
      } else {
        // Go directly to main menu for English
        setTimeout(async () => {
          await this.showMainMenu(user);
        }, 1500);
      }
    } catch (error) {
      console.error('Error in handleLanguageSelection:', error);
      throw error;
    }
  }

  // Handle language change request
  async handleChangeLanguage(user) {
    try {
      console.log('🌐 handleChangeLanguage called for user:', user.phone_number);
      
      // Send clean text message with language options
      const changeLanguageText = `🌐 Please choose your language:`;
      
      // Create interactive list for all 5 languages
      const languageList = {
        sections: [{
          title: "🌐 Available Languages",
          rows: [
            { id: 'lang_en', title: '🇺🇸 English', description: 'English Language' },
            { id: 'lang_hi', title: '🇮🇳 हिंदी (Hindi)', description: 'Hindi Language' },
            { id: 'lang_te', title: '🇮🇳 తెలుగు (Telugu)', description: 'Telugu Language' },
            { id: 'lang_ta', title: '🇮🇳 தமிழ் (Tamil)', description: 'Tamil Language' },
            { id: 'lang_or', title: '🇮🇳 ଓଡ଼ିଆ (Odia)', description: 'Odia Language' }
          ]
        }]
      };

      await this.whatsappService.sendList(
        user.phone_number,
        changeLanguageText,
        languageList.sections,
        'Choose Language'
      );

      await this.userService.updateUserSession(user.id, 'language_selection');
      
      await this.conversationService.saveBotMessage(
        user.id,
        changeLanguageText,
        'change_language',
        user.preferred_language
      );
      
      console.log('✅ Language selection sent successfully');
    } catch (error) {
      console.error('❌ Error in handleChangeLanguage:', error);
      // Send fallback message
      await this.whatsappService.sendMessage(
        user.phone_number,
        '🌐 Please choose your language:\n\nType: 1 (English), 2 (Hindi), 3 (Telugu), 4 (Tamil), 5 (Odia)'
      );
      await this.userService.updateUserSession(user.id, 'language_selection');
    }
  }

  // Show script selection for Indian languages
  async showScriptSelection(user, language) {
    try {
      const scriptTexts = {
        hi: 'Do you want:\n1️⃣ हिंदी script\n2️⃣ English letters (transliteration)',
        te: 'Do you want:\n1️⃣ తెలుగు script\n2️⃣ English letters (transliteration)',
        ta: 'Do you want:\n1️⃣ தமிழ் script\n2️⃣ English letters (transliteration)',
        or: 'Do you want:\n1️⃣ ଓଡ଼ିଆ script\n2️⃣ English letters (transliteration)'
      };
      
      const scriptText = scriptTexts[language] || 'Choose script type:';
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
      console.log('📋 Script selection received:', selection);
      let scriptType = '';
      
      // Only accept button IDs or numbered options
      if (selection === 'script_native' || selection === '1' || selection === '1️⃣' || selection.includes('Native script') || selection.includes('script')) {
        scriptType = 'native';
      } else if (selection === 'script_trans' || selection === '2' || selection === '2️⃣' || selection.includes('English letters') || selection.includes('letters')) {
        scriptType = 'transliteration';
      } else {
        // Invalid selection - show script options again
        await this.whatsappService.sendMessage(
          user.phone_number,
          'Please select option 1 or 2, or use the interactive buttons above.'
        );
        return;
      }

      console.log('✅ Script type selected:', scriptType);

      // Update user script preference
      const updatedUser = await this.userService.updateUserPreferences(user.id, {
        script_preference: scriptType
      });
      
      // Update the user object with new preferences
      user.script_preference = scriptType;

      console.log('✅ User preferences updated with script:', scriptType);

      // Show main menu
      await this.showMainMenu(user);
    } catch (error) {
      console.error('❌ Error in handleScriptSelection:', error);
      // Send error message to user
      await this.whatsappService.sendMessage(
        user.phone_number,
        'Sorry, there was an error processing your script selection. Please try again or type "menu" to return to main menu.'
      );
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

  // Handle AI chat - continuous conversation with image support
  async handleAIChat(user, message, mediaData = null) {
    try {
      await this.userService.updateUserSession(user.id, 'ai_chat');

      // Get conversation context
      const context = await this.conversationService.getRecentContext(user.id);

      let aiResponse = '';
      
      if (mediaData) {
        // Handle image analysis in AI chat
        console.log('🖼️ Processing image in AI chat...');
        aiResponse = await this.geminiService.analyzeHealthImage(
          mediaData.data, 
          message, 
          user.preferred_language
        );
      } else {
        // Generate AI response with better prompts
        aiResponse = await this.geminiService.generateResponse(
          message,
          user.preferred_language,
          user.script_preference,
          context,
          user.accessibility_mode,
          3,
          'general'
        );
      }

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

  // Handle symptom checking with enhanced analysis and follow-up
  async handleSymptomCheck(user, message, currentState, mediaData = null) {
    try {
      if (currentState !== 'symptom_check') {
        // First time - ask for symptoms
        const promptText = this.getLocalizedText('symptom_prompt', user.preferred_language);
        await this.whatsappService.sendMessage(user.phone_number, promptText);
        await this.userService.updateUserSession(user.id, 'symptom_check');
      } else {
        // User provided symptoms - analyze with enhanced questions
        const userProfile = {
          preferred_language: user.preferred_language,
          script_preference: user.script_preference,
          age: user.age,
          gender: user.gender
        };

        console.log('🩺 Analyzing symptoms:', message, mediaData ? 'with image' : 'text only');
        
        // Use symptom_check conversation mode for better analysis
        const analysis = mediaData 
          ? await this.geminiService.analyzeSymptoms(message, userProfile, mediaData)
          : await this.geminiService.generateResponse(
              message,
              user.preferred_language,
              user.script_preference,
              [],
              user.accessibility_mode,
              3,
              'symptom_check'
            );
        
        await this.whatsappService.sendMessage(user.phone_number, analysis);
        
        await this.conversationService.saveBotMessage(
          user.id,
          analysis,
          'symptom_analysis',
          user.preferred_language
        );

        // Show follow-up options after analysis
        setTimeout(async () => {
          await this.showSymptomFollowUpOptions(user);
        }, 2000);
      }
    } catch (error) {
      console.error('Error in handleSymptomCheck:', error);
      throw error;
    }
  }

  // Handle preventive tips with enhanced information and follow-up
  async handlePreventiveTips(user, message, currentState) {
    try {
      const userSession = await this.userService.getUserSession(user.id);
      const sessionData = userSession?.context_data || {};
      
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
      } else if (sessionData.waitingForDiseaseName) {
        // User entered disease name
        const diseaseName = message.trim();
        
        const userProfile = {
          preferred_language: user.preferred_language,
          script_preference: user.script_preference
        };

        console.log('🦠 Generating disease information for:', diseaseName);
        
        // Use disease_awareness conversation mode for proper disease detection
        const context = await this.conversationService.getConversationHistory(user.id, 3);
        const diseaseInfo = await this.geminiService.generateResponse(
          diseaseName,
          user.preferred_language,
          user.script_preference,
          context,
          user.accessibility_mode,
          3,
          'disease_awareness'
        );
        
        await this.whatsappService.sendMessage(user.phone_number, diseaseInfo);
        
        await this.conversationService.saveBotMessage(
          user.id,
          diseaseInfo,
          'disease_information',
          user.preferred_language
        );

        // Clear waiting state and show follow-up options
        await this.userService.updateUserSession(user.id, 'preventive_tips', { waitingForDiseaseName: false });
        
        setTimeout(async () => {
          await this.showPreventiveTipsFollowUpOptions(user);
        }, 2000);
        return; // Important: return here to avoid falling through to other logic
      } else {
        // User selected category - determine category and provide detailed information
        let category = 'general health';
        let specificTopic = '';
        
        // Check for exact button IDs first
        if (message === 'learn_diseases') {
          category = 'disease prevention';
          // Ask user to enter disease name
          const promptTexts = {
            en: '🦠 *Learn about Diseases*\n\nPlease type the name of the disease you want to learn about.\n\n_Examples:_ diabetes, hypertension, malaria, tuberculosis, heart disease, cancer, covid, dengue, etc.',
            hi: '🦠 *बीमारियों के बारे में जानें*\n\nकृपया उस बीमारी का नाम टाइप करें जिसके बारे में आप जानना चाहते हैं।\n\n_उदाहरण:_ मधुमेह, उच्च रक्तचाप, मलेरिया, तपेदिक, हृदय रोग, कैंसर, कोविड, डेंगू आदि।',
            te: '🦠 *వ్యాధుల గురించి తెలుసుకోండి*\n\nదయచేసి మీరు తెలుసుకోవాలనుకుంటున్న వ్యాధి పేరు టైప్ చేయండి।\n\n_ఉదాహరణలు:_ మధుమేహం, రక్తపోటు, మలేరియా, క్షయవ్యాధి, గుండె జబ్బులు, క్యాన్సర్, కోవిడ్, డెంగ్యూ వంటివి।'
          };
          
          await this.whatsappService.sendMessage(
            user.phone_number, 
            promptTexts[user.preferred_language] || promptTexts.en
          );
          
          // Set session to wait for disease name
          await this.userService.updateUserSession(user.id, 'preventive_tips', { waitingForDiseaseName: true });
          return;
        } else if (message === 'nutrition_hygiene') {
          category = 'nutrition and hygiene';
        } else if (message === 'exercise_lifestyle') {
          category = 'exercise and lifestyle';
        } 
        // Check for text-based selections
        else if (message.includes('🦠 Learn about Diseases') || message.toLowerCase().includes('learn about diseases')) {
          // Same as learn_diseases button
          const promptTexts = {
            en: '🦠 *Learn about Diseases*\n\nPlease type the name of the disease you want to learn about.\n\n_Examples:_ diabetes, hypertension, malaria, tuberculosis, heart disease, cancer, covid, dengue, etc.',
            hi: '🦠 *बीमारियों के बारे में जानें*\n\nकृपया उस बीमारी का नाम टाइप करें जिसके बारे में आप जानना चाहते हैं।\n\n_उदाहरण:_ मधुमेह, उच्च रक्तचाप, मलेरिया, तपेदिक, हृदय रोग, कैंसर, कोविड, डेंगू आदि।',
            te: '🦠 *వ్యాధుల గురించి తెలుసుకోండి*\n\nదయచేసి మీరు తెలుసుకోవాలనుకుంటున్న వ్యాధి పేరు టైప్ చేయండి।\n\n_ఉదాహరణలు:_ మధుమేహం, రక్తపోటు, మలేరియా, క్షయవ్యాధి, గుండె జబ్బులు, క్యాన్సర్, కోవిడ్, డెంగ్యూ వంటివి।'
          };
          
          await this.whatsappService.sendMessage(
            user.phone_number, 
            promptTexts[user.preferred_language] || promptTexts.en
          );
          
          await this.userService.updateUserSession(user.id, 'preventive_tips', { waitingForDiseaseName: true });
          return;
        } else if (message.includes('🥗 Nutrition') || message.toLowerCase().includes('nutrition') || message.toLowerCase().includes('hygiene')) {
          category = 'nutrition and hygiene';
        } else if (message.includes('🏃 Exercise') || message.toLowerCase().includes('exercise') || message.toLowerCase().includes('lifestyle')) {
          category = 'exercise and lifestyle';
        }
        
        const userProfile = {
          preferred_language: user.preferred_language,
          script_preference: user.script_preference
        };

        console.log('🌱 Generating preventive tips for:', category, specificTopic ? `(${specificTopic})` : '');
        const tips = await this.geminiService.getPreventiveTips(category, userProfile, specificTopic);
        
        await this.whatsappService.sendMessage(user.phone_number, tips);
        
        await this.conversationService.saveBotMessage(
          user.id,
          tips,
          'preventive_tips',
          user.preferred_language
        );

        // Show follow-up options after tips
        setTimeout(async () => {
          await this.showPreventiveTipsFollowUpOptions(user);
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
      const userSession = await this.userService.getUserSession(user.id);
      const sessionData = userSession?.context_data || {};
      
      if (currentState !== 'feedback') {
        // Show feedback prompt
        const feedbackPrompt = `📊 *Feedback & Help*

Help us improve! Please share:

• Suggestions for improvements
• Report errors or bugs
• Request help or support
• General feedback about the bot

Type your message below:`;

        await this.whatsappService.sendMessage(
          user.phone_number,
          feedbackPrompt
        );

        await this.userService.updateUserSession(user.id, 'feedback', { waitingForFeedback: true });
      } else if (sessionData.waitingForFeedback) {
        // User provided feedback - save it
        const feedbackText = message.trim();
        
        // Save feedback to database (you can expand this to save to a feedback table)
        await this.conversationService.saveBotMessage(
          user.id,
          `Feedback received: ${feedbackText}`,
          'user_feedback',
          user.preferred_language
        );

        // Send confirmation
        const thankYouTexts = {
          en: '✅ Thank you for your feedback! Your message has been sent to our team for review. We appreciate your input to help us improve the healthcare assistant.',
          hi: '✅ आपके फीडबैक के लिए धन्यवाद! आपका संदेश समीक्षा के लिए हमारी टीम को भेज दिया गया है। स्वास्थ्य सहायक को बेहतर बनाने में आपके योगदान की हम सराहना करते हैं।',
          te: '✅ మీ ఫీడ్‌బ్యాక్‌కు ధన్యవాదాలు! మీ సందేశం సమీక్ష కోసం మా బృందానికి పంపబడింది. ఆరోగ్య సహాయకుడిని మెరుగుపరచడంలో మీ సహాయాన్ని మేము అభినందిస్తున్నాము।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          thankYouTexts[user.preferred_language] || thankYouTexts.en
        );

        // Clear feedback state
        await this.userService.updateUserSession(user.id, 'feedback', { waitingForFeedback: false });
        
        // Show main menu after 2 seconds
        setTimeout(async () => {
          await this.showMainMenu(user);
        }, 2000);
        return;
      } else {
        // Fallback - treat as feedback
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

  // Show follow-up options after symptom analysis
  async showSymptomFollowUpOptions(user) {
    try {
      const followUpTexts = {
        en: '🤔 Want to know more about your symptoms or have additional questions?',
        hi: '🤔 क्या आप अपने लक्षणों के बारे में और जानना चाहते हैं?',
        te: '🤔 మీ లక్షణాల గురించి ఎక్కువ తెలుసుకోవాలనుకుంటున్నారా?'
      };
      
      const followUpButtons = [
        { id: 'ai_chat', title: '🤖 Ask AI More Questions' },
        { id: 'menu', title: '📋 Main Menu' },
        { id: 'symptom_check', title: '🔄 Check Other Symptoms' }
      ];

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        followUpTexts[user.preferred_language] || followUpTexts.en,
        followUpButtons
      );
    } catch (error) {
      console.error('Error in showSymptomFollowUpOptions:', error);
      // Fail silently
    }
  }

  // Show follow-up options after preventive tips
  async showPreventiveTipsFollowUpOptions(user) {
    try {
      const followUpTexts = {
        en: '💬 Want to learn more details or have specific questions about this topic?',
        hi: '💬 क्या आप इस विषय में और जानकारी चाहते हैं?',
        te: '💬 ఈ విషయం గురించి మరిన్ని వివరాలు తెలుసుకోవాలనుకుంటున్నారా?'
      };
      
      const followUpButtons = [
        { id: 'ai_chat', title: '🤖 Chat with AI' },
        { id: 'menu', title: '📋 Main Menu' },
        { id: 'preventive_tips', title: '🔄 More Tips' }
      ];

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        followUpTexts[user.preferred_language] || followUpTexts.en,
        followUpButtons
      );
    } catch (error) {
      console.error('Error in showPreventiveTipsFollowUpOptions:', error);
      // Fail silently
    }
  }

  // Handle Disease Outbreak Alerts
  async handleDiseaseAlerts(user) {
    try {
      console.log('🦠 Handling disease outbreak alerts for user:', user.phone_number);
      
      // Show disease alerts submenu with interactive buttons (max 3) + follow-up
      const menuTexts = {
        en: '🦠 *Disease Outbreak Alerts*\n\nStay informed about disease outbreaks in your area:',
        hi: '🦠 *रोग प्रकोप अलर्ट*\n\nअपने क्षेत्र में रोग प्रकोप के बारे में सूचित रहें:',
        te: '🦠 *వ్యాధి వ్యాప్తి హెచ్చరికలు*\n\nమీ ప్రాంతంలో వ్యాధి వ్యాప్తి గురించి సూచనలు పొందండి:',
        ta: '🦠 *நோய் விரிவு எச்சரிக்கைகள்*\n\nஉங்கள் பரிசரத்தில் நோய் விரிவு குறித்து தகவல் பெறுங்கள்:',
        or: '🦠 *ରୋଗ ପ୍ରସାର ସଚେତନା*\n\nଆପଣଙ୍କ ଅଞ୍ଚଳରେ ରୋଗ ପ୍ରସାର ବିଷୟରେ ସୂଚିତ ରହନ୍ତୁ:'
      };

      // Use interactive buttons (WhatsApp limit: max 3 buttons)
      const buttonTexts = {
        en: [
          { id: 'view_active_diseases', title: '📊 View Diseases' },
          { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' },
          { id: 'turn_off_alerts', title: '🔕 Turn OFF Alerts' }
        ],
        hi: [
          { id: 'view_active_diseases', title: '📊 रोग देखें' },
          { id: 'turn_on_alerts', title: '🔔 अलर्ट चालू करें' },
          { id: 'turn_off_alerts', title: '🔕 अलर्ट बंद करें' }
        ],
        te: [
          { id: 'view_active_diseases', title: '📊 వ్యాధులు చూడండి' },
          { id: 'turn_on_alerts', title: '🔔 అలర్ट్ ఆన్ చేయండి' },
          { id: 'turn_off_alerts', title: '🔕 అలర్ट్ ఆఫ్ చేయండి' }
        ],
        ta: [
          { id: 'view_active_diseases', title: '📊 நோய்கள் பார்க்கவும்' },
          { id: 'turn_on_alerts', title: '🔔 எச்சரிக்கை ஆன்' },
          { id: 'turn_off_alerts', title: '🔕 எச்சரிக்கை ஆஃப்' }
        ],
        or: [
          { id: 'view_active_diseases', title: '📊 ରୋଗ ଦେଖନ୍ତୁ' },
          { id: 'turn_on_alerts', title: '🔔 ସଚେତନା ଚାଲୁ କରନ୍ତୁ' },
          { id: 'turn_off_alerts', title: '🔕 ସଚେତନା ବନ୍ଦ କରନ୍ତୁ' }
        ]
      };
      
      const menuButtons = buttonTexts[user.preferred_language] || buttonTexts.en;

      try {
        // Send interactive buttons
        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          menuTexts[user.preferred_language] || menuTexts.en,
          menuButtons
        );
        
        // Send follow-up message with additional options
        setTimeout(async () => {
          try {
            const followUpTexts = {
              en: 'Additional options:',
              hi: 'अतिरिक्त विकल्प:',
              te: 'అతిరిక్త వिకల్पాలు:',
              ta: 'கூடுதல் வिகல்पங்கள்:',
              or: 'ଅତिରिକ୍ତ ବिକଲ்प:'
            };
            
            const followUpButtons = {
              en: [{ id: 'back_to_menu', title: '↩️ Back to Menu' }],
              hi: [{ id: 'back_to_menu', title: '↩️ मेनू में वापस' }],
              te: [{ id: 'back_to_menu', title: '↩️ मेनూకు తिరिగि వెళ్ళండि' }],
              ta: [{ id: 'back_to_menu', title: '↩️ मெனுவिல் தिருम்पவுम்' }],
              or: [{ id: 'back_to_menu', title: '↩️ मେନୁକୁ ଫिରिଯिବा' }]
            };
            
            await this.whatsappService.sendInteractiveButtons(
              user.phone_number,
              followUpTexts[user.preferred_language] || followUpTexts.en,
              followUpButtons[user.preferred_language] || followUpButtons.en
            );
          } catch (followUpError) {
            console.error('Follow-up buttons failed:', followUpError);
          }
        }, 1000);
        
        console.log('✅ Disease alerts submenu sent as interactive buttons');
        
      } catch (buttonError) {
        console.error('❌ Interactive buttons failed, using simple text menu:', buttonError);
        
        // Enhanced fallback with clear instructions
        const fallbackTexts = {
          en: `📊 *Type: diseases* - View Active Diseases
🔔 *Type: alerts on* - Turn ON Alerts
🔕 *Type: alerts off* - Turn OFF Alerts
↩️ *Type: menu* - Back to Menu

Just type any of the commands above to continue.`,
          hi: `📊 *लिखें: diseases* - सक्रिय रोग देखें
🔔 *लिखें: alerts on* - अलर्ट चालू करें
🔕 *लिखें: alerts off* - अलर्ट बंद करें
↩️ *लिखें: menu* - मेनू में वापस

आगे बढ़ने के लिए उपरोक्त कमांड में से कोई भी टाइप करें।`,
          te: `📊 *టाఇप్ చేयండि: diseases* - సక्రिय వ्యाధులు చూడండि
🔔 *టाఇप్ చేयండि: alerts on* - అలర्ट్ ఆన్ చేयండि
🔕 *టाఇप్ చేयండि: alerts off* - అలర्ट్ ఆफ్ చేयండि
↩️ *టाఇप్ చేयండि: menu* - मెనూకు తिరिగि వెళ्ళండि

ముందుకు వెళ्ళడाనिకि మీద కमाండ्లలो ఏదైనा టाఇप్ చేयండि।`,
          ta: `📊 *டाயिप் செय्यவுम்: diseases* - தற्பोதைय நोय्களை பाர्க्கவுम்
🔔 *டाயिप் செय्यவுम்: alerts on* - எச्சரिக्கை ஆன்
🔕 *டाயिप் செय्यவுम்: alerts off* - எச्சரिக्கை ஆफ்
↩️ *டाயिप் செय्यவுम்: menu* - मெனுவिல் தिருम्पவுम்

தॊடர मேலே உள्ள கमाண्டுகளिல் ஏதைयுम் டाயिप் செय्यவுम்।`,
          or: `📊 *ଲिଖନ्ତୁ: diseases* - ସକ्ରिय ରोଗ ଦେଖନ्ତୁ
🔔 *ଲिଖନ्ତୁ: alerts on* - ସଚେତନा ଚाଲୁ କରନ्ତୁ
🔕 *ଲिଖନ्ତୁ: alerts off* - ସଚେତନा ବନ्ଦ କରନ्ତୁ
↩️ *ଲिଖନ्ତୁ: menu* - मେନୁକୁ ଫिରियिବा

ଆଗକୁ बଢ़िबा ପाଇଁ ଉपରोକ्ତ କमाଣ्ଡ मଧ्यରୁ ଯେକोଣସि ଲिଖନ्ତୁ।`
        };
        
        const textMenu = `${menuTexts[user.preferred_language] || menuTexts.en}

${fallbackTexts[user.preferred_language] || fallbackTexts.en}`;
        
        await this.whatsappService.sendMessage(user.phone_number, textMenu);
        console.log('✅ Disease alerts submenu sent as text (fallback)');
      }

      await this.userService.updateUserSession(user.id, 'disease_alerts');
      
    } catch (error) {
      console.error('Error in handleDiseaseAlerts:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle viewing active diseases
  async handleViewActiveDiseases(user, specificDisease = null) {
    try {
      console.log('📊 Showing active diseases to user:', user.phone_number);
      
      // Get user location from preferences if registered for alerts
      const { data: alertPrefs } = await this.diseaseAlertService.supabase
        .from('user_alert_preferences')
        .select('state, district, pincode')
        .eq('phone_number', user.phone_number)
        .single();

      const userLocation = alertPrefs || null;
      
      // Get active disease information
      const diseases = await this.diseaseAlertService.getActiveDiseaseInfo(specificDisease);
      
      if (diseases.length === 0) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '✅ Good news! No major disease outbreaks reported currently.\n\nStay healthy and maintain good hygiene practices!'
        );
        return;
      }

      // Format and send disease information
      for (const disease of diseases.slice(0, 3)) { // Show top 3 diseases
        const message = this.diseaseAlertService.formatDiseaseInfo(disease, userLocation);
        await this.whatsappService.sendMessage(user.phone_number, message);
        
        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Show follow-up options
      const followUpButtons = [
        { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
        { id: 'disease_alerts', title: '↩️ Back' },
        { id: 'back_to_menu', title: '🏠 Main Menu' }
      ];

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        'Would you like to receive alerts for disease outbreaks in your area?',
        followUpButtons
      );
      
    } catch (error) {
      console.error('Error showing active diseases:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle turning on alerts
  async handleTurnOnAlerts(user) {
    try {
      console.log('🔔 User requesting to turn on alerts:', user.phone_number);
      
      // Check if already registered
      const isRegistered = await this.diseaseAlertService.isUserRegistered(user.phone_number);
      
      if (isRegistered) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '✅ You are already registered for disease outbreak alerts!\n\nYou will receive notifications about disease outbreaks in your area.\n\nReply "STOP ALERTS" anytime to unsubscribe.'
        );
        return;
      }

      // Ask for location details
      const locationPrompts = {
        en: '📍 *Location Required for Alerts*\n\nTo send you relevant disease outbreak alerts, please provide your location:\n\n*Format:* State, District, Pincode\n*Example:* Maharashtra, Mumbai, 400001\n\nPlease enter your location:',
        hi: '📍 *अलर्ट के लिए स्थान आवश्यक*\n\nआपको प्रासंगिक रोग प्रकोप अलर्ट भेजने के लिए, कृपया अपना स्थान प्रदान करें:\n\n*प्रारूप:* राज्य, जिला, पिनकोड\n*उदाहरण:* महाराष्ट्र, मुंबई, 400001\n\nकृपया अपना स्थान दर्ज करें:'
      };

      await this.whatsappService.sendMessage(
        user.phone_number,
        locationPrompts[user.preferred_language] || locationPrompts.en
      );

      // Update session to wait for location
      await this.userService.updateUserSession(user.id, 'waiting_for_alert_location');
      
    } catch (error) {
      console.error('Error in handleTurnOnAlerts:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle location input for alerts
  async handleAlertLocationInput(user, location) {
    try {
      console.log('📍 Processing location for alerts:', location);
      
      // Parse location (expecting format: State, District, Pincode)
      const parts = location.split(',').map(p => p.trim());
      
      if (parts.length < 3) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ Invalid format. Please provide location as:\nState, District, Pincode\n\nExample: Maharashtra, Mumbai, 400001'
        );
        return;
      }

      const [state, district, pincode] = parts;
      
      // Register user for alerts
      const result = await this.diseaseAlertService.registerUserForAlerts(
        user.phone_number,
        user.id,
        { state, district, pincode }
      );

      if (result.success) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          `✅ *Alert Registration Successful!*\n\n📍 *Location:* ${district}, ${state} - ${pincode}\n\n🔔 You will now receive real-time disease outbreak alerts for your area.\n\n*Alert Settings:*\n• Severity: Medium and above\n• Frequency: Immediate for critical alerts\n• Time: 8 AM - 8 PM\n\nReply "STOP ALERTS" anytime to unsubscribe.`
        );
        
        // Return to main menu
        setTimeout(async () => {
          await this.showMainMenu(user);
        }, 2000);
      } else {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ Failed to register for alerts. Please try again later.'
        );
      }
      
      // Clear waiting state
      await this.userService.updateUserSession(user.id, 'main_menu');
      
    } catch (error) {
      console.error('Error processing alert location:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle turning off alerts
  async handleTurnOffAlerts(user) {
    try {
      console.log('🔕 User requesting to turn off alerts:', user.phone_number);
      
      // Check if registered
      const isRegistered = await this.diseaseAlertService.isUserRegistered(user.phone_number);
      
      if (!isRegistered) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ You are not registered for disease alerts.\n\nWould you like to register to receive disease outbreak alerts in your area?'
        );
        
        const buttons = [
          { id: 'turn_on_alerts', title: '🔔 Register for Alerts' },
          { id: 'back_to_menu', title: '↩️ Back to Menu' }
        ];
        
        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          'Choose an option:',
          buttons
        );
        return;
      }

      // Ask for confirmation
      const confirmButtons = [
        { id: 'confirm_turn_off_alerts', title: '✅ Yes, Turn Off' },
        { id: 'disease_alerts', title: '❌ Cancel' }
      ];

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        '⚠️ *Confirm Turn Off Alerts*\n\nAre you sure you want to stop receiving disease outbreak alerts?\n\nYou will no longer be notified about disease outbreaks in your area.',
        confirmButtons
      );
      
    } catch (error) {
      console.error('Error in handleTurnOffAlerts:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle confirmation to turn off alerts
  async handleConfirmTurnOffAlerts(user) {
    try {
      console.log('✅ Confirming turn off alerts for:', user.phone_number);
      
      const result = await this.diseaseAlertService.unregisterUserFromAlerts(user.phone_number);
      
      if (result.success) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '✅ *Alerts Turned Off Successfully*\n\nYou have been unregistered from disease outbreak alerts.\n\nYou can turn them back on anytime from the Disease Alerts menu.\n\nStay healthy! 🌟'
        );
      } else {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ Failed to turn off alerts. Please try again later.'
        );
      }
      
      // Return to main menu
      setTimeout(async () => {
        await this.showMainMenu(user);
      }, 2000);
      
    } catch (error) {
      console.error('Error confirming turn off alerts:', error);
      await this.handleError(user.phone_number, error);
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