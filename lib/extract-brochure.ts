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

function isUsefulBody(body: string): boolean {
  const text = cleanText(body);
  return text.length >= 35 && !/^see the live site/i.test(text);
}

function isWeakTitle(title: string): boolean {
  const text = title.toLowerCase();
  return (
    title.length < 3 ||
    /^(resources|more|legal|footer|navigation|menu|social|subscribe)$/i.test(
      title
    ) ||
    text.includes("placeholder")
  );
}

function appendUniqueText(target: string[], text: string, min = 24): void {
  const cleaned = cleanText(text);
  if (cleaned.length < min || cleaned.length > 700) return;
  const key = cleaned.toLowerCase();
  if (target.some((item) => item.toLowerCase() === key)) return;
  target.push(cleaned);
}

export function extractBrochureFromHtml(
  html: string,
  sourceUrl: string
): BrochureData {
  const $ = cheerio.load(html);

  $(
    "script, style, noscript, iframe, svg, template, nav, header nav, footer"
  ).remove();

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
    if (!title || title.length > 140 || isWeakTitle(title)) return;
    const key = title.toLowerCase();
    if (seenTitles.has(key)) return;
    seenTitles.add(key);

    const bodyParts: string[] = [];
    let sib = $(el).next();
    let hops = 0;
    while (sib.length && hops < 8 && bodyParts.length < 4) {
      const tag = sib.prop("tagName")?.toLowerCase() ?? "";
      if (tag === "h1" || tag === "h2") break;
      if (tag === "p") {
        appendUniqueText(bodyParts, sib.text());
      }
      if (tag === "ul" || tag === "ol") {
        sib.find("li").each((__, li) => {
          const t = cleanText($(li).text());
          if (t.length > 10 && t.length < 180) {
            appendUniqueText(bodyParts, `• ${t}`, 12);
          }
        });
      }
      sib = sib.next();
      hops++;
    }

    if (bodyParts.length === 0) {
      const container = $(el).closest("section, article, div").first();
      container.find("p, li").slice(0, 12).each((__, child) => {
        const prefix = child.tagName?.toLowerCase() === "li" ? "• " : "";
        appendUniqueText(bodyParts, `${prefix}${$(child).text()}`);
      });
    }

    const body = bodyParts.slice(0, 4).join("\n\n").trim().slice(0, 900);
    if (isUsefulBody(body)) {
      sections.push({ title, body });
    }
  });

  if (sections.length < 3) {
    const container = $("main, article, [role='main'], body").first();
    const paras: string[] = [];
    container.find("p, li").each((_, p) => {
      appendUniqueText(paras, $(p).text(), 45);
    });
    const fallbackSections = [
      "Overview",
      "What it offers",
      "Why it matters",
      "Who it helps",
      "How to start",
    ];
    paras.slice(0, 5).forEach((p, i) => {
      sections.push({
        title: fallbackSections[i] || `Highlight ${i + 1}`,
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
    if (
      t.length < 12 ||
      t.length > 180 ||
      /^(docs|learn|showcase|blog|team|analytics|contact|privacy|legal)$/i.test(
        t
      )
    ) {
      return;
    }
    const k = t.toLowerCase();
    if (seenHi.has(k)) return;
    seenHi.add(k);
    highlights.push(t);
  });

  const finalTagline =
    tagline.slice(0, 360) ||
    `A concise brochure preview generated from ${hostname}.`;

  return {
    siteName: siteName.slice(0, 120),
    tagline: finalTagline,
    sections: sections.filter((section) => isUsefulBody(section.body)).slice(0, 10),
    highlights: highlights.slice(0, 10),
    sourceUrl,
  };
}
