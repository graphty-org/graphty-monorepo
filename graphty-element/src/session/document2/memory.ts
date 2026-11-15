/**
 * @file What the version 2 framing and codecs remember of one session between an open and the next
 * save, forgotten at every project boundary: a version 1 open, a replacing load, the graph
 * cleared, a different source. A replacing load keeps the data id (spec 3.3). Experimental
 * (`save-files-v2`).
 */

import { type BoundaryReason, onProjectBoundary } from "../project/boundary";

/** What one memory keeps of a session across a boundary, or undefined to forget it all. */
type Keep = (value: unknown, reason: BoundaryReason) => unknown;

const MEMORIES: { readonly memory: WeakMap<object, unknown>; readonly keep?: Keep }[] = [];
const WATCHED = new WeakSet();
/** Sessions inside a version 2 open, which forgets for itself when it replaces the project. */
const OPENING = new WeakSet();

/**
 * A per-session memory that is forgotten at the session's next project boundary.
 * @param keep - What it keeps across a boundary of a given reason; nothing when absent.
 * @returns The map.
 */
export function projectMemory<V>(keep?: (value: V, reason: BoundaryReason) => V | undefined): WeakMap<object, V> {
    const memory = new WeakMap<object, V>();
    MEMORIES.push({
        memory,
        ...(keep === undefined ? {} : { keep: keep as Keep }),
    });
    return memory;
}

/**
 * Forget everything the version 2 framing and codecs remember of a session, but what a memory
 * keeps across a boundary of this reason.
 * @param session - The session.
 * @param reason - The boundary crossed; none forgets everything.
 */
export function forgetDocument(session: object, reason?: BoundaryReason): void {
    for (const { memory, keep } of MEMORIES) {
        const value = memory.get(session);
        const kept =
            reason === undefined || keep === undefined || value === undefined ? undefined : keep(value, reason);
        if (kept === undefined) {
            memory.delete(session);
        } else {
            memory.set(session, kept);
        }
    }
}

/**
 * Forget a session's memories at each of its project boundaries from now on.
 * @param session - The session.
 */
export function watchBoundaries(session: object): void {
    if (WATCHED.has(session)) {
        return;
    }

    WATCHED.add(session);
    onProjectBoundary(session, (reason) => {
        if (!OPENING.has(session)) {
            forgetDocument(session, reason);
        }
    });
}

/**
 * Run a version 2 open: the boundaries its own commands cross (its data cleared, its sources set)
 * do not forget what it is reading; it forgets itself when it replaces the project.
 * @param session - The session.
 * @param open - The open.
 * @returns What the open returns.
 */
export async function whileOpening<T>(session: object, open: () => Promise<T>): Promise<T> {
    watchBoundaries(session);
    OPENING.add(session);
    try {
        return await open();
    } finally {
        OPENING.delete(session);
    }
}
