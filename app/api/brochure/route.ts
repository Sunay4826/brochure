import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertPublicHttpUrl } from "@/lib/ssrf";
import { extractBrochureFromHtml } from "@/lib/extract-brochure";
import { enhanceBrochureWithAi } from "@/lib/ai-brochure";
import { runDay5Brochure } from "@/lib/day5-brochure";
import { FETCH_HEADERS, fetchPublicUrl } from "@/lib/fetch-page";
import { ensureBrochureEnvLoaded } from "@/lib/ensure-env";
import { hasAnyLlmKey } from "@/lib/llm-provider";
import type { RagSource } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(4),
  /** Quick layout from HTML only, optional JSON polish. */
  useAi: z.boolean().optional().default(false),
  /** `day5` = course notebook flow: LLM picks links, fetch extra pages, markdown brochure. */
  mode: z.enum(["layout", "day5"]).optional().default("layout"),
  companyName: z.string().max(200).optional(),
  tone: z.enum(["professional", "humorous"]).optional().default("professional"),
});

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(sourceUrl: string, text: string): string {
  const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const safe = escapeHtml(text.slice(0, 180_000));
  return `<!doctype html><html><head><meta charset=\"utf-8\" /><title>${escapeHtml(
    hostname
  )}</title></head><body><main><h1>${escapeHtml(
    hostname
  )}</h1><pre>${safe}</pre></main></body></html>`;
}

async function fetchHtmlWithFallback(url: string): Promise<{
  ok: boolean;
  status: number;
  html?: string;
  usedFallback?: boolean;
}> {
  const primary = await fetchPublicUrl(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(25_000),
  });

  if (primary.ok) {
    const ctype = primary.headers.get("content-type") || "";
    if (
      !ctype.includes("text/html") &&
      !ctype.includes("application/xhtml")
    ) {
      return { ok: false, status: 400 };
    }
    return { ok: true, status: primary.status, html: await primary.text() };
  }

  // Some sites block server fetches (403). Fallback to a text-only fetch proxy.
  if (primary.status === 401 || primary.status === 403) {
    try {
      const proxyUrl = `https://r.jina.ai/http://${url.replace(
        /^https?:\/\//,
        ""
      )}`;
      const proxied = await fetchPublicUrl(proxyUrl, {
        signal: AbortSignal.timeout(25_000),
      });
      if (proxied.ok) {
        const text = await proxied.text();
        return {
          ok: true,
          status: 200,
          html: textToHtml(url, text),
          usedFallback: true,
        };
      }
    } catch {
      // ignore
    }
  }

  return { ok: false, status: primary.status };
}

export async function POST(req: NextRequest) {
  ensureBrochureEnvLoaded();
  try {
    const json = await req.json();
    const { url, useAi, mode, companyName, tone } = bodySchema.parse(json);
    const safeUrl = assertPublicHttpUrl(url);

    const fetched = await fetchHtmlWithFallback(safeUrl.toString());
    if (!fetched.ok || !fetched.html) {
      if (fetched.status === 400) {
        return NextResponse.json(
          { error: "URL did not return HTML; brochures need a web page." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: `Could not fetch page (HTTP ${fetched.status}). Some sites block automated fetching; try another URL.`,
        },
        { status: 502 }
      );
    }

    const html = fetched.html;
    if (html.length > 2_500_000) {
      return NextResponse.json(
        { error: "Page HTML is too large to process." },
        { status: 400 }
      );
    }

    let data = extractBrochureFromHtml(html, safeUrl.toString());
    let aiUsed = false;
    let markdownBrochure: string | undefined;
    let selectedLinks:
      | { type: string; url: string }[]
      | undefined;
    let ragSources: RagSource[] | undefined;

    if (mode === "day5") {
      if (!hasAnyLlmKey()) {
        return NextResponse.json(
          {
            error:
              "Smart brochure needs a Groq API key. Add GROQ_API_KEY to .env.local, then restart the app.",
          },
          { status: 400 }
        );
      }
      try {
        const name =
          (companyName && companyName.trim()) || data.siteName || "Company";
        const day5 = await runDay5Brochure({
          companyName: name,
          pageUrl: safeUrl.toString(),
          landingHtml: html,
          tone,
        });
        markdownBrochure = day5.markdown;
        selectedLinks = day5.selectedLinks;
        ragSources = day5.retrievedSources;
        aiUsed = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Day 5 brochure failed.";
        const lower = msg.toLowerCase();
        const quotaOrRateLimited =
          lower.includes("429") ||
          lower.includes("quota") ||
          lower.includes("too many requests") ||
          lower.includes("rate limit");

        // If the LLM is unavailable, fall back to layout mode for quota/rate-limit cases.
        if (quotaOrRateLimited) {
          return NextResponse.json({
            ok: true as const,
            data,
            aiUsed: false,
            aiAvailable: hasAnyLlmKey(),
            mode: "layout" as const,
            markdownBrochure: undefined,
            selectedLinks: undefined,
            ragSources: undefined,
            warning:
              "LLM quota/rate limit reached. Showing a non-LLM brochure layout instead.",
          });
        }

        return NextResponse.json({ error: msg }, { status: 502 });
      }
    } else if (useAi && hasAnyLlmKey()) {
      try {
        data = await enhanceBrochureWithAi(data);
        aiUsed = true;
      } catch {
        /* keep extracted draft */
      }
    }

    return NextResponse.json({
      ok: true as const,
      data,
      aiUsed,
      aiAvailable: hasAnyLlmKey(),
      mode,
      markdownBrochure,
      selectedLinks,
      ragSources,
      warning: fetched.usedFallback
        ? "This site blocked direct fetching (403). Used a text-only fallback, so results may be less accurate."
        : undefined,
    });
  } catch (e) {
    const message =
      e instanceof z.ZodError
        ? "Invalid request body"
        : e instanceof Error
          ? e.message
          : "Something went wrong";
    const status = e instanceof z.ZodError ? 400 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
