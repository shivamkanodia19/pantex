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

Path: `/Users/shivam/aggiesinvent/.env.local`

## Tabs

1. **Source Search** — file finder (Pantex / DOE folders), no LLM  
2. **Document** — section-by-section review; **Run LLM** per change (Haiku)  
3. **Changes** — accordion of all recommendations  

See [FUTURE_SCOPE.md](./FUTURE_SCOPE.md) for the product/tech-slide cache, DOE parse, and RAG story.

## Demo DOE corpus (CRADA supersession)

No published **DOE O 483.1D** — the live pair is **483.1B Chg 3 → 483.1C**:

| File | Role |
|---|---|
| [`public/sources/DOE_O_483.1B_Chg3_CRADA.pdf`](./public/sources/DOE_O_483.1B_Chg3_CRADA.pdf) | Baseline order |
| [`public/sources/DOE_O_483.1C_CRADA.pdf`](./public/sources/DOE_O_483.1C_CRADA.pdf) | Incoming order |
| [`public/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md`](./public/sources/DEMO_DIFF_DOE_O_483.1B_to_483.1C.md) | Precomputed “LLM” diff (presentation) |

Text extracts (`.txt`) sit beside the PDFs for the ingest story.
