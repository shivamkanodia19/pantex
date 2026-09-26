import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { SECTIONS } from "@/lib/document-data";

export const runtime = "nodejs";

interface AnalyzeBody {
  changeId?: string;
  sectionId?: string;
  oldText?: string;
  proposedText?: string;
  doeCitation?: string;
  doeExcerpt?: string;
  requirementId?: string;
  seedSummary?: string;
  seedReasoning?: string;
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in .env.local" },
      { status: 500 },
    );
  }

  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    changeId,
    sectionId,
    oldText,
    proposedText,
    doeCitation,
    doeExcerpt,
    requirementId,
    seedSummary,
  } = body;

  if (!oldText || !proposedText || !doeExcerpt) {
    return NextResponse.json(
      { error: "oldText, proposedText, and doeExcerpt are required" },
      { status: 400 },
    );
  }

  const section = SECTIONS.find((s) => s.id === sectionId);
  const sectionLabel = section
    ? `${section.number} ${section.title}`
    : (sectionId ?? "unknown");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const client = new Anthropic({ apiKey: key });

  const system = `You rewrite ONE Pantex procedure clause so it matches the updated DOE excerpt.
Keep the site voice. Output must be SHORT.
Return ONLY JSON:
{
  "headline": string,              // ≤12 words
  "suggestedText": string,         // the full replacement clause only — no preamble, ≤80 words when possible
  "matchQuality": "strong" | "partial" | "weak",
  "analysis": string,              // ONE sentence max
  "gaps": string[],                // 0-1 short items, or []
  "recommendedAction": "accept" | "edit" | "defer",
  "actionRationale": string        // ≤15 words
}
Do not write essays. Prefer tightening the proposed text over inventing new requirements.`;

  const user = `Section: ${sectionLabel}
DOE: ${doeCitation ?? "n/a"} (${requirementId ?? "n/a"})

OLD:
${oldText}

DOE EXCERPT:
${doeExcerpt}

CURRENT PROPOSAL:
${proposedText}

Hint: ${seedSummary ?? "n/a"}

Return short JSON with suggestedText now.`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 400,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Model returned no JSON", raw, model },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      headline?: string;
      suggestedText?: string;
      matchQuality?: string;
      analysis?: string;
      gaps?: string[];
      recommendedAction?: string;
      actionRationale?: string;
    };

    const suggestedText =
      typeof parsed.suggestedText === "string" && parsed.suggestedText.trim()
        ? parsed.suggestedText.trim()
        : proposedText;

    return NextResponse.json({
      model,
      changeId: changeId ?? null,
      headline: parsed.headline ?? seedSummary ?? "Suggested wording",
      suggestedText,
      matchQuality: parsed.matchQuality ?? "partial",
      analysis:
        typeof parsed.analysis === "string"
          ? parsed.analysis.trim().slice(0, 220)
          : "Aligned to DOE excerpt.",
      gaps: Array.isArray(parsed.gaps)
        ? parsed.gaps.filter((g) => typeof g === "string").slice(0, 1)
        : [],
      recommendedAction: parsed.recommendedAction ?? "edit",
      actionRationale:
        typeof parsed.actionRationale === "string"
          ? parsed.actionRationale.trim().slice(0, 120)
          : "",
      usage: message.usage,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Anthropic request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
