const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Read API key from .env file
const envFile = fs.readFileSync(".env", "utf8");
const apiKeyMatch = envFile.match(/GEMINI_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

console.log("API Key found:", apiKey ? "✅ Yes" : "❌ No");
console.log("API Key length:", apiKey?.length || 0);
console.log("\nTesting different model names...\n");

const modelsToTest = [
  "gemini-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest", 
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-2.0-flash-exp",
  "models/gemini-pro",
  "models/gemini-1.5-flash",
  "models/gemini-1.5-flash-latest"
];

async function testModel(modelName) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello in one word");
    const response = await result.response;
    const text = response.text();
    console.log(`✅ ${modelName.padEnd(35)} WORKS! Response: ${text.trim()}`);
    return true;
  } catch (error) {
    const msg = error.message.substring(0, 80);
    console.log(`❌ ${modelName.padEnd(35)} ${msg}`);
    return false;
  }
}

async function main() {
  if (!apiKey) {
    console.log("❌ No API key found in .env file!");
    return;
  }

  let workingModel = null;
  
  for (const modelName of modelsToTest) {
    const works = await testModel(modelName);
    if (works && !workingModel) {
      workingModel = modelName;
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
  }

  console.log("\n" + "=".repeat(70));
  if (workingModel) {
    console.log(`\n✅ WORKING MODEL FOUND: ${workingModel}`);
    console.log(`\nUpdate lib/ai/gemini-client.ts line 12 to:`);
    console.log(`export const geminiModel = genAI.getGenerativeModel({ model: "${workingModel}" });`);
  } else {
    console.log("\n❌ No working models found. Possible issues:");
    console.log("   1. API key might be invalid");
    console.log("   2. API key might not have access to Gemini API");
    console.log("   3. Check: https://aistudio.google.com/apikey");
  }
  console.log("=".repeat(70) + "\n");
}

main().catch(console.error);



