import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Change } from "../../contracts/case.ts";
import type { Sandbox } from "./sandbox.ts";

export const TEST_COMMAND = "SUPPLIER_VERSION=v2 pnpm test";
const MODEL = "openai/gpt-6.1-sol";

const INSTRUCTIONS = `You repair an application after a supplier API change.
Read the migration note and the code, then make the smallest change in src/ that restores correct behavior.
Never edit anything outside src/. The tests define correct behavior and are not yours to change.
Follow the migration note exactly, including its edge cases, because other checks you cannot see will run.
Run the tests after your change. When they pass, stop and summarize what you changed in one sentence.`;

function tools(sandbox: Sandbox) {
  return {
    read_file: createTool({
      id: "read_file",
      description: "Read a file from the repository.",
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }) => sandbox.readFile(path),
    }),
    write_file: createTool({
      id: "write_file",
      description: "Replace a file under src/ with new content.",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      execute: async ({ path, content }) => {
        if (!/^src\/[\w./-]+$/.test(path) || path.includes("..")) return "Refused: only files under src/ may change.";
        await sandbox.writeFile(path, content);
        return "Written.";
      },
    }),
    run_tests: createTool({
      id: "run_tests",
      description: "Run the test suite and return its output.",
      inputSchema: z.object({}),
      execute: async () => {
        const r = await sandbox.run(TEST_COMMAND);
        return `exit ${r.exitCode}\n${(r.stdout + r.stderr).slice(-4000)}`;
      },
    }),
  };
}

export async function runRepair(sandbox: Sandbox, change: Change, note: string, feedback: string | null): Promise<string> {
  const agent = new Agent({
    id: "smith-repair",
    name: "smith-repair",
    instructions: INSTRUCTIONS,
    model: MODEL,
    tools: tools(sandbox),
  });
  const prompt = [
    `Change: ${change.summary}`,
    `Field: ${change.fieldPath}`,
    `Migration note:\n${note}`,
    `Start with src/supplier.ts. Files: ${(await sandbox.run("git ls-files src")).stdout.trim()}`,
    feedback ? `Your previous attempt was rejected: ${feedback}` : "",
  ].join("\n\n");
  const result = await agent.generate(prompt, { maxSteps: 12 });
  return result.text;
}
