# 🚀 WhatsApp Healthcare Bot Setup Guide

This guide will help you set up the WhatsApp Healthcare Bot step by step.

## 📋 Prerequisites

Before starting, make sure you have:
- Node.js 16+ installed
- A Supabase account (free tier available)
- WhatsApp Business API access
- Google Gemini API key

## 🔧 Step-by-Step Setup

### Step 1: Install Dependencies

Due to npm cache issues on some systems, try these installation methods:

```bash
# Method 1: Clean install
npm cache clean --force
npm install

# Method 2: If method 1 fails, use yarn
npm install -g yarn
yarn install

# Method 3: Install individual critical packages
npm install express @supabase/supabase-js @google/generative-ai axios dotenv
npm install cors helmet compression winston joi moment uuid
```

### Step 2: Environment Configuration

1. Copy the existing `.env` file and update with your credentials:

```env
# WhatsApp Business API (Update these!)
WHATSAPP_ACCESS_TOKEN=your_actual_token_here
WHATSAPP_PHONE_NUMBER_ID=your_actual_phone_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Supabase (Get from supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini AI (Get from ai.google.dev)
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=3000
NODE_ENV=development
```

### Step 3: Get Required API Keys

#### 🟢 Supabase Setup (Free)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy your URL and anon key
5. Copy service role key (for admin operations)

#### 🔵 Google Gemini API (Free Tier)
1. Go to [ai.google.dev](https://ai.google.dev)
2. Get API access
3. Create an API key
4. Copy the key to your `.env` file

#### 📱 WhatsApp Business API
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → Business
3. Add WhatsApp product
4. Get your access token and phone number ID
5. Note: You'll need to verify your business for production

### Step 4: Database Setup

Run the database setup script:

```bash
node database/setup.js
```

This will create all necessary tables in your Supabase database.

### Step 5: Test Your Setup

```bash
# Test the bot configuration
node scripts/test-bot.js

# Start the development server
npm run dev
```

### Step 6: Configure WhatsApp Webhook

#### For Local Development:
1. Install ngrok: `npm install -g ngrok`
2. Expose your local server: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. In WhatsApp Business API settings, set webhook URL to: `https://abc123.ngrok.io/webhook`
5. Use your `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for verification

#### For Production Deployment:
1. Deploy to Railway, Render, or Vercel
2. Use your production URL: `https://yourdomain.com/webhook`

## 🚀 Deployment Options

### Option 1: Railway (Recommended for beginners)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Option 2: Render
1. Connect GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### Option 3: Vercel (Serverless)
```bash
npm install -g vercel
vercel --prod
```

## ✅ Testing Your Bot

1. Send "Hi" to your WhatsApp Business number
2. You should see the language selection menu
3. Try different features:
   - Select a language
   - Chat with AI
   - Check symptoms
   - Get health tips
   - Try accessibility commands: `/easy`, `/reset`

## 🛠️ Troubleshooting

### Common Issues

#### "Cannot install packages"
```bash
# Clear npm cache
npm cache clean --force

# Or use yarn instead
npm install -g yarn
yarn install
```

#### "Database connection failed"
- Check your Supabase URL and keys
- Make sure your project is active
- Run `node database/setup.js` again

#### "WhatsApp messages not received"
- Verify your webhook URL is accessible
- Check your access token is valid
- Make sure webhook verification token matches

#### "AI responses not working"
- Confirm your Gemini API key is correct
- Check your internet connection
- Verify API quotas aren't exceeded

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env)"

# Test database connection only
node -e "require('./src/config/database').testConnection()"

# Check server health
curl http://localhost:3000/health
```

## 📊 Production Checklist

Before going live:
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS webhook URL
- [ ] Set up proper logging
- [ ] Configure rate limiting
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Test all features thoroughly

## 🔒 Security Notes

- Never commit `.env` file to git
- Use strong, unique tokens
- Enable WhatsApp webhook signature verification
- Regularly rotate API keys
- Monitor usage and set up alerts

## 🆘 Getting Help

If you encounter issues:
1. Check the server logs for error messages
2. Use the `/health` endpoint to diagnose problems
3. Verify all environment variables are set correctly
4. Test each service individually using the test script

## 📈 Next Steps

Once your bot is working:
1. Customize the health content for your region
2. Add more languages if needed
3. Integrate with local healthcare databases
4. Set up analytics and monitoring
5. Train your team on bot management

---

**Happy coding! 🎉 Your healthcare bot is ready to help people.**