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
  /** Precomputed DOE→DOE diff artifact, if any. */
  diffHref?: string;
  note: string;
  sitePdfHref?: string;
  doeFromPdfHref?: string;
  doeToPdfHref?: string;
}

const base = () => process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Default demo pack: CD-0039 reviewed against 483.1B→483.1C. */
export const DEFAULT_PACK_IDS = {
  siteId: "src-cd-0039",
  doeFromId: "src-doe-483-1b",
  doeToId: "src-doe-483-1c",
} as const;

function src(id: string): SourceDoc | undefined {
  return getSourceDocs().find((d) => d.id === id);
}

/** Site docs the Document tab can put in the left pane. */
export function siteDocOptions(): SourceDoc[] {
  return getSourceDocs().filter(
    (d) =>
      d.folder === "pantex" &&
      (d.id === "src-cd-0039" || d.id === "src-cd-0039-pdf"),
  );
}

/** DOE docs selectable as baseline / incoming authority. */
export function doeDocOptions(): SourceDoc[] {
  return getSourceDocs().filter(
    (d) => d.folder === "doe" && d.local && d.id !== "src-doe-483-diff",
  );
}

function packKey(siteId: string, doeFromId: string, doeToId: string) {
  return `${siteId}|${doeFromId}|${doeToId}`;
}

/**
 * Resolve a review set from the three selected files.
 * Only the CD-0039 + 483.1B→483.1C combo has precomputed change cards (demo).
 * Other combos still “load” (meta + PDF links) so the picker workflow is real.
 */
export function resolveReviewPack(
  siteId: string,
  doeFromId: string,
  doeToId: string,
): ResolvedReviewPack {
  const site = src(siteId);
  const from = src(doeFromId);
  const to = src(doeToId);
  const known = packKey("src-cd-0039", "src-doe-483-1b", "src-doe-483-1c");
  const normalizedSite =
    siteId === "src-cd-0039-pdf" ? "src-cd-0039" : siteId;
  const key = packKey(normalizedSite, doeFromId, doeToId);

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

  if (key === known || packKey(normalizedSite, doeFromId, doeToId) === known) {
    return {
      ...shared,
      meta: { ...DOCUMENT_META },
      sections: SECTIONS.map((s) => ({
        ...s,
        paragraphs: s.paragraphs.map((p) => ({ ...p })),
      })),
      changes: cloneChanges(SEED_CHANGES),
      note: "Loaded precomputed cards: DOE 483.1B→483.1C diff → 483.1C loci → CD-0039. LLM not auto-run.",
    };
  }

  // Fallback: selectable but no seeded redlines yet
  const label = site?.shortTitle ?? siteId;
  return {
    ...shared,
    meta: {
      title: site?.title ?? "Selected site document",
      revision: site?.updatedLabel ?? "—",
      docId: site?.docId ?? label,
      owner: site?.folder === "pantex" ? "Pantex" : "DOE",
      totalPages: site?.pages ?? 0,
    },
    sections: [
      {
        id: "sec-empty",
        number: "—",
        title: "No structured review pack for this combination yet",
        pages: [1],
        paragraphs: [
          {
            id: "p-empty-1",
            text: `You selected ${site?.shortTitle ?? siteId} against ${from?.shortTitle ?? doeFromId} → ${to?.shortTitle ?? doeToId}. Open the PDFs from the picker. A full sectioned review pack (like CD-0039 + 483.1B→C) has not been generated for this set.`,
          },
        ],
      },
    ],
    changes: [],
    note: "Combination loaded without precomputed change cards. Pick CD-0039 + 483.1B + 483.1C for the demo redlines.",
  };
}

export function defaultReviewPack(): ResolvedReviewPack {
  return resolveReviewPack(
    DEFAULT_PACK_IDS.siteId,
    DEFAULT_PACK_IDS.doeFromId,
    DEFAULT_PACK_IDS.doeToId,
  );
}
