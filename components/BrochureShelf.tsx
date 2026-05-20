"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BrochureData } from "@/lib/extract-brochure";
import type { RagSource } from "@/lib/rag";

const STORAGE_KEY = "brochure-shelf-v1";

export type SavedBrochure = {
  id: string;
  createdAt: string;
  sourceUrl: string;
  siteName: string;
  data: BrochureData;
  aiUsed: boolean;
  mode?: "layout" | "day5";
  markdownBrochure?: string;
  selectedLinks?: { type: string; url: string }[];
  ragSources?: RagSource[];
};

/** Stable empty snapshot — React requires getServerSnapshot to return the same reference across calls. */
const EMPTY_SHELF: SavedBrochure[] = [];

let shelfRevision = 0;
const shelfListeners = new Set<() => void>();

/** False until after first client microtask — matches server snapshot and avoids hydration mismatch. */
let clientShelfReady = false;

function emitShelfChange() {
  shelfRevision += 1;
  shelfListeners.forEach((fn) => fn());
}

function subscribeShelf(onChange: () => void) {
  shelfListeners.add(onChange);
  const onStorage = () => {
    shelfRevision += 1;
    onChange();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    queueMicrotask(() => {
      if (!clientShelfReady) {
        clientShelfReady = true;
        shelfRevision += 1;
      }
      onChange();
    });
  }
  return () => {
    shelfListeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function loadShelf(): SavedBrochure[] {
  if (typeof window === "undefined") return EMPTY_SHELF;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SHELF;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_SHELF;
    const items = parsed.filter(
      (x): x is SavedBrochure =>
        typeof x === "object" &&
        x !== null &&
        "id" in x &&
        "data" in x &&
        typeof (x as SavedBrochure).id === "string"
    );
    return items.length === 0 ? EMPTY_SHELF : items;
  } catch {
    return EMPTY_SHELF;
  }
}

let cachedShelfRev = -1;
let cachedShelfItems: SavedBrochure[] = EMPTY_SHELF;

function getShelfSnapshot(): SavedBrochure[] {
  if (typeof window === "undefined") return EMPTY_SHELF;
  if (!clientShelfReady) return EMPTY_SHELF;
  if (shelfRevision !== cachedShelfRev) {
    cachedShelfRev = shelfRevision;
    cachedShelfItems = loadShelf();
  }
  return cachedShelfItems;
}

function getServerShelfSnapshot(): SavedBrochure[] {
  return EMPTY_SHELF;
}

function saveShelf(items: SavedBrochure[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitShelfChange();
}

type Props = {
  current: SavedBrochure | null;
  onSelect: (item: SavedBrochure) => void;
  onSaved?: () => void;
};

export function BrochureShelf({ current, onSelect, onSaved }: Props) {
  const items = useSyncExternalStore(
    subscribeShelf,
    getShelfSnapshot,
    getServerShelfSnapshot
  );
  const currentIsSaved = Boolean(
    current && items.some((item) => item.id === current.id)
  );

  const persist = useCallback((next: SavedBrochure[]) => {
    saveShelf(next);
  }, []);

  const saveCurrent = useCallback(() => {
    if (!current) return;
    const existing = loadShelf();
    const without = existing.filter((x) => x.id !== current.id);
    const next = [current, ...without].slice(0, 24);
    persist(next);
    onSaved?.();
  }, [current, persist, onSaved]);

  const remove = useCallback(
    (id: string) => {
      persist(loadShelf().filter((x) => x.id !== id));
    },
    [persist]
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">
          Brochure shelf
        </p>
        <p className="mt-1">
          Generate a brochure, then save it here to build a small library.
        </p>
        {current ? (
          <button
            type="button"
            onClick={saveCurrent}
            className="mt-4 w-full rounded-lg border border-teal-700/30 bg-teal-700/10 py-2 text-sm font-medium text-teal-900 hover:bg-teal-700/15 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-100"
          >
            Save this brochure to shelf
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Shelf ({items.length})
        </h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-red-600 hover:underline dark:text-red-400"
        >
          Clear all
        </button>
      </div>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-left dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {item.siteName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                {new URL(item.sourceUrl).hostname}
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="shrink-0 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              aria-label={`Remove ${item.siteName}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <button
          type="button"
          onClick={saveCurrent}
          disabled={currentIsSaved}
          className="mt-3 w-full rounded-lg border border-teal-700/30 bg-teal-700/10 py-2 text-sm font-medium text-teal-900 hover:bg-teal-700/15 disabled:cursor-default disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-100 dark:disabled:border-zinc-800 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500"
        >
          {currentIsSaved ? "Saved to shelf" : "Save this brochure to shelf"}
        </button>
      ) : null}
    </div>
  );
}

export function makeSavedBrochure(
  data: BrochureData,
  aiUsed: boolean,
  options?: {
    mode?: "layout" | "day5";
    markdownBrochure?: string;
    selectedLinks?: { type: string; url: string }[];
    ragSources?: RagSource[];
  }
): SavedBrochure {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `b-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceUrl: data.sourceUrl,
    siteName: data.siteName,
    data,
    aiUsed,
    mode: options?.mode ?? "layout",
    markdownBrochure: options?.markdownBrochure,
    selectedLinks: options?.selectedLinks,
    ragSources: options?.ragSources,
  };
}
