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
