/**
 * @file The journal: the record of the commands a session ran, oldest first.
 *
 * Every command that changes the project and finishes writes one entry, whether it was
 * dispatched on its own or as a member of a batch or a transaction. A command that fails or is
 * cancelled writes nothing. Moving the camera and entering or leaving a headset session are not
 * project changes and write nothing either. A run carries the id of the entry its command wrote.
 *
 * The journal is a record, not the undo history: undo reads `session.history`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RunId } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import type { SessionCommand } from "./planning";
import type { ExecutedCommand } from "./project/Dispatcher";
import type { EngineVersions } from "./runs/types";

/** The identity of a journal entry. Opaque; unique within its session. */
export type JournalId = string; // NOSONAR(S6564): the designed public name a run's journalId is typed by

/** One command the session ran. Frozen. */
export interface JournalEntry {
    /** Stable for the life of the entry. */
    readonly id: JournalId;
    /** When the command finished, as ISO 8601 UTC with milliseconds. */
    readonly at: string;
    /**
     * What the command changed.
     *
     * OPEN UNION: kinds may be added in a minor release; handle one you do not know.
     */
    readonly kind:
        | "data"
        | "run"
        | "style"
        | "filter"
        | "window"
        | "layout"
        | "view"
        | "selection"
        | "config"
        | "note"
        | "set";
    /** The command, exactly as it ran, as plain data. */
    readonly command: SessionCommand;
    /**
     * Present on a command that is part of a continuous gesture, such as dragging a filter
     * slider. Consecutive commands with the same key are one entry: the newest replaces the
     * one before it.
     */
    readonly coalesceKey?: string;
    /** How long the command executed, in milliseconds. */
    readonly durationMs: number;
    /** The run an `algo.run` command finished. */
    readonly runId?: RunId;
    /** The versions of the packages that ran it. */
    readonly engine: EngineVersions;
}

/** The record of the commands a session ran: `session.journal`. */
export interface JournalApi {
    /** Every entry kept, oldest first. A new array after each change. */
    readonly entries: readonly JournalEntry[];
    /**
     * One entry.
     * @param id - Its id, such as a run's `journalId`.
     * @returns The entry, or undefined when it was never written, was dropped, or was replaced
     *     by a later command of the same gesture.
     */
    get(id: JournalId): JournalEntry | undefined;
    /**
     * Hear every entry as it is appended. The same entries `journal:appended` publishes.
     * @param fn - Called with each new entry.
     * @returns A function that stops the subscription.
     */
    subscribe(fn: (entry: JournalEntry) => void): () => void;
    /** Forget every entry. Changes nothing else. */
    clear(): void;
    /**
     * How many entries are kept; when one more is appended the oldest is dropped. 1000 by
     * default. Setting it lower drops the oldest at once.
     * @throws A `GraphtyError` coded `E_OPTION_RANGE` for anything but a positive integer.
     */
    cap: number;
}

/** What each op's entry is filed under. A new op does not compile until it is listed here. */
const KINDS: Readonly<Record<SessionCommand["op"], JournalEntry["kind"]>> = {
    "algo.run": "run",
    "algo.legacy": "run",
    "algo.remove": "run",
    // Never journaled itself: each member of a batch writes its own entry.
    batch: "data",
    "config.set": "config",
    "data.apply": "data",
    "data.declare": "data",
    "data.expand": "data",
    "data.import": "data",
    "data.setSource": "data",
    "layout.scope": "layout",
    "layout.set": "layout",
    "layout.transport": "layout",
    "note.add": "note",
    "note.merge": "note",
    "note.remove": "note",
    "note.update": "note",
    "positions.pin": "layout",
    "positions.set": "layout",
    "set.create": "set",
    "set.members": "set",
    "set.redefine": "set",
    "set.remove": "set",
    "set.rename": "set",
    "set.restore": "set",
    "style.encode": "style",
    "style.patch": "style",
    "style.template": "style",
    "view.camera": "view",
    "view.dimension": "view",
    "view.immersive": "view",
    "view.remove": "view",
    "view.save": "view",
    "visibility.context": "filter",
    "visibility.set": "filter",
    "visibility.window": "window",
};

/** The journal as its session holds it: the API, and where the dispatcher appends. */
interface SessionJournal extends JournalApi {
    /**
     * Write the entry for a command that finished.
     * @param done - The command, what it returned and how long it took.
     * @returns The entry.
     */
    append(done: ExecutedCommand): JournalEntry;
}

/**
 * Build a session's journal.
 * @param options - The engine versions entries carry, and who hears an appended entry.
 * @param options.engine - The versions.
 * @param options.onAppend - Called with each new entry, after the subscribers.
 * @param options.now - The wall clock, in milliseconds since the epoch.
 * @returns The journal.
 */
export function createJournal(options: {
    readonly engine: EngineVersions;
    readonly onAppend: (entry: JournalEntry) => void;
    readonly now?: () => number;
}): SessionJournal {
    const now = options.now ?? Date.now;
    // Written in place; `entries` hands out a frozen copy, made once per change on first read, so
    // a burst of commands nobody reads between costs no copying.
    const list: JournalEntry[] = [];
    let view: readonly JournalEntry[] | null = null;
    const byId = new Map<JournalId, JournalEntry>();
    const subscribers = new Set<(entry: JournalEntry) => void>();
    let cap = 1000;
    let next = 1;

    const keep = (): void => {
        for (const gone of list.splice(0, Math.max(0, list.length - cap))) {
            byId.delete(gone.id);
        }

        view = null;
    };

    return {
        get entries() {
            view ??= Object.freeze([...list]);
            return view;
        },
        get cap() {
            return cap;
        },
        set cap(value: number) {
            if (!Number.isInteger(value) || value < 1) {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `The journal cap must be a positive integer; ${String(value)} is not.`,
                    source: "history",
                    details: { option: "cap", value },
                });
            }

            cap = value;
            keep();
        },
        get: (id) => byId.get(id),
        subscribe(fn) {
            subscribers.add(fn);
            return () => {
                subscribers.delete(fn);
            };
        },
        clear() {
            list.length = 0;
            view = null;
            byId.clear();
        },
        append({ command, value, coalesceKey, durationMs }) {
            const op = command.op as SessionCommand["op"];
            const entry: JournalEntry = Object.freeze({
                id: `journal_${String(next++)}`,
                at: new Date(now()).toISOString(),
                kind: KINDS[op],
                command: command as SessionCommand,
                ...(coalesceKey === null ? {} : { coalesceKey }),
                durationMs,
                // `algo.run` resolves with the id of the run it finished.
                ...(op === "algo.run" && typeof value === "string" ? { runId: value } : {}),
                engine: options.engine,
            });
            if (coalesceKey !== null && list.at(-1)?.coalesceKey === coalesceKey) {
                byId.delete((list.pop() as JournalEntry).id);
            }

            list.push(entry);
            byId.set(entry.id, entry);
            keep();
            for (const fn of subscribers) {
                try {
                    fn(entry);
                } catch {
                    // A subscriber's failure is the subscriber's. The journal carries on.
                }
            }

            options.onAppend(entry);
            return entry;
        },
    };
}
