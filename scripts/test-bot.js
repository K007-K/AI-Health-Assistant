const axios = require('axios');
const config = require('../src/config/environment');
const { testConnection } = require('../src/config/database');
const GeminiService = require('../src/services/geminiService');

async function testBot() {
  console.log('🧪 Testing WhatsApp Healthcare Bot...\n');

  // Test 1: Environment Configuration
  console.log('1️⃣ Testing Environment Configuration:');
  const requiredVars = ['WHATSAPP_ACCESS_TOKEN', 'GEMINI_API_KEY', 'SUPABASE_URL'];
  let configTest = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: Configured`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
      configTest = false;
    }
  });

  if (!configTest) {
    console.log('\n❌ Please configure your environment variables in .env file');
    return;
  }

  // Test 2: Database Connection
  console.log('\n2️⃣ Testing Database Connection:');
  try {
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('   ✅ Database: Connected successfully');
    } else {
      console.log('   ⚠️  Database: Connected but tables may need setup');
    }
  } catch (error) {
    console.log(`   ❌ Database: Connection failed - ${error.message}`);
  }

  // Test 3: Gemini AI Service
  console.log('\n3️⃣ Testing Gemini AI Service:');
  try {
    const geminiService = new GeminiService();
    const testWorking = await geminiService.testService();
    if (testWorking) {
      console.log('   ✅ Gemini AI: Service working correctly');
    } else {
      console.log('   ❌ Gemini AI: Service test failed');
    }
  } catch (error) {
    console.log(`   ❌ Gemini AI: Error - ${error.message}`);
  }

  // Test 4: WhatsApp API Access
  console.log('\n4️⃣ Testing WhatsApp API Access:');
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${config.whatsapp.phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`
        }
      }
    );
    
    if (response.data) {
      console.log('   ✅ WhatsApp API: Access token valid');
      console.log(`   📱 Phone Number: ${response.data.display_phone_number || 'Unknown'}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('   ❌ WhatsApp API: Invalid access token');
    } else {
      console.log(`   ❌ WhatsApp API: Error - ${error.message}`);
    }
  }

  // Test 5: Server Health
  console.log('\n5️⃣ Testing Server Health:');
  try {
    // Start server briefly for testing
    const app = require('../src/app');
    const server = app.listen(3001, () => {
      console.log('   ✅ Server: Started successfully on port 3001');
    });

    // Test health endpoint
    setTimeout(async () => {
      try {
        const healthResponse = await axios.get('http://localhost:3001/health');
        console.log(`   ✅ Health Check: ${healthResponse.data.status}`);
      } catch (error) {
        console.log(`   ❌ Health Check: Failed - ${error.message}`);
      }
      
      server.close();
    }, 1000);

  } catch (error) {
    console.log(`   ❌ Server: Failed to start - ${error.message}`);
  }

  console.log('\n🎉 Bot testing completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Fix any failing tests above');
  console.log('2. Run: npm start');
  console.log('3. Configure your WhatsApp webhook URL');
  console.log('4. Send "Hi" to your WhatsApp Business number to test');
}

if (require.main === module) {
  testBot().catch(console.error);
}

module.exports = { testBot };