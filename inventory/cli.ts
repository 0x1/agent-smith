// node cli.ts scan <repoDir> [--commit <sha>]            prints the inventory JSON
// node cli.ts check <repoDir> <change.json> [--commit <sha>]  prints { verdict, callSite }
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { scan } from "./scan.ts";
import { applicability } from "./applicability.ts";

const [cmd, dir, changeFile] = process.argv.slice(2);
if (!cmd || !dir || (cmd === "check" && !changeFile)) {
  console.error("usage: node cli.ts scan <repoDir> | check <repoDir> <change.json>");
  process.exit(2);
}
const repoDir = resolve(dir);
const flag = process.argv.indexOf("--commit");
let commit: string | null = flag > 0 ? process.argv[flag + 1] : null;
if (!commit) {
  try { commit = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { commit = null; }
}
const inv = scan(repoDir, { repo: basename(repoDir), commit });
const out = cmd === "scan" ? inv : applicability(JSON.parse(readFileSync(changeFile, "utf8")), inv);
console.log(JSON.stringify(out, null, 2));
