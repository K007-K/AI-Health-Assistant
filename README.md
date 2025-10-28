# 🏥 AI Health Assistant (AHA)

### Multilingual AI-Powered WhatsApp Healthcare Bot for Rural India

Transform healthcare accessibility with intelligent, context-aware health guidance in 5+ Indian languages. Built for rural and semi-urban populations with zero internet dependency beyond WhatsApp.

[Features](#-key-features) • [Demo](#-live-demo) • [Quick Start](#-quick-start) • [Tech Stack](#️-tech-stack) • [Documentation](#-documentation)

---

## 📖 About AI Health Assistant (AHA)

**AI Health Assistant (AHA)** is a cutting-edge WhatsApp-based healthcare chatbot designed to bridge the healthcare gap in rural and semi-urban India. Using advanced AI and multilingual support, AHA provides:

- 🩺 **Symptom Analysis** with AI-powered health recommendations
- 🦠 **Real-time Disease Outbreak Alerts** with location-based monitoring
- 🌱 **Preventive Healthcare Tips** covering nutrition, hygiene, and lifestyle
- 🚨 **Emergency Detection** with immediate safety protocols
- 🌐 **5 Indian Languages** with native script and transliteration support

Perfect for rural communities, healthcare workers, community health centers, and anyone seeking accessible healthcare guidance without internet barriers.

---

## ✨ Key Features

### 🌐 Multilingual Healthcare Access
- **5 Indian Languages**: English, Hindi, Telugu, Tamil, Odia
- **Native Script Support**: తెలుగు, हिंदी, தமிழ், ଓଡ଼ିଆ
- **Transliteration Option**: Roman script for all languages
- **Context-Aware Translation**: Medical terminology preserved accurately

### 🤖 AI-Powered Intelligence
- **Google Gemini 2.0 Flash**: Advanced language understanding
- **Conversation Memory**: Context-aware multi-turn conversations
- **Emergency Detection**: Automatic critical situation identification
- **Myth Busting**: Health misinformation detection and correction
- **Medical Disclaimers**: Built-in safety protocols and warnings

### 🩺 Comprehensive Health Features
- **Symptom Checker**: Input symptoms → AI analysis → Safety recommendations
- **Disease Outbreak Alerts**: Real-time monitoring with location-based filtering
- **Health Tips Library**: Nutrition, exercise, hygiene, and lifestyle guidance
- **Prevention Recommendations**: Disease-specific prevention strategies
- **Emergency Protocols**: Immediate guidance with 108 ambulance contact

### 💬 WhatsApp-First Design
- **Interactive Buttons**: Quick selection for easy navigation
- **Rich Media Support**: Images, audio, and document sharing
- **List Menus**: Organized categorical options
- **No App Download**: Works directly in WhatsApp
- **Offline-Ready**: No internet needed beyond WhatsApp data

### ♿ Accessibility Features
- **Easy Mode**: Simple language for low-literacy users
- **Long Text Mode**: Detailed explanations with spacing
- **Audio Optimization**: Voice message-friendly responses
- **Script Switching**: On-demand transliteration toggle
- **Visual Indicators**: Emojis for quick understanding

---

## 🚀 Live Demo

### Try It Out:
📱 **WhatsApp**: +91-XXXX-XXXXXX (Add your WhatsApp Business number)

### Demo Flow:
1. **Language Selection** → Choose from 5 languages
2. **Script Preference** → Native or Roman script
3. **Main Menu** → Access all features
4. **Interactive Chat** → Get AI-powered health guidance

---

## 🛠️ Tech Stack

### Complete Technology List

**Backend:**
- 🚂 **Node.js + Express** - Fast, scalable server framework
- 🗄️ **Supabase (PostgreSQL)** - Real-time database with RLS
- 🧠 **Google Gemini 2.0 Flash** - Advanced AI language model
- 🔌 **Meta WhatsApp Business API** - Interactive messaging platform
- ⏰ **node-cron** - Automated scheduled jobs for disease monitoring
- 🔐 **JWT + bcrypt** - Secure authentication and encryption

**Core Services:**
- 💬 **Conversation Service** - Chat history and context management
- 👤 **User Service** - Preferences and session management
- 🤖 **Gemini AI Service** - Intelligent response generation
- 📱 **WhatsApp Service** - Interactive message handling
- 🦠 **Disease Alert Service** - Real-time outbreak monitoring
- 📊 **Feedback Service** - Accuracy tracking and analytics

**Development & Deployment:**
- 🔧 **Nodemon** - Auto-reload development server
- 📦 **dotenv** - Environment configuration
- 🛡️ **Helmet + CORS** - Security headers and protection
- 📝 **Winston** - Structured logging system
- 🚀 **Render** - Cloud hosting and deployment
- 🔄 **GitHub Actions** - CI/CD pipeline (optional)

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 16+
Supabase account (free tier)
WhatsApp Business API access
Google Gemini API key
```

### Installation

**1. Clone and Install**
```bash
git clone https://github.com/K007-K/AI-Health-Assistant-AHA.git
cd AI-Health-Assistant-AHA
npm install
```

**2. Environment Setup**

Copy `.env.example` to `.env` and update:

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# Supabase Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

**3. Database Setup**
```bash
# Initialize Supabase database schema
node database/setup.js
```

**4. Start Development Server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

**5. Configure WhatsApp Webhook**
1. Deploy to a public server or use ngrok for local testing
2. Set webhook URL: `https://yourdomain.com/webhook`
3. Use verify token from your `.env` file
4. Subscribe to message events in WhatsApp Business API

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WhatsApp User                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Meta WhatsApp Business API                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Server (Node.js)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Message Controller → Route & Validate Incoming Messages │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                             │
│  ┌────────────────▼──────────────────────────────────────────┐ │
│  │           Conversation Service (Context Manager)          │ │
│  │  • Chat History    • User Preferences    • Session State │ │
│  └────────────────┬──────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼──────────────────────────────────────────┐ │
│  │               Gemini AI Service (Intelligence)            │ │
│  │  • Natural Language Understanding    • Context Awareness │ │
│  │  • Medical Knowledge    • Multilingual Processing        │ │
│  └────────────────┬──────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼──────────────────────────────────────────┐ │
│  │            WhatsApp Service (Response Handler)            │ │
│  │  • Format Messages    • Interactive Elements             │ │
│  │  • Media Handling     • Error Management                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase (PostgreSQL)                      │
│  • User Profiles    • Conversation History    • Preferences    │
│  • Disease Alerts   • Feedback Data          • Analytics       │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Scheduled Jobs (node-cron)                    │
│  • Disease Outbreak Monitoring (Every 6 hours)                 │
│  • Alert Broadcasting (Every 1 hour)                           │
│  • Daily Health Summaries (10 AM IST)                          │
│  • Database Cleanup (Daily)                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Message Controller**: Routes incoming WhatsApp messages to appropriate handlers
2. **Conversation Service**: Manages chat context, history, and user sessions
3. **Gemini AI Service**: Processes natural language, generates intelligent responses
4. **WhatsApp Service**: Formats and sends interactive WhatsApp messages
5. **Disease Alert Service**: Monitors and broadcasts real-time outbreak information
6. **User Service**: Manages user profiles, preferences, and settings
7. **Feedback Service**: Tracks accuracy, satisfaction, and feature usage

---

## 📁 Project Structure

```
AI-Health-Assistant-AHA/
├── 📂 src/                      # Main application code
│   ├── 📂 config/               # Configuration files
│   │   ├── supabase.js          # Database connection
│   │   └── gemini.js            # AI model setup
│   ├── 📂 controllers/          # Request handlers
│   │   └── messageController.js # WhatsApp message routing
│   ├── 📂 services/             # Business logic
│   │   ├── conversationService.js   # Chat context management
│   │   ├── geminiService.js         # AI response generation
│   │   ├── whatsappService.js       # WhatsApp API integration
│   │   ├── diseaseAlertService.js   # Outbreak monitoring
│   │   ├── userService.js           # User management
│   │   └── feedbackService.js       # Analytics tracking
│   ├── 📂 models/               # Database models
│   │   ├── User.js              # User schema
│   │   └── OutbreakAlert.js     # Disease alert schema
│   ├── 📂 utils/                # Utility functions
│   │   └── languageUtils.js     # Translation helpers
│   └── app.js                   # Main application file
├── 📂 database/                 # Database schema
│   ├── schema.sql               # Supabase table definitions
│   └── setup.js                 # Database initialization
├── 📂 scripts/                  # Testing and utilities
│   ├── test-bot.js              # Bot functionality tests
│   ├── test-multilingual-accuracy.js  # Language tests
│   └── test-disease-outbreak-system.js # Alert tests
├── 📂 tests/                    # Additional test files
│   └── root-tests/              # Legacy test scripts
├── 📂 docs/                     # Documentation
│   ├── 📂 guides/               # Setup and usage guides
│   │   ├── SETUP.md             # Installation guide
│   │   ├── CONVERSATION_FLOWS.md # Feature documentation
│   │   ├── WHATSAPP_SETUP.md    # WhatsApp API setup
│   │   └── LOCAL_TESTING.md     # Testing guide
│   ├── 📂 deployment/           # Deployment guides
│   │   ├── DEPLOY_RENDER.md     # Render deployment
│   │   └── PRODUCTION_CHECKLIST.md # Launch checklist
│   ├── OUTBREAK_SYSTEM_README.md # Disease alert documentation
│   └── TEST_RESULTS.md          # Test coverage report
├── 📄 .env.example              # Environment variables template
├── 📄 .gitignore                # Git ignore rules
├── 📄 package.json              # Dependencies and scripts
└── 📄 README.md                 # This file
```

---

## 🎮 Usage Guide

### Creating Your First Conversation

1. **Start a Chat**: Message the WhatsApp Business number
2. **Select Language**: Choose from 5 Indian languages
3. **Choose Script**: Native script or Roman transliteration
4. **Explore Features**: Use interactive menu buttons

### Main Features

#### 🤖 Chat with AI
```
User: "My child has fever for 3 days"
Bot: 🩺 I understand your child has had fever for 3 days...

**Possible causes:**
• Viral infection (most common)
• Bacterial infection
• Seasonal illness

**Immediate care:**
• Keep child hydrated
• Monitor temperature every 4 hours
• Give lukewarm sponge bath

⚠️ **See a doctor if:**
• Fever above 103°F (39.4°C)
• Child is lethargic or unresponsive
• Fever persists beyond 5 days
```

#### 🩺 Symptom Checker
Provides detailed symptom analysis with clarifying questions, possible causes, self-care recommendations, and red flags requiring immediate medical attention.

#### 🦠 Disease Outbreak Alerts
```
📢 Public Health Alert - Jan 15, 2025 📢

🌍 NATIONWIDE DISEASE OUTBREAK ALERT

📍 Kerala:
• Primary Amoebic Meningoencephalitis - 69 cases, 19 deaths
• Symptoms: Fever, headache, vomiting, seizures
• Prevention: Avoid swimming in stagnant water

📍 Delhi/NCR:
• H3N2 Influenza outbreak
• Symptoms: High fever, body ache, cough
• Prevention: Wear masks, frequent handwashing
```

#### 🌱 Health Tips
Categorized preventive healthcare guidance:
- **Nutrition & Hygiene**: Food safety, water purification, sanitation
- **Exercise & Lifestyle**: Physical activity, mental health, sleep
- **Learn About Diseases**: Disease-specific information and prevention

### Accessibility Commands
- `/easy` - Switch to simple language mode
- `/long` - Get detailed explanations with spacing
- `/audio` - Enable audio-optimized responses
- `/reset` - Reset all preferences

---

## 🔧 Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run comprehensive tests
npm test

# Run multilingual accuracy tests
node scripts/test-multilingual-accuracy.js

# Test disease outbreak system
node scripts/test-disease-outbreak-system.js

# Verify deployment
node tests/root-tests/verify-deployment.js
```

### Environment Setup for Development

1. **Local Development with ngrok**:
```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Expose to internet
ngrok http 3000

# Update WhatsApp webhook with ngrok URL
```

2. **Database Management**:
```bash
# Access Supabase dashboard
# View tables: users, conversations, outbreak_alerts, feedback
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook` | GET | WhatsApp webhook verification |
| `/webhook` | POST | Receive WhatsApp messages |
| `/health` | GET | Server health check |
| `/api/alerts` | GET | Get active disease alerts |

---

## 🚀 Deployment

### Frontend (Not Applicable - WhatsApp Bot)
This is a backend-only WhatsApp bot service. No frontend deployment needed.

### Backend (Render/Railway/Heroku)

**Render (Recommended - Free Tier)**:
```bash
1. Connect GitHub repository
2. Select "Web Service"
3. Set build command: npm install
4. Set start command: npm start
5. Add environment variables from .env
6. Deploy!
```

**Environment Variables to Set**:
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `NODE_ENV=production`

### Database (Supabase)

**Setup**:
1. Create a Supabase project (free tier)
2. Run `database/schema.sql` in SQL Editor
3. Enable Row Level Security (RLS) policies
4. Copy project URL and keys to `.env`

**Monitoring**:
- Use Supabase dashboard for real-time database monitoring
- Enable logging for query performance
- Set up automated backups (Pro tier)

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Quick Contribution Guide

1. **Fork the repository**
```bash
git clone https://github.com/YOUR-USERNAME/AI-Health-Assistant-AHA.git
cd AI-Health-Assistant-AHA
```

2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
- Write clean, documented code
- Follow existing code style
- Add tests for new features
- Update documentation

4. **Test thoroughly**
```bash
npm test
node scripts/test-bot.js
```

5. **Commit and push**
```bash
git add .
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

6. **Create Pull Request**
- Describe your changes clearly
- Reference any related issues
- Wait for review and feedback

### Contribution Areas
- 🌐 **Translations**: Add new Indian languages
- 🧪 **Testing**: Improve test coverage
- 📚 **Documentation**: Enhance guides and examples
- 🐛 **Bug Fixes**: Fix issues and improve stability
- ✨ **Features**: Propose and implement new features

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Google Gemini Team** - For providing advanced AI capabilities
- **Meta WhatsApp Business** - For accessible messaging platform
- **Supabase Team** - For powerful database infrastructure
- **Rural Healthcare Workers** - For invaluable feedback and testing
- **Open Source Community** - For tools and libraries that made this possible

---

## 📞 Contact & Support

### Get Help
- 📧 **Email**: karthik.kuramdasu@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/K007-K/AI-Health-Assistant-AHA/issues)
- 📖 **Documentation**: [Full Docs](docs/)

### Follow Development
- ⭐ Star this repository
- 👀 Watch for updates
- 🍴 Fork and contribute

---

## 📊 Statistics

![GitHub stars](https://img.shields.io/github/stars/K007-K/AI-Health-Assistant-AHA?style=social)
![GitHub forks](https://img.shields.io/github/forks/K007-K/AI-Health-Assistant-AHA?style=social)
![GitHub issues](https://img.shields.io/github/issues/K007-K/AI-Health-Assistant-AHA)
![GitHub license](https://img.shields.io/github/license/K007-K/AI-Health-Assistant-AHA)

---

## 🎯 Project Status

✅ **Production Ready** - 92.3% accuracy rate in comprehensive testing

**Current Version**: v1.0.0  
**Last Updated**: January 2025  
**Active Maintenance**: Yes

---

**Built with ❤️ for rural healthcare accessibility in India**

*Making quality healthcare guidance accessible to every Indian, one WhatsApp message at a time.*
