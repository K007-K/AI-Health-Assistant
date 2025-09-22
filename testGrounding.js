const AIDiseaseMonitorService = require('./src/services/aiDiseaseMonitorService');

(async () => {
  try {
    console.log('🧪 DIRECTLY TESTING GOOGLE GEMINI GROUNDING TOOL...');
    console.log('==================================================');
    
    const aiService = new AIDiseaseMonitorService();
    
    console.log('\n🌍 FETCHING NATIONWIDE DATA WITH ENHANCED PROMPT:');
    console.log('================================================');
    
    const nationalResponse = await aiService.fetchNationwideDiseases();
    
    console.log('\n📄 AI-GENERATED RESPONSE:');
    console.log('--------------------------');
    console.log(nationalResponse);
    
    console.log('\n\n🔍 ANALYSIS OF GROUNDING EFFECTIVENESS:');
    console.log('------------------------------------------');
    
    const hasSeptember2025 = nationalResponse.includes('September 2025') || nationalResponse.includes('2025-09');
    const hasOldDiseases = nationalResponse.toLowerCase().includes('h3n2') || nationalResponse.toLowerCase().includes('influenza a');
    
    console.log(`- Contains 'September 2025'? ${hasSeptember2025 ? '✅ YES' : '❌ NO'}`);
    console.log(`- Contains outdated diseases (H3N2)? ${hasOldDiseases ? '❌ YES (Problem)' : '✅ NO (Good)'}`);
    
    console.log('\n\n🎯 CONCLUSION:');
    console.log('---------------');
    if (hasSeptember2025 && !hasOldDiseases) {
      console.log('✅ The grounding tool IS working correctly with the enhanced prompts.');
      console.log('   It is successfully fetching real-time, current information as requested.');
    } else {
      console.log('❌ The grounding tool is not returning the expected real-time data.');
      console.log('   Further prompt refinement may be needed.');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  }
})();
