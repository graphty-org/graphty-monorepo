/**
 * The storage contract autosave writes through.
 *
 * graphty-element saves the reader's work to an `AutosaveStore`. The built-in store is IndexedDB;
 * `memoryAutosaveStore()` keeps everything in memory, and a consumer can supply its own (OPFS, a
 * server, an encrypted store). Nothing here imports a renderer, a DOM API or a component framework.
 * @module autosave
 */

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
