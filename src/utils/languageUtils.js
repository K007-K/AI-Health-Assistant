// Language configuration and utilities
const languages = {
  en: { name: 'English', flag: '🇺🇸', native: 'English' },
  hi: { name: 'Hindi', flag: '🇮🇳', native: 'हिंदी' },
  te: { name: 'Telugu', flag: '🇮🇳', native: 'తెలుగు' },
  ta: { name: 'Tamil', flag: '🇮🇳', native: 'தமிழ்' },
  or: { name: 'Odia', flag: '🇮🇳', native: 'ଓଡ଼ିଆ' }
};

// System prompts for different languages and transliteration
const systemPrompts = {
  // Telugu transliteration system prompt - SHORT and conversational
  te_trans: `You are a friendly Telugu healthcare assistant. Respond in Telugu using Roman letters.

KEY RULES:
- Keep responses SHORT (max 2-3 sentences)
- Be conversational and warm
- Use simple Telugu words
- Give practical advice, not long explanations

GRAMMAR:
- "naaku" = "I have" (naaku jwaram vachindi)
- "meeku" = "you have" (meeku em problem?)
- "nenu" = "I" (subject)

EXAMPLE:
User: "naaku tala noppi"
You: "Oh tala noppi ah? Paracetamol teesko, water ekkuva thagu, rest cheyu. Doctor daggara vellu."

Be helpful and SHORT.`,

  // Tamil transliteration system prompt - SHORT and conversational
  ta_trans: `You are a friendly Tamil healthcare assistant. Respond in Tamil using Roman letters.

KEY RULES:
- Keep responses SHORT (max 2-3 sentences)
- Be conversational and warm
- Use simple Tamil words
- Give practical advice

GRAMMAR:
- "enakku" = "I have"
- "ungalukku" = "you have"
- "naan" = "I"

EXAMPLE:
User: "enakku kaichal"
You: "Aiyo kaichal ah? Paracetamol sapdunga, thanni nalla kudunga, rest edunga. Doctor kitta ponga."

Be helpful and SHORT.`,

  // Odia transliteration system prompt - SHORT and conversational
  or_trans: `You are a friendly Odia healthcare assistant. Respond in Odia using Roman letters.

KEY RULES:
- Keep responses SHORT (max 2-3 sentences)
- Be conversational and warm
- Use simple Odia words
- Give practical advice

EXAMPLE:
User: "mo mathaa byatha"
You: "Are mathaa byatha? Paracetamol khao, pani besi pio, rest karo. Doctor dekhao."

Be helpful and SHORT.`,

  // Hindi transliteration system prompt - SHORT and conversational
  hi_trans: `You are a friendly Hindi healthcare assistant. Respond in Hindi using Roman letters.

KEY RULES:
- Keep responses SHORT (max 2-3 sentences)
- Be conversational and warm
- Use simple Hindi words
- Give practical advice

EXAMPLE:
User: "mujhe sar dard hai"
You: "Arre sar dard hai? Paracetamol lo, paani zyada piyo, rest karo. Doctor se milo."

Be helpful and SHORT.`,

  // Native script prompts - SHORT and conversational
  te: `You are a friendly Telugu healthcare assistant. Respond in Telugu script. Keep responses SHORT (2-3 sentences), conversational, and helpful. Give practical advice, not long explanations.`,
  hi: `You are a friendly Hindi healthcare assistant. Respond in Hindi script. Keep responses SHORT (2-3 sentences), conversational, and helpful. Give practical advice, not long explanations.`,
  ta: `You are a friendly Tamil healthcare assistant. Respond in Tamil script. Keep responses SHORT (2-3 sentences), conversational, and helpful. Give practical advice, not long explanations.`,
  or: `You are a friendly Odia healthcare assistant. Respond in Odia script. Keep responses SHORT (2-3 sentences), conversational, and helpful. Give practical advice, not long explanations.`,
  
  // Default English - SHORT and conversational
  en: `You are a friendly healthcare assistant. Provide SHORT, practical medical advice (2-3 sentences max). Be conversational and helpful. Include brief safety disclaimers when needed.`
};

