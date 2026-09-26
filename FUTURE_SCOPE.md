# Pantex — Future Scope

Notes for the technical slide and post-demo product direction. **Not implemented in the hackathon wireframe** unless marked otherwise.

## Demo pipeline (what the wireframe shows)

```
483.1B + 483.1C → precomputed diff → look in 483.1C → edit cards on CD-0039
```

Document tab = real **CD-0039** text. Change cards = derived from the in-repo B→C diff (not a live Haiku call). **Run LLM** is wired for optional re-analysis and does **not** auto-run.

## Demo corpus on disk

Shipped under `public/sources/` for Source Search:

- `DOE_O_483.1B_Chg3_CRADA.pdf` + `.txt` — baseline (483.1B)
- `DOE_O_483.1C_CRADA.pdf` + `.txt` — incoming (483.1C)
- `DEMO_DIFF_DOE_O_483.1B_to_483.1C.md` — **precomputed LLM difference ID** (the expensive step, mocked for the pitch)

The wireframe never re-runs that diff; the product pitch is hash-cached regeneration only when either side’s content hash moves.

## Demo vs product

| Demo (now) | Product (pitch) |
|---|---|
| Haiku on demand, section-by-section when the reviewer clicks **Run LLM** | Persistent store of docs + computed diffs so unchanged sections never re-hit the model |
| Source Search is a file finder (no LLM while browsing) | Same UX; ingest/index jobs run offline or on upload |
| Local `ANTHROPIC_API_KEY` only | Cloud worker + secrets manager; Pages/static UI stays keyless |

## Cost problem (the expensive part)

Browsing and page/section navigation are **deterministic and cheap** (PDF text extract, TOC split, keyword search, prefetch of adjacent pages).

The expensive step is **LLM difference identification** — comparing Pantex clauses to DOE authority text and proposing/accepting edits. That must **never** mean “send the whole corpus every time.”

### Principles

1. **Section-scoped analysis only** — one section (or page window) per Haiku call.
2. **Do not scan all Pantex docs on every session** — only the section the reviewer opens (or a queued ingest for that doc version).
3. **DOE side can be parsed more fully** once per DOE document version (authoritative corpus), then reused.
4. **Cache by content hash** — `(docId, sectionId, contentHash, doeCorpusHash) → analysis JSON`. Hit = $0.
5. Prefetch of *text/pages* is fine; prefetch of *LLM diffs* is optional and budget-capped.

## Database / versioning system (tech slide)

Maintain a store (Postgres / SQLite / hosted DB) of:

- **Document versions** — Pantex procedures + DOE orders/standards (immutable blobs + metadata).
- **Section map** — `sectionId`, title, `pageStart`/`pageEnd`, text, `contentHash`.
- **Relative changes** — proposed/accepted/rejected diffs tied to section + DOE requirement IDs.
- **Analysis cache** — Haiku outputs keyed by hashes above.
- **Invalidation** — when either Pantex or DOE source text changes, only affected section hashes miss and re-run.

Pitch line: *“We keep the latest docs and relative changes in a versioned database so the model only runs where content actually moved — not a full re-RAG of the plant library every review.”*

## DOE RAG layer (product — not demo-blocking)

The DOE authority side will eventually sit behind a **RAG layer**: chunked Orders/Standards/Guides → retrieve top‑k excerpts for a Pantex section → Haiku (or stronger) does difference identification on that small context.

**Demo stance:** do **not** build full RAG now. Seeded citations + Haiku on the focused section are enough to sell the workflow. Put RAG on the tech slide as the production path for DOE corpus scale.

**When to build RAG:** after the IA is stable (Source Search + section review), when you have multiple real DOE PDFs and retrieval quality becomes the bottleneck — not before the UI story lands.

## Ingest pipeline (post-demo)

1. Upload / sync PDF or directive.
2. Deterministic extract → pages.
3. Section split via TOC/headings (LLM only to repair ambiguous boundaries).
4. Optional batch Haiku for **new/changed sections only**.
5. Keyword (and later optional embedding) index for Source Search.

## DOE parse vs Pantex scan

- **DOE docs:** fuller offline parse is desirable (authority corpus). Parse once per revision; store structured excerpts + requirement IDs.
- **Pantex docs:** do **not** LLM-diff the entire plant library up front. Reviewer-driven section analysis + hash cache.

## “Scripted search in the cloud” (optional tech-slide idea)

Interesting talking point, not required for v1:

Give the agent a **constrained tool** in a cloud env — e.g. `search_doe_corpus(query)`, `get_section(docId, sectionId)`, `grep_pdf(path, pattern)` — so Haiku retrieves evidence by **scripted search** instead of stuffing whole PDFs into context.

That keeps tokens low and makes the architecture demoable: *model + tools + cache*, not *model + giant paste*.

Defer deep implementation until after the demo unless we explicitly scope a thin tool prototype.

## Source Search (product)

Elegant file finder (DOE folder / Pantex folder) remains LLM-free. Navigation: next/prev page, section, change. Analysis stays on the Document review surface, section-scoped.

## Explicit non-goals (near term)

- Live scrape of the entire Delegations Library into RAG without curation.
- Sonnet/Opus for routine section diffs.
- Automatic Haiku on every page turn without a user action (demo uses an explicit **Run LLM** per section).
