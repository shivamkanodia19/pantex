const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { reviewReducer, initialReviewState } = require(
  path.join(process.env.PANTEX_TEST_MODULES, "review-state.js"),
);
const { validateRewriteInput, parseRewriteOutput } = require(
  path.join(process.env.PANTEX_TEST_MODULES, "rewrite-validation.js"),
);
let sequence = 0;
const apply = (s, type, extra = {}) =>
  reviewReducer(s, {
    type,
    id: "chg-01",
    label: type,
    snapshotId: `test-${++sequence}`,
    createdAt: "2026-09-26T00:00:00Z",
    ...extra,
  });
test("editing and rewriting remain proposals; approval is explicit", () => {
  let s = apply(initialReviewState(), "edit", { text: "Draft one" });
  assert.equal(s.changes[0].approvedText, undefined);
  s = apply(s, "approve");
  assert.equal(s.changes[0].approvedText, "Draft one");
  s = apply(s, "rewrite", { text: "Draft two", expectedRevision: s.revision });
  assert.equal(s.changes[0].approvedText, "Draft one");
  assert.equal(s.changes[0].workingText, "Draft two");
  assert.equal(s.changes[0].status, "edited");
  s = apply(s, "approve");
  assert.equal(s.changes[0].approvedText, "Draft two");
});
test("revert retains suggestion; undo restores approval; rejected proposals can be approved", () => {
  let s = apply(initialReviewState(), "approve");
  const text = s.changes[0].approvedText;
  s = apply(s, "reject");
  assert.equal(s.changes[0].approvedText, undefined);
  assert.equal(s.changes[0].workingText, text);
  assert.equal(s.changes[0].status, "rejected");
  s = apply(s, "undo");
  assert.equal(s.changes[0].approvedText, text);
  s = apply(apply(s, "reject"), "approve");
  assert.equal(s.changes[0].status, "accepted");
});
test("stale rewrites cannot overwrite edits, undo, or restored state", () => {
  let s = initialReviewState();
  const revision = s.revision;
  s = apply(s, "edit", { text: "New user wording" });
  assert.equal(
    apply(s, "rewrite", {
      text: "Stale model text",
      expectedRevision: revision,
    }),
    s,
  );
  s = apply(s, "undo");
  assert.equal(
    apply(s, "rewrite", {
      text: "Stale model text",
      expectedRevision: revision,
    }),
    s,
  );
});
test("snapshot/restore and undo are atomic and reducer has no input mutation", () => {
  const before = initialReviewState();
  const serialized = JSON.stringify(before);
  let s = apply(before, "approve");
  assert.equal(JSON.stringify(before), serialized);
  assert.equal(s.histories.length, 2);
  const snapshotId = s.histories[0].id;
  s = apply(s, "edit", { text: "Changed" });
  s = apply(s, "restore", { id: snapshotId });
  assert.equal(s.changes[0].status, "accepted");
  assert.equal(s.histories.length, 4);
  s = apply(s, "undo");
  assert.equal(s.changes[0].workingText, "Changed");
  assert.equal(apply(s, "edit", { text: "  " }), s);
});
test("undo retains last forty operations", () => {
  let s = initialReviewState();
  for (let i = 0; i < 45; i++) s = apply(s, "edit", { text: `Draft ${i}` });
  assert.equal(s.undoStack.length, 40);
});
test("rewrite input rejects missing, oversized, and mistyped data", () => {
  const input = {
    changeId: "c",
    oldText: "old",
    proposedText: "new",
    doeCitation: "citation",
    doeExcerpt: "source",
    context: "context",
  };
  assert.equal(validateRewriteInput(input), true);
  for (const value of [
    null,
    {},
    { ...input, context: 3 },
    { ...input, doeExcerpt: "" },
    { ...input, proposedText: "x".repeat(8001) },
  ])
    assert.equal(validateRewriteInput(value), false);
});
test("malformed model replies fail instead of replacing wording", () => {
  assert.deepEqual(
    parseRewriteOutput(
      '```json\n{"proposedText":" New wording ","explanation":"Verify this."}\n```',
    ),
    { proposedText: "New wording", explanation: "Verify this." },
  );
  for (const raw of [
    "not JSON",
    "null",
    "{}",
    '{"proposedText":"","explanation":"test"}',
    '{"proposedText":42,"explanation":"test"}',
    '{"proposedText":"valid","explanation":[]}',
  ])
    assert.throws(() => parseRewriteOutput(raw));
});

