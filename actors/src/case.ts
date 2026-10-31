import { Actor, Persisted, Emittable } from "durable-actors"
import type { Case as CaseRecord, Change, Signal } from "../../contracts/case.ts"

// What the watcher (or anyone) passes to open a case: the full change plus the
// plain-language text for people. `signal` is the sighting that opened it.
export type CaseInit = Change & {
    headline: string
    explanation: string
    signal?: Signal
    testCommand?: string
    baseCommit?: string
}

export type SignalResult = { attached: boolean; state: CaseRecord | null }

// One case per detected change. The ID comes from `makeCaseId`, so the same
// change to the same repo always lands on the same actor.
export class Case extends Actor {
    @Persisted @Emittable public state: CaseRecord | null = null

    #ensureTables() {
        this.db.exec("CREATE TABLE IF NOT EXISTS seen_events (event_id TEXT PRIMARY KEY, at TEXT NOT NULL)")
    }

    // Records the event ID. Returns false when it was already seen.
    #markSeen(signal: Signal): boolean {
        this.#ensureTables()
        const rows = this.db.exec<{ event_id: string }>(
            "INSERT INTO seen_events (event_id, at) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING event_id",
            signal.eventId,
            signal.at,
        )
        return rows.length > 0
    }

    // Idempotent. A second call for an existing case attaches the signal instead
    // of resetting anything.
    async create(init: CaseInit): Promise<CaseRecord> {
        const signal = init.signal ?? {
            eventId: `${init.provider}:${init.endpoint}:${init.fieldPath}:${init.changeKind}`,
            source: "create",
            at: new Date().toISOString(),
        }
        if (this.state) {
            await this.addSignal(signal)
            return this.state
        }
        const fresh = this.#markSeen(signal)
        const { headline, explanation, testCommand, baseCommit, signal: _s, ...change } = init
        this.state = {
            caseId: this.id,
            status: "detected",
            headline,
            explanation,
            change: {
                provider: change.provider,
                endpoint: change.endpoint,
                changeKind: change.changeKind,
                fieldPath: change.fieldPath,
                shapeDiff: change.shapeDiff,
                summary: change.summary,
                sourceRef: change.sourceRef,
            },
            signals: fresh ? [signal] : [],
            verdict: null,
            callSite: null,
            attempt: 0,
            baseCommit: baseCommit ?? "",
            headCommit: "",
            testCommand: testCommand ?? "",
            before: null,
            after: null,
            regression: null,
            verifier: null,
            pr: null,
            approval: { state: "pending", by: "", at: "" },
            // `proof` is being added to the contract on cto-1/wire-watcher. Spread so
            // this compiles both before and after that lands.
            ...{ proof: null },
        }
        return this.state
    }

    // Shallow merge of top-level keys. `caseId` cannot change.
    async patch(partial: Partial<CaseRecord>): Promise<CaseRecord> {
        if (!this.state) throw new Error(`case ${this.id} does not exist; call create first`)
        const { caseId: _ignored, ...rest } = partial ?? {}
        this.state = { ...this.state, ...rest, caseId: this.state.caseId }
        return this.state
    }

    // An exact repeat (same eventId) is ignored; a new sighting attaches.
    async addSignal(signal: Signal): Promise<SignalResult> {
        if (!this.state) throw new Error(`case ${this.id} does not exist; call create first`)
        if (!this.#markSeen(signal)) return { attached: false, state: this.state }
        this.state = { ...this.state, signals: [...this.state.signals, signal] }
        return { attached: true, state: this.state }
    }

    // Forget the case and every seen event, so the next create() starts fresh at
    // `detected` with attempt 0. Used between demo runs: case IDs are
    // deterministic, so without this a rehearsal case comes back already approved.
    async reset(): Promise<{ caseId: string; wasStatus: string | null }> {
        const wasStatus = this.state?.status ?? null
        this.#ensureTables()
        this.db.exec("DELETE FROM seen_events")
        this.state = null
        return { caseId: this.id, wasStatus }
    }

    async read(): Promise<CaseRecord | null> {
        return this.state
    }

    // Alias of read(). `agent/src/serve.ts` calls this name.
    async get(): Promise<CaseRecord | null> {
        return this.state
    }
}
