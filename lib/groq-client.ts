import { getGroqApiKey } from "./llm-provider";

type GroqMessage = {
  role: "system" | "user";
  content: string;
};

type GroqChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
};

async function requestGroq(options: {
  messages: GroqMessage[];
  jsonMode?: boolean;
}): Promise<string> {
  const key = getGroqApiKey();
  if (!key) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: 0.4,
      max_completion_tokens: options.jsonMode ? 1200 : 1800,
      ...(options.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GroqChatResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq request failed (${res.status})`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty response");
  }
  return text;
}

export async function groqGenerate(options: {
  systemInstruction?: string;
  prompt: string;
  jsonMode?: boolean;
}): Promise<string> {
  const messages: GroqMessage[] = [];
  if (options.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  messages.push({ role: "user", content: options.prompt });

  try {
    return await requestGroq({
      messages,
      jsonMode: options.jsonMode,
    });
  } catch (error) {
    if (!options.jsonMode) throw error;

    const message = error instanceof Error ? error.message : "";
    if (!message.toLowerCase().includes("response_format")) {
      throw error;
    }

    return requestGroq({
      messages: [
        {
          role: "system",
          content:
            "Return valid JSON only. Do not include markdown fences or explanation.",
        },
        ...messages,
      ],
    });
  }
}
