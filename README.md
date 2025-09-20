# WhatsApp Healthcare Bot 🏥🤖

A multilingual AI-powered WhatsApp chatbot for healthcare education, designed for rural and semi-urban populations. Built with Node.js, Supabase, and Google Gemini 2.0 Flash.

## 🌟 Features

### ✅ Implemented Features
- **🌐 Multilingual Support**: English, Hindi, Telugu, Tamil, Odia with native script and transliteration options
- **🤖 AI-Powered Responses**: Google Gemini 2.0 Flash for intelligent health guidance
- **💬 Interactive WhatsApp Integration**: Buttons, lists, and rich media support
- **🧠 Conversation Memory**: Context-aware responses using chat history
- **🩺 Symptom Checker**: AI-powered symptom analysis with safety recommendations
- **🌱 Preventive Healthcare Tips**: Categorized health tips (nutrition, exercise, hygiene)
- **⚠️ Emergency Detection**: Automatic detection of emergency keywords with immediate response
- **♿ Accessibility Features**: Easy mode, long text mode, audio optimization
- **📊 Feedback System**: User satisfaction tracking and accuracy measurement
- **💾 Robust Database**: Supabase with conversation history and user preferences
- **🚨 Real-time Disease Outbreak Alerts**: Location-specific disease monitoring with AI-powered web search
- **🛡️ Disease-Specific Prevention**: Dynamic prevention recommendations based on actual diseases

### 🚧 Coming Soon Features (Government Database Integration Required)
- **📅 Appointment Scheduling**: Integration with local healthcare providers
- **📈 Predictive Health Analytics**: Advanced disease outbreak prediction models
- **💉 Vaccination Tracking**: Government vaccination schedule integration
- **🏥 Healthcare Provider Directory**: Local PHC and hospital information

## 🏗️ Architecture

```
whatsapp-health-bot/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── utils/           # Utility functions
│   ├── middleware/      # Express middleware
│   └── app.js          # Main application
├── database/           # Database schema and setup
├── .env               # Environment variables
└── package.json       # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Supabase account (free tier)
- WhatsApp Business API access
- Google Gemini API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd whatsapp-health-bot
npm install
```

### 2. Environment Setup
Update the `.env` file with your credentials:

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# Supabase Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Database Setup
```bash
# Set up Supabase database schema
node database/setup.js
```

### 4. Start Development Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 5. Configure WhatsApp Webhook
1. Expose your local server using ngrok or deploy to a public server
2. Set webhook URL in WhatsApp Business API: `https://yourdomain.com/webhook`
3. Use the verify token from your `.env` file

## 📱 User Interaction Flow

### 1. Language Selection
```
👋 Hello! I am your Health Assistant.
🌐 Please choose your language:
[🇺🇸 English] [🇮🇳 हिंदी] [🇮🇳 తెలుగు] [🇮🇳 தமிழ்] [🇮🇳 ଓଡ଼ିଆ]
```

### 2. Script Preference (for Indian languages)
```
You selected తెలుగు (Telugu).
Do you want:
[🇮🇳 తెలుగు script] [🔤 English letters]
```

### 3. Main Menu
```
📋 Main Menu — Please choose an option:
[🤖 Chat with AI] [📅 Appointments] [🌱 Health Tips]
[🩺 Check Symptoms] [🚨 Outbreak Alerts] [📊 Feedback]
```

### 4. Feature Interactions
- **Chat with AI**: Natural conversation with health guidance
- **Symptom Checker**: Input symptoms → AI analysis → Safety recommendations
- **Health Tips**: Category selection → Personalized tips
- **Emergency Override**: Automatic detection → Immediate safety response

## 🛠️ Technical Stack

### Backend
- **Node.js + Express**: Server framework
- **Supabase**: PostgreSQL database with real-time features
- **Google Gemini 2.0 Flash**: AI model for responses

### WhatsApp Integration
- **Meta WhatsApp Business API**: Message handling
- **Interactive Elements**: Buttons, lists, media support
- **Webhook Processing**: Real-time message processing

### Key Services
- **UserService**: User management and preferences
- **ConversationService**: Chat history and context
- **GeminiService**: AI response generation
- **WhatsAppService**: WhatsApp API integration
- **FeedbackService**: Accuracy tracking

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API token | ✅ |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `PORT` | Server port | ❌ (default: 3000) |

### Accessibility Commands
- `/easy` - Simple language mode
- `/long` - Detailed explanations with spacing
- `/audio` - Audio-optimized responses
- `/reset` - Reset all preferences

### Emergency Keywords
The bot automatically detects emergency situations and provides immediate safety guidance:
- English: "emergency", "severe pain", "chest pain", "can't breathe"
- Hindi: "आपातकाल", "गंभीर दर्द", "सीने में दर्द"
- Telugu: "అత్యవసర పరిస్థితి", "తీవ్రమైన నొప్పి"

## 📊 Analytics & Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Feedback Analytics
- User satisfaction tracking (👍/👎)
- Accuracy percentage calculation
- Feature usage statistics
- Daily activity trends

### Database Monitoring
- Conversation history tracking
- User preference analytics
- Session state management
- Automatic cleanup routines

## 🚀 Deployment

### Free Deployment Options
1. **Railway**: Connect GitHub repository for auto-deploy
2. **Render**: Free tier with automatic builds
3. **Vercel**: Serverless deployment (may need modifications)

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS webhook URL
- [ ] Set up database backups
- [ ] Enable logging and monitoring
- [ ] Configure rate limiting
- [ ] Set up error tracking

## 🔒 Security Features

- Input validation and sanitization
- Rate limiting for API calls
- Secure environment variable handling
- WhatsApp webhook signature verification
- SQL injection prevention (Supabase)
- XSS protection headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Common Issues
1. **Database Connection Failed**: Check Supabase credentials
2. **WhatsApp Messages Not Received**: Verify webhook URL and tokens
3. **AI Responses Not Working**: Confirm Gemini API key

### Getting Help
- Check the logs in your server console
- Use the `/health` endpoint to diagnose issues
- Ensure all environment variables are set correctly

## 🎯 Roadmap

### Phase 1 (Current) ✅
- Core WhatsApp bot functionality
- Multilingual support
- AI chat with symptom checking
- User preference management

### Phase 2 (Government Integration) 🚧
- Healthcare provider database integration
- Real-time outbreak alert system
- Vaccination schedule tracking
- Appointment booking system

### Phase 3 (Advanced Features) 📋
- Voice message support
- Image-based symptom analysis
- Personalized health tracking
- Community health insights

## 📈 Success Metrics

**Target**: 80% accuracy in health queries, 20% awareness increase

**Current Tracking**:
- User engagement rates
- Feedback satisfaction scores
- Feature usage analytics
- Response accuracy measurement

---

**Built with ❤️ for rural healthcare accessibility**