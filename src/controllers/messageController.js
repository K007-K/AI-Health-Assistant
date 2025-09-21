const WhatsAppService = require('../services/whatsappService');
const MockWhatsAppService = require('../services/mockWhatsappService');
const UserService = require('../services/userService');
const ConversationService = require('../services/conversationService');
const User = require('../models/User');
const geminiService = require('../services/geminiService');
const outbreakService = require('../services/outbreakService');
const broadcastService = require('../services/broadcastService');
const { sendMessage, sendInteractiveButtons, sendInteractiveList } = require('../services/whatsappService');
const { LanguageUtils } = require('../utils/languageUtils');
const DiseaseAlertService = require('../services/diseaseAlertService');
const AIDiseaseMonitorService = require('../services/aiDiseaseMonitorService');
const UserFeedbackService = require('../services/feedbackService');

class MessageController {
  constructor() {
    // Use mock service in test environment
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_WHATSAPP === 'true';
    this.whatsappService = isTestMode ? new MockWhatsAppService() : new WhatsAppService();
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.geminiService = geminiService; // Use the imported service instance
    this.userFeedbackService = new UserFeedbackService();
    this.diseaseAlertService = new DiseaseAlertService();
    this.aiDiseaseMonitorService = new AIDiseaseMonitorService();
  }

  // Send message with typing indicator and inline feedback buttons
  async sendMessageWithTypingAndFeedback(phoneNumber, message, showFeedback = true) {
    try {
      // Show typing indicator
      await this.whatsappService.sendTypingIndicator(phoneNumber);
      
      // Optimized typing time - shorter for better UX
      const typingDelay = Math.min(Math.max(message.length * 15, 500), 1500); // 0.5-1.5 seconds (faster)
      await new Promise(resolve => setTimeout(resolve, typingDelay));
      
      // Stop typing indicator
      await this.whatsappService.stopTypingIndicator(phoneNumber);
      
      // Always send regular message without feedback buttons (as requested by user)
      return await this.whatsappService.sendMessage(phoneNumber, message);
    } catch (error) {
      console.error('Error sending message with typing and feedback:', error);
      // Fallback to regular message
      return await this.whatsappService.sendMessage(phoneNumber, message);
    }
  }

