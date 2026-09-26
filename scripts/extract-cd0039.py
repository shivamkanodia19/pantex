#!/usr/bin/env python3
"""Extract CD-0039 PDF into lib/generated/cd-0039-body.json (full sectioned body)."""

from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "public/sources/CD-0039_PXD_Integrated_Safety_Management_Program.pdf"
OUT = ROOT / "lib/generated/cd-0039-body.json"

HEADER_RE = re.compile(
    r"UNCLASSIFIED\s+Index No\. CD-0039\s+Page No\. \d+ of 54\s+Issue No\. 001\s+"
    r"Integrated Safety Management Program\s+Incorporating Worker Safety and Health"
    r"(?: Program)? Requirements\s+UNCLASSIFIED\s*",
    re.I,
)

TOC_TITLES = {
    "INTRODUCTION": "Introduction",
    "1": "Purpose",
    "2": "Scope",
    "3": "Strategy",
    "4": "Requirements",
    "5": "Interfaces / Roles and Responsibilities",
    "5.1": "ISM Program Overview — Guiding Principles and Core Functions",
    "5.2": "ISM Guiding Principles",
    "5.2.1": "GP 1 — Line Management Responsibility for Safety",
    "5.2.2": "GP 2 — Clear Roles and Responsibilities",
    "5.2.3": "GP 3 — Competence Commensurate with Responsibilities",
    "5.2.4": "GP 4 — Balanced Priorities",
    "5.2.5": "GP 5 — Identification of Safety Standards and Requirements",
    "5.2.6": "GP 6 — Hazard Controls Tailored to Work Being Performed",
    "5.2.7": "GP 7 — Operations Authorization",
    "5.3": "ISM Core Functions",
    "5.3.1": "CF-1 — Define the Scope of the Work",
    "5.3.2": "CF-2 — Identify and Analyze the Hazards",
    "5.3.3": "CF-3 — Develop and Implement Hazard Controls",
    "5.3.4": "CF-4 — Perform Work within Controls",
    "5.3.5": "CF-5 — Provide Feedback and Continuous Improvement",
    "5.4": "Integration of Core Functions at Each Level of Work",
    "5.4.1": "Site Level",
    "5.4.2": "Facility Level",
    "5.4.3": "Activity / Task Level",
    "5.5": "Implementation of 10 CFR 851 Requirements",
    "5.5.1": "Coordination with Other DOE Contractors",
    "5.5.2": "Closure Facilities",
    "5.5.3": "Bargaining Unit Organizations",
    "5.5.4": "Worker Involvement",
    "5.5.5": "Stop Work Authority",
    "5.5.6": "Worker Rights and Responsibilities",
    "5.5.7": "Participating on Official Time",
    "5.5.8": "Access to Information",
    "5.5.9": "Observation and Notification of Monitoring Results",
    "5.5.10": "Accompany Inspections",
    "5.5.11": "Raising / Reporting / Resolving Worker Concerns",
    "5.5.12": "Refusal to Work",
    "5.5.13": "Functional Areas",
    "5.5.14": "Training and Qualification Program",
    "5.5.15": "Subcontract Strategy",
    "5.5.16": "Enforcement",
    "6": "ISM Feedback and Improvement Processes",
    "6.1": "System to Conduct Routine Inspections",
    "6.2": "Assessments",
    "6.3": "Feedback and Improvement Reports",
    "6.4": "Senior Management Initiatives",
    "6.5": "Culture",
    "6.6": "Safety-Conscious Work Environment",
    "6.7": "Performance Measurement",
    "6.8": "Safety Programs",
    "6.9": "Operating Experience Initiatives",
    "6.10": "Injury and Illness Trending",
    "6.11": "Incident Investigations",
    "6.12": "Radiological Exposure Analysis",
    "6.13": "Environmental Program Improvement",
    "6.14": "Risk Management Process",
    "6.15": "Federal Oversight",
    "7": "Implementing Elements",
    "8": "Document References",
    "8.1": "Governing Documents",
    "8.2": "Authorizing Documents",
    "8.3": "Related Documents",
    "8.4": "Records",
    "9": "Appendices",
    "A": "Annual Review and Notification Process",
    "B": "Workplace Safety and Health Requirements",
    "C": 'Pantex "OSHA+" Implementation',
}

