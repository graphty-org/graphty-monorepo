/**
 * The storage contract autosave writes through.
 *
 * graphty-element saves the reader's work to an `AutosaveStore`. The built-in store is IndexedDB;
 * `memoryAutosaveStore()` keeps everything in memory, and a consumer can supply its own (OPFS, a
 * server, an encrypted store). Nothing here imports a renderer, a DOM API or a component framework.
 * @module autosave
 */

import type { ProjectOpenReport } from "../session/projectFile";
import type { CodedFact } from "../session/shared";

/**
 * The parts of an entry: each one the text (or bytes) of some members of the project document.
 * Part names and values are private to the element; a store keeps parts it does not recognize.
 */
export type AutosaveParts = Readonly<Record<string, string | Uint8Array>>;

/**
 * The meta record of one entry. `id`, `key`, `gen` and `seq` are the store's to index and maintain;
 * every other field is opaque to the store and passed through unchanged.
 */
export interface AutosaveEntryMeta {
    /** The entry's id. */
    readonly id: string;
    /** The autosave key the entry belongs to; `list(key)` returns the entries of one key. */
    readonly key: string;
    /** Commits to this entry so far. The store sets it to `expectedGen + 1` on every commit. */
    readonly gen: number;
    /** A per-key sequence number the store assigns inside each commit; higher is newer. */
    readonly seq: number;
    /** Any other field, kept as given. */
    readonly [field: string]: unknown;
}

/** One entry's share of a commit. */
export interface AutosaveWrite {
    /** The entry's id. */
    readonly id: string;
    /** The `gen` the writer last saw for this entry: 0 for a new entry. A mismatch rejects the commit. */
    readonly expectedGen: number;
    /** The entry's meta. The store replaces its `gen` and `seq`. */
    readonly meta: AutosaveEntryMeta;
    /** The parts to store; `null` removes a part. Parts not named here are kept. */
    readonly parts: Readonly<Record<string, string | Uint8Array | null>>;
}

/** Options for one commit. A store may ignore any of them. */
export interface AutosaveCommitOptions {
    /**
     * `"relaxed"` (the default) reports a commit once the data reached the operating system;
     * `"strict"` waits until it is flushed to disk.
     */
    readonly durability?: "relaxed" | "strict";
    /** Aborting it abandons the commit: nothing is written, and the promise rejects with an `AbortError`. */
    readonly signal?: AbortSignal;
}

/** A backend for autosave: the built-in IndexedDB store, `memoryAutosaveStore()`, or a custom one. */
export interface AutosaveStore {
    /** Every entry of `key`, oldest `seq` first. */
    list(key: string): Promise<readonly AutosaveEntryMeta[]>;
    /** One entry with all its parts, or `undefined` when there is none. */
    read(id: string): Promise<{ meta: AutosaveEntryMeta; parts: AutosaveParts } | undefined>;
    /**
     * Atomic: every write commits, or none does. Rejects with {@link AutosaveConflict} when any
     * entry's stored `gen` differs from its `expectedGen`. Assigns each meta's `seq` inside the commit.
     */
    commit(writes: readonly AutosaveWrite[], options?: AutosaveCommitOptions): Promise<void>;
    /** Deletes an entry and all its parts. Removing a missing entry does nothing. */
    remove(id: string): Promise<void>;
    /**
     * Closes any connection once the work in flight has finished. The next call opens it again.
     * Optional: a store without a connection need not implement it.
     */
    close?(): Promise<void>;
}

/**
 * The rejection of a commit whose `expectedGen` no longer matches the stored entry: another writer
 * committed to it first. Nothing in the commit was written.
 */
export class AutosaveConflict extends Error {
    /** The entry whose generation did not match. */
    readonly id: string;
    /** The generation the write expected. */
    readonly expectedGen: number;
    /** The generation the store holds (0 when the entry does not exist). */
    readonly storedGen: number;

    /**
     * Builds the rejection a store gives a commit whose fence failed.
     * @param id - the entry
     * @param expectedGen - the generation the write expected
     * @param storedGen - the generation the store holds
     */
    constructor(id: string, expectedGen: number, storedGen: number) {
        super(`autosave entry ${id} is at gen ${storedGen}, the write expected ${expectedGen}`);
        this.name = "AutosaveConflict";
        this.id = id;
        this.expectedGen = expectedGen;
        this.storedGen = storedGen;
    }
}

/**
 * Whether `error` is an {@link AutosaveConflict}, also when it came from another copy of this module.
 * @param error - anything thrown
 * @returns true for a conflict
 */
export function isAutosaveConflict(error: unknown): error is AutosaveConflict {
    return error instanceof AutosaveConflict || (error instanceof Error && error.name === "AutosaveConflict");
}

/**
 * The error a commit rejects with when its signal aborted it.
 * @returns an `AbortError`
 */
export function autosaveAbortError(): DOMException {
    return new DOMException("The autosave commit was aborted", "AbortError");
}

