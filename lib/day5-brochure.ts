/**
 * Week 1 Day 5 brochure flow (Ed Donner course), ported from
 * `llm_engineering/week1/community-contributions/rwothoromo/day5.ipynb`:
 * 1) LLM picks relevant links (JSON)
 * 2) Fetch landing + selected pages
 * 3) LLM writes a markdown brochure
 *
 * LLM: Gemini only.
 */

import { geminiGenerate } from "./gemini-client";
import { getLlmBackend } from "./llm-provider";
import { assertPublicHttpUrl } from "./ssrf";
import {
  FETCH_HEADERS,
  formatWebpageContents,
  parsePageLikeWebsiteClass,
  type ParsedPage,
} from "./fetch-page";

/** Step 1 — same wording as the course notebook. */
export const LINK_SYSTEM_PROMPT =
  "You are provided with a list of links found on a webpage. " +
  "You are able to decide which of the links would be most relevant to include in a brochure about the company, " +
  "such as links to an About page, or a Company page, or Careers/Jobs pages.\n" +
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
    "please decide which of these are relevant web links for a brochure about the company, respond with the full https URL in JSON format. ";
  userPrompt +=
    "Do not include Terms of Service, Privacy, email links.\nLinks (some might be relative links):\n";
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

  const raw = await geminiGenerate({
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
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(22_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
    throw new Error("Not HTML");
  }
  return res.text();
}

async function gatherAllDetails(
  baseUrl: string,
  landingHtml: string,
  maxExtraPages: number
): Promise<{ text: string; selectedLinks: SelectedLink[] }> {
  const landing = parsePageLikeWebsiteClass(landingHtml);
  let result = "Landing page:\n";
  result += formatWebpageContents(landing);

  const selected = await llmSelectLinks(baseUrl, landing);
  const limited = selected.slice(0, maxExtraPages);

  for (const link of limited) {
    try {
      const html = await fetchHtml(link.url);
      if (html.length > 1_200_000) continue;
      const page = parsePageLikeWebsiteClass(html);
      result += `\n\n${link.type}\n`;
      result += formatWebpageContents(page);
    } catch {
      /* skip broken secondary pages */
    }
  }

  return { text: result, selectedLinks: limited };
}

function brochureSystemPrompt(tone: BrochureTone): string {
  if (tone === "humorous") {
    return (
      "You are an assistant that analyzes the contents of several relevant pages from a company website " +
      "and creates a short humorous, entertaining, jokey brochure about the company for prospective customers, investors and recruits. Respond in markdown. " +
      "Include details of company culture, customers and careers/jobs if you have the information."
    );
  }
  return (
    "You are an assistant that analyzes the contents of several relevant pages from a company website " +
    "and creates a short brochure about the company for prospective customers, investors and recruits. Respond in markdown. " +
    "Include details of company culture, customers and careers/jobs if you have the information."
  );
}

function brochureUserPrompt(
  companyName: string,
  url: string,
  details: string,
  maxChars: number
): string {
  let userPrompt = `You are looking at a company called: ${companyName}\n`;
  userPrompt +=
    "Here are the contents of its landing page and other relevant pages; use this information to build a short brochure of the company in markdown.\n";
  userPrompt +=
    "Keep the details brief or concise, factoring in that they would be printed on a simple hand-out flyer.\n";
  userPrompt += details;
  return userPrompt.slice(0, maxChars);
}

export type Day5BrochureResult = {
  markdown: string;
  selectedLinks: SelectedLink[];
};

/**
 * Full Day 5 pipeline: multi-page scrape + two LLM calls (links, then brochure).
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
    throw new Error("No Gemini API key (set GEMINI_API_KEY)");
  }

  const { text: details, selectedLinks } = await gatherAllDetails(
    pageUrl,
    landingHtml,
    maxExtraPages
  );

  const userContent = brochureUserPrompt(
    companyName,
    pageUrl,
    details,
    maxContextChars
  );

  const markdown = await geminiGenerate({
    systemInstruction: brochureSystemPrompt(tone),
    prompt: userContent,
  });

  return { markdown, selectedLinks };
}
