// A read-only Agent Relay observer. It replays the workspace's history, then streams.
import { existsSync, readFileSync } from "node:fs";
import { config } from "./config.ts";
import { type Hub, log } from "./hub.ts";
import { findObserverToken, toEntry } from "./relay-entry.ts";

const { relay } = config;

async function observerToken(workspaceKey: string): Promise<string> {
  if (relay.observerToken) return relay.observerToken;
  const proc = Bun.spawn(["npx", "relay", "observer", "--json"], {
    cwd: existsSync(relay.agentDir) ? relay.agentDir : undefined,
    env: { ...process.env, RELAY_WORKSPACE_KEY: workspaceKey, RELAY_BASE_URL: relay.url },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  await proc.exited;
  const token = findObserverToken(out);
  if (!token) throw new Error(`no observer token from \`npx relay observer --json\`: ${(out || err).slice(0, 160)}`);
  return token;
}

const reachable = () => fetch(relay.url).then(() => true, () => false);

export async function startRelay(hub: Hub) {
  for (;;) {
    try {
      if (!existsSync(relay.keyFile)) throw new Error(`no workspace key at ${relay.keyFile}; start agent/ first`);
      const { workspaceKey } = JSON.parse(readFileSync(relay.keyFile, "utf8")) as { workspaceKey: string };
      const token = await observerToken(workspaceKey);
      const { AgentRelay } = await import("@agent-relay/sdk");
      const client = new AgentRelay({
        observerToken: token,
        workspaceKey,
        baseUrl: relay.url,
        onError: (err: unknown) => hub.setStatus("relay", "down", String(err).slice(0, 160)),
      });
      client.addListener("*", (event) => {
        if (!("message" in event)) return;
        const entry = toEntry(event.message, new Date().toISOString());
        if (entry) hub.putMessage(entry);
      });
      hub.setStatus("relay", "live");
      log("relay: observing");
      // The SDK reconnects its own stream; this only reports the local server's health.
      for (;;) {
        await Bun.sleep(3000);
        if (await reachable()) hub.setStatus("relay", "live");
        else hub.setStatus("relay", "down", `${relay.url} not answering`);
      }
    } catch (err) {
      hub.setStatus("relay", hub.sources.relay.lastDataAt ? "down" : "connecting", String(err).slice(0, 200));
      await Bun.sleep(5000);
    }
  }
}
