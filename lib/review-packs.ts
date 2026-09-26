import {
  DOCUMENT_META,
  SECTIONS,
  SEED_CHANGES,
  cloneChanges,
  type DocChange,
  type DocSection,
} from "@/lib/document-data";
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
  siteId: "src-cd-0039",
  doeFromId: "src-doe-483-1b",
  doeToId: "src-doe-483-1c",
} as const;

function src(id: string): SourceDoc | undefined {
  return getSourceDocs().find((d) => d.id === id);
}

/** Both the structured pack id and the PDF source id load the full CD-0039 body. */
export function isCd0039Site(siteId: string) {
  return siteId === "src-cd-0039" || siteId === "src-cd-0039-pdf";
}

/** Site docs for the Document picker. */
export function siteDocOptions(): SourceDoc[] {
  return getSourceDocs().filter(
    (d) => d.id === "src-cd-0039" || d.id === "src-cd-0039-pdf",
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
      src("src-cd-0039-pdf")?.href ??
      `${base()}/sources/CD-0039_PXD_Integrated_Safety_Management_Program.pdf`,
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
        title:
          siteId === "src-cd-0039-pdf"
            ? `${DOCUMENT_META.title} (PDF extract)`
            : DOCUMENT_META.title,
      },
      sections,
      changes: hasDemoCards ? cloneChanges(SEED_CHANGES) : [],
      note: hasDemoCards
        ? siteId === "src-cd-0039-pdf"
          ? `PDF viewer mode — original CD-0039 file on the left (${sections.length} sections / ${DOCUMENT_META.totalPages} pp). Precomputed B→C cards stay in the analysis pane.`
          : `Section review — full CD-0039 text (${sections.length} sections from PDF) with precomputed cards from DOE 483.1B→483.1C. LLM not auto-run.`
        : `Loaded full CD-0039 (${sections.length} sections) against ${from?.shortTitle ?? doeFromId} → ${to?.shortTitle ?? doeToId}. No precomputed cards for this DOE pair (demo cards are B→C only).`,
    };
  }

  return {
    ...shared,
    meta: {
      title: site?.title ?? "Selected site document",
      revision: site?.updatedLabel ?? "—",
      docId: site?.docId ?? siteId,
      owner: "Pantex",
      totalPages: site?.pages ?? 0,
    },
    sections: [
      {
        id: "sec-empty",
        number: "—",
        title: "No structured body for this site file yet",
        pages: [1],
        paragraphs: [
          {
            id: "p-empty-1",
            text: `Selected ${site?.shortTitle ?? siteId}. Open the PDF from the links below. Structured section review is currently wired for CD-0039.`,
          },
        ],
      },
    ],
    changes: [],
    note: "Site file loaded without a sectioned pack. Choose CD-0039 for the demo document body.",
  };
}

export function defaultReviewPack(): ResolvedReviewPack {
  return resolveReviewPack(
    DEFAULT_PACK_IDS.siteId,
    DEFAULT_PACK_IDS.doeFromId,
    DEFAULT_PACK_IDS.doeToId,
  );
}
