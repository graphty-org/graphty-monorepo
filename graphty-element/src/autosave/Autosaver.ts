/**
 * The autosave writer: it keeps one entry per session in an `AutosaveStore`, written from the
 * session's committed changes.
 *
 * - **Parts.** A change marks the parts it touched unwritten (`parts.ts`); a write carries only
 *   those. A part a write carried is written only once the store's commit completed: a write that
 *   fails puts every part it carried back.
 * - **Schedule.** While visible, a 500 ms trailing debounce, at most 2000 ms after the first
 *   unwritten change. A write that carries the `data` part waits for an idle moment, at most
 *   `dataMaxWaitMs`; other changes join it. While hidden (`hidden`), every change is written at
 *   once, since the browser throttles or stops timers then. A finished run is written at once,
 *   and so is everything when `flush()` is called. One write at a time.
 * - **Boundaries.** When the project is about to be replaced, what this entry has not committed is
 *   built at once and written, and the entry is marked `ended: "replaced"` in the same commit as
 *   the new entry's first write, so a kill in between leaves the old entry restorable.
 * - **Fencing.** Every write states the generation it expects. A write the store rejects because
 *   another writer committed to the entry moves this session to a new entry holding all of it.
 * - **Failures** become `status.problem` codes; the work stays in memory and the next change
 *   tries again.
 * @module autosave
 */

import type { RunId } from "../catalog/types";
import { GraphtyError, isGraphtyError } from "../errors/GraphtyError";
import { dispatcherOf } from "../session/GraphSession";
import { supersededError } from "../session/loadLine";
import { onProjectBoundary } from "../session/project/boundary";
import { markProjectUnsaved } from "../session/projectFile";
import { ENGINE_VERSIONS } from "../session/runs";
import type { CodedFact } from "../session/shared";
import type { GraphSession, ProjectSlice } from "../session/types";
import { buildParts, EVERY_PART, type PartTag, PartTooLarge, reassemble, stashOf } from "./parts";
import {
    canRead,
    changedSettings,
    entryOfMeta,
    navigationFacts,
    pageConfigDigests,
    type PageSource,
    sourceDigest,
    sourceSlot,
    sourcesOf,
    textOf,
} from "./recovery";
import {
    type AutosaveAvailable,
    type AutosaveCode,
    type AutosaveEntry,
    type AutosaveEntryMeta,
    type AutosaveParts,
    type AutosaveRestored,
    type AutosaveStatus,
    type AutosaveStore,
    type AutosaveWrite,
    isAutosaveConflict,
} from "./types";

/** The entry format this code writes. */
export const AUTOSAVE_FORMAT_VERSION = 1;

/** How long a write may go without completing or failing before it is aborted. */
export const WATCHDOG_MS = 10_000;

/** The history steps a page-supplied load makes; any other step made during one is the reader's. */
const PAGE_LOAD_CODES: ReadonlySet<string> = new Set([
    "data.replace-nodes",
    "data.replace-edges",
    "data.import",
    "data.set",
]);

/** A deadline timer that fires this much past its time ran behind a blocked main thread. */
const DEADLINE_LATE_MS = 1_000;

/** How long the listing at the start may take before the page loads without a restore. */
export const LIST_TIMEOUT_MS = 3000;

/** Automatic restores started and never confirmed, after which an entry is no longer restored automatically. */
export const RESTORE_ATTEMPTS = 2;

/** Time, timers and idle callbacks: the real ones, or a test's. */
export interface AutosaveClock {
    /** Milliseconds since the epoch. */
    now(): number;
    /**
     * Call `fn` once after `ms`.
     * @returns Cancels it.
     */
    setTimer(fn: () => void, ms: number): () => void;
    /**
     * Call `fn` once when the page is idle, or after `timeoutMs` at the latest.
     * @returns Cancels it.
     */
    idle(fn: () => void, timeoutMs: number): () => void;
}

/** The locks that make one tab the only writer of an entry: Web Locks, or a test's. */
export interface AutosaveLocks {
    /**
     * Take a lock now, if nobody holds it.
     * @returns Releases it, or null when it is held elsewhere.
     */
    claim(name: string): Promise<(() => void) | null>;
    /** The names of every lock held now, by anyone. */
    held(): Promise<ReadonlySet<string>>;
}

/** Real timers; `requestIdleCallback` where the browser has it (Safari does not). */
export const realClock: AutosaveClock = {
    now: () => Date.now(),
    setTimer(fn, ms) {
        const handle = setTimeout(fn, ms);
        return () => {
            clearTimeout(handle);
        };
    },
    idle(fn, timeoutMs) {
        if (typeof requestIdleCallback === "function") {
            const handle = requestIdleCallback(fn, { timeout: timeoutMs });
            return () => {
                cancelIdleCallback(handle);
            };
        }

        // ponytail: no idle callback, so a second of quiet stands in for idle.
        return realClock.setTimer(fn, Math.min(timeoutMs, 1000));
    },
};

/** No locks (very old browsers): every claim succeeds and nothing counts as held. */
export const noLocks: AutosaveLocks = {
    claim: () =>
        Promise.resolve(() => {
            // Nothing to release.
        }),
    held: () => Promise.resolve(new Set<string>()),
};

/** What the writer is built from. */
export interface AutosaverOptions {
    readonly session: GraphSession;
    readonly store: AutosaveStore;
    /** The autosave key the entries belong to. */
    readonly key: string;
    /** The trailing debounce while visible; 500. */
    readonly delayMs?: number;
    /** The most a change waits for its write; 2000. */
    readonly maxWaitMs?: number;
    /** The most a change to the graph's data waits for its write; 10000. */
    readonly dataMaxWaitMs?: number;
    /** Clean entries kept per key; 10. */
    readonly keep?: number;
    readonly clock?: AutosaveClock;
    readonly locks?: AutosaveLocks;
    /** Whether the page is hidden now: a change made then is written at once, with no timer. */
    readonly hidden?: () => boolean;
}

/** What the restore at the start is told. */
export interface RecoverOptions {
    /** This tab's own previous entry, which comes first; null or absent when the tab has none. */
    readonly own?: string | null;
    /** `"manual"` restores nothing and only reports the newest entry; `"auto"` by default. */
    readonly restore?: "auto" | "manual";
    /** Every setting the page made, by name, as it is now. */
    readonly pageConfig?: Readonly<Record<string, unknown>>;
}

/** One entry this writer writes, or wrote before a boundary. */
interface EntryState {
    readonly id: string;
    /** Commits the store holds for it, as far as this writer knows. */
    gen: number;
    readonly createdAt: string;
    /** Whether a change has been made to it; a fresh entry writes nothing. */
    started: boolean;
    unwritten: Set<PartTag>;
    /** The run entries in the store, by id. */
    readonly runs: Map<RunId, unknown>;
    release: (() => void) | null;
    /** The size of each part the store holds for it, as far as this writer knows. */
    sizes: Map<string, number>;
}

/** An entry left behind at a boundary: what it had not committed, and its meta, waiting to be ended. */
interface Ending {
    readonly entry: EntryState;
    readonly meta: AutosaveEntryMeta;
    parts: Record<string, string | null>;
}

/** One commit, and what it does to this writer's books once it completes or fails. */
interface Job {
    writes: AutosaveWrite[];
    /** The entries the writes are for, by id: their generation is read again when the job commits. */
    readonly entries: Map<string, EntryState>;
    readonly claim: EntryState[];
    readonly done: (() => void)[];
    readonly undo: (() => void)[];
    /** Flushed to disk before it reports complete: the rewrite of an older-format entry. */
    strict: boolean;
}

/**
 * The lock name of an entry.
 * @param key - The autosave key.
 * @param id - The entry.
 * @returns The name.
 */
export function lockName(key: string, id: string): string {
    return `graphty-autosave:${key}:${id}`;
}

/**
 * A random entry id; `randomUUID` exists only in secure contexts.
 * @returns The id.
 */
function newId(): string {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
    );
}

/**
 * The storage the browser says this origin uses, where it says.
 * @returns Usage and quota in bytes, or nulls.
 */
