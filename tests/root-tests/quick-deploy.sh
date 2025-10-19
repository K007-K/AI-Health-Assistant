#!/bin/bash

echo "🚀 WhatsApp Healthcare Bot - Quick Deployment"
echo "=============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please create .env file with your credentials:"
    echo "   WHATSAPP_ACCESS_TOKEN=your_token"
    echo "   WHATSAPP_PHONE_NUMBER_ID=your_phone_id"
    echo "   GOOGLE_AI_API_KEY=your_gemini_key"
    echo "   SUPABASE_URL=your_supabase_url"
    echo "   SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key"
    exit 1
fi

echo "✅ .env file found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if all required packages are installed
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Start the bot
echo "🚀 Starting WhatsApp Healthcare Bot..."
echo "📱 Bot will be available at: http://localhost:3000"
echo "🔗 Webhook URL: http://localhost:3000/webhook"
echo ""
echo "🎯 Features Ready:"
echo "   🤖 Chat with AI"
echo "   🩺 Check Symptoms (Just Implemented!)"
echo "   🌱 Health Tips"
echo "   🦠 Disease Outbreak Alerts"
echo "   🌐 5 Languages + Transliteration"
echo ""
echo "⚠️  Make sure your WhatsApp webhook points to your domain/webhook"
echo "📋 Press Ctrl+C to stop the bot"
echo ""

# Start the application
npm start
