const axios = require('axios');
const config = require('../config/environment');
const { LanguageUtils } = require('../utils/languageUtils');

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
      // For Meta-style feedback buttons (empty text), use minimal text
      const buttonText = text || '.';
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: buttonText },
          action: {
            buttons: buttons.map((button, index) => {
              // Handle different button formats
              if (button.type === 'reply' && button.reply) {
                return {
                  type: 'reply',
                  reply: {
                    id: button.reply.id || `btn_${index}`,
                    title: (button.reply.title || '').substring(0, 20) // WhatsApp limit
                  }
                };
              } else {
                return {
                  type: 'reply',
                  reply: {
                    id: button.id || `btn_${index}`,
                    title: (button.title || '').substring(0, 20) // WhatsApp limit
                  }
                };
              }
            })
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

  // Send interactive list message (simplified interface)
  async sendInteractiveList(to, text, buttonText, items) {
    try {
      console.log(`📱 Sending interactive list with ${items.length} items...`);
      
      // Convert items to WhatsApp list format
      const sections = [{
        title: 'Options',
        rows: items.map(item => ({
          id: item.id,
          title: item.title.length > 24 ? item.title.substring(0, 21) + '...' : item.title,
          description: item.description || ''
        }))
      }];
      
      // Use the existing sendList method
      return await this.sendList(to, text, sections, buttonText);
      
    } catch (error) {
      console.error('❌ Error in sendInteractiveList:', error.message);
      throw error;
    }
  }

  // Send list message (for menu options)
  async sendList(to, text, sections, buttonText = 'Choose Option') {
    try {
      console.log('📱 Attempting to send interactive list message...');
      
      // Validate sections structure
      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        throw new Error('Invalid sections provided for list message');
      }
      
      // Validate and truncate titles if needed (WhatsApp limit: 24 chars)
      const validatedSections = sections.map(section => ({
        title: section.title || 'Options',
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title.length > 24 ? row.title.substring(0, 21) + '...' : row.title,
          description: row.description && row.description.length > 72 ? row.description.substring(0, 69) + '...' : row.description
        }))
      }));

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: text },
          action: {
            button: buttonText,
            sections: validatedSections
          }
        }
      };
      
      console.log('📱 List payload:', JSON.stringify(payload, null, 2));

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
      
      console.log('✅ Interactive list sent successfully!');
      return response.data;
    } catch (error) {
      console.error('❌ Error sending list message:', error.response?.data || error.message);
      console.error('❌ Full error details:', error.response?.data?.error || error.message);
      
      // Check if it's a specific WhatsApp API error
      if (error.response?.data?.error?.code) {
        console.error(`🚨 WhatsApp API Error Code: ${error.response.data.error.code}`);
        console.error(`🚨 WhatsApp API Error Message: ${error.response.data.error.message}`);
      }
      
      // Check if it's a credentials/permission issue vs API limitation
      const isCredentialError = error.response?.status === 401 || 
                               error.response?.data?.error?.code === 190 ||
                               error.response?.data?.error?.type === 'OAuthException';
      
      const isInteractiveNotSupported = error.response?.data?.error?.code === 131051 ||
                                       error.response?.data?.error?.message?.includes('Interactive messages are not supported');
      
      if (isCredentialError) {
        console.log('🔑 Credential Error: Cannot send interactive messages without valid WhatsApp API credentials');
        console.log('📝 In production, ensure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are configured');
        throw error; // Don't fallback for credential errors
      }
      
      if (isInteractiveNotSupported) {
        console.log('📱 Interactive Lists Not Supported: Falling back to buttons');
        try {
          const buttons = sections[0]?.rows?.slice(0, 3).map(row => ({
            type: 'reply',
            reply: {
              id: row.id,
              title: row.title.length > 20 ? row.title.substring(0, 17) + '...' : row.title
            }
          })) || [];
          
          if (buttons.length > 0) {
            return await this.sendInteractiveButtons(to, text, buttons);
          }
        } catch (buttonError) {
          console.error('❌ Interactive buttons also failed:', buttonError);
        }
      }
      
      // Final fallback to simple text message
      try {
        console.log('📱 Final Fallback: Sending simple text message');
        const optionsList = sections[0]?.rows?.map((row, index) => `${index + 1}. ${row.title}`).join('\n') || 'Please type "menu" for options';
        const fallbackText = `${text}\n\nOptions:\n${optionsList}`;
        return await this.sendMessage(to, fallbackText);
      } catch (fallbackError) {
        console.error('All fallback methods failed:', fallbackError);
        throw error;
      }
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

  // Get language selection as list (supports 5+ options)
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

  // Get main menu as list (supports 6 options)
  getMainMenuList(language = 'en', scriptType = 'native') {
    const mainMenuText = LanguageUtils.getText('main_menu', language);
    
    // Determine the correct language key based on script type
    const languageKey = scriptType === 'transliteration' ? `${language}_trans` : language;
    
    const menus = {
      en: {
        sections: [{
          title: `📋 ${mainMenuText}`,
          rows: [
            { id: 'chat_ai', title: '🤖 Chat with AI', description: 'Ask health questions & get guidance' },
            { id: 'symptom_check', title: '🩺 Check Symptoms', description: 'Analyze symptoms & get recommendations' },
            { id: 'preventive_tips', title: '🌱 Health Tips', description: 'Learn about diseases, nutrition & lifestyle' },
            { id: 'disease_alerts', title: '🦠 Disease Outbreak Alerts', description: 'View active diseases & manage alerts' },
            { id: 'appointments', title: '📅 My Appointments (Planned)', description: 'Book, view & track hospital visits' },
            { id: 'telemedicine', title: '🩻 Telemedicine (eSanjeevani) (Planned)', description: 'Connect to doctors for remote consultations' },
            { id: 'health_records', title: '📂 Digital Health Records (ABHA ID) (Planned)', description: 'Portable & migrant-friendly health records' },
            { id: 'pharmacy', title: '💊 Pharmacy Integration (Planned)', description: 'Real-time pharmacy stock & subsidy alerts' },
            { id: 'community_health', title: '📊 Community Health Pulse (Planned)', description: 'Track health trends in your district' },
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
            { id: 'appointments', title: '📅 मेरी अपॉइंटमेंट (नियोजित)', description: 'अस्पताल की यात्राओं को बुक, देखें और ट्रैक करें' },
            { id: 'telemedicine', title: '🩻 टेलीमेडिसिन (eSanjeevani) (नियोजित)', description: 'रिमोट परामर्श के लिए डॉक्टरों से जुड़ें' },
            { id: 'health_records', title: '📂 डिजिटल स्वास्थ्य रिकॉर्ड (ABHA ID) (नियोजित)', description: 'पोर्टेबल और प्रवासी-अनुकूल स्वास्थ्य रिकॉर्ड' },
            { id: 'pharmacy', title: '💊 फार्मेसी एकीकरण (नियोजित)', description: 'रियल-टाइम फार्मेसी स्टॉक और सब्सिडी अलर्ट' },
            { id: 'community_health', title: '📊 सामुदायिक स्वास्थ्य पल्स (नियोजित)', description: 'अपने जिले में स्वास्थ्य रुझानों को ट्रैक करें' },
            { id: 'change_language', title: '🌐 भाषा बदलें', description: 'अलग भाषा में बदलें' }
          ]
        }]
      },
      te: {
        sections: [{
          title: "📋 ప్రధాన మెనూ",
          rows: [
            { id: 'chat_ai', title: '🤖 AI తో చాట్ చేయండి', description: 'ఆరోగ్య ప్రశ్నలు అడిగి మార్గదర్శనం పొందండి' },
            { id: 'symptom_check', title: '🩺 లక్షణాలు తనిఖీ చేయండి', description: 'లక్షణాలను విశ్లేషించి సిఫార్సులు పొందండి' },
            { id: 'preventive_tips', title: '🌱 ఆరోగ్య చిట్కాలు', description: 'వ్యాధులు, పోషణ & జీవనశైలి గురించి తెలుసుకోండి' },
            { id: 'disease_alerts', title: '🦠 వ్యాధి వ్యాప్తి హెచ్చరికలు', description: 'చురుకైన వ్యాధులను చూడండి & హెచ్చరికలను నిర్వహించండి' },
            { id: 'appointments', title: '📅 నా అపాయింట్‌మెంట్‌లు (ప్రణాళిక)', description: 'ఆసుపత్రి సందర్శనలను బుక్ చేయండి, చూడండి & ట్రాక్ చేయండి' },
            { id: 'telemedicine', title: '🩻 టెలిమెడిసిన్ (eSanjeevani) (ప్రణాళిక)', description: 'రిమోట్ కన్సల్టేషన్‌ల కోసం వైద్యులతో కనెక్ట్ అవ్వండి' },
            { id: 'health_records', title: '📂 డిజిటల్ హెల్త్ రికార్డ్స్ (ABHA ID) (ప్రణాళిక)', description: 'పోర్టబుల్ & మైగ్రెంట్-ఫ్రెండ్లీ హెల్త్ రికార్డ్స్' },
            { id: 'pharmacy', title: '💊 ఫార్మసీ ఇంటిగ్రేషన్ (ప్రణాళిక)', description: 'రియల్-టైమ్ ఫార్మసీ స్టాక్ & సబ్సిడీ అలర్ట్‌లు' },
            { id: 'community_health', title: '📊 కమ్యూనిటీ హెల్త్ పల్స్ (ప్రణాళిక)', description: 'మీ జిల్లాలో హెల్త్ ట్రెండ్‌లను ట్రాక్ చేయండి' },
            { id: 'change_language', title: '🌐 భాష మార్చండి', description: 'వేరే భాషకు మార్చండి' }
          ]
        }]
      },
      ta: {
        sections: [{
          title: "📋 முதன்மை மெனு",
          rows: [
            { id: 'chat_ai', title: '🤖 AI உடன் அரட்டை', description: 'சுகாதார கேள்விகள் கேட்டு வழிகாட்டுதல் பெறுங்கள்' },
            { id: 'symptom_check', title: '🩺 அறிகுறி சரிபார்', description: 'அறிகுறிகளை பகுப்பாய்வு செய்து பரிந்துரைகளை பெறுங்கள்' },
            { id: 'preventive_tips', title: '🌱 ஆரோக்கிய குறிப்புகள்', description: 'நோய்கள், ஊட்டச்சத்து & வாழ்க்கை முறை பற்றி அறியுங்கள்' },
            { id: 'disease_alerts', title: '🦠 நோய் விரிவு எச்சரிக்கைகள்', description: 'தற்போதைய நோய்களை பார்க்கவும் & எச்சரிக்கைகளை நிர்வகிக்கவும்' },
            { id: 'appointments', title: '📅 எனது சந்திப்புகள் (திட்டமிடப்பட்டது)', description: 'மருத்துவமனை வருகைகளை பதிவு செய்யுங்கள், பார்க்கவும் & கண்காணிக்கவும்' },
            { id: 'telemedicine', title: '🩻 தொலைமருத்துவம் (eSanjeevani) (திட்டமிடப்பட்டது)', description: 'தொலைநிலை ஆலோசனைகளுக்கு மருத்துவர்களுடன் இணைக்கவும்' },
            { id: 'health_records', title: '📂 டிஜிட்டல் சுகாதார பதிவுகள் (ABHA ID) (திட்டமிடப்பட்டது)', description: 'போர்ட்டபிள் & புலம்பெயர்ந்தோர்-நட்பு சுகாதார பதிவுகள்' },
            { id: 'pharmacy', title: '💊 மருந்தகம் ஒருங்கிணைப்பு (திட்டமிடப்பட்டது)', description: 'நிகழ்நேர மருந்தகம் இருப்பு & மானியம் எச்சரிக்கைகள்' },
            { id: 'community_health', title: '📊 சமூக சுகாதார துடிப்பு (திட்டமிடப்பட்டது)', description: 'உங்கள் மாவட்டத்தில் சுகாதார போக்குகளை கண்காணிக்கவும்' },
            { id: 'change_language', title: '🌐 மொழி மாற்று', description: 'வேறு மொழிக்கு மாற்றவும்' }
          ]
        }]
      },
      or: {
        sections: [{
          title: "📋 ମୁଖ୍ଯ ମେନୁ",
          rows: [
            { id: 'chat_ai', title: '🤖 AI ସହିତ କଥାବାର୍ତ୍ତା', description: 'ସ୍ୱାସ୍ଥ୍ଯ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ ଏବଂ ମାର୍ଗଦର୍ଶନ ପାଆନ୍ତୁ' },
            { id: 'symptom_check', title: '🩺 ଲକ୍ଷଣ ଯାଞ୍ଚ କରନ୍ତୁ', description: 'ଲକ୍ଷଣ ବିଶ୍ଳେଷଣ କରନ୍ତୁ ଏବଂ ସୁପାରିଶ ପାଆନ୍ତୁ' },
            { id: 'preventive_tips', title: '🌱 ସ୍ୱାସ୍ଥ୍ଯ ଟିପସ', description: 'ରୋଗ, ପୋଷଣ ଏବଂ ଜୀବନଶୈଳୀ ବିଷୟରେ ଜାଣନ୍ତୁ' },
            { id: 'disease_alerts', title: '🦠 ରୋଗ ପ୍ରସାର ସଚେତନା', description: 'ସକ୍ରିୟ ରୋଗ ଦେଖନ୍ତୁ ଏବଂ ସଚେତନା ପ୍ରବନ୍ଧନ କରନ୍ତୁ' },
            { id: 'appointments', title: '📅 ମୋର ନିଯୁକ୍ତି (ଯୋଜନାବଦ୍ଧ)', description: 'ଡାକ୍ତରଖାନା ଭ୍ରମଣ ବୁକ୍ କରନ୍ତୁ, ଦେଖନ୍ତୁ ଏବଂ ଟ୍ରାକ୍ କରନ୍ତୁ' },
            { id: 'telemedicine', title: '🩻 ଟେଲିମେଡିସିନ୍ (eSanjeevani) (ଯୋଜନାବଦ୍ଧ)', description: 'ରିମୋଟ୍ ପରାମର୍ଶ ପାଇଁ ଡାକ୍ତରମାନଙ୍କ ସହିତ ସଂଯୋଗ କରନ୍ତୁ' },
            { id: 'health_records', title: '📂 ଡିଜିଟାଲ୍ ସ୍ୱାସ୍ଥ୍ଯ ରେକର୍ଡ (ABHA ID) (ଯୋଜନାବଦ୍ଧ)', description: 'ପୋର୍ଟେବଲ୍ ଏବଂ ପ୍ରବାସୀ-ଅନୁକୂଳ ସ୍ୱାସ୍ଥ୍ଯ ରେକର୍ଡ' },
            { id: 'pharmacy', title: '💊 ଫାର୍ମେସି ଏକୀକରଣ (ଯୋଜନାବଦ୍ଧ)', description: 'ରିଅଲ୍-ଟାଇମ୍ ଫାର୍ମେସି ଷ୍ଟକ୍ ଏବଂ ସବସିଡି ଆଲର୍ଟ' },
            { id: 'community_health', title: '📊 ସମ୍ପ୍ରଦାୟ ସ୍ୱାସ୍ଥ୍ଯ ପଲ୍ସ (ଯୋଜନାବଦ୍ଧ)', description: 'ଆପଣଙ୍କ ଜିଲ୍ଲାରେ ସ୍ୱାସ୍ଥ୍ଯ ଧାରାକୁ ଟ୍ରାକ୍ କରନ୍ତୁ' },
            { id: 'change_language', title: '🌐 ଭାଷା ବଦଳାନ୍ତୁ', description: 'ଅନ୍ଯ ଭାଷାରେ ବଦଳାନ୍ତୁ' }
          ]
        }]
      },
      
      // Transliterated versions
      hi_trans: {
        sections: [{
          title: `📋 ${mainMenuText}`,
          rows: [
            { id: 'chat_ai', title: '🤖 AI se baat karo', description: 'Swasthya prashn pucho aur margdarshan pao' },
            { id: 'symptom_check', title: '🩺 Lakshan jancho', description: 'Lakshano ka vishleshan karo aur sifarish pao' },
            { id: 'preventive_tips', title: '🌱 Swasthya sujhav', description: 'Bimariyo, poshan aur jeevansheli ke bare mein jano' },
            { id: 'disease_alerts', title: '🦠 Rog prakop alert', description: 'Sakriya rog dekho aur alert prabandhan karo' },
            { id: 'appointments', title: '📅 Meri appointment (niyojit)', description: 'Hospital ki yatraon ko book, dekho aur track karo' },
            { id: 'telemedicine', title: '🩻 Telemedicine (eSanjeevani) (niyojit)', description: 'Remote paramarsh ke liye doctors se judo' },
            { id: 'health_records', title: '📂 Digital swasthya record (ABHA ID) (niyojit)', description: 'Portable aur pravasi-anukul swasthya record' },
            { id: 'pharmacy', title: '💊 Pharmacy ekikaran (niyojit)', description: 'Real-time pharmacy stock aur subsidy alert' },
            { id: 'community_health', title: '📊 Samudayik swasthya pulse (niyojit)', description: 'Apne jile mein swasthya rujhano ko track karo' },
            { id: 'change_language', title: '🌐 Bhasha badlo', description: 'Alag bhasha mein badlo' }
          ]
        }]
      },
      
      te_trans: {
        sections: [{
          title: `📋 ${mainMenuText}`,
          rows: [
            { id: 'chat_ai', title: '🤖 AI tho chat cheyandi', description: 'Aarogya prashnalu adigi margadarshanam pondandi' },
            { id: 'symptom_check', title: '🩺 Lakshanalu thanikhi cheyandi', description: 'Lakshanalanu vishleshinchi sifarasulu pondandi' },
            { id: 'preventive_tips', title: '🌱 Aarogya chitkalu', description: 'Vyadhulu, poshanalu & jeevanasheli gurinchi telusukondi' },
            { id: 'disease_alerts', title: '🦠 Vyadhi vyapthi hecharikalu', description: 'Churukaina vyadhulanu chudandi & hecharikalanu nirvahinchandhi' },
            { id: 'appointments', title: '📅 Na appointment-lu (pranalik)', description: 'Asupathri sandarshanalu book cheyandi, chudandi & track cheyandi' },
            { id: 'telemedicine', title: '🩻 Telemedicine (eSanjeevani) (pranalik)', description: 'Remote consultation kosam vaidyulato connect avvandi' },
            { id: 'health_records', title: '📂 Digital health records (ABHA ID) (pranalik)', description: 'Portable & migrant-friendly health records' },
            { id: 'pharmacy', title: '💊 Pharmacy integration (pranalik)', description: 'Real-time pharmacy stock & subsidy alerts' },
            { id: 'community_health', title: '📊 Community health pulse (pranalik)', description: 'Mee jillalo health trends track cheyandi' },
            { id: 'change_language', title: '🌐 Bhasha marchandi', description: 'Vere bhashaku marchandi' }
          ]
        }]
      },
      
      ta_trans: {
        sections: [{
          title: `📋 ${mainMenuText}`,
          rows: [
            { id: 'chat_ai', title: '🤖 AI udan aratai', description: 'Sugathara kelvikal kettu vazhikattuthal perungal' },
            { id: 'symptom_check', title: '🩺 Arikuri saripar', description: 'Arikurikarai pakuppaivu seithu parinthurakairai perungal' },
            { id: 'preventive_tips', title: '🌱 Aarokkiya kuripugal', description: 'Noikal, oottachatthu & valkkai murai patri ariyungal' },
            { id: 'disease_alerts', title: '🦠 Noi virivu echarikaikal', description: 'Tarpothaiya noikarai parkavum & echarikaikairai nirvahikkavum' },
            { id: 'appointments', title: '📅 Enathu santhippugal (thittamidappattathu)', description: 'Maruthuvamani varugaigalai pathivu seiyungal, parkavum & kankanikkavum' },
            { id: 'telemedicine', title: '🩻 Tholaimaruthuvam (eSanjeevani) (thittamidappattathu)', description: 'Tholainilai aalosanaigalukku maruthuvargaludan inaikkavum' },
            { id: 'health_records', title: '📂 Digital sugathara pathivugal (ABHA ID) (thittamidappattathu)', description: 'Portable & pulampeiyarnthor-natpu sugathara pathivugal' },
            { id: 'pharmacy', title: '💊 Marunthagam orungginaippu (thittamidappattathu)', description: 'Nigazhnera marunthagam iruppu & maniyam echarikkaigal' },
            { id: 'community_health', title: '📊 Samuha sugathara thudippu (thittamidappattathu)', description: 'Ungal mavattathil sugathara pokkugalai kankanikkavum' },
            { id: 'change_language', title: '🌐 Mozhi maatru', description: 'Veru mozhiku maatru' }
          ]
        }]
      },
      
      or_trans: {
        sections: [{
          title: `📋 ${mainMenuText}`,
          rows: [
            { id: 'chat_ai', title: '🤖 AI sahita chat karanta', description: 'Swaasthya prashna pacharanta o margadarshan paanta' },
            { id: 'symptom_check', title: '🩺 Lakshan jancha karanta', description: 'Lakshana vishleshan karanta o sifarish paanta' },
            { id: 'preventive_tips', title: '🌱 Swaasthya tips', description: 'Rog, aahaar o jeevan shaili bisayare jaananta' },
            { id: 'disease_alerts', title: '🦠 Rog prakop alert', description: 'Sakriya rog dekhanta o alert byabasthapana karanta' },
            { id: 'appointments', title: '📅 Mor niyukti (yojanaabaddha)', description: 'Daaktarakhana bhramana book karanta, dekhanta o track karanta' },
            { id: 'telemedicine', title: '🩻 Telemedicine (eSanjeevani) (yojanaabaddha)', description: 'Remote paramarsha paain daaktaramaankara sahita sanyoga karanta' },
            { id: 'health_records', title: '📂 Digital swaasthya record (ABHA ID) (yojanaabaddha)', description: 'Portable o prabaasi-anukula swaasthya record' },
            { id: 'pharmacy', title: '💊 Pharmacy ekikarana (yojanaabaddha)', description: 'Real-time pharmacy stock o subsidy alert' },
            { id: 'community_health', title: '📊 Sampradaaya swaasthya pulse (yojanaabaddha)', description: 'Aapananka jillaare swaasthya dharaaku track karanta' },
            { id: 'change_language', title: '🌐 Bhaasha badalanta', description: 'Anya bhaashaku badalanta' }
          ]
        }]
      }
    };
    
    // Check for transliterated version first
    if (scriptType === 'transliteration' && language !== 'en') {
      const transKey = `${language}_trans`;
      if (menus[transKey]) {
        return menus[transKey];
      }
    }
    
    return menus[language] || menus.en;
  }

  // Get main menu buttons (3-button limit) - Alternative to list
  getMainMenuButtons(language = 'en', scriptType = 'native') {
    // Check for transliterated version first
    if (scriptType === 'transliteration' && language !== 'en') {
      const transKey = `${language}_trans`;
      if (this.mainMenuButtons[transKey]) {
        return this.mainMenuButtons[transKey];
      }
    }
    
    return this.mainMenuButtons[language] || this.mainMenuButtons.en;
  }

  mainMenuButtons = {
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

  // Get more options menu buttons (3-button limit) - Removed feedback
  getMoreOptionsButtons(language = 'en') {
    const buttons = {
      en: [
        { id: 'change_language', title: '🌐 Change Language' },
        { id: 'outbreak_alerts', title: '🚨 Outbreak Alerts' },
        { id: 'preventive_tips', title: '🛡️ Health Tips' }
      ],
      hi: [
        { id: 'change_language', title: '🌐 भाषा बदलें' },
        { id: 'outbreak_alerts', title: '🚨 बीमारी अलर्ट' },
        { id: 'preventive_tips', title: '🛡️ स्वास्थ्य सुझाव' }
      ],
      te: [
        { id: 'change_language', title: '🌐 భాష మార్చండి' },
        { id: 'outbreak_alerts', title: '🚨 వ్యాధి హెచ్చరికలు' },
        { id: 'preventive_tips', title: '🛡️ ఆరోగ్య చిట్కాలు' }
      ],
      ta: [
        { id: 'change_language', title: '🌐 மொழி மாற்று' },
        { id: 'outbreak_alerts', title: '🚨 தொற்றுநோய் எச்சரிக்கைகள்' },
        { id: 'preventive_tips', title: '🛡️ சுகாதார குறிப்புகள்' }
      ],
      or: [
        { id: 'change_language', title: '🌐 ଭାଷା ବଦଳାନ୍ତୁ' },
        { id: 'outbreak_alerts', title: '🚨 ବ୍ୟାଧି ସତର୍କତା' },
        { id: 'preventive_tips', title: '🛡️ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ' }
      ]
    };
    return buttons[language] || buttons.en;
  }

  // Get inline feedback buttons (thumbs up/down)
  getInlineFeedbackButtons(language = 'en') {
    return [
      { id: 'feedback_good', title: '👍' },
      { id: 'feedback_bad', title: '👎' }
    ];
  }

  // Send typing indicator (three dots animation)
  async sendTypingIndicator(to) {
    try {
      // WhatsApp Business API doesn't support typing indicators directly
      // We'll simulate it with a delay and log for debugging
      console.log(`⌨️ Simulating typing indicator for ${to}`);
      return { success: true, simulated: true };
    } catch (error) {
      console.error('❌ Error with typing indicator:', error);
      return null;
    }
  }

  // Stop typing indicator
  async stopTypingIndicator(to) {
    try {
      // WhatsApp Business API doesn't support typing indicators directly
      // We simulate the effect with delays in message sending
      console.log(`⌨️ Stopping typing simulation for ${to}`);
      return { success: true, simulated: true };
    } catch (error) {
      console.error('❌ Error stopping typing indicator:', error);
      return null;
    }
  }

  // Send message with inline feedback buttons (Meta style)
  async sendMessageWithFeedback(to, text, messageId = null) {
    try {
      // Send the main message first
      const messageResponse = await this.sendMessage(to, text);
      
      // Add small delay before sending feedback buttons
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // Send inline feedback buttons with minimal text (Meta style)
        const feedbackButtons = this.getInlineFeedbackButtons();
        // Use a single dot for Meta-style minimal text (WhatsApp requires min 1 char)
        await this.sendInteractiveButtons(to, '.', feedbackButtons);
        console.log('✅ Sent feedback buttons to', to);
      } catch (buttonError) {
        console.error('⚠️ Feedback buttons failed, but message was sent:', buttonError.message);
        // Don't send message again - just log the button failure
      }
      
      return messageResponse;
    } catch (error) {
      console.error('❌ Error sending main message:', error);
      throw error; // Don't send duplicate message
    }
  }

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

  // Get preventive tips categories list
  getPreventiveTipsList(language = 'en') {
    const lists = {
      en: {
        sections: [{
          title: "🌱 Health Tips Categories",
          rows: [
            { id: 'learn_diseases', title: '🦠 Learn about Diseases', description: 'Common diseases, symptoms & prevention' },
            { id: 'nutrition_hygiene', title: '🥗 Nutrition & Hygiene', description: 'Healthy eating habits & cleanliness tips' },
            { id: 'exercise_lifestyle', title: '🏃 Exercise & Lifestyle', description: 'Physical activity & healthy living tips' }
          ]
        }]
      },
      hi: {
        sections: [{
          title: "🌱 स्वास्थ्य सुझाव श्रेणियां",
          rows: [
            { id: 'learn_diseases', title: '🦠 बीमारियों के बारे में जानें', description: 'सामान्य बीमारियां, लक्षण और रोकथाम' },
            { id: 'nutrition_hygiene', title: '🥗 पोषण और स्वच्छता', description: 'स्वस्थ खाने की आदतें और सफाई के सुझाव' },
            { id: 'exercise_lifestyle', title: '🏃 व्यायाम और जीवनशैली', description: 'शारीरिक गतिविधि और स्वस्थ जीवन के सुझाव' }
          ]
        }]
      },
      te: {
        sections: [{
          title: "🌱 ఆరోగ్య చిట్కాల వర్గాలు",
          rows: [
            { id: 'learn_diseases', title: '🦠 వ్యాధుల గురించి తెలుసుకోండి', description: 'సాధారణ వ్యాధులు, లక్షణాలు & నివారణ' },
            { id: 'nutrition_hygiene', title: '🥗 పోషణ & పరిశుభ్రత', description: 'ఆరోగ్యకరమైన ఆహార అలవాట్లు & పరిశుభ్రత చిట్కాలు' },
            { id: 'exercise_lifestyle', title: '🏃 వ్యాయామం & జీవనశైలి', description: 'శారీరక కార్యకలాపాలు & ఆరోగ్యకరమైన జీవన చిట్కాలు' }
          ]
        }]
      },
      ta: {
        sections: [{
          title: "🌱 ஆரோக்கிய குறிப்புகள் வகைகள்",
          rows: [
            { id: 'learn_diseases', title: '🦠 நோய்கள் பற்றி அறிய', description: 'பொதுவான நோய்கள், அறிகுறிகள் & தடுப்பு' },
            { id: 'nutrition_hygiene', title: '🥗 ஊட்டச்சத்து & சுகாதாரம்', description: 'ஆரோக்கியமான உணவு பழக்கங்கள் & சுத்தம் குறிப்புகள்' },
            { id: 'exercise_lifestyle', title: '🏃 உடற்பயிற்சி & வாழ்க்கை முறை', description: 'உடற்பயிற்சி & ஆரோக்கியமான வாழ்வின் குறிப்புகள்' }
          ]
        }]
      },
      or: {
        sections: [{
          title: "🌱 ସ୍ୱାସ୍ଥ୍ୟ ଟିପସ ବିଭାଗଗୁଡିକ",
          rows: [
            { id: 'learn_diseases', title: '🦠 ରୋଗ ବିଷୟରେ ଜାଣନ୍ତୁ', description: 'ସାଧାରଣ ରୋଗ, ଲକ୍ଷଣ ଏବଂ ପ୍ରତିରୋଧ' },
            { id: 'nutrition_hygiene', title: '🥗 ପୋଷଣ ଏବଂ ସ୍ୱଚ୍ଛତା', description: 'ସ୍ୱାସ୍ଥ୍ୟକର ଖାଇବା ଅଭ୍ୟାସ ଏବଂ ସ୍ୱଚ୍ଛତା ଟିପସ' },
            { id: 'exercise_lifestyle', title: '🏃 ବ୍ୟାୟାମ ଏବଂ ଜୀବନଶୈଳୀ', description: 'ଶାରୀରିକ କାର୍ଯ୍ୟକଳାପ ଏବଂ ସ୍ୱାସ୍ଥ୍ୟକର ଜୀବନ ଟିପସ' }
          ]
        }]
      },

      // Transliteration versions
      hi_trans: {
        sections: [{
          title: "🌱 Swasthya sujhav shreniyan",
          rows: [
            { id: 'learn_diseases', title: '🦠 Bimariyo ke bare mein jano', description: 'Samanya bimariyan, lakshan aur roktham' },
            { id: 'nutrition_hygiene', title: '🥗 Poshan aur swachhata', description: 'Swasth khane ki aadaten aur safai ke sujhav' },
            { id: 'exercise_lifestyle', title: '🏃 Vyayam aur jeevansheli', description: 'Sharirik gatividhi aur swasth jeevan ke sujhav' }
          ]
        }]
      },
      te_trans: {
        sections: [{
          title: "🌱 Aarogya chitkala vargalu",
          rows: [
            { id: 'learn_diseases', title: '🦠 Vyadhula gurinchi telusukondi', description: 'Sadharana vyadhulu, lakshanalu & nivarana' },
            { id: 'nutrition_hygiene', title: '🥗 Poshana & parishubhrata', description: 'Aarogyakaramaina aahara alavatlalu & parishubhrata chitkalu' },
            { id: 'exercise_lifestyle', title: '🏃 Vyayamam & jeevanasheli', description: 'Sharirika karyakalapalu & aarogyakaramaina jeevana chitkalu' }
          ]
        }]
      },
      ta_trans: {
        sections: [{
          title: "🌱 Aarokkiya kuripugal vagaigal",
          rows: [
            { id: 'learn_diseases', title: '🦠 Noikal patri ariya', description: 'Poduvana noikal, arikurikal & thaduppu' },
            { id: 'nutrition_hygiene', title: '🥗 Oottachatthu & sugatharam', description: 'Aarokkiyamana unavu pazhakkangal & sutham kuripugal' },
            { id: 'exercise_lifestyle', title: '🏃 Udarpayirchi & valkkai murai', description: 'Udarpayirchi & aarokkiyamana valvin kuripugal' }
          ]
        }]
      },
      or_trans: {
        sections: [{
          title: "🌱 Swaasthya tips bibhagagudika",
          rows: [
            { id: 'learn_diseases', title: '🦠 Rog bisayare jaananta', description: 'Sadharana rog, lakshan ebam pratirodha' },
            { id: 'nutrition_hygiene', title: '🥗 Poshan ebam swachhata', description: 'Swaasthyakara khaiba abhyasa ebam swachhata tips' },
            { id: 'exercise_lifestyle', title: '🏃 Byayam ebam jeebanshaili', description: 'Sharirika karyakalapa ebam swaasthyakara jeebana tips' }
          ]
        }]
      }
    };
    return lists[language] || lists.en;
  }
}

module.exports = WhatsAppService;