import { AgentRelay } from "@agent-relay/sdk";

const relay = await AgentRelay.createWorkspace({ name: "agent-smith", baseUrl: "http://localhost:8787" });
console.log("key present:", Boolean(relay.workspaceKey));
const repair = await relay.workspace.register({ name: "smith-repair", type: "agent" });
const verifier = await relay.workspace.register({ name: "smith-verifier", type: "agent" });
await repair.channels.create({ name: "agent-smith-repairs", topic: "repairs" });
await repair.channels.join("agent-smith-repairs");
await verifier.channels.join("agent-smith-repairs");
const got = new Promise<any>((resolve) => relay.addListener("message.created", (e: any) => resolve(e)));
const { messageId } = await repair.sendMessage({ to: "#agent-smith-repairs", text: "Patch ready", metadata: { type: "repair.proposed" } } as never);
const e = await Promise.race([got, new Promise((r) => setTimeout(() => r("listener timeout"), 5000))]);
console.log("event:", JSON.stringify(e).slice(0, 300));
await verifier.reply({ messageId, text: "Accepted" });
const thread = await repair.threads.get(messageId, { limit: 10 });
console.log("thread:", JSON.stringify(thread).slice(0, 400));
process.exit(0);
