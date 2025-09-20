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

  // Odia transliteration system prompt - SHORT and conversational
  or_trans: `You are a friendly Odia healthcare assistant. CRITICAL: Respond ONLY in Roman letters (English alphabet). ABSOLUTELY NO Odia script (ଓଡ़िଆ) characters allowed.

STRICT RULES:
- Think in Odia, but write ONLY in Roman letters (a-z, A-Z, 0-9)
- NO Odia script characters like: ଅ, ଆ, ଇ, ଈ, ଉ, ଊ, ଏ, ଐ, ଓ, କ, ଖ, ଗ, ଘ, etc.
- NO parentheses with Odia translations
- Keep responses SHORT (max 2-3 sentences)
- Be conversational and warm
- Use Odia words but write them in English letters only

EXAMPLE:
User: "mo mathaa byatha"
You: "Are mathaa byatha? Paracetamol khao, pani besi pio, bishraam karo. Doctor dekhao."

ABSOLUTELY CRITICAL: Use ONLY Roman letters (a-z, A-Z). NO Odia script characters whatsoever.`,

  // Hindi transliteration system prompt - BULLET POINTS and pure Hindi
  hi_trans: `You are a friendly Hindi healthcare assistant. CRITICAL: Respond ONLY in Roman letters (English alphabet). ABSOLUTELY NO Hindi script (देवनागरी) characters allowed. ABSOLUTELY NO ENGLISH words.

STRICT RULES:
- Think in Hindi, write ONLY in Roman letters (a-z, A-Z, 0-9)
- NO Hindi script characters like: आ, इ, ई, उ, ऊ, ए, ऐ, ओ, औ, क, ख, ग, घ, etc.
- NO English words like: "general health information", "For emergencies", "consult a doctor"
- Use ONLY Hindi words written in Roman letters
- Format responses with bullet points using •
- Keep each point short and clear
- Be conversational and warm

FORMAT EXAMPLE:
User: "mujhe sar dard hai"
You: "• Sar dard ke liye paracetamol lo
• Paani zyada piyo, aaram karo
• Roz vyayam karo
• Doctor se milo"

ABSOLUTELY CRITICAL: Use ONLY Hindi words in Roman letters. NO English words whatsoever.`,

  // Telugu transliteration system prompt - BULLET POINTS and pure Telugu
  te_trans: `You are a friendly Telugu healthcare assistant. CRITICAL: Respond ONLY in Roman letters (English alphabet). ABSOLUTELY NO Telugu script (తెలుగు) characters allowed. ABSOLUTELY NO ENGLISH words.

STRICT RULES:
- Think in Telugu, write ONLY in Roman letters (a-z, A-Z, 0-9)
- NO Telugu script characters like: అ, ఆ, ఇ, ఈ, ఉ, ఊ, ఎ, ఏ, ఐ, క, ఖ, గ, ఘ, etc.
- NO English words like: "general health information", "For emergencies", "consult a doctor"
- Use ONLY Telugu words written in Roman letters
- Format responses with bullet points using •
- Keep each point short and clear
- Be conversational and warm

FORMAT EXAMPLE:
User: "naku tala noppi undi"
You: "• Tala noppi ante paracetamol teesukondi
• Neeru ekkuva tagandi, vishranti cheyyandi  
• Roju vyayamam cheyyandi
• Vaidyudini chudandi"

ABSOLUTELY CRITICAL: Use ONLY Telugu words in Roman letters. NO English words whatsoever.`,

  // Tamil transliteration system prompt - SHORT and conversational
  ta_trans: `You are a friendly Tamil healthcare assistant. CRITICAL: Respond ONLY in Roman letters (English alphabet). ABSOLUTELY NO Tamil script (தமिழ्) characters allowed.

STRICT RULES:
- Think in Tamil, but write ONLY in Roman letters (a-z, A-Z, 0-9)
- NO Tamil script characters like: அ, ஆ, இ, ஈ, உ, ஊ, எ, ஏ, ஐ, க, ஖, ஗, ஘, etc.
- NO parentheses with Tamil translations
- Keep responses SHORT (max 2-3 sentences)
- Be conversational and warm
- Use Tamil words but write them in English letters only

EXAMPLE:
User: "enakku thalai vali irukku"
You: "Arre thalai vali aa? Paracetamol sapdunga, thanni adhigam kudunga, oyvu edunga. Doctor parunga."

ABSOLUTELY CRITICAL: Use ONLY Roman letters (a-z, A-Z). NO Tamil script characters whatsoever.`,

  // Native script prompts - BULLET POINTS format with pure language
  te: `You are a friendly Telugu healthcare assistant. Respond ONLY in Telugu script. NO English words allowed.

STRICT RULES:
- Think and respond completely in Telugu
- NO English words like "general health information", "For emergencies", "consult a doctor"
- Use bullet points with • for clear formatting
- Keep each point short and actionable
- Be conversational and warm

FORMAT EXAMPLE:
User asks about headache:
You: "• తలనోప్పికి పేరాసిటమాల్ తీసుకోండి
• నీరు ఎక్కువ తాగండి, విశ్రాంతి చేయండి
• రోజు వ్యాయామం చేయండి
• వైద్యుడిని చూడండి"

ABSOLUTELY CRITICAL: Use ONLY Telugu words. NO English words whatsoever.`,
  hi: `You are a friendly Hindi healthcare assistant. Respond ONLY in Hindi script. NO English words allowed.

STRICT RULES:
- Think and respond completely in Hindi
- NO English words like "general health information", "For emergencies", "consult a doctor"
- Use bullet points with • for clear formatting
- Keep each point short and actionable
- Be conversational and warm

FORMAT EXAMPLE:
User asks about headache:
You: "• सर दर्द के लिए पेरासिटामोल लें
• पानी ज्यादा पिएं, आराम करें
• रोज व्यायाम करें
• डॉक्टर से मिलें"

ABSOLUTELY CRITICAL: Use ONLY Hindi words. NO English words whatsoever.`,
  ta: `You are a friendly Tamil healthcare assistant. FIRST translate your complete response to Tamil, THEN respond in Tamil script. Keep responses SHORT (2-3 sentences), conversational, and helpful.

KEY RULES:
- Think and formulate complete response in Tamil
- Maintain proper Tamil sentence structure and context
- Be conversational and warm

MANDATORY: Include these Tamil medical terms when relevant: ஓய்வு (rest), தண்ணீர் (water), மருந்து (medicine), மருத்துவர் (doctor), உடற்பயிற்சி (exercise), உணவு (diet), எடை (weight), சர்க்கரை (sugar), பரிசோதனை (checkup).

For emergencies, MUST use: அவசரநிலை (emergency), மருத்துவமனை (hospital), உடனடியாக (immediately).

ALWAYS end with: ⚠️ சரியான நோயறிதல் மற்றும் சிகிச்சைக்கு சுகாதார நிபுணரை அணுகவும்.`,
  or: `You are a friendly Odia healthcare assistant. FIRST translate your complete response to Odia, THEN respond in Odia script. Keep responses SHORT (2-3 sentences), conversational, and helpful.

KEY RULES:
- Think and formulate complete response in Odia
- Maintain proper Odia sentence structure and context
- Be conversational and warm

MANDATORY: Include these Odia medical terms when relevant: ବିଶ୍ରାମ (rest), ପାଣି (water), ଔଷଧ (medicine), ଡାକ୍ତର (doctor), ବ୍ୟାୟାମ (exercise), ଖାଦ୍ୟ (diet), ଓଜନ (weight), ଚିନି (sugar), ପରୀକ୍ଷା (checkup), ନିଦ୍ରା (sleep).

For emergencies, MUST use: ଜରୁରୀ (emergency), ଡାକ୍ତରଖାନା (hospital), ତୁରନ୍ତ (immediately).

ALWAYS end with: ⚠️ ସଠିକ ନିଦ୍ରଣ ଏବଂ ଚିକିତ୍ସା ପାଇଁ ସ୍ୱାସ୍ଥ୍ୟ ବିଶେଷଜ୍ଞଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ।`,
  
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
    en: `👋 Hello! I am your Health Assistant.

How can I help you today? Choose an option:`,
    hi: `👋 नमस्ते! मैं आपका स्वास्थ्य सहायक हूं।

आज मैं आपकी कैसे मदद कर सकता हूं? एक विकल्प चुनें:`,
    te: `👋 హలో! నేను మీ ఆరోగ్య సహాయకుడిని।

ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను? ఒక ఎంపిక ఎంచుకోండి:`,
    ta: `👋 வணக்கம்! நான் உங்கள் சுகாதார உதவியாளர்.

இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்? ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்:`,
    or: `👋 ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ।

ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି? ଏକ ବିକଳ୍ପ ବାଛନ୍ତୁ:`,
    
    // Transliterated versions
    hi_trans: `👋 Namaste! Main aapka swasthya sahayak hun.

Aaj main aapki kaise madad kar sakta hun? Ek vikalp chuniye:`,
    te_trans: `👋 Hello! Nenu mee aarogya sahayakudini.

Eeroju nenu meeku ela sahayam cheyagalanu? Oka empik enchukondi:`,
    ta_trans: `👋 Vanakkam! Naan ungal sugaathaara uthaviyaalar.

Indru naan ungalukku eppadiyum uthava mudiyum? Oru viruppathai therndhedulkavum:`,
    or_trans: `👋 Namaskar! Mun aapankar swaasthya sahayak.

Aaji mun aapanku kipari sahaayya kariparibi? Eka bikalpa baachantu:`
  },

  language_success: {
    en: '✅ Language changed to English successfully!',
    hi: '✅ भाषा सफलतापूर्वक हिंदी में बदल गई!',
    te: '✅ భాష విజయవంతంగా తెలుగులో మారింది!',
    ta: '✅ மொழி வெற்றிகரமாக தமிழ் இல் மாற்றப்பட்டது!',
    or: '✅ ଭାଷା ସଫଳତାରେ ଓଡ଼ିଆରେ ବଦଳାଇଲା!',
    
    // Transliterated versions
    hi_trans: '✅ Bhaasha safaltaapurvak Hindi mein badal gayi!',
    te_trans: '✅ Bhaasha vijayavantamgaa Telugulo maarindi!',
    ta_trans: '✅ Mozhi vetrrikaramaaga Tamil il maattrappattathu!',
    or_trans: '✅ Bhaasha safaltaare Odiaaré badalailaaa!'
  },

  language_change_instruction: {
    en: '🔄 To change language later, just type "/language" at any time.',
    hi: '🔄 बाद में भाषा बदलने के लिए, कभी भी "/language" टाइप करें।',
    te: '🔄 తరువాత భాష మార్చాలి అనుకుంటే, ఏ సమయంలోనైనా "/language" టైప్ చేయండి।',
    ta: '🔄 பின்னர் மொழி மாற்ற வேண்டுமென்றால், ஏதைய நேरত்திலும் "/language" டైப் செய்யவும்।',
    or: '🔄 ପରે ଭାଷା ବଦଳାଇବା ପାଇଁ, ଯେ କୋଣସି ସମୟରେ "/language" ଟାଇପ୍ କରନ୍ତୁ।',
    
    // Transliterated versions
    hi_trans: '🔄 Baad mein bhaasha badalne ke liye, kabhi bhi "/language" type karen.',
    te_trans: '🔄 Taruvaata bhaasha maarchaali anukuante, ye samayamlonaainaa "/language" type cheyyandi.',
    ta_trans: '🔄 Pinnar mozhi maatra veendumendraal, ethaiya nerattilum "/language" type seyyavum.',
    or_trans: '🔄 Pare bhaasha badalaibaa paain, ye konasi samayare "/language" type karantu.'
  },

  feedback_thanks: {
    en: '✅ Thank you for your feedback! Your message has been sent to our team for review. We appreciate your input to help us improve the healthcare assistant.',
    hi: '✅ आपके फीडबैक के लिए धन्यवाद! आपका संदेश समीक्षा के लिए हमारी टीम को भेज दिया गया है। स्वास्थ्य सहायक को बेहतर बनाने में आपके योगदान की हम सराहना करते हैं।',
    te: '✅ మీ ఫీడ్‌బ్యాక్‌కు ధన్యవాదాలు! మీ సందేశం సమీక్ష కోసం మా బృందానికి పంపబడింది। ఆరోగ్య సహాయకుడిని మెరుగుపరచడంలో మీ సహాయాన్ని మేము అభినందిస్తున్నాము।',
    ta: '✅ உங்கள் கருத்துக்கு நன்றி! உங்கள் சந்தேசம் அவர்கள் குழுவுக்கு அனுப்பப்பட்டது. ஆரோக்கிய உதவியாளரை மேம்படுத்த உங்கள் உதவியை நாங்கள் பரிசீலிக்கிறோம்.',
    or: '✅ ଆପଣଙ୍କ ଫିଡବ୍ଯାକ ପାଇଁ ଧନ୍ଯବାଦ! ଆପଣଙ୍କ ସନ୍ଦେଶ ସମୀକ୍ଷା ପାଇଁ ଆମ ଟିମକୁ ପଠାଇ ଦେଇଛି। ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକକୁ ଉନ୍ନତ କରିବାରେ ଆପଣଙ୍କ ସାହାଯ୍ୟକୁ ଆମେ ପ୍ରଶଂସା କରୁଛୁ।',
    
    // Transliterated versions
    hi_trans: '✅ Aapke feedback ke liye dhanyawad! Aapka sandesh sameeksha ke liye hamari team ko bhej diya gaya hai. Swasthya sahayak ko behtar banane mein aapke yogdan ki ham sarahna karte hain.',
    te_trans: '✅ Mee feedback ku dhanyawadaalu! Mee sandesh sameeksha kosam maa brundaaniki pampabadindi. Aarogya sahayakudini meruguparachadamlo mee sahaayaanni maemu abhinandistunnaamu.',
    ta_trans: '✅ Ungal karutthukku nanri! Ungal santesam avargal kuzhuvukku anuppappattathu. Aarokkiya uthaviyaarai memppaduttha ungal uthaviyai naangal pariseelikkirom.',
    or_trans: '✅ Aapankar feedback paain dhanyabaad! Aapankar sandesh sameekshaa paain aam team ku pathaayi deichihi. Swaasthya sahayak ku unnata karibaaare aapankar sahaayya ku aame prashansaa karuchi.'
  },

  ai_chat_instructions: {
    en: `🤖 *AI Chat Mode Activated*

You can now chat freely with me! Ask any health questions.

💡 *Quick Commands:*
• Type "menu" or "मेनू" to return to main menu
• Type "/language" or "/भाषा" to change language

What would you like to know?`,
    hi: `🤖 *AI चैट मोड सक्रिय*

अब आप मुझसे स्वतंत्र रूप से चैट कर सकते हैं! कोई भी स्वास्थ्य प्रश्न पूछें।

💡 *त्वरित कमांड:*
• मुख्य मेनू पर वापस जाने के लिए "मेनू" टाइप करें
• भाषा बदलने के लिए "/भाषा" टाइप करें

आप क्या जानना चाहते हैं?`,
    te: `🤖 *AI చాట్ మోడ్ యాక్టివేట్ అయింది*

ఇప్పుడు మీరు నాతో స్వేచ్ఛగా చాట్ చేయవచ్చు! ఏదైనా ఆరోగ్య ప్రశ్నలు అడగండి।

💡 *త్వరిత కమాండ్స్:*
• మెయిన్ మెనూకు తిరిగి వెళ్లడానికి "మెను" టైప్ చేయండి
• భాష మార్చడానికి "/భాష" టైప్ చేయండి

మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?`,
    ta: `🤖 *AI சாட் பயன்முறை செயல்படுத்தப்பட்டது*

இப்போது நீங்கள் என்னுடன் சுதந்திரமாக அரட்டை அடிக்கலாம்! ஏதேனும் சுகாதார கேள்விகளைக் கேளுங்கள்।

💡 *விரைவு கட்டளைகள்:*
• பிரதான மெனுவிற்குத் திரும்ப "மெனு" என்று தட்டச்சு செய்யுங்கள்
• மொழியை மாற்ற "/மொழி" என்று தட்டச்சு செய்யுங்கள்

நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?`,
    or: `🤖 *AI ଚାଟ୍ ମୋଡ୍ ସକ୍ରିୟ*

ଏବେ ଆପଣ ମୋ ସହିତ ମୁକ୍ତ ଭାବରେ ଚାଟ୍ କରିପାରିବେ! କୌଣସି ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ।

💡 *ତୁରନ୍ତ କମାଣ୍ଡ:*
• ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବା ପାଇଁ "ମେନୁ" ଟାଇପ୍ କରନ୍ତୁ
• ଭାଷା ବଦଳାଇବା ପାଇଁ "/ଭାଷା" ଟାଇପ୍ କରନ୍ତୁ

ଆପଣ କଣ ଜାଣିବାକୁ ଚାହାଁନ୍ତି?`,
    
    // Transliterated versions
    hi_trans: `🤖 *AI Chat Mode Active*

Ab aap mujhse freely chat kar sakte hain! Koi bhi health question puchiye.

💡 *Quick Commands:*
• Main menu ke liye "menu" type kariye
• Language change ke liye "/bhasha" type kariye

Aap kya jaanna chahte hain?`,
    te_trans: `🤖 *AI Chat Mode Activate ayindi*

Ippudu meeru naatho freely chat cheyavachu! Edaina health questions adagandi.

💡 *Quick Commands:*
• Main menu ki velladaaniki "menu" type cheyandi
• Language marchudaaniki "/bhasha" type cheyandi

Meeru emi telusukovaali anukuntunnaru?`,
    ta_trans: `🤖 *AI Chat Mode Activate aayiduchu*

Ippudu neenga ennoda freely chat adippadalam! Edhaavadhu health questions kelunga.

💡 *Quick Commands:*
• Main menu ku poradhu "menu" type pannunga
• Language maatradhu "/mozhi" type pannunga

Neenga enna therinja konum?`,
    or_trans: `🤖 *AI Chat Mode Active*

Ebe aapan mo sahita mukta bhabare chat karipaariben! Kounasi swaasthya prashna pacharantu.

💡 *Quick Commands:*
• Mukhya menu ku pheribaa paain "menu" type karantu
• Bhaashaa badalaaibaa paain "/bhaashaa" type karantu

Aapan kana jaanibaku chahaanti?`
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

1️⃣ உடல்நலக் குறிப்புகள்
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
  },
  
  change_language: {
    en: `🌐 Language Settings

Select your preferred language:`,
    hi: `🌐 भाषा सेटिंग्स

अपनी पसंदीदा भाषा चुनें:`,
    te: `🌐 భాష సెట్టింగ్స్

మీ ఇష్టపడిన భాషను ఎంచుకోండి:`,
    ta: `🌐 மொழி அமைப்புகள்

உங்கள் விரும்பிய மொழியைத் தேர்ந்தெடுக்கவும்:`,
    or: `🌐 ଭାଷା ସେଟିଂଗସ୍

ଆପଣଙ୍କ ପସନ୍ଦୀଦା ଭାଷା ବାଛନ୍ତୁ:`
  }
};

