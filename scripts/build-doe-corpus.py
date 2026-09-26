#!/usr/bin/env python3
"""Build lib/generated/doe-corpus.json from DOE Order text extracts + DEMO_DIFF."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/sources"
OUT = ROOT / "lib/generated/doe-corpus.json"
LIBRARY = ROOT / "lib/generated/doe-library.json"

# Core CRADA demo pair + early supporting extracts (always indexed).
DOCS = [
    {
        "id": "src-doe-483-1b",
        "docId": "DOE O 483.1B Chg 3",
        "title": "DOE O 483.1B Chg 3 — CRADAs",
        "role": "baseline",
        "pdf": "DOE_O_483.1B_Chg3_CRADA.pdf",
        "txt": "DOE_O_483.1B_Chg3_CRADA.txt",
        "pages": 100,
    },
    {
        "id": "src-doe-483-1c",
        "docId": "DOE O 483.1C",
        "title": "DOE O 483.1C — CRADAs",
        "role": "incoming",
        "pdf": "DOE_O_483.1C_CRADA.pdf",
        "txt": "DOE_O_483.1C_CRADA.txt",
        "pages": 15,
    },
    {
        "id": "src-doe-m-483-1-1",
        "docId": "DOE M 483.1-1",
        "title": "DOE M 483.1-1 — CRADA Manual",
        "role": "supporting",
        "pdf": "DOE_M_483.1-1_CRADA_Manual.pdf",
        "txt": "DOE_M_483.1-1_CRADA_Manual.txt",
        "pages": 95,
    },
]


def library_priority_docs() -> list[dict]:
    """Priority extracts from the expanded local DOE library."""
    if not LIBRARY.exists():
        return []
    data = json.loads(LIBRARY.read_text(encoding="utf-8"))
    out = []
    skip_oids = {"DOE O 483.1B", "DOE O 483.1C", "DOE M 483.1-1"}
    for d in data.get("docs", []):
        if d.get("role") != "priority" or not d.get("txt"):
            continue
        oid = d.get("oid") or ""
        if any(oid == s or oid.startswith(s + " ") for s in skip_oids):
            continue
        out.append(
            {
                "id": d["id"],
                "docId": oid,
                "title": d.get("title") or oid,
                "role": "priority",
                "pdf": d["pdf"],
                "txt": d["txt"],
                "pages": d.get("pages") or 0,
            }
        )
    return out

STOP = set(
    "the a an and or of to in for on at by with from as is are was were be been being this that these those it its their our your you we they he she not no nor but if then than so such into over under between among about against through during before after above below up down out off again further once here there when where why how all each few more most other some such only own same so than too very can will just should now".split()
)


def tokenize(s: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9]{3,}", s.lower()) if w not in STOP]


def chunk_text(doc_id: str, text: str, max_chars: int = 900) -> list[dict]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    paras = re.split(r"\n\s*\n+", text)
    chunks: list[str] = []
    buf = ""
    for p in paras:
        p = re.sub(r"\s+", " ", p).strip()
        if not p:
            continue
        if len(buf) + len(p) + 1 <= max_chars:
            buf = f"{buf} {p}".strip() if buf else p
        else:
            if buf:
                chunks.append(buf)
            if len(p) <= max_chars:
                buf = p
            else:
                for i in range(0, len(p), max_chars):
                    chunks.append(p[i : i + max_chars])
                buf = ""
    if buf:
        chunks.append(buf)
    out = []
    for i, c in enumerate(chunks):
        toks = tokenize(c)
        out.append(
            {
                "id": f"{doc_id}::c{i + 1}",
                "docId": doc_id,
                "index": i,
                "text": c,
                "tokens": sorted(set(toks))[:80],
            }
        )
    return out


def main() -> None:
    docs = DOCS + library_priority_docs()
    all_chunks = []
    doc_meta = []
    built_from = []
    for d in docs:
        txt_path = SRC / d["txt"]
        if not txt_path.exists():
            print("missing", txt_path)
            continue
        raw = txt_path.read_text(encoding="utf-8", errors="replace")
        chunks = chunk_text(d["id"], raw)
        all_chunks.extend(chunks)
        built_from.append(d["txt"])
        doc_meta.append(
            {
                k: v
                for k, v in {
                    **d,
                    "chunkCount": len(chunks),
                    "charCount": len(raw),
                }.items()
                if k != "txt"
            }
        )
        print(d["id"], "chunks", len(chunks))

    diff_raw = (SRC / "DEMO_DIFF_DOE_O_483.1B_to_483.1C.md").read_text(
        encoding="utf-8"
    )
    deltas = []
    for m in re.finditer(
        r"###\s+(\d+)\.\s+([^\n]+)\n([\s\S]*?)(?=\n### |\n## |\Z)", diff_raw
    ):
        body = re.sub(r"\s+", " ", m.group(3)).strip()[:1200]
        deltas.append(
            {"id": f"diff-{m.group(1)}", "title": m.group(2).strip(), "text": body}
        )

    corpus = {
        "version": 2,
        "builtFrom": built_from + ["DEMO_DIFF_DOE_O_483.1B_to_483.1C.md"],
        "docs": doc_meta,
        "chunks": all_chunks,
        "diff": {
            "id": "src-doe-483-diff",
            "title": "483.1B Chg 3 → 483.1C",
            "deltas": deltas,
            "digest": re.sub(r"\s+", " ", diff_raw)[:4000],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(corpus, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT, "docs", len(doc_meta), "chunks", len(all_chunks), "deltas", len(deltas))


if __name__ == "__main__":
    main()
