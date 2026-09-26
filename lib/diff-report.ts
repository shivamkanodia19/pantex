import type { Comparison, Token, DiffSource } from "./document-diff";
export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
function pageLink(source: DiffSource, page: number) {
  return `<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(source.href)}#page=${page}">${escapeHtml(source.title)} · PDF page ${page}</a>`;
}
function text(tokens: Token[]) {
  return escapeHtml(tokens.map((t) => t.text).join(" "));
}
export function renderReport(result: Comparison): string {
  const { older, newer } = result;
  const runHtml = result.runs
    .filter((r) => r.kind !== "equal")
    .map((r) => {
      const tokens = r.kind === "added" ? r.next : r.old;
      const links = [
        ...(r.old.length
          ? [
              pageLink(older, r.old[0].page),
              pageLink(older, r.old[r.old.length - 1].page),
            ]
          : []),
        ...(r.next.length
          ? [
              pageLink(newer, r.next[0].page),
              pageLink(newer, r.next[r.next.length - 1].page),
            ]
          : []),
      ];
      const label = r.kind === "removed" ? "Removed" : "Added";
      const long = tokens.length > 120;
      const content = `<p class="text">${text(tokens)}</p>`;
      return `<section class="${r.kind}"><h2>${label} · ${tokens.length} words${r.coarse ? " · Whole-block replacement (alignment limit)" : ""}</h2><p class="links">${[...new Set(links)].join(" · ")}</p>${long ? `<p class="context">${text(tokens.slice(0, 20))} … ${text(tokens.slice(-20))}</p><details><summary>Show all ${tokens.length} words</summary>${content}</details>` : content}</section>`;
    })
    .join("");
  const sources = [older, newer]
    .map(
      (s) =>
        `<li>${escapeHtml(s.title)} — ${s.asset.pages.length} pages<br>File: ${escapeHtml(s.asset.sourceFile)}<br>SHA-256: <code>${s.asset.sha256}</code><br>Extractor: ${escapeHtml(s.asset.extractor)} (${escapeHtml(s.asset.extractionVersion)})</li>`,
    )
    .join("");
  const omissions = [older, newer]
    .map(
      (s) =>
        `<h3>${escapeHtml(s.title)}</h3>${
          s.asset.pages
            .filter((p) => p.omittedLines.length)
            .map(
              (p) =>
                `<p>PDF page ${p.page}: ${escapeHtml(p.omittedLines.join(" | "))}</p>`,
            )
            .join("") || "<p>None.</p>"
        }`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DOE textual comparison</title><style>
  *{box-sizing:border-box}body{font:14px/1.6 system-ui,sans-serif;margin:0;padding:20px;color:#24313a;background:#fff}h1{font-size:22px}h2{font-size:14px;margin:0}h3{font-size:14px}a{color:#076ba0}section{padding:14px;margin:12px 0;border:1px solid #d5dade;border-radius:6px;overflow-wrap:anywhere}.removed{background:#fff0f0;border-left:4px solid #bb2633}.added{background:#edf9f0;border-left:4px solid #187640}.text{white-space:pre-wrap}.links,.context{font-size:12px}.context{color:#53616b}summary{cursor:pointer;font-weight:600}code{overflow-wrap:anywhere}li{margin-bottom:12px}details{margin-top:12px}@media print{section{break-inside:avoid}body{padding:0}}
  </style></head><body><h1>DOE textual comparison</h1><p>${escapeHtml(older.title)} → ${escapeHtml(newer.title)}</p><p><strong>${result.groups} change groups · ${result.removed} removed words · ${result.added} added words</strong></p>${!result.groups ? "<p>No textual differences after normalization.</p>" : ""}<details><summary>Sources and normalization</summary><p>${escapeHtml(result.normalization)}</p><ul>${sources}</ul><details><summary>Omitted running-header lines</summary>${omissions}</details></details>${runHtml}</body></html>`;
}
