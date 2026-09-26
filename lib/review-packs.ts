import {
  DOCUMENT_META,
  SECTIONS,
  SEED_CHANGES,
  cloneChanges,
  type DocChange,
  type DocSection,
} from "@/lib/document-data";
import { doeDocAsSections } from "@/lib/doe-rag";
import { getSourceDocs, type SourceDoc } from "@/lib/sources";

export interface DocumentMeta {
  title: string;
  revision: string;
  docId: string;
  owner: string;
  totalPages: number;
}

export interface ResolvedReviewPack {
  siteId: string;
  doeFromId: string;
  doeToId: string;
  meta: DocumentMeta;
  sections: DocSection[];
  changes: DocChange[];
  diffHref?: string;
  note: string;
  sitePdfHref?: string;
  doeFromPdfHref?: string;
  doeToPdfHref?: string;
}

const base = () => process.env.NEXT_PUBLIC_BASE_PATH || "";

export const DEFAULT_PACK_IDS = {
  /** Official Pantex CD-0039 source PDF (full parse). */
  siteId: "src-cd-0039-pdf",
  doeFromId: "src-doe-483-1b",
  doeToId: "src-doe-483-1c",
} as const;

function src(id: string): SourceDoc | undefined {
  return getSourceDocs().find((d) => d.id === id);
}

/** CD-0039 catalog ids (PDF or sectioned alias) load the full extracted body. */
export function isCd0039Site(siteId: string) {
  return siteId === "src-cd-0039" || siteId === "src-cd-0039-pdf";
}

/**
 * Document review targets only — official Pantex CD-0039 PDF.
 * DOE PDFs stay in the local RAG corpus; they are not site review docs.
 */
export function siteDocOptions(): SourceDoc[] {
  return getSourceDocs().filter(
    (d) => d.local && d.format === "pdf" && d.folder === "pantex",
  );
}

/** DOE docs selectable as baseline / incoming. */
export function doeDocOptions(): SourceDoc[] {
  return getSourceDocs().filter(
    (d) => d.id === "src-doe-483-1b" || d.id === "src-doe-483-1c",
  );
}

function cd0039Sections(): DocSection[] {
  return SECTIONS.map((s) => ({
    ...s,
    paragraphs: s.paragraphs.map((p) => ({ ...p })),
  }));
}

/**
 * Resolve review set from the three selected files.
 * CD-0039 always loads sectioned body when chosen as site.
 * Precomputed change cards only for 483.1B → 483.1C.
 */
export function resolveReviewPack(
  siteId: string,
  doeFromId: string,
  doeToId: string,
): ResolvedReviewPack {
  const site = src(siteId);
  const from = src(doeFromId);
  const to = src(doeToId);

  const shared = {
    siteId,
    doeFromId,
    doeToId,
    sitePdfHref:
      site?.format === "pdf"
        ? site.href
        : (src("src-cd-0039-pdf")?.href ??
          `${base()}/sources/CD-0039_PXD_Integrated_Safety_Management_Program.pdf`),
    doeFromPdfHref: from?.href,
    doeToPdfHref: to?.href,
    diffHref:
      doeFromId === "src-doe-483-1b" && doeToId === "src-doe-483-1c"
        ? `${base()}/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md`
        : undefined,
  };

  const isCd0039 = isCd0039Site(siteId);
  const hasDemoCards =
    isCd0039 &&
    doeFromId === "src-doe-483-1b" &&
    doeToId === "src-doe-483-1c";

  if (isCd0039) {
    const sections = cd0039Sections();
    return {
      ...shared,
      meta: {
        ...DOCUMENT_META,
        totalPages: DOCUMENT_META.totalPages,
      },
      sections,
      changes: hasDemoCards ? cloneChanges(SEED_CHANGES) : [],
      note: hasDemoCards
        ? `Official CD-0039 PDF fully parsed (${sections.length} sections / ${DOCUMENT_META.totalPages} pp). Change cards from DOE 483.1B→483.1C.`
        : `Loaded CD-0039 (${sections.length} sections) against ${from?.shortTitle ?? doeFromId} → ${to?.shortTitle ?? doeToId}.`,
    };
  }

  const parsed = doeDocAsSections(siteId);
  const fallbackSections: DocSection[] = [
    {
      id: "sec-pdf-only",
      number: "PDF",
      title: site?.shortTitle ?? "Source PDF",
      pages: site?.pages ? [1, site.pages] : [1],
      paragraphs: [
        {
          id: "p-pdf-1",
          text: `${site?.title ?? siteId} is available as a PDF (${site?.pages ?? "—"} pages). Use Open PDF for the official file.`,
        },
      ],
    },
  ];

  return {
    ...shared,
    meta: {
      title: site?.title ?? "Selected document",
      revision: site?.updatedLabel ?? "—",
      docId: site?.docId ?? siteId,
      owner: site?.folder === "doe" ? "DOE" : "Pantex",
      totalPages: site?.pages ?? 0,
    },
    sections: parsed.length > 0 ? parsed : fallbackSections,
    changes: [],
    note:
      parsed.length > 0
        ? `Opened ${site?.shortTitle ?? siteId} — ${parsed.length} parts from text extract (${site?.pages ?? "—"} pp PDF). Full CRADA RAG scan targets CD-0039.`
        : `Opened ${site?.shortTitle ?? siteId}. No text extract indexed yet — use Open PDF.`,
  };
}

export function defaultReviewPack(): ResolvedReviewPack {
  return resolveReviewPack(
    DEFAULT_PACK_IDS.siteId,
    DEFAULT_PACK_IDS.doeFromId,
    DEFAULT_PACK_IDS.doeToId,
  );
}
