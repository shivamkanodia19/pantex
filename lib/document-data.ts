import { CD0039_META, CD0039_SECTIONS } from "@/lib/cd-0039-body";

export type ChangeStatus = "pending" | "accepted" | "rejected" | "edited";

export interface DoeSource {
  citation: string;
  excerpt: string;
  requirementId: string;
  /** Official directives URL or local PDF under /sources. */
  url: string;
}

export interface DocChange {
  id: string;
  sectionId: string;
  page: number;
  lineStart: number;
  lineCount: number;
  oldText: string;
  proposedText: string;
  workingText: string;
  approvedText?: string;
  summary: string;
  reasoning: string;
  doe: DoeSource;
  status: ChangeStatus;
}

export interface DocParagraph {
  id: string;
  text: string;
  changeId?: string;
}

export interface DocSection {
  id: string;
  number: string;
  title: string;
  pages: number[];
  paragraphs: DocParagraph[];
}

export interface DocumentSnapshot {
  id: string;
  label: string;
  createdAt: string;
  changes: DocChange[];
}

function c(
  partial: Omit<DocChange, "workingText" | "status"> & { status?: ChangeStatus },
): DocChange {
  return {
    ...partial,
    workingText: partial.proposedText,
    status: partial.status ?? "pending",
  };
}

export const DOCUMENT_META = CD0039_META;

