export interface RewriteInput {
  changeId: string;
  oldText: string;
  proposedText: string;
  doeCitation: string;
  doeExcerpt: string;
  context: string;
}
export function validateRewriteInput(value: unknown): value is RewriteInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return [
    "changeId",
    "oldText",
    "proposedText",
    "doeCitation",
    "doeExcerpt",
    "context",
  ].every(
    (key) =>
      typeof record[key] === "string" &&
      record[key].trim().length > 0 &&
      record[key].length <= (key === "context" ? 20000 : 8000),
  );
}
export function parseRewriteOutput(raw: string): {
  proposedText: string;
  explanation: string;
} {
  const parsed: unknown = JSON.parse(
    raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""),
  );
  if (!parsed || typeof parsed !== "object")
    throw new Error("Invalid rewrite response");
  const { proposedText, explanation } = parsed as Record<string, unknown>;
  if (
    typeof proposedText !== "string" ||
    !proposedText.trim() ||
    proposedText.length > 8000 ||
    typeof explanation !== "string" ||
    !explanation.trim() ||
    explanation.length > 4000
  ) {
    throw new Error("Invalid rewrite response");
  }
  return { proposedText: proposedText.trim(), explanation: explanation.trim() };
}
