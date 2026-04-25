import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("API key missing in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // Note: The SDK doesn't have a direct listModels method on genAI in all versions, 
    // but we can try to fetch it via the REST API if needed.
    // However, let's try the common models first.
    console.log("Checking available models...");
    
    // Attempting to use a known working model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Gemini 1.5 Flash is working.");
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.message);
  }
}

listModels();
