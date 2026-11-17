/**
 * Each session's dispatcher and runs API, kept apart from GraphSession so a module that only needs
 * to reach them (the AI entry, autosave on the app's start page) does not statically load the whole
 * session.
 */
import { GraphtyError } from "../errors";
import type { Dispatcher } from "./project/Dispatcher";
import type { SessionRunsApi } from "./runs";
import type { GraphSession } from "./types";

/** Each session's dispatcher, for the element's own tests; see {@link dispatcherOf}. */
const DISPATCHERS = new WeakMap<GraphSession, Dispatcher>();

/**
 * Record the dispatcher a session was built with.
 * @param session - The session.
 * @param dispatcher - Its dispatcher.
 */
export function registerDispatcher(session: GraphSession, dispatcher: Dispatcher): void {
    DISPATCHERS.set(session, dispatcher);
}

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

/** Each session's runs API with the parts only the element reaches; see {@link sessionRunsOf}. */
const SESSION_RUNS = new WeakMap<GraphSession, SessionRunsApi>();

/**
 * Record the runs API a session was built with.
 * @param session - The session.
 * @param runs - Its runs API.
 */
export function registerSessionRuns(session: GraphSession, runs: SessionRunsApi): void {
    SESSION_RUNS.set(session, runs);
}

/**
 * The runs API behind a session, with `startVia`: how the renderer starts the on-load runs as
 * deferred members of the command that added the rows. Not published.
 * @param session - A session this module built.
 * @returns Its runs API.
 */
export function sessionRunsOf(session: GraphSession): SessionRunsApi {
    const runs = SESSION_RUNS.get(session);
    if (runs === undefined) {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "This session was not built by createGraphSession, so it has no runs API of its own.",
            source: "run",
        });
    }

    return runs;
}