// Text templates for different languages
const textTemplates = {
  welcome: {
    en: `👋 Hello! I am your Health Assistant.
🌐 Please choose your language:`,
    hi: `👋 नमस्ते! मैं आपका स्वास्थ्य सहायक हूं।
🌐 कृपया अपनी भाषा चुनें:`,
    te: `👋 హలో! నేను మీ ఆరోగ్య సహాయకుడిని.
🌐 దయచేసి మీ భాషను ఎంచుకోండి:`,
    ta: `👋 வணக்கம்! நான் உங்கள் சுகாதார உதவியாளர்.
🌐 தயவுசெய்து உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:`,
    or: `👋 ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ।
🌐 ଦୟାକରି ଆପଣଙ୍କର ଭାଷା ବାଛନ୍ତୁ:`
  },
  
  script_selection: {
    te: `మీరు తెలుగు ఎంచుకున్నారు.
మీకు ఏది కావాలి:
1️⃣ తెలుగు script
2️⃣ English letters (transliteration)`,
    hi: `आपने हिंदी चुनी है।
आपको क्या चाहिए:
1️⃣ हिंदी script
2️⃣ English letters (transliteration)`,
    ta: `நீங்கள் தமிழைத் தேர்ந்தெடுத்துள்ளீர்கள்.
உங்களுக்கு என்ன வேண்டும்:
1️⃣ தமிழ் script
2️⃣ English letters (transliteration)`,
    or: `ଆପଣ ଓଡ଼ିଆ ବାଛିଛନ୍ତି।
ଆପଣଙ୍କୁ କଣ ଦରକାର:
1️⃣ ଓଡ଼ିଆ script
2️⃣ English letters (transliteration)`
  },

  main_menu: {
    en: `📋 Main Menu — Please choose an option:

1️⃣ Chat with AI
2️⃣ Check Symptoms  
3️⃣ More Options

Choose an option.`,
    hi: `📋 मुख्य मेनू — कृपया एक विकल्प चुनें:

1️⃣ AI से बात करें
2️⃣ लक्षण जांचें
3️⃣ और विकल्प

एक विकल्प चुनें।`,
    te: `📋 ప్రధాన మెనూ — దయచేసి ఒక ఎంపిక ఎంచుకోండి:

1️⃣ AI తో చాట్ చేయండి
2️⃣ లక్షణాలు తనిఖీ చేయండి
3️⃣ మరిన్ని ఆప్షన్స్

ఒక ఎంపిక ఎంచుకోండి।`,
    ta: `📋 முக்கிய மெனு — தயவுசெய்து ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்:

1️⃣ AI உடன் பேசு
2️⃣ அறிகுறிகள் சரிபார்
3️⃣ மேலும் விருப்பங்கள்

ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்।`,
    or: `📋 ମୁଖ୍ୟ ମେନୁ — ଦୟାକରି ଏକ ବିକଳ୍ପ ବାଛନ୍ତୁ:

1️⃣ AI ସହିତ କଥା
2️⃣ ଲକ୍ଷଣ ଯାଞ୍ଚ
3️⃣ ଅଧିକ ବିକଳ୍ପ

ଏକ ବିକଳ୍ପ ବାଛନ୍ତୁ।`
  },

  more_options_menu: {
    en: `⚙️ More Options — Additional services:

1️⃣ Preventive Health Tips
2️⃣ Appointments (Coming Soon)
3️⃣ Feedback & Suggestions

Choose an option or go back.`,
    hi: `⚙️ और विकल्प — अतिरिक्त सेवाएं:

1️⃣ स्वास्थ्य सुझाव
2️⃣ अपॉइंटमेंट्स (जल्द आ रहा है)
3️⃣ फीडबैक और सुझाव

एक विकल्प चुनें या वापस जाएं।`,
    te: `⚙️ మరిన్ని ఆప్షన్స్ — అదనపు సేవలు:

1️⃣ నివారణ ఆరోగ్య చిట్కాలు
2️⃣ అపాయింట్‌మెంట్‌లు (త్వరలో వస్తుంది)
3️⃣ ఫీడ్‌బ్యాక్ మరియు సలహాలు

ఒక ఎంపిక ఎంచుకోండి లేదా తిరిగి వెళ్ళండి।`,
    ta: `⚙️ மேலும் விருப்பங்கள் — கூடுதல் சேவைகள்:

1️⃣ உடல்நலக் குறிप்புகள்
2️⃣ முன்பதிவுகள் (விரைவில் வரும்)
3️⃣ கருத்து மற்றும் பரிந்துரைகள்

ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும் அல்லது திரும்பிச் செல்லவும்।`,
    or: `⚙️ ଅଧିକ ବିକଳ୍ପ — ଅତିରିକ୍ତ ସେବା:

1️⃣ ସ୍ୱାସ୍ଥ୍ୟ ଟିପ୍ସ
2️⃣ ନିଯୁକ୍ତି (ଶୀଘ୍ର ଆସୁଛି)
3️⃣ ମତାମତ ଏବଂ ପରାମର୍ଶ

ଏକ ବିକଳ୍ପ ବାଛନ୍ତୁ କିମ୍ବା ଫେରନ୍ତୁ।`
  },

  emergency_detected: {
    en: `⚠️ Emergency detected!
Please call 108 or go to the nearest PHC immediately.
Your safety comes first.`,
    hi: `⚠️ आपातकाल का पता चला!
कृपया 108 पर कॉल करें या निकटतम PHC पर तुरंत जाएं।
आपकी सुरक्षा पहले आती है।`,
    te: `⚠️ అత్యవసర పరిస్థితి గుర్తించబడింది!
దయచేసి 108కు కాల్ చేయండి లేదా వెంటనే సమీప PHCకి వెళ్లండి.
మీ భద్రత మొదట వస్తుంది.`
  },

  coming_soon: {
    en: `🚧 Coming Soon!
This feature requires integration with government health databases and will be available soon.

For now, you can:
• Chat with AI for health guidance
• Get preventive healthcare tips
• Check symptoms

Thank you for your patience!`,
    hi: `🚧 जल्द आ रहा है!
इस सुविधा के लिए सरकारी स्वास्थ्य डेटाबेस के साथ एकीकरण की आवश्यकता है और यह जल्द ही उपलब्ध होगी।

अभी के लिए, आप कर सकते हैं:
• स्वास्थ्य मार्गदर्शन के लिए AI से बात करें
• स्वास्थ्य सुझाव प्राप्त करें
• लक्षणों की जांच करें

आपके धैर्य के लिए धन्यवाद!`
  }
};

