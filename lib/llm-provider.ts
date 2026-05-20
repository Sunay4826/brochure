export type LlmBackend = "groq";

export function getGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || undefined;
}

export function getLlmBackend(): LlmBackend | null {
  if (getGroqApiKey()) return "groq";
  return null;
}

export function hasAnyLlmKey(): boolean {
  return getLlmBackend() !== null;
}
