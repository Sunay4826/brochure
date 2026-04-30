import fs from "fs";
import path from "path";
import { config } from "dotenv";

let loaded = false;

/**
 * Resolve `self/` and `brochure-web/` whether `process.cwd()` is either folder
 * (e.g. `npm run dev` from `brochure-web` vs monorepo root).
 */
function resolveEnvRoots(): { selfDir: string; brochureWebDir: string } {
  const cwd = process.cwd();
  const base = cwd.replace(/[/\\]+$/, "");

  const isBrochureWeb = base.endsWith("brochure-web");

  const brochureWebDir = isBrochureWeb
    ? base
    : path.join(base, "brochure-web");

  const selfDir = isBrochureWeb ? path.join(base, "..") : base;

  return {
    selfDir: path.resolve(selfDir),
    brochureWebDir: path.resolve(brochureWebDir),
  };
}

/**
 * Load, in order (later wins): `self/.env` → `self/.env.local` → `brochure-web/.env` → `brochure-web/.env.local`
 */
export function ensureBrochureEnvLoaded(): void {
  if (loaded) return;
  loaded = true;

  const { selfDir, brochureWebDir } = resolveEnvRoots();

  const files = [
    path.join(selfDir, ".env"),
    path.join(selfDir, ".env.local"),
    path.join(brochureWebDir, ".env"),
    path.join(brochureWebDir, ".env.local"),
  ];

  for (const full of files) {
    if (fs.existsSync(full)) {
      config({ path: full, override: true });
    }
  }
}
