// Runs the same per-section scan as Document → "Run full scan" against a local dev server.
// Usage: node scripts/run-full-scan.cjs [baseUrl]   (writes tmp/full-scan-results.json)
const fs = require("node:fs");
const path = require("node:path");

const base = process.argv[2] || "http://localhost:3000";
const body = require("../lib/generated/cd-0039-body.json");
const sections = body.sections;
const CONCURRENCY = 4;

async function scan(sec) {
  const started = Date.now();
  const res = await fetch(`${base}/api/scan-section`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sectionId: sec.id,
      sectionNumber: sec.number,
      sectionTitle: sec.title,
      paragraphs: sec.paragraphs.map((p) => ({ id: p.id, text: p.text })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { section: `${sec.number} ${sec.title}`.trim(), status: res.status, ms: Date.now() - started, ...data };
}

async function main() {
  const results = new Array(sections.length);
  let next = 0;
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < sections.length) {
        const i = next++;
        results[i] = await scan(sections[i]);
        const r = results[i];
        const tag = r.change ? "CHANGE" : r.status !== 200 ? `HTTP ${r.status}` : r.reason;
        console.log(`[${String(i + 1).padStart(2)}/${sections.length}] ${tag.padEnd(14)} ${r.section}`);
      }
    }),
  );
  const changes = results.filter((r) => r.change);
  const tokens = results.reduce(
    (a, r) => ({ in: a.in + (r.usage?.input_tokens || 0), out: a.out + (r.usage?.output_tokens || 0) }),
    { in: 0, out: 0 },
  );
  const reasons = {};
  for (const r of results) {
    const k = r.change ? "change" : r.status !== 200 ? `http_${r.status}` : r.reason;
    reasons[k] = (reasons[k] || 0) + 1;
  }
  fs.mkdirSync(path.join(__dirname, "..", "tmp"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "..", "tmp", "full-scan-results.json"), JSON.stringify(results, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(`sections: ${sections.length}  wall: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log("outcomes:", reasons);
  console.log(`tokens: ${tokens.in} in + ${tokens.out} out = ${tokens.in + tokens.out}`);
  console.log(`\n=== ${changes.length} PROPOSED CHANGES ===`);
  for (const r of changes)
    console.log(`- ${r.section}\n    ${r.change.summary}\n    cite: ${r.change.doe.citation}`);
}
main();
