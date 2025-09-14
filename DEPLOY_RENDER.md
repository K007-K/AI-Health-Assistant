# 🚀 Deploy WhatsApp Healthcare Bot to Render

This guide will help you deploy your WhatsApp Healthcare Bot to Render for free hosting.

## 📋 Prerequisites

✅ **Completed Setup**:
- [x] Code pushed to GitHub: https://github.com/K007-K/Agent
- [x] All API keys configured and tested locally
- [x] Supabase database schema set up

✅ **Required Accounts**:
- [x] GitHub account with repository access
- [x] Render account (free tier available at render.com)
- [x] Supabase project with configured database
- [x] WhatsApp Business API access

## 🌟 Step-by-Step Deployment

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account (recommended)
3. Verify your email address

### Step 2: Connect GitHub Repository

1. In Render Dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Find and select your repository: **K007-K/Agent**
5. Click **"Connect"**

### Step 3: Configure Service Settings

#### Basic Settings:
```
Name: whatsapp-healthcare-bot
Environment: Node
Region: Oregon (US West) or Frankfurt (EU Central)
Branch: main
```

#### Build & Deploy:
```
Build Command: npm install
Start Command: npm start
```

#### Instance Type:
```
Free tier (512 MB RAM, 0.1 CPU)
```

### Step 4: Configure Environment Variables

In the **Environment** section, add all your environment variables:

#### Required Variables:
```
WHATSAPP_ACCESS_TOKEN=EAAbYQFp8ZBZCYBPaKOeiN3n8hbthTx0VSCtx44wOnZBd5wSZAvWFZCZCCb5tKPyoZBZAAHSB50bnB6XZCgiCAZBm2voa1xtFeBhD5pqZAy84WVAT5LBTj2ZB2NvY8869nyZAg6LWkWE3fdioNZBEBWJ45LqU8umXBYaLYdRdj5SjN7OncCNZA4phc3wdVaduXzhC2NmvkCeL2alHMSdraLoLSWb4QzJhlbpV0mhIlseqQ0WdL2LjA4UTAZDZD

WHATSAPP_PHONE_NUMBER_ID=796180340242168

WHATSAPP_WEBHOOK_VERIFY_TOKEN=3732299207071787

CLIENT_ID=1926620767910902

CLIENT_SECRET=a1142b16578f238c338f46e173e7d9a1

SUPABASE_URL=https://vfcalzbjezbtgwwvytns.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmY2FsemJqZXpidGd3d3Z5dG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NjY1OTksImV4cCI6MjA3MzQ0MjU5OX0.OuQa3lU10ccIAZzFLwtN2CT9GChP4t4L3BPhNLqxVrw

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmY2FsemJqZXpidGd3d3Z5dG5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg2NjU5OSwiZXhwIjoyMDczNDQyNTk5fQ.-SQdGli2K4JgVwLC5f0y0armOdCiiouac82x7htXe6c

GEMINI_API_KEY=AIzaSyA2iPTK78EkG4Q9twOwhsKhWKpwrOsr0ko

PORT=3000

NODE_ENV=production

BOT_NAME=Health Assistant

EMERGENCY_NUMBER=108

DEFAULT_LANGUAGE=en

MAX_CONVERSATION_HISTORY=10

WEBHOOK_VERIFY_TOKEN=3732299207071787
```

### Step 5: Advanced Settings (Optional)

#### Auto-Deploy:
```
✅ Enable "Auto-Deploy" for automatic deployments on git push
```

#### Health Check:
```
Health Check Path: /health
```

### Step 6: Deploy

1. Click **"Create Web Service"**
2. Wait for the initial deployment (5-10 minutes)
3. Monitor the build logs for any errors

## 📱 Configure WhatsApp Webhook

Once deployed, you'll get a URL like: `https://whatsapp-healthcare-bot.onrender.com`

### Set Webhook URL:

1. Go to your **Meta Developers Console**
2. Select your WhatsApp Business App
3. Go to **WhatsApp → Configuration**
4. Set Webhook URL: `https://your-app-name.onrender.com/webhook`
5. Set Verify Token: `3732299207071787`
6. Subscribe to **messages** and **message_status** webhooks

### Test Webhook:
```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "database": "connected",
  "services": {
    "whatsapp": "configured",
    "gemini": "configured",
    "supabase": "configured"
  }
}
```

## 🗄️ Set Up Database

After successful deployment, set up your Supabase database:

