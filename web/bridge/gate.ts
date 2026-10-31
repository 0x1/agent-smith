// Pure decisions about incoming actor frames, kept apart from the sockets so
// they can be tested directly.

export interface Seen {
  version: number;
  pid: number | null;
  probeCount: number;
}

export interface WatcherFrame {
  version: number;
  pid: number;
  probeCount: number;
  // True for the first frame on a new socket after an earlier one closed.
  reconnected: boolean;
}

export interface WatcherVerdict {
  accept: boolean;
  restart: { oldPid: number; newPid: number; intact: boolean } | null;
}

// Drop any frame older than one already seen. The one exception: the first frame
// after a reconnect from a new process, whose version counter may have restarted.
export function gateWatcher(prev: Seen | null, next: WatcherFrame): WatcherVerdict {
  if (!prev) return { accept: true, restart: null };
  const pidChanged = prev.pid !== null && next.pid !== prev.pid;
  if (next.version < prev.version && !(next.reconnected && pidChanged)) return { accept: false, restart: null };
  const restart = pidChanged
    ? { oldPid: prev.pid as number, newPid: next.pid, intact: next.probeCount >= prev.probeCount }
    : null;
  return { accept: true, restart };
}

export function gateCase(prevVersion: number | undefined, version: number, reconnected: boolean): boolean {
  return prevVersion === undefined || version >= prevVersion || reconnected;
}

// Terse frames carry the actor's emittable fields. Our actors keep their record
// in a field called `state`, so a frame is `{ state: { state: record } }`.
export function unwrapState<T>(frameState: unknown): T | null {
  if (frameState && typeof frameState === "object" && "state" in frameState) {
    return ((frameState as { state: T | null }).state ?? null) as T | null;
  }
  return (frameState ?? null) as T | null;
}

export function nextDelay(current: number): number {
  return Math.min(current * 2, 2000);
}
export const FIRST_DELAY = 250;
