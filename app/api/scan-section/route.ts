import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import type { DocChange } from "@/lib/document-data";
import {
  getDiffDigest,
  retrieveDiffContext,
  retrieveDoeChunks,
} from "@/lib/doe-rag";

export const runtime = "nodejs";

interface ScanBody {
  sectionId?: string;
  sectionNumber?: string;
  sectionTitle?: string;
  paragraphs?: { id: string; text: string }[];
}

/**
 * Lightweight RAG scan for ONE Pantex section:
 * retrieve DOE chunks + B→C diff → Haiku → optional change card.
 * Never auto-called — Document "Run full scan" drives this.
 */
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in .env.local" },
      { status: 500 },
    );
  }

  let body: ScanBody;
  try {
    body = (await req.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sectionId = body.sectionId?.trim();
  const paragraphs = Array.isArray(body.paragraphs) ? body.paragraphs : [];
  if (!sectionId || paragraphs.length === 0) {
    return NextResponse.json(
      { error: "sectionId and paragraphs[] are required" },
      { status: 400 },
    );
  }

  const sectionLabel = `${body.sectionNumber ?? ""} ${body.sectionTitle ?? sectionId}`.trim();
  const sectionText = paragraphs.map((p) => p.text).join("\n\n").slice(0, 6000);
  const hits = retrieveDoeChunks(sectionText, 4);
  const deltas = retrieveDiffContext(sectionText, 2);
  const digest = getDiffDigest(1800);

  // No retrieval signal → skip (cheap) rather than inventing a change.
  if (hits.length === 0 && deltas.length === 0) {
    return NextResponse.json({
      skipped: true,
      reason: "no_doe_overlap",
      change: null,
    });
  }

  const evidence = [
    ...deltas.map(
      (d) => `[DIFF ${d.id}] ${d.title}\n${d.text.slice(0, 500)}`,
    ),
    ...hits.map(
      (h) =>
        `[${h.chunk.docId} · ${h.chunk.id} · score ${h.score.toFixed(2)}]\n${h.chunk.text.slice(0, 700)}`,
    ),
  ].join("\n\n---\n\n");

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const client = new Anthropic({ apiKey: key });

  const system = `You are a temporary demo RAG reviewer for Pantex site procedures vs DOE CRADA orders (483.1B→483.1C).
Given ONE Pantex section and retrieved DOE evidence, decide if a site wording change is warranted.
Return ONLY JSON:
{
  "needsChange": boolean,
  "headline": string,           // ≤14 words
  "paragraphId": string | null, // which paragraph id to attach, or null
  "oldText": string,            // exact or close clause from the section
  "proposedText": string,       // replacement clause ≤80 words
  "summary": string,            // ≤20 words
  "reasoning": string,          // ≤40 words, cite DOE evidence
  "doeCitation": string,
  "doeExcerpt": string,         // ≤60 words from evidence
  "requirementId": string,
  "matchQuality": "strong" | "partial" | "weak"
}
If the section is unrelated to CRADA / 483.1 / collaborative R&D / subcontract flow-down of DOE Orders, set needsChange=false and leave texts empty.
Do not invent DOE requirements not supported by the evidence.`;

  const user = `SECTION: ${sectionLabel} (${sectionId})

PANTEX TEXT:
${sectionText}

B→C DIFF DIGEST (excerpt):
${digest}

RETRIEVED EVIDENCE:
${evidence || "(none)"}

Paragraph ids: ${paragraphs.map((p) => p.id).join(", ")}`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 700,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    });
    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        skipped: true,
        reason: "unparseable",
        change: null,
        raw: raw.slice(0, 400),
      });
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      needsChange?: boolean;
      headline?: string;
      paragraphId?: string | null;
      oldText?: string;
      proposedText?: string;
      summary?: string;
      reasoning?: string;
      doeCitation?: string;
      doeExcerpt?: string;
      requirementId?: string;
      matchQuality?: string;
    };

    if (!parsed.needsChange || !parsed.proposedText?.trim() || !parsed.oldText?.trim()) {
      return NextResponse.json({
        skipped: true,
        reason: "no_change",
        change: null,
        matchQuality: parsed.matchQuality ?? "weak",
      });
    }

    const para =
      paragraphs.find((p) => p.id === parsed.paragraphId) ||
      paragraphs.find((p) =>
        p.text.includes((parsed.oldText || "").slice(0, 40)),
      ) ||
      paragraphs[0];

    const top = hits[0]?.chunk;
    const change: DocChange = {
      id: `chg-scan-${sectionId}`,
      sectionId,
      page: 1,
      lineStart: 1,
      lineCount: 2,
      oldText: parsed.oldText.trim(),
      proposedText: parsed.proposedText.trim(),
      workingText: parsed.proposedText.trim(),
      summary: (parsed.headline || parsed.summary || "DOE-aligned update").slice(
        0,
        120,
      ),
      reasoning: (
        parsed.reasoning ||
        "Lightweight RAG scan against DOE 483.1B→483.1C corpus."
      ).slice(0, 400),
      doe: {
        citation:
          parsed.doeCitation ||
          (top ? `${top.docId}` : "DOE O 483.1C"),
        excerpt: (parsed.doeExcerpt || top?.text || digest).slice(0, 400),
        requirementId: parsed.requirementId || "DOE-483.1C-RAG",
        url: "/sources/DOE_O_483.1C_CRADA.pdf",
      },
      status: "pending",
    };

    // Attach to paragraph if we can identify it — client also maps by section.
    void para;

    return NextResponse.json({
      skipped: false,
      change,
      evidenceCount: hits.length,
      diffHits: deltas.length,
      model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
