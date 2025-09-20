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

      // Handle state name input (when user types state name)
      if (currentState === 'selecting_state') {
        await this.handleStateNameInput(user, content);
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

        case 'confirm_delete_alert_data':
          await this.handleConfirmDeleteAlertData(user);
          break;

        case 'confirm_disable_alerts':
          await this.handleConfirmDisableAlerts(user);
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
      const confirmationText = LanguageUtils.getText('language_success', language);
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        confirmationText
      );
      
      // Send language change instruction message (always in native script for language confirmation)
      const instructionText = LanguageUtils.getText('language_change_instruction', language);
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        instructionText
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
      
      // Only accept button IDs or numbered options - CHECK TRANSLITERATION FIRST!
      if (selection === 'script_trans' || selection === '2' || selection === '2️⃣' || selection.includes('English letters') || selection.includes('letters')) {
        scriptType = 'transliteration';
      } else if (selection === 'script_native' || selection === '1' || selection === '1️⃣' || selection.includes('Native script') || selection.includes('script')) {
        scriptType = 'native';
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
      
      // Update the user object with new preferences from the database response
      user.script_preference = updatedUser.script_preference;
      
      console.log('✅ User preferences updated with script:', scriptType);
      console.log('🔍 User object script_preference:', user.script_preference);
      console.log('🔍 Updated user from DB script_preference:', updatedUser.script_preference);

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

  // Show main menu using interactive buttons (more reliable)
  async showMainMenuButtons(user) {
    try {
      console.log('📱 Showing main menu with interactive buttons...');
      
      const menuText = LanguageUtils.getText('main_menu', user.preferred_language, 'en', user.script_preference);
      const mainButtons = this.whatsappService.getMainMenuButtons(user.preferred_language, user.script_preference);
      
      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        menuText,
        mainButtons
      );

      await this.userService.updateUserSession(user.id, 'main_menu');
      
      await this.conversationService.saveBotMessage(
        user.id,
        menuText,
        'main_menu',
        user.preferred_language
      );
    } catch (error) {
      console.error('Error in showMainMenuButtons:', error);
      throw error;
    }
  }

  // Show main menu using list (supports 6 options)
  async showMainMenu(user) {
    try {
      // Validate user data and provide defaults
      const safeUser = {
        preferred_language: user.preferred_language || 'en',
        script_preference: user.script_preference || 'native',
        phone_number: user.phone_number || 'unknown',
        id: user.id || 'unknown'
      };
      
      console.log('🔍 DEBUG showMainMenu - User script_preference:', safeUser.script_preference);
      console.log('🔍 DEBUG showMainMenu - User preferred_language:', safeUser.preferred_language);
      
      const menuText = LanguageUtils.getText('main_menu', safeUser.preferred_language, 'en', safeUser.script_preference);
      const menuList = this.whatsappService.getMainMenuList(safeUser.preferred_language, safeUser.script_preference);
      
      console.log('🔍 DEBUG showMainMenu - Generated menu text preview:', menuText.substring(0, 50) + '...');

      // Use interactive list (like Images 2 & 3)
      console.log('📱 Using interactive list for main menu...');
      
      await this.whatsappService.sendList(
        safeUser.phone_number,
        menuText,
        menuList.sections,
        'Choose Option'
      );

      await this.userService.updateUserSession(safeUser.id, 'main_menu');
      
      await this.conversationService.saveBotMessage(
        safeUser.id,
        menuText,
        'main_menu',
        safeUser.preferred_language
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
      // Check if this is the first AI chat message (when coming from menu)
      const currentSession = await this.userService.getUserSession(user.id);
      const isFirstAIMessage = currentSession?.session_state !== 'ai_chat';
      
      await this.userService.updateUserSession(user.id, 'ai_chat');

      // If first AI message, send helpful instructions
      if (isFirstAIMessage) {
        const instructionText = LanguageUtils.getText('ai_chat_instructions', user.preferred_language, 'en', user.script_preference);
        await this.whatsappService.sendMessage(user.phone_number, instructionText);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
      }

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
        console.log('🔍 DEBUG handleAIChat - User script_preference:', user.script_preference);
        console.log('🔍 DEBUG handleAIChat - User preferred_language:', user.preferred_language);
        
        aiResponse = await this.geminiService.generateResponse(
          message,
          user.preferred_language,
          user.script_preference,
          context,
          user.accessibility_mode,
          3,
          'general'
        );
        
        console.log('🔍 DEBUG handleAIChat - AI response preview:', aiResponse.substring(0, 50) + '...');
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

        // Keep user in symptom_check state for continuous conversation
        // Don't show follow-up buttons - let conversation flow naturally
        // User can continue asking questions or type 'menu' to exit
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

        // Clear waiting state and keep user in preventive_tips for continuous conversation
        await this.userService.updateUserSession(user.id, 'preventive_tips', { waitingForDiseaseName: false });
        
        // Don't show follow-up buttons - let conversation flow naturally
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

        // Keep user in preventive_tips state for continuous conversation
        // Don't show follow-up buttons - let conversation flow naturally
      }
    } catch (error) {
      console.error('Error in handlePreventiveTips:', error);
      throw error;
    }
  }

  // Prioritize diseases by location relevance
  prioritizeDiseasesByLocation(diseases, userLocation) {
    if (!userLocation || !userLocation.state) {
      return diseases;
    }

    const userState = userLocation.state.toLowerCase();
    const userDistrict = userLocation.district?.toLowerCase();
    
    // Define nearby states for better regional relevance
    const nearbyStates = {
      'andhra pradesh': ['telangana', 'karnataka', 'tamil nadu', 'odisha'],
      'telangana': ['andhra pradesh', 'karnataka', 'maharashtra', 'odisha'],
      'karnataka': ['andhra pradesh', 'telangana', 'tamil nadu', 'kerala', 'maharashtra', 'goa'],
      'tamil nadu': ['andhra pradesh', 'karnataka', 'kerala', 'puducherry'],
      'kerala': ['tamil nadu', 'karnataka'],
      'maharashtra': ['karnataka', 'telangana', 'gujarat', 'madhya pradesh', 'goa'],
      'gujarat': ['maharashtra', 'rajasthan', 'madhya pradesh'],
      'rajasthan': ['gujarat', 'haryana', 'punjab', 'uttar pradesh', 'madhya pradesh'],
      'uttar pradesh': ['delhi', 'haryana', 'rajasthan', 'madhya pradesh', 'bihar'],
      'bihar': ['uttar pradesh', 'jharkhand', 'west bengal'],
      'west bengal': ['bihar', 'jharkhand', 'odisha', 'sikkim'],
      'odisha': ['west bengal', 'jharkhand', 'andhra pradesh', 'telangana'],
      'punjab': ['haryana', 'himachal pradesh', 'rajasthan'],
      'haryana': ['punjab', 'delhi', 'uttar pradesh', 'rajasthan'],
      'delhi': ['haryana', 'uttar pradesh']
    };

    const prioritizedDiseases = diseases.map(disease => {
      const location = disease.location?.toLowerCase() || '';
      let priority = 4; // Default: nationwide
      let isLocal = false;
      let isState = false;
      let isNearby = false;

      // Check for district-level match (highest priority)
      if (userDistrict && location.includes(userDistrict)) {
        priority = 1;
        isLocal = true;
      }
      // Check for state-level match
      else if (location.includes(userState)) {
        priority = 2;
        isState = true;
      }
      // Check for nearby states
      else if (nearbyStates[userState]?.some(state => location.includes(state))) {
        priority = 3;
        isNearby = true;
      }

      return {
        ...disease,
        priority,
        isLocal,
        isState,
        isNearby,
        relevanceScore: this.calculateRelevanceScore(disease, userLocation)
      };
    });

    // Sort by priority (1 = most relevant), then by relevance score
    return prioritizedDiseases.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.relevanceScore - a.relevanceScore;
    });
  }

  // Calculate relevance score based on severity, cases, and recency
  calculateRelevanceScore(disease, userLocation) {
    let score = 0;
    
    // Severity indicators
    const severityKeywords = ['death', 'severe', 'critical', 'outbreak', 'epidemic'];
    const description = (disease.description || '').toLowerCase();
    severityKeywords.forEach(keyword => {
      if (description.includes(keyword)) score += 10;
    });
    
    // Case count indicators
    const caseNumbers = description.match(/\d+/g);
    if (caseNumbers) {
      const maxCases = Math.max(...caseNumbers.map(Number));
      if (maxCases > 100) score += 15;
      else if (maxCases > 50) score += 10;
      else if (maxCases > 10) score += 5;
    }
    
    // Recent mentions (current year)
    const currentYear = new Date().getFullYear();
    if (description.includes(currentYear.toString())) {
      score += 5;
    }
    
    return score;
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

        // Send confirmation using getText with script preference
        const thankYouText = LanguageUtils.getText('feedback_thanks', user.preferred_language, 'en', user.script_preference);
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          thankYouText
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
          { id: 'view_active_diseases', title: '🦠 Disease Outbreak' },
          { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' },
          { id: 'turn_off_alerts', title: '🔕 Turn OFF Alerts' }
        ],
        hi: [
          { id: 'view_active_diseases', title: '🦠 रोग प्रकोप' },
          { id: 'turn_on_alerts', title: '🔔 अलर्ट चालू करें' },
          { id: 'turn_off_alerts', title: '🔕 अलर्ट बंद करें' }
        ],
        te: [
          { id: 'view_active_diseases', title: '🦠 వ్యాధి వ్యాప్తి' },
          { id: 'turn_on_alerts', title: '🔔 అలర్ట్ ఆన్ చేయండి' },
          { id: 'turn_off_alerts', title: '🔕 అలర్ట్ ఆఫ్ చేయండి' }
        ],
        ta: [
          { id: 'view_active_diseases', title: '🦠 நோய் விரிவு' },
          { id: 'turn_on_alerts', title: '🔔 எச்சரிக்கை ஆன்' },
          { id: 'turn_off_alerts', title: '🔕 எச்சரிக்கை ஆஃப்' }
        ],
        or: [
          { id: 'view_active_diseases', title: '🦠 ରୋଗ ପ୍ରସାର' },
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

  // Handle viewing active diseases with smart caching
  async handleViewActiveDiseases(user) {
    try {
      console.log('🦠 Showing current disease outbreaks to user:', user.phone_number);
      
      // Initialize cache service
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      // Get user's selected state for targeted alerts
      const userStateInfo = await cacheService.getUserSelectedState(user.phone_number);
      const userStateName = userStateInfo?.indian_states?.state_name || null;
      
      // Get disease outbreak data using smart caching (no redundant queries)
      const diseaseData = await cacheService.getDiseaseOutbreakData(userStateName);
      
      // Send multilingual main header
      const locationText = userStateName ? ` in ${userStateName}` : ' in India';
      const currentDate = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const headerTemplate = LanguageUtils.getText('disease_outbreak_header', user.preferred_language, 'en', user.script_preference);
      const headerText = headerTemplate.replace('{location}', locationText).replace('{date}', currentDate);
      
      await this.whatsappService.sendMessage(user.phone_number, headerText);
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Use cached disease data (eliminates redundant API calls)
        const diseases = diseaseData.diseases || [];
        
        if (!diseases || diseases.length === 0) {
          const noDiseaseText = LanguageUtils.getText('no_diseases_found', user.preferred_language, 'en', user.script_preference);
          await this.whatsappService.sendMessage(user.phone_number, noDiseaseText);
          return;
        }

        // Prioritize diseases by location relevance
        const userLocation = userStateName ? { state: userStateName } : null;
        let relevantDiseases = this.prioritizeDiseasesByLocation(diseases, userLocation);
        
        // If user has selected state, show state-specific header
        if (userStateName) {
          const stateDiseases = relevantDiseases.filter(d => d.isState || d.isLocal);

          if (stateDiseases.length > 0) {
            const stateHeaderTemplate = LanguageUtils.getText('disease_state_header', user.preferred_language, 'en', user.script_preference);
            const stateHeaderText = stateHeaderTemplate.replace('{state}', userStateName);
            await this.whatsappService.sendMessage(user.phone_number, stateHeaderText);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        // Send diseases in priority order with clear sections
        let sentCount = 0;
        let hasShownNationalHeader = false;
        
        for (const disease of relevantDiseases.slice(0, 4)) {
          // Show national header when we move from local/state to national diseases
          if (!hasShownNationalHeader && disease.priority === 4 && sentCount > 0) {
            const nationalHeaderText = LanguageUtils.getText('disease_national_header', user.preferred_language, 'en', user.script_preference);
            await this.whatsappService.sendMessage(user.phone_number, `\n${nationalHeaderText}`);
            await new Promise(resolve => setTimeout(resolve, 300));
            hasShownNationalHeader = true;
          }
          
          const message = this.formatLocationAwareDiseaseNews(disease, userLocation);
          await this.whatsappService.sendMessage(user.phone_number, message);
          
          sentCount++;
          // Add delay between messages
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        // Generate disease-specific prevention recommendations
        const specificPrevention = this.generateDiseaseSpecificPrevention(relevantDiseases, user.preferred_language, user.script_preference);
        
        await this.whatsappService.sendMessage(user.phone_number, specificPrevention);

        // Show data source and follow-up options
        const sourceText = diseaseData.source === 'cache' ? '💾 Cached data' : '🆕 Fresh data';
        
        const followUpButtons = [
          { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
          { id: 'disease_alerts', title: '↩️ Back' },
          { id: 'back_to_menu', title: '🏠 Main Menu' }
        ];

        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          `📱 Want alerts for disease outbreaks in your area? ${sourceText}`,
          followUpButtons
        );
        
      } catch (aiError) {
        console.error('AI disease monitoring failed:', aiError);
        
        // Fall back to simple message with general prevention if everything fails
        const fallbackPrevention = LanguageUtils.getText('disease_prevention_summary', user.preferred_language, 'en', user.script_preference);
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          '🦠 *Current Disease Outbreaks in India*\n\n• Seasonal flu cases reported in multiple states\n• Dengue cases increasing in urban areas\n• Maintain hygiene and seek medical help if needed\n\n🛡️ Stay safe and healthy!'
        );
        
        await this.whatsappService.sendMessage(user.phone_number, fallbackPrevention);
        
        // Show follow-up options even in fallback
        const followUpButtons = [
          { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
          { id: 'disease_alerts', title: '↩️ Back' },
          { id: 'back_to_menu', title: '🏠 Main Menu' }
        ];

        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          '📱 Want alerts for disease outbreaks in your area?',
          followUpButtons
        );
      }
      
    } catch (error) {
      console.error('Error showing disease outbreaks:', error);
      
      // Send error message with fallback prevention
      const fallbackPrevention = LanguageUtils.getText('disease_prevention_summary', user.preferred_language, 'en', user.script_preference);
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        '❌ Sorry, unable to get disease outbreak information right now. Please try again later.'
      );
      
      await this.whatsappService.sendMessage(user.phone_number, fallbackPrevention);
    }
  }

  // Handle turning on alerts with interactive state selection
  async handleTurnOnAlerts(user) {
    try {
      console.log('🔔 User requesting to turn on alerts:', user.phone_number);
      
      // Initialize cache service for state selection
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      // Check if user already has a selected state and is properly registered
      const existingState = await cacheService.getUserSelectedState(user.phone_number);
      
      // More robust check: user must exist, have alerts enabled, AND have a valid state
      if (existingState && 
          existingState.alert_enabled && 
          existingState.selected_state_id && 
          existingState.indian_states?.state_name) {
        const stateName = existingState.indian_states?.state_name || 'your area';
        await this.whatsappService.sendMessage(
          user.phone_number,
          `✅ You are already registered for disease outbreak alerts in ${stateName}!\n\nYou will receive notifications about disease outbreaks in your area.\n\nReply "STOP ALERTS" anytime to unsubscribe.`
        );
        return;
      }

      // Show interactive state selection
      await this.showStateSelectionMenu(user, cacheService);
      
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

  // Handle turning off alerts with data deletion
  async handleTurnOffAlerts(user) {
    try {
      console.log('🔕 User requesting to turn off alerts:', user.phone_number);
      
      // Initialize cache service
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      // Check if registered
      const isRegistered = await cacheService.isUserRegisteredForAlerts(user.phone_number);
      
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

      // Get user's current state info for confirmation
      const userStateInfo = await cacheService.getUserSelectedState(user.phone_number);
      const stateName = userStateInfo?.indian_states?.state_name || 'your area';

      // Ask for confirmation with options
      const confirmButtons = [
        { id: 'confirm_delete_alert_data', title: '🗑️ Delete All Data' },
        { id: 'confirm_disable_alerts', title: '⏸️ Just Disable' },
        { id: 'disease_alerts', title: '❌ Cancel' }
      ];

      const confirmationText = {
        en: `⚠️ *Turn Off Disease Alerts*\n\nYou are currently registered for alerts in ${stateName}.\n\nChoose how you want to turn off alerts:\n\n🗑️ **Delete All Data:** Completely remove your alert preferences\n⏸️ **Just Disable:** Keep your location but stop alerts\n\nWhat would you like to do?`,
        hi: `⚠️ *रोग अलर्ट बंद करें*\n\nआप वर्तमान में ${stateName} में अलर्ट के लिए पंजीकृत हैं।\n\nअलर्ट बंद करने का तरीका चुनें:\n\n🗑️ **सभी डेटा हटाएं:** अपनी अलर्ट प्राथमिकताएं पूरी तरह हटाएं\n⏸️ **केवल अक्षम करें:** अपना स्थान रखें लेकिन अलर्ट बंद करें\n\nआप क्या करना चाहते हैं?`,
        te: `⚠️ *వ్యాధి హెచ్చరికలను ఆపండి*\n\nమీరు ప్రస్తుతం ${stateName}లో హెచ్చరికల కోసం నమోదు చేసుకున్నారు।\n\nహెచ్చరికలను ఆపడానికి మార్గాన్ని ఎంచుకోండి:\n\n🗑️ **అన్ని డేటాను తొలగించండి:** మీ హెచ్చరిక ప్రాధాన్యతలను పూర్తిగా తొలగించండి\n⏸️ **కేవలం నిలిపివేయండి:** మీ స్థానాన్ని ఉంచండి కానీ హెచ్చరికలను ఆపండి\n\nమీరు ఏమి చేయాలనుకుంటున్నారు?`,
        ta: `⚠️ *நோய் எச்சரிக்கைகளை நிறுத்தவும்*\n\nநீங்கள் தற்போது ${stateName}இல் எச்சரிக்கைகளுக்கு பதிவு செய்யப்பட்டுள்ளீர்கள்.\n\nஎச்சரிக்கைகளை நிறுத்துவதற்கான வழியைத் தேர்ந்தெடுக்கவும்:\n\n🗑️ **அனைத்து தரவையும் நீக்கவும்:** உங்கள் எச்சரிக்கை விருப்பத்தேர்வுகளை முழுமையாக அகற்றவும்\n⏸️ **வெறும் முடக்கவும்:** உங்கள் இடத்தை வைத்துக்கொண்டு எச்சரிக்கைகளை நிறுத்தவும்\n\nநீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?`,
        or: `⚠️ *ରୋଗ ଚେତାବନୀ ବନ୍ଦ କରନ୍ତୁ*\n\nଆପଣ ବର୍ତ୍ତମାନ ${stateName}ରେ ଚେତାବନୀ ପାଇଁ ପଞ୍ଜୀକୃତ ଅଛନ୍ତି।\n\nଚେତାବନୀ ବନ୍ଦ କରିବାର ଉପାୟ ବାଛନ୍ତୁ:\n\n🗑️ **ସମସ୍ତ ଡାଟା ଡିଲିଟ କରନ୍ତୁ:** ଆପଣଙ୍କ ଚେତାବନୀ ପସନ୍ଦଗୁଡ଼ିକୁ ସମ୍ପୂର୍ଣ୍ଣ ଭାବେ ହଟାନ୍ତୁ\n⏸️ **କେବଳ ଅକ୍ଷମ କରନ୍ତୁ:** ଆପଣଙ୍କ ସ୍ଥାନ ରଖନ୍ତୁ କିନ୍ତୁ ଚେତାବନୀ ବନ୍ଦ କରନ୍ତୁ\n\nଆପଣ କଣ କରିବାକୁ ଚାହାଁନ୍ତି?`
      };

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        confirmationText[user.preferred_language] || confirmationText.en,
        confirmButtons
      );
      
    } catch (error) {
      console.error('Error in handleTurnOffAlerts:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle confirmation to delete all alert data
  async handleConfirmDeleteAlertData(user) {
    try {
      console.log('🗑️ Confirming delete all alert data for:', user.phone_number);
      
      // Initialize cache service
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      const success = await cacheService.turnOffAlertsAndDeleteData(user.phone_number);
      
      if (success) {
        const successText = {
          en: '✅ *All Alert Data Deleted*\n\nYour disease outbreak alert preferences have been completely removed from our system.\n\n• Location data deleted\n• Alert preferences deleted\n• No more notifications\n\nYou can register again anytime from the Disease Alerts menu.\n\nStay healthy! 🌟',
          hi: '✅ *सभी अलर्ट डेटा हटा दिया गया*\n\nआपकी रोग प्रकोप अलर्ट प्राथमिकताएं हमारे सिस्टम से पूरी तरह हटा दी गई हैं।\n\n• स्थान डेटा हटाया गया\n• अलर्ट प्राथमिकताएं हटाई गईं\n• अब कोई सूचना नहीं\n\nआप रोग अलर्ट मेनू से कभी भी फिर से पंजीकरण कर सकते हैं।\n\nस्वस्थ रहें! 🌟',
          te: '✅ *అన్ని హెచ్చరిక డేటా తొలగించబడింది*\n\nమీ వ్యాధి వ్యాప్తి హెచ్చరిక ప్రాధాన్యతలు మా సిస్టమ్ నుండి పూర్తిగా తొలగించబడ్డాయి.\n\n• స్థాన డేటా తొలగించబడింది\n• హెచ్చరిక ప్రాధాన్యతలు తొలగించబడ్డాయి\n• ఇకపై నోటిఫికేషన్లు లేవు\n\nమీరు వ్యాధి హెచ్చరికల మెనూ నుండి ఎప్పుడైనా మళ్లీ నమోదు చేసుకోవచ్చు.\n\nఆరోగ్యంగా ఉండండి! 🌟',
          ta: '✅ *அனைத்து எச்சரிக்கை தரவும் நீக்கப்பட்டது*\n\nஉங்கள் நோய் வெடிப்பு எச்சரிக்கை விருப்பத்தேர்வுகள் எங்கள் அமைப்பிலிருந்து முழுமையாக அகற்றப்பட்டுள்ளன.\n\n• இட தரவு நீக்கப்பட்டது\n• எச்சரிக்கை விருப்பத்தேர்வுகள் நீக்கப்பட்டன\n• இனி அறிவிப்புகள் இல்லை\n\nநோய் எச்சரிக்கைகள் மெனுவிலிருந்து எப்போது வேண்டுமானாலும் மீண்டும் பதிவு செய்யலாம்.\n\nஆரோக்கியமாக இருங்கள்! 🌟',
          or: '✅ *ସମସ୍ତ ଚେତାବନୀ ଡାଟା ଡିଲିଟ ହୋଇଗଲା*\n\nଆପଣଙ୍କ ରୋଗ ପ୍ରକୋପ ଚେତାବନୀ ପସନ୍ଦଗୁଡ଼ିକ ଆମ ସିଷ୍ଟମରୁ ସମ୍ପୂର୍ଣ୍ଣ ଭାବେ ହଟାଯାଇଛି।\n\n• ସ୍ଥାନ ଡାଟା ଡିଲିଟ ହୋଇଛି\n• ଚେତାବନୀ ପସନ୍ଦଗୁଡ଼ିକ ଡିଲିଟ ହୋଇଛି\n• ଆଉ କୌଣସି ନୋଟିଫିକେସନ ନାହିଁ\n\nଆପଣ ରୋଗ ଚେତାବନୀ ମେନୁରୁ ଯେକୌଣସି ସମୟରେ ପୁନର୍ବାର ପଞ୍ଜୀକରଣ କରିପାରିବେ।\n\nସୁସ୍ଥ ରୁହନ୍ତୁ! 🌟'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          successText[user.preferred_language] || successText.en
        );
      } else {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ Failed to delete alert data. Please try again later.'
        );
      }
      
      // Return to main menu
      setTimeout(async () => {
        await this.showMainMenu(user);
      }, 2000);
      
    } catch (error) {
      console.error('Error confirming delete alert data:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle confirmation to disable alerts (keep data)
  async handleConfirmDisableAlerts(user) {
    try {
      console.log('⏸️ Confirming disable alerts for:', user.phone_number);
      
      // Initialize cache service
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      const success = await cacheService.disableAlerts(user.phone_number);
      
      if (success) {
        const successText = {
          en: '⏸️ *Alerts Disabled*\n\nYour disease outbreak alerts have been disabled.\n\n• Your location preferences are saved\n• No notifications will be sent\n• You can re-enable anytime\n\nTo turn alerts back on, visit the Disease Alerts menu.\n\nStay healthy! 🌟',
          hi: '⏸️ *अलर्ट अक्षम किए गए*\n\nआपके रोग प्रकोप अलर्ट अक्षम कर दिए गए हैं।\n\n• आपकी स्थान प्राथमिकताएं सहेजी गई हैं\n• कोई सूचना नहीं भेजी जाएगी\n• आप कभी भी फिर से सक्षम कर सकते हैं\n\nअलर्ट वापस चालू करने के लिए, रोग अलर्ट मेनू पर जाएं।\n\nस्वस्थ रहें! 🌟',
          te: '⏸️ *హెచ్చరికలు నిలిపివేయబడ్డాయి*\n\nమీ వ్యాధి వ్యాప్తి హెచ్చరికలు నిలిపివేయబడ్డాయి.\n\n• మీ స్థాన ప్రాధాన్యతలు సేవ్ చేయబడ్డాయి\n• నోటిఫికేషన్లు పంపబడవు\n• మీరు ఎప్పుడైనా మళ్లీ ఎనేబుల్ చేయవచ్చు\n\nహెచ్చరికలను తిరిగి ఆన్ చేయడానికి, వ్యాధి హెచ్చరికల మెనూను సందర్శించండి.\n\nఆరోగ్యంగా ఉండండి! 🌟',
          ta: '⏸️ *எச்சரிக்கைகள் முடக்கப்பட்டன*\n\nஉங்கள் நோய் வெடிப்பு எச்சரிக்கைகள் முடக்கப்பட்டுள்ளன.\n\n• உங்கள் இட விருப்பத்தேர்வுகள் சேமிக்கப்பட்டுள்ளன\n• அறிவிப்புகள் அனுப்பப்படாது\n• நீங்கள் எப்போது வேண்டுமானாலும் மீண்டும் இயக்கலாம்\n\nஎச்சரிக்கைகளை மீண்டும் இயக்க, நோய் எச்சரிக்கைகள் மெனுவைப் பார்வையிடவும்.\n\nஆரோக்கியமாக இருங்கள்! 🌟',
          or: '⏸️ *ଚେତାବନୀ ଅକ୍ଷମ କରାଗଲା*\n\nଆପଣଙ୍କ ରୋଗ ପ୍ରକୋପ ଚେତାବନୀ ଅକ୍ଷମ କରାଯାଇଛି।\n\n• ଆପଣଙ୍କ ସ୍ଥାନ ପସନ୍ଦଗୁଡ଼ିକ ସେଭ କରାଯାଇଛି\n• କୌଣସି ନୋଟିଫିକେସନ ପଠାଯିବ ନାହିଁ\n• ଆପଣ ଯେକୌଣସି ସମୟରେ ପୁନର୍ବାର ସକ୍ଷମ କରିପାରିବେ\n\nଚେତାବନୀ ପୁନର୍ବାର ଚାଲୁ କରିବାକୁ, ରୋଗ ଚେତାବନୀ ମେନୁ ଦେଖନ୍ତୁ।\n\nସୁସ୍ଥ ରୁହନ୍ତୁ! 🌟'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          successText[user.preferred_language] || successText.en
        );
      } else {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ Failed to disable alerts. Please try again later.'
        );
      }
      
      // Return to main menu
      setTimeout(async () => {
        await this.showMainMenu(user);
      }, 2000);
      
    } catch (error) {
      console.error('Error confirming disable alerts:', error);
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

  // Format real-time disease information from AI with Google Search
  formatRealTimeDiseaseInfo(disease, userLocation = null) {
    const isLocationRelevant = userLocation && disease.affected_locations?.some(loc => 
      loc.state?.toLowerCase().includes(userLocation.state?.toLowerCase() || '')
    );
    
    let message = `🦠 *${disease.name}*\n`;
    
    // Risk level with emoji
    const riskEmoji = {
      'critical': '🔴',
      'high': '🟠', 
      'medium': '🟡',
      'low': '🟢'
    };
    
    message += `${riskEmoji[disease.risk_level] || '🔵'} Risk: ${disease.risk_level?.toUpperCase() || 'UNKNOWN'}\n\n`;
    
    // Location-specific information
    if (isLocationRelevant && userLocation) {
      const userStateData = disease.affected_locations?.find(loc => 
        loc.state?.toLowerCase().includes(userLocation.state?.toLowerCase())
      );
      
      if (userStateData) {
        message += `📍 *In ${userLocation.state}:*\n`;
        message += `• Cases: ${userStateData.estimated_cases || 'Not specified'}\n`;
        message += `• Trend: ${userStateData.trend || 'Unknown'}\n\n`;
      }
    }
    
    // National statistics
    if (disease.national_stats) {
      message += `🇮🇳 *National Status:*\n`;
      message += `• Total Cases: ${disease.national_stats.total_cases || 'Not specified'}\n`;
      message += `• States Affected: ${disease.national_stats.states_affected || 'Multiple'}\n\n`;
    }
    
    // Symptoms
    if (disease.symptoms && disease.symptoms.length > 0) {
      message += `🤧 *Symptoms:* ${disease.symptoms.slice(0, 3).join(', ')}\n\n`;
    }
    
    // Key safety measures
    if (disease.safety_measures && disease.safety_measures.length > 0) {
      message += `🛡️ *Safety:* ${disease.safety_measures.slice(0, 2).join(', ')}\n\n`;
    }
    
    // Source information if available
    if (disease.sources && disease.sources.length > 0) {
      message += `📰 *Source:* ${disease.sources[0]}\n`;
    }
    
    return message.trim();
  }

  // Get current disease outbreaks formatted as news reports
  getCurrentDiseaseOutbreaks(userLocation = null) {
    const diseases = [];
    
    // Dengue Outbreak - News Format
    diseases.push({
      name: 'Dengue',
      risk: 'HIGH',
      message: `🦠 *Dengue Outbreak Spreads Across India*\n\n• Health authorities report surge in dengue cases nationwide\n• Symptoms include high fever, severe headache, and joint pain\n• Mosquito breeding sites increase during monsoon season\n• Hospitals advise using repellents and wearing full-sleeve clothes\n• Cases rising in urban areas with stagnant water`
    });
    
    // Seasonal Flu - News Format
    diseases.push({
      name: 'Seasonal Flu',
      risk: 'MEDIUM', 
      message: `🤒 *Seasonal Flu Cases Rise with Weather Change*\n\n• Doctors report increased flu cases across multiple states\n• Common symptoms: fever, cough, and body aches\n• Elderly and children most vulnerable to complications\n• Health experts recommend wearing masks in crowded places\n• Vaccination available at government health centers`
    });
    
    // Add location-specific diseases if user location is available
    if (userLocation) {
      if (userLocation.state?.toLowerCase().includes('andhra') || 
          userLocation.state?.toLowerCase().includes('telangana')) {
        diseases.push({
          name: 'Viral Fever',
          risk: 'MEDIUM',
          message: `🌡️ *Viral Fever Cases Reported in ${userLocation.state}*\n\n• Local hospitals see increase in viral fever patients\n• Symptoms include high fever, fatigue, and headache\n• Health department attributes rise to seasonal changes\n• Doctors advise staying hydrated and taking adequate rest\n• Most cases recover within 3-5 days with proper care`
        });
      }
      
      if (userLocation.state?.toLowerCase().includes('kerala')) {
        diseases.push({
          name: 'Nipah Virus', 
          risk: 'HIGH',
          message: `⚠️ *Kerala on High Alert for Nipah Virus*\n\n• State health department issues Nipah virus warning\n• Symptoms include fever, headache, and breathing difficulties\n• Authorities investigating suspected cases in Kozhikode district\n• Public advised to avoid contact with bats and sick animals\n• Isolation wards prepared in major hospitals as precaution`
        });
      }
    }
    
    return diseases.slice(0, 3); // Return top 3
  }

  // Format real-time disease information as news reports
  formatRealTimeDiseaseNews(disease, userLocation = null) {
    const isLocationRelevant = userLocation && disease.affected_locations?.some(loc => 
      loc.state?.toLowerCase().includes(userLocation.state?.toLowerCase() || '')
    );
    
    // Create news headline based on disease name and location
    let headline = `🦠 *${disease.name} Outbreak`;
    if (isLocationRelevant && userLocation) {
      headline += ` in ${userLocation.state}`;
    } else {
      headline += ` Across India`;
    }
    headline += '*';
    
    let message = headline + '\n\n';
    
    // Add key information as bullet points
    const bulletPoints = [];
    
    // Add location-specific case information if available
    if (isLocationRelevant && userLocation) {
      const userStateData = disease.affected_locations?.find(loc => 
        loc.state?.toLowerCase().includes(userLocation.state?.toLowerCase())
      );
      
      if (userStateData && userStateData.estimated_cases) {
        bulletPoints.push(`Local health authorities report ${userStateData.estimated_cases} cases in ${userLocation.state}`);
      }
    } else if (disease.national_stats?.total_cases) {
      bulletPoints.push(`Health authorities report ${disease.national_stats.total_cases} cases nationwide`);
    }
    
    // Add symptoms
    if (disease.symptoms && disease.symptoms.length > 0) {
      const symptomText = disease.symptoms.slice(0, 3).join(', ');
      bulletPoints.push(`Symptoms include ${symptomText.toLowerCase()}`);
    }
    
    // Add safety measures
    if (disease.safety_measures && disease.safety_measures.length > 0) {
      bulletPoints.push(disease.safety_measures[0]);
      if (disease.safety_measures[1]) {
        bulletPoints.push(disease.safety_measures[1]);
      }
    }
    
    // Add prevention if available
    if (disease.prevention && disease.prevention.length > 0) {
      bulletPoints.push(disease.prevention[0]);
    }
    
    // Add trend information if available
    if (isLocationRelevant && userLocation) {
      const userStateData = disease.affected_locations?.find(loc => 
        loc.state?.toLowerCase().includes(userLocation.state?.toLowerCase())
      );
      if (userStateData?.trend) {
        bulletPoints.push(`Cases are ${userStateData.trend} in the region`);
      }
    }
    
    // Format bullet points
    for (const point of bulletPoints.slice(0, 5)) { // Max 5 points
      message += `• ${point}\n`;
    }
    
    return message.trim();
  }

  // Format location-aware disease news with priority indicators
  formatLocationAwareDiseaseNews(disease, userLocation = null) {
    const emoji = this.getDiseaseEmoji(disease.name);
    let locationIndicator = '';
    
    // Add location relevance indicator based on priority
    if (disease.isLocal || disease.priority === 1) {
      locationIndicator = '🚨 ';
    } else if (disease.isState || disease.priority === 2) {
      locationIndicator = '⚠️ ';
    } else if (disease.isNearby || disease.priority === 3) {
      locationIndicator = '📍 ';
    } else {
      locationIndicator = '🔍 ';
    }
    
    let headline = `${locationIndicator}${emoji} *${disease.name}`;
    
    if (disease.location) {
      headline += ` in ${disease.location}`;
    } else {
      headline += ` (Multiple States)`;
    }
    headline += '*';
    
    let message = headline + '\n\n';
    
    // Add bullet points with enhanced information
    if (disease.cases) {
      message += `• ${disease.cases}\n`;
    }
    
    if (disease.symptoms) {
      message += `• Symptoms: ${disease.symptoms}\n`;
    }
    
    if (disease.prevention) {
      message += `• Prevention: ${disease.prevention}\n`;
    }
    
    // Add distance context for user
    if (userLocation && disease.location && !disease.isLocal && !disease.isState) {
      if (disease.isNearby) {
        message += `• Distance: Nearby state\n`;
      } else {
        message += `• Distance: Other region\n`;
      }
    }
    
    return message.trim();
  }
  
  // Keep the original method for backward compatibility
  formatSimpleDiseaseNews(disease, userLocation = null) {
    return this.formatLocationAwareDiseaseNews(disease, userLocation);
  }

  // Generate disease-specific prevention recommendations based on actual diseases shown
  generateDiseaseSpecificPrevention(diseases, language = 'en', script = 'native') {
    if (!diseases || diseases.length === 0) {
      return LanguageUtils.getText('disease_prevention_summary', language, 'en', script);
    }

    // Analyze diseases to determine specific prevention measures
    const preventionCategories = {
      vectorBorne: false,    // Dengue, Chikungunya, Malaria, Zika
      respiratory: false,    // COVID-19, H1N1, H3N2, TB
      waterBorne: false,     // Cholera, Typhoid, Hepatitis A/E, Diarrhea
      foodBorne: false,      // Food poisoning, Hepatitis A
      contactBorne: false,   // Skin infections, Conjunctivitis
      zoonotic: false       // Nipah, Bird flu, Anthrax
    };

    const specificDiseases = [];

    // Categorize diseases based on their names and transmission modes
    diseases.forEach(disease => {
      const diseaseName = disease.name.toLowerCase();
      specificDiseases.push(disease.name);

      // Vector-borne diseases
      if (diseaseName.includes('dengue') || diseaseName.includes('chikungunya') || 
          diseaseName.includes('malaria') || diseaseName.includes('zika') ||
          diseaseName.includes('japanese encephalitis')) {
        preventionCategories.vectorBorne = true;
      }

      // Respiratory diseases
      if (diseaseName.includes('covid') || diseaseName.includes('h1n1') || 
          diseaseName.includes('h3n2') || diseaseName.includes('influenza') ||
          diseaseName.includes('flu') || diseaseName.includes('tuberculosis') ||
          diseaseName.includes('pneumonia')) {
        preventionCategories.respiratory = true;
      }

      // Water-borne diseases
      if (diseaseName.includes('cholera') || diseaseName.includes('typhoid') || 
          diseaseName.includes('hepatitis') || diseaseName.includes('diarrhea') ||
          diseaseName.includes('dysentery') || diseaseName.includes('gastroenteritis')) {
        preventionCategories.waterBorne = true;
      }

      // Food-borne diseases
      if (diseaseName.includes('food poisoning') || diseaseName.includes('salmonella') ||
          diseaseName.includes('hepatitis a')) {
        preventionCategories.foodBorne = true;
      }

      // Contact-borne diseases
      if (diseaseName.includes('conjunctivitis') || diseaseName.includes('skin infection') ||
          diseaseName.includes('scabies') || diseaseName.includes('ringworm')) {
        preventionCategories.contactBorne = true;
      }

      // Zoonotic diseases
      if (diseaseName.includes('nipah') || diseaseName.includes('bird flu') ||
          diseaseName.includes('anthrax') || diseaseName.includes('rabies') ||
          diseaseName.includes('melioidosis')) {
        preventionCategories.zoonotic = true;
      }
    });

    // Build specific prevention recommendations
    const preventionMeasures = [];

    if (preventionCategories.vectorBorne) {
      preventionMeasures.push({
        en: '🦟 **Mosquito Protection:** Use bed nets, repellents, remove stagnant water',
        hi: '🦟 **मच्छर सुरक्षा:** मच्छरदानी का उपयोग करें, रिपेलेंट लगाएं, रुका हुआ पानी हटाएं',
        te: '🦟 **దోమల రక్షణ:** దోమల వలలు, రిపెల్లెంట్లు వాడండి, నిల్వ నీరు తొలగించండి',
        ta: '🦟 **கொசு பாதுகாப்பு:** கொசு வலைகள், விரட்டிகள் பயன்படுத்தவும், தேங்கிய நீரை அகற்றவும்',
        or: '🦟 **ମଶା ସୁରକ୍ଷା:** ମଶା ଜାଲ, ରିପେଲେଣ୍ଟ ବ୍ୟବହାର କରନ୍ତୁ, ଜମା ପାଣି ହଟାନ୍ତୁ'
      });
    }

    if (preventionCategories.respiratory) {
      preventionMeasures.push({
        en: '😷 **Respiratory Protection:** Wear masks, avoid crowds, maintain ventilation',
        hi: '😷 **श्वसन सुरक्षा:** मास्क पहनें, भीड़ से बचें, हवादार जगह रहें',
        te: '😷 **శ్వాసకోశ రక్షణ:** మాస్కులు ధరించండి, గుంపులను తప్పించండి, వెంటిలేషన్ ఉంచండి',
        ta: '😷 **சுவாச பாதுకாப்பு:** முகக்கவசம் அணியவும், கூட்டத்தைத் தவிர்க்கவும், காற்றோட்டம் வைக்கவும்',
        or: '😷 **ଶ୍ୱାସକୋଶ ସୁରକ୍ଷା:** ମାସ୍କ ପିନ୍ଧନ୍ତୁ, ଭିଡ଼ ଏଡାନ୍ତୁ, ବାୟୁ ଚଳାଚଳ ରଖନ୍ତୁ'
      });
    }

    if (preventionCategories.waterBorne) {
      preventionMeasures.push({
        en: '💧 **Water Safety:** Drink boiled/filtered water, avoid street food, wash hands',
        hi: '💧 **पानी की सुरक्षा:** उबला/फिल्टर किया पानी पिएं, स्ट्रीट फूड से बचें, हाथ धोएं',
        te: '💧 **నీటి భద్రత:** ఉడకబెట్టిన/ఫిల్టర్ చేసిన నీరు త్రాగండి, వీధి ఆహారం తప్పించండి, చేతులు కడుక్కోండి',
        ta: '💧 **நீர் பாதுகாப்பு:** கொதித்த/வடிகட்டிய நீர் குடிக்கவும், தெரு உணவைத் தவிர்க்கவும், கைகளைக் கழுவவும்',
        or: '💧 **ପାଣି ସୁରକ୍ଷା:** ଫୁଟାଇଥିବା/ଫିଲ୍ଟର କରିଥିବା ପାଣି ପିଅନ୍ତୁ, ରାସ୍ତା ଖାଦ୍ୟ ଏଡାନ୍ତୁ, ହାତ ଧୋଇନ୍ତୁ'
      });
    }

    if (preventionCategories.foodBorne) {
      preventionMeasures.push({
        en: '🍽️ **Food Safety:** Eat freshly cooked food, avoid raw items, maintain kitchen hygiene',
        hi: '🍽️ **भोजन सुरक्षा:** ताजा पका खाना खाएं, कच्चे खाद्य से बचें, रसोई की सफाई रखें',
        te: '🍽️ **ఆహార భద్రత:** తాజాగా వండిన ఆహారం తినండి, పచ్చి వస్తువులను తప్పించండి, వంటగది పరిశుభ్రత ఉంచండి',
        ta: '🍽️ **உணவு பாதுகாப்பு:** புதிதாக சமைத்த உணவு சாப்பிடவும், பச்சை பொருட்களைத் தவிர்க்கவும், சமையலறை சுகாதாரம் பராமரிக்கவும்',
        or: '🍽️ **ଖାଦ୍ୟ ସୁରକ୍ଷା:** ତାଜା ରନ୍ଧା ଖାଦ୍ୟ ଖାଆନ୍ତୁ, କଞ୍ଚା ଜିନିଷ ଏଡାନ୍ତୁ, ରୋଷେଇ ଘରର ସଫାତା ରଖନ୍ତୁ'
      });
    }

    if (preventionCategories.contactBorne) {
      preventionMeasures.push({
        en: '🤝 **Contact Prevention:** Avoid sharing personal items, maintain personal hygiene',
        hi: '🤝 **संपर्क रोकथाम:** व्यक्तिगत वस्तुएं साझा न करें, व्यक्तिगत स्वच्छता बनाए रखें',
        te: '🤝 **సంపర్క నివారణ:** వ్యక్తిగత వస్తువులను పంచుకోవద్దు, వ్యక్తిగత పరిశుభ్రత ఉంచండి',
        ta: '🤝 **தொடர்பு தடுப்பு:** தனிப்பட்ட பொருட்களைப் பகிர்ந்து கொள்ளாதீர்கள், தனிப்பட்ட சுகாதாரத்தை பராமரிக்கவும்',
        or: '🤝 **ସମ୍ପର୍କ ନିବାରଣ:** ବ୍ୟକ୍ତିଗତ ଜିନିଷ ବାଣ୍ଟନ୍ତୁ ନାହିଁ, ବ୍ୟକ୍ତିଗତ ସଫାତା ରଖନ୍ତୁ'
      });
    }

    if (preventionCategories.zoonotic) {
      preventionMeasures.push({
        en: '🐾 **Animal Safety:** Avoid contact with sick animals, cook meat thoroughly',
        hi: '🐾 **पशु सुरक्षा:** बीमार जानवरों से संपर्क न करें, मांस को अच्छी तरह पकाएं',
        te: '🐾 **జంతు భద్రత:** అనారోగ్య జంతువులతో సంపర్కం తప్పించండి, మాంసాన్ని బాగా వండండి',
        ta: '🐾 **விலங்கு பாதுकாप்பு:** நோயுள்ள விலங்குகளுடன் தொடர்பைத் தவிர்க்கவும், இறைச்சியை நன்கு சமைக்கவும்',
        or: '🐾 **ପଶୁ ସୁରକ୍ଷା:** ଅସୁସ୍ଥ ପଶୁମାନଙ୍କ ସହିତ ସମ୍ପର୍କ ଏଡାନ୍ତୁ, ମାଂସକୁ ଭଲ ଭାବରେ ରାନ୍ଧନ୍ତୁ'
      });
    }

    // Always add general measures
    preventionMeasures.push({
      en: '🏥 **Medical Care:** Seek immediate help if symptoms appear, follow doctor\'s advice',
      hi: '🏥 **चिकित्सा देखभाल:** लक्षण दिखने पर तुरंत सहायता लें, डॉक्टर की सलाह मानें',
      te: '🏥 **వైద्య సేవ:** లక్షణాలు కనిపిస్తే వెంటనే సహాయం తీసుకోండి, వైద్యుల సలహా పాటించండి',
      ta: '🏥 **மருத்துவ பராமரிப்பு:** அறிகுறிகள் தோன்றினால் உடனடியாக உதவி பெறவும், மருத்துவரின் ஆலோசனையைப் பின்பற்றவும்',
      or: '🏥 **ଚିକିତ୍ସା ସେବା:** ଲକ୍ଷଣ ଦେଖାଗଲେ ତୁରନ୍ତ ସାହାଯ୍ୟ ନିଅନ୍ତୁ, ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ମାନନ୍ତୁ'
    });

    // Build the final message
    const headerText = {
      en: '🛡️ **Specific Prevention for Current Outbreaks:**',
      hi: '🛡️ **वर्तमान प्रकोप के लिए विशिष्ट बचाव:**',
      te: '🛡️ **ప్రస్తుత వ్యాప్తికి ప్రత్యేక నివారణ:**',
      ta: '🛡️ **தற்போதைய வெடிப்புகளுக்கான குறிப्पिட்ட தடुप्पு:**',
      or: '🛡️ **ବର୍ତ୍ତମାନ ପ୍ରକୋପ ପାଇଁ ବିଶେଷ ନିବାରଣ:**'
    };

    const footerText = {
      en: '\n📍 **Want location-specific alerts?** Register below:',
      hi: '\n📍 **स्थान-विशिष्ट अलर्ट चाहते हैं?** नीचे पंजीकरण करें:',
      te: '\n📍 **స్థాన-ప్రత్యేక హెచ్చరికలు కావాలా?** క్రింద నమోదు చేసుకోండి:',
      ta: '\n📍 **இடம் சார்ந்த எச्चरிक्कैகள் वेण्டुमा?** கীழே पतिवु செய्युङ्गள्:',
      or: '\n📍 **ସ୍ଥାନ-ନିର୍ଦ୍ଦିଷ୍ଟ ଚେତାବନୀ ଚାହୁଁଛନ୍ତି?** ତଳେ ପଞ୍ଜୀକରଣ କରନ୍ତୁ:'
    };

    let message = headerText[language] || headerText.en;
    message += '\n\n';

    preventionMeasures.forEach(measure => {
      const text = measure[language] || measure.en;
      message += `• ${text}\n`;
    });

    message += footerText[language] || footerText.en;

    return message;
  }

  // Show interactive state selection with buttons
  async showStateSelectionMenu(user, cacheService) {
    try {
      // Get all states directly (no region grouping)
      const allStates = await cacheService.getIndianStates();
      
      const headerText = {
        en: '📍 *Select Your State for Disease Alerts*\n\nChoose your state to receive location-specific disease outbreak alerts:',
        hi: '📍 *रोग अलर्ट के लिए अपना राज्य चुनें*\n\nस्थान-विशिष्ट रोग प्रकोप अलर्ट प्राप्त करने के लिए अपना राज्य चुनें:',
        te: '📍 *వ్యాధి హెచ్చరికల కోసం మీ రాష్ట్రాన్ని ఎంచుకోండి*\n\nస్థాన-ప్రత్యేక వ్యాధి వ్యాప్తి హెచ్చరికలను పొందడానికి మీ రాష్ట్రాన్ని ఎంచుకోండి:',
        ta: '📍 *நோய் எச்சரிக்கைகளுக்கு உங்கள் மாநிலத்தைத் தேர்ந்தெடுக்கவும்*\n\nஇடம் சார்ந்த நோய் வெடிப்பு எச்சரிக்கைகளைப் பெற உங்கள் மாநிலத்தைத் தேர்ந்தெடுக்கவும்:',
        or: '📍 *ରୋଗ ଚେତାବନୀ ପାଇଁ ଆପଣଙ୍କ ରାଜ୍ୟ ବାଛନ୍ତୁ*\n\nସ୍ଥାନ-ନିର୍ଦ୍ଦିଷ୍ଟ ରୋଗ ପ୍ରକୋପ ଚେତାବନୀ ପାଇବାକୁ ଆପଣଙ୍କ ରାଜ୍ୟ ବାଛନ୍ତୁ:'
      };

      await this.whatsappService.sendMessage(
        user.phone_number,
        headerText[user.preferred_language] || headerText.en
      );

      // Use single scrollable interactive list (WhatsApp supports up to 10 items per list)
      const listButtonText = {
        en: 'Choose State',
        hi: 'राज्य चुनें',
        te: 'రాష్ట్రం ఎంచుకోండి',
        ta: 'மாநிலம் தேர்ந்தெடுக்கவும்',
        or: 'ରାଜ୍ୟ ବାଛନ୍ତୁ'
      };

      const menuText = {
        en: '🏛️ Select your state from the menu below:',
        hi: '🏛️ नीचे दिए गए मेनू से अपना राज्य चुनें:',
        te: '🏛️ క్రింది మెనూ నుండి మీ రాష్ట్రాన్ని ఎంచుకోండి:',
        ta: '🏛️ கீழே உள்ள மெனுவிலிருந்து உங்கள் மாநிலத்தைத் தேர்ந்தெடுக்கவும்:',
        or: '🏛️ ତଳେ ଥିବା ମେନୁରୁ ଆପଣଙ୍କ ରାଜ୍ୟ ବାଛନ୍ତୁ:'
      };

      // Send states in groups of 10 (WhatsApp list limit) but as scrollable lists
      for (let i = 0; i < allStates.length; i += 10) {
        const stateGroup = allStates.slice(i, i + 10);
        const listItems = stateGroup.map(state => ({
          id: `state_${state.id}`,
          title: state.state_name.length > 24 ? state.state_name.substring(0, 21) + '...' : state.state_name,
          description: state.is_union_territory ? 'Union Territory' : 'State'
        }));

        const groupNumber = Math.floor(i / 10) + 1;
        const totalGroups = Math.ceil(allStates.length / 10);
        
        let menuTitle = menuText[user.preferred_language] || menuText.en;
        if (totalGroups > 1) {
          menuTitle += ` (${groupNumber}/${totalGroups})`;
        }
        
        await this.whatsappService.sendInteractiveList(
          user.phone_number,
          menuTitle,
          listButtonText[user.preferred_language] || listButtonText.en,
          listItems
        );

        // Small delay between lists if multiple needed
        if (i + 10 < allStates.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Update session to wait for state selection directly
      await this.userService.updateUserSession(user.id, 'selecting_state', {
        allStates: allStates
      });

    } catch (error) {
      console.error('Error showing state selection menu:', error);
      
      // Enhanced fallback with popular states as list
      try {
        const popularStates = [
          { id: 1, state_name: 'Andhra Pradesh', is_union_territory: false },
          { id: 14, state_name: 'Maharashtra', is_union_territory: false },
          { id: 11, state_name: 'Karnataka', is_union_territory: false },
          { id: 9, state_name: 'Delhi', is_union_territory: true },
          { id: 21, state_name: 'Tamil Nadu', is_union_territory: false }
        ];

        const fallbackItems = popularStates.map(state => ({
          id: `state_${state.id}`,
          title: state.state_name,
          description: state.is_union_territory ? 'Union Territory' : 'State'
        }));

        await this.whatsappService.sendInteractiveList(
          user.phone_number,
          '🏛️ Popular states (or type your state name):',
          'Choose State',
          fallbackItems
        );

      } catch (buttonError) {
        // Final fallback to text input
        const fallbackText = {
          en: '📍 Please type your state name (e.g., "Andhra Pradesh", "Maharashtra"):',
          hi: '📍 कृपया अपने राज्य का नाम टाइप करें (जैसे, "आंध्र प्रदेश", "महाराष्ट्र"):',
          te: '📍 దయచేసి మీ రాష్ట్ర పేరును టైప్ చేయండి (ఉదా., "ఆంధ్ర ప్రదేశ్", "మహారాష్ట్ర"):',
          ta: '📍 உங்கள் மாநில பெயரைத் தட்டச்சு செய்யுங்கள் (எ.கா., "ஆந்திர பிரதேசம்", "மகாராஷ்டிரா"):',
          or: '📍 ଦୟାକରି ଆପଣଙ୍କ ରାଜ୍ୟର ନାମ ଟାଇପ୍ କରନ୍ତୁ (ଯଥା, "ଆନ୍ଧ୍ର ପ୍ରଦେଶ", "ମହାରାଷ୍ଟ୍ର"):'
        };

        await this.whatsappService.sendMessage(
          user.phone_number,
          fallbackText[user.preferred_language] || fallbackText.en
        );
      }
    }
  }

  // Handle region selection (deprecated - now going directly to states)
  async handleRegionSelection(user, regionId) {
    // Redirect to direct state selection
    console.log('Region selection deprecated, redirecting to direct state selection');
    const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
    const cacheService = new DiseaseOutbreakCacheService();
    await this.showStateSelectionMenu(user, cacheService);
  }

  // Handle state name input (when user types state name)
  async handleStateNameInput(user, stateName) {
    try {
      console.log(`🔍 User ${user.phone_number} typed state name: ${stateName}`);
      
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      // Search for the state by name
      const searchResults = await cacheService.getIndianStates(stateName);
      
      if (searchResults.length === 0) {
        // No exact match found, show suggestions
        const allStates = await cacheService.getIndianStates();
        const suggestions = allStates.filter(state => 
          state.state_name.toLowerCase().includes(stateName.toLowerCase())
        ).slice(0, 3);
        
        if (suggestions.length > 0) {
          const suggestionButtons = suggestions.map(state => ({
            id: `state_${state.id}`,
            title: state.state_name
          }));
          
          await this.whatsappService.sendInteractiveButtons(
            user.phone_number,
            `🔍 Did you mean one of these states?`,
            suggestionButtons
          );
        } else {
          await this.whatsappService.sendMessage(
            user.phone_number,
            `❌ State "${stateName}" not found. Please try again with the correct state name or select from the buttons above.`
          );
        }
        return;
      }
      
      if (searchResults.length === 1) {
        // Exact match found, proceed with registration
        const selectedState = searchResults[0];
        await this.handleStateSelection(user, `state_${selectedState.id}`);
      } else {
        // Multiple matches, show options
        const matchButtons = searchResults.slice(0, 3).map(state => ({
          id: `state_${state.id}`,
          title: state.state_name
        }));
        
        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          `🔍 Multiple states found. Please select the correct one:`,
          matchButtons
        );
      }
      
    } catch (error) {
      console.error('Error handling state name input:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle state selection
  async handleStateSelection(user, stateId) {
    try {
      const DiseaseOutbreakCacheService = require('../services/diseaseOutbreakCacheService');
      const cacheService = new DiseaseOutbreakCacheService();
      
      // Extract state ID from selection
      const actualStateId = parseInt(stateId.replace('state_', ''));
      
      // Update user's selected state
      const success = await cacheService.updateUserSelectedState(user.phone_number, actualStateId);
      
      if (success) {
        // Get state info for confirmation
        const stateInfo = await cacheService.getUserSelectedState(user.phone_number);
        const stateName = stateInfo?.indian_states?.state_name || 'your selected state';
        
        const confirmationText = {
          en: `✅ *Alerts Activated!*\n\nYou will now receive disease outbreak alerts for ${stateName}.\n\n🔔 Alert frequency: Daily\n📱 Delivery: WhatsApp messages\n\nReply "STOP ALERTS" anytime to unsubscribe.`,
          hi: `✅ *अलर्ट सक्रिय!*\n\nअब आपको ${stateName} के लिए रोग प्रकोप अलर्ट मिलेंगे।\n\n🔔 अलर्ट आवृत्ति: दैनिक\n📱 डिलीवरी: व्हाट्सएप संदेश\n\nसदस्यता रद्द करने के लिए कभी भी "STOP ALERTS" का उत्तर दें।`,
          te: `✅ *హెచ్చరికలు సక్రియం చేయబడ్డాయి!*\n\nఇప్పుడు మీకు ${stateName} కోసం వ్యాధి వ్యాప్తి హెచ్చరికలు వస్తాయి.\n\n🔔 హెచ్చరిక ఫ్రీక్వెన్సీ: రోజువారీ\n📱 డెలివరీ: వాట్సాప్ మెసేజ్‌లు\n\nసబ్‌స్క్రిప్షన్ రద్దు చేయడానికి ఎప్పుడైనా "STOP ALERTS" అని రిప్లై చేయండి.`,
          ta: `✅ *எச்சரிக்கைகள் செயல்படுத்தப்பட்டன!*\n\nஇப்போது நீங்கள் ${stateName}க்கான நோய் வெடிப்பு எச்சரிக்கைகளைப் பெறுவீர்கள்.\n\n🔔 எச்சரிக்கை அதிர்வெண்: தினசரி\n📱 டெலிவரி: வாட்ஸ்அப் செய்திகள்\n\nசந்தாவை ரத்து செய்ய எப்போது வேண்டுமானாலும் "STOP ALERTS" என்று பதிலளிக்கவும்.`,
          or: `✅ *ଚେତାବନୀ ସକ୍ରିୟ!*\n\nଏବେ ଆପଣ ${stateName} ପାଇଁ ରୋଗ ପ୍ରକୋପ ଚେତାବନୀ ପାଇବେ।\n\n🔔 ଚେତାବନୀ ଫ୍ରିକ୍ୱେନ୍ସି: ଦୈନିକ\n📱 ଡେଲିଭରି: ହ୍ୱାଟସଆପ ମେସେଜ\n\nସବସ୍କ୍ରିପସନ ବାତିଲ କରିବାକୁ ଯେକୌଣସି ସମୟରେ "STOP ALERTS" ରିପ୍ଲାଇ କରନ୍ତୁ।`
        };

        await this.whatsappService.sendMessage(
          user.phone_number,
          confirmationText[user.preferred_language] || confirmationText.en
        );

        // Clear user session
        await this.userService.updateUserSession(user.id, 'main_menu');
        
      } else {
        throw new Error('Failed to update user state selection');
      }

    } catch (error) {
      console.error('Error handling state selection:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Get appropriate emoji for disease
  getDiseaseEmoji(diseaseName) {
    const name = diseaseName.toLowerCase();
    if (name.includes('nipah')) return '⚠️';
    if (name.includes('dengue')) return '🦠';
    if (name.includes('flu') || name.includes('influenza')) return '🤒';
    if (name.includes('fever')) return '🌡️';
    if (name.includes('malaria')) return '🦟';
    if (name.includes('covid')) return '😷';
    return '🦠'; // Default
  }
}

module.exports = MessageController;