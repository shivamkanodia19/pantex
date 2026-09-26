# Pantex

UI wireframe for DOE-recommended document change review (Aggies Invent).

**Live:** [https://shivamkanodia19.github.io/pantex/](https://shivamkanodia19.github.io/pantex/)

## Local

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for Haiku analysis
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Haiku analysis (`/api/analyze`) runs only in local/dev — GitHub Pages is a static export, so the Write panel UI works there without live LLM calls.

## Hover review

On **Document** and **New Document**, hover or focus a highlighted clause to see
its evidence and before/after wording. Click/tap the clause to pin the popup.
Escape, an outside click, or **Close** dismisses it. Keyboard users can Tab from
the highlighted clause into the popup.

- **✓ Approve** applies the current proposal.
- **✕ Revert** restores original wording and keeps a rejected marker for review.
- **↻ Reword** asks Haiku for alternative procedure wording; it remains a proposal.
- **Edit wording** changes only the proposal. Existing approved text stays applied
  until the replacement is approved.
- **Undo** and the New Document snapshots retain both proposed and approved text.

All changes/history are session-only and reset on refresh. The bundled clauses,
relationships, page markers, and excerpts are demo data, not verified evidence.
The Sources links are for reviewers; their documents are not automatically read
by the AI. Analysis runs only when requested and is cached for unchanged input.

`POST /api/rewrite` takes `changeId`, `oldText`, `proposedText`, `doeCitation`,
`doeExcerpt`, and `context` (surrounding procedure text). It returns `changeId`,
`proposedText`, and `explanation`. Rewriting instructs the model to preserve
responsible actors, obligations, conditions, quantities, and exceptions; human
verification is still required. Invalid provider output or unavailable credentials
leave the proposal unchanged.

GitHub Pages disables AI actions explicitly; review, manual editing, and undo
still work. The existing Pages workflow excludes `app/api` before static export;
`npm run build:pages` by itself does not perform that exclusion. Normal
`npm run build` includes both server endpoints.

## Checks

```bash
npm test
npx tsc --noEmit --incremental false
npm run build
```

Tests cover approval/draft separation, rejection/reconsideration, undo/restoration,
stale rewrite protection, validation, and mocked provider success/failure. They do
not call the real provider or establish the accuracy of generated wording.
