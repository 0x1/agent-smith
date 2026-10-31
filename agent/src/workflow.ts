import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { makeCaseId, type Change } from "../../contracts/case.ts";
import { applicability, scan } from "../../inventory/index.ts";
import { openPullRequest } from "./pr.ts";
import { getRelay } from "./relay.ts";
import { runRepair, TEST_COMMAND } from "./repair.ts";
import { patchCase } from "./case-store.ts";
import { openSandbox, type Sandbox } from "./sandbox.ts";
import { startVerifierAgent, waitForVerdict } from "./verifier-agent.ts";

const MAX_ATTEMPTS = 2;
const sandboxes = new Map<string, Sandbox>();

const input = z.object({
  change: z.custom<Change>(),
  repoDir: z.string(),
  repo: z.string(),
  commit: z.string(),
  note: z.string(),
});

const state = input.extend({
  caseId: z.string(),
  attempt: z.number(),
  diff: z.string(),
  feedback: z.string().nullable(),
  accepted: z.boolean(),
});
type State = z.infer<typeof state>;

const checkApplicability = createStep({
  id: "check-applicability",
  description: "Does the app read the field that changed? Deterministic, no model.",
  inputSchema: input,
  outputSchema: state.extend({ affected: z.boolean() }),
  execute: async ({ inputData }) => {
    const { change, repoDir, repo } = inputData;
    const caseId = makeCaseId(repo, change.provider, change.endpoint, change.fieldPath);
    const inventory = scan(repoDir, { repo, commit: inputData.commit });
    const { verdict, callSite } = applicability(change, inventory);
    const affected = verdict.result === "affected";
    await patchCase(caseId, {
      verdict,
      callSite,
      status: affected ? "investigating" : "not_affected",
      headline: affected ? "A supplier change affects your app." : "Checked this. Nothing to do.",
      explanation: verdict.evidence.join(" "),
      baseCommit: inputData.commit,
      testCommand: TEST_COMMAND,
    });
    return { ...inputData, caseId, attempt: 0, diff: "", feedback: null, accepted: false, affected };
  },
});

const reproduce = createStep({
  id: "reproduce-failure",
  description: "Run the real test in a fresh VM and watch it fail.",
  inputSchema: state.extend({ affected: z.boolean() }),
  outputSchema: state,
  execute: async ({ inputData }) => {
    const { affected: _, ...rest } = inputData;
    const sandbox = await openSandbox(rest.repoDir, rest.commit);
    sandboxes.set(rest.caseId, sandbox);
    const r = await sandbox.run(TEST_COMMAND);
    if (r.exitCode === 0) {
      await sandbox.destroy();
      sandboxes.delete(rest.caseId);
      throw new Error("The test passes against the new supplier, so the failure did not reproduce.");
    }
    await patchCase(rest.caseId, {
      before: { commit: rest.commit, command: TEST_COMMAND, exitCode: r.exitCode ?? -1, logRef: (r.stdout + r.stderr).slice(-2000) },
    });
    return rest;
  },
});

const repair = createStep({
  id: "repair",
  description: "The repair agent changes src/ until the tests pass.",
  inputSchema: state,
  outputSchema: state,
  execute: async ({ inputData }) => {
    const sandbox = sandboxes.get(inputData.caseId)!;
    const attempt = inputData.attempt + 1;
    await patchCase(inputData.caseId, { attempt });
    await runRepair(sandbox, inputData.change, inputData.note, inputData.feedback);
    await sandbox.run("git add -A");
    const diff = (await sandbox.run("git diff --cached")).stdout;
    return { ...inputData, attempt, diff };
  },
});

const verification = createStep({
  id: "verify-over-relay",
  description: "The repair is posted to Agent Relay, and a separate verifier accepts or rejects it.",
  inputSchema: state,
  outputSchema: state,
  execute: async ({ inputData }) => {
    const relay = await getRelay();
    await startVerifierAgent();
    const { caseId, attempt, diff, repoDir, commit } = inputData;
    const pending = waitForVerdict(caseId, attempt);
    await relay.post(relay.repair, { type: "repair.proposed", caseId, attempt, headCommit: commit, diffRef: diff }, `I have a fix for ${caseId}. Please verify it.`);
    const { decision, reason, after, regression } = await pending;
    await patchCase(caseId, {
      status: decision === "accept" ? "repaired" : "investigating",
      after,
      regression,
      verifier: { decision, reason, at: new Date().toISOString() },
    });
    return { ...inputData, accepted: decision === "accept", feedback: decision === "accept" ? null : reason };
  },
});

const attemptRepair = createWorkflow({ id: "attempt-repair", inputSchema: state, outputSchema: state })
  .then(repair)
  .then(verification)
  .commit();

const openPr = createStep({
  id: "open-pr",
  description: "Open a PR for a person to review, or escalate to the team's engineering agent.",
  inputSchema: state,
  outputSchema: z.object({ caseId: z.string(), outcome: z.string() }),
  execute: async ({ inputData }) => {
    const { caseId, attempt, accepted, feedback, repo, repoDir, commit, diff, change } = inputData;
    await sandboxes.get(caseId)?.destroy();
    sandboxes.delete(caseId);
    if (!accepted) {
      const relay = await getRelay();
      const reason = feedback ?? "The repair was not accepted.";
      await relay.post(relay.observer, { type: "escalation.needed", caseId, attempt, reason }, `I could not fix ${caseId} safely. A person should look.`);
      await patchCase(caseId, { status: "escalated", headline: "This one needs a person.", explanation: reason });
      return { caseId, outcome: "escalated" };
    }
    const pr = await openPullRequest({
      repoDir,
      repo,
      base: commit,
      caseId,
      diff,
      title: `Fix adapter for supplier change: ${change.fieldPath}`,
      body: `Agent Smith found that this supplier change affects the app.\n\n${change.summary}\n\nThe same test failed before and passes after, and a separate verifier accepted it.\n\nA person must review this before merging.`,
    });
    await patchCase(caseId, {
      status: "awaiting_approval",
      pr,
      headline: "The fix is ready for your review.",
      approval: { state: "pending", by: "", at: "" },
    });
    return { caseId, outcome: pr.url };
  },
});

const notAffected = createStep({
  id: "record-not-affected",
  description: "The app does not read what changed, so there is nothing to do.",
  inputSchema: state.extend({ affected: z.boolean() }),
  outputSchema: z.object({ caseId: z.string(), outcome: z.string() }),
  execute: async ({ inputData }) => ({ caseId: inputData.caseId, outcome: "not_affected" }),
});

const repairFlow = createWorkflow({
  id: "repair-flow",
  inputSchema: state.extend({ affected: z.boolean() }),
  outputSchema: z.object({ caseId: z.string(), outcome: z.string() }),
})
  .then(reproduce)
  .dountil(attemptRepair, async ({ inputData }) => (inputData as State).accepted || (inputData as State).attempt >= MAX_ATTEMPTS)
  .then(openPr)
  .commit();

export const investigate = createWorkflow({
  id: "investigate-change",
  description: "From a detected supplier change to a verified PR.",
  inputSchema: input,
  outputSchema: z.any(),
})
  .then(checkApplicability)
  .branch([
    [async ({ inputData }) => inputData.affected, repairFlow],
    [async ({ inputData }) => !inputData.affected, notAffected],
  ])
  .commit();