# Demo change cards → paragraph ids in the extracted body
CHANGE_ATTACH = {
    "chg-01": "p-sec-8.3-1",
    "chg-02": "p-sec-5.5.15-4",
    "chg-03": "p-sec-5.2.5-1",
    "chg-04": "p-sec-3-2",
    "chg-05": "p-sec-4-1",
}


def main() -> None:
    reader = PdfReader(str(PDF))
    chunks: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages):
        raw = (page.extract_text() or "").replace("\u00a0", " ")
        text = HEADER_RE.sub("", raw)
        text = re.sub(r"^\s*UNCLASSIFIED\s*", "", text)
        text = re.sub(r"\s*UNCLASSIFIED\s*$", "", text).strip()
        if text:
            chunks.append((i + 1, text))

    parts: list[str] = []
    page_at: list[tuple[int, int, int]] = []
    offset = 0
    for page_no, text in chunks:
        if offset:
            parts.append("\n\n")
            offset += 2
        start = offset
        parts.append(text)
        offset += len(text)
        page_at.append((start, offset, page_no))
    linear = "".join(parts)

    def page_for(pos: int) -> int:
        for a, b, page_no in page_at:
            if a <= pos < b:
                return page_no
        return page_at[-1][2]

    starts: list[tuple[str, str, int]] = []
    m = re.search(r"(?m)^INTRODUCTION\b", linear)
    if m:
        starts.append(("INTRODUCTION", TOC_TITLES["INTRODUCTION"], m.start()))

    for m in re.finditer(r"(?m)^(\d+(?:\.\d+)*)\.?\s+(\S[^\n]{0,160})", linear):
        num = m.group(1)
        line = m.group(0)
        if "..." in line or "…" in line:
            continue
        if num in TOC_TITLES:
            starts.append((num, TOC_TITLES[num], m.start()))

    for m in re.finditer(r"(?m)^APPENDIX\s+([ABC])\b", linear, re.I):
        letter = m.group(1).upper()
        starts.append((letter, TOC_TITLES[letter], m.start()))

    filtered: list[tuple[str, str, int, int]] = []
    seen: set[str] = set()
    for num, title, pos in sorted(starts, key=lambda x: x[2]):
        page_no = page_for(pos)
        if page_no < 8 or num in seen:
            continue
        seen.add(num)
        filtered.append((num, title, pos, page_no))

    sections = []
    for i, (num, title, pos, page_no) in enumerate(filtered):
        end = filtered[i + 1][2] if i + 1 < len(filtered) else len(linear)
        body = linear[pos:end].strip()
        lines = body.splitlines()[1:]
        body2 = "\n".join(lines).strip()
        pages = sorted({p for a, b, p in page_at if b > pos and a < end}) or [page_no]
        paras: list[str] = []
        for block in re.split(r"\n\s*\n+", body2):
            block = re.sub(r"\s*\n\s*", " ", block)
            block = re.sub(r"\s+", " ", block).strip()
            if not block:
                continue
            if len(block) <= 700:
                paras.append(block)
                continue
            parts_s = re.split(r"(?<=[.!?])\s+(?=[A-Z(“\"0-9•])", block)
            cur = ""
            for part in parts_s:
                if not cur:
                    cur = part
                elif len(cur) + 1 + len(part) <= 650:
                    cur = f"{cur} {part}"
                else:
                    paras.append(cur)
                    cur = part
            if cur:
                paras.append(cur)

        sec_id = "sec-intro" if num == "INTRODUCTION" else f"sec-{num.lower()}"
        sections.append(
            {
                "id": sec_id,
                "number": "Intro" if num == "INTRODUCTION" else num,
                "title": title,
                "pages": pages,
                "paragraphs": [
                    {"id": f"p-{sec_id}-{j + 1}", "text": text} for j, text in enumerate(paras)
                ],
            }
        )

    by_para = {p["id"]: p for s in sections for p in s["paragraphs"]}
    for change_id, para_id in CHANGE_ATTACH.items():
        if para_id not in by_para:
            raise SystemExit(f"Missing paragraph {para_id} for {change_id}")
        by_para[para_id]["changeId"] = change_id

    out = {
        "meta": {
            "title": "CD-0039 — Integrated Safety Management Program (Incorporating WS&H)",
            "revision": "Issue No. 001",
            "docId": "CD-0039",
            "owner": "PanTeXas Deterrence, LLC — Pantex Plant",
            "totalPages": 54,
        },
        "sections": sections,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} — {len(sections)} sections, {sum(len(s['paragraphs']) for s in sections)} paragraphs")


if __name__ == "__main__":
    main()
