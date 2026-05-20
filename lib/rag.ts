export type RagDocument = {
  title: string;
  url: string;
  type: string;
  text: string;
};

export type RagSource = {
  title: string;
  url: string;
  type: string;
  score: number;
  excerpt: string;
};

type RagChunk = RagSource & {
  tokenCounts: Map<string, number>;
  tokenTotal: number;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "but",
  "can",
  "for",
  "from",
  "has",
  "have",
  "into",
  "its",
  "more",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "you",
  "your",
]);

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function toCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function chunkText(text: string, chunkWords: number, overlapWords: number): string[] {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= chunkWords) return [words.join(" ")];

  const chunks: string[] = [];
  const step = Math.max(1, chunkWords - overlapWords);
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + chunkWords).join(" "));
    if (start + chunkWords >= words.length) break;
  }
  return chunks;
}

function buildChunks(
  documents: RagDocument[],
  chunkWords: number,
  overlapWords: number
): RagChunk[] {
  const chunks: RagChunk[] = [];

  for (const document of documents) {
    for (const excerpt of chunkText(document.text, chunkWords, overlapWords)) {
      const tokens = tokenize(
        `${document.title} ${document.type} ${excerpt}`
      );
      chunks.push({
        title: document.title,
        url: document.url,
        type: document.type,
        score: 0,
        excerpt,
        tokenCounts: toCounts(tokens),
        tokenTotal: Math.max(tokens.length, 1),
      });
    }
  }

  return chunks;
}

function documentFrequency(chunks: RagChunk[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const chunk of chunks) {
    for (const token of chunk.tokenCounts.keys()) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  return df;
}

export function retrieveRelevantChunks(
  documents: RagDocument[],
  query: string,
  options?: {
    chunkWords?: number;
    overlapWords?: number;
    topK?: number;
  }
): RagSource[] {
  const chunks = buildChunks(
    documents,
    options?.chunkWords ?? 180,
    options?.overlapWords ?? 45
  );
  if (chunks.length === 0) return [];

  const queryTokens = Array.from(new Set(tokenize(query)));
  const df = documentFrequency(chunks);
  const totalChunks = chunks.length;

  const scored = chunks.map((chunk) => {
    let score = 0;
    for (const token of queryTokens) {
      const count = chunk.tokenCounts.get(token) ?? 0;
      if (count === 0) continue;
      const tf = count / chunk.tokenTotal;
      const idf = Math.log((1 + totalChunks) / (1 + (df.get(token) ?? 0))) + 1;
      score += tf * idf;
    }

    const titleTokens = tokenize(`${chunk.title} ${chunk.type}`);
    const titleMatches = titleTokens.filter((token) =>
      queryTokens.includes(token)
    ).length;

    return {
      ...chunk,
      score: score + titleMatches * 0.05,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, options?.topK ?? 8)
    .map(({ title, url, type, score, excerpt }) => ({
      title,
      url,
      type,
      score: Number(score.toFixed(4)),
      excerpt: excerpt.slice(0, 900),
    }));
}

export function formatRagContext(
  sources: RagSource[],
  maxChars: number
): string {
  const context = sources
    .map((source, index) => {
      return [
        `[Source ${index + 1}] ${source.title}`,
        `URL: ${source.url}`,
        `Page type: ${source.type}`,
        `Relevance score: ${source.score}`,
        source.excerpt,
      ].join("\n");
    })
    .join("\n\n");

  return context.slice(0, maxChars);
}
