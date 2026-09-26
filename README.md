# Pantex

UI wireframe for DOE-recommended document change review (Aggies Invent).

**Live (static UI):** [https://shivamkanodia19.github.io/pantex/](https://shivamkanodia19.github.io/pantex/)  
**Haiku analysis:** local only (`npm run dev` + `ANTHROPIC_API_KEY`).

## Local

```bash
npm install
npm run dev
```

Open [http://localhost:3000/search](http://localhost:3000/search).

### API key

Put the key in `.env.local` (gitignored):

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5
```

Create `.env.local` in the project root.

## Tabs

1. **Source Search** — Pantex / DOE libraries with inline procedure, PDF, and text previews. External libraries open separately. Browsing never calls AI.
2. **Document** — switch between Full document (click-to-open review panel) and Section review (navigation and analysis sidebar). Both share selection, unsaved edits, decisions, and undo.
3. **Changes** — accordion of all recommendations.

Approve applies the proposal; Revert restores the original. Editing or rewording never silently applies a proposal. Review state and unsaved drafts last for the current session only. `/new` redirects to Document.

Analyze and Reword are explicit, local-server actions. GitHub Pages disables live AI while keeping manual review functional. Seeded evidence is demo content, not independently verified. No live Anthropic test was performed for this milestone.

## Verification

Run `npm test` for review-state, mocked rewrite API, and source-filter tests; run `npx tsc --noEmit` for TypeScript validation.

See [FUTURE_SCOPE.md](./FUTURE_SCOPE.md) for the product/tech-slide cache, DOE parse, and RAG story.

## Demo DOE corpus (CRADA supersession)

| File | Role |
|---|---|
| [`public/sources/DOE_O_483.1B_Chg3_CRADA.pdf`](./public/sources/DOE_O_483.1B_Chg3_CRADA.pdf) | Baseline — 483.1B Chg 3 |
| [`public/sources/DOE_O_483.1C_CRADA.pdf`](./public/sources/DOE_O_483.1C_CRADA.pdf) | Incoming — 483.1C |
| [`public/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md`](./public/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md) | Precomputed “LLM” diff (presentation) |

Text extracts (`.txt`) sit beside the PDFs for the ingest story.

## Deterministic DOE comparison

In Source Search → DOE, choose the older/newer bundled orders and click **Find differences**. The browser verifies each PDF's SHA-256 against its page-indexed extract, then compares whitespace-normalized word tokens in a worker. No AI or server endpoint is involved; GitHub Pages supports the same workflow.

The preview and downloadable standalone HTML retain the complete files, including attachments. Red/green blocks indicate textual removal/addition, not a finding that obligations were retired. Large unmatched blocks use a labeled whole-block replacement when fine alignment exceeds the work limit. Counts include unaligned words in those blocks.

Regenerate extracts with `python3 scripts/extract-doe-comparison.py`; verify reproducibility with `python3 scripts/extract-doe-comparison.py --check` using the pypdf version recorded in the JSON assets. The script preserves PDF page indices and records every omitted running-header line. Ordinary hyphens, punctuation, capitalization, and quantities remain significant. Layout-only PDF content and images are outside this text comparison.