async function estimate(): Promise<{ usage: number | null; quota: number | null }> {
    try {
        const { usage, quota } = await navigator.storage.estimate();
        return { usage: usage ?? null, quota: quota ?? null };
    } catch {
        return { usage: null, quota: null };
    }
}

/**
 * A refusal about one entry.
 * @param code - Why.
 * @param id - The entry.
 * @returns The error.
 */
export function entryError(code: "E_AUTOSAVE_UNKNOWN_ENTRY" | "E_AUTOSAVE_ENTRY_TAKEN", id: string): GraphtyError {
    return new GraphtyError({
        code,
        message: `Autosave entry ${id}: ${code}.`,
        source: "data",
        details: { id },
    });
}

/**
 * The size of each part once some parts are written.
 * @param sizes - The sizes before.
 * @param parts - What is written; null removes a part.
 * @returns The sizes after, in UTF-16 code units for text.
 */
function sizesAfter(
    sizes: ReadonlyMap<string, number>,
    parts: Readonly<Record<string, string | Uint8Array | null>>,
): Map<string, number> {
    const after = new Map(sizes);
    for (const [name, value] of Object.entries(parts)) {
        if (value === null) {
            after.delete(name);
        } else {
            // ponytail: text length, not encoded bytes; close enough for a storage report.
            after.set(name, typeof value === "string" ? value.length : value.byteLength);
        }
    }

    return after;
}

/**
 * The parts a set of changed slices leaves unwritten.
 * @param slices - What changed.
 * @returns The parts.
 */
function tagsOf(slices: readonly ProjectSlice[]): PartTag[] {
    const tags: PartTag[] = [];
    for (const slice of slices) {
        switch (slice) {
            case "runs":
                tags.push("runs");
                break;
            case "arrangement":
            case "pins":
                tags.push("arrangement");
                break;
            case "config":
            case "layout":
            case "styles":
            case "visibility":
            case "sets":
            case "views":
            case "notes":
            case "attributes":
                tags.push("rest");
                break;
            default:
                // The graph, and any slice added later: everything refers to node ids.
                tags.push(...EVERY_PART);
        }
    }

    return tags;
}

/** The retries one write run has left, of each kind. */
interface WriteRetries {
    /** After the watchdog aborted a stuck write. */
    stall: number;
    /** After a full quota, once old clean entries are removed. */
    quota: number;
    /** After the connection to the database was lost. */
    lost: number;
    /** After the browser aborted the transaction, or closed the connection under it. */
    aborted: number;
}

/**
 * The name of a thrown value, for an error code's params.
 * @param error - What was thrown.
 * @returns Its name, or "Error".
 */
function errorName(error: unknown): string {
    return error instanceof Error ? error.name : "Error";
}

/**
 * The entries a load tries to restore, in order: this tab's own entry alone when it has one (none
 * when it was replaced), else every open entry, newest first.
 * @param open - The entries not replaced, oldest first.
 * @param own - This tab's own entry, if it has one.
 * @returns The candidates.
 */
function restoreCandidates(
    open: readonly AutosaveEntryMeta[],
    own: AutosaveEntryMeta | undefined,
): AutosaveEntryMeta[] {
    if (own === undefined) {
        return [...open].reverse();
    }

    return own.ended === "replaced" ? [] : [own];
}

/**
 * Why an entry is not restored automatically: its restores kept killing the page, or a newer
 * deploy wrote it.
 * @param meta - The entry.
 * @returns The problem, or null when it can be restored.
 */
function unrestorable(meta: AutosaveEntryMeta): AutosaveAvailable["problem"] {
    const attempts = Number(meta.restoreAttempts ?? 0);
    if (attempts >= RESTORE_ATTEMPTS) {
        return { code: "E_AUTOSAVE_RESTORE_CRASHED", params: { attempts } };
    }

    if (!canRead(meta.formatVersion, AUTOSAVE_FORMAT_VERSION)) {
        const { formatVersion } = meta;
        return {
            code: "E_AUTOSAVE_FORMAT_NEWER",
            params: { formatVersion: typeof formatVersion === "number" ? formatVersion : String(formatVersion) },
        };
    }

    return null;
}

/** Writes one session's work to an autosave store as it changes. */
export class Autosaver {
    readonly #session: GraphSession;
    readonly #store: AutosaveStore;
    readonly #key: string;
    readonly #delayMs: number;
    readonly #maxWaitMs: number;
    readonly #dataMaxWaitMs: number;
    readonly #hidden: () => boolean;
    readonly #keep: number;
    readonly #clock: AutosaveClock;
    readonly #locks: AutosaveLocks;
    readonly #stash = new Map<string, unknown>();
    readonly #listeners = new Set<(status: AutosaveStatus) => void>();
    readonly #availableListeners = new Set<(available: AutosaveAvailable) => void>();
    readonly #stops: (() => void)[] = [];

