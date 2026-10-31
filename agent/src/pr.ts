import { execFileSync } from "node:child_process";

function git(repoDir: string, args: string[], input?: string, env?: NodeJS.ProcessEnv): string {
  return execFileSync("git", ["-C", repoDir, ...args], { input, encoding: "utf8", env: { ...process.env, ...env } });
}

export interface PullRequest {
  number: number;
  url: string;
}

// Runs here, not in the VM, so the token never reaches the code under repair.
export async function openPullRequest(input: {
  repoDir: string;
  repo: string;
  base: string;
  caseId: string;
  diff: string;
  title: string;
  body: string;
}): Promise<PullRequest> {
  const token = process.env.AGENT_SMITH_GITHUB_TOKEN;
  if (!token) throw new Error("AGENT_SMITH_GITHUB_TOKEN is not set");
  const branch = `agent-smith/${input.caseId.split(".").slice(-1)[0]}-${Date.now()}`;
  const previous = git(input.repoDir, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  // In the environment, not the arguments, because failed commands print their arguments.
  const auth = {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
  };
  try {
    git(input.repoDir, ["checkout", "-q", "-b", branch, input.base]);
    git(input.repoDir, ["apply", "--index", "-"], input.diff);
    git(input.repoDir, ["-c", "user.name=agent-smith", "-c", "user.email=agent-smith@local", "commit", "-qm", input.title]);
    git(input.repoDir, ["push", "-q", "https://github.com/" + input.repo, branch], undefined, auth);
  } finally {
    git(input.repoDir, ["checkout", "-q", previous]);
  }
  const res = await fetch(`https://api.github.com/repos/${input.repo}/pulls`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
    body: JSON.stringify({ title: input.title, body: input.body, head: branch, base: "main" }),
  });
  if (!res.ok) throw new Error(`opening the PR failed: ${res.status}`);
  const pr = (await res.json()) as { number: number; html_url: string };
  return { number: pr.number, url: pr.html_url };
}
