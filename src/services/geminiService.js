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
7. Use proper line breaks and spacing for better readability in WhatsApp
8. Add blank lines between sections and main points

Please respond appropriately with proper formatting:`;

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

  // Get preventive health tips - enhanced with detailed disease information
  async getPreventiveTips(category, userProfile = {}, specificTopic = '') {
    try {
      const language = userProfile.preferred_language || 'en';
      const scriptType = userProfile.script_preference || 'native';
      
      let prompt = '';
      
      if (category === 'disease prevention' || category.includes('disease')) {
        if (specificTopic) {
          // Specific disease information
          prompt = `Provide detailed information about "${specificTopic}" disease:

📋 *Disease Overview*
What is ${specificTopic}?
How common is it?

🔍 *Causes & Risk Factors*
Main causes
Who is at risk?

🚨 *Symptoms*
Early warning signs
Progressive symptoms

⏰ *Duration & Timeline*
How long does it last?
Recovery timeline

💊 *Treatment & Cure*
Available treatments
Management options

🛡️ *Prevention Steps*
Specific preventive measures
Lifestyle changes
Vaccination (if applicable)

Use line breaks between sections and keep each section SHORT and practical.`;
        } else {
          // General disease prevention
          prompt = `Provide information about preventing common diseases:

🦠 *Top 3 Preventable Diseases* in India

1. Disease name - key prevention tip

2. Disease name - key prevention tip

3. Disease name - key prevention tip

🛡️ *Universal Prevention Strategies*

Vaccination schedule

Personal hygiene practices

Lifestyle modifications

Regular health checkups

Include specific, actionable advice. Use line breaks for better readability.`;
        }
      } else if (category === 'nutrition and hygiene' || category.includes('nutrition')) {
        prompt = `Provide comprehensive nutrition and hygiene guidance:

🥗 *Best Nutrition Tips*

3 essential nutrients and food sources

Daily meal planning advice

Foods to include and avoid

🧼 *Essential Hygiene Practices*

Personal hygiene routine

Food safety measures

Environmental cleanliness

💡 *Practical Implementation*

Budget-friendly healthy foods

Simple hygiene habits

Daily routine suggestions

Provide SPECIFIC, actionable advice. Use line breaks between sections for better readability.`;
      } else if (category === 'exercise and lifestyle' || category.includes('exercise')) {
        prompt = `Provide comprehensive exercise and lifestyle guidance:

🏃 *Best Exercise Tips*

3 types of essential exercises (cardio, strength, flexibility)

Home workout options without equipment

Weekly exercise schedule

🌟 *Healthy Lifestyle Habits*

Sleep hygiene tips

Stress management techniques

Work-life balance strategies

⏰ *Daily Routine Integration*

Morning routines

Workplace wellness tips

Evening wind-down practices

Provide SPECIFIC, actionable advice suitable for all fitness levels. Use line breaks for better readability.`;
      } else {
        // General health tips
        prompt = `Provide general preventive healthcare tips:

🎯 *Top 5 Daily Health Habits*

1. Habit - why it matters

2. Habit - why it matters

3. Habit - why it matters

4. Habit - why it matters

5. Habit - why it matters

🔄 *Weekly Health Routine*

Health checkups schedule

Exercise planning

Meal prep strategies

Provide SPECIFIC, actionable advice. Use line breaks between sections for better readability.`;
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