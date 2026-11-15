/**
 * @file What the version 2 framing and codecs remember of one session between an open and the next
 * save, forgotten at every project boundary: a version 1 open, a replacing load, the graph
 * cleared, a different source (spec 3.3: the data id is replaced with the data). Experimental
 * (`save-files-v2`).
 */

import { onProjectBoundary } from "../project/boundary";

const MEMORIES: WeakMap<object, unknown>[] = [];
const WATCHED = new WeakSet();
/** Sessions inside a version 2 open, which forgets for itself when it replaces the project. */
const OPENING = new WeakSet();

/**
 * A per-session memory that is forgotten at the session's next project boundary.
 * @returns The map.
 */
export function projectMemory<V>(): WeakMap<object, V> {
    const memory = new WeakMap<object, V>();
    MEMORIES.push(memory);
    return memory;
}

/**
 * Forget everything the version 2 framing and codecs remember of a session.
 * @param session - The session.
 */
export function forgetDocument(session: object): void {
    for (const memory of MEMORIES) {
        memory.delete(session);
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
    onProjectBoundary(session, () => {
        if (!OPENING.has(session)) {
            forgetDocument(session);
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
