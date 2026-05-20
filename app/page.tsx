"use client";

import { useCallback, useState } from "react";
import type { BrochureData } from "@/lib/extract-brochure";
import type { RagSource } from "@/lib/rag";
import { BrochurePreview } from "@/components/BrochurePreview";
import { MarkdownBrochure } from "@/components/MarkdownBrochure";
import {
  BrochureShelf,
  makeSavedBrochure,
  type SavedBrochure,
} from "@/components/BrochureShelf";

type ApiOk = {
  ok: true;
  data: BrochureData;
  aiUsed: boolean;
  aiAvailable: boolean;
  mode: "layout" | "day5";
  markdownBrochure?: string;
  selectedLinks?: { type: string; url: string }[];
  ragSources?: RagSource[];
  warning?: string;
};

type ActiveView =
  | { source: "empty" }
  | { source: "api"; brochure: SavedBrochure }
  | { source: "shelf"; brochure: SavedBrochure };

type PreviewTab = "flyer" | "markdown";

export default function Home() {
  const [url, setUrl] = useState("https://nextjs.org");
  const [mode, setMode] = useState<"layout" | "day5">("layout");
  const [tone, setTone] = useState<"professional" | "humorous">(
    "professional"
  );
  const [companyName, setCompanyName] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveView>({ source: "empty" });
  const [previewTab, setPreviewTab] = useState<PreviewTab>("flyer");

  const displayBrochure: SavedBrochure | null =
    active.source === "empty" ? null : active.brochure;

  const hasMarkdown = Boolean(displayBrochure?.markdownBrochure);

  const generate = useCallback(async () => {
    setError(null);
    setSavedNotice(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        url: url.trim(),
        mode,
        tone,
      };
      if (mode === "layout") {
        body.useAi = useAi;
      }
      const cn = companyName.trim();
      if (cn) body.companyName = cn;

      const res = await fetch("/api/brochure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiOk | { error?: string };
      if (!res.ok || !("ok" in json) || !json.ok) {
        setActive({ source: "empty" });
        setError(
          "error" in json && json.error
            ? json.error
            : `Request failed (${res.status})`
        );
        return;
      }
      setPreviewTab(json.markdownBrochure ? "markdown" : "flyer");
      if (json.warning) setError(json.warning);
      setActive({
        source: "api",
        brochure: makeSavedBrochure(json.data, json.aiUsed, {
          mode: json.mode,
          markdownBrochure: json.markdownBrochure,
          selectedLinks: json.selectedLinks,
          ragSources: json.ragSources,
        }),
      });
    } catch {
      setActive({ source: "empty" });
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }, [url, useAi, mode, tone, companyName]);

  const handlePrint = () => {
    window.print();
  };

  const handleSelectSaved = (brochure: SavedBrochure) => {
    setActive({ source: "shelf", brochure });
    setUrl(brochure.sourceUrl);
    setPreviewTab(brochure.markdownBrochure ? "markdown" : "flyer");
    setError(null);
    setSavedNotice("Loaded from your shelf.");
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
      <div className="no-print border-b border-zinc-200/70 bg-white/70 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/40">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
            <div className="max-w-2xl pt-1">
              <p className="inline-flex items-center rounded-full border border-teal-800/20 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-900 dark:border-teal-400/20 dark:bg-teal-950/30 dark:text-teal-200">
                Brochure Studio
              </p>
              <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
                Turn any public website into a brochure
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Paste a URL, generate a clean one‑pager, then print or save as
                PDF.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                  Fast flyer mode
                </span>
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                  Smart RAG mode
                </span>
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                  Print-ready output
                </span>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Website URL
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-zinc-900 shadow-sm outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <fieldset className="space-y-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                    <legend className="font-medium">Generator</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "layout"}
                          onChange={() => setMode("layout")}
                          className="border-zinc-400 text-teal-700"
                        />
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Flyer
                          </div>
                          <div className="text-xs text-zinc-500">
                            Single‑page layout
                          </div>
                        </div>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "day5"}
                          onChange={() => setMode("day5")}
                          className="border-zinc-400 text-teal-700"
                        />
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Smart
                          </div>
                          <div className="text-xs text-zinc-500">
                            RAG + AI
                          </div>
                        </div>
                      </label>
                    </div>
                  </fieldset>

                {mode === "day5" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Company name
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Optional"
                        className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-zinc-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Tone
                      <select
                        value={tone}
                        onChange={(e) =>
                          setTone(
                            e.target.value as "professional" | "humorous"
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="professional">Professional</option>
                        <option value="humorous">Humorous</option>
                      </select>
                    </label>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300">
                    <span className="font-medium">Polish with AI</span>
                    <input
                      type="checkbox"
                      checked={useAi}
                      onChange={(e) => setUseAi(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-400 text-teal-700 focus:ring-teal-600"
                    />
                  </label>
                )}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => void generate()}
                      disabled={loading || !url.trim()}
                      className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                    >
                      {loading ? "Generating…" : "Generate"}
                    </button>
                    {displayBrochure ? (
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Print / PDF
                      </button>
                    ) : null}
                  </div>

                  {savedNotice ? (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-sm text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-100">
                      {savedNotice}
                    </div>
                  ) : null}

                  {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
              <BrochureShelf
                current={displayBrochure}
                onSelect={handleSelectSaved}
                onSaved={() => setSavedNotice("Saved to your shelf.")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="min-w-0">
          {displayBrochure ? (
            <div id="brochure-print-root" className="mx-auto max-w-5xl">
              {hasMarkdown ? (
                <>
                  <div className="no-print mb-4 flex justify-center">
                    <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <button
                        type="button"
                        onClick={() => setPreviewTab("flyer")}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          previewTab === "flyer"
                            ? "bg-teal-800 text-white dark:bg-teal-700"
                            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        }`}
                      >
                        Flyer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab("markdown")}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          previewTab === "markdown"
                            ? "bg-teal-800 text-white dark:bg-teal-700"
                            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        }`}
                      >
                        AI brochure
                      </button>
                    </div>
                  </div>
                  {previewTab === "markdown" &&
                  displayBrochure.markdownBrochure ? (
                    <MarkdownBrochure
                      markdown={displayBrochure.markdownBrochure}
                      sourceUrl={displayBrochure.sourceUrl}
                    />
                  ) : (
                    <BrochurePreview
                      data={displayBrochure.data}
                      aiUsed={displayBrochure.aiUsed}
                    />
                  )}
                </>
              ) : (
                <BrochurePreview
                  data={displayBrochure.data}
                  aiUsed={displayBrochure.aiUsed}
                />
              )}
            </div>
          ) : (
            <div className="mx-auto flex min-h-[360px] max-w-5xl items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center text-zinc-500 shadow-sm shadow-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-900/25 dark:text-zinc-400">
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Preview
                </p>
                <p className="mt-1 text-sm">
                  Generate a brochure to see it here.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="no-print mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Built for quick previews — verify on the source site.
        </div>
      </div>
    </div>
  );
}
