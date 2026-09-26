// Compile only the pure domain modules into an isolated temporary directory.
const ts = require("typescript");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pantex-tests-"));

function rewriteAliases(code) {
  return code
    .replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")')
    .replace(/from "@\/lib\/([^"]+)"/g, 'from "./$1"');
}

function transpileLib(name) {
  const result = ts.transpileModule(fs.readFileSync(`lib/${name}.ts`, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      resolveJsonModule: true,
      esModuleInterop: true,
    },
  });
  fs.writeFileSync(
    path.join(dir, `${name}.js`),
    rewriteAliases(result.outputText),
  );
}

try {
  fs.mkdirSync(path.join(dir, "generated"), { recursive: true });
  fs.copyFileSync(
    "lib/generated/cd-0039-body.json",
    path.join(dir, "generated", "cd-0039-body.json"),
  );

  for (const name of [
    "cd-0039-body",
    "document-data",
    "review-packs",
    "review-state",
    "rewrite-validation",
    "sources",
    "source-search",
    "section-navigation",
    "impact",
  ]) {
    transpileLib(name);
  }

  const route = ts.transpileModule(
    fs.readFileSync("app/api/rewrite/route.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  fs.writeFileSync(
    path.join(dir, "rewrite-route.js"),
    rewriteAliases(route.outputText),
  );

  const result = spawnSync(
    process.execPath,
    ["--test", "tests/review.test.cjs"],
    { stdio: "inherit", env: { ...process.env, PANTEX_TEST_MODULES: dir } },
  );
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
