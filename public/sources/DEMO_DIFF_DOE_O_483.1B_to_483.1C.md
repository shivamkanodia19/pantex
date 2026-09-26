# Demo LLM output — DOE O 483.1B Chg 3 → DOE O 483.1C

> **Demo artifact.** In the full product this file is what the **difference-identification LLM** would emit after ingesting two DOE order versions. The hackathon UI does **not** recompute this live — we ship the precomputed result so the presentation can show the pipeline without building the full RAG system.
>
> **Corpus note:** Supersession pair is **483.1B Chg 3 (10-28-2024)** → **483.1C (08-05-2026)**. Files live under `public/sources/`.

| Field | Value |
|---|---|
| Baseline | `DOE_O_483.1B_Chg3_CRADA.pdf` (100 pp, includes model CRADA attachments) |
| Incoming | `DOE_O_483.1C_CRADA.pdf` (15 pp, streamlined order + CRD) |
| Subject | DOE Cooperative Research and Development Agreements (CRADAs) |
| Match quality | strong (same Order family / same statutory basis 15 U.S.C. § 3710a) |
| Recommended action | review-site-procedures |

---

## Headline

DOE replaced the long-form 483.1B Chg 3 package with a shorter 483.1C that centers a **risk-based oversight framework** (delegated MSW / low-risk path vs elevated DOE review) and tightens statutory / contract-compliance language.

---

## Material deltas (LLM-style findings)

### 1. Purpose rewritten around statute + risk tiers
- **Before (483.1B):** Purpose emphasizes expediting CRADAs, leveraging DOE resources, fairness of opportunity, and public benefit / tech transfer goals.
- **After (483.1C):** Purpose cites **15 U.S.C. § 3710a** explicitly; requires compliance with listed authorities **and** the M&O / DEAR / FAR contract stack; introduces **governance vs. compliance** risk tiers (low-risk + MSW → contractor delegated authority; elevated risk → DOE review).
- **Suggested site action:** Update any Pantex / M&O CRADA desk guide that still quotes 483.1B purpose language; point reviewers to the new risk-tier language when approving CRADAs.

### 2. Document shape collapsed
- **Before:** ~100-page Order package including extensive model CRADA attachments and alternate clauses.
- **After:** ~15-page Order + Contractor Requirements Document; model / alternate-clause material is referenced rather than fully restated in the same footprint.
- **Suggested site action:** Treat attachment models in 483.1B as **historical**; confirm which model forms remain authoritative under 483.1C before citing them in local procedures.

### 3. Master Scope of Work (MSW) + delegated execution
- **483.1C** elevates MSW / prior DOE-approved scope as the gate for **contractor-level** approval of low-risk CRADAs and certain clause substitutions.
- **Suggested site action:** Map local CRADA SOPs to: (a) MSW-eligible path, (b) elevated-risk DOE review path. Flag any procedure that still requires full field-office packaging for every CRADA regardless of risk.

### 4. Protectable / CUI / FOIA handling still present, refreshed citations
- Both versions require export-control awareness and protection of proprietary / protectable information.
- **483.1C** explicitly ties marking/safeguarding to **DOE O 471.7 (CUI)** and FOIA / Trade Secrets citations in Requirements §4.d.
- **Suggested site action:** Cross-link site CUI marking guide (Rev. D / DOE O 471.7) from the CRADA procedure — same pattern as other DOE-order reviews in this demo.

### 5. Cancellation / supersession
- **483.1C** supersedes **483.1B** (including Chg 3). Existing contractual CRDs remain until the contract is modified (standard DOE cancellation language).
- **Suggested site action:** Version-stamp site documents that cite “DOE O 483.1B”; queue a controlled update to “DOE O 483.1C” with an applicability note for in-flight CRADAs.

---

## Example clause-level proposals (wireframe seed)

These mirror the shape of UI change cards — not a full page-by-page legal redline.

| ID | Before (site / B-era wording) | After (aligned to 483.1C) | Why |
|---|---|---|---|
| crada-01 | “CRADA activities follow DOE O 483.1B Chg 3 and local field-office packaging for all agreements.” | “CRADA activities follow DOE O 483.1C. Low-risk agreements using a DOE-approved Master Scope of Work may proceed under delegated contractor authority; elevated-risk agreements require DOE review per the Order.” | Risk-tier / MSW framework is the headline change in 483.1C Purpose §1.c. |
| crada-02 | “Protect collaborator proprietary data per site desk guidance.” | “Protect properly marked proprietary information and CRADA protectable information under applicable law, the facility contract, DOE O 471.7 (CUI), and FOIA/Trade Secrets constraints cited in DOE O 483.1C §4.” | 483.1C Requirements §4.d–e refresh the citation stack. |
| crada-03 | “Use the 483.1B model CRADA attachments as the default agreement text.” | “Use DOE-approved CRADA models and alternate clauses authorized under DOE O 483.1C; do not treat superseded 483.1B attachment text as controlling without confirmation.” | Package footprint / authority shift B→C. |

---

## Pipeline story (presentation)

```
[ DOE O 483.1B Chg 3 PDF ]     [ DOE O 483.1C PDF ]
            \                       /
             \                     /
              v                   v
         ingest + section hash (deterministic, cheap)
                       |
                       v
              LLM difference ID  ←── this file (demo: precomputed)
                       |
                       v
         change cards → Approve / Revert / Reword / Undo
```

Browsing Source Search never calls the model. Only “difference identification” (and optional Reword) is the expensive step — cached by content hash in the product pitch (`FUTURE_SCOPE.md`).

---

## Source files in repo

| File | Role |
|---|---|
| `public/sources/DOE_O_483.1B_Chg3_CRADA.pdf` | Baseline DOE order (official PDF) |
| `public/sources/DOE_O_483.1C_CRADA.pdf` | Incoming DOE order (official PDF) |
| `public/sources/DOE_O_483.1B_Chg3_CRADA.txt` | Extracted text (demo ingest) |
| `public/sources/DOE_O_483.1C_CRADA.txt` | Extracted text (demo ingest) |
| `public/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md` | This file — simulated LLM diff output |

Official origins:
- 483.1B Chg 3: https://www.energy.gov/documents/doe-cooperative-research-and-development-agreements
- 483.1C: https://www.energy.gov/media/364600