test("rewrite endpoint handles provider success/failure and missing configuration", async () => {
  const vm = require("node:vm");
  const fs = require("node:fs");
  let reply =
    '{"proposedText":"Alternative wording","explanation":"Verify meaning before approval."}';
  let shouldFail = false;
  let calls = 0;
  const module = { exports: {} };
  const fakeEnvironment = { ANTHROPIC_API_KEY: "test-only-not-a-real-key" };
  const context = {
    exports: module.exports,
    process: { env: fakeEnvironment },
    require: (name) => {
      if (name === "@anthropic-ai/sdk")
        return {
          default: class {
            messages = {
              create: async () => {
                calls++;
                if (shouldFail) throw new Error("Provider unavailable");
                return {
                  stop_reason: "end_turn",
                  content: [{ type: "text", text: reply }],
                };
              },
            };
          },
        };
      if (name === "next/server") return { NextResponse: Response };
      if (
        name === "@/lib/rewrite-validation" ||
        name === "./rewrite-validation"
      )
        return { parseRewriteOutput, validateRewriteInput };
      throw new Error(`Unexpected import ${name}`);
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(process.env.PANTEX_TEST_MODULES, "rewrite-route.js"),
      "utf8",
    ),
    context,
  );
  const input = {
    changeId: "chg-01",
    oldText: "old",
    proposedText: "new",
    doeCitation: "demo",
    doeExcerpt: "demo evidence",
    context: "procedure",
  };
  const request = (body) =>
    new Request("http://localhost/api/rewrite", {
      method: "POST",
      body: JSON.stringify(body),
    });
  let res = await module.exports.POST(request(input));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).changeId, "chg-01");
  reply = '{"proposedText":42}';
  res = await module.exports.POST(request(input));
  assert.equal(res.status, 502);
  shouldFail = true;
  res = await module.exports.POST(request(input));
  assert.equal(res.status, 502);
  fakeEnvironment.ANTHROPIC_API_KEY = "";
  const before = calls;
  res = await module.exports.POST(request(input));
  assert.equal(res.status, 503);
  assert.equal(calls, before);
  res = await module.exports.POST(request({}));
  assert.equal(res.status, 400);
  res = await module.exports.POST(
    new Request("http://localhost/api/rewrite", {
      method: "POST",
      body: "invalid",
    }),
  );
  assert.equal(res.status, 400);
});

test("source filtering never substitutes a different preview", () => {
  const { filterSources, visibleSelection } = require(
    path.join(process.env.PANTEX_TEST_MODULES, "source-search.js"),
  );
  const { sourcesByFolder } = require(
    path.join(process.env.PANTEX_TEST_MODULES, "sources.js"),
  );
  const folders = sourcesByFolder();
  assert.equal(visibleSelection(folders.pantex, null), null);
  const selected = folders.pantex[0];
  assert.equal(visibleSelection(folders.pantex, selected.id), selected);
  assert.equal(visibleSelection(folders.doe, selected.id), null);
  assert.equal(
    visibleSelection(
      filterSources(folders.pantex, "no possible match"),
      selected.id,
    ),
    null,
  );
  assert.equal(
    filterSources(folders.doe, " 483.1c ").some(
      (doc) => doc.id === "src-doe-483-1c",
    ),
    true,
  );
});

test("catalog preserves libraries and gives every source an explicit preview format", () => {
  const { getSourceDocs } = require(
    path.join(process.env.PANTEX_TEST_MODULES, "sources.js"),
  );
  const docs = getSourceDocs();
  assert.ok(docs.length >= 80, `expected expanded DOE library, got ${docs.length}`);
  assert.equal(docs.filter((d) => d.folder === "pantex").length, 2);
  assert.ok(docs.filter((d) => d.folder === "doe").length >= 78);
  assert.ok(docs.some((d) => d.id === "src-doe-o-450-2"));
  assert.ok(docs.some((d) => d.id === "src-10-cfr-851"));
  for (const doc of docs) {
    assert.ok(
      ["pdf", "procedure", "markdown", "text", "external"].includes(doc.format),
    );
    if (doc.format === "pdf") assert.ok(doc.href.endsWith(".pdf"));
    if (doc.format === "external") assert.equal(doc.local, false);
  }
});

test("chapter navigation preserves document order, missing chapters and named sections", () => {
  const { chapterLinks } = require(path.join(process.env.PANTEX_TEST_MODULES, "section-navigation.js"));
  const sections = ["Intro", "1.2", "1.4", "3", "3.1", "Appendix A"].map((number,i) => ({id:String(i), number}));
  assert.deepEqual(chapterLinks(sections), [
    {label:"Intro",sectionId:"0"}, {label:"1",sectionId:"1"},
    {label:"3",sectionId:"3"}, {label:"Appendix A",sectionId:"5"}
  ]);
});

