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
  businessImpact: string;
  delayRisk: string;
}

function isLevel(v: unknown): v is ImpactLevel {
  return v === "high" || v === "medium" || v === "low";
}

function sentence(v: unknown, fallback: string, max = 160): string {
  if (typeof v !== "string" || !v.trim()) return fallback;
  return v.trim().slice(0, max);
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

  const items = Array.isArray(body.items) ? body.items.slice(0, 80) : [];
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

  const system = `You are a business-impact triage assistant for DOE/NNSA production-plant document reviewers (Pantex).
For each proposed clause change, judge OPTIONAL mission / operations / compliance BUSINESS IMPACT — not a rewrite of the text change itself.

Do NOT restate the old wording, proposed wording, or DOE citation as the answer.
Focus on: who is affected, what work/mission path is blocked or exposed, and what happens if the update is delayed.

Be conservative: prefer "medium" when unsure. Prefer "high" only for clear safety, security, regulatory enforcement, stop-work, or mission-blocking exposure. Prefer "low" for citation housekeeping or narrow admin wording.

Return ONLY valid JSON:
{
  "judgements": [
    {
      "changeId": string,
      "level": "high" | "medium" | "low",
      "urgency": number,            // 1-5 integer, 5 = address soonest
      "businessImpact": string,     // ≤28 words: mission/ops/compliance consequence
      "delayRisk": string           // ≤22 words: what goes wrong if delayed
    }
  ]
}
Include every input changeId exactly once.`;

  async function scoreBatch(batch: ImpactItemIn[]): Promise<unknown[]> {
    const response = await client.messages.create(
      {
        model,
        max_tokens: 250 * batch.length + 200,
        temperature: 0.2,
        system,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              task: "Score business impact for each change — do not paraphrase the clause text",
              items: batch.map((it) => ({
                changeId: it.changeId,
                sectionId: it.sectionId ?? null,
                summary: (it.summary ?? "").slice(0, 280),
                oldText: (it.oldText ?? "").slice(0, 400),
                proposedText: (it.proposedText ?? "").slice(0, 400),
                doeCitation: (it.doeCitation ?? "").slice(0, 200),
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
      .join("\n");
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error("No JSON");
    const parsed = JSON.parse(json) as { judgements?: unknown };
    if (!Array.isArray(parsed?.judgements)) throw new Error("Invalid shape");
    return parsed.judgements;
  }

  const BATCH = 8;
  const batches: ImpactItemIn[][] = [];
  for (let i = 0; i < items.length; i += BATCH)
    batches.push(items.slice(i, i + BATCH));

  try {
    const results = await Promise.allSettled(
      batches.map((b) => scoreBatch(b).catch(() => scoreBatch(b))),
    );
    if (results.every((r) => r.status === "rejected")) throw new Error("All batches failed");
    const rows = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const byId = new Map<string, ImpactItemOut>();
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.changeId !== "string" || !isLevel(r.level)) continue;
      const urgency = Number(r.urgency);
      if (!Number.isFinite(urgency)) continue;
      byId.set(r.changeId, {
        changeId: r.changeId,
        level: r.level,
        urgency: Math.min(5, Math.max(1, Math.round(urgency))),
        businessImpact: sentence(
          r.businessImpact ?? r.rationale,
          "Business impact not specified.",
          220,
        ),
        delayRisk: sentence(r.delayRisk, "Delay risk not specified.", 180),
      });
    }

    const judgements: ImpactItemOut[] = items.map((it) => {
      const hit = byId.get(it.changeId);
      return (
        hit ?? {
          changeId: it.changeId,
          level: "medium" as const,
          urgency: 3,
          businessImpact: "Not scored this run — click Score impact again.",
          delayRisk: "—",
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
