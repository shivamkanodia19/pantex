export interface TextAsset {
  schemaVersion: 1;
  extractionVersion: string;
  extractor: string;
  sourceFile: string;
  sha256: string;
  pages: { page: number; text: string; omittedLines: string[] }[];
}
export interface DiffSource {
  id: string;
  title: string;
  href: string;
  asset: TextAsset;
}
export interface Token {
  text: string;
  page: number;
}
export interface DiffRun {
  kind: "equal" | "removed" | "added";
  old: Token[];
  next: Token[];
  coarse?: boolean;
}
export interface Comparison {
  older: DiffSource;
  newer: DiffSource;
  normalization: string;
  runs: DiffRun[];
  added: number;
  removed: number;
  groups: number;
  coarseBlocks: number;
}
export const NORMALIZATION =
  "v1: Collapse whitespace, nonbreaking spaces and line wraps. Preserve case, punctuation, quantities and hyphens. Extraction removes only repeated order/date headers at the first/last four lines, retaining first-page metadata; omitted lines are recorded. No semantic or requirement-retirement inference.";
export function validateAsset(value: unknown): asserts value is TextAsset {
  const a = value as TextAsset;
  if (
    !a ||
    a.schemaVersion !== 1 ||
    typeof a.sourceFile !== "string" ||
    !/^[a-f0-9]{64}$/.test(a.sha256) ||
    typeof a.extractor !== "string" ||
    typeof a.extractionVersion !== "string" ||
    !Array.isArray(a.pages) ||
    !a.pages.length ||
    !a.pages.every(
      (p, i) =>
        p.page === i + 1 &&
        typeof p.text === "string" &&
        Array.isArray(p.omittedLines) &&
        p.omittedLines.every((l) => typeof l === "string"),
    )
  )
    throw new Error(
      "Invalid comparison text asset. Regenerate the bundled extracts.",
    );
}
export function tokenize(asset: TextAsset): Token[] {
  return asset.pages.flatMap((p) =>
    (p.text.match(/\S+/gu) ?? []).map((text) => ({ text, page: p.page })),
  );
}
/** Ordered unique five-word anchors, followed by bounded LCS inside unmatched gaps. */
export function compareDocuments(
  older: DiffSource,
  newer: DiffSource,
  maxCells = 2_000_000,
): Comparison {
  validateAsset(older.asset);
  validateAsset(newer.asset);
  const a = tokenize(older.asset),
    b = tokenize(newer.asset);
  const runs: DiffRun[] = [];
  let budget = maxCells,
    coarseBlocks = 0;
  function emit(
    kind: DiffRun["kind"],
    old: Token[],
    next: Token[],
    coarse = false,
  ) {
    if (!old.length && !next.length) return;
    const last = runs[runs.length - 1];
    if (last?.kind === kind && Boolean(last.coarse) === coarse) {
      last.old.push(...old);
      last.next.push(...next);
    } else runs.push({ kind, old, next, ...(coarse ? { coarse: true } : {}) });
  }
  function gap(x: number, endX: number, y: number, endY: number) {
    let prefix = 0;
    while (
      x + prefix < endX &&
      y + prefix < endY &&
      a[x + prefix].text === b[y + prefix].text
    )
      prefix++;
    emit("equal", a.slice(x, x + prefix), b.slice(y, y + prefix));
    x += prefix;
    y += prefix;
    let suffix = 0;
    while (
      endX - suffix > x &&
      endY - suffix > y &&
      a[endX - suffix - 1].text === b[endY - suffix - 1].text
    )
      suffix++;
    const ax = endX - suffix,
      by = endY - suffix,
      n = ax - x,
      m = by - y;
    if (!n) emit("added", [], b.slice(y, by));
    else if (!m) emit("removed", a.slice(x, ax), []);
    else if ((n + 1) * (m + 1) > Math.min(250_000, budget)) {
      coarseBlocks++;
      emit("removed", a.slice(x, ax), [], true);
      emit("added", [], b.slice(y, by), true);
    } else {
      budget -= (n + 1) * (m + 1);
      const width = m + 1,
        table = new Uint32Array((n + 1) * width);
      for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
          table[i * width + j] =
            a[x + i].text === b[y + j].text
              ? 1 + table[(i + 1) * width + j + 1]
              : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      let i = 0,
        j = 0;
      while (i < n || j < m) {
        if (i < n && j < m && a[x + i].text === b[y + j].text) {
          emit("equal", [a[x + i++]], [b[y + j++]]);
        } else if (
          i < n &&
          (j === m || table[(i + 1) * width + j] >= table[i * width + j + 1])
        )
          emit("removed", [a[x + i++]], []);
        else emit("added", [], [b[y + j++]]);
      }
    }
    emit("equal", a.slice(ax, endX), b.slice(by, endY));
  }
  function grams(tokens: Token[]) {
    const map = new Map<string, number>();
    for (let i = 0; i + 5 <= tokens.length; i++) {
      const key = JSON.stringify(tokens.slice(i, i + 5).map((t) => t.text));
      map.set(key, map.has(key) ? -1 : i);
    }
    return map;
  }
  const am = grams(a),
    bm = grams(b);
  const pairs: [number, number][] = [];
  for (const [key, x] of am) {
    const y = bm.get(key);
    if (x >= 0 && y !== undefined && y >= 0) pairs.push([x, y]);
  }
  pairs.sort((p, q) => p[0] - q[0]);
  const tails: number[] = [],
    previous = new Int32Array(pairs.length).fill(-1);
  for (let i = 0; i < pairs.length; i++) {
    let lo = 0,
      hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pairs[tails[mid]][1] < pairs[i][1]) lo = mid + 1;
      else hi = mid;
    }
    if (lo) previous[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const anchors: [number, number][] = [];
  for (let i = tails.at(-1) ?? -1; i >= 0; i = previous[i])
    anchors.push(pairs[i]);
  anchors.reverse();
  let x = 0,
    y = 0;
  for (const [ax, by] of anchors) {
    if (ax < x || by < y) continue;
    gap(x, ax, y, by);
    emit("equal", a.slice(ax, ax + 5), b.slice(by, by + 5));
    x = ax + 5;
    y = by + 5;
  }
  gap(x, a.length, y, b.length);
  let groups = 0;
  runs.forEach((r, i) => {
    if (r.kind !== "equal" && (i === 0 || runs[i - 1].kind === "equal"))
      groups++;
  });
  return {
    older,
    newer,
    normalization: NORMALIZATION,
    runs,
    added: runs.reduce(
      (n, r) => n + (r.kind === "added" ? r.next.length : 0),
      0,
    ),
    removed: runs.reduce(
      (n, r) => n + (r.kind === "removed" ? r.old.length : 0),
      0,
    ),
    groups,
    coarseBlocks,
  };
}
