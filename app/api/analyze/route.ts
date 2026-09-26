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
    seedReasoning,
  } = body;

  if (!oldText || !proposedText || !doeExcerpt) {
    return NextResponse.json(
      { error: "oldText, proposedText, and doeExcerpt are required" },
      { status: 400 },
    );
  }

  const section = SECTIONS.find((s) => s.id === sectionId);
  const sectionLabel = section ? `${section.number} ${section.title}` : sectionId ?? "unknown";
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

  const client = new Anthropic({ apiKey: key });

  const system = `You are a senior DOE / NNSA document-control analyst assisting Pantex procedure reviewers.
Compare the OLD Pantex clause to the DOE source excerpt and the proposed rewrite.
Be precise, skeptical, and operational — no marketing language.
Return ONLY valid JSON with this shape:
{
  "headline": string,           // one tight sentence
  "matchQuality": "strong" | "partial" | "weak",
  "analysis": string,           // 2-4 short paragraphs: how DOE maps to the old text, what changes, why it matters
  "gaps": string[],             // 0-3 residual risks or ambiguities if accepted as written
  "recommendedAction": "accept" | "edit" | "defer",
  "actionRationale": string     // one sentence
}`;

  const user = `Change id: ${changeId ?? "n/a"}
Section: ${sectionLabel}
Requirement id: ${requirementId ?? "n/a"}
DOE citation: ${doeCitation ?? "n/a"}

OLD PANTEX TEXT:
"""
${oldText}
"""

DOE SOURCE EXCERPT (proof):
"""
${doeExcerpt}
"""

PROPOSED REPLACEMENT:
"""
${proposedText}
"""

Seed summary (may be imperfect): ${seedSummary ?? "n/a"}
Seed reasoning (may be imperfect): ${seedReasoning ?? "n/a"}

Produce the JSON analysis now.`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 900,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Model returned no JSON", raw, model },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      headline?: string;
      matchQuality?: string;
      analysis?: string;
      gaps?: string[];
      recommendedAction?: string;
      actionRationale?: string;
    };

    return NextResponse.json({
      model,
      changeId: changeId ?? null,
      headline: parsed.headline ?? seedSummary ?? "Analysis complete",
      matchQuality: parsed.matchQuality ?? "partial",
      analysis: parsed.analysis ?? raw,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      recommendedAction: parsed.recommendedAction ?? "edit",
      actionRationale: parsed.actionRationale ?? "",
      usage: message.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
