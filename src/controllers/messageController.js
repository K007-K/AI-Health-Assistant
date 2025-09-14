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
      console.log(`🎯 Intent Detection: "${content}" → ${intent} (state: ${currentState})`);

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
      console.log('🌍 Language selection received:', selection);
      
      let language = '';
      
      // Handle button IDs and text selections
      if (selection.startsWith('lang_')) {
        language = LanguageUtils.getLanguageFromButtonId(selection);
      } else {
        // Handle text-based selections with numbers or language names
        const lowerSelection = selection.toLowerCase();
        if (selection.includes('1️⃣') || lowerSelection.includes('english') || selection === '1') {
          language = 'en';
        } else if (selection.includes('2️⃣') || lowerSelection.includes('hindi') || lowerSelection.includes('हिंदी') || selection === '2') {
          language = 'hi';
        } else if (selection.includes('3️⃣') || lowerSelection.includes('telugu') || lowerSelection.includes('తెలుగు') || selection === '3') {
          language = 'te';
        } else if (selection.includes('4️⃣') || lowerSelection.includes('tamil') || lowerSelection.includes('தமிழ்') || selection === '4') {
          language = 'ta';
        } else if (selection.includes('5️⃣') || lowerSelection.includes('odia') || lowerSelection.includes('ଓଡ଼ିଆ') || selection === '5') {
          language = 'or';
        }
      }
      
      if (!language || !LanguageUtils.isValidLanguage(language)) {
        await this.whatsappService.sendMessage(
          user.phone_number,
          'Please select a valid language option from the menu.'
        );
        return;
      }

      // Update user language preference
      await this.userService.updateUserPreferences(user.id, {
        preferred_language: language
      });

      // Send confirmation message in selected language
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
      
      const changeLanguageText = '🌐 Please choose your language:';
      const languageButtons = [
        { id: 'lang_en', title: '1️⃣ English' },
        { id: 'lang_hi', title: '2️⃣ हिंदी (Hindi)' },
        { id: 'lang_te', title: '3️⃣ తెలుగు (Telugu)' },
        { id: 'lang_ta', title: '4️⃣ தமிழ் (Tamil)' },
        { id: 'lang_or', title: '5️⃣ ଓଡ଼ିଆ (Odia)' }
      ];

      // Note: WhatsApp only allows 3 buttons max, so we'll use the first 3 and handle others via text
      const firstThreeButtons = languageButtons.slice(0, 3);
      
      await this.whatsappService.sendInteractiveButtons(
        user.phone_number,
        changeLanguageText + '\n\n' + 
        languageButtons.map(btn => btn.title).join('\n') + 
        '\n\nChoose an option.',
        firstThreeButtons
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
        '🌐 Please choose your language:\n1️⃣ English\n2️⃣ हिंदी (Hindi)\n3️⃣ తెలుగు (Telugu)\n4️⃣ தமிழ் (Tamil)\n5️⃣ ଓଡ଼ିଆ (Odia)\n\nChoose an option.'
      );
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
      const buttons = [
        { id: 'script_native', title: '1️⃣ Native script' },
        { id: 'script_trans', title: '2️⃣ English letters' }
      ];

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
          user.accessibility_mode
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
        const analysis = await this.geminiService.analyzeSymptoms(message, userProfile, mediaData);
        
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
      const sessionData = userSession?.session_data || {};
      
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
        const diseaseInfo = await this.geminiService.getPreventiveTips('disease prevention', userProfile, diseaseName);
        
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