// Emergency keywords in different languages
const emergencyKeywords = {
  en: ['emergency', 'severe pain', 'chest pain', 'can\'t breathe', 'heavy bleeding', 'unconscious', 'heart attack', 'stroke', 'difficulty breathing', 'help me', 'urgent', 'critical', 'dying', 'collapse'],
  hi: ['emergency', 'आपातकाल', 'गंभीर दर्द', 'सीने में दर्द', 'सांस नहीं आ रही', 'खून बह रहा', 'बेहोश', 'दिल का दौरा', 'stroke', 'मदद चाहिए', 'तुरंत मदद', 'गंभीर स्थिति', 'मरने वाला हूं'],
  te: ['emergency', 'అత్యవసర పరిస్థితి', 'తీవ్రమైన నొప్పి', 'ఛాతీ నొప్పి', 'ఊపిరి రాలేదు', 'రక్తస్రావం', 'అపస్మారక', 'గుండెపోటు', 'సహాయం కావాలి', 'తక్షణ సహాయం', 'తీవ్రమైన పరిస్థితి'],
  ta: ['emergency', 'அவசரநிலை', 'கடுமையான வலி', 'மார்பு வலி', 'மூச்சு விடமுடியவில்லை', 'அதிக இரத்தப்போக்கு', 'மயக்கம', 'உதவி வேண்டும்', 'உடனடி உதவி'],
  or: ['emergency', 'ଜରୁରୀ ଅବସ୍ଥା', 'ତୀବ୍ର ଯନ୍ତ୍ରଣା', 'ଛାତି ଯନ୍ତ୍ରଣା', 'ନିଶ୍ୱାସ ନେଇପାରୁନାହିଁ', 'ରକ୍ତସ୍ରାବ', 'ଚେତନାହୀନ', 'ସାହାଯ୍ୟ ଦରକାର']
};

