const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/environment');
const { LanguageUtils } = require('../utils/languageUtils');

class GeminiService {
  constructor() {
    // Multiple API keys for rate limit handling
    this.apiKeys = [
      config.gemini.apiKey,
      'AIzaSyARvtnLIBiwbe18CH9tYLlcp0E4ruX52Ys',
      'AIzaSyDUb0T2lN5hmNb_lUgvsz5S5ubt8iOLPH0',
      'AIzaSyDFD0X2EVlWhutR0gDflbKo1qUObWp2v3Y'
    ].filter(key => key && key.trim() !== '');
    
    this.currentKeyIndex = 0;
    this.genAI = new GoogleGenerativeAI(this.apiKeys[this.currentKeyIndex]);
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

  // Rotate to next API key when rate limited
  rotateApiKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.genAI = new GoogleGenerativeAI(this.apiKeys[this.currentKeyIndex]);
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
    console.log(`🔄 Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
  }

  // Get conversation mode specific prompts
  getConversationModePrompt(mode, language, scriptType) {
    const prompts = {
      general: {
        en: `You are a multilingual public health chatbot.
Your purpose: Answer ALL types of health-related queries (human AND animal).

Always respond in:
• Simple, short sentences
• Bullet points for clarity
• Rural/semi-urban friendly words
• Easy translations if user chose transliteration/script

Rules:
• If the question is about health, disease, nutrition, vaccines, or animal health → Answer fully
• If more details are needed (duration, triggers, history), ask politely
• Always end with disclaimer: "This is general health information. For emergencies or serious illness, consult a doctor immediately."
• If user asks something unrelated to health (politics, math, jobs) → Politely refuse: "🙏 I am your health chatbot for disease awareness & guidance. Please use another AI for your question."

Keep responses SHORT and practical.`,
        hi: `आप एक बहुभाषी स्वास्थ्य चैटबॉट हैं।
आपका उद्देश्य: सभी प्रकार के स्वास्थ्य संबंधी प्रश्नों का उत्तर देना (मानव और पशु)।

हमेशा इसमें जवाब दें:
• सरल, छोटे वाक्य
• स्पष्टता के लिए बुलेट पॉइंट्स
• ग्रामीण/अर्ध-शहरी अनुकूल शब्द

नियम:
• यदि प्रश्न स्वास्थ्य, बीमारी, पोषण, टीकाकरण या पशु स्वास्थ्य के बारे में है → पूरा उत्तर दें
• यदि अधिक विवरण चाहिए तो विनम्रता से पूछें
• हमेशा अस्वीकरण के साथ समाप्त करें: "यह सामान्य स्वास्थ्य जानकारी है। आपातकाल या गंभीर बीमारी के लिए तुरंत डॉक्टर से सलाह लें।"
• यदि उपयोगकर्ता स्वास्थ्य से असंबंधित कुछ पूछे → विनम्रता से मना करें: "🙏 मैं आपका स्वास्थ्य चैटबॉट हूं। कृपया अन्य प्रश्नों के लिए दूसरी AI का उपयोग करें।"

जवाब छोटे और व्यावहारिक रखें।`
      },
      symptom_check: {
        en: `You are a Symptom Checker assistant.
Purpose: Analyze user-reported symptoms and suggest possible causes, self-care, and when to see a doctor.

Rules:
• First, ask clarifying details (duration, after food/drink, how many days, any other issues)
• Then respond with:
  - Why these symptoms may happen
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
Purpose: Educate about diseases, their symptoms, prevention, and cure if available.

Rules:
• If user asks about a disease: Explain clearly
  - What it is
  - Symptoms
  - Prevention methods
  - Cure/treatment options
• Only for disease awareness
• If user asks symptom-based or other queries, redirect: "This section is for learning about diseases. For symptoms, please use the 'Check Symptoms' option. For general questions, use 'Chat with AI'."

Keep responses SHORT and educational.`,
        hi: `आप एक रोग जागरूकता सहायक हैं।
उद्देश्य: रोगों, उनके लक्षणों, रोकथाम और इलाज के बारे में शिक्षित करना।

नियम:
• यदि उपयोगकर्ता किसी बीमारी के बारे में पूछे: स्पष्ट रूप से समझाएं
  - यह क्या है
  - लक्षण
  - रोकथाम के तरीके
  - इलाज/उपचार विकल्प
• केवल रोग जागरूकता के लिए
• यदि उपयोगकर्ता लक्षण-आधारित या अन्य प्रश्न पूछे, तो रीडायरेक्ट करें: "यह खंड बीमारियों के बारे में सीखने के लिए है। लक्षणों के लिए 'लक्षण जांच' विकल्प का उपयोग करें।"

जवाब छोटे और शैक्षिक रखें।`
      },
      nutrition_hygiene: {
        en: `You are a Nutrition & Hygiene advisor.
Purpose: Give simple, practical tips on food, cleanliness, and safe living.

Rules:
• Provide 2–4 clear bullet points
• Focus on daily practices: handwashing, balanced diet, clean water, storage of food
• If user asks about WHAT TO EAT for a condition (diabetes, heart disease, etc.) → Answer with safe dietary tips
• If user asks about NUTRITION or FOOD HABITS → Answer fully
• If user asks about HYGIENE practices → Answer fully
• Only redirect if asking for DIAGNOSIS or TREATMENT of symptoms
• Example: "What to eat for diabetes?" → Give diabetic-friendly food tips
• Example: "I feel sick, what's wrong?" → Redirect to symptom checker

Keep responses SHORT and practical.`,
        hi: `आप एक पोषण और स्वच्छता सलाहकार हैं।
उद्देश्य: भोजन, सफाई और सुरक्षित जीवन पर सरल, व्यावहारिक सुझाव देना।

नियम:
• 2-4 स्पष्ट बुलेट पॉइंट प्रदान करें
• दैनिक प्रथाओं पर ध्यान दें: हाथ धोना, संतुलित आहार, साफ पानी, भोजन का भंडारण
• यदि उपयोगकर्ता किसी स्थिति के लिए क्या खाना है पूछे (मधुमेह, हृदय रोग, आदि) → सुरक्षित आहार सुझाव दें
• यदि उपयोगकर्ता पोषण या भोजन की आदतों के बारे में पूछे → पूरा उत्तर दें
• यदि उपयोगकर्ता स्वच्छता प्रथाओं के बारे में पूछे → पूरा उत्तर दें
• केवल तभी रीडायरेक्ट करें जब लक्षणों का निदान या उपचार पूछे
• उदाहरण: "मधुमेह के लिए क्या खाएं?" → मधुमेह-अनुकूल भोजन सुझाव दें
• उदाहरण: "मुझे बीमार लग रहा है, क्या गलत है?" → लक्षण जांचकर्ता को रीडायरेक्ट करें

जवाब छोटे और व्यावहारिक रखें।`
      },
      exercise_lifestyle: {
        en: `You are an Exercise & Lifestyle coach for rural/semi-urban people.
Purpose: Share simple exercise and lifestyle habits.

Rules:
• Give 3–5 bullet tips (walking, yoga, breathing, daily routines)
• Keep it practical, no complex gym advice
• If user asks for EXERCISES for a condition (back pain, knee pain, etc.) → Give safe, gentle exercises
• If user asks about LIFESTYLE habits → Answer fully
• If user asks about DAILY ROUTINES → Answer fully
• Only redirect if asking for DIAGNOSIS of symptoms or MEDICAL TREATMENT
• Example: "Exercises for back pain?" → Give gentle back exercises
• Example: "Why does my back hurt?" → Redirect to symptom checker

Keep responses SHORT and practical.`,
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
      return selectedPrompt + '\n\nIMPORTANT: Respond ONLY in Roman letters (English alphabet). NO native script allowed.';
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
        return response.text();
        
      } catch (error) {
        lastError = error;
        console.error(`Gemini API error (attempt ${attempt + 1}/${maxRetries}):`, error.message);
        
        // Check if it's a rate limit error
        if (error.status === 429 && attempt < maxRetries - 1) {
          console.log(`🔄 Rate limit hit, rotating API key...`);
          this.rotateApiKey();
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If not rate limit or last attempt, break
        break;
      }
    }
    
    console.error('All API attempts failed:', lastError?.message);
    
    // Return fallback message based on language
    const fallbackMessages = {
      en: 'I apologize, but I\'m having trouble processing your request right now. Please try again later or contact a healthcare professional if this is urgent.',
      hi: 'क्षमा करें, मुझे अभी आपके अनुरोध को संसाधित करने में समस्या हो रही है। कृपया बाद में पुनः प्रयास करें या यदि यह तत्काल है तो स्वास्थ्य पेशेवर से संपर्क करें।',
      te: 'క్షమించండి, ప్రస్తుతం మీ అభ్యర్థనను ప్రాసెస్ చేయడంలో నాకు ఇబ్బంది ఉంది. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి లేదా ఇది అత్యవసరమైతే ఆరోగ్య నిపుణుడిని సంప్రదించండి।'
    };
    
    return fallbackMessages[language] || fallbackMessages.en;
  }

  // Get language-specific medical terms for prompts
  getLanguageSpecificMedicalTerms(language) {
    const { medicalTerms } = require('../utils/languageUtils');
    const terms = medicalTerms[language] || medicalTerms.en;
    
    const termsList = [
      terms.rest[0], terms.fluids[0], terms.medicine[0], 
      terms.doctor[0], terms.exercise[0], terms.diet[0],
      terms.weight[0], terms.sugar[0], terms.checkup[0]
    ];
    
    return termsList.join(', ');
  }

  // Analyze symptoms with context - enhanced with detailed questions
  async analyzeSymptoms(symptoms, userProfile = {}, mediaData = null) {
    try {
      const language = userProfile.preferred_language || 'en';
      const scriptType = userProfile.script_preference || 'native';
      
      let analysisPrompt = '';
      
      if (mediaData) {
        // Image-based symptom analysis
        analysisPrompt = `You are a medical triage assistant analyzing health-related images. 

For the image provided along with symptoms: "${symptoms}"

Provide:

1. 📋 *What I observe in the image*

2. 🤔 *Follow-up questions for better diagnosis* (ask 2-3 specific questions)

3. ⚕️ *Possible conditions and recommendations*

4. 🚨 *When to seek immediate medical help*

5. 🏠 *Self-care measures if appropriate*

⚠️ *IMPORTANT*: This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation.

Keep response SHORT and practical. Use line breaks between sections for better readability.`;
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

      const result = await this.generateResponse(analysisPrompt, language, scriptType);
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
      } else if (category === 'nutrition' || category.includes('nutrition')) {
        prompt = `Give nutrition advice in ${language}:

MUST include these terms: ${medicalTermsForLanguage}

1. Balanced diet basics
2. Weight management through food
3. Sugar control
4. Vegetables and fruits importance
5. Water intake

Respond in ${language} language. Keep SHORT and practical.`;
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
      // Convert image data to base64 if needed
      let base64Image = '';
      if (Buffer.isBuffer(imageData)) {
        base64Image = imageData.toString('base64');
      } else if (typeof imageData === 'string') {
        base64Image = imageData;
      } else {
        throw new Error('Invalid image data format');
      }

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg' // Default, should be detected properly
        }
      };

      const prompt = `You are a medical image analysis assistant. Analyze this health-related image${description ? ` with context: "${description}"` : ''}.

Provide:
1. 👁️ **Visual Observations**: What do you see in the image?
2. 🤔 **Health Assessment**: Possible conditions or concerns
3. 📋 **Follow-up Questions**: 2-3 questions to ask the patient
4. ⚠️ **Urgency Level**: Low/Medium/High - when to seek help
5. 🏠 **Self-Care Advice**: Immediate care recommendations
6. 📞 **Next Steps**: When and where to get professional help

⚠️ **IMPORTANT**: This is not a medical diagnosis. Always consult a healthcare professional for proper evaluation.

Keep response SHORT and practical (2-3 sentences per section).`;

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error('Image analysis error:', error);
      
      // Fallback response
      const fallbackMessages = {
        en: '📱 I can see you\'ve sent an image, but I\'m having trouble analyzing it right now. Please describe what you\'re seeing or concerned about in text, and I\'ll be happy to help! For urgent medical concerns, please consult a healthcare professional.',
        hi: '📱 मैं देख सकता हूं कि आपने एक छवि भेजी है, लेकिन अभी मुझे इसका विश्लेषण करने में परेशानी हो रही है। कृपया बताएं कि आप क्या देख रहे हैं या चिंतित हैं, और मैं मदद करूंगा!',
        te: '📱 మీరు ఒక చిత్రం పంపించారని నేను చూడగలను, కానీ ప్రస్తుతం దాన్ni విశ్లేషించడంలో నాకు ఇబ్బంది ఉంది। దయచేసి మీరు ఏమి చూస్తున్నారో లేదా ఆందోళన చెందుతున్నారో వివరించండి!'
      };
      
      return fallbackMessages[language] || fallbackMessages.en;
    }
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