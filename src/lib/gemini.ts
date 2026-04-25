import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Gemini API key missing");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Using 'gemini-flash-latest' as 'gemini-1.5-flash' is not available in this environment.
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest"
});
