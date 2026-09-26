// Compile only the pure domain modules into an isolated temporary directory.
const ts = require("typescript");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pantex-tests-"));
try {
  for (const name of ["document-data", "review-state", "rewrite-validation"]) {
    const result = ts.transpileModule(
      fs.readFileSync(`lib/${name}.ts`, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    );
    fs.writeFileSync(path.join(dir, `${name}.js`), result.outputText);
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
  fs.writeFileSync(path.join(dir, "rewrite-route.js"), route.outputText);
  const result = spawnSync(
    process.execPath,
    ["--test", "tests/review.test.cjs"],
    { stdio: "inherit", env: { ...process.env, PANTEX_TEST_MODULES: dir } },
  );
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
