// Calls one actor method over the HTTP invoke API and prints the result.
// Usage: bun scripts/invoke.ts <Class> <id> <method> [jsonArg ...]
// Example: bun scripts/invoke.ts Case my-case read
export const ACTORS_URL = process.env.ACTORS_URL ?? "http://127.0.0.1:7100"
export const PROJECT = process.env.DURABLE_ACTORS_PROJECT_ID ?? "local"

export async function invoke<T = unknown>(cls: string, id: string, method: string, args: unknown[] = []): Promise<T> {
    const res = await fetch(`${ACTORS_URL}/v1/projects/${PROJECT}/actors/${cls}/${encodeURIComponent(id)}/invoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), method, args }),
    })
    const body = (await res.json()) as { outcome?: { type: string; result?: T; error?: unknown } }
    if (!res.ok || body.outcome?.type !== "completed") {
        throw new Error(`${cls}/${id}.${method} failed: HTTP ${res.status} ${JSON.stringify(body)}`)
    }
    return body.outcome.result as T
}

if (import.meta.main) {
    const [cls, id, method, ...rest] = process.argv.slice(2)
    if (!cls || !id || !method) {
        console.error("usage: bun scripts/invoke.ts <Class> <id> <method> [jsonArg ...]")
        process.exit(2)
    }
    const out = await invoke(cls, id, method, rest.map((a) => JSON.parse(a)))
    console.log(JSON.stringify(out, null, 2))
}
