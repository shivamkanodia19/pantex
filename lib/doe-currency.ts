import doeLibrary from "@/lib/generated/doe-library.json";

type LibraryDoc = { id: string; oid: string; title: string; pdf: string };

export interface CurrencyFinding {
  cited: string;
  current: LibraryDoc;
}

const docs = (doeLibrary as { docs: LibraryDoc[] }).docs;

function split(oid: string) {
  const m = oid.match(/^DOE ([OMGP]) (\d+\.\d+(?:-\d+)?)([A-Z]?)$/);
  return m ? { key: `${m[1]} ${m[2]}`, rev: m[3] } : null;
}

/** DOE directives cited in `text` for which the local library holds a later revision. */
export function findSupersededCitations(text: string): CurrencyFinding[] {
  const seen = new Set<string>();
  const out: CurrencyFinding[] = [];
  const re = /\b(?:DOE\s+)?(O|Order|M|G|P)\s*(\d{3}\.\d+(?:-\d+)?)([A-Z]?)\b/g;
  for (const m of text.matchAll(re)) {
    const type = m[1] === "Order" ? "O" : m[1];
    const key = `${type} ${m[2]}`;
    const rev = m[3];
    const cited = `DOE ${key}${rev}`;
    if (seen.has(cited)) continue;
    seen.add(cited);
    const newer = docs
      .map((d) => ({ d, s: split(d.oid) }))
      .filter(({ s }) => s && s.key === key && s.rev > rev)
      .sort((a, b) => b.s!.rev.localeCompare(a.s!.rev))[0];
    if (newer) out.push({ cited, current: newer.d });
  }
  return out;
}

export function libraryPdfFor(docId: string): string | undefined {
  const d = docs.find((x) => x.id === docId || x.oid === docId);
  return d ? `/sources/${d.pdf}` : undefined;
}