test("section search ranks real numbers and searches approved text without proposals", () => {
  const { searchSections } = require(path.join(process.env.PANTEX_TEST_MODULES, "section-navigation.js"));
  const sections = [
    {id:"a",number:"2.1",title:"Training",paragraphs:[{id:"p",text:"original obsolete",changeId:"c"}]},
    {id:"b",number:"2",title:"Safety",paragraphs:[]},
    {id:"c",number:"4",title:"Training and safety",paragraphs:[]}
  ];
  const changes = [{id:"c",approvedText:"Current emergency accountability",workingText:"Unapproved secret proposal"}];
  for (const query of ["2", "section 2", " § 2 "]) assert.deepEqual(searchSections(sections,changes,query).map(r=>r.section.id),["b","a"]);
  assert.equal(searchSections(sections,changes,"train")[0].section.id,"a");
  assert.match(searchSections(sections,changes,"emergency")[0].excerpt,/emergency/);
  for(const q of ["obsolete","secret","missing","section"]) assert.equal(searchSections(sections,changes,q).length,0);
  assert.equal(searchSections(Array.from({length:12},(_,i)=>({...sections[0],id:String(i)})),changes,"training").length,8);
});

const { compareDocuments, tokenize, validateAsset } = require(path.join(process.env.PANTEX_TEST_MODULES, 'document-diff.js'));
const { renderReport } = require(path.join(process.env.PANTEX_TEST_MODULES, 'diff-report.js'));
function diffSource(text, id='old') {return {id,title:id,href:'https://example.test/'+id+'.pdf',asset:{schemaVersion:1,extractionVersion:'test',extractor:'test',sourceFile:id+'.pdf',sha256:'a'.repeat(64),pages:[{page:1,text,omittedLines:[]}]}};}
function assertReconstruction(result) {
  assert.deepEqual(result.runs.flatMap(r=>r.old),tokenize(result.older.asset));
  assert.deepEqual(result.runs.flatMap(r=>r.next),tokenize(result.newer.asset));
}
test('deterministic diff ignores whitespace but preserves meaningful textual changes',()=>{
  const unchanged=compareDocuments(diffSource('shall\n  do\u00a0this'),diffSource('shall do this','new'));
  assert.equal(unchanged.groups,0); assertReconstruction(unchanged);
  for(const [old,next] of [['shall do this','shall not do this'],['within 30 days.','within 3 days!'],['a-b','ab'],['Safety','safety'],['one two',''],['','added'],['a b a b a','b a b a b'],['first block here second block there','second block there first block here']]) {
    const r=compareDocuments(diffSource(old),diffSource(next,'new'));
    assert.ok(r.groups>0); assertReconstruction(r);
    assert.deepEqual(r,compareDocuments(diffSource(old),diffSource(next,'new')));
  }
});
test('bounded alignment retains all content and reports coarse replacements',()=>{
  const r=compareDocuments(diffSource('one two three'),diffSource('four five six','new'),0);
  assert.equal(r.coarseBlocks,1); assertReconstruction(r);
  assert.match(renderReport(r),/Whole-block replacement/);
});
test('HTML report escapes source text and retains collapsed content',()=>{
  const r=compareDocuments(diffSource('<script>alert("x")</script> '+ 'old '.repeat(140)),diffSource('<img src=x onerror=alert(1)>','new'));
  const html=renderReport(r);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
  assert.match(html,/&lt;script&gt;/);assert.match(html,/<details>/);assert.match(html,/PDF page 1/);
  assert.throws(()=>validateAsset({pages:[]}),/Invalid comparison/);
});
test('complete bundled comparison reconstructs every page and matches PDF hashes',()=>{
  const fs=require('node:fs'),crypto=require('node:crypto');
  const sources=['DOE_O_483.1B_Chg3_CRADA','DOE_O_483.1C_CRADA'].map((name,i)=>{
    const asset=JSON.parse(fs.readFileSync(`public/sources/comparison/${name}.json`,'utf8'));
    assert.equal(asset.sha256,crypto.createHash('sha256').update(fs.readFileSync(`public/sources/${name}.pdf`)).digest('hex'));
    return {...diffSource('',String(i)),asset};
  });
  assert.equal(sources[0].asset.pages.length,100);assert.equal(sources[1].asset.pages.length,15);
  const r=compareDocuments(...sources);assertReconstruction(r);assert.ok(r.groups>0);
  assert.ok(r.runs.some(run=>run.old.some(t=>t.page===100)));
});
test('every comparable DOE doc has a hash-matched extract and a same-family partner',()=>{
  const fs=require('node:fs'),crypto=require('node:crypto');
  const {getSourceDocs}=require(path.join(process.env.PANTEX_TEST_MODULES,'sources.js'));
  const comparable=getSourceDocs().filter(d=>d.comparisonTextHref);
  const families=new Map();
  for(const d of comparable){
    assert.ok(d.family,`${d.id} has no family`);
    families.set(d.family,(families.get(d.family)??0)+1);
    const asset=JSON.parse(fs.readFileSync(`public${d.comparisonTextHref}`,'utf8'));
    assert.equal(asset.sha256,crypto.createHash('sha256').update(fs.readFileSync(`public${d.href}`)).digest('hex'),d.id);
  }
  assert.ok(families.size>=20,`only ${families.size} families`);
  for(const [f,n] of families) assert.ok(n>=2,`${f} has one version`);
  assert.equal(families.get('DOE O 413.3'),2);
});
