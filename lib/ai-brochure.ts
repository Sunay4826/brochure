import { groqGenerate } from "./groq-client";
import { getLlmBackend } from "./llm-provider";
import type { BrochureData } from "./extract-brochure";

export async function enhanceBrochureWithAi(
  draft: BrochureData
): Promise<BrochureData> {
  const backend = getLlmBackend();
  if (!backend) return draft;

  const prompt = `You refine website content into a short print brochure. Keep facts faithful; do not invent products, prices, or claims not implied by the source. Output valid JSON only, no markdown.

Schema:
{
  "siteName": string (short brand/site name),
  "tagline": string (one compelling line, max 200 chars),
  "sections": [ { "title": string, "body": string } ] (3 to 6 sections, body max 400 chars each),
  "highlights": string[] (4 to 8 short bullets, each max 120 chars)
}

Source URL (for context only, do not repeat as body text): ${draft.sourceUrl}

Draft JSON to improve:
${JSON.stringify({
    siteName: draft.siteName,
    tagline: draft.tagline,
    sections: draft.sections,
    highlights: draft.highlights,
  })}`;

  let text: string | undefined;
  try {
    text = await groqGenerate({
      systemInstruction:
        "You are a concise marketing copy editor. Respond with JSON only.",
      prompt,
      jsonMode: true,
    });
  } catch {
    return draft;
  }

  if (!text) return draft;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return draft;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("siteName" in parsed) ||
    !("tagline" in parsed)
  ) {
    return draft;
  }

  const o = parsed as Record<string, unknown>;
  const sections = Array.isArray(o.sections) ? o.sections : [];
  const highlights = Array.isArray(o.highlights) ? o.highlights : [];

  return {
    siteName: String(o.siteName || draft.siteName).slice(0, 120),
    tagline: String(o.tagline || draft.tagline).slice(0, 360),
    sections: sections
      .slice(0, 8)
      .map((s: unknown) => {
        if (typeof s !== "object" || s === null) {
          return { title: "", body: "" };
        }
        const r = s as Record<string, unknown>;
        return {
          title: String(r.title || "").slice(0, 140),
          body: String(r.body || "").slice(0, 500),
        };
      })
      .filter((s) => s.title && s.body),
    highlights: highlights
      .map((h) => String(h).slice(0, 140))
      .filter(Boolean)
      .slice(0, 10),
    sourceUrl: draft.sourceUrl,
  };
}
