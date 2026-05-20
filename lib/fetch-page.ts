import * as cheerio from "cheerio";
import { assertPublicHttpUrl } from "./ssrf";

/** Mirrors the course `Website` class headers (day5 / day2 notebook). */
export const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchPublicUrl(
  url: string,
  init?: RequestInit,
  maxRedirects = 5
): Promise<Response> {
  let current = assertPublicHttpUrl(url).toString();

  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
    });

    if (![301, 302, 303, 307, 308].includes(res.status)) {
      return res;
    }

    const location = res.headers.get("location");
    if (!location) {
      return res;
    }

    current = assertPublicHttpUrl(
      new URL(location, current).toString()
    ).toString();
  }

  throw new Error("Too many redirects");
}

export type ParsedPage = {
  title: string;
  text: string;
  links: string[];
};

/**
 * Same structure as the Week 1 Day 5 `Website.get_contents()` string builder expects.
 */
export function parsePageLikeWebsiteClass(html: string): ParsedPage {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || "No title found";

  const body = $("body");
  if (body.length) {
    body.find("script, style, img, input").remove();
  }

  const text = body.length
    ? body
        .text()
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n")
    : "";

  const links: string[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });

  return { title, text, links };
}

export function formatWebpageContents(p: ParsedPage): string {
  return `Webpage Title:\n${p.title}\nWebpage Contents:\n${p.text}\n\n`;
}