  // Handle inline feedback (thumbs up/down)
  async handleInlineFeedback(user, feedbackType, messageId) {
    try {
      console.log(`👍👎 Inline feedback received: ${feedbackType} from ${user.phone_number}`);
      
      // Send confirmation message first (like Meta's "Feedback submitted to Helic")
      const confirmationMessages = {
        en: 'Feedback submitted to Helic',
        hi: 'फीडबैक हेलिक को भेजा गया',
        te: 'ఫీడ్‌బ్యాక్ హెలిక్‌కు పంపబడింది',
        ta: 'கருத்து ஹெலிக்கிற்கு அனுப்பப்பட்டது',
        or: 'ମତାମତ ହେଲିକକୁ ପଠାଗଲା'
      };
      
      const confirmationText = confirmationMessages[user.preferred_language] || confirmationMessages.en;
      
      // Send confirmation without feedback buttons
      await this.whatsappService.sendMessage(user.phone_number, confirmationText);
      
      console.log(`✅ Feedback confirmation sent to ${user.phone_number}`);
      
      // Try to save feedback to database (optional - don't fail if it doesn't work)
      try {
        const rating = feedbackType === 'feedback_good' ? 5 : 1;
        const comment = `Inline feedback: ${feedbackType === 'feedback_good' ? 'positive' : 'negative'}`;
        
        // Generate a proper UUID for conversationId if messageId is not a UUID
        const { v4: uuidv4 } = require('uuid');
        const conversationId = messageId && messageId.length === 36 ? messageId : uuidv4();
        
        await this.userFeedbackService.saveFeedback(
          user.id,
          conversationId,
          rating,
          comment,
          'inline_buttons'
        );
        
        console.log(`📊 Feedback saved: ${feedbackType} from ${user.phone_number}`);
      } catch (saveError) {
        console.log(`⚠️ Could not save feedback to database: ${saveError.message}`);
        // Continue anyway - user already got confirmation
      }
      
    } catch (error) {
      console.error('Error handling inline feedback:', error);
      // Send generic confirmation even if everything fails
      await this.whatsappService.sendMessage(user.phone_number, 'Thank you for your feedback!');
    }
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

      // Handle STOP ALERTS command - also delete preferences
      if (lowerContent === 'stop alerts' || lowerContent === 'unsubscribe') {
        console.log(`🛑 STOP ALERTS command received from: ${user.phone_number}`);
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

      // Handle inline feedback buttons (thumbs up/down)
      if (content === 'feedback_good' || content === 'feedback_bad') {
        await this.handleInlineFeedback(user, content, messageId);
        return;
      }

      // Check if user is in AI chat mode - but allow menu navigation
      if (currentState === 'ai_chat' && !content.toLowerCase().includes('menu') && !content.toLowerCase().includes('back')) {
        // Allow greetings to reset to main menu
        if (intent === 'greeting') {
          console.log('🔄 Greeting detected in AI chat - resetting to main menu');
          await this.handleGreeting(user);
          return;
        }
        
        // Allow menu navigation even from AI chat mode
        const menuIntents = ['preventive_tips', 'disease_alerts', 'symptom_check', 'view_active_diseases', 'turn_on_alerts', 'turn_off_alerts'];
        if (menuIntents.includes(intent)) {
          console.log(`🔄 Menu navigation detected in AI chat - switching to ${intent}`);
          // Continue to normal intent handling below
        } else if (intent !== 'ai_chat' && intent !== 'ai_chat_message') {
          console.log('🤖 User in AI chat mode - routing to handleAIChat');
          await this.handleAIChat(user, content, mediaData);
          return;
        }
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
        case 'disease_alerts':
          await this.handleDiseaseAlerts(user);
          break;

        // Removed old feedback handling - now using inline feedback buttons

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

      // If first AI message (button click), just send instructions and return
      if (isFirstAIMessage && (message === 'chat_ai' || message === 'ai_chat')) {
        const instructionText = LanguageUtils.getText('ai_chat_instructions', user.preferred_language, 'en', user.script_preference);
        await this.sendMessageWithTypingAndFeedback(user.phone_number, instructionText);
        
        await this.conversationService.saveBotMessage(
          user.id,
          instructionText,
          'ai_chat_instructions',
          user.preferred_language
        );
        
        return; // Don't generate AI response for initial button click
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
        console.log('🔍 DEBUG handleAIChat - User message:', message);
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

      // Send response with typing indicator (no feedback buttons)
      await this.sendMessageWithTypingAndFeedback(user.phone_number, aiResponse);

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
        // First time - show symptom checker intro (updated as per user request)
        const promptTexts = {
          en: '🩺 *Symptom Checker* — please type your symptoms (e.g., "fever, cough") or attach supported image.\n\n⚠️ If you have severe chest pain, heavy bleeding, or trouble breathing, CALL 108 immediately.',
          hi: '🩺 *लक्षण जांचकर्ता* — कृपया अपने लक्षण टाइप करें (जैसे "बुखार, खांसी") या समर्थित छवि संलग्न करें।\n\n⚠️ यदि आपको गंभीर छाती में दर्द, भारी रक्तस्राव, या सांस लेने में परेशानी है, तुरंत 108 पर कॉल करें।',
          te: '🩺 *లక్షణ తనిఖీదారు* — దయచేసి మీ లక్షణాలను టైప్ చేయండి (ఉదా. "జ్వరం, దగ్గు") లేదా మద్దతు ఉన్న చిత్రాన్ని జోడించండి।\n\n⚠️ మీకు తీవ్రమైన ఛాతీ నొప్పి, భారీ రక్తస్రావం లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంటే, వెంటనే 108కు కాల్ చేయండి।',
          ta: '🩺 *அறிகுறி சரிபார்ப்பாளர்* — தயவுசெய்து உங்கள் அறிகுறிகளை தட்டச்சு செய்யுங்கள் (எ.கா. "காய்ச்சல், இருமல்") அல்லது ஆதரிக்கப்படும் படத்தை இணைக்கவும்।\n\n⚠️ உங்களுக்கு கடுமையான மார்பு வலி, அதிக இரத்தப்போக்கு அல்லது மூச்சுத் திணறல் இருந்தால், உடனே 108ஐ அழைக்கவும்।',
          or: '🩺 *ଲକ୍ଷଣ ଯାଞ୍ଚକାରୀ* — ଦୟାକରି ଆପଣଙ୍କ ଲକ୍ଷଣ ଟାଇପ୍ କରନ୍ତୁ (ଯେମିତି "ଜ୍ୱର, କାଶ") କିମ୍ବା ସମର୍ଥିତ ଚିତ୍ର ସଂଲଗ୍ନ କରନ୍ତୁ।\n\n⚠️ ଯଦି ଆପଣଙ୍କର ଗୁରୁତର ଛାତି ଯନ୍ତ୍ରଣା, ଅଧିକ ରକ୍ତସ୍ରାବ, କିମ୍ବା ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି, ତୁରନ୍ତ 108କୁ କଲ କରନ୍ତୁ।'
        };

        const promptText = promptTexts[user.preferred_language] || promptTexts.en;
        await this.whatsappService.sendMessage(user.phone_number, promptText);
        
        await this.userService.updateUserSession(user.id, 'symptom_check');
        
        await this.conversationService.saveBotMessage(
          user.id,
          promptText,
          'symptom_check_intro',
          user.preferred_language
        );
        
      } else {
        // Check if user is asking general health questions instead of symptoms
        const lowerMessage = message.toLowerCase();
        const generalQuestions = [
          'what is', 'how to', 'why does', 'can you tell me about', 'explain',
          'information about', 'details about', 'help me understand'
        ];
        
        if (generalQuestions.some(q => lowerMessage.includes(q))) {
          const redirectText = {
            en: '🤖 For general health questions, please use *Chat with AI* feature.\n\n🩺 In Symptom Checker, please describe your current symptoms (e.g., "I have fever and headache since 2 days").',
            hi: '🤖 सामान्य स्वास्थ्य प्रश्नों के लिए, कृपया *AI से बात करें* सुविधा का उपयोग करें।\n\n🩺 लक्षण जांचकर्ता में, कृपया अपने वर्तमान लक्षणों का वर्णन करें (जैसे "मुझे 2 दिन से बुखार और सिरदर्द है")।',
            te: '🤖 సాధారణ ఆరోగ్య ప్రశ్నల కోసం, దయచేసి *AI తో చాట్* ఫీచర్‌ను ఉపయోగించండి।\n\n🩺 లక్షణ తనిఖీలో, దయచేసి మీ ప్రస్తుత లక్షణాలను వివరించండి (ఉదా. "నాకు 2 రోజులుగా జ్వరం మరియు తలనొప్పి ఉంది")।',
            ta: '🤖 பொதுவான சுகாதார கேள்விகளுக்கு, தயவுசெய்து *AI உடன் அரட்டை* அம்சத்தைப் பயன்படுத்துங்கள்।\n\n🩺 அறிகுறி சரிபார்ப்பில், தயவுசெய்து உங்கள் தற்போதைய அறிகுறிகளை விவரிக்கவும் (எ.கா. "எனக்கு 2 நாட்களாக காய்ச்சல் மற்றும் தலைவலி உள்ளது")।',
            or: '🤖 ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ ପାଇଁ, ଦୟାକରି *AI ସହିତ ଚାଟ୍* ବ୍ୟବହାର କରନ୍ତୁ।\n\n🩺 ଲକ୍ଷଣ ଯାଞ୍ଚରେ, ଦୟାକରି ଆପଣଙ୍କର ବର୍ତ୍ତମାନର ଲକ୍ଷଣଗୁଡ଼ିକ ବର୍ଣ୍ଣନା କରନ୍ତୁ (ଯେମିତି "ମୋର 2 ଦିନ ଧରି ଜ୍ୱର ଏବଂ ମୁଣ୍ଡବିନ୍ଧା ଅଛି")।'
          };
          
          await this.whatsappService.sendMessage(
            user.phone_number, 
            redirectText[user.preferred_language] || redirectText.en
          );
          return;
        }

        // Check if user input is a conversational response, not actual symptoms
        if (this.isConversationalResponse(message)) {
          const clarificationTexts = {
            en: '🩺 I understand you\'re ready to share your symptoms.\n\nPlease describe what you\'re feeling, for example:\n• "I have fever and headache"\n• "My stomach hurts since yesterday"\n• "I feel dizzy and tired"\n\nWhat symptoms are you experiencing?',
            hi: '🩺 मैं समझ गया कि आप अपने लक्षण साझा करने के लिए तैयार हैं।\n\nकृपया बताएं कि आप कैसा महसूस कर रहे हैं, उदाहरण के लिए:\n• "मुझे बुखार और सिरदर्द है"\n• "कल से मेरे पेट में दर्द है"\n• "मुझे चक्कर आ रहे हैं और थकान है"\n\nआप कौन से लक्षण महसूस कर रहे हैं?',
            te: '🩺 మీరు మీ లక్షణాలను పంచుకోవడానికి సిద్ధంగా ఉన్నారని నేను అర్థం చేసుకున్నాను।\n\nదయచేసి మీరు ఎలా అనుభవిస్తున్నారో వివరించండి, ఉదాహరణకు:\n• "నాకు జ్వరం మరియు తలనొప్పి ఉంది"\n• "నిన్న నుండి నా కడుపు నొప్పిస్తోంది"\n• "నాకు తలతిరుగులు మరియు అలసట అనిపిస్తోంది"\n\nమీరు ఏ లక్షణాలను అనుభవిస్తున్నారు?'
          };
          
          await this.whatsappService.sendMessage(
            user.phone_number,
            clarificationTexts[user.preferred_language] || clarificationTexts.en
          );
          return;
        }

        // User provided symptoms - analyze with specialized symptom checker prompt
        console.log('🩺 Analyzing symptoms:', message, mediaData ? 'with image' : 'text only');
        
        // Get conversation context for better understanding
        const context = await this.conversationService.getRecentContext(user.id);
        
        // Create specialized symptom analysis prompt
        const symptomPrompt = this.createSymptomAnalysisPrompt(message, user.preferred_language, user.script_preference);
        
        let analysis;
        if (mediaData) {
          analysis = await this.geminiService.analyzeHealthImage(
            mediaData.data, 
            symptomPrompt, 
            user.preferred_language
          );
        } else {
          analysis = await this.geminiService.generateResponse(
            symptomPrompt,
            user.preferred_language,
            user.script_preference,
            context,
            user.accessibility_mode,
            3,
            'symptom_check'
          );
        }
        
        await this.sendMessageWithTypingAndFeedback(user.phone_number, analysis);
        
        await this.conversationService.saveBotMessage(
          user.id,
          analysis,
          'symptom_analysis',
          user.preferred_language
        );

        // Keep user in symptom_check state for continuous conversation
        // User can continue asking questions or type 'menu' to exit
      }
    } catch (error) {
      console.error('Error in handleSymptomCheck:', error);
      throw error;
    }
  }

  // Create specialized symptom analysis prompt (updated for bullet point format)
  createSymptomAnalysisPrompt(userSymptoms, language, scriptPreference) {
    const prompts = {
      en: `You are a multilingual health chatbot. The user has selected SYMPTOM CHECKER.

User's symptoms: "${userSymptoms}"

CRITICAL: First analyze if the user input describes actual medical symptoms or health issues. If the input is vague, conversational, or doesn't describe symptoms, ask for clarification.

Instructions:
1. VALIDATE: Check if the input describes actual symptoms (pain, discomfort, physical sensations, health issues).
2. If NOT symptoms (like "okay", "yes", "hello"), ask: "Please describe your actual symptoms - what physical discomfort or health issues are you experiencing?"
3. If symptoms are vague, ask clarifying questions (duration, severity, triggers, additional symptoms).
4. For clear symptoms, provide response in BULLET POINTS (not paragraphs) with these sections:

*🔍 How it's caused:*
• List possible causes in bullet points

*🏥 Common diseases related to these symptoms:*
• List related conditions in bullet points

*🛡️ How to prevent these symptoms:*
• List prevention methods in bullet points

*🚨 When to see a doctor immediately:*
• List red flag symptoms in bullet points

FORMATTING RULES:
• Use *bold* for headings, section titles, and ALL sub-headings (like "Common Causes:", "Risk Factors:", etc.)
• Use _italics_ for paragraphs and explanatory text
• Use underscores for emphasis within sentences
• NO monospace/backticks - use regular text for medical terms and conditions
• Use bullet points for lists

4. Always end with: "⚠️ This is not a diagnosis. Please visit a doctor if symptoms persist or worsen."
5. Never suggest medicine or dosage.
6. If user asks non-symptom queries, say: "Please use Chat with AI for that."

Respond in ${language} language${scriptPreference === 'transliteration' ? ' using English letters' : ' using native script'}.`,

      hi: `आप एक बहुभाषी स्वास्थ्य चैटबॉट हैं। उपयोगकर्ता ने SYMPTOM CHECKER चुना है।

उपयोगकर्ता के लक्षण: "${userSymptoms}"

महत्वपूर्ण: पहले विश्लेषण करें कि क्या उपयोगकर्ता का इनपुट वास्तविक चिकित्सा लक्षणों या स्वास्थ्य समस्याओं का वर्णन करता है। यदि इनपुट अस्पष्ट, बातचीत संबंधी है, या लक्षणों का वर्णन नहीं करता है, तो स्पष्टीकरण मांगें।

निर्देश:
1. सत्यापन: जांचें कि क्या इनपुट वास्तविक लक्षणों (दर्द, परेशानी, शारीरिक संवेदना, स्वास्थ्य समस्याएं) का वर्णन करता है।
2. यदि लक्षण नहीं हैं (जैसे "ठीक है", "हां", "हैलो"), तो पूछें: "कृपया अपने वास्तविक लक्षणों का वर्णन करें - आप कौन सी शारीरिक परेशानी या स्वास्थ्य समस्याओं का अनुभव कर रहे हैं?"
3. यदि लक्षण अस्पष्ट हैं, तो स्पष्टीकरण प्रश्न पूछें (अवधि, गंभीरता, ट्रिगर, अतिरिक्त लक्षण)।
4. स्पष्ट लक्षणों के लिए, इन अनुभागों के साथ बुलेट पॉइंट्स में (पैराग्राफ में नहीं) उत्तर दें:

**🔍 यह कैसे होता है:**
• संभावित कारणों को बुलेट पॉइंट्स में सूचीबद्ध करें

**🏥 इन लक्षणों से संबंधित सामान्य बीमारियां:**
• संबंधित स्थितियों को बुलेट पॉइंट्स में सूचीबद्ध करें

**🛡️ इन लक्षणों को कैसे रोकें:**
• रोकथाम के तरीकों को बुलेट पॉइंट्स में सूचीबद्ध करें

**🚨 तुरंत डॉक्टर से कब मिलें:**
• रेड फ्लैग लक्षणों को बुलेट पॉइंट्स में सूचीबद्ध करें

4. हमेशा इसके साथ समाप्त करें: "⚠️ यह निदान नहीं है। यदि लक्षण बने रहते हैं या बिगड़ते हैं तो कृपया डॉक्टर से मिलें।"
5. कभी भी दवा या खुराक का सुझाव न दें।
6. यदि उपयोगकर्ता गैर-लक्षण प्रश्न पूछता है, तो कहें: "कृपया इसके लिए AI से बात करें का उपयोग करें।"

${language} भाषा में${scriptPreference === 'transliteration' ? ' अंग्रेजी अक्षरों का उपयोग करके' : ' देवनागरी लिपि का उपयोग करके'} उत्तर दें।`,

      te: `మీరు బహుభాషా ఆరోగ్య చాట్‌బాట్. వినియోగదారు SYMPTOM CHECKER ఎంచుకున్నారు.

వినియోగదారు లక్షణాలు: "${userSymptoms}"

సూచనలు:
1. మొదట, వారు టైప్ చేసిన లక్షణాలను పునరావృతం చేయండి.
2. లక్షణాలు అస్పష్టంగా ఉంటే, స్పష్టీకరణ ప్రశ్నలు అడగండి (వ్యవధి, తీవ్రత, ట్రిగ్గర్లు, అదనపు లక్షణాలు).
3. స్పష్టమైన లక్షణాల కోసం, ఈ విభాగాలతో బుల్లెట్ పాయింట్లలో (పేరాగ్రాఫ్‌లలో కాకుండా) ప్రతిస్పందన అందించండి:

**🔍 ఇది ఎలా కారణమవుతుంది:**
• సాధ్యమైన కారణాలను బుల్లెట్ పాయింట్లలో జాబితా చేయండి

**🏥 ఈ లక్షణాలకు సంబంధించిన సాధారణ వ్యాధులు:**
• సంబంధిత పరిస్థితులను బుల్లెట్ పాయింట్లలో జాబితా చేయండి

**🛡️ ఈ లక్షణాలను ఎలా నివారించాలి:**
• నివారణ పద్ధతులను బుల్లెట్ పాయింట్లలో జాబితా చేయండి

**🚨 వెంటనే వైద్యుడిని ఎప్పుడు చూడాలి:**
• రెడ్ ఫ్లాగ్ లక్షణాలను బుల్లెట్ పాయింట్లలో జాబితా చేయండి

4. ఎల్లప్పుడూ దీనితో ముగించండి: "⚠️ ఇది నిర్ధారణ కాదు. లక్షణాలు కొనసాగితే లేదా దిగజారితే దయచేసి వైద్యుడిని సంప్రదించండి."
5. ఎప్పుడూ మందు లేదా మోతాదును సూచించవద్దు.
6. వినియోగదారు లక్షణేతర ప్రశ్నలు అడిగితే, చెప్పండి: "దయచేసి దాని కోసం AI తో చాట్ ఉపయోగించండి."

${language} భాషలో${scriptPreference === 'transliteration' ? ' ఆంగ్ల అక్షరాలను ఉపయోగించి' : ' తెలుగు లిపిని ఉపయోగించి'} సమాధానం ఇవ్వండి.`
    };

    return prompts[language] || prompts.en;
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
          // Send initial nutrition guidance and set session for continuous nutrition conversation
          const nutritionIntroTexts = {
            en: '🥗 *Nutrition & Hygiene*\n\nI can help you with:\n• Food choices and balanced diet\n• Cooking and food safety\n• Personal hygiene practices\n• Water and sanitation\n\nWhat specific nutrition or hygiene question do you have?',
            hi: '🥗 *पोषण और स्वच्छता*\n\nमैं आपकी इनमें मदद कर सकता हूं:\n• भोजन विकल्प और संतुलित आहार\n• खाना पकाना और खाद्य सुरक्षा\n• व्यक्तिगत स्वच्छता प्रथाएं\n• पानी और स्वच्छता\n\nआपका कोई विशिष्ट पोषण या स्वच्छता प्रश्न क्या है?',
            te: '🥗 *పోషణ మరియు పరిశుభ్రత*\n\nనేను మీకు వీటిలో సహాయం చేయగలను:\n• ఆహార ఎంపికలు మరియు సమతుల్య ఆహారం\n• వంట మరియు ఆహార భద్రత\n• వ్యక్తిగత పరిశుభ్రత పద్ధతులు\n• నీరు మరియు పారిశుధ్యం\n\nమీకు ఏదైనా నిర్దిష్ట పోషణ లేదా పరిశుభ్రత ప్రశ్న ఉందా?'
          };
          
          await this.whatsappService.sendMessage(
            user.phone_number, 
            nutritionIntroTexts[user.preferred_language] || nutritionIntroTexts.en
          );
          
          // Set session to nutrition conversation mode
          await this.userService.updateUserSession(user.id, 'preventive_tips', { 
            selectedCategory: 'nutrition_hygiene',
            inNutritionConversation: true 
          });
          return;
        } else if (message === 'exercise_lifestyle') {
          category = 'exercise and lifestyle';
          // Send initial exercise guidance and set session for continuous exercise conversation
          const exerciseIntroTexts = {
            en: '🏃 *Exercise & Lifestyle*\n\nI can help you with:\n• Exercise routines and physical activities\n• Fitness tips for different age groups\n• Daily lifestyle habits\n• Sleep and rest guidance\n• Mental health and stress management\n\nWhat specific exercise or lifestyle question do you have?',
            hi: '🏃 *व्यायाम और जीवनशैली*\n\nमैं आपकी इनमें मदद कर सकता हूं:\n• व्यायाम दिनचर्या और शारीरिक गतिविधियां\n• विभिन्न आयु समूहों के लिए फिटनेस टिप्स\n• दैनिक जीवनशैली की आदतें\n• नींद और आराम मार्गदर्शन\n• मानसिक स्वास्थ्य और तनाव प्रबंधन\n\nआपका कोई विशिष्ट व्यायाम या जीवनशैली प्रश्न क्या है?',
            te: '🏃 *వ్యాయామం మరియు జీవనశైలి*\n\nనేను మీకు వీటిలో సహాయం చేయగలను:\n• వ్యాయామ దినచర్యలు మరియు శారీరక కార్యకలాపాలు\n• వివిధ వయస్సు గ్రూపులకు ఫిట్‌నెస్ చిట్కాలు\n• రోజువారీ జీవనశైలి అలవాట్లు\n• నిద్ర మరియు విశ్రాంతి మార్గదర్శనం\n• మానసిక ఆరోగ్యం మరియు ఒత్తిడి నిర్వహణ\n\nమీకు ఏదైనా నిర్దిష్ట వ్యాయామం లేదా జీవనశైలి ప్రశ్న ఉందా?'
          };
          
          await this.whatsappService.sendMessage(
            user.phone_number, 
            exerciseIntroTexts[user.preferred_language] || exerciseIntroTexts.en
          );
          
          // Set session to exercise conversation mode
          await this.userService.updateUserSession(user.id, 'preventive_tips', { 
            selectedCategory: 'exercise_lifestyle',
            inExerciseConversation: true 
          });
          return;
        } 
        // Check if user is in nutrition conversation mode
        else if (sessionData.inNutritionConversation || sessionData.selectedCategory === 'nutrition_hygiene') {
          // User is asking a follow-up nutrition question
          await this.handleNutritionQuestion(user, message);
          return;
        }
        // Check if user is in exercise conversation mode
        else if (sessionData.inExerciseConversation || sessionData.selectedCategory === 'exercise_lifestyle') {
          // User is asking a follow-up exercise question
          await this.handleExerciseQuestion(user, message);
          return;
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
        
        await this.sendMessageWithTypingAndFeedback(user.phone_number, tips);
        
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

  // Check if user input is a conversational response rather than actual symptoms
  isConversationalResponse(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Define conversational responses that are not symptoms
    const conversationalResponses = [
      // Agreement/acknowledgment
      'okay', 'ok', 'yes', 'yeah', 'yep', 'sure', 'alright', 'right', 'correct',
      'हां', 'हाँ', 'ठीक है', 'ओके', 'सही', 'अच्छा',
      'అవును', 'సరే', 'ఓకే', 'మంచిది',
      'ஆம்', 'சரி', 'ஓகே', 'நல்லது',
      'ହଁ', 'ଠିକ୍', 'ଭଲ',
      
      // Disagreement
      'no', 'nope', 'not really', 'नहीं', 'नही', 'కాదు', 'இல்லை', 'ନା',
      
      // Greetings
      'hello', 'hi', 'hey', 'good morning', 'good evening',
      'नमस्ते', 'हैलो', 'हाय', 'नमस्कार',
      'హలో', 'హాయ్', 'నమస్తే',
      'வணக்கம்', 'ஹலோ', 'ஹாய்',
      'ନମସ୍କାର', 'ହେଲୋ',
      
      // Thanks
      'thank you', 'thanks', 'धन्यवाद', 'शुक्रिया', 'ధన్యవాదాలు', 'நன்றி', 'ଧନ୍ୟବାଦ',
      
      // Single word responses
      'good', 'fine', 'great', 'अच्छा', 'ठीक', 'మంచిది', 'బాగుంది', 'நல்லது', 'ଭଲ',
      
      // Questions about the service
      'what', 'how', 'when', 'where', 'why', 'क्या', 'कैसे', 'कब', 'ఎలా', 'ఎప్పుడు', 'எப்படி', 'எப்போது',
      
      // Menu navigation
      'menu', 'back', 'home', 'मेनू', 'वापस', 'మెనూ', 'వెనుకకు', 'மெனு', 'பின்னால்', 'ମେନୁ',
      
      // Very short responses (likely not symptoms)
      'hmm', 'umm', 'oh', 'ah', 'uh'
    ];
    
    // Check if the message is exactly one of these conversational responses
    if (conversationalResponses.includes(lowerMessage)) {
      return true;
    }
    
    // Check for very short messages (1-2 characters) that are likely not symptoms
    if (lowerMessage.length <= 2) {
      return true;
    }
    
    // Check for messages that are just punctuation or numbers
    if (/^[.,!?;:\-\s\d]+$/.test(lowerMessage)) {
      return true;
    }
    
    // Check for common non-symptom phrases
    const nonSymptomPhrases = [
      'i am fine', 'i am good', 'i am okay', 'nothing wrong', 'no problem',
      'मैं ठीक हूं', 'मैं अच्छा हूं', 'कोई समस्या नहीं',
      'నేను బాగున్నాను', 'ఎటువంటి సమస్య లేదు',
      'நான் நலமாக இருக்கிறேன்', 'எந்த பிரச்சனையும் இல்லை',
      'ମୁଁ ଭଲ ଅଛି', 'କୌଣସି ସମସ୍ୟା ନାହିଁ'
    ];
    
    if (nonSymptomPhrases.some(phrase => lowerMessage.includes(phrase))) {
      return true;
    }
    
    return false;
  }

  // Handle exercise-specific questions with proper categorization and redirects
  async handleExerciseQuestion(user, message) {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Define exercise-related keywords (comprehensive list including specific exercises)
      const exerciseKeywords = [
        // General exercise terms
        'exercise', 'workout', 'fitness', 'gym', 'training', 'activity', 'sport',
        'walking', 'running', 'jogging', 'cycling', 'swimming', 'yoga', 'stretching',
        'muscle', 'strength', 'cardio', 'aerobic', 'weight', 'lifting', 'push-up',
        'sit-up', 'squat', 'plank', 'meditation', 'breathing', 'relaxation',
        'sleep', 'rest', 'lifestyle', 'routine', 'habit', 'daily', 'morning',
        'stress', 'mental health', 'mood', 'energy', 'fatigue', 'tired',
        'posture', 'back', 'neck', 'shoulder', 'joint', 'flexibility',
        
        // Specific yoga poses and exercises
        'suryanamaskar', 'surya namaskar', 'sun salutation', 'namaste', 'asana',
        'pranayama', 'downward dog', 'warrior pose', 'tree pose', 'cobra pose',
        'child pose', 'mountain pose', 'triangle pose', 'bridge pose',
        
        // Specific exercises
        'pushup', 'push up', 'situp', 'sit up', 'pullup', 'pull up', 'burpee',
        'jumping jack', 'lunges', 'crunches', 'deadlift', 'bicep curl',
        'tricep dip', 'leg raise', 'mountain climber', 'high knees',
        
        // Exercise equipment and methods
        'dumbbell', 'barbell', 'treadmill', 'elliptical', 'resistance band',
        'bodyweight', 'calisthenics', 'pilates', 'zumba', 'aerobics',
        
        // Hindi/Indian exercise terms
        'व्यायाम', 'योग', 'सूर्यनमस्कार', 'प्राणायाम', 'आसन', 'ध्यान',
        'कसरत', 'दौड़ना', 'चलना', 'तनाव', 'आराम', 'नींद',
        
        // Telugu exercise terms
        'వ్యాయామం', 'యోగా', 'సూర్యనమస్కారం', 'ప్రాణాయామం', 'ఆసనం',
        'కసరత్తు', 'నడక', 'పరుగు', 'విశ్రాంతి', 'నిద్ర',
        
        // Lifestyle and wellness terms
        'wellness', 'health', 'balance', 'mindfulness', 'self-care',
        'recovery', 'endurance', 'stamina', 'agility', 'coordination'
      ];
      
      // Define non-exercise keywords that should be redirected
      const symptomKeywords = [
        'pain', 'ache', 'hurt', 'fever', 'cough', 'cold', 'headache', 'stomach ache',
        'nausea', 'vomit', 'diarrhea', 'constipation', 'dizzy', 'weak',
        'rash', 'itch', 'swelling', 'bleeding', 'breathe', 'chest', 'heart attack'
      ];
      
      const nutritionKeywords = [
        'eat', 'eating', 'food', 'diet', 'nutrition', 'meal', 'cooking',
        'chicken', 'fish', 'meat', 'vegetable', 'fruit', 'rice', 'milk',
        'protein', 'vitamin', 'calcium', 'recipe', 'ingredient'
      ];
      
      const diseaseKeywords = [
        'diabetes', 'cancer', 'heart disease', 'hypertension', 'malaria', 'tuberculosis',
        'covid', 'dengue', 'typhoid', 'hepatitis', 'asthma', 'arthritis'
      ];
      
      // FIRST: Check if it's an exercise-related question (prioritize this)
      if (exerciseKeywords.some(keyword => lowerMessage.includes(keyword))) {
        console.log('🏃 Handling exercise question:', message);
        
        const context = await this.conversationService.getRecentContext(user.id);
        const exerciseResponse = await this.geminiService.generateResponse(
          message,
          user.preferred_language,
          user.script_preference,
          context,
          user.accessibility_mode,
          3,
          'exercise_lifestyle'
        );
        
        await this.sendMessageWithTypingAndFeedback(user.phone_number, exerciseResponse);
        
        await this.conversationService.saveBotMessage(
          user.id,
          exerciseResponse,
          'exercise_response',
          user.preferred_language
        );
        
        // Keep user in exercise conversation mode
        await this.userService.updateUserSession(user.id, 'preventive_tips', { 
          selectedCategory: 'exercise_lifestyle',
          inExerciseConversation: true 
        });
        
        return;
      }
      
      // Check if it's a symptom-related question
      if (symptomKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const redirectTexts = {
          en: '🩺 Your question seems to be about symptoms or health issues. For symptom analysis and health concerns, please use the *Check Symptoms* feature.\n\n🏃 For exercise and lifestyle questions, ask about workouts, fitness routines, or healthy habits.',
          hi: '🩺 आपका प्रश्न लक्षणों या स्वास्थ्य समस्याओं के बारे में लगता है। लक्षण विश्लेषण और स्वास्थ्य चिंताओं के लिए, कृपया *लक्षण जांचें* सुविधा का उपयोग करें।\n\n🏃 व्यायाम और जीवनशैली प्रश्नों के लिए, वर्कआउट, फिटनेस दिनचर्या, या स्वस्थ आदतों के बारे में पूछें।',
          te: '🩺 మీ ప్రశ్న లక్షణాలు లేదా ఆరోగ్య సమస్యల గురించి అనిపిస్తుంది। లక్షణ విశ్లేషణ మరియు ఆరోగ్య ఆందోళనల కోసం, దయచేసి *లక్షణాలను తనిఖీ చేయండి* ఫీచర్‌ను ఉపయోగించండి।\n\n🏃 వ్యాయామం మరియు జీవనశైలి ప్రశ్నల కోసం, వర్కౌట్‌లు, ఫిట్‌నెస్ రొటీన్‌లు లేదా ఆరోగ్యకరమైన అలవాట్ల గురించి అడగండి।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          redirectTexts[user.preferred_language] || redirectTexts.en
        );
        return;
      }
      
      // Check if it's a nutrition-related question
      if (nutritionKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const redirectTexts = {
          en: '🥗 Your question is about nutrition and food. For detailed nutrition guidance, please use the *Nutrition & Hygiene* option in Health Tips.\n\n🏃 For exercise questions, ask about workouts, fitness routines, or physical activities.',
          hi: '🥗 आपका प्रश्न पोषण और भोजन के बारे में है। विस्तृत पोषण मार्गदर्शन के लिए, कृपया स्वास्थ्य टिप्स में *पोषण और स्वच्छता* विकल्प का उपयोग करें।\n\n🏃 व्यायाम प्रश्नों के लिए, वर्कआउट, फिटनेस दिनचर्या, या शारीरिक गतिविधियों के बारे में पूछें।',
          te: '🥗 మీ ప్రశ్న పోషణ మరియు ఆహారం గురించి. వివరణాత్మక పోషణ మార్గదర్శనం కోసం, దయచేసి హెల్త్ టిప్స్‌లో *పోషణ & పరిశుభ్రత* ఎంపికను ఉపయోగించండి।\n\n🏃 వ్యాయామ ప్రశ్నల కోసం, వర్కౌట్‌లు, ఫిట్‌నెస్ రొటీన్‌లు లేదా శారీరక కార్యకలాపాల గురించి అడగండి।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          redirectTexts[user.preferred_language] || redirectTexts.en
        );
        return;
      }
      
      // Check if it's a disease-related question
      if (diseaseKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const redirectTexts = {
          en: '🦠 Your question is about diseases. For detailed disease information, please use the *Learn about Diseases* option in Health Tips.\n\n🏃 For exercise questions, ask about fitness routines, workouts, or healthy lifestyle habits.',
          hi: '🦠 आपका प्रश्न बीमारियों के बारे में है। विस्तृत बीमारी जानकारी के लिए, कृपया स्वास्थ्य टिप्स में *बीमारियों के बारे में जानें* विकल्प का उपयोग करें।\n\n🏃 व्यायाम प्रश्नों के लिए, फिटनेस दिनचर्या, वर्कआउट, या स्वस्थ जीवनशैली की आदतों के बारे में पूछें।',
          te: '🦠 మీ ప్రశ్న వ్యాధుల గురించి. వివరణాత్మక వ్యాధి సమాచారం కోసం, దయచేసి హెల్త్ టిప్స్‌లో *వ్యాధుల గురించి తెలుసుకోండి* ఎంపికను ఉపయోగించండి।\n\n🏃 వ్యాయామ ప్రశ్నల కోసం, ఫిట్‌నెస్ రొటీన్‌లు, వర్కౌట్‌లు లేదా ఆరోగ్యకరమైన జీవనశైలి అలవాట్ల గురించి అడగండి।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          redirectTexts[user.preferred_language] || redirectTexts.en
        );
        return;
      }
      
      // For general/unclear questions, provide guidance
      const guidanceTexts = {
        en: '🏃 I specialize in exercise and lifestyle guidance. Please ask about:\n\n• Exercise routines (e.g., "What exercises for beginners?")\n• Fitness tips and workouts\n• Daily lifestyle habits\n• Sleep and rest guidance\n• Stress management and mental health\n• Physical activities for different ages\n\nWhat specific exercise or lifestyle topic would you like to know about?',
        hi: '🏃 मैं व्यायाम और जीवनशैली मार्गदर्शन में विशेषज्ञ हूं। कृपया इनके बारे में पूछें:\n\n• व्यायाम दिनचर्या (जैसे, "शुरुआती लोगों के लिए कौन से व्यायाम?")\n• फिटनेस टिप्स और वर्कआउट\n• दैनिक जीवनशैली की आदतें\n• नींद और आराम मार्गदर्शन\n• तनाव प्रबंधन और मानसिक स्वास्थ्य\n• विभिन्न आयु के लिए शारीरिक गतिविधियां\n\nआप किस विशिष्ट व्यायाम या जीवनशैली विषय के बारे में जानना चाहेंगे?',
        te: '🏃 నేను వ్యాయామం మరియు జీవనశైలి మార్గదర్శనంలో నిపుణుడిని. దయచేసి వీటి గురించి అడగండి:\n\n• వ్యాయామ దినచర్యలు (ఉదా., "ప్రారంభకులకు ఏ వ్యాయామాలు?")\n• ఫిట్‌నెస్ చిట్కాలు మరియు వర్కౌట్‌లు\n• రోజువారీ జీవనశైలి అలవాట్లు\n• నిద్ర మరియు విశ్రాంతి మార్గదర్శనం\n• ఒత్తిడి నిర్వహణ మరియు మానసిక ఆరోగ్యం\n• వివిధ వయస్సులకు శారీరక కార్యకలాపాలు\n\nమీరు ఏ నిర్దిష్ట వ్యాయామం లేదా జీవనశైలి అంశం గురించి తెలుసుకోవాలనుకుంటున్నారు?'
      };
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        guidanceTexts[user.preferred_language] || guidanceTexts.en
      );
      
    } catch (error) {
      console.error('Error in handleExerciseQuestion:', error);
      throw error;
    }
  }

