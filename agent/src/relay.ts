import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentRelay } from "@agent-relay/sdk";
import { AGENT_NAMES, REPAIR_CHANNEL, type RelayMessage } from "../../contracts/relay.ts";

const BASE_URL = process.env.RELAY_BASE_URL ?? "http://127.0.0.1:8787";
// The workspace key is local to this machine. `web/` reads it for its observer.
const KEY_FILE = join(import.meta.dirname, "..", ".relay-workspace.json");

async function connect(): Promise<AgentRelay> {
  if (existsSync(KEY_FILE)) {
    const { workspaceKey } = JSON.parse(readFileSync(KEY_FILE, "utf8"));
    return new AgentRelay({ workspaceKey, baseUrl: BASE_URL });
  }
  const relay = await AgentRelay.createWorkspace({ name: "agent-smith", baseUrl: BASE_URL });
  writeFileSync(KEY_FILE, JSON.stringify({ workspaceKey: relay.workspaceKey, baseUrl: BASE_URL }));
  return relay;
}

type Client = Awaited<ReturnType<AgentRelay["workspace"]["register"]>>;

export interface Relay {
  post(from: Client, message: RelayMessage, text: string): Promise<string>;
  reply(from: Client, messageId: string, message: RelayMessage, text: string): Promise<void>;
  on(type: RelayMessage["type"], handler: (message: RelayMessage, messageId: string) => void): void;
  repair: Client;
  verifier: Client;
  observer: Client;
}

let shared: Promise<Relay> | null = null;

async function open(): Promise<Relay> {
  const relay = await connect();
  const [observer, repair, verifier] = await Promise.all(
    [AGENT_NAMES.observer, AGENT_NAMES.repair, AGENT_NAMES.verifier].map((name) =>
      relay.workspace.register({ name, type: "agent" }),
    ),
  );
  await observer.channels.create({ name: REPAIR_CHANNEL, topic: "Repairs and verification" }).catch(() => {});
  await Promise.all([observer, repair, verifier].map((c) => c.channels.join(REPAIR_CHANNEL)));

  return {
    repair,
    verifier,
    observer,
    async post(from, message, text) {
      const { messageId } = await from.sendMessage({ to: `#${REPAIR_CHANNEL}`, text, metadata: message } as never);
      return messageId;
    },
    async reply(from, messageId, message, text) {
      await from.reply({ messageId, text, metadata: message } as never);
    },
    on(type, handler) {
      relay.addListener("message.created", ({ message }: { message: { messageId: string; metadata?: RelayMessage } }) => {
        if (message.metadata?.type === type) handler(message.metadata, message.messageId);
      });
      relay.addListener("thread.reply" as never, ((event: { message?: { messageId: string; metadata?: RelayMessage } }) => {
        const message = event.message;
        if (message?.metadata?.type === type) handler(message.metadata, message.messageId);
      }) as never);
    },
  };
}

export function getRelay(): Promise<Relay> {
  return (shared ??= open());
}
