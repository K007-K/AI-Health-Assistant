const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/environment');
const { LanguageUtils } = require('../utils/languageUtils');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
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

  // Generate AI response with context
  async generateResponse(prompt, language = 'en', scriptType = 'native', context = [], accessibilityMode = 'normal') {
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

      // Accessibility mode modifications
      let accessibilityInstructions = '';
      switch (accessibilityMode) {
        case 'easy':
          accessibilityInstructions = '\n\nIMPORTANT: Use simple words and short sentences. Avoid medical jargon. Explain everything in easy-to-understand language.';
          break;
        case 'long':
          accessibilityInstructions = '\n\nIMPORTANT: Use more spacing between lines. Add more detailed explanations. Break down complex information into smaller parts.';
          break;
        case 'audio':
          accessibilityInstructions = '\n\nIMPORTANT: Structure response for audio playback. Use clear pronunciation markers. Avoid special characters and emojis.';
          break;
      }

      // Combine all prompts
      const fullPrompt = `${systemPrompt}${accessibilityInstructions}${conversationHistory}

Current user message: ${prompt}

Remember to:
1. Always provide accurate health information
2. Include appropriate disclaimers about consulting healthcare professionals
3. Be empathetic and supportive
4. Keep responses concise but informative (under 300 words)
5. Include relevant health tips when appropriate
6. If this is an emergency situation, prioritize immediate safety advice

Please respond appropriately:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Fallback response based on language
      const fallbackMessages = {
        en: 'I apologize, but I\'m having trouble processing your request right now. Please try again later or contact a healthcare professional if this is urgent.',
        hi: 'मुझे खुशी है कि मैं अभी आपका अनुरोध प्रोसेस करने में समस्या हो रही है। कृपया बाद में पुनः प्रयास करें या यदि यह तत्काल है तो किसी स्वास्थ्य पेशेवर से संपर्क करें।',
        te: 'క్షమించండి, ప్రస్తుతం మీ అభ్యర్థనను ప్రాసెస్ చేయడంలో నాకు ఇబ్బంది ఉంది. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి లేదా ఇది అత్యవసరమైతే ఆరోగ్య నిపుణుడిని సంప్రదించండి।'
      };
      
      return fallbackMessages[language] || fallbackMessages.en;
    }
  }

  // Analyze symptoms with context
  async analyzeSymptoms(symptoms, userProfile = {}) {
    try {
      const language = userProfile.preferred_language || 'en';
      const scriptType = userProfile.script_preference || 'native';
      
      const systemPrompt = `You are a medical triage assistant. Analyze the following symptoms and provide:
1. Possible conditions (most likely first)
2. Severity assessment (mild/moderate/severe)
3. Immediate care recommendations
4. When to seek professional help
5. Self-care measures if appropriate

IMPORTANT: Always emphasize that this is not a substitute for professional medical diagnosis.`;

      const prompt = `User symptoms: ${symptoms}
User profile: Age: ${userProfile.age || 'not specified'}, Gender: ${userProfile.gender || 'not specified'}

Please analyze these symptoms and provide guidance in ${language} language.`;

      return await this.generateResponse(prompt, language, scriptType);
    } catch (error) {
      console.error('Symptom analysis error:', error);
      throw error;
    }
  }

  // Get preventive health tips
  async getPreventiveTips(category, userProfile = {}) {
    try {
      const language = userProfile.preferred_language || 'en';
      const scriptType = userProfile.script_preference || 'native';
      
      const prompts = {
        nutrition: `Provide 3 practical nutrition tips for maintaining good health. Focus on accessible, affordable foods common in India. Keep each tip under 50 words.`,
        exercise: `Provide 3 simple exercise tips that can be done at home without equipment. Focus on activities suitable for all fitness levels. Keep each tip under 50 words.`,
        hygiene: `Provide 3 essential hygiene tips for preventing diseases. Focus on practical daily habits. Keep each tip under 50 words.`,
        general: `Provide 3 general preventive healthcare tips for maintaining good health. Focus on actionable advice. Keep each tip under 50 words.`
      };

      const prompt = prompts[category] || prompts.general;
      
      return await this.generateResponse(prompt, language, scriptType);
    } catch (error) {
      console.error('Preventive tips error:', error);
      throw error;
    }
  }

  // Process image for health analysis (future feature)
  async analyzeHealthImage(imageData, description = '') {
    try {
      // This would analyze health-related images like rashes, symptoms, etc.
      // For now, return a placeholder response
      return 'Image analysis feature is coming soon. Please describe your symptoms in text for now.';
    } catch (error) {
      console.error('Image analysis error:', error);
      throw error;
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