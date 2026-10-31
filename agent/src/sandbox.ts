import { execFileSync } from "node:child_process";
import { Freestyle, type Vm } from "freestyle";

const APP_DIR = "/home/ubuntu/app";
const PATH = "/home/ubuntu/.tools/node_modules/.bin:/usr/local/nvm/versions/node/v26.13.0/bin:/usr/local/bin:/usr/bin:/bin";

// Outbound HTTPS and DNS only, for dependency installs. No keys enter the VM.
const FIREWALL = {
  rules: [
    { action: "allow", source: {}, destination: { public: true, port: 443, protocol: "tcp" } },
    { action: "allow", source: {}, destination: { public: true, port: 53, protocol: "udp" } },
  ],
} as const;

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export class Sandbox {
  constructor(private readonly vm: Vm) {}

  async run(command: string, timeoutMs = 120_000): Promise<CommandResult> {
    const r = await this.vm.exec({
      command: `cd ${APP_DIR} && ${command}`,
      timeoutMs,
      env: { PATH, CI: "true" },
    });
    return { exitCode: r.statusCode ?? null, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  }

  readFile(path: string): Promise<string> {
    return this.vm.fs.readTextFile(`${APP_DIR}/${path}`);
  }

  writeFile(path: string, content: string): Promise<void> {
    return this.vm.fs.writeTextFile(`${APP_DIR}/${path}`, content);
  }

  destroy(): Promise<void> {
    return this.vm.delete();
  }
}

async function must(result: Promise<CommandResult>, label: string): Promise<CommandResult> {
  const r = await result;
  if (r.exitCode !== 0) throw new Error(`${label} failed: ${(r.stderr || r.stdout).slice(-500)}`);
  return r;
}

// A fresh VM holding the repo at `commit`, with dependencies installed and a
// clean git baseline, so `git diff` shows exactly what changed in the VM.
export async function openSandbox(repoDir: string, commit: string): Promise<Sandbox> {
  const freestyle = new Freestyle();
  const { vm } = await freestyle.vms.create({ firewall: FIREWALL as never });
  const sandbox = new Sandbox(vm);
  try {
    const archive = execFileSync("git", ["-C", repoDir, "archive", "--format=tar.gz", commit]);
    await vm.exec({ command: `mkdir -p ${APP_DIR}` });
    await vm.fs.writeFile(`${APP_DIR}/.src.tgz`, archive);
    await must(
      sandbox.run(
        "tar xzf .src.tgz && rm .src.tgz && npm i --silent --prefix ~/.tools pnpm@12 && pnpm install --frozen-lockfile --silent --config.strictDepBuilds=false" +
          " && git init -q && git add -A && git -c user.name=agent-smith -c user.email=agent-smith@local commit -qm base",
        240_000,
      ),
      "sandbox setup",
    );
    return sandbox;
  } catch (error) {
    await vm.delete();
    throw error;
  }
}
