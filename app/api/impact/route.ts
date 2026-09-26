import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export type ImpactLevel = "high" | "medium" | "low";

interface ImpactItemIn {
  changeId: string;
  summary?: string;
  oldText?: string;
  proposedText?: string;
  doeCitation?: string;
  sectionId?: string;
}

interface ImpactItemOut {
  changeId: string;
  level: ImpactLevel;
  urgency: number;
  rationale: string;
}

function isLevel(v: unknown): v is ImpactLevel {
  return v === "high" || v === "medium" || v === "low";
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in .env.local" },
      { status: 503 },
    );
  }

  let body: { items?: ImpactItemIn[] };
  try {
    body = (await req.json()) as { items?: ImpactItemIn[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 24) : [];
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Provide items[] with at least one change." },
      { status: 400 },
    );
  }
  if (!items.every((it) => typeof it.changeId === "string" && it.changeId)) {
    return NextResponse.json(
      { error: "Each item needs a changeId." },
      { status: 400 },
    );
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const client = new Anthropic({ apiKey: key });

  const system = `You are a rough triage assistant for DOE/NNSA site document reviewers at a production plant (Pantex).
Judge OPTIONAL business / mission impact if each proposed clause change were delayed or mishandled.
This is NOT legal advice, NOT a compliance determination, and NOT a risk register entry.
Be conservative: prefer "medium" when unsure. Prefer "high" only for clear safety, security, regulatory enforcement, or stop-work / mission-blocking exposure. Prefer "low" for citation housekeeping, related-docs lists, or narrow admin wording.
Return ONLY valid JSON:
{
  "judgements": [
    {
      "changeId": string,
      "level": "high" | "medium" | "low",
      "urgency": number,   // 1-5 integer, 5 = address soonest
      "rationale": string   // one short sentence, hedge that this is rough LLM triage
    }
  ]
}
Include every input changeId exactly once.`;

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: 2000,
        system,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              task: "Rough optional business-impact triage",
              items: items.map((it) => ({
                changeId: it.changeId,
                sectionId: it.sectionId ?? null,
                summary: (it.summary ?? "").slice(0, 500),
                oldText: (it.oldText ?? "").slice(0, 1200),
                proposedText: (it.proposedText ?? "").slice(0, 1200),
                doeCitation: (it.doeCitation ?? "").slice(0, 300),
              })),
            }),
          },
        ],
      },
      { signal: req.signal },
    );

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim()
      .replace(/^```(?:json)?\s*|\s*```$/g, "");

    const parsed = JSON.parse(raw) as { judgements?: unknown };
    if (!parsed || !Array.isArray(parsed.judgements)) {
      throw new Error("Invalid shape");
    }

    const byId = new Map<string, ImpactItemOut>();
    for (const row of parsed.judgements) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.changeId !== "string" || !isLevel(r.level)) continue;
      const urgency = Number(r.urgency);
      if (!Number.isFinite(urgency)) continue;
      byId.set(r.changeId, {
        changeId: r.changeId,
        level: r.level,
        urgency: Math.min(5, Math.max(1, Math.round(urgency))),
        rationale:
          typeof r.rationale === "string" && r.rationale.trim()
            ? r.rationale.trim().slice(0, 400)
            : "Rough LLM triage only.",
      });
    }

    const judgements: ImpactItemOut[] = items.map((it) => {
      const hit = byId.get(it.changeId);
      return (
        hit ?? {
          changeId: it.changeId,
          level: "medium" as const,
          urgency: 3,
          rationale: "Model omitted this id — defaulted to medium (rough triage).",
        }
      );
    });

    return NextResponse.json({ model, judgements });
  } catch {
    return NextResponse.json(
      {
        error:
          "Impact triage failed or returned invalid JSON. Try again — this tool is optional.",
      },
      { status: 502 },
    );
  }
}
