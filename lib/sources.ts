import doeLibrary from "@/lib/generated/doe-library.json";

export interface SourceDoc {
  id: string;
  format: "procedure" | "pdf" | "markdown" | "text" | "external";
  folder: "pantex" | "doe";
  kind: "pantex" | "doe";
  title: string;
  shortTitle: string;
  description: string;
  /** Absolute URL or path under NEXT_PUBLIC_BASE_PATH */
  href: string;
  /** true = hosted in /public */
  local: boolean;
  pages?: number;
  docId?: string;
  updatedLabel?: string;
}

const base = () => process.env.NEXT_PUBLIC_BASE_PATH || "";

type DoeLibraryDoc = {
  id: string;
  oid: string;
  title: string;
  shortTitle: string;
  description: string;
  pdf: string;
  pages: number;
  role: string;
};

/** Core demo docs always present (CD-0039 + CRADA pair + diff + externals). */
function coreSourceDocs(): SourceDoc[] {
  return [
    {
      id: "src-cd-0039",
      format: "procedure",
      folder: "pantex",
      kind: "pantex",
      title: "CD-0039 — PXD Integrated Safety Management Program",
      shortTitle: "CD-0039",
      description:
        "Official Pantex CD-0039 (same body as the source PDF). Open in Document for full or section review.",
      href: `${base()}/document?site=src-cd-0039-pdf`,
      local: true,
      pages: 54,
      docId: "CD-0039 / Issue 001",
      updatedLabel: "Parsed · 68 sections",
    },
    {
      id: "src-cd-0039-pdf",
      format: "pdf",
      folder: "pantex",
      kind: "pantex",
      title: "CD-0039 — PXD Integrated Safety Management Program",
      shortTitle: "CD-0039 · official PDF",
      description:
        "Official Pantex CD-0039 source PDF (54 pages, Issue 001). Document loads the full parse for edit/review.",
      href: `${base()}/sources/CD-0039_PXD_Integrated_Safety_Management_Program.pdf`,
      local: true,
      pages: 54,
      docId: "CD-0039",
      updatedLabel: "Official PDF · 54 pp",
    },
    {
      id: "src-doe-483-1b",
      format: "pdf",
      folder: "doe",
      kind: "doe",
      title:
        "DOE O 483.1B Chg 3 — Cooperative Research and Development Agreements",
      shortTitle: "DOE O 483.1B Chg 3",
      description:
        "Baseline CRADA order (approved 12-20-2016; Chg 3 10-28-2024). Superseded by 483.1C — used as the before side of the demo LLM diff.",
      href: `${base()}/sources/DOE_O_483.1B_Chg3_CRADA.pdf`,
      local: true,
      pages: 100,
      docId: "DOE O 483.1B Chg 3",
      updatedLabel: "PDF · baseline",
    },
    {
      id: "src-doe-483-1c",
      format: "pdf",
      folder: "doe",
      kind: "doe",
      title: "DOE O 483.1C — Cooperative Research and Development Agreements",
      shortTitle: "DOE O 483.1C",
      description:
        "Current CRADA order (approved 08-05-2026). Risk-based MSW / delegated path. Incoming side of the demo LLM diff vs 483.1B.",
      href: `${base()}/sources/DOE_O_483.1C_CRADA.pdf`,
      local: true,
      pages: 15,
      docId: "DOE O 483.1C",
      updatedLabel: "PDF · current",
    },
    {
      id: "src-doe-m-483-1-1",
      format: "pdf",
      folder: "doe",
      kind: "doe",
      title: "DOE M 483.1-1 — Cooperative Research and Development Agreements Manual",
      shortTitle: "DOE M 483.1-1",
      description:
        "Historical CRADA manual — local RAG supporting corpus for CD-0039 scan (not a review target).",
      href: `${base()}/sources/DOE_M_483.1-1_CRADA_Manual.pdf`,
      local: true,
      pages: 95,
      docId: "DOE M 483.1-1",
      updatedLabel: "PDF · supporting",
    },
    {
      id: "src-doe-483-diff",
      format: "markdown",
      folder: "doe",
      kind: "doe",
      title: "Demo LLM diff — 483.1B Chg 3 → 483.1C",
      shortTitle: "483.1B→C LLM diff",
      description:
        "Precomputed difference-identification output (what the LLM step would produce). Presentation artifact — not regenerated live in the wireframe.",
      href: `${base()}/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md`,
      local: true,
      docId: "DEMO · LLM diff",
      updatedLabel: "Markdown · precomputed",
    },
    {
      id: "src-delegations",
      format: "external",
      folder: "doe",
      kind: "doe",
      title: "DOE Delegations Library",
      shortTitle: "Delegations Library",
      description:
        "Official DOE library for delegations and designations of authority. Used to verify who may authorize procedural and safety-system changes.",
      href: "https://www.energy.gov/management/delegations-library",
      local: false,
      docId: "energy.gov / MA Delegations",
      updatedLabel: "External · DOE",
    },
    {
      id: "src-directives",
      format: "external",
      folder: "doe",
      kind: "doe",
      title: "DOE Directives Library",
      shortTitle: "Directives Library",
      description:
        "Active DOE Orders, Manuals, and Guides — authority corpus for CUI, COO, QA, emergency management, and related orders cited in review.",
      href: "https://www.directives.doe.gov/",
      local: false,
      docId: "directives.doe.gov",
      updatedLabel: "External · DOE",
    },
  ];
}

/** Oids already covered by core entries (avoid duplicate rows in Source Search). */
const CORE_OID_PREFIXES = [
  "DOE O 483.1B",
  "DOE O 483.1C",
  "DOE M 483.1-1",
];

function librarySourceDocs(): SourceDoc[] {
  const docs = (doeLibrary as { docs: DoeLibraryDoc[] }).docs;
  return docs
    .filter(
      (d) =>
        !CORE_OID_PREFIXES.some(
          (p) => d.oid === p || d.oid.startsWith(`${p} `),
        ),
    )
    .map((d) => ({
      id: d.id,
      format: "pdf" as const,
      folder: "doe" as const,
      kind: "doe" as const,
      title: d.title,
      shortTitle: d.shortTitle,
      description: d.description,
      href: `${base()}/sources/${d.pdf}`,
      local: true,
      pages: d.pages,
      docId: d.oid,
      updatedLabel:
        d.role === "priority" ? "PDF · RAG indexed" : "PDF · local library",
    }));
}

/** Reference corpus for Source Search (file finder) + analysis panel. */
export function getSourceDocs(): SourceDoc[] {
  const core = coreSourceDocs();
  const seen = new Set(core.map((d) => d.id));
  const extra = librarySourceDocs().filter((d) => !seen.has(d.id));
  return [...core, ...extra];
}

export function sourcesByFolder() {
  const docs = getSourceDocs();
  return {
    pantex: docs.filter((d) => d.folder === "pantex"),
    doe: docs.filter((d) => d.folder === "doe"),
  };
}
