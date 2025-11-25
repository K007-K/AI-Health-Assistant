const GeminiService = require('../src/services/geminiService');
require('dotenv').config();

async function testSingleCall() {
    console.log('🧪 Testing Single API Call...');
    const service = new GeminiService();

    try {
        const response = await service.generateResponse(
            "Say 'Hello' if you can hear me.",
            'en',
            'native',
            [],
            'normal'
        );
        console.log('✅ Success! Response:', response);
        return true;
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return false;
    }
}

testSingleCall();
