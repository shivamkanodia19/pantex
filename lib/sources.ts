export interface SourceDoc {
  id: string;
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

/** Reference corpus for Source Search (file finder) + analysis panel. */
export function getSourceDocs(): SourceDoc[] {
  return [
    {
      id: "src-cd-0039",
      folder: "pantex",
      kind: "pantex",
      title: "CD-0039 — PXD Integrated Safety Management Program",
      shortTitle: "CD-0039 · sections",
      description:
        "Full CD-0039 body as sectioned text (54-page PDF extract). Change cards from DOE O 483.1B→483.1C diffs.",
      href: `${base()}/document`,
      local: true,
      pages: 54,
      docId: "CD-0039 / Issue 001",
      updatedLabel: "Section review · 68 sections",
    },
    {
      id: "src-cd-0039-pdf",
      folder: "pantex",
      kind: "pantex",
      title: "CD-0039 — PDF viewer",
      shortTitle: "CD-0039 · PDF viewer",
      description:
        "Same review set, but the left pane shows the original PDF. Use Prev/Next change to jump pages.",
      href: `${base()}/sources/CD-0039_PXD_Integrated_Safety_Management_Program.pdf`,
      local: true,
      pages: 54,
      docId: "CD-0039 PDF",
      updatedLabel: "PDF viewer · 54 pages",
    },
    {
      id: "src-doe-483-1b",
      folder: "doe",
      kind: "doe",
      title: "DOE O 483.1B Chg 3 — Cooperative Research and Development Agreements",
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
      id: "src-doe-483-diff",
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
      folder: "doe",
      kind: "doe",
      title: "DOE Directives Library",
      shortTitle: "Directives Library",
      description: "Active DOE Orders, Manuals, and Guides — authority corpus for CUI, COO, QA, emergency management, and related orders cited in review.",
      href: "https://www.directives.doe.gov/",
      local: false,
      docId: "directives.doe.gov",
      updatedLabel: "External · DOE",
    },
  ];
}

export function sourcesByFolder() {
  const docs = getSourceDocs();
  return {
    pantex: docs.filter((d) => d.folder === "pantex"),
    doe: docs.filter((d) => d.folder === "doe"),
  };
}
