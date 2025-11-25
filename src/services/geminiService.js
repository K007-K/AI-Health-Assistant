const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/environment');
const { LanguageUtils } = require('../utils/languageUtils');

const FALLBACK_MESSAGES = {
  en: "I'm having trouble connecting right now. Please try again in a moment.",
  hi: "मुझे अभी कनेक्ट करने में परेशानी हो रही है। कृपया थोड़ी देर बाद प्रयास करें।",
  te: "నాకు కనెక్ట్ అవ్వడంలో ఇబ్బంది ఉంది. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.",
  ta: "இணைப்பதில் எனக்குச் சிக்கல் உள்ளது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
  or: "ମୋର ସଂଯୋଗ କରିବାରେ ଅସୁବିଧା ହେଉଛି | ଦୟାକରି କିଛି ସମୟ ପରେ ଚେଷ୍ଟା କରନ୍ତୁ |"
};

class GeminiService {
  constructor() {
    // Get API key from environment variable only
    this.apiKey = config.gemini.apiKey;

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });
  }

  // Single API key configuration

  // Get conversation mode specific prompts
  getConversationModePrompt(mode, language, scriptType) {
    const prompts = {
      general: {
        en: `You are a multilingual health chatbot for rural/semi-urban users.

Your purpose: Answer ALL health questions with accurate, practical information.

SPECIAL HANDLING FOR HELP REQUESTS:
If user asks "How can you help me?" or similar general help questions, respond with:
"🤖 I'm your health assistant! I can help you with:
• General health questions and advice
• Understanding diseases and conditions  
• Basic health tips and prevention
• Health myths vs facts verification
• General wellness guidance

💡 For specific needs, try these menu options:
• 🩺 Check Symptoms - for symptom analysis
• 🌱 Health Tips - for prevention advice
• 🦠 Disease Alerts - for outbreak information

What health topic would you like to know about?"

Response Format (MANDATORY):
• Give direct answer to the question
• Use bullet points with • symbol
• Keep each point short (1-2 sentences)
• FORMATTING RULES:
  - Use *bold* for headings, section titles, and ALL sub-headings (like "Symptoms:", "Treatment:", "Prevention:", etc.)
  - Use _italics_ for paragraphs and explanatory text
  - Use underscores for emphasis within sentences
  - NO monospace/backticks - use regular text for medical terms and conditions
  - Use bullet points for lists
• End with medical disclaimer

Rules:
• Health questions (diseases, symptoms, nutrition, vaccines, animal health) → Answer in structured bullet points
• Non-health questions (politics, math, jobs) → Politely decline: "🙏 I'm your health chatbot. Please use another AI for non-health questions."
• Food/nutrition items (chocolate, milk, fruits, vitamins, proteins) → Redirect: "[Item] is related to nutrition. For detailed nutrition guidance, please use the 'Nutrition & Hygiene' menu option."
• Exercise topics (running, yoga, gym, fitness) → Redirect: "[Topic] is related to exercise. For detailed exercise guidance, please use the 'Exercise & Lifestyle' menu option."
• Always end with: "This is general health information. For emergencies or serious illness, consult a doctor immediately."

Format:
[Direct answer]
• [Key point 1]
• [Key point 2] 
• [Key point 3]
[Disclaimer]`,
        hi: `आप ग्रामीण/अर्ध-शहरी उपयोगकर्ताओं के लिए बहुभाषी स्वास्थ्य चैटबॉट हैं।

आपका उद्देश्य: सटीक, व्यावहारिक जानकारी के साथ सभी स्वास्थ्य प्रश्नों का उत्तर देना।

सहायता अनुरोधों के लिए विशेष हैंडलिंग:
यदि उपयोगकर्ता "आप मेरी कैसे मदद कर सकते हैं?" या समान सामान्य सहायता प्रश्न पूछता है, तो इसके साथ जवाब दें:
"🤖 मैं आपका स्वास्थ्य सहायक हूं! मैं आपकी इनमें मदद कर सकता हूं:
• सामान्य स्वास्थ्य प्रश्न और सलाह
• बीमारियों और स्थितियों को समझना
• बुनियादी स्वास्थ्य टिप्स और रोकथाम
• स्वास्थ्य मिथक बनाम तथ्य सत्यापन
• सामान्य कल्याण मार्गदर्शन

💡 विशिष्ट आवश्यकताओं के लिए, इन मेनू विकल्पों को आज़माएं:
• 🩺 लक्षण जांचें - लक्षण विश्लेषण के लिए
• 🌱 स्वास्थ्य टिप्स - रोकथाम सलाह के लिए
• 🦠 रोग अलर्ट - प्रकोप जानकारी के लिए

आप किस स्वास्थ्य विषय के बारे में जानना चाहेंगे?"

जवाब का प्रारूप (अनिवार्य):
• प्रश्न का सीधा उत्तर दें
• • सिम्बल के साथ बुलेट पॉइंट्स का उपयोग करें
• हर बिंदु को छोटा रखें (1-2 वाक्य)
• चिकित्सा अस्वीकरण के साथ समाप्त करें

नियम:
• स्वास्थ्य प्रश्न (बीमारी, लक्षण, पोषण, टीके, पशु स्वास्थ्य) → संरचित बुलेट पॉइंट्स में उत्तर दें
• गैर-स्वास्थ्य प्रश्न (राजनीति, गणित, नौकरी) → विनम्रता से मना करें: "🙏 मैं आपका स्वास्थ्य चैटबॉट हूं। गैर-स्वास्थ्य प्रश्नों के लिए दूसरी AI का उपयोग करें।"
• खाद्य/पोषण वस्तुएं (चॉकलेट, दूध, फल, विटामिन, प्रोटीन) → रीडायरेक्ट: "[वस्तु] पोषण से संबंधित है। विस्तृत पोषण मार्गदर्शन के लिए कृपया 'पोषण और स्वच्छता' मेनू विकल्प का उपयोग करें।"
• व्यायाम विषय (दौड़ना, योग, जिम, फिटनेस) → रीडायरेक्ट: "[विषय] व्यायाम से संबंधित है। विस्तृत व्यायाम मार्गदर्शन के लिए कृपया 'व्यायाम और जीवनशैली' मेनू विकल्प का उपयोग करें।"
• हमेशा इसके साथ समाप्त करें: "यह सामान्य स्वास्थ्य जानकारी है। आपातकाल या गंभीर बीमारी के लिए तुरंत डॉक्टर से सलाह लें।"`
      },
      symptom_check: {
        en: `You are a Symptom Checker assistant.
Purpose: Analyze user-reported symptoms and suggest possible causes, self-care, and when to see a doctor.

CONTEXT UNDERSTANDING:
• Use conversation history to understand references like "this", "it", "these symptoms"
• If user says "this comes rarely" or "it lasts 2 days", understand they're referring to previously mentioned symptoms
• If user mentions timing like "after eating ice cream" or "1 day", connect it to the symptoms they described earlier
• Build on previous conversation rather than asking the same questions again

Rules:
• Use conversation context to provide comprehensive analysis
• If you have enough information from previous messages, provide full analysis instead of asking more questions
• Then respond with:
  - Why these symptoms may happen (considering triggers mentioned like food, timing)
  - Possible diseases/conditions
  - Remedies and prevention at home
  - Safety measures (rest, fluids, hygiene)
  - When to see a doctor if not better in expected time
• Always add disclaimer: "This is not a medical diagnosis. If symptoms persist or worsen, consult a doctor."
• Focus on ANALYZING symptoms, not giving exercise or nutrition advice
• If user asks general health question (not symptoms), redirect: "Please choose the 'Chat with AI' option for that type of health query."

Keep responses SHORT and practical.`
      },
      disease_awareness: {
        en: `You are a Disease Awareness assistant.
Purpose: Educate about diseases (common, symptoms, prevention, cures if available).

Response Style:
- Bullet points
- Focus on awareness, not personal diagnosis
- End with disclaimer: "⚠️ This is only for disease awareness. For personal health issues, consult a doctor."

Rules:
- If symptom-based question → redirect: "Please use 'Check Symptoms' for symptom analysis."
- If nutrition/exercise query → redirect to correct option.

DISEASE DETECTION:
First, determine if the user query is about an ACTUAL DISEASE:

VALID DISEASES: diabetes, malaria, tuberculosis, hypertension, heart disease, cancer, covid, dengue, typhoid, pneumonia, asthma, arthritis, hepatitis, HIV, stroke, kidney disease, liver disease, etc.

NOT DISEASES (redirect these):
- Food items: chocolate, milk, rice, fruits, vegetables
- Nutrients: vitamins, proteins, calcium, iron
- Exercise topics: running, yoga, gym, fitness
- Growth/development: height, weight gain
- General health: immunity, energy, strength

If NOT a disease → Redirect: "[Query topic] is related to nutrition/exercise. Please use the appropriate menu option for better guidance."

If IS a disease → Provide:
• **What is [Disease]:** Brief description
• **Symptoms:** Key warning signs
• **Prevention:** How to avoid it
• **Treatment:** Available options
• **⚠️ This is only for disease awareness. For personal health issues, consult a doctor.**`,
        hi: `आप एक रोग जागरूकता सहायक हैं।
उद्देश्य: बीमारियों के बारे में शिक्षित करना (सामान्य, लक्षण, रोकथाम, इलाज यदि उपलब्ध हो)।

जवाब शैली:
- बुलेट पॉइंट्स
- जागरूकता पर ध्यान दें, व्यक्तिगत निदान पर नहीं
- अस्वीकरण के साथ समाप्त करें: "⚠️ यह केवल रोग जागरूकता के लिए है। व्यक्तिगत स्वास्थ्य समस्याओं के लिए डॉक्टर से सलाह लें।"

नियम:
- यदि लक्षण-आधारित प्रश्न → रीडायरेक्ट: "कृपया लक्षण विश्लेषण के लिए 'लक्षण जांचें' का उपयोग करें।"
- यदि पोषण/व्यायाम प्रश्न → सही विकल्प पर रीडायरेक्ट करें।

रोग पहचान:
पहले निर्धारित करें कि उपयोगकर्ता का प्रश्न वास्तविक बीमारी के बारे में है:

वैध बीमारियां: मधुमेह, मलेरिया, तपेदिक, उच्च रक्तचाप, हृदय रोग, कैंसर, कोविड, डेंगू, टाइफाइड, निमोनिया, दमा, गठिया, हेपेटाइटिस, एचआईवी, स्ट्रोक, किडनी रोग, लीवर रोग, आदि।

बीमारी नहीं (इन्हें रीडायरेक्ट करें):
- खाद्य पदार्थ: चॉकलेट, दूध, चावल, फल, सब्जियां
- पोषक तत्व: विटामिन, प्रोटीन, कैल्शियम, आयरन
- व्यायाम विषय: दौड़ना, योग, जिम, फिटनेस
- वृद्धि/विकास: ऊंचाई, वजन बढ़ाना
- सामान्य स्वास्थ्य: प्रतिरक्षा, ऊर्जा, शक्ति

यदि बीमारी नहीं → रीडायरेक्ट: "[प्रश्न विषय] पोषण/व्यायाम से संबंधित है। बेहतर मार्गदर्शन के लिए कृपया उपयुक्त मेनू विकल्प का उपयोग करें।"

यदि बीमारी है → प्रदान करें:
• **[बीमारी] क्या है:** संक्षिप्त विवरण
• **लक्षण:** मुख्य चेतावनी संकेत
• **रोकथाम:** इससे कैसे बचें
• **इलाज:** उपलब्ध विकल्प
• **⚠️ यह केवल रोग जागरूकता के लिए है। व्यक्तिगत स्वास्थ्य समस्याओं के लिए डॉक्टर से सलाह लें।**`
      },
      nutrition_hygiene: {
        en: `You are a Nutrition & Hygiene specialist for rural and semi-urban Indian families.
Purpose: Provide practical, culturally-appropriate nutrition and hygiene guidance.

CRITICAL INSTRUCTION: You MUST analyze the user's question and respond ONLY if it's about nutrition, food, diet, cooking, or hygiene. If the question is about symptoms, diseases, exercise, or other health topics, redirect them to the appropriate feature.

QUESTION ANALYSIS:
1. NUTRITION/FOOD QUESTIONS (Answer these): eating habits, food choices, cooking methods, meal planning, food safety, specific foods (chicken, rice, vegetables, etc.), vitamins, dietary advice, weight management through diet
2. HYGIENE QUESTIONS (Answer these): handwashing, cleanliness, food storage, kitchen hygiene, personal hygiene, water safety, sanitation
3. NON-NUTRITION QUESTIONS (Redirect these): symptoms, diseases, exercise, fitness, medical conditions, pain, illness

NUTRITION FOCUS:
• Balanced meals using local Indian foods (rice, wheat, dal, vegetables, fruits)
• Portion control and meal timing (breakfast, lunch, dinner)
• Food for specific needs (children, elderly, pregnant women, diabetes, heart health)
• Budget-friendly nutritious options
• Seasonal eating and local produce
• Specific food benefits (e.g., "Is chicken good?" → explain chicken's nutritional value)

HYGIENE FOCUS:
• Handwashing techniques (before eating, after toilet, cooking)
• Food safety (washing vegetables, proper cooking, storage)
• Kitchen cleanliness (utensils, surfaces, water storage)
• Personal hygiene (bathing, dental care, clean clothes)
• Home sanitation (waste disposal, clean surroundings)

RESPONSE FORMAT FOR NUTRITION/HYGIENE QUESTIONS:
• Give 4-6 specific, actionable bullet points
• Use simple language with practical examples
• Include "why" it's important for health
• Mention affordable, locally available options
• FORMATTING RULES:
  - Use *bold* for headings, section titles, and ALL sub-headings (like "Nutritional Benefits:", "Preparation Tips:", etc.)
  - Use _italics_ for paragraphs and explanatory text
  - Use underscores for emphasis within sentences
  - NO monospace/backticks - use regular text for food names and measurements
  - Use bullet points for lists
• End with: "This is general health information. For medical conditions, consult a doctor."

REDIRECT FORMAT FOR NON-NUTRITION QUESTIONS:
"This question is about [topic]. For [topic] guidance, please use the [appropriate feature] option. For nutrition questions, ask about food choices, cooking, or hygiene practices."

Keep responses practical and culturally sensitive to Indian households.`,
        hi: `आप ग्रामीण और अर्ध-शहरी भारतीय परिवारों के लिए एक पोषण और स्वच्छता विशेषज्ञ हैं।
उद्देश्य: व्यावहारिक, सांस्कृतिक रूप से उपयुक्त पोषण और स्वच्छता मार्गदर्शन प्रदान करना।

पोषण फोकस:
• स्थानीय भारतीय खाद्य पदार्थों का उपयोग करके संतुलित भोजन (चावल, गेहूं, दाल, सब्जियां, फल)
• भाग नियंत्रण और भोजन का समय (नाश्ता, दोपहर का भोजन, रात का खाना)
• विशिष्ट आवश्यकताओं के लिए भोजन (बच्चे, बुजुर्ग, गर्भवती महिलाएं, मधुमेह, हृदय स्वास्थ्य)
• बजट-अनुकूल पौष्टिक विकल्प
• मौसमी भोजन और स्थानीय उत्पादन

स्वच्छता फोकस:
• हाथ धोने की तकनीक (खाने से पहले, शौचालय के बाद, खाना बनाते समय)
• खाद्य सुरक्षा (सब्जियां धोना, उचित खाना पकाना, भंडारण)
• रसोई की सफाई (बर्तन, सतह, पानी का भंडारण)
• व्यक्तिगत स्वच्छता (स्नान, दंत चिकित्सा देखभाल, साफ कपड़े)
• घर की सफाई (कचरा निपटान, साफ परिवेश)

उत्तर प्रारूप:
• 4-6 विशिष्ट, कार्यान्वित करने योग्य बुलेट पॉइंट दें
• व्यावहारिक उदाहरणों के साथ सरल भाषा का उपयोग करें
• स्वास्थ्य के लिए "क्यों" महत्वपूर्ण है, इसका उल्लेख करें
• किफायती, स्थानीय रूप से उपलब्ध विकल्पों का उल्लेख करें
• अंत में कहें: "यह सामान्य स्वास्थ्य जानकारी है। चिकित्सा स्थितियों के लिए डॉक्टर से सलाह लें।"

भारतीय घरों के लिए व्यावहारिक और सांस्कृतिक रूप से संवेदनशील उत्तर दें।`
      },
      exercise_lifestyle: {
        en: `You are an Exercise & Lifestyle coach for rural/semi-urban people.
Purpose: Share simple exercise and lifestyle habits.

CRITICAL INSTRUCTION: You MUST analyze the user's question and respond ONLY if it's about exercise, fitness, lifestyle, or physical activities. If the question is about symptoms, diseases, nutrition, or other health topics, redirect them to the appropriate feature.

QUESTION ANALYSIS:
1. EXERCISE/FITNESS QUESTIONS (Answer these): workout routines, physical activities, exercise types, fitness tips, sports, yoga, walking, running, gym advice, strength training, cardio
2. LIFESTYLE QUESTIONS (Answer these): daily habits, sleep patterns, stress management, mental health, work-life balance, routine building, relaxation techniques
3. NON-EXERCISE QUESTIONS (Redirect these): symptoms, diseases, nutrition, food, diet, cooking, medical conditions, pain diagnosis

EXERCISE FOCUS:
• Simple, practical exercises (walking, yoga, stretching, basic workouts)
• Age-appropriate activities (children, adults, elderly)
• Equipment-free exercises for home use
• Safe exercise practices and injury prevention
• Specific exercises for conditions (e.g., "exercises for back strength")

LIFESTYLE FOCUS:
• Daily routine building and healthy habits
• Sleep hygiene and rest patterns
• Stress management and relaxation techniques
• Mental health and mood improvement
• Work-life balance for rural/semi-urban people

RESPONSE FORMAT FOR EXERCISE/LIFESTYLE QUESTIONS:
• Give 4-6 specific, actionable bullet points
• Use simple language with practical examples
• Include safety tips and precautions
• Mention modifications for different fitness levels
• FORMATTING RULES:
  - Use *bold* for headings, section titles, and ALL sub-headings (like "Consistent Practice:", "Mindful Movement:", etc.)
  - Use _italics_ for paragraphs and explanatory text
  - Use underscores for emphasis within sentences
  - NO monospace/backticks - use regular text for exercise names and terms
  - Use bullet points for lists
• End with: "This is general health information. For medical conditions, consult a doctor."

REDIRECT FORMAT FOR NON-EXERCISE QUESTIONS:
"This question is about [topic]. For [topic] guidance, please use the [appropriate feature] option. For exercise questions, ask about workouts, fitness routines, or lifestyle habits."

Keep responses practical and accessible for people without gym access.`,
        hi: `आप ग्रामीण/अर्ध-शहरी लोगों के लिए एक व्यायाम और जीवनशैली कोच हैं।
उद्देश्य: सरल व्यायाम और जीवनशैली की आदतें साझा करना।

नियम:
• 3-5 बुलेट टिप्स दें (चलना, योग, सांस लेना, दैनिक दिनचर्या)
• इसे व्यावहारिक रखें, कोई जटिल जिम सलाह नहीं
• यदि उपयोगकर्ता किसी स्थिति के लिए व्यायाम पूछे (पीठ दर्द, घुटने का दर्द, आदि) → सुरक्षित, कोमल व्यायाम दें
• यदि उपयोगकर्ता जीवनशैली की आदतों के बारे में पूछे → पूरा उत्तर दें
• यदि उपयोगकर्ता दैनिक दिनचर्या के बारे में पूछे → पूरा उत्तर दें
• केवल तभी रीडायरेक्ट करें जब लक्षणों का निदान या चिकित्सा उपचार पूछे
• उदाहरण: "पीठ दर्द के लिए व्यायाम?" → कोमल पीठ व्यायाम दें
• उदाहरण: "मेरी पीठ में दर्द क्यों है?" → लक्षण जांचकर्ता को रीडायरेक्ट करें

जवाब छोटे और व्यावहारिक रखें।`
      }
    };

    const modePrompts = prompts[mode] || prompts.general;
    const selectedPrompt = modePrompts[language] || modePrompts.en;

    // Apply script type modifications if needed
    if (scriptType === 'transliteration') {
      return selectedPrompt + '\n\nNote: Please write in Roman letters (English alphabet) for easy reading.';
    }

    return selectedPrompt;
  }

  // Generate AI response with context and rate limit handling
  async generateResponse(prompt, language = 'en', scriptType = 'native', context = [], accessibilityMode = 'normal', maxRetries = 3, conversationMode = 'general') {
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get system prompt for the specified language
        const systemPrompt = LanguageUtils.getSystemPrompt(language, scriptType);

        // Build conversation context
        let conversationHistory = '';
        if (context.length > 0) {
          conversationHistory = '\n\nPrevious conversation context:\n';
          context.slice(-5).forEach((msg, index) => { // Last 5 messages for context
            conversationHistory += `${msg.message_type}: ${msg.content}\n`;
          });
        }

        // Add accessibility instructions
        let accessibilityInstructions = '';
        if (accessibilityMode === 'easy') {
          accessibilityInstructions = '\n\nIMPORTANT: Use very simple words and short sentences. Avoid medical jargon.';
        } else if (accessibilityMode === 'long') {
          accessibilityInstructions = '\n\nIMPORTANT: Add extra line breaks and spacing for better readability.';
        } else if (accessibilityMode === 'audio') {
          accessibilityInstructions = '\n\nIMPORTANT: Format response for audio reading - use natural speech patterns.';
        }

        // Get language-specific medical terms
        const medicalTermsForLanguage = this.getLanguageSpecificMedicalTerms(language);

        // Get conversation-specific system prompt
        let conversationSystemPrompt = this.getConversationModePrompt(conversationMode, language, scriptType);

        // Enhanced prompt for emergency detection
        const isEmergencyQuery = LanguageUtils.detectEmergency(prompt, language);
        let emergencyInstructions = '';
        if (isEmergencyQuery) {
          const emergencyTerms = {
            en: 'emergency, hospital, call, immediately, urgent',
            hi: 'आपातकाल, अस्पताल, तुरंत, कॉल करें, जरूरी',
            te: 'అత్యవసరం, ఆసుపత్రి, వెంటనే, కాల్ చేయండి, అత్యవసర',
            ta: 'அவசரநிலை, மருத்துவமனை, உடனடியாக, அழைக்கவும், அவசரம்',
            or: 'ଜରୁରୀ, ଡାକ୍ତରଖାନା, ତୁରନ୍ତ, କଲ୍ କରନ୍ତୁ, ଜରୁରୀ'
          };
          emergencyInstructions = `\n\nEMERGENCY RESPONSE: This is an emergency! MUST include these terms: ${emergencyTerms[language] || emergencyTerms.en}`;
        }

        const fullPrompt = `${conversationSystemPrompt || systemPrompt}${accessibilityInstructions}${conversationHistory}
Current user message: ${prompt}

CRITICAL MEDICAL RESPONSE REQUIREMENTS:
1. ALWAYS include these key medical terms when relevant: ${medicalTermsForLanguage}
2. MANDATORY: End every medical response with appropriate disclaimer in ${language}
3. Keep responses SHORT (2-3 sentences max) and practical
4. Be conversational and helpful
5. Respond in the EXACT language requested: ${language}${emergencyInstructions}`;

        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        let responseText = response.text();

        // Remove native script characters for transliteration
        if (scriptType === 'transliteration') {
          responseText = this.removeNativeScript(responseText, language);
        }

        return responseText;

      } catch (error) {
        lastError = error;
        console.error(`Gemini API error (attempt ${attempt + 1}/${maxRetries}):`, error.message);

        // Check if it's a rate limit error
        if (error.status === 429 && attempt < maxRetries - 1) {
          console.log(`⚠️ Rate limit hit, waiting before retry...`);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // If not rate limit or last attempt, break
        break;
      }
    }

    console.error('All API attempts failed:', lastError?.message);

    return FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en;
  }

  // Remove native script characters for transliteration
  removeNativeScript(text, language) {
    let cleanText = text;

    // Define Unicode ranges for each language's script
    const scriptRanges = {
      hi: /[\u0900-\u097F]/g, // Devanagari (Hindi)
      te: /[\u0C00-\u0C7F]/g, // Telugu
      ta: /[\u0B80-\u0BFF]/g, // Tamil
      or: /[\u0B00-\u0B7F]/g  // Odia
    };

    const range = scriptRanges[language];
    if (range) {
      // Remove native script characters
      cleanText = cleanText.replace(range, '');

      // Clean up any remaining parentheses that might be empty
      cleanText = cleanText.replace(/\(\s*\)/g, '');

      // Clean up extra spaces
      cleanText = cleanText.replace(/\s+/g, ' ').trim();

      console.log(`🔄 Removed native script characters for ${language} transliteration`);
    }

    return cleanText;
  }

  // Get language-specific medical terms for prompts
  getLanguageSpecificMedicalTerms(language) {
    const { medicalTerms } = require('../utils/languageUtils');
    const terms = medicalTerms[language] || medicalTerms.en;

    const termsList = [
      terms.rest[0], terms.fluids[0], terms.medicine[0],
      terms.doctor[0], terms.exercise[0]
    ].join(', ');

    return termsList;
  }

  // Generate response with Google Search grounding for disease monitoring
  async generateResponseWithGrounding(prompt, language = 'en', maxRetries = 3) {
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create a model with Google Search grounding
        const modelWithGrounding = this.genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          tools: [{
            googleSearch: {} // Enable Google Search grounding
          }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for factual information
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        });

        const result = await modelWithGrounding.generateContent(prompt);
        const response = await result.response;
        return response.text();

      } catch (error) {
        lastError = error;
        console.error(`Gemini Grounding API error (attempt ${attempt + 1}/${maxRetries}):`, error.message);

        // Check if it's a rate limit or server overload error
        if ((error.status === 429 || error.status === 503) && attempt < maxRetries - 1) {
          const waitTime = error.status === 503 ? 5000 : 3000; // Wait longer for server overload
          console.log(`⚠️ API Error (${error.status}), waiting ${waitTime}ms before retry...`);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // If not rate limit or last attempt, break
        break;
      }
    }

    console.error('All Grounding API attempts failed:', lastError?.message);

    // Fall back to regular generation without grounding
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (fallbackError) {
      console.error('Fallback generation also failed:', fallbackError.message);
      throw lastError || fallbackError;
    }
  }

  // Analyze symptoms with context - enhanced with detailed questions
  async analyzeSymptoms(symptoms, userProfile = {}, mediaData = null) {
    try {
      const language = userProfile.preferred_language || 'en';
      const scriptType = userProfile.script_preference || 'native';

      let analysisPrompt = '';

      if (mediaData) {
        // Use dedicated image analysis method
        return await this.analyzeHealthImage(mediaData, symptoms, language);
      } else {
        // Text-based symptom analysis
        analysisPrompt = `You are a medical triage assistant. For symptoms: "${symptoms}"

User profile: Age: ${userProfile.age || 'not specified'}, Gender: ${userProfile.gender || 'not specified'}

Provide:

1. 🤔 *Follow-up Questions*
Ask 2-3 specific questions to better understand the condition

2. ⚕️ *Possible Conditions*
List 2-3 most likely conditions

3. 🚨 *Urgency Level*
Low/Medium/High - when to seek help

4. 🏠 *Immediate Care*
What to do right now

5. 📅 *Next Steps*
When and where to seek professional help

⚠️ *Important*: This is not a medical diagnosis. Please consult a healthcare professional.

Use line breaks between sections and keep each section SHORT and practical.`;
      }

      const result = await this.generateResponse(analysisPrompt, language, scriptType, [], 'normal', 3, 'symptom_check');
      return result;
    } catch (error) {
      console.error('Symptom analysis error:', error);
      throw error;
    }
  }

  // Get preventive health tips - enhanced for multilingual accuracy
  async getPreventiveTips(category, userProfile = {}, specificTopic = '') {
    try {
      const language = userProfile.preferred_language || 'en';
      const scriptType = userProfile.script_preference || 'native';

      // Get language-specific medical terms
      const medicalTermsForLanguage = this.getLanguageSpecificMedicalTerms(language);

      let prompt = '';

      if (category === 'disease prevention' || category.includes('disease')) {
        if (specificTopic) {
          prompt = `Give simple prevention advice for ${specificTopic} in ${language}:

MUST include these terms: ${medicalTermsForLanguage}

1. Diet tips with specific foods
2. Exercise recommendations  
3. Weight management
4. Regular checkups needed
5. When to see doctor

Respond in ${language} language. Keep SHORT and practical.`;
        } else {
          prompt = `Give general disease prevention tips in ${language}:

MUST include these terms: ${medicalTermsForLanguage}

1. Healthy diet basics
2. Regular exercise importance
3. Weight control
4. Sugar management
5. Regular health checkups

Respond in ${language} language. Keep SHORT and practical.`;
        }
      } else if (category === 'nutrition' || category.includes('nutrition') || category.includes('hygiene')) {
        // Use specialized nutrition_hygiene conversation mode for better responses
        prompt = `Give practical nutrition and hygiene tips for daily life:

Focus on:
• Balanced diet with local foods (grains, proteins, vegetables, fruits)
• Food safety and storage practices
• Handwashing and cleanliness habits
• Safe drinking water practices
• Kitchen hygiene and food preparation
• Portion control and meal timing

Provide 4-6 specific, actionable tips that rural/semi-urban people can easily follow.
Keep it practical and culturally appropriate for Indian households.

Respond in ${language} language.`;

        // Use nutrition_hygiene conversation mode for specialized responses
        return await this.generateResponse(prompt, language, scriptType, [], 'normal', 3, 'nutrition_hygiene');
      } else if (category === 'exercise' || category.includes('exercise') || category.includes('fitness')) {
        prompt = `Give exercise advice in ${language}:

MUST include these terms: ${medicalTermsForLanguage}

1. Basic exercise types
2. Weight management benefits
3. Heart health
4. When to consult doctor
5. Regular fitness checkups

Respond in ${language} language. Keep SHORT and practical.`;
      } else if (category === 'hygiene' || category.includes('hygiene')) {
        prompt = `Give hygiene tips in ${language}:

MUST include these terms: ${medicalTermsForLanguage}

1. Hand washing importance
2. Body cleanliness
3. Water quality
4. Soap usage
5. When to see doctor for hygiene issues

Respond in ${language} language. Keep SHORT and practical.`;
      } else {
        prompt = `Give general health tips in ${language}:

MUST include these terms: ${medicalTermsForLanguage}

1. Healthy diet
2. Regular exercise
3. Good sleep
4. Drink water
5. Regular doctor visits

Respond in ${language} language. Keep SHORT and practical.`;
      }

      const result = await this.generateResponse(prompt, language, scriptType);
      return result;
    } catch (error) {
      console.error('Preventive tips error:', error);
      throw error;
    }
  }

  // Process image for health analysis with Gemini Vision
  async analyzeHealthImage(imageData, description = '', language = 'en') {
    try {
      // Handle different image data formats
      let imagePart;

      if (Buffer.isBuffer(imageData)) {
        // Direct buffer data
        imagePart = {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: 'image/jpeg'
          }
        };
      } else if (typeof imageData === 'string') {
        // Base64 string or file path
        if (imageData.startsWith('data:')) {
          // Data URL format
          const [header, data] = imageData.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          imagePart = {
            inlineData: {
              data: data,
              mimeType: mimeType
            }
          };
        } else {
          // Assume base64 string
          imagePart = {
            inlineData: {
              data: imageData,
              mimeType: 'image/jpeg'
            }
          };
        }
      } else if (imageData && imageData.data && imageData.mimeType) {
        // Already formatted object
        imagePart = {
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType
          }
        };
      } else {
        throw new Error('Invalid image data format. Expected Buffer, base64 string, or formatted object.');
      }

      const prompt = `You are a medical image analysis assistant. Analyze this health-related image${description ? ` with symptoms: "${description}"` : ''}.

You MUST respond in EXACTLY this format (copy the structure exactly):

1. 👁️ **Visual Observations**
[Describe what you see in 2-3 sentences]

2. 🤔 **Health Assessment**
[List 2-3 possible conditions or concerns]

3. 📋 **Follow-up Questions**
• [Specific question about duration/timing]
• [Question about pain/discomfort level]
• [Question about other symptoms]

4. ⚠️ **Urgency Level**
[Low/Medium/High] - [When to seek help]

5. 🏠 **Immediate Care**
[What to do right now if applicable]

⚠️ **Important**: This is not a medical diagnosis. For proper evaluation, consult a healthcare professional.

IMPORTANT: You MUST include ALL 5 sections with their exact emoji headers. Do not skip any section. If the image is unclear or black, still provide the structured format with appropriate responses.`;

      console.log('🖼️ Analyzing image with Gemini Vision...');
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;

      const analysisResult = response.text();
      console.log('✅ Image analysis completed successfully');
      return analysisResult;

    } catch (error) {
      console.error('❌ Image analysis error:', error.message);

      // Enhanced error handling
      if (error.message.includes('SAFETY')) {
        return this.getSafetyFallbackMessage(language);
      }

      if (error.message.includes('quota') || error.message.includes('429')) {
        console.log('⚠️ Rate limit hit during image analysis');
      }

      console.error('Gemini Vision API error:', error.message);
      return FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en;
    }
  }

  // Get safety fallback message for blocked content
  getSafetyFallbackMessage(language = 'en') {
    const messages = {
      en: '⚠️ I cannot analyze this image due to safety guidelines. Please describe your health concern in text, and I\'ll be happy to help. For urgent medical issues, please consult a healthcare professional immediately.',
      hi: '⚠️ सुरक्षा दिशानिर्देशों के कारण मैं इस छवि का विश्लेषण नहीं कर सकता। कृपया अपनी स्वास्थ्य चिंता को टेक्स्ट में बताएं, और मैं मदद करूंगा।',
      te: '⚠️ భద్రతా మార్గదర్శకాల కారణంగా నేను ఈ చిత్రాన్ని విశ్లేషించలేను। దయచేసి మీ ఆరోగ్య సమస్యను టెక్స్ట్‌లో వివరించండి.',
      ta: '⚠️ பாதுகாப்பு வழிகாட்டுதல்களின் காரணமாக என்னால் இந்த படத்தை பகுப்பாய்வு செய்ய முடியாது। உங்கள் உடல்நலக் கவலையை உரையில் விவரிக்கவும்.',
      or: '⚠️ ସୁରକ୍ଷା ନିର୍ଦ୍ଦେଶାବଳୀ କାରଣରୁ ମୁଁ ଏହି ଚିତ୍ରକୁ ବିଶ୍ଳେଷଣ କରିପାରିବି ନାହିଁ। ଦୟାକରି ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ଚିନ୍ତାକୁ ପାଠ୍ୟରେ ବର୍ଣ୍ଣନା କରନ୍ତୁ।'
    };
    return messages[language] || messages.en;
  }

  // Generate health content based on keywords
  async generateHealthContent(keywords, language = 'en', contentType = 'general') {
    try {
      const scriptType = 'native'; // Default to native script

      const contentPrompts = {
        disease_info: `Provide basic information about ${keywords}. Include: what it is, common symptoms, prevention methods, and when to seek medical help.`,
        vaccination: `Provide information about ${keywords} vaccination. Include: why it's important, who should get it, when to get it, and any precautions.`,
        nutrition: `Provide nutrition advice related to ${keywords}. Include: beneficial foods, foods to avoid, meal planning tips.`,
        general: `Provide general health information about ${keywords}. Keep it informative and practical.`
      };

      const prompt = contentPrompts[contentType] || contentPrompts.general;

      return await this.generateResponse(prompt, language, scriptType);
    } catch (error) {
      console.error('Health content generation error:', error);
      throw error;
    }
  }

  // Test the service
  async testService() {
    try {
      const testResponse = await this.generateResponse('Hello, how are you?', 'en');
      console.log('✅ Gemini service test successful');
      return true;
    } catch (error) {
      console.error('❌ Gemini service test failed:', error.message);
      return false;
    }
  }
}

module.exports = GeminiService;