// Medical terminology mappings for accuracy testing
const medicalTerms = {
  en: {
    rest: ['rest', 'sleep', 'relax'],
    fluids: ['fluids', 'water', 'liquids', 'drink'],
    medicine: ['medicine', 'paracetamol', 'medication', 'drugs'],
    doctor: ['doctor', 'physician', 'healthcare professional'],
    temperature: ['temperature', 'fever', 'heat'],
    exercise: ['exercise', 'workout', 'physical activity'],
    diet: ['diet', 'food', 'nutrition', 'eating'],
    weight: ['weight', 'body weight', 'obesity'],
    sugar: ['sugar', 'glucose', 'blood sugar'],
    checkup: ['checkup', 'examination', 'screening', 'test']
  },
  hi: {
    rest: ['आराम', 'विश्राम', 'सोना'],
    fluids: ['पानी', 'तरल पदार्थ', 'द्रव'],
    medicine: ['दवा', 'दवाई', 'पैरासिटामोल', 'औषधि'],
    doctor: ['डॉक्टर', 'चिकित्सक', 'वैद्य'],
    temperature: ['तापमान', 'बुखार', 'ज्वर'],
    exercise: ['व्यायाम', 'कसरत', 'शारीरिक गतिविधि'],
    diet: ['आहार', 'खाना', 'भोजन', 'पोषण'],
    weight: ['वजन', 'भार', 'मोटापा'],
    sugar: ['चीनी', 'शुगर', 'ग्लूकोज', 'मधुमेह'],
    checkup: ['जांच', 'परीक्षा', 'चेकअप', 'स्क्रीनिंग']
  },
  te: {
    rest: ['విశ్రాంతి', 'నిద్ర', 'రెస్ట్'],
    fluids: ['నీరు', 'ద్రవాలు', 'పానీయాలు'],
    medicine: ['మందు', 'ఔషధం', 'పారాసిటమాల్', 'పారాసెటమాల్'],
    doctor: ['వైద్యుడు', 'డాక్టర్', 'వైద్య నిపుణుడు'],
    temperature: ['వేడిమి', 'జ్వరం', 'ఫీవర్'],
    exercise: ['వ్యాయామం', 'కసరత్తు', 'శారీరక కార్యకలాపాలు'],
    diet: ['ఆహారం', 'భోజనం', 'పోషణ'],
    weight: ['బరువు', 'వెయిట్', 'ఊబకాయం'],
    sugar: ['చక్కెర', 'గ్లూకోజ్', 'మధుమేహం'],
    checkup: ['పరీక్ష', 'చెకప్', 'స్క్రీనింగ్']
  },
  ta: {
    rest: ['ஓய்வு', 'தூக்கம', 'ரெஸ்ட்'],
    fluids: ['தண்ணீర்', 'திரவங்கள்', 'பானங்கள்'],
    medicine: ['மருந்து', 'மருத்துவம்', 'பாராசிட்டமால்'],
    doctor: ['மருத்துவர்', 'டாக்டர்', 'வைத்தியர்'],
    temperature: ['வெப்பநிலை', 'காய்ச்சல்', 'ஃபீவர்'],
    exercise: ['உடற்பயிற்சி', 'வர்க்அவுட்', 'உடல் செயல்பாடு'],
    diet: ['உணவு', 'டயட்', 'ஊட்டச்சத்து'],
    weight: ['எடை', 'வெயிட்', 'உடல்பருமன்'],
    sugar: ['சர்க்கரை', 'குளுக்கோஸ்', 'நீரிழிவு'],
    checkup: ['பரிசோதனை', 'செக்அப்', 'ஸ்கிரீனிங்']
  },
  or: {
    rest: ['ବିଶ୍ରାମ', 'ନିଦ୍ରା', 'ରେଷ୍ଟ'],
    fluids: ['ପାଣି', 'ତରଳ ପଦାର୍ଥ', 'ପାନୀୟ'],
    medicine: ['ଔଷଧ', 'ଦବା', 'ପାରାସିଟାମୋଲ'],
    doctor: ['ଡାକ୍ତର', 'ଚିକିତ୍ସକ', 'ବୈଦ୍ୟ'],
    temperature: ['ତାପମାତ୍ରା', 'ଜ୍ୱର', 'ଫିଭର'],
    exercise: ['ବ୍ୟାୟାମ', 'କସରତ', 'ଶାରୀରିକ କାର୍ଯ୍ୟକଳାପ'],
    diet: ['ଖାଦ୍ୟ', 'ଆହାର', 'ପୋଷଣ'],
    weight: ['ଓଜନ', 'ଭାର', 'ମୋଟାପଣ'],
    sugar: ['ଚିନି', 'ଗ୍ଲୁକୋଜ', 'ମଧୁମେହ'],
    checkup: ['ପରୀକ୍ଷା', 'ଚେକଅପ', 'ସ୍କ୍ରୀନିଂ'],
    sleep: ['ନିଦ୍ରା', 'ଶୋଇବା', 'ଶୟନ'],
    water: ['ପାଣି', 'ଜଳ', 'ପାନୀୟ']
  }
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

  static getText(key, language = 'en', fallback = 'en', scriptType = 'native') {
    // Try transliterated version first if requested
    if (scriptType === 'transliteration' && language !== 'en') {
      const transKey = `${language}_trans`;
      if (textTemplates[key] && textTemplates[key][transKey]) {
        return textTemplates[key][transKey];
      }
    }
    
    // Fall back to native script version
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

  static getMedicalTerms(language = 'en') {
    return medicalTerms[language] || medicalTerms.en;
  }

  static checkMedicalTermsInText(text, language = 'en', requiredTerms = []) {
    const terms = this.getMedicalTerms(language);
    const lowerText = text.toLowerCase();
    const results = {};
    
    requiredTerms.forEach(termKey => {
      if (terms[termKey]) {
        const found = terms[termKey].some(term => 
          lowerText.includes(term.toLowerCase())
        );
        results[termKey] = found;
      }
    });
    
    return results;
  }
}

module.exports = {
  LanguageUtils,
  languages,
  systemPrompts,
  textTemplates,
  emergencyKeywords,
  medicalTerms
};