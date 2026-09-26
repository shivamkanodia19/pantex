export interface SourceDoc {
  id: string;
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
}

const base = () => process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Reference corpus shown in Sources tab + Write analysis panel. */
export function getSourceDocs(): SourceDoc[] {
  return [
    {
      id: "src-cd-0039",
      kind: "pantex",
      title: "CD-0039 — PXD Integrated Safety Management Program",
      shortTitle: "CD-0039 ISM Program",
      description:
        "Pantex Plant Integrated Safety Management (ISM) program document (eDCRO 944519). Site implementing framework for work planning, hazard controls, and feedback.",
      href: `${base()}/sources/CD-0039_PXD_Integrated_Safety_Management_Program.pdf`,
      local: true,
      pages: 54,
      docId: "CD-0039 / eDCRO 944519",
    },
    {
      id: "src-delegations",
      kind: "doe",
      title: "DOE Delegations Library",
      shortTitle: "Delegations Library",
      description:
        "Official DOE library for delegations and designations of authority. Used to verify who may authorize procedural and safety-system changes referenced in site docs.",
      href: "https://www.energy.gov/management/delegations-library",
      local: false,
      docId: "energy.gov / MA Delegations",
    },
  ];
}
