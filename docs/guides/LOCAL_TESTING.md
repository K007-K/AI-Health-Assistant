# 🧪 Local Testing Guide

This guide helps you test the WhatsApp Healthcare Bot locally before deployment.

## ⚠️ NPM Cache Issues Solution

If you're experiencing npm cache issues, use these alternative installation methods:

### Method 1: Force Install
```bash
npm cache clean --force
npm install --force
```

### Method 2: Use Yarn
```bash
npm install -g yarn
yarn install
```

### Method 3: Manual Package Installation
```bash
# Install critical packages one by one
npm install express --save
npm install axios --save
npm install dotenv --save
npm install @supabase/supabase-js --save
npm install @google/generative-ai --save
npm install cors helmet compression --save
npm install winston joi moment uuid --save
```

### Method 4: Docker Alternative (if available)
```bash
# Create a simple Dockerfile
echo "FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD [\"npm\", \"start\"]" > Dockerfile

# Build and run
docker build -t healthcare-bot .
docker run -p 3000:3000 --env-file .env healthcare-bot
```

## 🧪 Testing Without Full Dependencies

If installation still fails, you can test core functionality:

### 1. Test Configuration
```bash
node test-config.js
```

Expected output:
```
🏥 WhatsApp Healthcare Bot - Configuration Test

📋 Configuration Check:
✅ WHATSAPP_ACCESS_TOKEN: Configured
✅ WHATSAPP_PHONE_NUMBER_ID: Configured  
✅ SUPABASE_URL: Configured
✅ SUPABASE_ANON_KEY: Configured
✅ GEMINI_API_KEY: Configured

🎉 All required environment variables are configured!
```

### 2. Test Database Connection (Manual)
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy contents from `database/schema.sql`
4. Run the SQL commands to create tables

### 3. Test API Endpoints (Manual)
```bash
# Test WhatsApp API access
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID"

# Test Gemini API
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

## 🚀 Direct Deployment Testing

If local setup continues to have issues, you can test directly on Render:

### 1. Deploy to Render First
- Follow the DEPLOY_RENDER.md guide
- The deployment will install dependencies correctly
- Test functionality on the live server

### 2. Test via Render
```bash
# Test health endpoint
curl https://your-app-name.onrender.com/health

# Test webhook verification
curl "https://your-app-name.onrender.com/webhook?hub.mode=subscribe&hub.verify_token=3732299207071787&hub.challenge=test123"
```

## 📱 WhatsApp Testing

### Setup Webhook URL
1. Go to Meta Developers Console
2. WhatsApp → Configuration  
3. Set webhook URL: `https://your-app-name.onrender.com/webhook`
4. Set verify token: `3732299207071787`
5. Subscribe to messages and message_status

### Test Conversation Flow
1. Send "Hi" to your WhatsApp Business number
2. Verify language selection appears
3. Test different menu options
4. Try emergency keywords
5. Test accessibility commands (/easy, /reset)

## 🗄️ Database Verification

### Check Supabase Tables
In your Supabase dashboard, verify these tables exist:
- `users` - User profiles and preferences
- `conversations` - Chat history  
- `feedback` - User satisfaction ratings
- `user_sessions` - Session state tracking
- `health_content` - Health tips content

### Test Database Queries
Run these in Supabase SQL Editor:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Test sample data
SELECT * FROM health_content LIMIT 5;

-- Check user creation works
INSERT INTO users (phone_number, preferred_language) 
VALUES ('+1234567890', 'en') 
RETURNING *;
```

## 🔧 Common Issues & Solutions

### "Module not found" errors
- Deploy directly to Render instead of local testing
- The cloud environment will handle dependencies correctly

### WhatsApp webhook not receiving messages
- Ensure webhook URL is HTTPS and publicly accessible
- Use ngrok for local testing: `ngrok http 3000`
- Verify verify token matches exactly

### Database connection fails
- Check Supabase project is active
- Verify environment variables are correct
- Ensure database schema is set up

### AI responses not working
- Verify Gemini API key is valid
- Check API quotas aren't exceeded
- Test with simple queries first

## 📊 Monitoring & Logs

### Render Logs
- Go to Render Dashboard → Your Service → Logs
- Monitor for errors and successful requests
- Check startup messages

### Supabase Logs
- Dashboard → Logs
- Monitor database queries and connections
- Check for any permission issues

### WhatsApp Webhooks
- Developers Console → Webhooks
- Check webhook delivery status
- Monitor failed webhook attempts

## 🎯 Verification Checklist

Before going live, verify:

✅ **Configuration**
- [ ] All environment variables set correctly
- [ ] Configuration test passes
- [ ] No sensitive data in repository

✅ **Database**  
- [ ] Schema created successfully
- [ ] Sample queries work
- [ ] Connection stable

✅ **APIs**
- [ ] WhatsApp API accessible
- [ ] Gemini API responding
- [ ] Webhook verification works

✅ **Bot Functionality**
- [ ] Language selection works
- [ ] AI chat responds correctly
- [ ] Emergency detection active
- [ ] Feedback collection working

✅ **Deployment**
- [ ] App deploys successfully
- [ ] Health check passes
- [ ] Webhook receives messages
- [ ] Database operations work

## 🚀 Quick Deploy Alternative

If local testing is problematic, use this rapid deployment approach:

1. **Push to GitHub** ✅ (Already completed)
2. **Deploy to Render** using DEPLOY_RENDER.md guide
3. **Test on live server** using the deployed URL
4. **Debug via Render logs** instead of local console
5. **Iterate with git commits** for quick updates

This approach leverages cloud resources and avoids local dependency issues.

---

## 🎉 Success!

Your bot is now ready for production use! The cloud deployment will handle all dependencies correctly, and you can monitor everything through the respective dashboards.

**Remember**: The bot serves rural healthcare needs - test thoroughly with different languages and accessibility modes! 🏥💚