/** Seed recommendations derived from in-repo DOE O 483.1B→483.1C diff. */
export const SEED_CHANGES: DocChange[] = [
  c({
    id: "chg-01",
    sectionId: "sec-8.3",
    page: 49,
    lineStart: 1,
    lineCount: 2,
    oldText: "(a) MNL-00040, Pantex Plant Conduct of Operations Manual (b) MNL-240176, Department of Energy Explosives Safety Standard Pantex/Lawrence Livermore National Laboratory Version (c) MNL-352313, Enforcement Coordination (d) MNL-352365, Pantex Training and Qualification Program (e) PD 02.01.07.01, Process for the Explosives Safety Program",
    proposedText:
      "8.3 Related Documents — add: (f) DOE O 483.1C, DOE Cooperative Research and Development Agreements (supersedes DOE O 483.1B Chg 3). Use 483.1C when collaborative R&D / CRADA-like work with non-federal parties is in scope.",
    summary: "Cite DOE O 483.1C (not B) in Related Documents for CRADA / collaborative R&D.",
    reasoning:
      "Pipeline: DOE B→C diff shows 483.1C supersedes 483.1B. New Order cancellation language → look in 483.1C header/supersession → CD-0039 §8 Related Documents currently omits the CRADA order; add 483.1C so ISM flow-down points at the current DOE authority.",
    doe: {
      citation: "DOE O 483.1C — Cancels/Supersedes 483.1B",
      excerpt:
        "483.1C supersedes DOE O 483.1B (including Chg 3). Site implementing documents that cite 483.1B should be version-stamped to 483.1C with an applicability note for in-flight agreements.",
      requirementId: "DOE-483.1C-SUPERSEDE",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
  c({
    id: "chg-02",
    sectionId: "sec-5.5.15",
    page: 39,
    lineStart: 1,
    lineCount: 4,
    oldText: "Based on work scope, complexity, and/or associated hazards, specific ES&H submittals may be required before subcontract mobilization. These submittals are coordinated between the SA/PR, the STR and the appropriate ES&H SMEs. (a) Requirements Flow-Down There are several different types of requirements that flow down via the subcontracting process. Terms and Conditions are those standard business rules incorporated into the “boilerplate” legal requirements governing the business relationship between PXD and its subcontractors.",
    proposedText:
      "For collaborative R&D / CRADA-like work with non-federal parties, flow-down shall follow DOE O 483.1C: low-risk work using a DOE-approved Master Scope of Work may proceed under delegated contractor authority; elevated-risk work requires DOE review. Standard commercial service subcontracts continue under existing ES&H flow-down.",
    summary: "Add risk-tier / MSW path for collaborative non-federal work (from 483.1C).",
    reasoning:
      "Pipeline: B→C diff flags Purpose §1.c risk tiers (MSW/low-risk delegated vs elevated DOE review). Look in 483.1C §1.c → map onto CD-0039 subcontract requirements flow-down so collaborative R&D packages are graded, not one-size field-office packaging.",
    doe: {
      citation: "DOE O 483.1C §1.c — Risk-based oversight (MSW / delegated)",
      excerpt:
        "CRADA activities that present low statutory, financial, human or animal subject, or national security risk and use a prior DOE-approved scope of work such as the Master Scope of Work (MSW) may be executed under delegated authority at the facility contractor level; elevated-risk CRADAs require DOE review.",
      requirementId: "DOE-483.1C-1c",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
  c({
    id: "chg-03",
    sectionId: "sec-5.2.5",
    page: 17,
    lineStart: 1,
    lineCount: 3,
    oldText: "“Before work is performed, the associated hazards are evaluated and an agreed-upon set of safety standards and requirements is established which, if properly implemented, will provide adequate assurance that the workers, the public, and the environment are protected from adverse consequences.” Safety standards and requirements are flowed into contractual agreements. Requirement flow-down, from the Prime Contract to implementing management and control documents, is through the BRAIN. The level of the hazard dictates the level of formality used to analyze the hazards and to establish controls.",
    proposedText:
      "When work includes collaborative research and development with non-federal parties, the agreed-upon standards set shall include DOE O 483.1C (CRADAs). Do not cite superseded DOE O 483.1B Chg 3 attachment models as controlling without confirmation against 483.1C.",
    summary: "Include DOE O 483.1C in the agreed-upon standards set when CRADA work applies.",
    reasoning:
      "Pipeline: B→C diff collapses the Order package and refreshes controlling text in 483.1C. Look in 483.1C Purpose + Requirements → CD-0039 GP 5 (Identification of Safety Standards) must list the current CRADA Order when collaborative R&D is in the work package.",
    doe: {
      citation: "DOE O 483.1C — Purpose / Requirements (current CRADA Order)",
      excerpt:
        "483.1C establishes DOE policy requirements and oversight for CRADAs under 15 U.S.C. § 3710a and replaces the long-form 483.1B Chg 3 package. Site standards identification should point to the current Order.",
      requirementId: "DOE-483.1C-PURPOSE",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
  c({
    id: "chg-04",
    sectionId: "sec-3",
    page: 10,
    lineStart: 2,
    lineCount: 3,
    oldText: "ISM is also applicable to PXD subcontractors to the extent that such requirements are incorporated into subcontractor contract documents. The contract between PXD and the subcontractor will contain specific contract scope, applicable worker safety and health requirements, and other terms and conditions. Unless otherwise specified in contractual documents, PXD subcontractors working on-site will work under the WS&H program requirements established in this document.",
    proposedText:
      "ISM is applicable to all work performed by PXD employees and to PXD subcontractors to the extent requirements are incorporated in their contracts. Collaborative R&D / CRADA-like engagements with non-federal parties additionally follow DOE O 483.1C oversight (risk-tiered MSW or DOE review) as flowed into the applicable agreement.",
    summary: "Clarify ISM applicability to collaborative R&D partners under 483.1C.",
    reasoning:
      "Pipeline: B→C diff emphasizes M&O/DEAR/FAR contract compliance for CRADA activities. Look in 483.1C Purpose §1.b → CD-0039 Strategy language on subcontractors should note that collaborative R&D partners follow 483.1C oversight in addition to ISM flow-down.",
    doe: {
      citation: "DOE O 483.1C §1.b — Contract / DEAR-FAR compliance",
      excerpt:
        "Ensure CRADA activities comply with statutes, regulations, Executive Orders, and the applicable facility contractor DOE prime contract, including M&O and incorporated DEAR and FAR clauses.",
      requirementId: "DOE-483.1C-1b",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
  c({
    id: "chg-05",
    sectionId: "sec-4",
    page: 11,
    lineStart: 1,
    lineCount: 3,
    oldText: "Federal regulation 48 CFR 970.5223-1, Integration of Environment, Safety, and Health into Work Planning and Execution, requires DOE contractors to establish an ISM System. This regulation also requires contractors to follow ISM GPs and CFs, and to describe their approach for implementing and tailoring an ISM Program to their sites and activities.",
    proposedText:
      "Section 7 BRAIN flow-down establishes implementing documents for ISM/WS&H requirements (including 10 CFR 851 functional areas). When collaborative R&D / CRADA-like work is authorized, the flow-down set shall include DOE O 483.1C requirements for protectable information, export-control awareness, and risk-tiered approval paths.",
    summary: "Point BRAIN / standards flow-down at current DOE O 483.1C when CRADA requirements apply.",
    reasoning:
      "Pipeline: B→C diff shows protectable-info / export-control citations refreshed in 483.1C §4. Look in 483.1C Requirements §4.d–e → CD-0039 §4 Requirements / BRAIN flow-down should acknowledge 483.1C as a DOE Order that may flow when collaborative R&D is authorized.",
    doe: {
      citation: "DOE O 483.1C §4.d–e — Protectable info / proprietary data",
      excerpt:
        "Export control reviews and protection of properly marked proprietary / protectable information apply to CRADA activities; 483.1C ties safeguarding to CUI / FOIA / Trade Secrets authorities alongside the facility contract.",
      requirementId: "DOE-483.1C-4d",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
];

/** Full CD-0039 procedure text from the local PDF (all TOC sections). */
export const SECTIONS: DocSection[] = CD0039_SECTIONS as DocSection[];

export function sectionTitle(sectionId: string): string {
  const s = SECTIONS.find((x) => x.id === sectionId);
  return s ? `${s.number} ${s.title}` : sectionId;
}

export function cloneChanges(changes: DocChange[]): DocChange[] {
  return changes.map((ch) => ({ ...ch, doe: { ...ch.doe } }));
}
