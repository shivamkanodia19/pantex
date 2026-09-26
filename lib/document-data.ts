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

function p(id: string, text: string, changeId?: string): DocParagraph {
  return { id, text, changeId };
}

/**
 * Demo pipeline (precomputed — LLM not re-run at build time):
 *   DOE O 483.1B  +  DOE O 483.1C
 *        → diff (DEMO_DIFF_*.md)
 *        → look in new DOE (483.1C loci)
 *        → recommend edits in Pantex CD-0039
 */
export const DOCUMENT_META = {
  title: "CD-0039 — Integrated Safety Management Program (Incorporating WS&H)",
  revision: "Issue No. 001",
  docId: "CD-0039",
  owner: "PanTeXas Deterrence, LLC — Pantex Plant",
  totalPages: 54,
};

/** Seed recommendations derived from in-repo DOE O 483.1B→483.1C diff. */
export const SEED_CHANGES: DocChange[] = [
  c({
    id: "chg-01",
    sectionId: "sec-8",
    page: 49,
    lineStart: 1,
    lineCount: 3,
    oldText:
      "8.1 Governing Documents (a) https://webapps.cns.doe.gov/LinksMgr/linksMgr?docStatus=APPROVED&docType=C D&docNum=CD-0039 8.2 Authorizing Documents (a) DIR-0001, Roles and Responsibilities for Management and Operation of Pantex Plant 8.3 Related Documents (a) MNL-00040, Pantex Plant Conduct of Operations Manual (b) MNL-240176, Department of Energy Explosives Safety Standard Pantex/Lawrence Livermore National Laboratory Version (c) MNL-352313, Enforcement Coordination (d) MNL-352365, Pantex Training and Qualification Program (e) PD 02.01.07.01, Process for the Explosives Safety Program 8.4 Records Records generated during the course of following this procedure shall be maintained in accordance with MNL-352355, Records Management.",
    proposedText:
      "8.3 Related Documents \u2014 add: (f) DOE O 483.1C, DOE Cooperative Research and Development Agreements (supersedes DOE O 483.1B Chg 3). Use 483.1C when collaborative R&D / CRADA-like work with non-federal parties is in scope.",
    summary: "Cite DOE O 483.1C (not B) in Related Documents for CRADA / collaborative R&D.",
    reasoning:
      "Pipeline: DOE B\u2192C diff shows 483.1C supersedes 483.1B. New Order cancellation language \u2192 look in 483.1C header/supersession \u2192 CD-0039 \u00a78 Related Documents currently omits the CRADA order; add 483.1C so ISM flow-down points at the current DOE authority.",
    doe: {
      citation: "DOE O 483.1C \u2014 Cancels/Supersedes 483.1B",
      excerpt:
        "483.1C supersedes DOE O 483.1B (including Chg 3). Site implementing documents that cite 483.1B should be version-stamped to 483.1C with an applicability note for in-flight agreements.",
      requirementId: "DOE-483.1C-SUPERSEDE",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
  c({
    id: "chg-02",
    sectionId: "sec-5.5.15",
    page: 40,
    lineStart: 1,
    lineCount: 4,
    oldText:
      "(a) Requirements Flow-Down There are several different types of requirements that flow down via the subcontracting process. Terms and Conditions are those standard business rules incorporated into the \u201cboilerplate\u201d legal requirements governing the business relationship between PXD and its subcontractors.",
    proposedText:
      "For collaborative R&D / CRADA-like work with non-federal parties, flow-down shall follow DOE O 483.1C: low-risk work using a DOE-approved Master Scope of Work may proceed under delegated contractor authority; elevated-risk work requires DOE review. Standard commercial service subcontracts continue under existing ES&H flow-down.",
    summary: "Add risk-tier / MSW path for collaborative non-federal work (from 483.1C).",
    reasoning:
      "Pipeline: B\u2192C diff flags Purpose \u00a71.c risk tiers (MSW/low-risk delegated vs elevated DOE review). Look in 483.1C \u00a71.c \u2192 map onto CD-0039 subcontract requirements flow-down so collaborative R&D packages are graded, not one-size field-office packaging.",
    doe: {
      citation: "DOE O 483.1C \u00a71.c \u2014 Risk-based oversight (MSW / delegated)",
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
    lineStart: 3,
    lineCount: 3,
    oldText:
      "Requirement flow-down, from the Prime Contract to implementing management and control documents, is through the BRAIN. The level of the hazard dictates the level of formality used to analyze the hazards and to establish controls.",
    proposedText:
      "When work includes collaborative research and development with non-federal parties, the agreed-upon standards set shall include DOE O 483.1C (CRADAs). Do not cite superseded DOE O 483.1B Chg 3 attachment models as controlling without confirmation against 483.1C.",
    summary: "Include DOE O 483.1C in the agreed-upon standards set when CRADA work applies.",
    reasoning:
      "Pipeline: B\u2192C diff collapses the Order package and refreshes controlling text in 483.1C. Look in 483.1C Purpose + Requirements \u2192 CD-0039 GP 5 (Identification of Safety Standards) must list the current CRADA Order when collaborative R&D is in the work package.",
    doe: {
      citation: "DOE O 483.1C \u2014 Purpose / Requirements (current CRADA Order)",
      excerpt:
        "483.1C establishes DOE policy requirements and oversight for CRADAs under 15 U.S.C. \u00a7 3710a and replaces the long-form 483.1B Chg 3 package. Site standards identification should point to the current Order.",
      requirementId: "DOE-483.1C-PURPOSE",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
  c({
    id: "chg-04",
    sectionId: "sec-3",
    page: 10,
    lineStart: 4,
    lineCount: 3,
    oldText:
      "Recognizing these principles and functions apply to all work, implementation is flexible and tailored to the complexity of the specific work and the severity of the associated hazards and environmental risks. ISM is applicable to all work performed by PXD employees. ISM is also applicable to PXD subcontractors to the extent that such requirements are incorporated into subcontractor contract documents.",
    proposedText:
      "ISM is applicable to all work performed by PXD employees and to PXD subcontractors to the extent requirements are incorporated in their contracts. Collaborative R&D / CRADA-like engagements with non-federal parties additionally follow DOE O 483.1C oversight (risk-tiered MSW or DOE review) as flowed into the applicable agreement.",
    summary: "Clarify ISM applicability to collaborative R&D partners under 483.1C.",
    reasoning:
      "Pipeline: B\u2192C diff emphasizes M&O/DEAR/FAR contract compliance for CRADA activities. Look in 483.1C Purpose \u00a71.b \u2192 CD-0039 Strategy language on subcontractors should note that collaborative R&D partners follow 483.1C oversight in addition to ISM flow-down.",
    doe: {
      citation: "DOE O 483.1C \u00a71.b \u2014 Contract / DEAR-FAR compliance",
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
    lineCount: 4,
    oldText:
      "Federal regulation 48 CFR 970.5223-1, Integration of Environment, Safety, and Health into Work Planning and Execution, requires DOE contractors to establish an ISM System. This regulation also requires contractors to follow ISM GPs and CFs, and to describe their approach for implementing and tailoring an ISM Program to their sites and activities.",
    proposedText:
      "Section 7 BRAIN flow-down establishes implementing documents for ISM/WS&H requirements (including 10 CFR 851 functional areas). When collaborative R&D / CRADA-like work is authorized, the flow-down set shall include DOE O 483.1C requirements for protectable information, export-control awareness, and risk-tiered approval paths.",
    summary: "Point BRAIN / standards flow-down at current DOE O 483.1C when CRADA requirements apply.",
    reasoning:
      "Pipeline: B\u2192C diff shows protectable-info / export-control citations refreshed in 483.1C \u00a74. Look in 483.1C Requirements \u00a74.d\u2013e \u2192 CD-0039 \u00a74 Requirements / BRAIN flow-down should acknowledge 483.1C as a DOE Order that may flow when collaborative R&D is authorized.",
    doe: {
      citation: "DOE O 483.1C \u00a74.d\u2013e \u2014 Protectable info / proprietary data",
      excerpt:
        "Export control reviews and protection of properly marked proprietary / protectable information apply to CRADA activities; 483.1C ties safeguarding to CUI / FOIA / Trade Secrets authorities alongside the facility contract.",
      requirementId: "DOE-483.1C-4d",
      url: "/sources/DOE_O_483.1C_CRADA.pdf",
    },
  }),
];

export const SECTIONS: DocSection[] = [
  {
    id: "sec-1",
    number: "1",
    title: "Purpose",
    pages: [9],
    paragraphs: [
      p("p-sec-1-1", "On November 1, 2024, after approximately a four-month contract transition with Consolidated Nuclear Security, LLC., PXD officially became the sole management and operating contractor for the Pantex Plant under contract number 89233224CNA000004."),
      p("p-sec-1-2", "This new, initial issue, document describes PXD\u2019s consolidated Integrated Safety Management (ISM)/ Worker Safety and Health (WS&H) Program (hereinafter referred to as the Pantex ISM/WS&H Program)."),
      p("p-sec-1-3", "This document, in addition to the documents contained in the flow-down report in Section 7, implements the applicable requirements of 48 CFR 970.5223-1, Integration of Environment, Safety, and Health Into Work Planning and Execution; and 10 CFR 851, Worker Safety and Health Program."),
      p("p-sec-1-4", "The Pantex ISM/WS&H Program represents the overall umbrella for integrating and managing Environment, Safety, and Health (ES&H) requirements and is a standards-based system consistent with the ISM/WS&H policies, rules, orders, manuals, and standards (simply referred to as standards) that are applicable to Department of Energy (DOE)/NNSA sites."),
      p("p-sec-1-5", "The implementation of these standards enables PXD to conduct work in a manner that ensures protection of its workers, the public, and the environment."),
    ],
  },
  {
    id: "sec-2",
    number: "2",
    title: "Scope",
    pages: [9, 10],
    paragraphs: [
      p("p-sec-2-1", "The Pantex ISM/WS&H Program infrastructure includes site-level programs that prescribe the processes for business and program management, prioritization and allocation of resources, budget and cost management, identification of DOE/NNSA requirements and regulations, and specific ES&H management programs, procedures, and requirements (including waste management and pollution prevention) at the site, facility, and activity/task levels."),
      p("p-sec-2-2", "Pantex is currently a \u201ccovered workplace\u201d as defined by 10 Code of Federal Regulations (CFR) 851.3(a), \u201ca place at a DOE site where a contractor is responsible for performing work in furtherance of a DOE mission.\u201d At the site level, the NNSA\u2019s Pantex Field Office (PFO) is responsible for federal management and oversight."),
      p("p-sec-2-3", "The requirements of 10 CFR 851 do not apply to the following: \u2022 Work at a DOE site that is regulated by Occupational Safety and Health Administration (OSHA) [10 CFR 851.2(a)(1)]. \u2022 Work at a DOE site that is operated under the authority of the Director, Naval Nuclear Propulsion, pursuant to Executive Order 12344, as set forth in Public Law 98\u2013525, 42 U.S.C. 7158 note [10 CFR 851.2(a)(2)]. \u2022 Radiological hazards (to the extent regulated by 10 CFR Part 20 and 835) or nuclear explosives operations (to the extent regulated by 10 CFR Parts 820 and 830) [10 CFR 851.2(b)]. \u2022 Transportation to or from a DOE site [10 CFR 851.2(c)]."),
      p("p-sec-2-4", "\u2022 Activities by employees of other federal, state, or local government agencies; or government corporations (e.g., Department of Defense [DOD], Army Corps of Engineers.) except when covered by a coordination agreement, memorandum, or equivalent. \u2022 Site visitors, students, visiting scientists, and others not under contract with PXD. \u2022 PXD work activities not performed on a DOE/NNSA owned, leased, or controlled site. \u2022 Construction and maintenance of facilities on property deeded by DOE/NNSA to third parties (e.g., the John C."),
      p("p-sec-2-5", "In addition, the following site activities are not covered by 10 CFR 851 but are subject to the safety and health requirements (including ISM) implemented in the applicable terms and conditions of their contract(s) with PXD: \u2022 Activities by subcontractors that are providing operation and maintenance services for commercial items (e.g., X-ray technicians, machine tool technicians, fax/copier technicians, repair services for equipment under warranty, training activities for equipment operation). \u2022 Activities by vendors or suppliers coming on-site who do not have service contracts and who engage in no more than incidental work relating to delivery, installation or repair of the products provided."),
    ],
  },
  {
    id: "sec-3",
    number: "3",
    title: "Strategy",
    pages: [10, 11],
    paragraphs: [
      p("p-sec-3-1", "This document identifies and establishes the organizations, roles, and responsibilities for implementation of the ISM program. Line management incorporates ISM guiding principles (GPs) and core functions (CFs) into process documents, work instructions, manuals, or other management-controlled documents that impact the safety of the site, facilities, or work tasks."),
      p("p-sec-3-2", "Recognizing these principles and functions apply to all work, implementation is flexible and tailored to the complexity of the specific work and the severity of the associated hazards and environmental risks. ISM is applicable to all work performed by PXD employees. ISM is also applicable to PXD subcontractors to the extent that such requirements are incorporated into subcontractor contract documents.", "chg-04"),
      p("p-sec-3-3", "The contract between PXD and the subcontractor will contain specific contract scope, applicable worker safety and health requirements, and other terms and conditions. Unless otherwise specified in contractual documents, PXD subcontractors working on-site will work under the WS&H program requirements established in this document."),
      p("p-sec-3-4", "PXD strives to provide a place of employment that is free from recognized hazards that have the potential to cause injury, illness, serious physical harm, or death to workers and ensures that work is performed in accordance with applicable requirements of 10 CFR 851, including any compliance order issued by the Secretary pursuant to 10 CFR 851.4."),
      p("p-sec-3-5", "WS&H Program requirements apply to all PXD activities and operations including design, construction, operation, maintenance, decontamination and decommissioning, research and development, and environmental restoration activities at Pantex. Activities and operations conducted by PXD personnel in leased and other off-site facilities will be in accordance with this"),
      p("p-sec-3-6", "WS&H program (e.g., the Pantex Amarillo Campus, Palo Duro Research Center, Nuclear Incident Response Program [NIRP]). One of the integral components of the environmental programs at Pantex is the Pantex Environmental Management System (EMS). The EMS is based on International Organization for Standardization (ISO) 14001, Environmental Management Systems-Requirements with Guidance for Use."),
      p("p-sec-3-7", "The EMS has been integrated into the ISM program. To integrate requirements of ISO 14001, EMS objectives/targets for continual improvement are established on an annual basis."),
      p("p-sec-3-8", "These continual improvement goals are reviewed and approved by site management to ensure they are consistent with company commitments contained in the strategic plan and PXD\u2019s commitment to environmental stewardship as reflected in ES&H policies."),
    ],
  },
  {
    id: "sec-4",
    number: "4",
    title: "Requirements",
    pages: [11],
    paragraphs: [
      p("p-sec-4-1", "Federal regulation 48 CFR 970.5223-1, Integration of Environment, Safety, and Health into Work Planning and Execution, requires DOE contractors to establish an ISM System. This regulation also requires contractors to follow ISM GPs and CFs, and to describe their approach for implementing and tailoring an ISM Program to their sites and activities.", "chg-05"),
      p("p-sec-4-2", "Federal regulation 10 CFR 851, Worker Safety and Health Program, requires DOE contractors to provide a written WS&H Program that describes how the contractor will integrate all applicable requirements of the rule with other related site-specific worker protection activities and with their ISM program."),
      p("p-sec-4-3", "Section 7 contains a link to a flow-down report from the Business Requirements and Instruction Network (BRAIN) that establishes the implementing documents for the applicable Pantex ISM/WS&H Program requirements, including the applicable functional areas cited in 10 CFR 851.24 and 10 CFR 851, Appendix A. The flow-down report is intentionally established as a separately maintained and updated document."),
      p("p-sec-4-4", "Updates to this flow-down report do not require notification and/or submittal to PFO for review or approval."),
    ],
  },
  {
    id: "sec-5.2.1",
    number: "5.2.1",
    title: "GP 1 \u2013 Line Management Responsibility for Safety",
    pages: [12, 13],
    paragraphs: [
      p("p-sec-5.2.1-1", "5.2.1 GP 1 \u2013 Line Management Responsibility for Safety \u201cLine management is responsible for the protection of the public, the workers, and the environment.\u201d (a) Contractor Assurance System (CAS) The PXD CAS helps provide Pantex customers, partners, employees, corporate parents, and the DOE/NNSA with assurance of mission success demonstrated by safety, quality assurance, security, project management, and operational business excellence achieved by: \u2022 A culture that stresses safety, quality, security, and performance excellence. \u2022 Well-defined requirement identification, adoption, and implementation processes. \u2022 Functional area improvements driven by appropriate performance metrics, self-assessments, effective corrective actions, and continuous feedback and improvement activities. \u2022 Graded and integrated risk management processes applied to site activities. \u2022 Metrics focused on essential parameters used to identify areas needing management attention. \u2022 Identifying and addressing program and performance deficiencies and opportunities for improvement. \u2022 Providing the means and requirements to report deficiencies to the responsible managers and authorities. \u2022 Sharing lessons learned across all aspects of operations. \u2022 Transparency with stakeholders, employees, PFO, parent companies, and other involved entities."),
      p("p-sec-5.2.1-2", "Results are communicated to provide assurance that business functions are performing in accordance with contractual, corporate, and legal requirements and expectations, deficiencies are recognized and resolved in a timely manner, and continuous improvement efforts are consistently focused on key processes."),
      p("p-sec-5.2.1-3", "An effective CAS results in a complementary and supportive relationship between PFO and PXD that allows both to focus limited resources on higher risk facilities and activities while retaining confidence that lower risk facilities and activities meet or exceed levels of satisfactory performance. It is"),
      p("p-sec-5.2.1-4", "supported by quantifiable data and is designed to be consistent with the hazards and the risks associated with the work performed. (b) Management Responsibility Line management is responsible for integrating ISM principles into all work and assuring active and effective communication between all levels of the workforce."),
      p("p-sec-5.2.1-5", "The management team is committed to conducting work safely and securely and recognizes that line management responsibility; accountability, robust management systems, and worker involvement are the key elements to an effective ISM program."),
      p("p-sec-5.2.1-6", "All levels of management and each worker are ultimately responsible for working safely and securely; and for the protection of the public, the environment, and DOE/NNSA assets (information and property). PXD is committed to providing a safe and hazard free workplace for employees and to protect the public and the environment."),
      p("p-sec-5.2.1-7", "Use of ISM to consistently instill PXD values in diverse work activities requires a tailored ISM program. ISM was designed to be implemented based on the hazards and risks associated with specific facilities and operations. Implementation of ISM focuses on clearly establishing line management\u2019s responsibility and accountability for safety."),
      p("p-sec-5.2.1-8", "This responsibility is accomplished through a well-defined organizational structure and by including specific roles and responsibilities of managers in the procedures that implement ISM. Senior management is responsible for providing policy and strategic planning support, ensuring that the work scope and budget process incorporate ISM principles, and oversee and guide implementation of ISM."),
      p("p-sec-5.2.1-9", "Supervisors, organizational managers, and senior managers are held accountable for safety and health performance and the communication of safety and health rules for all employees. Safety responsibilities are understood and accepted by line managers as integral to mission accomplishment."),
      p("p-sec-5.2.1-10", "Managers clearly understand their work activities and performance objectives, and how to safely conduct their work activities to accomplish their performance objectives. Managers demonstrate their commitment to safety through their actions and behaviors, and support the organization in successfully implementing safety culture attributes by conducting inspections and surveillances of work areas and equipment."),
      p("p-sec-5.2.1-11", "Work areas are inspected regularly using a risk-based approach to identify potentially hazardous conditions or work practices and to ensure expectations are being met regarding compliance with established requirements."),
    ],
  },
  {
    id: "sec-5.2.5",
    number: "5.2.5",
    title: "GP 5 \u2013 Identification of Safety Standards and Requirements",
    pages: [17],
    paragraphs: [
      p("p-sec-5.2.5-1", "5.2.5 GP 5 \u2013 Identification of Safety Standards and Requirements \u201cBefore work is performed, the associated hazards are evaluated and an agreed-upon set of safety standards and requirements is established which, if properly implemented, will provide adequate assurance that the workers, the public, and the environment are protected from adverse consequences.\u201d Safety standards and requirements are flowed into contractual agreements."),
      p("p-sec-5.2.5-2", "Requirement flow-down, from the Prime Contract to implementing management and control documents, is through the BRAIN. The level of the hazard dictates the level of formality used to analyze the hazards and to establish controls.", "chg-03"),
      p("p-sec-5.2.5-3", "Design and construction workflow processes include steps to initiate applicable hazard evaluation processes to provide the analysis of designs of new facilities and modifications to existing facilities and equipment for potential workplace hazards (10 CFR 851.21). Design Project Teams and construction workflow processes include steps to incorporate controls from applicable hazards evaluations."),
      p("p-sec-5.2.5-4", "Safety and health professionals verify that the designs comply with the safety requirements (i.e., Safety Basis documents; industrial hazards analyses; and other aspects of the ES&H Program). The number and rigor of Design Reviews vary depending on project size and complexity. These processes define the boundaries for safe and environmentally responsible operation of a work-activity."),
      p("p-sec-5.2.5-5", "Based on the identified hazards, the level of formality and complexity of a work activity\u2019s safety analysis process is directly related to the level of hazardous inventories and operations present. As the hazards and risks associated with a work activity increase, the formality, documentation, and general level of effort increase. This concept is known as the \u201cgraded approach.\u201d"),
    ],
  },
  {
    id: "sec-5.2.6",
    number: "5.2.6",
    title: "GP 6 \u2013 Hazard Controls Tailored to Work Being Performed",
    pages: [18],
    paragraphs: [
      p("p-sec-5.2.6-1", "5.2.6 GP 6 \u2013 Hazard Controls Tailored to Work Being Performed \u201cAdministrative and engineering controls to prevent and mitigate hazards are tailored to the work being performed and associated hazards.\u201d Refer to CFs 2 and 3 in Section 5.3 for information regarding established processes for identification and analysis of hazards, and determination of appropriate controls."),
    ],
  },
  {
    id: "sec-5.5.5",
    number: "5.5.5",
    title: "Stop Work Authority",
    pages: [34, 35],
    paragraphs: [
      p("p-sec-5.5.5-1", "All PXD employees and subcontractors have pause work/stop work authority and pause work/stop work responsibility if they observe any condition that adversely impacts safety, security or quality. Employees and subcontractors are encouraged"),
      p("p-sec-5.5.5-2", "and expected to exercise pause work or stop work authority in a responsible manner when conditions warrant without fear of punishment or retaliation."),
      p("p-sec-5.5.5-3", "Employees and subcontractors have the authority to stop any operation or activity that has actual or potential unsafe working conditions, actual or potential violation of standards or regulations, causes or has potential to cause environmental damage, or produces a deficiency in the quality of production. Site level procedures establish the stop work process. 5.5.6"),
    ],
  },
  {
    id: "sec-5.5.6",
    number: "5.5.6",
    title: "Worker Rights and Responsibilities",
    pages: [35],
    paragraphs: [
      p("p-sec-5.5.6-1", "Workers have the right to work in an environment free from recognized hazards likely to cause serious injury or death. PXD believes that accidents are preventable through attention to hazards and appropriate action by each individual and the responsible organization. As such, it is paramount that workers be informed of their rights relative to 10 CFR 851 and associated OSHA standards."),
      p("p-sec-5.5.6-2", "PXD posts the DOE-designed Worker Protection Posters in various work spaces to make worker rights, as delineated in 10 CFR 851, accessible to all workers. Worker Safety and Health information is available on internal webpages. PXD informs workers of their rights and responsibilities by various means including training, briefings, other safety documents, and the Worker Protection for DOE Contractor Employees poster."),
      p("p-sec-5.5.6-3", "PXD employees are required to comply with the requirements of 10 CFR 851 as well as the Pantex ISM/WS&H Program. In addition, it is the right and responsibility of PXD employees to actively participate in the planning of work activities, as appropriate, to ensure their knowledge and experience improves work performance, and to pause or stop activities."),
      p("p-sec-5.5.6-4", "Every PXD employee is directly responsible for assuring his or her own safety. As such, worker involvement is an essential part of the Pantex ISM/WS&H Program."),
    ],
  },
  {
    id: "sec-5.5.15",
    number: "5.5.15",
    title: "Subcontract Strategy \u2014 Requirements Flow-Down",
    pages: [40, 41],
    paragraphs: [
      p("p-sec-5.5.15-1", "(a) Requirements Flow-Down There are several different types of requirements that flow down via the subcontracting process. Terms and Conditions are those standard business rules incorporated into the \u201cboilerplate\u201d legal requirements governing the business relationship between PXD and its subcontractors.", "chg-02"),
      p("p-sec-5.5.15-2", "The Statement of Work (SOW), technical specifications, engineering data sheets, and other technical documents are requirements of the contract. The standard terms and conditions are contractually binding and delineate corporate and personnel safety roles and responsibilities of PXD subcontractors at all tiers."),
      p("p-sec-5.5.15-3", "(b) Construction and Service Subcontracts For construction subcontracts, site specific procedures are in place to establish and flow down the applicable ES&H requirements to subcontractors. Project specific ES&H requirements are incorporated in the SOW and Division 1 specifications."),
      p("p-sec-5.5.15-4", "ES&H requirements for service subcontracts are implemented through a graded approach dependent on the level of hazard and job complexity. The Pantex ES&H organization reviews the work scope and the identified hazards for each subcontract, in accordance with ES&H requirements, and determines the applicable ES&H requirements for the subcontractor work activity."),
      p("p-sec-5.5.15-5", "The requirement that the subcontractor flow down their ES&H requirements to their subcontracts (at any tier) to the extent necessary to ensure compliance with the specified ES&H requirements is included in the Safety and Health clause in the standard terms and conditions of subcontracts."),
      p("p-sec-5.5.15-6", "(c) Implementation of Subcontractor Occupational Medicine Requirements The occupational medicine requirements of 10 CFR 851 apply to subcontractors (at any tier) for workers who are on a DOE site more than 30 days in a rolling calendar year or are enrolled for any length of time in a"),
      p("p-sec-5.5.15-7", "medical or exposure monitoring program required by this rule and/or any other applicable Federal, State or local regulation."),
      p("p-sec-5.5.15-8", "(See Section 2 for additional work activities and scope excluded from 10 CFR 851 requirements). 10 CFR 851.10 requires that the contractors' Worker Safety and Health Program describe how the contractor will comply with the requirements of the regulation (including the occupational medicine requirements) that are applicable to the hazards within their scope of work."),
      p("p-sec-5.5.15-9", "PXD requires subcontractors to comply with all OSHA medical surveillance requirements, based on the subcontractors\u2019 scope of work, and the OSHA requirements for the treatment of illnesses and injuries. Subcontractors are also subject to the occupational medical requirements for DOE approved Beryllium programs."),
      p("p-sec-5.5.15-10", "PXD\u2019s occupational medicine program provides services to subcontract employees who are placed in the Human Reliability Program (HRP). In addition, subcontractors may be provided appropriate triage and stabilization before they are transported to an off-site medical facility."),
      p("p-sec-5.5.15-11", "PXD requires, through Request for Proposals, contract terms and conditions, and special requirements, that all subcontractors performing work at Pantex, at any tier, have an occupational medicine program under the direction of a licensed physician meeting the credential requirements of 10 CFR 851 Appendix A.8 (b) and personnel providing health services meeting the credential requirements of 10 CFR 851 Appendix A.8(c)."),
      p("p-sec-5.5.15-12", "A written description of the subcontractor's occupational medicine program including proof of staff credentials is required for each applicable subcontract for work at Pantex, and must be submitted upon request. Each subcontractor's occupational medicine program contents are to be determined by its occupational medicine provider and based on the subcontractor's scope of work and associated hazards."),
      p("p-sec-5.5.15-13", "As discussed in DOE G 440.1-1B, the term \"comprehensive\" in 10 CFR 851 Appendix A, Section 8(a) refers to the specific services that the occupational medicine provider determines are appropriate, considering the specific work activities performed by the worker and are necessary for the occupational medicine program to be consistent with DOE requirements, e.g., respiratory protection, and substance-specific standards."),
      p("p-sec-5.5.15-14", "The guide also states that all possible services identified in the rule are not necessary for all workers."),
      p("p-sec-5.5.15-15", "In terms of PXD\u2019s subcontractors where the required occupational medicine services are provided by, managed, and administered by the subcontractor\u2019s occupational medicine provider, compliance with the 10 CFR 851 Appendix A.8 requirements will be the responsibility of the subcontractor and/or the subcontractor\u2019s occupational medicine provider."),
      p("p-sec-5.5.15-16", "PXD\u2019s Occupational Medical Director (OMD) is available to provide assistance to the subcontractor\u2019s OMD (or equivalent) regarding determination of the appropriate occupational medicine services based on work scope and hazards. PXD\u2019s OMD may also provide support where a subcontractor\u2019s OMD (or equivalent) is prohibited from accessing an area (due to security requirements) to evaluate job conditions and issues."),
    ],
  },
  {
    id: "sec-6",
    number: "6",
    title: "ISM Feedback and Improvement Processes",
    pages: [42],
    paragraphs: [
      p("p-sec-6-1", "A wide range of programs exist to meet the ISM CF regarding feedback and improvement. Mechanisms for determining system effectiveness include assessments, performance measurements, and Federal oversight feedback."),
      p("p-sec-6-2", "The assessment program, lessons learned program, event recovery and notification process, critiques, occurrence reporting, incidents of security concerns, and various oversight programs, provide mechanisms/tools by which line management and workers learn from previous mistakes or feedback from those involved on how work might be accomplished better, more efficiently, and/or more cost effectively in a safe and secure environment."),
      p("p-sec-6-3", "Monitoring and feedback includes provisions for performance measurement, problem identification, and problem prevention. Fact Findings, Critiques, and Causal Analysis processes are used to evaluate abnormal events to identify areas that may require improvement in processes, procedures, equipment, training and qualification, and/or organizational management systems."),
      p("p-sec-6-4", "Programmatic issues are captured by the issues management system and assigned for disposition. This system is used to assure corrective actions and improvement activities are established and completed. Causes of process anomalies are determined and resolved at a level corresponding to the risk encountered to prevent recurrence. Controls are applied to assure corrective actions are complete and effective."),
    ],
  },
  {
    id: "sec-8",
    number: "8",
    title: "Document References",
    pages: [49],
    paragraphs: [
      p("p-sec-8-1", "8.1 Governing Documents (a) https://webapps.cns.doe.gov/LinksMgr/linksMgr?docStatus=APPROVED&docType=C D&docNum=CD-0039 8.2 Authorizing Documents (a) DIR-0001, Roles and Responsibilities for Management and Operation of Pantex Plant 8.3 Related Documents (a) MNL-00040, Pantex Plant Conduct of Operations Manual (b) MNL-240176, Department of Energy Explosives Safety Standard Pantex/Lawrence Livermore National Laboratory Version (c) MNL-352313, Enforcement Coordination (d) MNL-352365, Pantex Training and Qualification Program (e) PD 02.01.07.01, Process for the Explosives Safety Program 8.4 Records Records generated during the course of following this procedure shall be maintained in accordance with MNL-352355, Records Management.", "chg-01"),
      p("p-sec-8-2", "Contact Records Analyst for retention requirements before dispositioning any records listed below."),
      p("p-sec-8-3", "(a) Flow-down report from the BRAIN (b) Monthly ISM SPOMCs reports (c) Notification to applicable Union Officers and designated representatives of updates and revisions to the Pantex WS&H program (d) Submittal of applicable closure facility hazards (e) Transmittal of the Pantex ISM/WS&H program for Federal review and approval (f) Transmittal of effectiveness declaration for the Pantex ISM program (g) Transmittal proposing Pantex ISM SPOMCs for Federal review and approval"),
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
