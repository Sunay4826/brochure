import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "./llm-provider";

export async function geminiGenerate(options: {
  systemInstruction?: string;
  prompt: string;
  jsonMode?: boolean;
}): Promise<string> {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set");
  }

  const modelId =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: options.systemInstruction,
    generationConfig: options.jsonMode
      ? { responseMimeType: "application/json" as const }
      : undefined,
  });

  const result = await model.generateContent(options.prompt);
  const text = result.response.text();
  return text.trim();
}
