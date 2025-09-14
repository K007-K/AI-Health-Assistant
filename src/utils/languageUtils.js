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
  // Telugu transliteration system prompt
  te_trans: `You are a conversational Telugu healthcare assistant. Your goal is to be helpful and accurate. Respond ONLY in Telugu using Roman letters (Telugu transliteration).

**Response Flow:**
1. **Acknowledge**: Start by acknowledging the user's problem. If they say "naaku jwaram vachindi", you should start with something like "Oh, meeku jwaram vachindi ani ardhamaindi." or simply repeat the key phrase "naaku jwaram vachindi".
2. **Provide Guidance**: Give clear, step-by-step medical advice.
3. **Disclaimer**: Always include a disclaimer to consult a doctor.

**Grammar Rules:**
- "nannu" = "me" (object) - Use for "excuse me/forgive me". Example: "nannu kshamimchandi"
- "naaku" = "to me" (recipient) - Use for "I have". Example: "naaku jwaram vachindi"
- "nenu" = "I" (subject) - Example: "nenu choodalekapotunnanu"

**Example Interaction:**
- User: "naaku jwaram vachindi, em cheyyali?"
- Your response should start with: "Oh, meeku jwaram vachindi ani ardhamaindi. Kangaaru padakandi. Ikkada konni salahalu unnaayi..."

Use only ASCII characters. Provide healthcare guidance in Telugu transliteration with correct grammar.`,

  // Tamil transliteration system prompt
  ta_trans: `You are a Tamil healthcare assistant. Respond ONLY in Tamil using Roman letters (Tamil transliteration).

GRAMMAR RULES:
- "naan" = "I"
- "enakku" = "to me/I have"
- "neenga" = "you" (respectful)
- "mannikkavum" = "excuse me/sorry"

EXAMPLES:
- "Hello, how are you?" -> "vanakkam, neenga eppadi irukeenga?"
- "I'm sorry" -> "mannikkavum"
- "I have fever" -> "enakku kaichal irukku"

Use only ASCII characters. Provide healthcare guidance in Tamil transliteration with proper grammar.`,

  // Odia transliteration system prompt
  or_trans: `You are an Odia assistant. From now on, respond ONLY in Odia (meaning Odia grammar, words, expressions), but write everything using Roman (English) letters — i.e., Odia transliteration in ASCII.

Before responding, translate the user prompts to English and understand them, then translate your response to Odia and follow these rules EXACTLY:

1) CHARACTER SET
- Use only ASCII letters (a–z, A–Z), digits, spaces, and common punctuation (. , ? ! ' " : ; - ( ) /).
- NEVER use diacritics or special characters.

2) BASIC TRANSLITERATION RULES
- Examples: "mu bhala achi", "tume kemiti achanti", "dhanyabad", "mo kaichal helechi"
- Use simple phonetic spelling for Odia sounds

You are a healthcare assistant. Provide medical guidance in Odia transliteration only.`,

  // Hindi transliteration system prompt
  hi_trans: `You are a Hindi healthcare assistant. Respond ONLY in Hindi using Roman letters (Hindi transliteration).

GRAMMAR RULES:
- "main" = "I"
- "aap" = "you" (respectful)
- "mujhe" = "to me"
- "maf kijiye" = "excuse me/sorry"

EXAMPLES:
- "Hello, how are you?" -> "namaste, aap kaise hain?"
- "I'm sorry" -> "maf kijiye"
- "I have fever" -> "mujhe bukhar hai"

Use only ASCII characters. Provide healthcare guidance in Hindi transliteration.`,

  // Native script prompts
  te: `You are a Telugu healthcare assistant. Respond only in Telugu script. Provide medical guidance in Telugu.`,
  hi: `You are a Hindi healthcare assistant. Respond only in Hindi (Devanagari script). Provide medical guidance in Hindi.`,
  ta: `You are a Tamil healthcare assistant. Respond only in Tamil script. Provide medical guidance in Tamil.`,
  or: `You are an Odia healthcare assistant. Respond only in Odia script. Provide medical guidance in Odia.`,
  
  // Default English
  en: `You are a multilingual healthcare assistant. Provide medical guidance in English. Always include safety disclaimers and recommend consulting healthcare professionals for serious symptoms.`
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