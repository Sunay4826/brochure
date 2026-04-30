import * as cheerio from "cheerio";

export type BrochureSection = { title: string; body: string };

export type BrochureData = {
  siteName: string;
  tagline: string;
  sections: BrochureSection[];
  highlights: string[];
  sourceUrl: string;
};

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function extractBrochureFromHtml(
  html: string,
  sourceUrl: string
): BrochureData {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg, template").remove();

  const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");

  const siteName =
    cleanText($('meta[property="og:site_name"]').attr("content") || "") ||
    cleanText($('meta[name="application-name"]').attr("content") || "") ||
    cleanText($("title").first().text()).split(/\s*[|–—-]\s*/)[0] ||
    hostname;

  const tagline =
    cleanText($('meta[property="og:description"]').attr("content") || "") ||
    cleanText($('meta[name="description"]').attr("content") || "") ||
    "";

  const sections: BrochureSection[] = [];
  const seenTitles = new Set<string>();

  $("h1, h2").each((_, el) => {
    const title = cleanText($(el).text());
    if (!title || title.length > 140) return;
    const key = title.toLowerCase();
    if (seenTitles.has(key)) return;
    seenTitles.add(key);

    let body = "";
    let sib = $(el).next();
    let hops = 0;
    while (sib.length && hops < 6) {
      const tag = sib.prop("tagName")?.toLowerCase() ?? "";
      if (tag === "h1" || tag === "h2") break;
      if (tag === "p") {
        const t = cleanText(sib.text());
        if (t.length > 20) body += t + "\n\n";
      }
      if (tag === "ul" || tag === "ol") {
        sib.find("li").each((__, li) => {
          const t = cleanText($(li).text());
          if (t.length > 5) body += "• " + t + "\n";
        });
        body += "\n";
      }
      sib = sib.next();
      hops++;
    }
    body = body.trim().slice(0, 900);
    sections.push({
      title,
      body: body || "See the live site for full details.",
    });
  });

  if (sections.length === 0) {
    const container = $("main, article, [role='main'], body").first();
    const paras: string[] = [];
    container.find("p").each((_, p) => {
      const t = cleanText($(p).text());
      if (t.length > 50 && t.length < 600) paras.push(t);
    });
    const slice = paras.slice(0, 6);
    slice.forEach((p, i) => {
      sections.push({
        title: i === 0 ? "Overview" : `Highlight ${i + 1}`,
        body: p,
      });
    });
  }

  if (sections.length === 0) {
    const fallback = cleanText($("body").text()).slice(0, 1200);
    sections.push({
      title: "From the page",
      body:
        fallback ||
        "We could not extract much text; the site may rely on JavaScript.",
    });
  }

  const highlights: string[] = [];
  const seenHi = new Set<string>();
  $("main li, article li, body li").each((_, li) => {
    const t = cleanText($(li).text());
    if (t.length < 12 || t.length > 220) return;
    const k = t.toLowerCase();
    if (seenHi.has(k)) return;
    seenHi.add(k);
    highlights.push(t);
  });

  const finalTagline =
    tagline.slice(0, 360) ||
    `Marketing-style snapshot generated from ${hostname}. Open the source link for the full experience.`;

  return {
    siteName: siteName.slice(0, 120),
    tagline: finalTagline,
    sections: sections.slice(0, 10),
    highlights: highlights.slice(0, 10),
    sourceUrl,
  };
}
