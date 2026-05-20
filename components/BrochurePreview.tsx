"use client";

import type { BrochureData } from "@/lib/extract-brochure";

type Props = {
  data: BrochureData;
  aiUsed?: boolean;
};

export function BrochurePreview({ data, aiUsed }: Props) {
  const sections = data.sections.filter(
    (section) =>
      section.body.trim().length > 0 &&
      !section.body.toLowerCase().includes("see the live site")
  );
  const leadSection = sections[0];
  const detailSections = sections.slice(1, 5);
  const highlights =
    data.highlights.length > 0
      ? data.highlights
      : sections.slice(0, 5).map((section) => section.title);
  const host = (() => {
    try {
      return new URL(data.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return data.sourceUrl;
    }
  })();

  return (
    <article
      className="brochure-sheet mx-auto max-w-5xl overflow-hidden rounded-lg border border-zinc-200 bg-[#fffdf8] shadow-xl shadow-zinc-900/10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none"
    >
      <header className="grid bg-white md:grid-cols-[1.35fr_0.65fr] print:grid-cols-[1.35fr_0.65fr]">
        <div className="bg-teal-950 px-6 py-9 text-white sm:px-10 sm:py-12 print:px-8 print:py-8">
          <p className="font-mono text-xs uppercase text-amber-200">{host}</p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl print:text-4xl">
            {data.siteName}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-teal-50/90 sm:text-lg print:text-base">
            {data.tagline}
          </p>
          {aiUsed ? (
            <p className="mt-5 inline-block border border-white/20 px-3 py-1 text-xs text-teal-50">
              AI-polished copy
            </p>
          ) : null}
        </div>

        <aside className="border-b border-zinc-200 bg-amber-50 px-6 py-7 sm:px-8 md:border-b-0 md:border-l print:px-6 print:py-6">
          <p className="font-serif text-2xl font-semibold text-teal-950">
            Highlights
          </p>
          <ul className="mt-5 space-y-3">
            {highlights.slice(0, 5).map((h, i) => (
              <li
                key={`${h}-${i}`}
                className="flex gap-3 text-sm font-medium leading-snug text-zinc-800"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </aside>
      </header>

      <div className="px-4 py-5 sm:px-6 sm:py-6 print:px-0 print:py-4">
        {leadSection ? (
          <section className="grid gap-5 rounded-lg border border-teal-900/15 bg-white p-5 shadow-sm shadow-zinc-900/5 md:grid-cols-[0.42fr_1fr] print:grid-cols-[0.42fr_1fr] print:rounded-none print:shadow-none">
            <div className="border-b border-zinc-200 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-5 print:border-r">
              <p className="font-mono text-xs uppercase text-teal-700">
                Featured
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-teal-950">
                {leadSection.title}
              </h2>
            </div>
            <p className="whitespace-pre-line text-[0.98rem] leading-relaxed text-zinc-700">
              {leadSection.body}
            </p>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          {detailSections.map((s, i) => (
            <section
              key={`${s.title}-${i}`}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-900/5 print:rounded-none print:shadow-none"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-900 text-sm font-semibold text-white">
                  {i + 2}
                </span>
                <div>
                  <h3 className="font-serif text-xl font-semibold leading-snug text-teal-950">
                    {s.title}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {s.body}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="border-t border-zinc-200 bg-teal-950 px-6 py-7 text-white sm:px-10 print:px-8">
        <div className="grid gap-4 sm:grid-cols-[0.42fr_1fr] sm:items-center print:grid-cols-[0.42fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase text-amber-200">
              Next step
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              Explore {data.siteName}
            </h2>
          </div>
          <div className="text-sm leading-relaxed text-teal-50/90">
            <p>
              Use this one-page snapshot to compare the offering, then continue
              with the original source for current details and pricing.
            </p>
            <a
              href={data.sourceUrl}
              className="mt-3 inline-block font-semibold text-white underline decoration-white/40 underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit {host}
            </a>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-zinc-200 bg-white px-6 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 print:px-8">
        <span>{host}</span>
        <span>Generated brochure preview</span>
      </footer>
    </article>
  );
}
