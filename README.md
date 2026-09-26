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
