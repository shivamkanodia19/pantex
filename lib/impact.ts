export type ImpactLevel = "high" | "medium" | "low";

/** Optional LLM triage — not part of the change record of truth. */
export interface ImpactJudgement {
  changeId: string;
  level: ImpactLevel;
  /** 1–5, higher = sooner. */
  urgency: number;
  /** Mission / ops / compliance consequence if the change is needed. */
  businessImpact: string;
  /** What happens if the change is delayed or mishandled. */
  delayRisk: string;
  model?: string;
}

export function impactRank(level: ImpactLevel | undefined): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  if (level === "low") return 1;
  return 0;
}