/**
 * Every code autosave reports, in `AutosaveStatus.problem` and its events. Switch on the code and
 * write the words yourself; leave out a code you do not know, since codes may be added in a minor
 * release.
 *
 * | Code | Params | When |
 * | --- | --- | --- |
 * | `E_AUTOSAVE_UNAVAILABLE` | `{ api }` | IndexedDB is missing or throws on open |
 * | `E_AUTOSAVE_KEY_AMBIGUOUS` | `{ elements }` | a bare `autosave` on several elements without an `id` |
 * | `E_AUTOSAVE_QUOTA` | `{ usage, quota }` | the storage quota is full, even after old clean entries were removed |
 * | `E_AUTOSAVE_STALLED` | `{ afterMs, step }` | the listing or a write did not finish in time |
 * | `E_AUTOSAVE_CONNECTION_LOST` | `{}` | the database connection is gone and reopening it failed |
 * | `E_AUTOSAVE_TOO_LARGE` | `{ part }` | a part of the project could not be built (string length limit) |
 * | `E_AUTOSAVE_FAILED` | `{ name }` | any other write failure; `name` is the error's name |
 * | `E_AUTOSAVE_ENTRY_TAKEN` | `{ id }` | an entry another tab holds |
 * | `E_AUTOSAVE_UNKNOWN_ENTRY` | `{ id }` | an entry that does not exist |
 * | `E_AUTOSAVE_FORMAT_NEWER` | `{ formatVersion }` | an entry written by newer code; left untouched |
 * | `E_AUTOSAVE_RESTORE_CRASHED` | `{ attempts }` | an entry whose automatic restore did not finish twice |
 * | `W_AUTOSAVE_ORIGIN_EPHEMERAL` | `{ persisted, ephemeral, unexported }` | the browser may delete this site's storage |
 */
export type AutosaveCode =
    | "E_AUTOSAVE_UNAVAILABLE"
    | "E_AUTOSAVE_KEY_AMBIGUOUS"
    | "E_AUTOSAVE_QUOTA"
    | "E_AUTOSAVE_STALLED"
    | "E_AUTOSAVE_CONNECTION_LOST"
    | "E_AUTOSAVE_TOO_LARGE"
    | "E_AUTOSAVE_FAILED"
    | "E_AUTOSAVE_ENTRY_TAKEN"
    | "E_AUTOSAVE_UNKNOWN_ENTRY"
    | "E_AUTOSAVE_FORMAT_NEWER"
    | "E_AUTOSAVE_RESTORE_CRASHED"
    | "W_AUTOSAVE_ORIGIN_EPHEMERAL";

/** Where autosave stands: a neutral fact, worded by the application. */
export interface AutosaveStatus {
    /**
     * `"off"`: not saving. `"saved"`: everything is committed. `"pending"`: a change or a write is
     * outstanding. `"failing"`: the last write failed; `problem` says why, and the next change
     * tries again.
     */
    readonly state: "off" | "saved" | "pending" | "failing";
    /** When the last write committed (ISO 8601 UTC), or null before the first. */
    readonly savedAt: string | null;
    /** The number of committed changes the last write contains. */
    readonly revision: number;
    /** The id of the entry this element writes, or null before its first write. */
    readonly entry: string | null;
    /** Whether there is work that was never saved to a file: the same as `project.dirty`. */
    readonly unexported: boolean;
    /** Whether the browser granted persistent storage; null when unknown. */
    readonly persisted: boolean | null;
    /** Storage use, where the browser reports it; `entries` and `bytes` are this key's. */
    readonly storage: {
        readonly usage: number;
        readonly quota: number;
        readonly entries: number;
        readonly bytes: number;
    } | null;
    /** `"likely"` when the storage is probably deleted with the window (a private window). */
    readonly ephemeral: "likely" | "unknown";
    /** Why the state is `"failing"` (or `"off"`), or null. */
    readonly problem: CodedFact<AutosaveCode> | null;
}

/** One autosaved entry, as a list describes it without reading its parts. */
export interface AutosaveEntry {
    /** The entry's id. */
    readonly id: string;
    /** The autosave key it belongs to. */
    readonly key: string;
    /** The project's name when it was written; empty when it had none. */
    readonly name: string;
    /** When the entry was started (ISO 8601 UTC). */
    readonly createdAt: string;
    /** When it was last written (ISO 8601 UTC). */
    readonly savedAt: string;
    /** The number of committed changes it contains. */
    readonly revision: number;
    /** Its node count. */
    readonly nodes: number;
    /** Its edge count. */
    readonly edges: number;
    /** Whether it holds work that was never saved to a file. */
    readonly dirty: boolean;
    /** Whether a live tab or element is writing it now. */
    readonly live: boolean;
    /** `"replaced"` once its tab moved on to another project; such an entry is never restored automatically. */
    readonly ended?: "replaced";
}

/** What an automatic restore brought back. */
export interface AutosaveRestored {
    /** The entry restored (a copy, when `copiedFrom` is set). */
    readonly entry: AutosaveEntry;
    /** When the work was last written (ISO 8601 UTC). */
    readonly savedAt: string;
    /** The number of committed changes it contains. */
    readonly revision: number;
    /** The project-open report of the restore: runs that were computing come back as `W_RUN_PENDING`. */
    readonly report: ProjectOpenReport;
    /** `document.wasDiscarded`, or null where the browser does not say. */
    readonly wasDiscarded: boolean | null;
    /** The navigation's type (`"reload"`, `"navigate"`, `"back_forward"`), or null where unknown. */
    readonly navigationType: string | null;
    /** Other entries of this key holding unsaved work that no tab is writing. */
    readonly others: number;
    /** The entry this one was copied from, when another tab was writing this tab's own entry. */
    readonly copiedFrom: string | null;
    /** The page settings that changed since the entry was written, and so were applied over it. */
    readonly pageOverrides: readonly string[];
}

/** An entry that was not restored automatically, and why. */
export interface AutosaveAvailable {
    /** The entry. */
    readonly entry: AutosaveEntry;
    /**
     * `"page-data-changed"`: the page loaded different data, which replaced the restored work.
     * `"held-by-other-tab"`: another tab is writing it. `"restore-failed"`: it could not be read,
     * was written by newer code, or its restore did not finish twice (`problem` says which).
     * `"manual"`: automatic restore is off.
     */
    readonly reason: "page-data-changed" | "held-by-other-tab" | "restore-failed" | "manual";
    /** Why the restore failed, for `"restore-failed"`; otherwise null. */
    readonly problem: CodedFact | null;
}