    #entry: EntryState;
    #endings: Ending[] = [];
    /** Committed project changes seen so far: the revision a write built now contains. */
    #changes = 0;
    #saved: { at: string; revision: number } | null = null;
    #problem: CodedFact<AutosaveCode> | null = null;
    /** What the write in flight carries, so a boundary rewrites it too. */
    #carrying: { entry: EntryState; tags: ReadonlySet<PartTag> } | null = null;
    /** The lock claim in progress after the page came back, if any. */
    #reclaiming: Promise<void> | null = null;
    #pump: Promise<void> | null = null;
    #again = false;
    #stopped = false;
    #debounce: (() => void) | null = null;
    #maxWait: (() => void) | null = null;
    #idle: (() => void) | null = null;
    #told = "";
    /** A restore is opening an entry: its changes and its boundary are not new work. */
    #restoring = false;
    /** A page-supplied load is running: its changes do not start an entry. */
    #quiet = 0;
    /** Changes made during a page load, and the parts they touched, until the load says whose they were. */
    #heldDuringLoad = { count: 0, tags: new Set<PartTag>(), stash: false };
    /** While page loads run: the history steps there were before them, so a later one is the reader's. */
    #stepsBeforeLoad: ReadonlySet<string> | null = null;
    /** Of the reader's steps since then, how many a write that could not wait already took. */
    #releasedSteps = 0;
    /** The listing has not succeeded yet: nothing is written, so no entry can shadow the real one. */
    #blocked = false;
    /** The next write rewrites an older-format entry, flushed to disk. */
    #strict = false;
    /** The digests of the page-supplied loads the work was built from, by slot (`sourceSlot`). */
    #source: Record<string, string> = {};
    /** What the element knows about the storage, reported in the status. */
    #facts: Pick<AutosaveStatus, "persisted" | "storage" | "ephemeral"> = {
        persisted: null,
        storage: null,
        ephemeral: "unknown",
    };
    /** The page's settings, digested, as written with every meta. */
    #pageConfig: Record<string, string> = {};
    /** The restored entry, until the first change or the first page load after the restore. */
    #absorb: AutosaveEntryMeta | null = null;
    #restored: AutosaveRestored | null = null;

    /**
     * Start writing a session's work. Nothing is written until the first change.
     * @param options - The session, the store, the key and the schedule.
     */
    constructor(options: AutosaverOptions) {
        this.#session = options.session;
        this.#store = options.store;
        this.#key = options.key;
        this.#delayMs = options.delayMs ?? 500;
        this.#maxWaitMs = options.maxWaitMs ?? 2000;
        this.#dataMaxWaitMs = options.dataMaxWaitMs ?? 10_000;
        this.#hidden = options.hidden ?? (() => false);
        this.#keep = options.keep ?? 10;
        this.#clock = options.clock ?? realClock;
        this.#locks = options.locks ?? noLocks;
        this.#entry = this.#newEntry();

        const { session } = this;
        const dispatcher = dispatcherOf(session);
        const { arrangement } = dispatcher;
        const sealed = (): void => {
            // Layout rest after a page load is not the reader's work: only an entry already
            // started writes it.
            if (!this.#entry.started || this.#stopped) {
                return;
            }

            if (!dispatcher.idle) {
                // A group is opening (a drag takes its before-arrangement): the positions are
                // written with the group's own commit, at the drop, never in the middle of it.
                this.#entry.unwritten.add("arrangement");
                return;
            }

            this.#mark(["arrangement"], false, false);
        };
        arrangement.sealed.add(sealed);
        this.#stops.push(
            session.on("project:changed", ({ slices }) => {
                this.#mark(tagsOf(slices), slices.includes("runs"), true);
            }),
            session.on("project:status", () => {
                this.#tell();
            }),
            onProjectBoundary(session, () => {
                this.#boundary();
            }),
            () => arrangement.sealed.delete(sealed),
        );
        this.#told = JSON.stringify(this.status);
    }

    /**
     * The session this writer saves.
     * @returns The session.
     */
    get session(): GraphSession {
        return this.#session;
    }

    /**
     * Where autosave stands now.
     * @returns The status.
     */
    get status(): AutosaveStatus {
        return {
            state: this.#state(),
            savedAt: this.#saved?.at ?? null,
            revision: this.#saved?.revision ?? 0,
            entry: this.#entry.gen > 0 ? this.#entry.id : null,
            unexported: this.#stopped ? false : this.#session.project.dirty,
            ...this.#facts,
            problem: this.#problem,
        };
    }

    /**
     * The storage facts the element gathered: whether storage is persisted, its use, and whether
     * it is probably deleted with the window.
     * @param facts - What changed.
     * @param quiet - Take them as the starting point, telling no listener.
     */
    setFacts(facts: Partial<Pick<AutosaveStatus, "persisted" | "storage" | "ephemeral">>, quiet = false): void {
        this.#facts = { ...this.#facts, ...facts };
        if (quiet) {
            this.#told = JSON.stringify(this.status);
        } else {
            this.#tell();
        }
    }

    /**
     * The entry this writer writes now, written yet or not.
     * @returns Its id.
     */
    get entryId(): string {
        return this.#entry.id;
    }

    /**
     * Whether the entry this writer writes holds work: it has been changed, or was restored.
     * @returns True once it has.
     */
    get started(): boolean {
        return this.#entry.started;
    }

    /**
     * The autosave key this writer writes under.
     * @returns The key.
     */
    get key(): string {
        return this.#key;
    }

    /**
     * The state the status reports.
     * @returns The state.
     */
    #state(): AutosaveStatus["state"] {
        if (this.#stopped) {
            return "off";
        }

        if (this.#problem !== null) {
            return "failing";
        }

        return this.#pump !== null || this.#hasWork() || this.#heldReaderWork() ? "pending" : "saved";
    }

    /**
     * Hear every change of {@link status}.
     * @param listener - Called with the new status.
     * @returns Stops listening.
     */
    onStatus(listener: (status: AutosaveStatus) => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    /**
     * Save a small JSON value with the work, under a reverse-domain name; `undefined` removes it.
     * @param name - The name.
     * @param value - The value.
     */
    stash(name: string, value: unknown): void {
        if (value === undefined) {
            this.#stash.delete(name);
        } else {
            // A JSON round trip on purpose: the stash keeps exactly what the entry will hold.
            this.#stash.set(name, JSON.parse(JSON.stringify(value)) as unknown); // NOSONAR(S7784): JSON semantics wanted, not a structured clone
        }

        if (this.#quiet > 0 && !this.#restoring) {
            // Never the page load's own: written once the load ends.
            this.#heldDuringLoad.stash = true;
            this.#tell();
            return;
        }

        this.#mark(["stash"], false, false);
    }

    /**
     * A value saved with {@link stash}.
     * @param name - The name.
     * @returns A copy of the value, or undefined.
     */
    stashed(name: string): unknown {
        const value = this.#stash.get(name);
        return value === undefined ? undefined : structuredClone(value);
    }

    /**
     * Write everything unwritten now, with no debounce: the page is being hidden or closed, or the
     * element removed.
     * @param capture - Also write the positions and the selection, which change without a commit.
     * @returns Settles once nothing is outstanding, or the write failed (read `status`).
     */
    async flush(capture = false): Promise<void> {
        this.#releaseHeld();
        if (capture && this.#entry.started) {
            this.#entry.unwritten.add("arrangement").add("rest");
        }

        this.#cancelTimers();
        if (this.#pump !== null) {
            this.#again = true;
            await this.#pump;
        } else if (this.#hasWork()) {
            await this.#start();
        }
    }

    /**
     * Write to an existing entry from here on, from the generation it was read at. The session
     * must already hold the entry's state (it was restored from it); only what changes after this
     * is written.
     * @param meta - The entry's meta, as read from the store.
     */
    adopt(meta: AutosaveEntryMeta): void {
        this.#entry = {
            ...this.#newEntry(),
            id: meta.id,
            gen: meta.gen,
            createdAt: String(meta.createdAt),
            started: true,
        };
        // The runs the session holds are the runs the entry holds.
        for (const [id, run] of dispatcherOf(this.#session).state.runs) {
            this.#entry.runs.set(id, run);
        }

        this.#tell();
    }

    /**
     * What the restore at the start brought back, or null.
     * @returns The detail `recover()` resolved with.
     */
    get restored(): AutosaveRestored | null {
        return this.#restored;
    }

    /**
     * Hear every entry that was not restored automatically, and why.
     * @param listener - Called with the entry and the reason.
     * @returns Stops listening.
     */
    onAvailable(listener: (available: AutosaveAvailable) => void): () => void {
        this.#availableListeners.add(listener);
        return () => {
            this.#availableListeners.delete(listener);
        };
    }

    /**
     * The restore at the start, before any data loads: list the key's entries, pick this tab's
     * own entry (or else the newest), claim it, and open it into the session. Nothing is written
     * until the listing succeeds; a listing that takes longer than {@link LIST_TIMEOUT_MS}
     * resolves null, and writing waits for a later listing.
     * @param options - This tab's own entry, the restore mode and the page's settings.
     * @returns What was restored, or null.
     */
    async recover(options: RecoverOptions = {}): Promise<AutosaveRestored | null> {
        this.#pageConfig = pageConfigDigests(options.pageConfig ?? {});
        this.#blocked = true;
        const metas = await this.#listWithin();
        if (metas === null) {
            return null;
        }

        this.#blocked = false;
        const held = await this.#locks.held();
        const live = (meta: AutosaveEntryMeta): boolean => held.has(lockName(this.#key, meta.id));
        const open = metas.filter((meta) => meta.ended !== "replaced");
        if (options.restore === "manual") {
            const newest = open.at(-1);
            if (newest !== undefined) {
                this.#available(newest, live(newest), "manual", null);
            }

            return null;
        }

        // This tab's own entry, and never an unrelated one when it has one; else the newest first.
        const own = metas.find((meta) => meta.id === options.own);
        for (const meta of restoreCandidates(open, own)) {
            const problem = unrestorable(meta);
            if (problem !== null) {
                this.#available(meta, live(meta), "restore-failed", problem);
                continue;
            }

            if (live(meta) && meta !== own) {
                this.#available(meta, true, "held-by-other-tab", null);
                return null;
            }

            const restored = await this.#restoreFrom(meta, meta === own && live(meta), metas, live);
            if (restored !== "next") {
                return restored;
            }
        }

        return null;
    }

    /**
     * A page-supplied load (declared attributes, rows the page assigned) arrives. Before the
     * reader's first change after a restore, a load of the data the restored work was built from
     * is absorbed: skipped, since the work already holds it. Any other load replaces the work as
     * a project boundary; the replaced entry stays listed. A load from the page does not start
     * an entry by itself: reloading the page reproduces it.
     * @param source - What the load came from.
     * @param load - Runs the load.
     * @param work - The page cannot repeat the load by itself (a file, a URL the reader chose): it
     *     starts an entry.
     * @returns `"absorbed"` when the load was skipped, `"applied"` when it ran.
     */
    async admit(source: PageSource, load: () => Promise<void>, work = false): Promise<"absorbed" | "applied"> {
        const digest = sourceDigest(source);
        const slot = sourceSlot(source);
        const restored = this.#absorb;
        // Nodes and edges arrive as two loads: an absorbed load leaves the next one absorbable.
        if (restored !== null && sourcesOf(restored.source)[slot] === digest) {
            return "absorbed";
        }

        this.#absorb = null;
        const replaces = this.#entry.started;
        // Ended here, before the load runs, whatever the load does to the graph.
        this.#boundary();
        this.#source = slot === "whole" ? { whole: digest } : { ...this.#source, [slot]: digest };
        // The load's own changes are not the reader's work. A change the reader makes while the
        // load runs is held instead of dropped: a large graph's load settles long after its rows
        // are in, and an edit queued behind it ran inside the window and was never written (the
        // lifecycle tests, at 50,000 nodes). Once the load settles, a history step it did not make
        // says the reader worked meanwhile.
        this.#stepsBeforeLoad ??= new Set(this.#session.history.steps.map((step) => step.id));
        this.#quiet += 1;
        try {
            await load();
        } finally {
            // Settled whether the load worked or threw: a failed load says nothing about the
            // reader's changes made while it ran.
            this.#quiet -= 1;
            this.#settleHeld();
            if (this.#quiet === 0) {
                this.#stepsBeforeLoad = null;
                this.#releasedSteps = 0;
            }
        }

        if (restored !== null) {
            this.#available(restored, true, "page-data-changed", null);
        }

        if (replaces || work) {
            // The replaced entry ends in the new entry's first commit, which holds the new source,
            // so the next reload absorbs this same load instead of replacing again. A load the page
            // cannot repeat by itself (`work`: a file, a URL the reader chose) starts an entry.
            this.#mark(EVERY_PART, false, false);
        }

        return "applied";
    }

    /**
     * A page load ended: write the reader's changes made while it ran. A history step the load did
     * not make says the reader worked; a stash made meanwhile is the reader's in any case.
     */
    #settleHeld(): void {
        if (this.#quiet > 0) {
            return;
        }

        const held = this.#heldDuringLoad;
        this.#heldDuringLoad = { count: 0, tags: new Set(), stash: false };
        const readerSteps = this.#readerStepsInLoad();
        if (held.count > 0 && readerSteps > 0) {
            // The reader's steps count, as their changes would have outside the load; the mark
            // counts one of them.
            this.#changes += readerSteps - this.#releasedSteps - 1;
            this.#mark([...held.tags], false, true);
        }

        if (held.stash) {
            this.#mark(["stash"], false, false);
        }
    }

    /**
     * Settles once no write is running. For tests and for shutdown.
     * @returns The running write's promise, or a settled one.
     */
    settled(): Promise<void> {
        return this.#pump ?? Promise.resolve();
    }

    /** Stop writing: no timer fires and no change is heard. A write in flight still finishes. */
    stop(): void {
        if (this.#stopped) {
            return;
        }

        this.#stopped = true;
        this.#cancelTimers();
        for (const stop of this.#stops) {
            stop();
        }

        void this.settled().then(() => {
            for (const entry of [this.#entry, ...this.#endings.map((ending) => ending.entry)]) {
                entry.release?.();
                entry.release = null;
            }
        });
        this.#tell();
    }

    /**
     * The element is removed: build everything unwritten now, synchronously, while the session is
     * still alive, and commit it after any write in flight. Then stop, and release the locks once
     * that commit settled.
     * @returns Settles once the final write committed or failed.
     */
    depart(): Promise<void> {
        if (this.#stopped) {
            return this.settled();
        }

        this.#releaseHeld();
        const entry = this.#entry;
        if (entry.started) {
            entry.unwritten.add("arrangement").add("rest");
            // What the write in flight carries may yet fail: carry it again.
            if (this.#carrying?.entry === entry) {
                this.#carrying.tags.forEach((tag) => entry.unwritten.add(tag));
            }
        }

        let job: Job | null = null;
        if (!this.#blocked) {
            try {
                job = this.#build();
            } catch (error) {
                this.#failed(error);
            }
        }

        const prior = this.#pump ?? Promise.resolve();
        const pump = prior.then(() =>
            job === null ? undefined : this.#writeOnce({ stall: 1, quota: 1, lost: 1, aborted: 1 }, job),
        );
        this.#pump = pump;
        this.stop();
        return pump;
    }

    /**
     * The page is going into the back/forward cache: release the entry's lock once everything is
     * committed, since a held lock keeps a page out of that cache. Kept when a write is
     * outstanding or failing: a cache miss is better than another tab writing the entry too.
     */
    async releaseLock(): Promise<void> {
        await this.settled();
        const entry = this.#entry;
        if (this.#state() === "saved") {
            entry.release?.();
            entry.release = null;
        }
    }

    /**
     * The page is entering the back/forward cache now: release the entry's lock at once, whatever
     * is outstanding. Chrome freezes the page right after `pagehide`, before a write started there
     * can commit, and a lock still held then keeps the page out of the cache. The entry stays
     * whole without it: every commit is fenced by the entry's generation, so if another tab claims
     * the entry meanwhile, the later of the two commits is refused, and on `pageshow` this page
     * takes the lock back or moves its work to a new entry (`reclaim`).
     */
    releaseLockNow(): void {
        const entry = this.#entry;
        entry.release?.();
        entry.release = null;
    }

    /**
     * The page came back from the back/forward cache or was resumed: take the entry's lock again.
     * When another tab claimed the entry meanwhile, move to a new entry holding all of the work.
     * @returns Settles once the lock is held again, or the work has moved.
     */
    reclaim(): Promise<void> {
        // `resume` and `pageshow` both arrive when a cached page comes back: one claim, not two
        // racing for the same lock, where the loser would take the winner for another tab.
        this.#reclaiming ??= this.#reclaimOnce().finally(() => {
            this.#reclaiming = null;
        });
        return this.#reclaiming;
    }

    /**
     * The claim `reclaim` makes.
     * @returns Settles once the lock is held again, or the work has moved.
     */
    async #reclaimOnce(): Promise<void> {
        const entry = this.#entry;
        if (this.#stopped || entry.release !== null || entry.gen === 0) {
            return;
        }

        const release = await this.#locks.claim(lockName(this.#key, entry.id));
        if (entry !== this.#entry) {
            release?.();
            return;
        }

        if (release !== null) {
            entry.release = release;
            return;
        }

        this.#conflict(entry.id);
        this.#kick();
    }

    /**
     * The entries this writer writes or is ending.
     * @returns Their ids.
     */
    #ownIds(): Set<string> {
        const ids = new Set(this.#endings.map((ending) => ending.entry.id));
        if (this.#entry.gen > 0) {
            ids.add(this.#entry.id);
        }

        return ids;
    }

    /**
     * Every entry of this key, oldest first, described without reading its parts.
     * @returns The entries.
     */
    async list(): Promise<readonly AutosaveEntry[]> {
        const metas = await this.#store.list(this.#key);
        const held = await this.#locks.held();
        const own = this.#ownIds();
        return metas.map((meta) => entryOfMeta(meta, own.has(meta.id) || held.has(lockName(this.#key, meta.id))));
    }

    /**
     * An entry of this key no tab is writing.
     * @param id - The entry.
     * @returns Its meta, the listing and whether entries are held.
     * @throws {GraphtyError} `E_AUTOSAVE_UNKNOWN_ENTRY` or `E_AUTOSAVE_ENTRY_TAKEN`.
     */
    async #unheld(id: string): Promise<{
        meta: AutosaveEntryMeta;
        metas: readonly AutosaveEntryMeta[];
        live: (meta: AutosaveEntryMeta) => boolean;
    }> {
        const metas = await this.#store.list(this.#key);
        const meta = metas.find((each) => each.id === id);
        if (meta === undefined) {
            throw entryError("E_AUTOSAVE_UNKNOWN_ENTRY", id);
        }

        const held = await this.#locks.held();
        const own = this.#ownIds();
        const live = (each: AutosaveEntryMeta): boolean => own.has(each.id) || held.has(lockName(this.#key, each.id));
        if (live(meta)) {
            throw entryError("E_AUTOSAVE_ENTRY_TAKEN", id);
        }

        return { meta, metas, live };
    }

    /**
     * Delete an entry no tab is writing.
     * @param id - The entry.
     * @throws {GraphtyError} `E_AUTOSAVE_UNKNOWN_ENTRY` or `E_AUTOSAVE_ENTRY_TAKEN`.
     */
    async remove(id: string): Promise<void> {
        await this.#unheld(id);
        await this.#store.remove(id);
    }

    /** Delete every entry of this key no tab is writing. */
    async removeAll(): Promise<void> {
        const metas = await this.#store.list(this.#key);
        const held = await this.#locks.held();
        const own = this.#ownIds();
        for (const meta of metas) {
            if (!own.has(meta.id) && !held.has(lockName(this.#key, meta.id))) {
                await this.#store.remove(meta.id);
            }
        }
    }

    /**
     * Open an entry chosen by hand into the session and write to it from here on. The work this
     * writer held ends as `replaced`, and stays listed.
     * @param id - The entry.
     * @param discard - Open it over changes never saved to a file.
     * @returns The project-open report.
     * @throws {GraphtyError} `E_UNSAVED_CHANGES`, `E_AUTOSAVE_UNKNOWN_ENTRY`,
     *     `E_AUTOSAVE_ENTRY_TAKEN`, `E_SUPERSEDED` when a clear asked for while the restore waited
     *     cancelled it (the entry is left as it was), or the code the entry could not be opened with.
     */
    async restore(id: string, discard = false): Promise<AutosaveRestored["report"]> {
        if (!discard && this.#session.project.dirty) {
            throw new GraphtyError({
                code: "E_UNSAVED_CHANGES",
                message: "The project has changes that were never saved to a file.",
                source: "data",
            });
        }

        const { meta, metas, live } = await this.#unheld(id);
        let problem: AutosaveAvailable["problem"] = null;
        const hear = this.onAvailable((available) => {
            ({ problem } = available);
        });
        this.#boundary();
        let restored: Awaited<ReturnType<Autosaver["recover"]>> | "next";
        try {
            restored = await this.#restoreFrom(meta, false, metas, live);
        } finally {
            hear();
        }

        const failed = problem as AutosaveAvailable["problem"];
        if (restored === "next" && failed === null) {
            // Another tab claimed it between the listing and the claim.
            throw entryError("E_AUTOSAVE_ENTRY_TAKEN", id);
        }

        if (restored === null && failed === null) {
            // A clear cancelled the open: the entry is intact, and nothing failed.
            throw supersededError();
        }

        if (restored === "next" || restored === null) {
            throw new GraphtyError({
                code: "E_BAD_DOCUMENT",
                message: `Autosave entry ${id} could not be opened.`,
                source: "data",
                details: { id, problem: failed },
            });
        }

        return restored.report;
    }

    /**
     * Delete this writer's own entry and start over: `reload` puts the page's own data back, and
     * nothing it does starts an entry or ends one.
     * @param reload - Puts the page's own data back.
     */
    async discard(reload: () => Promise<void>): Promise<void> {
        this.#cancelTimers();
        await this.settled();
        const entry = this.#entry;
        this.#entry = this.#newEntry();
        this.#absorb = null;
        this.#source = {};
        this.#saved = null;
        this.#changes = 0;
        this.#setProblem(null);
        if (entry.gen > 0) {
            await this.#store.remove(entry.id);
        }

        entry.release?.();
        entry.release = null;
        this.#restoring = true;
        try {
            await reload();
        } finally {
            this.#restoring = false;
            this.#tell();
        }
    }

    /**
     * A timer for a deadline on the store, which does not count time the page could not run: when
     * it fires more than {@link DEADLINE_LATE_MS} past its time, the main thread was blocked (a frame
     * longer than the deadline, a frozen or suspended page), so the store's callbacks, queued behind
     * the same block, never had a turn; it waits the whole deadline again. Without this, behind
     * frames longer than the watchdog, every healthy write was aborted as stalled and the work
     * stayed unwritten (the lifecycle tests, 5,000 nodes drawn in software: 27 s frames), and a
     * listing held up the same way skipped the restore.
     * @param fn - Called once the deadline has passed with the page running.
     * @param ms - The deadline.
     * @returns Cancels it.
     */
    #deadline(fn: () => void, ms: number): () => void {
        let cancel = (): void => undefined;
        const arm = (): void => {
            const due = this.#clock.now() + ms;
            cancel = this.#clock.setTimer(() => {
                if (this.#clock.now() - due > DEADLINE_LATE_MS) {
                    arm();
                    return;
                }

                fn();
            }, ms);
        };
        arm();
        return () => {
            cancel();
        };
    }

    /**
     * The key's entries, or null when the listing did not return in time or failed (the status
     * says why).
     * @returns The entries, oldest first, or null.
     */
    async #listWithin(): Promise<readonly AutosaveEntryMeta[] | null> {
        try {
            const metas = await new Promise<readonly AutosaveEntryMeta[] | null>((resolve, reject) => {
                const cancel = this.#deadline(() => {
                    resolve(null);
                }, LIST_TIMEOUT_MS);
                this.#store.list(this.#key).then(
                    (listed) => {
                        cancel();
                        resolve(listed);
                    },
                    (error: unknown) => {
                        cancel();
                        reject(error);
                    },
                );
            });
            if (metas === null) {
                this.#setProblem({ code: "E_AUTOSAVE_STALLED", params: { afterMs: LIST_TIMEOUT_MS, step: "list" } });
            }

            return metas;
        } catch (error) {
            this.#setProblem({
                code: "E_AUTOSAVE_FAILED",
                params: { name: errorName(error) },
            });
            return null;
        }
    }

    /**
     * Writing waits for a listing that succeeds: list again now.
     * @returns True once writing may go on.
     */
    async #relist(): Promise<boolean> {
        if ((await this.#listWithin()) === null) {
            return false;
        }

        this.#blocked = false;
        this.#setProblem(null);
        return true;
    }

    /**
     * Report an entry that was not restored automatically.
     * @param meta - The entry.
     * @param live - Whether a tab holds it.
     * @param reason - Why.
     * @param problem - What went wrong, for a failed restore.
     */
    #available(
        meta: AutosaveEntryMeta,
        live: boolean,
        reason: AutosaveAvailable["reason"],
        problem: AutosaveAvailable["problem"],
    ): void {
        const available: AutosaveAvailable = { entry: entryOfMeta(meta, live), reason, problem };
        for (const listener of this.#availableListeners) {
            listener(available);
        }
    }

    /**
     * Report a restore whose open failed. One a clear cancelled (`E_SUPERSEDED`, asked for while
     * the restore waited) left the work intact: its attempt is taken back and nothing is reported.
     * @param current - The entry, with the attempt recorded.
     * @param untried - The entry as it was before the attempt.
     * @param error - Why the open failed.
     * @param copied - Whether `current` is a copy this restore made, which a cancelled one removes.
     */
    async #restoreFailed(
        current: AutosaveEntryMeta,
        untried: AutosaveEntryMeta,
        error: unknown,
        copied: boolean,
    ): Promise<void> {
        if (!isGraphtyError(error) || error.code !== "E_SUPERSEDED") {
            this.#available(current, true, "restore-failed", {
                code: isGraphtyError(error) ? error.code : "E_AUTOSAVE_FAILED",
                params: { name: errorName(error) },
            });
            return;
        }
        // The reader cleared the page on purpose: nothing failed, so nothing is announced, and the
        // entry is written back as it was before the attempt, to be offered on the next load. A
        // copy this restore made is removed instead: the entry it copied is still there.
        if (copied) {
            await this.#store.remove(current.id).catch(() => undefined);
            return;
        }
        // ponytail: a commit that loses to another tab leaves the attempt counted; it only costs one.
        await this.#store
            .commit([{ id: untried.id, expectedGen: current.gen, meta: { ...untried, gen: current.gen }, parts: {} }])
            .catch(() => undefined);
    }

    /**
     * Copy an entry another tab holds into a new entry of this tab's, claimed.
     * @param meta - The entry.
     * @param parts - Its parts.
     * @returns The copy, as committed, and its lock's release.
     */
    async #copyEntry(
        meta: AutosaveEntryMeta,
        parts: AutosaveParts,
    ): Promise<{ meta: AutosaveEntryMeta; release: (() => void) | null }> {
        const id = newId();
        const release = await this.#locks.claim(lockName(this.#key, id));
        const copied: AutosaveEntryMeta = {
            ...meta,
            id,
            gen: 0,
            seq: 0,
            restoreAttempts: 0,
            copiedFrom: meta.id,
            createdAt: new Date(this.#clock.now()).toISOString(),
        };
        await this.#store.commit([{ id, expectedGen: 0, meta: copied, parts }]);
        return { meta: { ...copied, gen: 1 }, release };
    }

    /**
     * Record a restore attempt before opening: a restore that kills the page leaves it raised. An
     * ended entry restored by hand is current again.
     * @param meta - The entry.
     * @returns The entry, as committed.
     */
    async #recordAttempt(meta: AutosaveEntryMeta): Promise<AutosaveEntryMeta> {
        const current: AutosaveEntryMeta = {
            ...(Object.fromEntries(Object.entries(meta).filter(([field]) => field !== "ended")) as AutosaveEntryMeta),
            restoreAttempts: Number(meta.restoreAttempts ?? 0) + 1,
        };
        await this.#store.commit([{ id: current.id, expectedGen: current.gen, meta: current, parts: {} }]);
        return { ...current, gen: current.gen + 1 };
    }

    /**
     * Claim one candidate (or copy it, when another tab holds this tab's own entry), record the
     * attempt, open it into the session and adopt it.
     * @param meta - The candidate, as listed.
     * @param copy - Copy it into a new entry instead of claiming it.
     * @param metas - Every entry of the key, as listed.
     * @param live - Whether a tab holds an entry.
     * @returns What was restored; null when opening failed; `"next"` to try the next candidate.
     */
    async #restoreFrom(
        meta: AutosaveEntryMeta,
        copy: boolean,
        metas: readonly AutosaveEntryMeta[],
        live: (meta: AutosaveEntryMeta) => boolean,
    ): Promise<AutosaveRestored | null | "next"> {
        let release: (() => void) | null = null;
        if (!copy) {
            // Atomic: of two tabs loading at once, one gets it and the other tries the next.
            release = await this.#locks.claim(lockName(this.#key, meta.id));
            if (release === null) {
                return "next";
            }
        }

        const giveUp = (problem: AutosaveAvailable["problem"]): "next" => {
            release?.();
            if (problem !== null) {
                this.#available(meta, live(meta), "restore-failed", problem);
            }

            return "next";
        };

        let current: AutosaveEntryMeta;
        // The entry as it was before this attempt was recorded, which a cancelled restore puts back.
        let untried: AutosaveEntryMeta;
        let text: string;
        let stash: Map<string, unknown>;
        let sizes: Map<string, number>;
        try {
            const entry = await this.#store.read(meta.id);
            if (entry === undefined) {
                return giveUp(null);
            }

            try {
                // Read through before anything is written: an unreadable entry stays as it is.
                text = JSON.stringify(reassemble(entry.meta, entry.parts));
                stash = stashOf(entry.parts);
                sizes = sizesAfter(new Map(), entry.parts);
            } catch {
                return giveUp({ code: "E_BAD_DOCUMENT", params: { id: meta.id } });
            }

            current = entry.meta;
            if (copy) {
                ({ meta: current, release } = await this.#copyEntry(current, entry.parts));
            }

            untried = current;
            current = await this.#recordAttempt(current);
        } catch (error) {
            return giveUp({
                code: "E_AUTOSAVE_FAILED",
                params: { name: errorName(error) },
            });
        }

        let report: AutosaveRestored["report"];
        this.#restoring = true;
        try {
            report = await this.#session.project.open(text, { discard: true, limits: { fileBytes: Infinity } });
        } catch (error) {
            // Before the lock goes, so no other tab commits over the entry meanwhile.
            await this.#restoreFailed(current, untried, error, copy);
            release?.();
            return null;
        } finally {
            this.#restoring = false;
        }

        // The work comes back as it was: unsaved to a file if it was, and at its revision.
        if (current.dirty === true) {
            markProjectUnsaved(this.#session);
        }

        this.#changes = Number(current.revision ?? 0);
        this.#saved = { at: textOf(current.savedAt), revision: this.#changes };
        this.#stash.clear();
        stash.forEach((value, name) => this.#stash.set(name, value));
        this.#source = { ...sourcesOf(current.source) };
        this.adopt(current);
        const entry = this.#entry;
        entry.release = release;
        entry.sizes = sizes;
        try {
            current = { ...current, restoreAttempts: 0 };
            await this.#store.commit([{ id: entry.id, expectedGen: entry.gen, meta: current, parts: {} }]);
            entry.gen += 1;
        } catch {
            // ponytail: the restore worked; an attempt left raised only costs a restore-failed report later.
        }

        this.#absorb = current;
        if (Number(current.formatVersion) < AUTOSAVE_FORMAT_VERSION) {
            // Rewritten whole in the current format, flushed to disk.
            this.#strict = true;
            EVERY_PART.forEach((tag) => entry.unwritten.add(tag));
            this.#kick();
        }

        const restored: AutosaveRestored = {
            entry: entryOfMeta(current, true),
            savedAt: textOf(current.savedAt),
            revision: this.#changes,
            report,
            ...navigationFacts(),
            others: metas.filter(
                (each) =>
                    each.id !== current.id &&
                    each.id !== meta.id &&
                    each.ended !== "replaced" &&
                    each.dirty === true &&
                    !live(each),
            ).length,
            copiedFrom: copy ? meta.id : null,
            pageOverrides: changedSettings(this.#pageConfig, current.pageConfig),
        };
        this.#restored = restored;
        this.#tell();
        return restored;
    }

    /**
     * A new entry, unwritten and unchanged.
     * @returns The entry.
     */
    #newEntry(): EntryState {
        return {
            id: newId(),
            gen: 0,
            createdAt: new Date(this.#clock.now()).toISOString(),
            started: false,
            unwritten: new Set(),
            runs: new Map(),
            release: null,
            sizes: new Map(),
        };
    }

    /**
     * Whether anything is waiting to be committed.
     * @returns True when a write would carry something now.
     */
    #hasWork(): boolean {
        const entry = this.#entry;
        if (entry.started && entry.unwritten.size > 0) {
            return true;
        }

        const endNow = entry.started || entry.gen > 0;
        return this.#endings.some((ending) => endNow || Object.keys(ending.parts).length > 0);
    }

    /**
     * The history steps the reader recorded while the page loads now running ran.
     * @returns How many.
     */
    #readerStepsInLoad(): number {
        const before = this.#stepsBeforeLoad;
        if (before === null) {
            return 0;
        }

        return this.#session.history.steps.filter(
            (step) => !before.has(step.id) && !PAGE_LOAD_CODES.has(step.fact.code),
        ).length;
    }

    /**
     * Whether a page load running now holds a change of the reader's, which is outstanding work.
     * @returns True when it does.
     */
    #heldReaderWork(): boolean {
        const held = this.#heldDuringLoad;
        return !this.#stopped && (held.stash || (held.count > 0 && this.#readerStepsInLoad() > 0));
    }

    /**
     * Take the reader's changes a running page load holds as work now, for a write that cannot
     * wait for the load to settle: `flush()` and the final write. The load's rows are in long
     * before it settles.
     */
    #releaseHeld(): void {
        if (!this.#heldReaderWork()) {
            return;
        }

        const quiet = this.#quiet;
        this.#quiet = 0;
        try {
            this.#settleHeld();
        } finally {
            this.#quiet = quiet;
            this.#releasedSteps = this.#readerStepsInLoad();
        }
    }

    /**
     * Mark parts unwritten and schedule their write.
     * @param tags - The parts.
     * @param now - Write at once (a run finished).
     * @param counted - A committed project change, which the revision counts.
     */
    #mark(tags: readonly PartTag[], now: boolean, counted: boolean): void {
        if (this.#quiet > 0 && counted && !this.#stopped && !this.#restoring) {
            this.#heldDuringLoad.count += 1;
            tags.forEach((tag) => this.#heldDuringLoad.tags.add(tag));
            // A step of the reader's among them is outstanding work: the status and the guard say so.
            this.#tell();
            return;
        }

        if (this.#stopped || this.#restoring || this.#quiet > 0) {
            return;
        }

        if (counted) {
            this.#changes += 1;
            // The reader changed the restored work: a later page load replaces it.
            this.#absorb = null;
        }

        const entry = this.#entry;
        if (!entry.started) {
            // A new entry holds nothing yet, so its first write carries everything.
            entry.started = true;
            EVERY_PART.forEach((tag) => entry.unwritten.add(tag));
        }

        tags.forEach((tag) => entry.unwritten.add(tag));
        // Hidden, a timer may fire late or never (issue #3485): write it right after the write in
        // flight instead. Not left to the status listener, which hears nothing when the change
        // leaves the status as it was, as a change made during a write does.
        if (now || this.#hidden()) {
            this.#kick();
        } else {
            this.#schedule();
        }

        this.#tell();
    }

    /** Arm the timers for what is unwritten: idle for the data, the debounce for the rest. */
    #schedule(): void {
        const fire = (): void => {
            this.#kick();
        };
        if (this.#entry.unwritten.has("data")) {
            this.#debounce?.();
            this.#maxWait?.();
            this.#debounce = null;
            this.#maxWait = null;
            this.#idle ??= this.#clock.idle(fire, this.#dataMaxWaitMs);
            return;
        }

        if (this.#idle !== null) {
            // The data write is waiting for idle; this change joins it.
            return;
        }

        this.#debounce?.();
        this.#debounce = this.#clock.setTimer(fire, this.#delayMs);
        this.#maxWait ??= this.#clock.setTimer(fire, this.#maxWaitMs);
    }

    #cancelTimers(): void {
        this.#debounce?.();
        this.#maxWait?.();
        this.#idle?.();
        this.#debounce = null;
        this.#maxWait = null;
        this.#idle = null;
    }

    /** Write now, or right after the write in flight. */
    #kick(): void {
        this.#cancelTimers();
        if (this.#pump !== null) {
            this.#again = true;
        } else if (this.#hasWork()) {
            void this.#start();
        }
    }

    #start(): Promise<void> {
        const pump = this.#run().finally(() => {
            if (this.#pump === pump) {
                this.#pump = null;
            }

            this.#tell();
        });
        this.#pump = pump;
        this.#tell();
        return pump;
    }

    /** The project is about to be replaced: keep what this entry has not committed, then move on. */
    #boundary(): void {
        const entry = this.#entry;
        if (this.#stopped || this.#restoring || !entry.started) {
            return;
        }

        // Everything not known to be committed: what is unwritten, and what the write in flight
        // carries (it may yet fail). Built now, before the replacing change runs.
        const tags = new Set(entry.unwritten);
        if (this.#carrying?.entry === entry) {
            this.#carrying.tags.forEach((tag) => tags.add(tag));
        }

        let parts: Record<string, string | null> = {};
        try {
            ({ parts } = buildParts(this.#session, tags, entry.runs, this.#stash));
        } catch (error) {
            this.#failed(error);
        }

        entry.unwritten.clear();
        this.#endings.push({ entry, meta: this.#metaOf(entry, sizesAfter(entry.sizes, parts)), parts });
        this.#entry = this.#newEntry();
        this.#kick();
    }

    /**
     * The meta of an entry as the session stands now.
     * @param entry - The entry.
     * @param sizes - The size of each of its parts once this write commits.
     * @returns The meta; the store sets `gen` and `seq`.
     */
    #metaOf(entry: EntryState, sizes: ReadonlyMap<string, number>): AutosaveEntryMeta {
        const session = this.#session;
        const snapshot = session.data.snapshot();
        return {
            id: entry.id,
            key: this.#key,
            gen: entry.gen,
            seq: 0,
            revision: this.#changes,
            dirty: session.project.dirty,
            createdAt: entry.createdAt,
            savedAt: new Date(this.#clock.now()).toISOString(),
            name: session.project.name ?? "",
            nodes: snapshot.nodeCount,
            edges: snapshot.edgeCount,
            runs: [...dispatcherOf(session).state.runs.keys()],
            formatVersion: AUTOSAVE_FORMAT_VERSION,
            elementVersion: ENGINE_VERSIONS.element,
            source: this.#source,
            pageConfig: this.#pageConfig,
            bytes: [...sizes.values()].reduce((sum, size) => sum + size, 0),
        };
    }

    /**
     * Build the next commit from what is unwritten, moving it out of the books until the commit
     * completes (`done`) or fails (`undo`).
     * @returns The job, or null when nothing is waiting.
     * @throws {PartTooLarge} when a part cannot be built; nothing is moved.
     */
    #build(): Job | null {
        const job: Job = { writes: [], entries: new Map(), claim: [], done: [], undo: [], strict: false };
        const entry = this.#entry;
        const writesEntry = entry.started && entry.unwritten.size > 0;
        if (writesEntry) {
            const carried = entry.unwritten;
            const built = buildParts(this.#session, carried, entry.runs, this.#stash);
            const sizes = sizesAfter(entry.sizes, built.parts);
            const meta = this.#metaOf(entry, sizes);
            entry.unwritten = new Set();
            this.#carrying = { entry, tags: carried };
            job.writes.push({ id: entry.id, expectedGen: entry.gen, meta, parts: built.parts });
            job.entries.set(entry.id, entry);
            job.strict = this.#strict;
            if (entry.release === null) {
                job.claim.push(entry);
            }

            job.done.push(() => {
                entry.gen += 1;
                entry.sizes = sizes;
                if (job.strict) {
                    this.#strict = false;
                }

                for (const [id, run] of built.runs) {
                    if (run === undefined) {
                        entry.runs.delete(id);
                    } else {
                        entry.runs.set(id, run);
                    }
                }

                if (entry === this.#entry) {
                    this.#saved = { at: meta.savedAt as string, revision: meta.revision as number };
                }
            });
            job.undo.push(() => {
                carried.forEach((tag) => entry.unwritten.add(tag));
            });
        }

        // An entry left at a boundary is ended in the new entry's first commit; until then, what it
        // had not committed is written to it as it is.
        const endNow = writesEntry || entry.gen > 0;
        for (const ending of this.#endings) {
            if (!endNow && Object.keys(ending.parts).length === 0) {
                continue;
            }

            job.entries.set(ending.entry.id, ending.entry);
            job.writes.unshift({
                id: ending.entry.id,
                expectedGen: ending.entry.gen,
                meta: endNow ? { ...ending.meta, ended: "replaced" } : ending.meta,
                parts: ending.parts,
            });
            job.done.push(() => {
                ending.entry.gen += 1;
                ending.parts = {};
                if (endNow) {
                    this.#endings = this.#endings.filter((each) => each !== ending);
                    ending.entry.release?.();
                    ending.entry.release = null;
                }
            });
        }

        return job.writes.length === 0 ? null : job;
    }

    /** Write until nothing that was asked for is waiting; retries and failures are handled here. */
    async #run(): Promise<void> {
        if (this.#blocked && !(await this.#relist())) {
            return;
        }

        const retries = { stall: 1, quota: 1, lost: 1, aborted: 1 };
        do {
            this.#again = false;
            await this.#writeOnce(retries);
        } while (this.#again && !this.#stopped && this.#problem === null);
    }

    /**
     * One write, retried after a conflict and (once each) after a stall, a full quota or a lost
     * connection.
     * @param retries - The retries left in this run.
     * @param retries.stall - After the watchdog aborted a stuck write.
     * @param retries.quota - After a full quota, once old clean entries are removed.
     * @param retries.lost - After the connection to the database was lost.
     * @param retries.aborted - After the browser aborted the transaction.
     * @param first - A job already built, written before anything else.
     */
    async #writeOnce(retries: WriteRetries, first?: Job | null): Promise<void> {
        let built = first;
        for (;;) {
            const job = this.#takeJob(built);
            built = undefined;
            if (job === null) {
                return;
            }

            // A job built while another write was in flight expects the generation that write left.
            job.writes = job.writes.map((write) => ({
                ...write,
                expectedGen: job.entries.get(write.id)?.gen ?? write.expectedGen,
            }));

            const failure = await this.#commitJob(job);
            this.#carrying = null;
            if (failure === null) {
                job.done.forEach((done) => {
                    done();
                });
                this.#setProblem(null);
                if (job.writes.some((write) => write.expectedGen === 0)) {
                    await this.#retain(false);
                }

                return;
            }

            job.undo.forEach((undo) => {
                undo();
            });
            if (!(await this.#retryAfter(failure, retries))) {
                return;
            }
        }
    }

    /**
     * The job given, else a new one built from the changes.
     * @param built - A job already built.
     * @returns The job; null when there is nothing to write or building it failed (reported).
     */
    #takeJob(built: Job | null | undefined): Job | null {
        try {
            return built ?? this.#build();
        } catch (error) {
            this.#failed(error);
            return null;
        }
    }

    /**
     * Claim a job's new entries and commit its writes under the watchdog.
     * @param job - The job.
     * @returns Null when it committed; else what was thrown, and whether the watchdog aborted it.
     */
    async #commitJob(job: Job): Promise<{ error: unknown; stalled: boolean } | null> {
        const controller = new AbortController();
        let stalled = false;
        // A write is stalled after WATCHDOG_MS with no progress, not after WATCHDOG_MS in all: on
        // a page whose main thread is busy (a large graph drawn in software), each step of a
        // write waits behind a long frame, and a deadline on the whole write aborted every write
        // there, for ever (found by the lifecycle tests at 1,000 nodes).
        let cancelTimer = (): void => undefined;
        const arm = (): void => {
            cancelTimer();
            cancelTimer = this.#deadline(() => {
                stalled = true;
                controller.abort();
            }, WATCHDOG_MS);
        };
        arm();
        try {
            for (const entry of job.claim) {
                entry.release = await this.#locks.claim(lockName(this.#key, entry.id));
                // ponytail: a fresh random id is never held elsewhere; a refused claim is not retried.
            }

            await this.#store.commit(job.writes, {
                signal: controller.signal,
                onProgress: arm,
                ...(job.strict ? { durability: "strict" as const } : {}),
            });
            return null;
        } catch (error) {
            return { error, stalled };
        } finally {
            cancelTimer();
        }
    }

    /**
     * After a failed write: report it, and say whether to write again. A conflict always writes
     * again; a stall, a full quota, a lost connection and an aborted transaction each once per run.
     * @param failure - What the write threw, and whether the watchdog aborted it.
     * @param failure.error - What was thrown.
     * @param failure.stalled - The watchdog aborted it.
     * @param retries - The retries left in this run.
     * @returns Whether to write again.
     */
    async #retryAfter(failure: { error: unknown; stalled: boolean }, retries: WriteRetries): Promise<boolean> {
        const { error, stalled } = failure;
        if (isAutosaveConflict(error)) {
            this.#conflict(error.id);
            return true;
        }

        if (stalled) {
            this.#setProblem({ code: "E_AUTOSAVE_STALLED", params: { afterMs: WATCHDOG_MS, step: "write" } });
            return this.#reopenOnce(retries, "stall");
        }

        const name = error instanceof Error || error instanceof DOMException ? error.name : "Error";
        if (name === "QuotaExceededError") {
            if (retries.quota-- > 0) {
                await this.#retain(true);
                return true;
            }

            this.#setProblem({ code: "E_AUTOSAVE_QUOTA", params: await estimate() });
            return false;
        }

        if (name === "UnknownError") {
            if (await this.#reopenOnce(retries, "lost")) {
                return true;
            }

            this.#setProblem({ code: "E_AUTOSAVE_CONNECTION_LOST", params: {} });
            return false;
        }

        // A transaction the browser aborted with no error of its own, or a connection closed under
        // it, says nothing about the next one. Without this retry the work waited in memory for the
        // reader's next change while the storage worked all along (the torn-write lifecycle test).
        if ((name === "AbortError" || name === "InvalidStateError") && (await this.#reopenOnce(retries, "aborted"))) {
            return true;
        }

        this.#setProblem({ code: "E_AUTOSAVE_FAILED", params: { name } });
        return false;
    }

    /**
     * Close the database, so the next write reopens it, while retries of this kind are left.
     * @param retries - The retries left in this run.
     * @param kind - Which retry.
     * @returns Whether to write again.
     */
    async #reopenOnce(retries: WriteRetries, kind: "stall" | "lost" | "aborted"): Promise<boolean> {
        if (retries[kind]-- <= 0) {
            return false;
        }

        await this.#store.close?.();
        return true;
    }

    /**
     * Another writer committed to an entry first. This session's entry: move to a new one, which
     * gets all of the work. An entry left at a boundary: it is no longer ours to end.
     * @param id - The entry the store rejected.
     */
    #conflict(id: string): void {
        const lost = this.#endings.find((ending) => ending.entry.id === id);
        if (lost !== undefined) {
            this.#endings = this.#endings.filter((each) => each !== lost);
            return;
        }

        const old = this.#entry;
        old.release?.();
        old.release = null;
        const entry = this.#newEntry();
        entry.started = true;
        EVERY_PART.forEach((tag) => entry.unwritten.add(tag));
        this.#entry = entry;
    }

    /**
     * Remove clean entries of this key beyond `keep` (or every one, to make room), ended ones and
     * the oldest first. Never a dirty entry, one held by any tab, this writer's own, the newest,
     * or one written by newer code. Best effort.
     * @param room - Remove every entry that may go, not only those beyond `keep`.
     */
    async #retain(room: boolean): Promise<void> {
        try {
            const metas = await this.#store.list(this.#key);
            if (!room && metas.length <= this.#keep) {
                return;
            }

            const held = await this.#locks.held();
            const own = new Set([this.#entry.id, ...this.#endings.map((ending) => ending.entry.id)]);
            const newest = metas.at(-1)?.id;
            const doomed = metas
                .filter(
                    (meta) =>
                        meta.id !== newest &&
                        !own.has(meta.id) &&
                        !held.has(lockName(this.#key, meta.id)) &&
                        meta.dirty === false &&
                        Number(meta.formatVersion) <= AUTOSAVE_FORMAT_VERSION,
                )
                .sort((a, b) => Number(b.ended === "replaced") - Number(a.ended === "replaced") || a.seq - b.seq);
            let count = metas.length;
            for (const meta of doomed) {
                if (!room && count <= this.#keep) {
                    break;
                }

                await this.#store.remove(meta.id);
                count -= 1;
            }
        } catch {
            // ponytail: retention is housekeeping; a failure here leaves entries, never loses work.
        }
    }

    /**
     * A part could not be built, or the session is gone.
     * @param error - What building threw.
     */
    #failed(error: unknown): void {
        if (isGraphtyError(error) && error.code === "E_DISPOSED") {
            // The session was disposed under a pending write: what it committed stays as it is.
            this.stop();
            return;
        }

        if (error instanceof PartTooLarge) {
            this.#setProblem({ code: "E_AUTOSAVE_TOO_LARGE", params: { part: error.part } });
            return;
        }

        this.#setProblem({
            code: "E_AUTOSAVE_FAILED",
            params: { name: errorName(error) },
        });
    }

    #setProblem(problem: CodedFact<AutosaveCode> | null): void {
        this.#problem = problem;
        this.#tell();
    }

    /** Tell the listeners when the status changed. */
    #tell(): void {
        const { status } = this;
        const told = JSON.stringify(status);
        if (told !== this.#told) {
            this.#told = told;
            for (const listener of this.#listeners) {
                listener(status);
            }
        }
    }
}
