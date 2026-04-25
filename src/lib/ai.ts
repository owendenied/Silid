import { geminiModel } from "./gemini";

export async function askGemini(prompt: string): Promise<string> {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini error:", error);
    return "AI error.";
  }
}
