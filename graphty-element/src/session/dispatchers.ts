/**
 * Each session's dispatcher, kept apart from GraphSession so a module that only needs to reach a
 * session's dispatcher (the AI entry) does not statically load the whole session.
 */
import { GraphtyError } from "../errors";
import type { Dispatcher } from "./project/Dispatcher";
import type { GraphSession } from "./types";

/** Each session's dispatcher, for the element's own tests; see {@link dispatcherOf}. */
export const DISPATCHERS = new WeakMap<GraphSession, Dispatcher>();

/**
 * The dispatcher behind a session. Not published: the element's own tests spy on it and read the
 * project state it holds.
 * @param session - A session this module built.
 * @returns Its dispatcher.
 */
export function dispatcherOf(session: GraphSession): Dispatcher {
    const dispatcher = DISPATCHERS.get(session);
    if (dispatcher === undefined) {
        throw new GraphtyError({ code: "E_INTERNAL", message: "That session was not built here.", source: "history" });
    }

    return dispatcher;
}
