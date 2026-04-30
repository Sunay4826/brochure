import { NextResponse } from "next/server";
import { ensureBrochureEnvLoaded } from "@/lib/ensure-env";
import { getLlmBackend } from "@/lib/llm-provider";

export const runtime = "nodejs";

function present(v: string | undefined): boolean {
  return Boolean(v && v.trim().length > 0);
}

export async function GET() {
  ensureBrochureEnvLoaded();

  return NextResponse.json({
    backend: getLlmBackend(),
    gemini: {
      GEMINI_API_KEY: present(process.env.GEMINI_API_KEY),
      GOOGLE_API_KEY: present(process.env.GOOGLE_API_KEY),
      GOOGLE_GENERATIVE_AI_API_KEY: present(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ),
      GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || null,
    },
  });
}

