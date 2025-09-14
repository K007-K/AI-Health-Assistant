#!/bin/bash

# WhatsApp Healthcare Bot - Package Installation Script
echo "🏥 Installing WhatsApp Healthcare Bot dependencies..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 16+."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Clean npm cache if previous installation failed
echo "🧹 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Try different installation methods
echo "📦 Installing dependencies..."

# Method 1: Standard npm install
if npm install; then
    echo "✅ Dependencies installed successfully with npm"
    npm run test-env 2>/dev/null || echo "⚠️  Run 'npm start' to start the bot"
    exit 0
fi

echo "⚠️  npm install failed, trying alternative methods..."

# Method 2: Install with legacy peer deps
if npm install --legacy-peer-deps; then
    echo "✅ Dependencies installed successfully with legacy peer deps"
    exit 0
fi

# Method 3: Try yarn
if command -v yarn &> /dev/null; then
    echo "📦 Trying with yarn..."
    if yarn install; then
        echo "✅ Dependencies installed successfully with yarn"
        exit 0
    fi
else
    echo "📦 Installing yarn..."
    npm install -g yarn 2>/dev/null || true
    if command -v yarn &> /dev/null; then
        if yarn install; then
            echo "✅ Dependencies installed successfully with yarn"
            exit 0
        fi
    fi
fi

# Method 4: Install critical packages individually
echo "📦 Installing critical packages individually..."
CRITICAL_PACKAGES=(
    "express@^4.18.2"
    "axios@^1.6.0"
    "dotenv@^16.3.1"
    "@supabase/supabase-js@^2.38.0"
    "@google/generative-ai@^0.15.0"
    "cors@^2.8.5"
    "helmet@^7.1.0"
    "winston@^3.11.0"
    "uuid@^9.0.1"
)

for package in "${CRITICAL_PACKAGES[@]}"; do
    echo "Installing $package..."
    npm install "$package" --no-save || echo "Failed to install $package"
done

echo "📦 Installing remaining packages..."
npm install 2>/dev/null || echo "Some packages may have failed to install"

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with API keys"
echo "2. Run: node scripts/test-bot.js"
echo "3. Run: npm start"
echo ""
echo "📖 See SETUP.md for detailed configuration instructions"