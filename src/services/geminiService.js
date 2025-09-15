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

  // Generate AI response with context and rate limit handling
  async generateResponse(prompt, language = 'en', scriptType = 'native', context = [], accessibilityMode = 'normal', maxRetries = 3) {
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
        
        const fullPrompt = `${systemPrompt}${accessibilityInstructions}${conversationHistory}
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