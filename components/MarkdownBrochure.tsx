"use client";

import ReactMarkdown from "react-markdown";

type Props = {
  markdown: string;
  sourceUrl: string;
  selectedLinks?: { type: string; url: string }[];
};

export function MarkdownBrochure({
  markdown,
  sourceUrl,
  selectedLinks,
}: Props) {
  return (
    <article className="brochure-sheet mx-auto max-w-4xl rounded-2xl border border-teal-900/20 bg-white px-8 py-10 shadow-lg print:rounded-none print:border-0 print:shadow-none">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-700">
        Smart brochure — AI-written (markdown)
      </p>
      <div className="prose-brochure mt-6 max-w-none text-zinc-800 [&_a]:break-all [&_a]:text-teal-800 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-teal-700/30 [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-teal-900 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-teal-900 [&_li]:my-1 [&_p]:my-3 [&_p]:leading-relaxed [&_strong]:text-zinc-900 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
      {selectedLinks && selectedLinks.length > 0 ? (
        <section className="mt-10 border-t border-zinc-200 pt-6 text-sm text-zinc-600">
          <p className="font-semibold text-zinc-800">Pages the model used</p>
          <ul className="mt-2 space-y-1">
            {selectedLinks.map((l, i) => (
              <li key={`${l.url}-${i}`}>
                <span className="text-zinc-500">{l.type}: </span>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <footer className="mt-8 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-500">
        Source site:{" "}
        <a
          href={sourceUrl}
          className="text-teal-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {sourceUrl}
        </a>
      </footer>
    </article>
  );
}
