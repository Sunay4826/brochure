/**
 * Gemini-only LLM selection.
 *
 * The app no longer supports OpenAI keys.
 * Set one of: GEMINI_API_KEY, GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY.
 *
 * Note: `ensureBrochureEnvLoaded()` is called in the API route before using this.
 */

export type LlmBackend = "gemini";

export function getGeminiApiKey(): string | undefined {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return k || undefined;
}

export function getLlmBackend(): LlmBackend | null {
  if (getGeminiApiKey()) return "gemini";
  return null;
}

export function hasAnyLlmKey(): boolean {
  return getLlmBackend() !== null;
}
