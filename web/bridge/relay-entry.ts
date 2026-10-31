import { parseRelayMessage } from "../../contracts/relay.ts";
import type { RelayEntry } from "../shared/stream.ts";

// The subset of an Agent Relay SDK message the bridge reads.
export interface ObservedMessage {
  id?: string;
  messageId?: string;
  text?: string;
  from?: { name?: string };
  createdAt?: string;
  threadId?: string;
}

// Text that isn't a `RelayMessage` is kept with `parsed: null`, so the page can show it raw.
export function toEntry(message: ObservedMessage, receivedAt: string): RelayEntry | null {
  const id = message.messageId ?? message.id;
  if (!id || typeof message.text !== "string") return null;
  const parsed = parseRelayMessage(message.text);
  return {
    id,
    from: message.from?.name ?? "",
    at: parsed?.at ?? message.createdAt ?? receivedAt,
    text: message.text,
    parsed,
    threadId: message.threadId,
  };
}

export function findObserverToken(cliOutput: string): string | null {
  return cliOutput.match(/ot_[A-Za-z0-9_-]+/)?.[0] ?? null;
}
