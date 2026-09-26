export type ChangeStatus = "pending" | "accepted" | "rejected" | "edited";

export interface DoeSource {
  citation: string;
  excerpt: string;
  requirementId: string;
  /** Official directives / regs URL for the cited order or standard. */
  url: string;
}

export interface DocChange {
  id: string;
  sectionId: string;
  page: number;
  /** 1-based start line within the section body (GitHub-style). */
  lineStart: number;
  lineCount: number;
  oldText: string;
  proposedText: string;
  /** Mutable working copy of the proposed text (write-mode edits). */
  workingText: string;
  /** Applied to the document only after Approve. */
  approvedText?: string;
  summary: string;
  reasoning: string;
  doe: DoeSource;
  status: ChangeStatus;
}

export interface DocParagraph {
  id: string;
  text: string;
  /** If set, this paragraph span is a change highlight. */
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

/** Seed DOE recommendations mapped onto the demo procedure. */
export const SEED_CHANGES: DocChange[] = [
  c({
    id: "chg-01",
    sectionId: "sec-1.2",
    page: 2,
    lineStart: 4,
    lineCount: 3,
    oldText:
      "All Controlled Unclassified Information (CUI) markings shall follow the 2018 site desk guide.",
    proposedText:
      "All Controlled Unclassified Information (CUI) markings shall follow DOE Order 471.7 and the current Pantex CUI marking guide (Rev. D).",
    summary: "Align CUI marking authority with DOE O 471.7 / Rev. D guide.",
    reasoning:
      "DOE RAG matched this clause to Order 471.7 §4.b. The 2018 desk guide is superseded; Rev. D is the controlling local procedure.",
    doe: {
      citation: "DOE O 471.7 §4.b — CUI Marking",
      excerpt:
        "Sites shall mark CUI in accordance with this Order and the site’s approved marking guide. Superseded local desk guides are not authoritative.",
      requirementId: "DOE-471.7-4b",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+471.7",
    },
  }),
  c({
    id: "chg-02",
    sectionId: "sec-2.1",
    page: 4,
    lineStart: 2,
    lineCount: 2,
    oldText: "Two-person integrity (TPI) is required for Category I material movements after 1800 local time.",
    proposedText:
      "Two-person integrity (TPI) is required for all Category I material movements, regardless of time of day.",
    summary: "Remove after-hours-only TPI limit; apply TPI to all Cat I moves.",
    reasoning:
      "DOE STD-1195 and site security directive treat TPI as a continuous control for Cat I, not a night-shift exception.",
    doe: {
      citation: "DOE STD-1195-2011 §5.3 — Two-Person Integrity",
      excerpt:
        "TPI shall be maintained whenever Category I SNM is accessed or relocated. Time-of-day exceptions are not authorized.",
      requirementId: "STD-1195-5.3",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+STD-1195",
    },
  }),
  c({
    id: "chg-03",
    sectionId: "sec-2.3",
    page: 5,
    lineStart: 6,
    lineCount: 4,
    oldText:
      "Visitor escorts may pause inside Material Access Areas when the visitor remains within line of sight of the badge reader.",
    proposedText:
      "Visitor escorts shall maintain continuous visual contact and shall not pause inside Material Access Areas except at designated muster points listed in Attachment C.",
    summary: "Tighten visitor escort rules inside MAAs.",
    reasoning:
      "Line-of-sight to a badge reader is not an approved control. DOE and NNSA escort policy requires continuous visual contact or approved muster points.",
    doe: {
      citation: "DOE O 473.3A Att. 2 — Escort Requirements",
      excerpt:
        "Escorts maintain continuous visual contact with visitors in limited areas. Stops are permitted only at approved locations.",
      requirementId: "DOE-473.3A-A2",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+473.3A",
    },
  }),
  c({
    id: "chg-04",
    sectionId: "sec-3.1",
    page: 7,
    lineStart: 1,
    lineCount: 2,
    oldText: "Annual refresher training satisfies LOTO qualification for craft personnel.",
    proposedText:
      "LOTO qualification requires initial classroom instruction, a practical evaluation, and annual refresher training. Annual refresher alone is not sufficient for initial qualification.",
    summary: "Clarify LOTO initial vs refresher qualification path.",
    reasoning:
      "OSHA 1910.147 and DOE worker safety expectations require demonstrated practical competency before independent LOTO work.",
    doe: {
      citation: "10 CFR 851 / OSHA 1910.147 — LOTO Qualification",
      excerpt:
        "Authorized employees shall receive training that includes recognition of hazardous energy and practical demonstration of lockout procedures.",
      requirementId: "10CFR851-LOTO",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147",
    },
  }),
  c({
    id: "chg-05",
    sectionId: "sec-3.4",
    page: 9,
    lineStart: 3,
    lineCount: 3,
    oldText: "Temporary bypasses of safety interlocks may be authorized by the shift supervisor verbally.",
    proposedText:
      "Temporary bypasses of safety interlocks require a written Bypass Authorization Form, dual signatures (Shift Supervisor and Facility Manager), and entry into the Bypass Log before work begins.",
    summary: "Replace verbal bypass authority with written dual-sign process.",
    reasoning:
      "Verbal bypass creates an unverifiable control gap. DOE conduct-of-operations expects documented, dual-authorized bypasses with log tracking.",
    doe: {
      citation: "DOE O 422.1 — Conduct of Operations, Bypass Control",
      excerpt:
        "Bypasses of safety systems shall be authorized in writing, logged, and independently verified before implementation.",
      requirementId: "DOE-422.1-BYP",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+422.1",
    },
  }),
  c({
    id: "chg-06",
    sectionId: "sec-4.2",
    page: 11,
    lineStart: 5,
    lineCount: 2,
    oldText: "Radiation work permits expire at the end of the calendar week in which they were issued.",
    proposedText:
      "Radiation work permits expire at 2359 on the fourteenth calendar day after issuance, or sooner if work scope or radiological conditions change.",
    summary: "Extend RWP validity to 14 days with change-triggered reissue.",
    reasoning:
      "Weekly expiry drives unnecessary rework. DOE radiological control guides allow term RWPs up to 14 days when conditions are stable.",
    doe: {
      citation: "DOE-STD-1098-2017 Ch. 3 — Radiation Work Permits",
      excerpt:
        "RWPs may remain in effect for a defined period not to exceed 14 days when work conditions remain unchanged.",
      requirementId: "STD-1098-3",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE-STD-1098",
    },
  }),
  c({
    id: "chg-07",
    sectionId: "sec-5.1",
    page: 13,
    lineStart: 2,
    lineCount: 3,
    oldText:
      "Occurrence reports categorized as Significance Category 3 may be closed by the responsible manager without independent review.",
    proposedText:
      "Occurrence reports categorized as Significance Category 3 require independent review by the Performance Assurance organization prior to closure.",
    summary: "Require independent review before closing SC-3 occurrences.",
    reasoning:
      "ORPS guidance and NNSA line oversight expect independent review even for lower-significance events to prevent recurring precursors.",
    doe: {
      citation: "DOE O 232.2A — Occurrence Reporting",
      excerpt:
        "Closure of occurrence reports shall include independent review commensurate with significance; Category 3 events are not exempt.",
      requirementId: "DOE-232.2A-CL",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+232.2A",
    },
  }),
  c({
    id: "chg-08",
    sectionId: "sec-5.3",
    page: 14,
    lineStart: 4,
    lineCount: 2,
    oldText: "Lessons learned are optional attachments to critique packages.",
    proposedText:
      "A documented lessons-learned statement is a required element of every critique package and shall be entered into the site lessons-learned database within five working days of critique completion.",
    summary: "Make lessons-learned mandatory in critique packages.",
    reasoning:
      "DOE lessons-learned program effectiveness depends on capture at critique closeout, not optional attachments.",
    doe: {
      citation: "DOE O 210.2A — Lessons Learned Program",
      excerpt:
        "Organizations shall identify, document, and disseminate lessons learned from critiques and assessments in a timely manner.",
      requirementId: "DOE-210.2A-LL",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+210.2A",
    },
  }),
  c({
    id: "chg-09",
    sectionId: "sec-6.2",
    page: 16,
    lineStart: 1,
    lineCount: 4,
    oldText:
      "Emergency Accountability System headcounts may be deferred up to 30 minutes during severe weather if personnel remain sheltered in place.",
    proposedText:
      "Emergency Accountability System headcounts shall be initiated within 10 minutes of an accountability order. Shelter-in-place does not defer headcount; accountability is performed at the shelter location.",
    summary: "Remove weather deferral; start headcount within 10 minutes.",
    reasoning:
      "DOE emergency management expectations prioritize rapid accountability. Weather sheltering changes location, not the requirement to account.",
    doe: {
      citation: "DOE O 151.1D — Comprehensive Emergency Management",
      excerpt:
        "Accountability shall be established promptly after an emergency declaration. Protective actions do not waive accountability timelines.",
      requirementId: "DOE-151.1D-ACCT",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+151.1",
    },
  }),
  c({
    id: "chg-10",
    sectionId: "sec-7.1",
    page: 18,
    lineStart: 3,
    lineCount: 3,
    oldText: "Quality records may be retained in local shared drives pending transfer to Records Management.",
    proposedText:
      "Quality records shall be captured in the approved Electronic Document Management System (EDMS) within one working day of approval. Local shared drives are not an approved records repository.",
    summary: "Prohibit shared-drive retention; require EDMS within 1 day.",
    reasoning:
      "NQA-1 and DOE records requirements reject uncontrolled shared drives as records repositories due to retention and authenticity risks.",
    doe: {
      citation: "DOE O 243.1B / NQA-1 — Quality Records",
      excerpt:
        "Quality assurance records shall be maintained in approved systems that preserve authenticity, integrity, and retrievability.",
      requirementId: "DOE-243.1B-QR",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+243.1",
    },
  }),
  c({
    id: "chg-11",
    sectionId: "sec-7.4",
    page: 19,
    lineStart: 2,
    lineCount: 2,
    oldText: "Procedure revision bars are optional for administrative changes.",
    proposedText:
      "Procedure revision bars are required for all substantive and administrative changes that alter instructional text, notes, cautions, or warnings.",
    summary: "Require revision bars for administrative text changes too.",
    reasoning:
      "Users rely on revision bars to identify changed instruction. Omitting them for “admin” edits has caused missed-step events at peer sites.",
    doe: {
      citation: "DOE-STD-1029-92 — Writer’s Guide for Procedures",
      excerpt:
        "Changes to procedure text shall be clearly identified to the user. Revision marking is required whenever instructional content changes.",
      requirementId: "STD-1029-REV",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE-STD-1029",
    },
  }),
  c({
    id: "chg-12",
    sectionId: "sec-8.2",
    page: 20,
    lineStart: 5,
    lineCount: 3,
    oldText:
      "This procedure is reviewed every five years or when a significant process change occurs, whichever is later.",
    proposedText:
      "This procedure is reviewed at least every three years, and whenever a significant process change, occurrence, or DOE order update affects its content — whichever comes first.",
    summary: "Tighten periodic review from 5 years to 3 years, trigger-first.",
    reasoning:
      "DOE document control expectations and NNSA line oversight favor a three-year maximum cycle with event-driven earlier review.",
    doe: {
      citation: "DOE O 414.1D — Quality Assurance, Document Control",
      excerpt:
        "Documents shall be reviewed for adequacy at a frequency that ensures continued suitability. Event-driven review takes precedence over calendar cycle.",
      requirementId: "DOE-414.1D-DC",
      url: "https://www.directives.doe.gov/search?SearchableText=DOE+O+414.1",
    },
  }),
];

function p(id: string, text: string, changeId?: string): DocParagraph {
  return { id, text, changeId };
}

/**
 * ~20-page demo procedure, sectioned for readability.
 * Page markers are decorative for the wireframe; paragraphs carry change anchors.
 */
export const DOCUMENT_META = {
  title: "PX-OPS-2204 — Material Access, Work Control & Emergency Accountability",
  revision: "Rev. C (site baseline)",
  docId: "PX-OPS-2204",
  owner: "Operations Directives — Pantex Plant",
  totalPages: 20,
};

export const SECTIONS: DocSection[] = [
  {
    id: "sec-1.0",
    number: "1.0",
    title: "Purpose and Scope",
    pages: [1],
    paragraphs: [
      p(
        "p-1-1",
        "This procedure establishes requirements for Controlled Unclassified Information handling, Material Access Area controls, lockout/tagout interfaces, radiological work permits, occurrence critique closeout, emergency accountability, and quality records for operations at the Pantex Plant.",
      ),
      p(
        "p-1-2",
        "It applies to all federal employees, management & operating contractor personnel, and subcontractors performing work under the Plant’s nuclear and high-hazard operations envelope.",
      ),
      p(
        "p-1-3",
        "Where this procedure conflicts with a higher-tier DOE Order, the DOE Order governs. Site implementing documents shall be updated through the formal document control process.",
      ),
    ],
  },
  {
    id: "sec-1.2",
    number: "1.2",
    title: "Information Protection and CUI Marking",
    pages: [2, 3],
    paragraphs: [
      p(
        "p-12-1",
        "Personnel who create or handle Controlled Unclassified Information shall complete initial and annual CUI awareness training before unsupervised access to CUI repositories.",
      ),
      p(
        "p-12-2",
        "All Controlled Unclassified Information (CUI) markings shall follow the 2018 site desk guide.",
        "chg-01",
      ),
      p(
        "p-12-3",
        "Portion markings, banner lines, and dissemination controls shall appear on the first page and on each subsequent page that contains CUI.",
      ),
      p(
        "p-12-4",
        "Electronic transmission of CUI shall use approved encrypted channels. Unencrypted email is prohibited for CUI, including within the site intranet unless the message is confined to an accredited enclave.",
      ),
      p(
        "p-12-5",
        "Suspected spillage of CUI to an uncleared system shall be reported to the Information Security Officer within one hour of discovery.",
      ),
    ],
  },
  {
    id: "sec-2.1",
    number: "2.1",
    title: "Category I Material Movement — Two-Person Integrity",
    pages: [4],
    paragraphs: [
      p(
        "p-21-1",
        "Category I special nuclear material movements are planned through the Material Control & Accountability organization and executed only by qualified Material Handlers.",
      ),
      p(
        "p-21-2",
        "Two-person integrity (TPI) is required for Category I material movements after 1800 local time.",
        "chg-02",
      ),
      p(
        "p-21-3",
        "Both TPI participants shall be present, attentive, and capable of detecting unauthorized or incorrect actions. Passive observation from an adjacent room does not satisfy TPI.",
      ),
    ],
  },
  {
    id: "sec-2.3",
    number: "2.3",
    title: "Visitor Control within Material Access Areas",
    pages: [5, 6],
    paragraphs: [
      p(
        "p-23-1",
        "Visitors entering a Material Access Area (MAA) shall be badged, briefed on prohibited articles, and continuously escorted by a cleared escort with current MAA access.",
      ),
      p(
        "p-23-2",
        "Escort-to-visitor ratios shall not exceed those specified in the site Security Plan. Additional escorts are required when visual contact cannot be maintained for the full party.",
      ),
      p(
        "p-23-3",
        "Visitor escorts may pause inside Material Access Areas when the visitor remains within line of sight of the badge reader.",
        "chg-03",
      ),
      p(
        "p-23-4",
        "Photography, RF-transmitting devices, and removable media are prohibited in MAAs unless authorized under a specific security plan deviation.",
      ),
    ],
  },
  {
    id: "sec-3.1",
    number: "3.1",
    title: "Lockout/Tagout Qualification",
    pages: [7],
    paragraphs: [
      p(
        "p-31-1",
        "Annual refresher training satisfies LOTO qualification for craft personnel.",
        "chg-04",
      ),
      p(
        "p-31-2",
        "Each LOTO shall identify energy isolation points, verification methods, and the responsible authorized employee. Group LOTO follow site Attachment B.",
      ),
    ],
  },
  {
    id: "sec-3.2",
    number: "3.2",
    title: "Work Control and Job Hazard Analysis",
    pages: [8],
    paragraphs: [
      p(
        "p-32-1",
        "Work packages for nuclear facility activities shall include a Job Hazard Analysis reviewed by the Work Control Center before release to the field.",
      ),
      p(
        "p-32-2",
        "Hold points identified in the work package shall not be bypassed. If field conditions prevent completion of a hold point, work shall stop and the package returned for revision.",
      ),
      p(
        "p-32-3",
        "Pre-job briefs shall cover scope, hazards, abort criteria, and stop-work authority. Attendance shall be recorded on the work package cover sheet.",
      ),
    ],
  },
  {
    id: "sec-3.4",
    number: "3.4",
    title: "Safety Interlock Bypass Control",
    pages: [9, 10],
    paragraphs: [
      p(
        "p-34-1",
        "Safety interlocks protect workers and nuclear safety functions. Bypasses are exceptional and time-limited.",
      ),
      p(
        "p-34-2",
        "Temporary bypasses of safety interlocks may be authorized by the shift supervisor verbally.",
        "chg-05",
      ),
      p(
        "p-34-3",
        "Compensatory measures shall be established before a bypass is installed and removed when the bypass is cleared. The Bypass Log remains open until independent verification of restoration.",
      ),
    ],
  },
  {
    id: "sec-4.2",
    number: "4.2",
    title: "Radiation Work Permits",
    pages: [11, 12],
    paragraphs: [
      p(
        "p-42-1",
        "An approved Radiation Work Permit (RWP) is required before entry into radiologically controlled areas when work may result in occupational exposure above administrative thresholds.",
      ),
      p(
        "p-42-2",
        "Radiation work permits expire at the end of the calendar week in which they were issued.",
        "chg-06",
      ),
      p(
        "p-42-3",
        "Workers shall review the RWP, acknowledge radiological conditions, and don prescribed PPE before entry. Exit frisking shall follow Attachment E.",
      ),
    ],
  },
  {
    id: "sec-5.1",
    number: "5.1",
    title: "Occurrence Reporting and Closure",
    pages: [13],
    paragraphs: [
      p(
        "p-51-1",
        "Occurrences meeting DOE O 232.2A criteria shall be entered into ORPS within required timelines based on significance category.",
      ),
      p(
        "p-51-2",
        "Occurrence reports categorized as Significance Category 3 may be closed by the responsible manager without independent review.",
        "chg-07",
      ),
      p(
        "p-51-3",
        "Causal analysis depth shall be commensurate with significance. Apparent cause is the minimum for Category 3; root cause is required for Categories 1 and 2.",
      ),
    ],
  },
  {
    id: "sec-5.3",
    number: "5.3",
    title: "Critiques and Lessons Learned",
    pages: [14, 15],
    paragraphs: [
      p(
        "p-53-1",
        "Critiques shall be conducted for events with actual or potential adverse effects on nuclear safety, security, or mission-critical operations.",
      ),
      p(
        "p-53-2",
        "Lessons learned are optional attachments to critique packages.",
        "chg-08",
      ),
      p(
        "p-53-3",
        "Critique packages include timeline reconstruction, fact statements, immediate actions, and assigned follow-up owners with due dates.",
      ),
    ],
  },
  {
    id: "sec-6.2",
    number: "6.2",
    title: "Emergency Accountability",
    pages: [16, 17],
    paragraphs: [
      p(
        "p-62-1",
        "Emergency Accountability System headcounts may be deferred up to 30 minutes during severe weather if personnel remain sheltered in place.",
        "chg-09",
      ),
      p(
        "p-62-2",
        "Accountability wardens shall report missing persons immediately to the Emergency Operations Center. Search and rescue decisions are made by the Incident Commander.",
      ),
      p(
        "p-62-3",
        "Drill accountability shall be treated with the same rigor as actual emergencies. Critique findings from drills feed the emergency readiness assurance plan.",
      ),
    ],
  },
  {
    id: "sec-7.1",
    number: "7.1",
    title: "Quality Records Capture",
    pages: [18],
    paragraphs: [
      p(
        "p-71-1",
        "Completed work packages, RWPs, bypass authorizations, and critique packages are quality records when they provide evidence of nuclear safety or quality-affecting activities.",
      ),
      p(
        "p-71-2",
        "Quality records may be retained in local shared drives pending transfer to Records Management.",
        "chg-10",
      ),
    ],
  },
  {
    id: "sec-7.4",
    number: "7.4",
    title: "Procedure Change Identification",
    pages: [19],
    paragraphs: [
      p(
        "p-74-1",
        "Users shall verify they are working to the current revision via the EDMS controlled copy indicator before starting a job.",
      ),
      p(
        "p-74-2",
        "Procedure revision bars are optional for administrative changes.",
        "chg-11",
      ),
    ],
  },
  {
    id: "sec-8.2",
    number: "8.2",
    title: "Periodic Review and Document Control",
    pages: [20],
    paragraphs: [
      p(
        "p-82-1",
        "Document owners maintain a review schedule in EDMS. Overdue reviews are escalated to the Document Control Board.",
      ),
      p(
        "p-82-2",
        "This procedure is reviewed every five years or when a significant process change occurs, whichever is later.",
        "chg-12",
      ),
      p(
        "p-82-3",
        "Obsoleted revisions are retained per the site records schedule and clearly marked SUPERSEDED to prevent use.",
      ),
    ],
  },
];

export function sectionTitle(sectionId: string): string {
  const s = SECTIONS.find((x) => x.id === sectionId);
  return s ? `${s.number} ${s.title}` : sectionId;
}

export function cloneChanges(changes: DocChange[]): DocChange[] {
  return changes.map((ch) => ({ ...ch, doe: { ...ch.doe } }));
}