### Option 1: Manual Setup (Recommended)
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the contents of `database/schema.sql` from your repository
4. Paste and run the SQL commands

### Option 2: Automated Setup
Run this command once after deployment:
```bash
curl -X POST https://your-app-name.onrender.com/api/setup-db
```

## ✅ Verify Deployment

### 1. Health Check
```bash
curl https://your-app-name.onrender.com/health
```

### 2. Test WhatsApp Integration
Send "Hi" to your WhatsApp Business number and verify:
- You receive a language selection menu
- Bot responds with interactive buttons
- Database stores conversation history

### 3. Check Logs
In Render Dashboard:
- Go to your service
- Click **"Logs"** tab
- Monitor for any errors or warnings

## 🛡️ Production Optimizations

### Security Headers
Your app already includes:
- Helmet.js for security headers
- CORS protection
- Input validation
- Rate limiting preparation

### Performance
- Compression enabled
- Efficient database queries
- Conversation history limits
- Automatic cleanup routines

### Monitoring
- Health check endpoint: `/health`
- Error logging with Winston
- Request logging middleware

## 🔧 Troubleshooting

### Common Issues:

#### 1. Build Fails
**Error**: `Cannot find module 'xyz'`
**Solution**: 
- Check if package.json includes all dependencies
- Try rebuilding: Clear cache and redeploy

#### 2. Database Connection Fails
**Error**: Database connection errors
**Solution**:
- Verify Supabase environment variables
- Check if your Supabase project is active
- Run database setup manually

#### 3. WhatsApp Webhook Fails
**Error**: Webhook verification failed
**Solution**:
- Ensure your app is accessible (not sleeping)
- Verify the webhook verify token matches
- Check if HTTPS is properly configured

#### 4. App Keeps Sleeping (Free Tier)
**Solution**:
- Render free tier apps sleep after 15 minutes of inactivity
- They automatically wake up on the first request
- Consider upgrading to paid tier for 24/7 availability

### Debug Commands:
```bash
# Check app status
curl https://your-app-name.onrender.com/

# Check specific endpoints
curl https://your-app-name.onrender.com/health

# Test webhook endpoint
curl -X GET "https://your-app-name.onrender.com/webhook?hub.mode=subscribe&hub.verify_token=3732299207071787&hub.challenge=test123"
```

## 🔄 Updates and Maintenance

### Automatic Deployments
With auto-deploy enabled:
1. Push changes to GitHub main branch
2. Render automatically rebuilds and deploys
3. Zero-downtime deployment

### Manual Deployments
1. Go to Render Dashboard
2. Select your service
3. Click **"Manual Deploy"**
4. Select **"Deploy latest commit"**

### Environment Variables Update
1. Go to service settings
2. Update environment variables
3. Service automatically restarts

## 💰 Cost Considerations

### Free Tier Limits:
- **750 hours/month** (sufficient for most use cases)
- **Apps sleep after 15 minutes** of inactivity
- **Automatic wake-up** on first request
- **512 MB RAM, 0.1 CPU**

### Paid Tier Benefits ($7/month):
- **24/7 availability** (no sleeping)
- **More resources** (512 MB+ RAM)
- **Faster deployments**
- **Custom domains**

## 🎯 Success Metrics

After deployment, monitor:
- **Response time**: < 2 seconds for health checks
- **Uptime**: 99%+ availability
- **User engagement**: Track via Supabase analytics
- **Error rates**: Monitor logs for issues

## 🆘 Support

### Getting Help:
1. **Render Documentation**: render.com/docs
2. **Render Community**: community.render.com
3. **GitHub Issues**: Create issues in your repository
4. **Logs**: Always check Render logs first

### Emergency Procedures:
1. **App Down**: Check Render status page
2. **Database Issues**: Verify Supabase status
3. **WhatsApp Issues**: Check Meta API status
4. **Quick Rollback**: Redeploy previous working commit

---

## 🎉 Congratulations!

Your WhatsApp Healthcare Bot is now live and ready to serve users! 

**Your deployment URL**: `https://your-app-name.onrender.com`
**WhatsApp webhook**: `https://your-app-name.onrender.com/webhook`

The bot is now capable of:
✅ Serving users in 5 languages  
✅ Providing AI-powered health guidance  
✅ Handling emergency situations  
✅ Tracking user feedback and accuracy  
✅ Maintaining conversation context  

**Next steps**: Test thoroughly and start helping rural communities access healthcare information! 🏥💚