import type { DocSection, DocChange } from "./document-data";

export function chapterKey(number: string) {
  return number.trim().match(/^\d+(?=\.|\s|$)/)?.[0] ?? number.trim();
}
export function chapterLinks(sections: DocSection[]) {
  const seen = new Set<string>();
  return sections.flatMap((section) => {
    const label = chapterKey(section.number);
    if (seen.has(label)) return [];
    seen.add(label);
    return [{ label, sectionId: section.id }];
  });
}
export function normalizeSectionQuery(query: string) {
  return query
    .toLowerCase()
    .trim()
    .replace(/^(?:section\b|§)\s*/, "")
    .replace(/\s+/g, " ");
}
export function searchSections(
  sections: DocSection[],
  changes: DocChange[],
  query: string,
) {
  const q = normalizeSectionQuery(query);
  if (!q) return [];
  const approved = new Map(changes.map((c) => [c.id, c.approvedText]));
  return sections
    .flatMap((section, index) => {
      const number = section.number.toLowerCase();
      const title = section.title.toLowerCase().replace(/\s+/g, " ");
      const paragraph = section.paragraphs
        .map(
          (p) => (p.changeId ? approved.get(p.changeId) : undefined) ?? p.text,
        )
        .find((text) => text.toLowerCase().replace(/\s+/g, " ").includes(q));
      const rank =
        number === q
          ? 0
          : number.startsWith(q)
            ? 1
            : title.includes(q)
              ? 2
              : paragraph
                ? 3
                : -1;
      if (rank < 0) return [];
      const text = paragraph?.replace(/\s+/g, " ") ?? "";
      const start = Math.max(0, text.toLowerCase().indexOf(q) - 45);
      const excerpt =
        rank === 3
          ? `${start ? "…" : ""}${text.slice(start, start + 160)}${text.length > start + 160 ? "…" : ""}`
          : undefined;
      return [{ section, rank, index, excerpt }];
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, 8);
}
