/**
 * Lightweight DOE “RAG”: keyword retrieval over chunked Order extracts +
 * precomputed B→C diff digest. No embeddings — demo-scale only.
 */
import corpus from "@/lib/generated/doe-corpus.json";
import type { DocParagraph, DocSection } from "@/lib/document-data";

export interface DoeChunk {
  id: string;
  docId: string;
  index: number;
  text: string;
  tokens: string[];
}

export interface DoeHit {
  chunk: DoeChunk;
  score: number;
}

type Corpus = {
  docs: {
    id: string;
    docId: string;
    title: string;
    role: string;
    pdf: string;
    pages: number;
    chunkCount: number;
  }[];
  chunks: DoeChunk[];
  diff: {
    id: string;
    title: string;
    deltas: { id: string; title: string; text: string }[];
    digest: string;
  };
};

const data = corpus as Corpus;

const STOP = new Set(
  "the a an and or of to in for on at by with from as is are was were be been being this that these those it its their our your you we they not no but if then than so such into over under between among about against through during before after above below up down out off again further once here there when where why how all each few more most other some only own same too very can will just should now".split(
    " ",
  ),
);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(
    (w) => !STOP.has(w),
  );
}

/** Top-k DOE chunks by token overlap with the query text. */
export function retrieveDoeChunks(query: string, k = 4): DoeHit[] {
  const q = new Set(tokenize(query));
  if (q.size === 0) return [];
  const scored: DoeHit[] = [];
  for (const chunk of data.chunks) {
    let hit = 0;
    for (const t of chunk.tokens) {
      if (q.has(t)) hit += 1;
    }
    if (hit === 0) continue;
    const score = hit / Math.sqrt(chunk.tokens.length + 1);
    scored.push({ chunk, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** Diff deltas most related to the query (title + body overlap). */
export function retrieveDiffContext(query: string, k = 2) {
  const q = new Set(tokenize(query));
  const scored = data.diff.deltas.map((d) => {
    const toks = tokenize(`${d.title} ${d.text}`);
    let hit = 0;
    for (const t of toks) if (q.has(t)) hit += 1;
    return { delta: d, score: hit };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, k).map((s) => s.delta);
}

export function getDiffDigest(maxChars = 2500): string {
  return data.diff.digest.slice(0, maxChars);
}

export function listDoeCorpusDocs() {
  return data.docs;
}

/** Turn a DOE doc's chunks into DocSections for Document viewing. */
export function doeDocAsSections(docSourceId: string): DocSection[] {
  const chunks = data.chunks.filter((c) => c.docId === docSourceId);
  if (chunks.length === 0) return [];
  const meta = data.docs.find((d) => d.id === docSourceId);
  const perSection = 6;
  const sections: DocSection[] = [];
  for (let i = 0; i < chunks.length; i += perSection) {
    const slice = chunks.slice(i, i + perSection);
    const n = Math.floor(i / perSection) + 1;
    const paragraphs: DocParagraph[] = slice.map((c, j) => ({
      id: `p-${docSourceId}-${i + j}`,
      text: c.text,
    }));
    sections.push({
      id: `sec-${docSourceId}-${n}`,
      number: String(n),
      title: meta ? `${meta.docId} · part ${n}` : `Part ${n}`,
      pages: meta?.pages ? [1, meta.pages] : [n],
      paragraphs,
    });
  }
  return sections;
}
