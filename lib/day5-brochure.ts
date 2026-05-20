/**
 * Smart brochure flow:
 * 1) LLM picks relevant links (JSON)
 * 2) Fetch landing + selected pages
 * 3) Chunk and retrieve the best passages with local keyword RAG
 * 4) LLM writes a markdown brochure from retrieved context
 *
 * LLM: Groq.
 */

import { groqGenerate } from "./groq-client";
import { getLlmBackend } from "./llm-provider";
import { assertPublicHttpUrl } from "./ssrf";
import {
  FETCH_HEADERS,
  fetchPublicUrl,
  parsePageLikeWebsiteClass,
  type ParsedPage,
} from "./fetch-page";
import {
  formatRagContext,
  retrieveRelevantChunks,
  type RagDocument,
  type RagSource,
} from "./rag";

/** Step 1 — same wording as the course notebook. */
export const LINK_SYSTEM_PROMPT =
  "You are provided with a list of links found on a webpage. " +
  "Choose links that would help create a useful customer-facing brochure about the website's actual offering. " +
  "Prefer product, features, docs/get-started, pricing, customers/showcase, case studies, about, contact, and blog/release pages. " +
  "Only include careers/jobs/team pages when the site is clearly recruiting or when those pages explain the organization in a brochure-relevant way.\n" +
  "You should respond in JSON as in this example:" +
  `
{
    "links": [
        {"type": "about page", "url": "https://full.url/goes/here/about"},
        {"type": "careers page", "url": "https://another.full.url/careers"}
    ]
}
` +
  "And this example:" +
  `
{
    "links": [
        {"type": "for-you page", "url": "https://full.url/goes/here/services"},
        {"type": "speak-to-a-human page", "url": "https://another.full.url/contact-us"}
    ]
}
`;

export type BrochureTone = "professional" | "humorous";

export type SelectedLink = { type: string; url: string };

function resolvePublicUrl(href: string, baseUrl: string): string | null {
  try {
    const absolute = new URL(href.trim(), baseUrl).toString();
    assertPublicHttpUrl(absolute);
    return absolute;
  } catch {
    return null;
  }
}

function linksUserPrompt(websiteUrl: string, rawLinks: string[]): string {
  const capped = rawLinks.slice(0, 200);
  let userPrompt = `Here is the list of links on the website of ${websiteUrl} - `;
  userPrompt +=
    "please decide which links are most useful for a polished brochure about the product, service, or organization. Respond with the full https URL in JSON format. ";
  userPrompt +=
    "Do not include Terms of Service, Privacy, cookie, telemetry, governance, social, email, or generic GitHub links unless the website itself is mainly an open-source developer project.\nLinks (some might be relative links):\n";
  userPrompt += capped.join("\n");
  return userPrompt;
}

function parseLinksJson(raw: string): SelectedLink[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return [];
  }

  if (typeof parsed !== "object" || parsed === null || !("links" in parsed)) {
    return [];
  }

  const arr = (parsed as { links: unknown }).links;
  if (!Array.isArray(arr)) return [];

  const out: SelectedLink[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    out.push({
      type: String(o.type || "page"),
      url: String(o.url || ""),
    });
  }
  return out;
}

/** Resolve relative URLs and drop non-public / invalid links. */
function normalizeSelectedLinks(
  items: SelectedLink[],
  websiteUrl: string
): SelectedLink[] {
  const out: SelectedLink[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const safe = resolvePublicUrl(item.url, websiteUrl);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push({ type: item.type, url: safe });
    if (out.length >= 8) break;
  }
  return out;
}

async function llmJsonLinks(
  websiteUrl: string,
  landing: ParsedPage
): Promise<SelectedLink[]> {
  const user = linksUserPrompt(websiteUrl, landing.links);

  const raw = await groqGenerate({
    systemInstruction: LINK_SYSTEM_PROMPT,
    prompt: user,
    jsonMode: true,
  });
  return normalizeSelectedLinks(parseLinksJson(raw), websiteUrl);
}

