import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentRelay } from "@agent-relay/sdk";
import { AGENT_NAMES, parseRelayMessage, REPAIR_CHANNEL, type RelayMessage } from "../../contracts/relay.ts";

const BASE_URL = process.env.RELAY_BASE_URL ?? "http://127.0.0.1:8787";
// The workspace key is local to this machine. `web/` reads it for its observer.
const KEY_FILE = join(import.meta.dirname, "..", ".relay-workspace.json");

interface Saved {
  workspaceKey: string;
  baseUrl: string;
  tokens: Record<string, string>;
}

function load(): Saved | null {
  return existsSync(KEY_FILE) ? JSON.parse(readFileSync(KEY_FILE, "utf8")) : null;
}

type Client = Extract<Awaited<ReturnType<AgentRelay["workspace"]["register"]>>, { sendMessage: unknown }>;

export interface Relay {
  post(from: Client, message: RelayMessage): Promise<string>;
  reply(from: Client, messageId: string, message: RelayMessage): Promise<void>;
  on(type: RelayMessage["type"], handler: (message: RelayMessage, messageId: string) => void): void;
  repair: Client;
  verifier: Client;
  observer: Client;
}

let shared: Promise<Relay> | null = null;

async function open(): Promise<Relay> {
  const saved = load();
  const relay = saved
    ? new AgentRelay({ workspaceKey: saved.workspaceKey, baseUrl: BASE_URL })
    : await AgentRelay.createWorkspace({ name: "agent-smith", baseUrl: BASE_URL });
  const tokens: Record<string, string> = saved?.tokens ?? {};
  // A name can only be registered once, so later runs reconnect with its token.
  const client = async (name: string): Promise<Client> => {
    if (tokens[name]) return (await relay.workspace.reconnect({ apiToken: tokens[name] })) as Client;
    const registered = (await relay.workspace.register({ name, type: "agent" })) as Client;
    tokens[name] = registered.token ?? "";
    return registered;
  };
  const observer = await client(AGENT_NAMES.observer);
  const repair = await client(AGENT_NAMES.repair);
  const verifier = await client(AGENT_NAMES.verifier);
  writeFileSync(KEY_FILE, JSON.stringify({ workspaceKey: relay.workspaceKey, baseUrl: BASE_URL, tokens }));
  await observer.channels.create({ name: REPAIR_CHANNEL, topic: "Repairs and verification" }).catch(() => {});
  await Promise.all([observer, repair, verifier].map((c) => c.channels.join(REPAIR_CHANNEL)));

  return {
    repair,
    verifier,
    observer,
    async post(from, message) {
      const { messageId } = await from.sendMessage({ to: `#${REPAIR_CHANNEL}`, text: JSON.stringify(message) });
      return messageId;
    },
    async reply(from, messageId, message) {
      await from.reply({ messageId, text: JSON.stringify(message) });
    },
    on(type, handler) {
      relay.addListener("message.created", ({ message }: { message: { messageId: string; text: string } }) => {
        const parsed = parseRelayMessage(message.text);
        if (parsed?.type === type) handler(parsed, message.messageId);
      });
    },
  };
}

export function getRelay(): Promise<Relay> {
  return (shared ??= open());
}