// Emergency keywords in different languages
const emergencyKeywords = {
  en: ['emergency', 'severe pain', 'chest pain', 'can\'t breathe', 'heavy bleeding', 'unconscious', 'heart attack', 'stroke', 'difficulty breathing'],
  hi: ['emergency', 'गंभीर दर्द', 'सीने में दर्द', 'सांस नहीं आ रही', 'खून बह रहा', 'बेहोश', 'दिल का दौरा', 'stroke'],
  te: ['emergency', 'తీవ్రమైన నొప్పి', 'ఛాతీ నొప్పి', 'ఊపిరి రాలేదు', 'రక్తస్రావం', 'అపస్మారక', 'గుండెపోటు'],
  ta: ['emergency', 'கடுமையான வலி', 'மார்பு வலி', 'மூச்சு விடமுடியவில்லை', 'அதிக இரத்தப்போக்கு', 'மயக்கம்'],
  or: ['emergency', 'ତୀବ୍ର ଯନ୍ତ୍ରଣା', 'ଛାତି ଯନ୍ତ୍ରଣା', 'ନିଶ୍ୱାସ ନେଇପାରୁନାହିଁ', 'ରକ୍ତସ୍ରାବ', 'ଚେତନାହୀନ']
};

// Utility functions
class LanguageUtils {
  static getLanguages() {
    return languages;
  }

  static getSystemPrompt(language, scriptType = 'native') {
    const key = scriptType === 'transliteration' ? `${language}_trans` : language;
    return systemPrompts[key] || systemPrompts.en;
  }

  static getText(key, language = 'en', fallback = 'en') {
    if (textTemplates[key] && textTemplates[key][language]) {
      return textTemplates[key][language];
    }
    if (textTemplates[key] && textTemplates[key][fallback]) {
      return textTemplates[key][fallback];
    }
    return `Text not found for key: ${key}`;
  }

  static detectEmergency(text, language = 'en') {
    const keywords = emergencyKeywords[language] || emergencyKeywords.en;
    const lowerText = text.toLowerCase();
    
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  static isValidLanguage(lang) {
    return languages.hasOwnProperty(lang);
  }

  static hasScriptOptions(language) {
    return ['hi', 'te', 'ta', 'or'].includes(language);
  }

  static getLanguageFromButtonId(buttonId) {
    const match = buttonId.match(/^lang_(.+)$/);
    return match ? match[1] : null;
  }

  static getScriptFromButtonId(buttonId) {
    const map = {
      'script_native': 'native',
      'script_trans': 'transliteration'
    };
    return map[buttonId] || 'native';
  }

  static formatMenuOptions(language = 'en') {
    const options = [
      { id: 'chat_ai', emoji: '🤖', text: 'Chat with AI' },
      { id: 'appointments', emoji: '📅', text: 'Appointments (Coming Soon)' },
      { id: 'preventive_tips', emoji: '🌱', text: 'Health Tips' },
      { id: 'symptom_check', emoji: '🩺', text: 'Check Symptoms' },
      { id: 'outbreak_alerts', emoji: '🚨', text: 'Outbreak Alerts (Coming Soon)' },
      { id: 'feedback', emoji: '📊', text: 'Feedback' }
    ];

    // TODO: Add translations for other languages
    return options;
  }

  static getAccessibilityCommands() {
    return {
      '/easy': 'Switch to Easy Mode (simpler words)',
      '/long': 'Switch to Long Text Mode (more spacing)',
      '/audio': 'Switch to Audio Mode',
      '/poster': 'Switch to Visual Mode',
      '/reset': 'Reset all preferences'
    };
  }
}

module.exports = {
  LanguageUtils,
  languages,
  systemPrompts,
  textTemplates,
  emergencyKeywords
};