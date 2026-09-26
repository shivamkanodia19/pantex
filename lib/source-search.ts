import type { SourceDoc } from "./sources";

export function filterSources(docs: SourceDoc[], query: string) {
  const q = query.trim().toLowerCase();
  return docs.filter(
    (doc) =>
      !q ||
      [doc.title, doc.shortTitle, doc.docId ?? "", doc.description].some(
        (value) => value.toLowerCase().includes(q),
      ),
  );
}

/** A filtered-out source must not silently become a different preview. */
export function visibleSelection(docs: SourceDoc[], selectedId: string | null) {
  return docs.find((doc) => doc.id === selectedId) ?? null;
}
