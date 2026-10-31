import type { RunResult, TestFailure } from "../../contracts/case.ts";
import type { CommandResult } from "./sandbox.ts";

const count = (output: string, label: string): number => Number(output.match(new RegExp(`^. ${label} (\\d+)`, "m"))?.[1] ?? 0);

// The first failing assertion from `node --test` output, for the case view.
function firstFailure(output: string): TestFailure | null {
  const test = output.match(/^. test at .*\n. (?:✖ )?(.+?) \(\d/m)?.[1] ?? output.match(/✖ (.+?) \(\d/)?.[1];
  const expected = output.match(/^\s*expected: (.+)$/m)?.[1];
  const actual = output.match(/^\s*actual: (.+)$/m)?.[1];
  if (!test && expected === undefined) return null;
  const clean = (value: string | undefined) => (value ?? "").replace(/,$/, "");
  return { test: test ?? "", expected: clean(expected), actual: clean(actual) };
}

export function toRunResult(commit: string, command: string, r: CommandResult, durationMs: number): RunResult {
  const output = r.stdout + r.stderr;
  const passed = count(output, "pass");
  const failed = count(output, "fail");
  return {
    commit,
    command,
    exitCode: r.exitCode ?? -1,
    logRef: output.slice(-2000),
    passed,
    total: passed + failed,
    failure: failed > 0 ? firstFailure(output) : null,
    durationMs,
  };
}