  // Handle nutrition-specific questions with proper categorization and redirects
  async handleNutritionQuestion(user, message) {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Define nutrition-related keywords
      const nutritionKeywords = [
        'eat', 'eating', 'food', 'diet', 'nutrition', 'meal', 'breakfast', 'lunch', 'dinner',
        'chicken', 'fish', 'meat', 'vegetable', 'fruit', 'rice', 'wheat', 'dal', 'milk',
        'protein', 'vitamin', 'calcium', 'iron', 'carbohydrate', 'fat', 'sugar', 'salt',
        'cooking', 'recipe', 'ingredient', 'spice', 'oil', 'ghee', 'butter', 'cheese',
        'water', 'drink', 'juice', 'tea', 'coffee', 'alcohol', 'beverage',
        'weight', 'gain', 'lose', 'healthy', 'balanced', 'portion', 'calorie',
        'hygiene', 'clean', 'wash', 'sanitize', 'soap', 'hand', 'kitchen', 'utensil'
      ];
      
      // Define non-nutrition keywords that should be redirected
      const symptomKeywords = [
        'pain', 'ache', 'hurt', 'fever', 'cough', 'cold', 'headache', 'stomach ache',
        'nausea', 'vomit', 'diarrhea', 'constipation', 'dizzy', 'tired', 'weak',
        'rash', 'itch', 'swelling', 'bleeding', 'breathe', 'chest', 'heart'
      ];
      
      const exerciseKeywords = [
        'exercise', 'workout', 'gym', 'running', 'walking', 'yoga', 'fitness',
        'muscle', 'strength', 'cardio', 'training', 'sport', 'activity'
      ];
      
      const diseaseKeywords = [
        'diabetes', 'cancer', 'heart disease', 'hypertension', 'malaria', 'tuberculosis',
        'covid', 'dengue', 'typhoid', 'hepatitis', 'asthma', 'arthritis'
      ];
      
      // Check if it's a symptom-related question
      if (symptomKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const redirectTexts = {
          en: '🩺 Your question seems to be about symptoms or health issues. For symptom analysis and health concerns, please use the *Check Symptoms* feature.\n\n🥗 For nutrition and hygiene questions, ask about food choices, cooking tips, or cleanliness practices.',
          hi: '🩺 आपका प्रश्न लक्षणों या स्वास्थ्य समस्याओं के बारे में लगता है। लक्षण विश्लेषण और स्वास्थ्य चिंताओं के लिए, कृपया *लक्षण जांचें* सुविधा का उपयोग करें।\n\n🥗 पोषण और स्वच्छता प्रश्नों के लिए, भोजन विकल्प, खाना पकाने की युक्तियां, या सफाई प्रथाओं के बारे में पूछें।',
          te: '🩺 మీ ప్రశ్న లక్షణాలు లేదా ఆరోగ్య సమస్యల గురించి అనిపిస్తుంది. లక్షణ విశ్లేషణ మరియు ఆరోగ్య ఆందోళనల కోసం, దయచేసి *లక్షణాలను తనిఖీ చేయండి* ఫీచర్‌ను ఉపయోగించండి।\n\n🥗 పోషణ మరియు పరిశుభ్రత ప్రశ్నల కోసం, ఆహార ఎంపికలు, వంట చిట్కాలు లేదా పరిశుభ్రత పద్ధతుల గురించి అడగండి।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          redirectTexts[user.preferred_language] || redirectTexts.en
        );
        return;
      }
      
      // Check if it's an exercise-related question
      if (exerciseKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const redirectTexts = {
          en: '🏃 Your question is about exercise and fitness. For detailed exercise guidance, please use the *Exercise & Lifestyle* option in Health Tips.\n\n🥗 For nutrition questions, ask about food choices, cooking methods, or dietary advice.',
          hi: '🏃 आपका प्रश्न व्यायाम और फिटनेस के बारे में है। विस्तृत व्यायाम मार्गदर्शन के लिए, कृपया स्वास्थ्य टिप्स में *व्यायाम और जीवनशैली* विकल्प का उपयोग करें।\n\n🥗 पोषण प्रश्नों के लिए, भोजन विकल्प, खाना पकाने के तरीके, या आहार सलाह के बारे में पूछें।',
          te: '🏃 మీ ప్రశ్న వ్యాయామం మరియు ఫిట్‌నెస్ గురించి. వివరణాత్మక వ్యాయామ మార్గదర్శనం కోసం, దయచేసి హెల్త్ టిప్స్‌లో *వ్యాయామం & జీవనశైలి* ఎంపికను ఉపయోగించండి।\n\n🥗 పోషణ ప్రశ్నల కోసం, ఆహార ఎంపికలు, వంట పద్ధతులు లేదా ఆహార సలహా గురించి అడగండి।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          redirectTexts[user.preferred_language] || redirectTexts.en
        );
        return;
      }
      
      // Check if it's a disease-related question
      if (diseaseKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const redirectTexts = {
          en: '🦠 Your question is about diseases. For detailed disease information, please use the *Learn about Diseases* option in Health Tips.\n\n🥗 For nutrition questions, ask about food choices, healthy eating, or food safety.',
          hi: '🦠 आपका प्रश्न बीमारियों के बारे में है। विस्तृत बीमारी जानकारी के लिए, कृपया स्वास्थ्य टिप्स में *बीमारियों के बारे में जानें* विकल्प का उपयोग करें।\n\n🥗 पोषण प्रश्नों के लिए, भोजन विकल्प, स्वस्थ भोजन, या खाद्य सुरक्षा के बारे में पूछें।',
          te: '🦠 మీ ప్రశ్న వ్యాధుల గురించి. వివరణాత్మక వ్యాధి సమాచారం కోసం, దయచేసి హెల్త్ టిప్స్‌లో *వ్యాధుల గురించి తెలుసుకోండి* ఎంపికను ఉపయోగించండి।\n\n🥗 పోషణ ప్రశ్నల కోసం, ఆహార ఎంపికలు, ఆరోగ్యకరమైన ఆహారం లేదా ఆహార భద్రత గురించి అడగండి।'
        };
        
        await this.whatsappService.sendMessage(
          user.phone_number,
          redirectTexts[user.preferred_language] || redirectTexts.en
        );
        return;
      }
      
      // If it's a nutrition-related question, provide specialized nutrition response
      if (nutritionKeywords.some(keyword => lowerMessage.includes(keyword))) {
        console.log('🥗 Handling nutrition question:', message);
        
        const context = await this.conversationService.getRecentContext(user.id);
        const nutritionResponse = await this.geminiService.generateResponse(
          message,
          user.preferred_language,
          user.script_preference,
          context,
          user.accessibility_mode,
          3,
          'nutrition_hygiene'
        );
        
        await this.sendMessageWithTypingAndFeedback(user.phone_number, nutritionResponse);
        
        await this.conversationService.saveBotMessage(
          user.id,
          nutritionResponse,
          'nutrition_response',
          user.preferred_language
        );
        
        // Keep user in nutrition conversation mode
        await this.userService.updateUserSession(user.id, 'preventive_tips', { 
          selectedCategory: 'nutrition_hygiene',
          inNutritionConversation: true 
        });
        
        return;
      }
      
      // For general/unclear questions, provide guidance
      const guidanceTexts = {
        en: '🥗 I specialize in nutrition and hygiene guidance. Please ask about:\n\n• Food choices (e.g., "Is chicken good for health?")\n• Cooking tips and food safety\n• Personal hygiene practices\n• Water and sanitation\n• Balanced diet and meal planning\n\nWhat specific nutrition or hygiene topic would you like to know about?',
        hi: '🥗 मैं पोषण और स्वच्छता मार्गदर्शन में विशेषज्ञ हूं। कृपया इनके बारे में पूछें:\n\n• भोजन विकल्प (जैसे, "क्या चिकन स्वास्थ्य के लिए अच्छा है?")\n• खाना पकाने की युक्तियां और खाद्य सुरक्षा\n• व्यक्तिगत स्वच्छता प्रथाएं\n• पानी और स्वच्छता\n• संतुलित आहार और भोजन योजना\n\nआप किस विशिष्ट पोषण या स्वच्छता विषय के बारे में जानना चाहेंगे?',
        te: '🥗 నేను పోషణ మరియు పరిశుభ్రత మార్గదర్శనంలో నిపుణుడిని. దయచేసి వీటి గురించి అడగండి:\n\n• ఆహార ఎంపికలు (ఉదా., "చికెన్ ఆరోగ్యానికి మంచిదా?")\n• వంట చిట్కాలు మరియు ఆహార భద్రత\n• వ్యక్తిగత పరిశుభ్రత పద్ధతులు\n• నీరు మరియు పారిశుధ్యం\n• సమతుల్య ఆహారం మరియు భోజన ప్రణాళిక\n\nమీరు ఏ నిర్దిష్ట పోషణ లేదా పరిశుభ్రత అంశం గురించి తెలుసుకోవాలనుకుంటున్నారు?'
      };
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        guidanceTexts[user.preferred_language] || guidanceTexts.en
      );
      
    } catch (error) {
      console.error('Error in handleNutritionQuestion:', error);
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

      await this.sendMessageWithTypingAndFeedback(user.phone_number, response);
      
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

      await this.sendMessageWithTypingAndFeedback(user.phone_number, aiResponse);
      
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

  async handleDiseaseAlerts(user) {
    try {
      console.log('🦠 Handling disease outbreak alerts for user:', user.phone_number);

      // Check user's subscription status
      const User = require('../models/User');
      const dbUser = await User.findByPhoneNumber(user.phone_number);
      const isSubscribed = dbUser && dbUser.consent_outbreak_alerts;
      
      console.log(`🔍 User ${user.phone_number} subscription status: ${isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}`);

      // Show disease alerts submenu with interactive buttons (max 3) + follow-up
      const menuTexts = {
        en: `🦠 *Disease Outbreak Alerts*\n\nStay informed about disease outbreaks in your area:\n\n${isSubscribed ? '✅ You are currently subscribed to alerts' : '❌ You are not subscribed to alerts'}`,
        hi: `🦠 *रोग प्रकोप अलर्ट*\n\nअपने क्षेत्र में रोग प्रकोप के बारे में सूचित रहें:\n\n${isSubscribed ? '✅ आप वर्तमान में अलर्ट की सदस्यता लिए हुए हैं' : '❌ आप अलर्ट की सदस्यता नहीं लिए हुए हैं'}`,
        te: `🦠 *వ్యాధి వ్యాప్తి హెచ్చరికలు*\n\nమీ ప్రాంతంలో వ్యాధి వ్యాప్తి గురించి సూచనలు పొందండి:\n\n${isSubscribed ? '✅ మీరు ప్రస్తుతం అలర్ట్‌లకు సబ్‌స్క్రైబ్ చేసారు' : '❌ మీరు అలర్ట్‌లకు సబ్‌స్క్రైబ్ చేయలేదు'}`,
        ta: `🦠 *நோய் விரிவு எச்சரிக்கைகள்*\n\nஉங்கள் பரிசரத்தில் நோய் விரிவு குறித்து தகவல் பெறுங்கள்:\n\n${isSubscribed ? '✅ நீங்கள் தற்போது எச்சரிக்கைகளுக்கு சந்தா செலுத்தியுள்ளீர்கள்' : '❌ நீங்கள் எச்சரிக்கைகளுக்கு சந்தா செலுத்தவில்லை'}`,
        or: `🦠 *ରୋଗ ପ୍ରସାର ସଚେତନା*\n\nଆପଣଙ୍କ ଅଞ୍ଚଳରେ ରୋଗ ପ୍ରସାର ବିଷୟରେ ସୂଚିତ ରହନ୍ତୁ:\n\n${isSubscribed ? '✅ ଆପଣ ବର୍ତ୍ତମାନ ସଚେତନା ପାଇଁ ସବସ୍କ୍ରାଇବ କରିଛନ୍ତି' : '❌ ଆପଣ ସଚେତନା ପାଇଁ ସବସ୍କ୍ରାଇବ କରିନାହାଁନ୍ତି'}`
      };

      // Create context-aware buttons
      const baseButtons = [
        { 
          en: { id: 'view_active_diseases', title: '🦠 Disease Outbreak' },
          hi: { id: 'view_active_diseases', title: '🦠 रोग प्रकोप' },
          te: { id: 'view_active_diseases', title: '🦠 వ్యాధి వ్యాప్తి' },
          ta: { id: 'view_active_diseases', title: '🦠 நோய் விரிவு' },
          or: { id: 'view_active_diseases', title: '🦠 ରୋଗ ପ୍ରସାର' }
        }
      ];

      if (isSubscribed) {
        baseButtons.push({
          en: { id: 'turn_off_alerts', title: '🔕 Turn OFF Alerts' },
          hi: { id: 'turn_off_alerts', title: '🔕 अलर्ट बंद करें' },
          te: { id: 'turn_off_alerts', title: '🔕 అలర్ట్ ఆఫ్ చేయండి' },
          ta: { id: 'turn_off_alerts', title: '🔕 எச்சரிக்கை ஆஃப்' },
          or: { id: 'turn_off_alerts', title: '🔕 ସଚେତନା ବନ୍ଦ କରନ୍ତୁ' }
        });
        console.log('📱 Showing DISABLE button for subscribed user');
      } else {
        baseButtons.push({
          en: { id: 'turn_on_alerts', title: '🔔 Turn ON Alerts' },
          hi: { id: 'turn_on_alerts', title: '🔔 अलर्ट चालू करें' },
          te: { id: 'turn_on_alerts', title: '🔔 అలర్ట్ ఆన్ చేయండి' },
          ta: { id: 'turn_on_alerts', title: '🔔 எச்சரிக்கை ஆன்' },
          or: { id: 'turn_on_alerts', title: '🔔 ସଚେତନା ଚାଲୁ କରନ୍ତୁ' }
        });
        console.log('📱 Showing ENABLE button for non-subscribed user');
      }

      // Convert to the format expected by the WhatsApp service
      const language = user.preferred_language || 'en';
      const menuButtons = baseButtons.map(buttonGroup => buttonGroup[language] || buttonGroup.en);

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
      
      // Try showing today's alerts first (rich Gemini-like format)
      const OutbreakAlert = require('../models/OutbreakAlert');
      const todaysNational = await OutbreakAlert.getTodaysNationalAlert();
      const todaysState = userStateName ? await OutbreakAlert.getStateAlert(userStateName) : null;

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

      // Separate user state alerts from national breaking news
      let showedAlerts = false;
      
      // 1. Show USER'S STATE alert first (personalized based on user location)
      if (todaysState && userStateName) {
        console.log(`📍 Showing ${userStateName} state alert to user`);
        const stateChunks = todaysState.getFormattedAlertChunks(user.preferred_language || 'en');
        for (const chunk of stateChunks) {
          await this.whatsappService.sendMessage(user.phone_number, chunk);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        showedAlerts = true;
      }
      
      // 2. Show NATIONAL BREAKING NEWS (independent of user state preferences)
      if (todaysNational) {
        console.log('🚨 Showing national breaking news alerts (independent of user state)');
        const nationalBreakingNews = todaysNational.getStateBasedAlertMessages(user.preferred_language || 'en');
        
        // Send each breaking news state alert individually
        for (const breakingNewsAlert of nationalBreakingNews) {
          await this.whatsappService.sendMessage(user.phone_number, breakingNewsAlert);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        showedAlerts = true;
      }

      // If we showed any alerts, provide appropriate follow-up based on subscription status
      if (showedAlerts) {
        // Check if user is already subscribed to alerts
        const isSubscribed = user.consent_outbreak_alerts === true;
        
        // Provide appropriate follow-up actions
        const followUpButtons = isSubscribed 
          ? [
              { id: 'disease_alerts', title: '↩️ Back' },
              { id: 'back_to_menu', title: '🏠 Main Menu' }
            ]
          : [
              { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
              { id: 'disease_alerts', title: '↩️ Back' },
              { id: 'back_to_menu', title: '🏠 Main Menu' }
            ];
        
        const followUpMessage = isSubscribed 
          ? '✅ You are receiving disease outbreak alerts. Stay informed!'
          : '📱 Want alerts for disease outbreaks in your area?';
          
        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          followUpMessage,
          followUpButtons
        );
        return;
      }

      // Otherwise, fall back to the smart caching disease list flow
      const diseaseData = await cacheService.getDiseaseOutbreakData(userStateName);

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
        
        // Send diseases with clear state vs nationwide sections
        let sentCount = 0;
        let hasShownStateHeader = false;
        let hasShownNationalHeader = false;
        
        // First show state-specific diseases
        const stateDiseases = relevantDiseases.filter(d => d.isState || d.isLocal);
        if (stateDiseases.length > 0 && userStateName) {
          if (!hasShownStateHeader) {
            const stateHeaderText = `⚠️ *Diseases in ${userStateName}:*`;
            await this.whatsappService.sendMessage(user.phone_number, stateHeaderText);
            await new Promise(resolve => setTimeout(resolve, 300));
            hasShownStateHeader = true;
          }
          
          for (const disease of stateDiseases.slice(0, 3)) {
            const message = this.formatLocationAwareDiseaseNews(disease, userLocation);
            await this.whatsappService.sendMessage(user.phone_number, message);
            sentCount++;
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
        
        // Then show nationwide diseases
        const nationalDiseases = relevantDiseases.filter(d => !d.isState && !d.isLocal);
        if (nationalDiseases.length > 0) {
          if (!hasShownNationalHeader) {
            const nationalHeaderText = `🇮🇳 *Nationwide Disease Outbreaks:*`;
            await this.whatsappService.sendMessage(user.phone_number, nationalHeaderText);
            await new Promise(resolve => setTimeout(resolve, 300));
            hasShownNationalHeader = true;
          }
          
          for (const disease of nationalDiseases.slice(0, 4)) {
            const message = this.formatLocationAwareDiseaseNews(disease, userLocation);
            await this.whatsappService.sendMessage(user.phone_number, message);
            sentCount++;
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
        
        // Generate disease-specific prevention recommendations
        const isSubscribed = user.consent_outbreak_alerts === true;
        const specificPrevention = this.generateDiseaseSpecificPrevention(relevantDiseases, user.preferred_language, user.script_preference, isSubscribed);
        
        await this.whatsappService.sendMessage(user.phone_number, specificPrevention);

        // Show data source and follow-up options
        const sourceText = diseaseData.source === 'cache' ? '💾 Cached data' : '🆕 Fresh data';
        
        const followUpButtons = isSubscribed 
          ? [
              { id: 'disease_alerts', title: '↩️ Back' },
              { id: 'back_to_menu', title: '🏠 Main Menu' }
            ]
          : [
              { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
              { id: 'disease_alerts', title: '↩️ Back' },
              { id: 'back_to_menu', title: '🏠 Main Menu' }
            ];

        const followUpMessage = isSubscribed 
          ? `✅ You are receiving disease outbreak alerts. Stay informed! ${sourceText}`
          : `📱 Want alerts for disease outbreaks in your area? ${sourceText}`;

        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          followUpMessage,
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
        
        // Show follow-up options even in fallback - respect subscription status
        const isSubscribed = user.consent_outbreak_alerts === true;
        
        const followUpButtons = isSubscribed 
          ? [
              { id: 'disease_alerts', title: '↩️ Back' },
              { id: 'back_to_menu', title: '🏠 Main Menu' }
            ]
          : [
              { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
              { id: 'disease_alerts', title: '↩️ Back' },
              { id: 'back_to_menu', title: '🏠 Main Menu' }
            ];

        const followUpMessage = isSubscribed 
          ? '✅ You are receiving disease outbreak alerts. Stay informed!'
          : '📱 Want alerts for disease outbreaks in your area?';

        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          followUpMessage,
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
      
      // Show appropriate follow-up buttons even in error case
      const isSubscribed = user.consent_outbreak_alerts === true;
      
      const followUpButtons = isSubscribed 
        ? [
            { id: 'disease_alerts', title: '↩️ Back' },
            { id: 'back_to_menu', title: '🏠 Main Menu' }
          ]
        : [
            { id: 'turn_on_alerts', title: '🔔 Get Alerts' },
            { id: 'disease_alerts', title: '↩️ Back' },
            { id: 'back_to_menu', title: '🏠 Main Menu' }
          ];

      const followUpMessage = isSubscribed 
        ? '✅ You are receiving disease outbreak alerts. Stay informed!'
        : '📱 Want alerts for disease outbreaks in your area?';

      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        followUpMessage,
        followUpButtons
      );
    }
  }

  // Handle turning on alerts - with location preferences
  async handleTurnOnAlerts(user) {
    try {
      console.log('🔔 User requesting to turn on disease outbreak alerts:', user.phone_number);
      
      // Get user from database
      const User = require('../models/User');
      const dbUser = await User.findByPhoneNumber(user.phone_number);
      
      if (dbUser && dbUser.consent_outbreak_alerts) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          `✅ *Disease Outbreak Alerts Already Enabled*\n\nYou are already subscribed to receive disease outbreak alerts!\n\n📅 You will receive:\n• Daily national outbreak updates at 10:00 AM\n• Emergency outbreak notifications\n• State-specific alerts for your location\n\n📞 Emergency: 108\n\nReply "STOP ALERTS" anytime to unsubscribe.`
        );
        return;
      }

      // Ask for location preferences
      const locationMessages = {
        en: `📍 *Setup Location for Personalized Alerts*\n\nTo provide you with relevant disease outbreak alerts for your area, please share your location details:\n\n*Format:* State, District, Pincode\n*Example:* Maharashtra, Mumbai, 400001\n\nPlease reply with your location details:`,
        hi: `📍 *व्यक्तिगत अलर्ट के लिए स्थान सेटअप*\n\nआपके क्षेत्र के लिए प्रासंगिक रोग प्रकोप अलर्ट प्रदान करने के लिए, कृपया अपने स्थान का विवरण साझा करें:\n\n*प्रारूप:* राज्य, जिला, पिनकोड\n*उदाहरण:* महाराष्ट्र, मुंबई, 400001\n\nकृपया अपने स्थान के विवरण के साथ उत्तर दें:`
      };

      await this.whatsappService.sendMessage(
        user.phone_number,
        locationMessages[user.preferred_language] || locationMessages.en
      );

      // Set user session to wait for location input
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
      
      // Save location and enable alerts
      const User = require('../models/User');
      const { supabase } = require('../config/database');
      
      let dbUser = await User.findByPhoneNumber(user.phone_number);
      
      if (!dbUser) {
        dbUser = await User.createOrUpdateUser(user.phone_number, {
          first_name: user.name || '',
          preferred_language: user.preferred_language || 'en'
        });
      }

      // Enable alerts in users table
      await dbUser.enableDiseaseAlerts();
      
      // Find state ID from indian_states table
      const { data: stateData, error: stateError } = await supabase
        .from('indian_states')
        .select('id')
        .ilike('state_name', state)
        .single();

      if (stateError) {
        console.error('State not found:', stateError);
        await this.whatsappService.sendMessage(
          user.phone_number,
          `❌ State "${state}" not found. Please check the spelling and try again.\n\nExample: Maharashtra, Mumbai, 400001`
        );
        return;
      }

      // Save to user_alert_preferences table
      const { data: prefData, error: prefError } = await supabase
        .from('user_alert_preferences')
        .upsert({
          phone_number: user.phone_number,
          user_id: dbUser.id,
          state: state,
          district: district,
          pincode: pincode,
          alert_enabled: true,
          selected_state_id: stateData.id,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();

      if (prefError) {
        console.error('Error saving alert preferences:', prefError);
        throw prefError;
      }

      const successMessage = `✅ *Disease Outbreak Alerts Enabled*

📍 **Location Set:** ${state}, ${district} - ${pincode}

🔔 **You will now receive:**
• Daily national outbreak updates at 10:00 AM IST
• State-specific alerts for ${state}
• District-level notifications for ${district}
• Emergency outbreak notifications
• Real-time health advisories

🛡️ **Stay protected and informed!**

📞 Emergency: 108

Reply "STOP ALERTS" anytime to unsubscribe.`;

      await this.whatsappService.sendMessage(user.phone_number, successMessage);
      
      // Clear waiting state
      await this.userService.updateUserSession(user.id, 'main_menu');
      
    } catch (error) {
      console.error('Error processing alert location:', error);
      await this.handleError(user.phone_number, error);
    }
  }

  // Handle turning off alerts - simplified approach
  async handleTurnOffAlerts(user) {
    try {
      console.log('🔕 User requesting to turn off disease outbreak alerts:', user.phone_number);
      
      // Get user from database
      const User = require('../models/User');
      const dbUser = await User.findByPhoneNumber(user.phone_number);
      
      if (!dbUser || !dbUser.consent_outbreak_alerts) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          '❌ You are not currently subscribed to disease outbreak alerts.\n\nWould you like to enable disease outbreak alerts to stay informed about health emergencies?'
        );
        
        const buttons = [
          { id: 'turn_on_alerts', title: '🔔 Enable Alerts' },
          { id: 'back_to_menu', title: '↩️ Back to Menu' }
        ];
        
        await this.whatsappService.sendInteractiveButtons(
          user.phone_number,
          'Choose an option:',
          buttons
        );
        return;
      }

      // Disable disease outbreak alerts and delete alert preferences
      await dbUser.disableDiseaseAlerts();
      
      // Also delete any related alert preferences/data from other tables
      try {
        const { supabase } = require('../config/database');
        
        // Delete user's location preferences for alerts from user_alert_preferences table
        await supabase
          .from('user_alert_preferences')
          .delete()
          .eq('phone_number', user.phone_number);
          
        console.log(`🗑️ Deleted all alert preferences for user: ${user.phone_number}`);
      } catch (deleteError) {
        console.error('⚠️ Error deleting alert preferences (non-critical):', deleteError);
        // Continue with the flow even if deletion fails
      }

      const successMessages = {
        en: `🔕 *Disease Outbreak Alerts Disabled*\n\n✅ You have successfully unsubscribed from disease outbreak alerts.\n\n🗑️ **All your alert preferences have been deleted:**\n• Subscription status removed\n• Location preferences cleared\n• Alert history cleaned\n\n❌ **You will no longer receive:**\n• Daily national outbreak updates\n• Emergency outbreak notifications\n• Real-time health advisories\n\n💡 You can re-enable alerts anytime by visiting the Disease Alerts menu.\n\n📞 Emergency: 108`,
        hi: `🔕 *रोग प्रकोप अलर्ट अक्षम*\n\n✅ आपने सफलतापूर्वक रोग प्रकोप अलर्ट की सदस्यता रद्द कर दी है।\n\n🗑️ **आपकी सभी अलर्ट प्राथमिकताएं हटा दी गई हैं:**\n• सदस्यता स्थिति हटाई गई\n• स्थान प्राथमिकताएं साफ की गईं\n• अलर्ट इतिहास साफ किया गया\n\n❌ **आपको अब नहीं मिलेगा:**\n• दैनिक राष्ट्रीय प्रकोप अपडेट\n• आपातकालीन प्रकोप सूचनाएं\n• रियल-टाइम स्वास्थ्य सलाह\n\n💡 आप रोग अलर्ट मेनू पर जाकर कभी भी अलर्ट फिर से सक्षम कर सकते हैं।\n\n📞 आपातकाल: 108`
      };

      await this.whatsappService.sendMessage(
        user.phone_number,
        successMessages[user.preferred_language] || successMessages.en
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
  async getCurrentDiseaseOutbreaks(userLocation = null) {
    const diseases = [];
    
    // Get REAL current disease data instead of hardcoded diseases
    try {
      const OutbreakAlert = require('../models/OutbreakAlert');
      
      // Get real current national alerts
      const todaysNational = await OutbreakAlert.getTodaysNationalAlert();
      
      if (todaysNational && todaysNational.parsed_diseases?.additionalDiseases) {
        console.log('📊 Using REAL current disease data for getCurrentDiseaseOutbreaks');
        
        todaysNational.parsed_diseases.additionalDiseases.forEach(diseaseInfo => {
          const disease = diseaseInfo.name || diseaseInfo.disease || 'Health Alert';
          const location = diseaseInfo.location || 'Various locations';
          const cases = diseaseInfo.cases || 'Cases reported';
          const symptoms = diseaseInfo.symptoms || 'Consult healthcare provider for symptoms';
          const prevention = diseaseInfo.prevention || 'Follow health department guidelines';
          
          // Determine risk level based on disease type
          let risk = 'MEDIUM';
          const diseaseKey = disease.toLowerCase();
          if (diseaseKey.includes('brain-eating') || diseaseKey.includes('naegleria') || diseaseKey.includes('meningoencephalitis') || diseaseKey.includes('nipah')) {
            risk = 'CRITICAL';
          } else if (diseaseKey.includes('h5n1') || diseaseKey.includes('h1n1') || diseaseKey.includes('melioidosis')) {
            risk = 'HIGH';
          } else if (diseaseKey.includes('dengue') || diseaseKey.includes('malaria') || diseaseKey.includes('chikungunya')) {
            risk = 'HIGH';
          }
          
          diseases.push({
            name: disease,
            risk: risk,
            message: `🦠 *${disease} - Current Outbreak*\n\n• Location: ${location}\n• Cases: ${cases}\n• Symptoms: ${symptoms}\n• Prevention: ${prevention}\n• Emergency: Call 108 for medical assistance`
          });
        });
      }
      
      // Get user's state-specific data if available
      if (userLocation?.state) {
        const stateAlert = await OutbreakAlert.getStateAlert(userLocation.state);
        if (stateAlert && stateAlert.parsed_diseases?.additionalDiseases) {
          console.log(`📍 Adding ${userLocation.state} specific disease data`);
          
          stateAlert.parsed_diseases.additionalDiseases.forEach(diseaseInfo => {
            const disease = diseaseInfo.name || diseaseInfo.disease || 'Health Alert';
            const cases = diseaseInfo.cases || 'Cases reported';
            
            diseases.push({
              name: `${disease} (${userLocation.state})`,
              risk: 'HIGH',
              message: `🏛️ *${disease} Alert in ${userLocation.state}*\n\n• State-specific outbreak monitoring\n• Cases: ${cases}\n• Local health authorities are monitoring the situation\n• Follow state health department guidelines\n• Emergency: Call 108 for medical assistance`
            });
          });
        }
      }
      
    } catch (error) {
      console.error('Error fetching real disease data:', error);
      
      // Only use fallback if real data fetch fails
      diseases.push({
        name: 'Health Monitoring',
        risk: 'MEDIUM',
        message: `🏥 *Health Monitoring Active*\n\n• Disease surveillance systems are operational\n• Health authorities monitoring for outbreaks\n• Report any unusual symptoms to healthcare providers\n• Emergency: Call 108 for medical assistance\n• Stay updated with official health advisories`
      });
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

  // Generate disease-specific prevention recommendations
  generateDiseaseSpecificPrevention(diseases, language, scriptPreference, isSubscribed = false) {
    if (!diseases || diseases.length === 0) {
      return LanguageUtils.getText('disease_prevention_summary', language, 'en', scriptPreference);
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
      ta: '🛡️ **தற்போதைய வெடிப்புகளுக்கான குறிப்பிட்ட தடுப்பு:**',
      or: '🛡️ **ବର୍ତ୍ତମାନ ପ୍ରକୋପ ପାଇଁ ବିଶେଷ ନିବାରଣ:**'
    };

    const footerText = isSubscribed ? {
      en: '\n✅ **You are receiving disease outbreak alerts.** Stay safe!',
      hi: '\n✅ **आप रोग प्रकोप अलर्ट प्राप्त कर रहे हैं।** सुरक्षित रहें!',
      te: '\n✅ **మీరు వ్యాధి వ్యాప్తి హెచ్చరికలను పొందుతున్నారు।** సురక్షితంగా ఉండండి!',
      ta: '\n✅ **நீங்கள் நோய் வெடிப்பு எச்சரிக்கைகளைப் பெற்றுவருகிறீர்கள்.** பாதுகாப்பாக இருங்கள்!',
      or: '\n✅ **ଆପଣ ରୋଗ ପ୍ରକୋପ ଚେତାବନୀ ପାଇଛନ୍ତି।** ସୁରକ୍ଷିତ ରୁହନ୍ତୁ!'
    } : {
      en: '\n📍 **Want location-specific alerts?** Register below:',
      hi: '\n📍 **स्थान-विशिष्ट अलर्ट चाहते हैं?** नीचे पंजीकरण करें:',
      te: '\n📍 **స్థాన-ప్రత్యేక హెచ్చరికలు కావాలా?** క్రింద నమోదు చేసుకోండి:',
      ta: '\n📍 **இடம் சார்ந்த எச்சரிக்கைகள் வேண்டுமா?** கீழே பதிவு செய்யுங்கள்:',
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

  // Ask user to type their state name (no lists)
  async showStateSelectionMenu(user, cacheService) {
    try {
      console.log(`📝 Asking user ${user.phone_number} to type their state name`);
      
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

      // Ask user to type their state name directly
      const inputText = {
        en: '📝 *Please type your state name:*\n\nExamples:\n• Andhra Pradesh\n• Maharashtra\n• Karnataka\n• Delhi\n• Tamil Nadu\n\n_Type the full state name for accurate results._',
        hi: '📝 *कृपया अपने राज्य का नाम टाइप करें:*\n\nउदाहरण:\n• आंध्र प्रदेश\n• महाराष्ट्र\n• कर्नाटक\n• दिल्ली\n• तमिल नाडु\n\n_सटीक परिणामों के लिए पूरा राज्य नाम टाइप करें।_',
        te: '📝 *దయచేసి మీ రాష్ట్ర పేరును టైప్ చేయండి:*\n\nఉదాహరణలు:\n• ఆంధ్ర ప్రదేశ్\n• మహారాష్ట్ర\n• కర్ణాటక\n• ఢిల్లీ\n• తమిళ్ నాడు\n\n_ఖచ్చితమైన ఫలితాల కోసం పూర్తి రాష్ట్ర పేరు టైప్ చేయండి।_',
        ta: '📝 *உங்கள் மாநில பெயரைத் தட்டச்சு செய்யுங்கள்:*\n\nउदाहरण:\n• ஆந்திர பிரதேசம்\n• மகாராஷ்டிரா\n• கர்நாடகா\n• டெல்லி\n• தமிழ்நாடு\n\n_துல்லியமான முடிவுகளுக்கு முழு மாநில பெயரைத் தட்டச்சு செய்யுங்கள்।_',
        or: '📝 *ଦୟାକରି ଆପଣଙ୍କ ରାଜ୍ୟର ନାମ ଟାଇପ୍ କରନ୍ତୁ:*\n\nଉଦାହରଣ:\n• ଆନ୍ଧ୍ର ପ୍ରଦେଶ\n• ମହାରାଷ୍ଟ୍ର\n• କର୍ଣ୍ଣାଟକ\n• ଦିଲ୍ଲୀ\n• ତାମିଲନାଡୁ\n\n_ସଠିକ ଫଳାଫଳ ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ରାଜ୍ୟ ନାମ ଟାଇପ୍ କରନ୍ତୁ।_'
      };

      await this.whatsappService.sendMessage(
        user.phone_number,
        inputText[user.preferred_language] || inputText.en
      );

      // Update session to wait for state name input
      await this.userService.updateUserSession(user.id, 'selecting_state', {
        waitingForStateInput: true
      });

    } catch (error) {
      console.error('Error asking for state input:', error);
      
      // Simple fallback
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
      
      // Get all states for searching
      const allStates = await cacheService.getIndianStates();
      
      // Clean and normalize the input
      const cleanStateName = stateName.trim().toLowerCase();
      
      // Try exact match first
      let exactMatch = allStates.find(state => 
        state.state_name.toLowerCase() === cleanStateName
      );
      
      if (exactMatch) {
        console.log(`✅ Exact match found: ${exactMatch.state_name}`);
        await this.handleStateSelection(user, `state_${exactMatch.id}`);
        return;
      }
      
      // Try partial matches
      const partialMatches = allStates.filter(state => 
        state.state_name.toLowerCase().includes(cleanStateName) ||
        cleanStateName.includes(state.state_name.toLowerCase())
      );
      
      if (partialMatches.length === 1) {
        console.log(`✅ Single partial match found: ${partialMatches[0].state_name}`);
        await this.handleStateSelection(user, `state_${partialMatches[0].id}`);
        return;
      }
      
      if (partialMatches.length > 1) {
        // Multiple matches found, ask user to clarify
        const suggestions = partialMatches.slice(0, 5);
        let suggestionText = `🔍 *Multiple states match "${stateName}". Please type the exact name:*\n\n`;
        
        suggestions.forEach((state, index) => {
          suggestionText += `${index + 1}. ${state.state_name}\n`;
        });
        
        suggestionText += `\n_Please type the full name exactly as shown above._`;
        
        await this.whatsappService.sendMessage(user.phone_number, suggestionText);
        return;
      }
      
      // No matches found, provide helpful suggestions
      const similarStates = allStates.filter(state => {
        const stateLower = state.state_name.toLowerCase();
        const inputLower = cleanStateName;
        
        // Check if any word in the input matches any word in the state name
        const inputWords = inputLower.split(' ');
        const stateWords = stateLower.split(' ');
        
        return inputWords.some(inputWord => 
          stateWords.some(stateWord => 
            stateWord.includes(inputWord) || inputWord.includes(stateWord)
          )
        );
      }).slice(0, 5);
      
      if (similarStates.length > 0) {
        let suggestionText = `❌ *"${stateName}" not found.* Did you mean:\n\n`;
        
        similarStates.forEach((state, index) => {
          suggestionText += `${index + 1}. ${state.state_name}\n`;
        });
        
        suggestionText += `\n_Please type the full name exactly as shown above._`;
        
        await this.whatsappService.sendMessage(user.phone_number, suggestionText);
      } else {
        // No similar states found, show popular states
        const popularStates = ['Andhra Pradesh', 'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu'];
        let helpText = `❌ *"${stateName}" not found.*\n\n📝 *Popular states:*\n\n`;
        
        popularStates.forEach((state, index) => {
          helpText += `${index + 1}. ${state}\n`;
        });
        
        helpText += `\n_Please type the full state name correctly._`;
        
        await this.whatsappService.sendMessage(user.phone_number, helpText);
      }
      
    } catch (error) {
      console.error('Error handling state name input:', error);
      
      const errorText = {
        en: '❌ Sorry, there was an error processing your state name. Please try again.',
        hi: '❌ क्षमा करें, आपके राज्य के नाम को प्रोसेस करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
        te: '❌ క్షమించండి, మీ రాష్ట్ర పేరును ప్రాసెస్ చేయడంలో లోపం ఉంది। దయచేసి మళ్లీ ప్రయత్నించండి।',
        ta: '❌ மன்னிக்கவும், உங்கள் மாநில பெயரைச் செயலாக்குவதில் பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
        or: '❌ କ୍ଷମା କରନ୍ତୁ, ଆପଣଙ୍କ ରାଜ୍ୟ ନାମ ପ୍ରକ୍ରିୟାକରଣରେ ତ୍ରୁଟି ହୋଇଛି। ଦୟାକରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।'
      };
      
      await this.whatsappService.sendMessage(
        user.phone_number,
        errorText[user.preferred_language] || errorText.en
      );
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

// Disease Alerts Handler Function
async function handleDiseaseAlerts(phoneNumber, userMessage, language, scriptPreference, res) {
  try {
    console.log(`🦠 Processing disease alerts request from ${phoneNumber}`);

    // Handle unsubscribe/subscribe commands
    if (userMessage.toLowerCase().includes('stop alerts')) {
      await broadcastService.handleUnsubscribe(phoneNumber);
      return res.json({ success: true });
    }

    if (userMessage.toLowerCase().includes('start alerts')) {
      await broadcastService.handleResubscribe(phoneNumber);
      return res.json({ success: true });
    }

    // Handle button interactions
    if (userMessage === 'view_active_diseases') {
      return await handleViewActiveDiseases(phoneNumber, language, res);
    }

    if (userMessage === 'turn_on_alerts') {
      await broadcastService.handleResubscribe(phoneNumber);
      return res.json({ success: true });
    }

    if (userMessage === 'turn_off_alerts') {
      await broadcastService.handleUnsubscribe(phoneNumber);
      return res.json({ success: true });
    }

    // Handle state-specific requests
    const statePattern = /(outbreak|disease|alert).*(in|for)\s+([a-zA-Z\s]+)/i;
    const stateMatch = userMessage.match(statePattern);
    
    if (stateMatch) {
      const stateName = stateMatch[3].trim();
      return await handleStateSpecificOutbreak(phoneNumber, stateName, language, res);
    }

    // Default: Show disease alerts menu
    return await showDiseaseAlertsMenu(phoneNumber, language, res);

  } catch (error) {
    console.error('❌ Error in handleDiseaseAlerts:', error);
    
    const errorMessages = {
      en: "⚠️ Sorry, there was an error accessing disease alerts. Please try again later.",
      hi: "⚠️ क्षमा करें, रोग अलर्ट एक्सेस करने में त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।"
    };

    await sendMessage(phoneNumber, errorMessages[language] || errorMessages.en);
    return res.json({ success: false, error: 'Disease alerts error' });
  }
}

// Show disease alerts menu
async function showDiseaseAlertsMenu(phoneNumber, language, res) {
  try {
    // Check user's current alert subscription status
    const User = require('../models/User');
    const WhatsAppService = require('../services/whatsappService');
    const whatsappService = new WhatsAppService();
    
    const user = await User.findByPhoneNumber(phoneNumber);
    const isSubscribed = user && user.consent_outbreak_alerts;
    
    console.log(`🔍 User ${phoneNumber} subscription status: ${isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}`);
    
    const menuTexts = {
      en: `🦠 *Disease Outbreak Alerts*

Stay informed about disease outbreaks in your area:

*📅 Daily National Alerts:* Sent every day at 10:00 AM
*🏛️ State-Specific Alerts:* Personalized for your location
*🚨 Emergency Alerts:* Critical outbreak notifications

${isSubscribed ? '✅ You are currently subscribed to alerts' : '❌ You are not subscribed to alerts'}

Choose an option below:`,
      hi: `🦠 *रोग प्रकोप अलर्ट*

अपने क्षेत्र में रोग प्रकोप के बारे में सूचित रहें:

*📅 दैनिक राष्ट्रीय अलर्ट:* प्रतिदिन सुबह 10:00 बजे भेजे जाते हैं
*🏛️ राज्य-विशिष्ट अलर्ट:* आपके स्थान के लिए व्यक्तिगत
*🚨 आपातकालीन अलर्ट:* महत्वपूर्ण प्रकोप सूचनाएं

${isSubscribed ? '✅ आप वर्तमान में अलर्ट की सदस्यता लिए हुए हैं' : '❌ आप अलर्ट की सदस्यता नहीं लिए हुए हैं'}

नीचे एक विकल्प चुनें:`
    };

    // Show different buttons based on subscription status
    const buttons = [
      { id: 'view_active_diseases', title: '🦠 View Outbreaks' }
    ];

    if (isSubscribed) {
      buttons.push({ id: 'turn_off_alerts', title: '🔕 Disable Alerts' });
      console.log('📱 Showing DISABLE button for subscribed user');
    } else {
      buttons.push({ id: 'turn_on_alerts', title: '🔔 Enable Alerts' });
      console.log('📱 Showing ENABLE button for non-subscribed user');
    }

    await whatsappService.sendInteractiveButtons(
      phoneNumber,
      menuTexts[language] || menuTexts.en,
      buttons
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Error in showDiseaseAlertsMenu:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Handle viewing active diseases
async function handleViewActiveDiseases(phoneNumber, language, res) {
  try {
    console.log(`🔍 Fetching active diseases for ${phoneNumber}`);

    // Get today's national alert
    const nationalAlert = await outbreakService.getTodaysNationalAlert();
    
    if (nationalAlert) {
      const formattedAlert = nationalAlert.getFormattedAlert(language);
      await sendMessage(phoneNumber, formattedAlert);
    } else {
      // Trigger manual fetch if no alert exists
      const newAlert = await outbreakService.triggerManualNationalFetch();
      
      if (newAlert) {
        const formattedAlert = newAlert.getFormattedAlert(language);
        await sendMessage(phoneNumber, formattedAlert);
      } else {
        const noAlertsMessages = {
          en: `✅ *No Active Disease Outbreaks*

_Good news! There are currently no major disease outbreaks reported in India._

*🛡️ Stay Protected:*
• Maintain good hygiene
• Drink clean water
• Eat fresh, cooked food
• Get regular health checkups

*📞 Emergency:* 108
*🕐 Next Update:* Tomorrow at 10:00 AM`,
          hi: `✅ *कोई सक्रिय रोग प्रकोप नहीं*

_अच्छी खबर! वर्तमान में भारत में कोई बड़ा रोग प्रकोप रिपोर्ट नहीं किया गया है।_

*🛡️ सुरक्षित रहें:*
• अच्छी स्वच्छता बनाए रखें
• साफ पानी पिएं
• ताजा, पका हुआ भोजन खाएं
• नियमित स्वास्थ्य जांच कराएं

*📞 आपातकाल:* 108
*🕐 अगला अपडेट:* कल सुबह 10:00 बजे`
        };

        await sendMessage(phoneNumber, noAlertsMessages[language] || noAlertsMessages.en);
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in handleViewActiveDiseases:', error);
    
    const errorMessages = {
      en: "⚠️ Unable to fetch disease outbreak information. Please try again later.",
      hi: "⚠️ रोग प्रकोप की जानकारी प्राप्त करने में असमर्थ। कृपया बाद में पुनः प्रयास करें।"
    };

    await sendMessage(phoneNumber, errorMessages[language] || errorMessages.en);
    return res.json({ success: false });
  }
}

// Handle state-specific outbreak requests
async function handleStateSpecificOutbreak(phoneNumber, stateName, language, res) {
  try {
    console.log(`🏛️ Fetching state outbreak for ${stateName}`);

    const stateAlert = await outbreakService.getStateOutbreak(stateName);
    
    if (stateAlert) {
      const formattedAlert = stateAlert.getFormattedAlert(language);
      await broadcastService.sendStateAlertToUser(phoneNumber, stateAlert, language);
    } else {
      const noStateAlertsMessages = {
        en: `✅ *No Active Outbreaks in ${stateName}*

_Currently no major disease outbreaks reported in ${stateName} state._

*🛡️ General Prevention Tips:*
• Follow seasonal health guidelines
• Maintain personal hygiene
• Stay hydrated and eat healthy
• Monitor local health advisories

*📞 State Health Helpline:* Contact your local health department
*🕐 Last Checked:* ${new Date().toLocaleDateString()}`,
        hi: `✅ *${stateName} में कोई सक्रिय प्रकोप नहीं*

_वर्तमान में ${stateName} राज्य में कोई बड़ा रोग प्रकोप रिपोर्ट नहीं किया गया है।_

*🛡️ सामान्य बचाव के तरीके:*
• मौसमी स्वास्थ्य दिशानिर्देशों का पालन करें
• व्यक्तिगत स्वच्छता बनाए रखें
• हाइड्रेटेड रहें और स्वस्थ भोजन करें
• स्थानीय स्वास्थ्य सलाह पर नजर रखें

*📞 राज्य स्वास्थ्य हेल्पलाइन:* अपने स्थानीय स्वास्थ्य विभाग से संपर्क करें
*🕐 अंतिम जांच:* ${new Date().toLocaleDateString()}`
      };

      await sendMessage(phoneNumber, noStateAlertsMessages[language] || noStateAlertsMessages.en);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(`❌ Error in handleStateSpecificOutbreak for ${stateName}:`, error);
    
    const errorMessages = {
      en: `⚠️ Unable to fetch outbreak information for ${stateName}. Please try again later.`,
      hi: `⚠️ ${stateName} के लिए प्रकोप की जानकारी प्राप्त करने में असमर्थ। कृपया बाद में पुनः प्रयास करें।`
    };

    await sendMessage(phoneNumber, errorMessages[language] || errorMessages.en);
    return res.json({ success: false });
  }
}

module.exports = MessageController;