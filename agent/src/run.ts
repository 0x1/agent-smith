import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.ts";
import { investigate } from "./workflow.ts";

loadEnv();
const [changePath, repoDir = "../../agent-smith-demo"] = process.argv.slice(2);
process.env.TARGET_REPO_DIR = repoDir;
const change = JSON.parse(readFileSync(changePath, "utf8"));
const commit = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const note = readFileSync(join(repoDir, "test/support/supplier/notes/v2.md"), "utf8");

const run = await investigate.createRun();
const result = await run.start({ inputData: { change, repoDir, repo: "0x1/agent-smith-demo", commit, note } });
console.log(result.status, JSON.stringify(result.status === "success" ? result.result : result).slice(0, 800));
process.exit(result.status === "success" ? 0 : 1);
