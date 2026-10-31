import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Keys live outside every repo and never go into a VM.
export function loadEnv(path = join(homedir(), ".agent-smith.env")): void {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && match[2]) process.env[match[1]] ??= match[2];
  }
}
