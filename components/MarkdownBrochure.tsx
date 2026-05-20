"use client";

import ReactMarkdown from "react-markdown";

type Props = {
  markdown: string;
  sourceUrl: string;
};

type BrochureSection = {
  title: string;
  body: string;
};

function cleanHeading(line: string): string {
  return line.replace(/^#+\s*/, "").trim();
}

function parseBrochure(markdown: string): {
  title: string;
  subtitle: string;
  sections: BrochureSection[];
} {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  let title = "";
  let subtitle = "";
  const intro: string[] = [];
  const sections: BrochureSection[] = [];
  let current: BrochureSection | null = null;
  const firstTitleIndex = lines.findIndex((line) => line.startsWith("# "));
  const firstHeadingAfterTitle = lines.findIndex(
    (line, index) =>
      index > firstTitleIndex && /^#{2,3}\s+/.test(line.trim())
  );
  const hasLowerHeadingsAfterFirst =
    firstHeadingAfterTitle >= 0 &&
    lines
      .slice(firstHeadingAfterTitle + 1)
      .some((line) => /^#{3}\s+/.test(line.trim()));

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = cleanHeading(line);
      continue;
    }

    if (
      !subtitle &&
      !current &&
      hasLowerHeadingsAfterFirst &&
      line.startsWith("## ")
    ) {
      subtitle = cleanHeading(line);
      continue;
    }

    if (/^#{2,3}\s+/.test(line)) {
      if (current) sections.push(current);
      current = { title: cleanHeading(line), body: "" };
      continue;
    }

    if (current) {
      current.body += `${line}\n`;
    } else if (line.trim()) {
      intro.push(line.trim());
    }
  }

  if (current) sections.push(current);

  if (!title) {
    title = "Smart Brochure";
  }

  if (sections.length === 0) {
    sections.push({ title: "Overview", body: intro.join("\n") || markdown });
    intro.length = 0;
  }

  return {
    title,
    subtitle: subtitle || intro.join(" ").replace(/^#+\s*/, "").trim(),
    sections: sections.map((section) => ({
      ...section,
      body: section.body.trim(),
    })),
  };
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function MarkdownBrochure({
  markdown,
  sourceUrl,
}: Props) {
  const brochure = parseBrochure(markdown);
  const leadSection = brochure.sections[0];
  const detailSections = brochure.sections.slice(1, -1);
  const finalSection =
    brochure.sections.length > 1 ? brochure.sections.at(-1) : undefined;
  const host = hostFromUrl(sourceUrl);
  const highlights = brochure.sections.slice(0, 3).map((section) => section.title);

  return (
    <article className="brochure-sheet mx-auto max-w-5xl overflow-hidden rounded-lg border border-zinc-200 bg-[#fffdf8] shadow-xl shadow-zinc-900/10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none">
      <header className="grid gap-0 bg-white md:grid-cols-[1.35fr_0.65fr] print:grid-cols-[1.35fr_0.65fr]">
        <div className="bg-teal-950 px-6 py-9 text-white sm:px-10 sm:py-12 print:px-8 print:py-8">
          <p className="font-mono text-xs uppercase text-amber-200">
            {host}
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl print:text-4xl">
            {brochure.title}
          </h1>
          {brochure.subtitle ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-teal-50/90 sm:text-lg print:text-base">
              {brochure.subtitle}
            </p>
          ) : null}
        </div>

        <aside className="border-b border-zinc-200 bg-amber-50 px-6 py-7 sm:px-8 md:border-b-0 md:border-l print:px-6 print:py-6">
          <p className="font-serif text-2xl font-semibold text-teal-950">
            At a glance
          </p>
          <ul className="mt-5 space-y-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm font-medium leading-snug text-zinc-800"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-amber-200 pt-4 text-xs leading-relaxed text-zinc-600">
            A concise brochure generated from the public website.
          </div>
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
            <div className="text-[0.98rem] leading-relaxed text-zinc-700 [&_li]:my-1.5 [&_li]:pl-1 [&_p]:my-2 [&_strong]:text-zinc-950 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown>{leadSection.body}</ReactMarkdown>
            </div>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          {detailSections.map((section, index) => (
            <section
              key={`${section.title}-${index}`}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-900/5 print:rounded-none print:shadow-none"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-900 text-sm font-semibold text-white">
                  {index + 2}
                </span>
                <div>
                  <h2 className="font-serif text-xl font-semibold leading-snug text-teal-950">
                    {section.title}
                  </h2>
                  <div className="mt-3 text-sm leading-relaxed text-zinc-700 [&_li]:my-1.5 [&_li]:pl-1 [&_p]:my-2.5 [&_strong]:text-zinc-950 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5">
                    <ReactMarkdown>{section.body}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {finalSection ? (
        <section className="border-t border-zinc-200 bg-teal-950 px-6 py-7 text-white sm:px-10 print:px-8">
          <div className="grid gap-5 sm:grid-cols-[0.42fr_1fr] sm:items-start print:grid-cols-[0.42fr_1fr]">
            <div>
              <p className="font-mono text-xs uppercase text-amber-200">
                Next step
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight">
                {finalSection.title}
              </h2>
            </div>
            <div className="text-sm leading-relaxed text-teal-50/90 [&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_li]:my-1.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown>{finalSection.body}</ReactMarkdown>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="flex flex-col gap-2 border-t border-zinc-200 bg-white px-6 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 print:px-8">
        <span>{host}</span>
        <a
          href={sourceUrl}
          className="break-all font-medium text-teal-800 underline decoration-teal-800/30 underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit {host}
        </a>
      </footer>
    </article>
  );
}
