/**
 * Script to test which Gemini models work with your API key
 * Run with: node --loader ts-node/esm scripts/test-gemini-models.ts
 * Or simply: npm run test-gemini
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in environment variables");
  console.log("Please add it to your .env file:");
  console.log("GEMINI_API_KEY=your_api_key_here");
  process.exit(1);
}

console.log("✅ API Key found:", apiKey.substring(0, 10) + "...");
console.log("\n🔍 Testing available Gemini models...\n");

const modelsToTest = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest", 
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
];

async function testModel(modelName: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Try a simple test prompt
    const result = await model.generateContent("Say 'Hello'");
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ ${modelName}: WORKS`);
    console.log(`   Response: ${text.substring(0, 50)}...`);
    return true;
  } catch (error: any) {
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      console.log(`❌ ${modelName}: NOT FOUND (404)`);
    } else if (error.message?.includes("API key")) {
      console.log(`❌ ${modelName}: INVALID API KEY`);
    } else {
      console.log(`❌ ${modelName}: ERROR - ${error.message}`);
    }
    return false;
  }
}

async function main() {
  let workingModels: string[] = [];
  
  for (const modelName of modelsToTest) {
    const works = await testModel(modelName);
    if (works) {
      workingModels.push(modelName);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 SUMMARY:");
  console.log(`\n✅ Working models (${workingModels.length}):`);
  
  if (workingModels.length > 0) {
    workingModels.forEach(model => {
      console.log(`   - ${model}`);
    });
    
    console.log("\n💡 RECOMMENDATION:");
    console.log(`   Update lib/ai/gemini-client.ts to use: "${workingModels[0]}"`);
    console.log("\n   Fast option: gemini-1.5-flash-latest");
    console.log("   Best quality: gemini-1.5-pro-latest");
    console.log("   Newest (experimental): gemini-2.0-flash-exp");
  } else {
    console.log("\n❌ No working models found!");
    console.log("\n🔧 TROUBLESHOOTING:");
    console.log("   1. Check your API key is valid");
    console.log("   2. Ensure you have access to Gemini API");
    console.log("   3. Visit: https://aistudio.google.com/apikey");
  }
  
  console.log("\n" + "=".repeat(60) + "\n");
}

main().catch(console.error);

