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
  getMainMenuList(language = 'en') {
    const menus = {
      en: {
        sections: [{
          title: "📋 Main Menu",
          rows: [
            { id: 'chat_ai', title: '🤖 Chat with AI', description: 'Ask health questions & get guidance' },
            { id: 'appointments', title: '📅 My Appointments', description: 'Schedule & track appointments (Coming Soon)' },
            { id: 'preventive_tips', title: '🌱 Health Tips', description: 'Learn about diseases, nutrition & lifestyle' },
            { id: 'symptom_check', title: '🩺 Check Symptoms', description: 'Analyze symptoms & get recommendations' },
            { id: 'outbreak_alerts', title: '🚨 Outbreak Alerts', description: 'Real-time disease outbreak alerts (Coming Soon)' },
            { id: 'feedback', title: '📊 Feedback & Accuracy', description: 'Rate responses & help improve accuracy' }
          ]
        }]
      },
      hi: {
        sections: [{
          title: "📋 मुख्य मेनू",
          rows: [
            { id: 'chat_ai', title: '🤖 AI से बात करें', description: 'स्वास्थ्य प्रश्न पूछें और मार्गदर्शन पाएं' },
            { id: 'appointments', title: '📅 मेरी अपॉइंटमेंट्स', description: 'अपॉइंटमेंट शेड्यूल करें (जल्द आ रहा है)' },
            { id: 'preventive_tips', title: '🌱 स्वास्थ्य सुझाव', description: 'बीमारियों, पोषण और जीवनशैली के बारे में जानें' },
            { id: 'symptom_check', title: '🩺 लक्षण जांचें', description: 'लक्षणों का विश्लेषण करें और सिफारिशें पाएं' },
            { id: 'outbreak_alerts', title: '🚨 बीमारी अलर्ट', description: 'वास्तविक समय रोग प्रकोप अलर्ट (जल्द आ रहा है)' },
            { id: 'feedback', title: '📊 फीडबैक और सटीकता', description: 'प्रतिक्रियाओं को रेट करें और सटीकता सुधारने में मदद करें' }
          ]
        }]
      },
      te: {
        sections: [{
          title: "📋 ప్రధాన మెనూ",
          rows: [
            { id: 'chat_ai', title: '🤖 AI తో చాట్ చేయండి', description: 'ఆరోగ్య ప్రశ్నలు అడిగి మార్గదర్శనం పొందండి' },
            { id: 'appointments', title: '📅 నా అపాయింట్మెంట్స్', description: 'అపాయింట్మెంట్లను షెడ్యూల్ & ట్రాక్ చేయండి (త్వరలో వస్తుంది)' },
            { id: 'preventive_tips', title: '🌱 ఆరోగ్య చిట్కాలు', description: 'వ్యాధులు, పోషణ & జీవనశైలి గురించి తెలుసుకోండి' },
            { id: 'symptom_check', title: '🩺 లక్షణాలు తనిఖీ చేయండి', description: 'లక్షణాలను విశ్లేషించి సిఫార్సులు పొందండి' },
            { id: 'outbreak_alerts', title: '🚨 వ్యాధి హెచ్చరికలు', description: 'రియల్-టైమ్ వ్యాధి వ్యాప్తి హెచ్చరికలు (త్వరలో వస్తుంది)' },
            { id: 'feedback', title: '📊 ఫీడ్బ్యాక్ & ఖచ్చితత్వం', description: 'స్పందనలను రేట్ చేయండి & ఖచ్చితత్వం మెరుగుపరచడంలో సహాయపడండి' }
          ]
        }]
      },
      ta: {
        sections: [{
          title: "📋 முதன்மை மெனு",
          rows: [
            { id: 'chat_ai', title: '🤖 AI உடன் அரட்டை', description: 'சுகாதார கேள்விகள் கேட்டு வழிகாட்டுதல் பெறுங்கள்' },
            { id: 'appointments', title: '📅 எனது முன்பதிவுகள்', description: 'முன்பதிவுகளை திட்டமிடுங்கள் & கண்காணிக்கவும் (விரைவில் வரும்)' },
            { id: 'preventive_tips', title: '🌱 ஆரோக்கிய குறிப்புகள்', description: 'நோய்கள், ஊட்டச்சத்து & வாழ்க்கை முறை பற்றி அறியுங்கள்' },
            { id: 'symptom_check', title: '🩺 அறிகுறிகளை சரிபார்க்கவும்', description: 'அறிகுறிகளை பகுப்பாய்வு செய்து பரிந்துரைகளை பெறுங்கள்' },
            { id: 'outbreak_alerts', title: '🚨 நோய் எச்சரிக்கைகள்', description: 'உண்மை நேர நோய் வெடிப்பு எச்சரிக்கைகள் (விரைவில் வரும்)' },
            { id: 'feedback', title: '📊 கருத்து & துல்லியம்', description: 'பதில்களை மதிப்பிடுங்கள் & துல்லியத்தை மேம்படுத்த உதவுங்கள்' }
          ]
        }]
      },
      or: {
        sections: [{
          title: "📋 ମୁଖ୍ୟ ମେନୁ",
          rows: [
            { id: 'chat_ai', title: '🤖 AI ସହିତ କଥାବାର୍ତ୍ତା', description: 'ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ ଏବଂ ମାର୍ଗଦର୍ଶନ ପାଆନ୍ତୁ' },
            { id: 'appointments', title: '📅 ମୋର ନିଯୁକ୍ତି', description: 'ନିଯୁକ୍ତି ନିର୍ଦ୍ଧାରଣ ଏବଂ ଟ୍ରାକ୍ କରନ୍ତୁ (ଶୀଘ୍ର ଆସୁଛି)' },
            { id: 'preventive_tips', title: '🌱 ସ୍ୱାସ୍ଥ୍ୟ ଟିପସ', description: 'ରୋଗ, ପୋଷଣ ଏବଂ ଜୀବନଶୈଳୀ ବି�ୟଷୟରେ ଜାଣନ୍ତୁ' },
            { id: 'symptom_check', title: '🩺 ଲକ୍ଷଣ ଯାଞ୍ଚ କରନ୍ତୁ', description: 'ଲକ୍ଷଣ ବିଶ୍ଳେଷଣ କରନ୍ତୁ ଏବଂ ସୁପାରିଶ ପାଆନ୍ତୁ' },
            { id: 'outbreak_alerts', title: '🚨 ରୋଗ ସତର୍କତା', description: 'ପ୍ରକୃତ ସମୟ ରୋଗ ବିସ୍ଫୋରଣ ସତର୍କତା (ଶୀଘ୍ର ଆସୁଛି)' },
            { id: 'feedback', title: '📊 ମତାମତ ଏବଂ ସଠିକତା', description: 'ପ୍ରତିକ୍ରିୟାକୁ ମୂଲ୍ୟାଙ୍କନ କରନ୍ତୁ ଏବଂ ସଠିକତା ଉନ୍ନତି କରିବାରେ ସାହାଯ୍ୟ କରନ୍ତୁ' }
          ]
        }]
      }
    };
    return menus[language] || menus.en;
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
      }
    };
    return lists[language] || lists.en;
  }
}

module.exports = WhatsAppService;