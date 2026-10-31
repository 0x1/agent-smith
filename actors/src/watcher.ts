import { Actor, Persisted, Emittable } from "durable-actors"
import { makeCaseId, type WatcherState } from "../../contracts/case.ts"
import { Case } from "./case.ts"
import { buildChange, describe, diffShapes, flatten, isEmptyDiff, splitDiff, type Shape } from "./shape.ts"

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
    baseline: Shape | null
    history: { at: string; shape: Shape; caseId: string | null; caseIds: string[] }[]
    lastError: string | null
    nextProbeAt: string | null
}

const DEFAULTS = { repo: "agent-smith-demo", provider: "supplier", endpoint: "GET /v1/inventory/{sku}" }

// One watcher per endpoint, for example `supplier.get-inventory`. It probes on
// its alarm and on demand, and opens a case for every change it sees.
export class EndpointWatcher extends Actor {
    @Persisted private config: Config | null = null
    // The structure the app was built against: the first probe, or the first
    // probe after reset(). Every difference is measured from here, so a supplier
    // that moves v2 -> v1.1 is compared with v1, not with v2.
    @Persisted private baseline: Shape | null = null
    // The last structure seen, so only a new structure opens or re-signals cases.
    @Persisted private lastShape: Shape | null = null
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
        baseline: null,
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

    // Clean slate for a demo rerun: resets every case this watcher opened, plus
    // any `extraCaseIds` (for cases opened before Case.reset existed), then
    // forgets the saved structure and the case list. The next probe saves a new
    // baseline, and the same change opens its case again at `detected`.
    async reset(extraCaseIds: string[] = []): Promise<WatcherView & { resetCases: { caseId: string; wasStatus: string | null }[] }> {
        const ids = [...new Set([...this.state.caseIds, ...extraCaseIds])]
        const resetCases = []
        for (const id of ids) resetCases.push(await Case.get(id).reset())
        this.baseline = null
        this.lastShape = null
        this.#save({ shape: null, baseline: null, history: [], caseIds: [], lastChangeAt: null, lastError: null })
        this.#ensureAlarm()
        return { ...this.state, resetCases }
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

        if (!this.baseline || !this.lastShape) {
            this.baseline = shape
            this.lastShape = shape
            this.#save({ probeCount, lastProbeAt: now, lastError: null, shape, baseline: shape, history: [{ at: now, shape, caseId: null, caseIds: [] }] })
            return
        }

        if (isEmptyDiff(diffShapes(this.lastShape, shape))) {
            this.#save({ probeCount, lastProbeAt: now, lastError: null })
            return
        }
        this.lastShape = shape

        const groups = splitDiff(diffShapes(this.baseline, shape), shape)
        const sourceRef = groups.length ? await this.#sourceRef(cfg) : ""
        const opened: string[] = []
        for (const group of groups) {
            const change = buildChange(group, { provider: cfg.provider, endpoint: cfg.endpoint, sourceRef })!
            const caseId = makeCaseId(cfg.repo, cfg.provider, cfg.endpoint, change.fieldPath)
            await Case.get(caseId).create({
                ...change,
                ...describe(group),
                signal: { eventId: `${this.id}:probe-${probeCount}`, source: `watcher:${this.id}`, at: now },
            })
            opened.push(caseId)
        }
        // A structure back to the baseline opens nothing, but is still recorded.
        this.#save({
            probeCount,
            lastProbeAt: now,
            lastChangeAt: opened.length ? now : this.state.lastChangeAt,
            lastError: null,
            shape,
            history: [...this.state.history, { at: now, shape, caseId: opened[0] ?? null, caseIds: opened }],
            caseIds: [...this.state.caseIds, ...opened.filter((id) => !this.state.caseIds.includes(id))],
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
