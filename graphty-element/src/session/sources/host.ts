/**
 * @file What the source load and expand code is handed by `session.data`: the ledger, the data
 * surface, and the session's dispatcher and events. Internal.
 */

import type { SessionCommand } from "../planning";
import type { SessionEventMap } from "../types";
import type { SourceLedger } from "./ledger";

/** The session pieces a source load or expansion works through. */
export interface SourceHost {
    /** The load records. */
    readonly ledger: SourceLedger;
    /**
     * Dispatch a command through the session's dispatcher, as one undoable step.
     * @param command - the command
     * @returns what it settles with
     */
    dispatch(command: SessionCommand): Promise<unknown>;
    /**
     * Publish a session event.
     * @param event - its name
     * @param detail - what it carries
     */
    emit<K extends keyof SessionEventMap>(event: K, detail: SessionEventMap[K]): void;
}
