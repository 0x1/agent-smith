import { Actor, Persisted, Emittable } from "durable-actors"
import { makeCaseId, type WatcherState } from "../../contracts/case.ts"
import { Case } from "./case.ts"
import { buildChange, describe, diffShapes, flatten, isEmptyDiff, type Shape } from "./shape.ts"

export type WatchOptions = { repo?: string; provider?: string; endpoint?: string }

type Config = {
    baseUrl: string
    sku: string
    everyMs: number
    repo: string
    provider: string
    endpoint: string
}

// WatcherState from the contract plus what `web/` needs for the structure history.
export type WatcherView = WatcherState & {
    watching: { baseUrl: string; sku: string; everyMs: number } | null
    shape: Shape | null
    history: { at: string; shape: Shape; caseId: string | null }[]
    lastError: string | null
    nextProbeAt: string | null
}

const DEFAULTS = { repo: "agent-smith-demo", provider: "supplier", endpoint: "GET /v1/inventory/{sku}" }

// One watcher per endpoint, for example `supplier.get-inventory`. It probes on
// its alarm and on demand, and opens a case for every change it sees.
export class EndpointWatcher extends Actor {
    @Persisted private config: Config | null = null
    @Persisted private baseline: Shape | null = null
    @Persisted @Emittable public state: WatcherView = {
        endpoint: "",
        lastProbeAt: null,
        lastChangeAt: null,
        probeCount: 0,
        savedAt: new Date().toISOString(),
        pid: process.pid,
        caseIds: [],
        watching: null,
        shape: null,
        history: [],
        lastError: null,
        nextProbeAt: null,
    }

    // Alarms do not survive a server restart, but state does. Every method calls
    // this, so any call (for example `read()` from scripts/rearm.ts) resumes probes.
    #ensureAlarm() {
        if (!this.config) return
        const next = this.alarm.get()
        if (next == null || next < Date.now()) this.#armNext()
    }

    #armNext() {
        if (!this.config) return
        const at = Date.now() + this.config.everyMs
        this.alarm.set(at)
        this.#save({ nextProbeAt: new Date(at).toISOString() })
    }

    #save(partial: Partial<WatcherView>) {
        this.state = { ...this.state, ...partial, pid: process.pid, savedAt: new Date().toISOString() }
    }

    async watch(baseUrl: string, sku: string, everyMs = 5000, opts: WatchOptions = {}): Promise<WatcherView> {
        this.config = { baseUrl: baseUrl.replace(/\/+$/, ""), sku, everyMs, ...DEFAULTS, ...opts }
        this.#save({ endpoint: this.config.endpoint, watching: { baseUrl: this.config.baseUrl, sku, everyMs } })
        this.#armNext()
        return this.state
    }

    async stop(): Promise<WatcherView> {
        this.alarm.delete()
        this.config = null
        this.#save({ watching: null, nextProbeAt: null })
        return this.state
    }

    // Forget the saved structure and the case list, for demo reruns. Cases
    // themselves are not deleted. The next probe saves a new baseline.
    async reset(): Promise<WatcherView> {
        this.baseline = null
        this.#save({ shape: null, history: [], caseIds: [], lastChangeAt: null, lastError: null })
        this.#ensureAlarm()
        return this.state
    }

    async probeNow(): Promise<WatcherView> {
        this.#ensureAlarm()
        await this.#probe()
        return this.state
    }

    async read(): Promise<WatcherView> {
        this.#ensureAlarm()
        return this.state
    }

    // Alias of read(). `agent/src/serve.ts` calls this name.
    async getState(): Promise<WatcherView> {
        this.#ensureAlarm()
        return this.state
    }

    async onAlarm() {
        // Set the next alarm first: if the work below throws, the alarm is not retried.
        this.#armNext()
        try {
            await this.#probe()
        } catch (e) {
            this.#save({ lastError: String(e) })
        }
    }

    async #probe() {
        const cfg = this.config
        if (!cfg) throw new Error(`watcher ${this.id} has no config; call watch first`)
        const now = new Date().toISOString()
        let shape: Shape
        try {
            const res = await fetch(`${cfg.baseUrl}/v1/inventory/${encodeURIComponent(cfg.sku)}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            shape = flatten(await res.json())
        } catch (e) {
            this.#save({ probeCount: this.state.probeCount + 1, lastProbeAt: now, lastError: `probe failed: ${e}` })
            return
        }
        const probeCount = this.state.probeCount + 1

        if (!this.baseline) {
            this.baseline = shape
            this.#save({ probeCount, lastProbeAt: now, lastError: null, shape, history: [{ at: now, shape, caseId: null }] })
            return
        }

        const diff = diffShapes(this.baseline, shape)
        if (isEmptyDiff(diff)) {
            this.#save({ probeCount, lastProbeAt: now, lastError: null })
            return
        }

        const change = buildChange(diff, { provider: cfg.provider, endpoint: cfg.endpoint, sourceRef: await this.#sourceRef(cfg) })!
        const caseId = makeCaseId(cfg.repo, cfg.provider, cfg.endpoint, change.fieldPath)
        await Case.get(caseId).create({
            ...change,
            ...describe(diff),
            signal: { eventId: `${this.id}:probe-${probeCount}`, source: `watcher:${this.id}`, at: now },
        })
        this.baseline = shape
        this.#save({
            probeCount,
            lastProbeAt: now,
            lastChangeAt: now,
            lastError: null,
            shape,
            history: [...this.state.history, { at: now, shape, caseId }],
            caseIds: this.state.caseIds.includes(caseId) ? this.state.caseIds : [...this.state.caseIds, caseId],
        })
    }

    // The supplier's newest migration note, or the changelog index if it has none.
    async #sourceRef(cfg: Config): Promise<string> {
        try {
            const res = await fetch(`${cfg.baseUrl}/changelog`)
            const notes = (await res.json()) as { ref?: string }[]
            const ref = notes.at(-1)?.ref
            if (ref) return `${cfg.baseUrl}${ref}`
        } catch {}
        return `${cfg.baseUrl}/changelog`
    }
}