export async function llmSelectLinks(
  websiteUrl: string,
  landing: ParsedPage
): Promise<SelectedLink[]> {
  const backend = getLlmBackend();
  if (!backend) return [];
  return llmJsonLinks(websiteUrl, landing);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetchPublicUrl(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(22_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
    throw new Error("Not HTML");
  }
  return res.text();
}

async function gatherRagContext(
  baseUrl: string,
  companyName: string,
  landingHtml: string,
  tone: BrochureTone,
  maxExtraPages: number
): Promise<{
  context: string;
  selectedLinks: SelectedLink[];
  retrievedSources: RagSource[];
}> {
  const landing = parsePageLikeWebsiteClass(landingHtml);
  const documents: RagDocument[] = [
    {
      title: landing.title,
      url: baseUrl,
      type: "landing page",
      text: landing.text,
    },
  ];

  const selected = await llmSelectLinks(baseUrl, landing);
  const limited = selected.slice(0, maxExtraPages);

  for (const link of limited) {
    try {
      const html = await fetchHtml(link.url);
      if (html.length > 1_200_000) continue;
      const page = parsePageLikeWebsiteClass(html);
      documents.push({
        title: page.title,
        url: link.url,
        type: link.type,
        text: page.text,
      });
    } catch {
      /* skip broken secondary pages */
    }
  }

  const retrievalQuery = [
    companyName,
    "brochure overview value proposition product features services benefits",
    "who it is for customers showcase proof use cases pricing getting started",
    "docs learn releases performance reliability developer experience",
    tone === "humorous" ? "memorable playful entertaining" : "professional concise credible",
  ].join(" ");
  const retrievedSources = retrieveRelevantChunks(documents, retrievalQuery, {
    topK: 9,
  });

  return {
    context: formatRagContext(retrievedSources, 12_000),
    selectedLinks: limited,
    retrievedSources,
  };
}

function brochureSystemPrompt(tone: BrochureTone): string {
  const base =
    "You create a polished, customer-facing markdown brochure from retrieved website context. " +
    "Write about what the site actually offers: product, service, benefits, audience, use cases, proof points, and next steps. " +
    "Use only facts supported by the retrieved context. Do not invent statistics, customers, culture, hiring, careers, investors, or company claims. " +
    "If a category is not supported by the context, omit it entirely. " +
    "Do not mention RAG, retrieval, source chunks, scores, or internal pipeline details. " +
    "Avoid generic filler and avoid saying 'amazing applications' unless that phrase appears in the context. " +
    "Use this exact markdown structure: one '# Title', then one plain subtitle paragraph with no heading marker, then 4 to 6 '## Section' blocks. " +
    "Do not use '###' headings. Do not create report-style labels unless they work as brochure section names. " +
    "End with a short call to action based on the source site.";

  if (tone === "humorous") {
    return (
      base +
      " Keep the tone witty and light, but keep every factual claim grounded in the context. Respond in markdown."
    );
  }
  return base + " Keep the tone professional, specific, and concise. Respond in markdown.";
}

function brochureUserPrompt(
  companyName: string,
  url: string,
  retrievedContext: string,
  maxChars: number
): string {
  let userPrompt = `You are looking at a company called: ${companyName}\n`;
  userPrompt +=
    `Source URL: ${url}\n`;
  userPrompt +=
    "Use only the retrieved context below to build a short brochure in markdown. Do not invent facts that are not supported by the retrieved context.\n";
  userPrompt +=
    "Make the brochure useful to a visitor deciding whether to use this product/service. Prefer concrete capabilities, benefits, audience, proof, and next steps over generic company sections.\n";
  userPrompt +=
    "Only include sections like Company Culture, Customers, Careers, or Investors when the retrieved context contains direct supporting details for that exact section. Otherwise omit them.\n";
  userPrompt +=
    "Keep the details brief and scannable for a simple hand-out flyer.\n";
  userPrompt += "\nRetrieved RAG context:\n";
  userPrompt += retrievedContext;
  return userPrompt.slice(0, maxChars);
}

export type Day5BrochureResult = {
  markdown: string;
  selectedLinks: SelectedLink[];
  retrievedSources: RagSource[];
};

/**
 * Full smart brochure pipeline: LLM link selection + scrape + keyword RAG retrieval + generation.
 */
export async function runDay5Brochure(options: {
  companyName: string;
  pageUrl: string;
  landingHtml: string;
  tone: BrochureTone;
  /** Like the notebook’s 5_000-char truncate on the assembled prompt. */
  maxContextChars?: number;
  maxExtraPages?: number;
}): Promise<Day5BrochureResult> {
  const {
    companyName,
    pageUrl,
    landingHtml,
    tone,
    maxContextChars = 12_000,
    maxExtraPages = 6,
  } = options;

  const backend = getLlmBackend();
  if (!backend) {
    throw new Error("No Groq API key (set GROQ_API_KEY)");
  }

  const { context, selectedLinks, retrievedSources } = await gatherRagContext(
    pageUrl,
    companyName,
    landingHtml,
    tone,
    maxExtraPages
  );

  const userContent = brochureUserPrompt(
    companyName,
    pageUrl,
    context,
    maxContextChars
  );

  const markdown = await groqGenerate({
    systemInstruction: brochureSystemPrompt(tone),
    prompt: userContent,
  });

  return { markdown, selectedLinks, retrievedSources };
}
