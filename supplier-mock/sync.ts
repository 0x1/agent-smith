// Copies the mock (supplier.ts, fixtures, notes) into agent-smith-demo/test/support/supplier,
// or with --check, fails if the copy differs. Usage:
//   node sync.ts ../../agent-smith-demo          copy
//   node sync.ts ../../agent-smith-demo --check  verify
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
const check = process.argv.includes("--check");
if (!target) throw new Error("usage: node sync.ts <path-to-agent-smith-demo> [--check]");
const dest = resolve(target, "test", "support", "supplier");

const files = ["supplier.ts", ...["fixtures", "notes"].flatMap((d) => readdirSync(join(here, d)).map((f) => join(d, f)))];
let drift = 0;
for (const f of files) {
  const src = readFileSync(join(here, f), "utf8");
  const out = join(dest, f);
  if (check) {
    if (!existsSync(out) || readFileSync(out, "utf8") !== src) { console.error(`differs: ${f}`); drift++; }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, src);
  }
}
if (check) {
  if (drift) { console.error(`${drift} file(s) differ from supplier-mock`); process.exit(1); }
  console.log(`in sync: ${files.length} files`);
} else console.log(`copied ${files.length} files to ${dest}`);
