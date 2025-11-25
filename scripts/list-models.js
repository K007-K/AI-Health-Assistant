const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy init to get client
        // Actually, we need the model manager or just use the API directly if SDK doesn't expose it easily in this version
        // But SDK usually has a way. Let's try to just use a known working model to check auth first, oh wait, we know auth works.

        // The SDK doesn't have a direct 'listModels' on the instance in some versions.
        // Let's try to fetch it via REST if SDK fails, but let's try to just run a simple script that prints the error details more clearly.

        console.log("Testing model availability...");

        // Try gemini-1.5-flash again but print full error
        const model15 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        try {
            await model15.generateContent("test");
            console.log("✅ gemini-1.5-flash is WORKING");
        } catch (e) {
            console.log("❌ gemini-1.5-flash failed: " + e.message);
        }

        // Try gemini-pro
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        try {
            await modelPro.generateContent("test");
            console.log("✅ gemini-pro is WORKING");
        } catch (e) {
            console.log("❌ gemini-pro failed: " + e.message);
        }

        // Try gemini-2.0-flash-exp
        const model20 = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        try {
            await model20.generateContent("test");
            console.log("✅ gemini-2.0-flash-exp is WORKING");
        } catch (e) {
            console.log("❌ gemini-2.0-flash-exp failed: " + e.message);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
