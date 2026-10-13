/**
 * The built-in `AutosaveStore`: IndexedDB database `graphty-autosave`.
 *
 * - `entries` holds the meta records (key path `id`), indexed by `key` and by `[key, seq]`.
 * - `parts` holds one record per part (key path `[entryId, part]`). A part over 1 MB holds only
 *   the SHA-256 of its value, which lives once in `blobs`, so two entries holding the same 14 MB
 *   of data share one copy. A blob is deleted in the transaction that removes its last reference.
 *
 * Every commit is one readwrite transaction: it reads each entry's stored `gen` (the fence),
 * assigns `seq`, and writes the meta and the parts, so a crash leaves either the previous commit or
 * the new one, whole. One connection is opened lazily and closed only after the work in flight has
 * finished: closing early aborts a transaction in some engines while reporting success.
 *
 * It touches no renderer and no component framework; it reads `indexedDB` and `crypto.subtle`
 * from the global scope only when it is used.
 * @module autosave
 */

import {
    autosaveAbortError,
    type AutosaveCommitOptions,
    AutosaveConflict,
    type AutosaveEntryMeta,
    type AutosaveParts,
    type AutosaveStore,
    type AutosaveWrite,
    isAutosaveConflict,
} from "./types";

/** The database every element on an origin shares; entries are told apart by their key. */
export const AUTOSAVE_DATABASE = "graphty-autosave";

/** A part whose value is longer than this (characters for text, bytes for binary) goes to `blobs`. */
export const AUTOSAVE_BLOB_THRESHOLD = 1024 * 1024;

const DB_VERSION = 1;
const ENTRIES = "entries";
const PARTS = "parts";
const BLOBS = "blobs";
const STORES = [ENTRIES, PARTS, BLOBS];

/** Options for {@link indexedDbAutosaveStore}. */
export interface IndexedDbAutosaveStoreOptions {
    /** The database name. Default {@link AUTOSAVE_DATABASE}. */
    readonly name?: string;
    /** The IndexedDB factory. Default `globalThis.indexedDB`. */
    readonly factory?: IDBFactory;
    /** Test seam: called once every request of a commit has been issued, before it completes. */
    readonly beforeCommitEnds?: (tx: IDBTransaction) => void;
}

/** The IndexedDB store, whose connection can be closed. */
export interface IndexedDbAutosaveStore extends AutosaveStore {
    close(): Promise<void>;
}

interface PartRecord {
    entryId: string;
    part: string;
    value?: string | Uint8Array;
    /** The `blobs` key holding the value, for a large part. */
    blob?: string;
}

interface BlobRecord {
    hash: string;
    value: string | Uint8Array;
}

/** One part of a write, ready to store: a value to keep inline, a blob, or a removal. */
type PreparedPart = { inline: string | Uint8Array } | { blob: string; value: string | Uint8Array } | null;

function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = (): void => {
            resolve(req.result);
        };
        req.onerror = (): void => {
            reject(req.error ?? new DOMException("IndexedDB request failed", "UnknownError"));
        };
    });
}

/**
 * The range of every part record of one entry: arrays sort after strings.
 * @param entryId - the entry
 * @returns the key range
 */
function partsOf(entryId: string): IDBKeyRange {
    return IDBKeyRange.bound([entryId], [entryId, []]);
}

/**
 * The range of every `[key, seq]` of one key.
 * @param key - the autosave key
 * @returns the key range
 */
function seqsOf(key: string): IDBKeyRange {
    return IDBKeyRange.bound([key, -Infinity], [key, Infinity]);
}

/**
 * The error an aborted transaction reports. Engines put `QuotaExceededError` on the transaction or
 * only on the failed request, so both are read and a quota error wins.
 * @param txError - `transaction.error`
 * @param requestError - the error of the first request that failed, if any
 * @returns the error to report
 */
export function abortReason(txError: DOMException | null, requestError: DOMException | null): DOMException {
    for (const error of [txError, requestError]) {
        if (error?.name === "QuotaExceededError") {
            return error;
        }
    }
    return txError ?? requestError ?? autosaveAbortError();
}

/**
 * Settles when the transaction completes, or rejects with why it aborted.
 * @param tx - the transaction
 * @returns its outcome
 */
function transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        let requestError: DOMException | null = null;
        // A failed request's error event bubbles to its transaction.
        tx.addEventListener("error", (event) => {
            const target = event.target as IDBRequest | null;
            if (target !== null && target !== (tx as unknown) && "error" in target) {
                requestError ??= target.error;
            }
        });
        tx.addEventListener("complete", () => {
            resolve();
        });
        tx.addEventListener("abort", () => {
            reject(abortReason(tx.error, requestError));
        });
    });
}

/**
 * The `blobs` key of a large value.
 * @param value - the part's value
 * @returns its SHA-256 with a type prefix, or null where no digest is available
 */
async function sha256(value: string | Uint8Array): Promise<string | null> {
    const subtle = globalThis.crypto?.subtle as SubtleCrypto | undefined;
    if (subtle === undefined) {
        // Outside a secure context there is no digest: the part is stored inline, unshared.
        return null;
    }
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
    const digest = new Uint8Array(await subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>));
    let hex = "";
    for (const byte of digest) {
        hex += byte.toString(16).padStart(2, "0");
    }
    // Text and bytes with the same encoding are different values.
    return `${typeof value === "string" ? "s" : "b"}:${hex}`;
}

/**
 * Hashes the large parts before the transaction opens: a digest is not an IndexedDB request.
 * @param writes - the commit's writes
 * @returns per write, each part ready to store
 */
async function prepare(writes: readonly AutosaveWrite[]): Promise<Map<string, PreparedPart>[]> {
    return Promise.all(
        writes.map(async (write) => {
            const prepared = new Map<string, PreparedPart>();
            for (const [name, value] of Object.entries(write.parts)) {
                if (value === null) {
                    prepared.set(name, null);
                    continue;
                }
                const hash = value.length > AUTOSAVE_BLOB_THRESHOLD ? await sha256(value) : null;
                prepared.set(name, hash === null ? { inline: value } : { blob: hash, value });
            }
            return prepared;
        }),
    );
}

/**
 * Deletes each blob no part refers to any more. Runs after the transaction's part changes.
 * @param tx - the commit's transaction
 * @param hashes - blobs whose references the transaction removed
 */
async function dropUnreferencedBlobs(tx: IDBTransaction, hashes: Iterable<string>): Promise<void> {
    const byBlob = tx.objectStore(PARTS).index("blob");
    const blobs = tx.objectStore(BLOBS);
    for (const hash of new Set(hashes)) {
        if ((await request(byBlob.count(hash))) === 0) {
            blobs.delete(hash);
        }
    }
}

/**
 * Creates the IndexedDB store. Nothing is opened until the first call.
 * @param options - the database name and test seams
 * @returns the store
 */
export function indexedDbAutosaveStore(options: IndexedDbAutosaveStoreOptions = {}): IndexedDbAutosaveStore {
    const name = options.name ?? AUTOSAVE_DATABASE;
    let connection: Promise<IDBDatabase> | null = null;
    const inFlight = new Set<Promise<unknown>>();

    function open(): Promise<IDBDatabase> {
        if (connection !== null) {
            return connection;
        }
        const opening = new Promise<IDBDatabase>((resolve, reject) => {
            const factory = options.factory ?? globalThis.indexedDB;
            if (factory === undefined) {
                reject(new DOMException("IndexedDB is not available", "NotSupportedError"));
                return;
            }
            const req = factory.open(name, DB_VERSION);
            req.onupgradeneeded = (): void => {
                const db = req.result;
                const entries = db.createObjectStore(ENTRIES, { keyPath: "id" });
                entries.createIndex("key", "key");
                entries.createIndex("keySeq", ["key", "seq"]);
                db.createObjectStore(PARTS, { keyPath: ["entryId", "part"] }).createIndex("blob", "blob");
                db.createObjectStore(BLOBS, { keyPath: "hash" });
            };
            req.onsuccess = (): void => {
                const db = req.result;
                const forget = (): void => {
                    if (connection === opening) {
                        connection = null;
                    }
                };
                // Another page upgrading or deleting the database: step aside, reopen on next use.
                db.onversionchange = (): void => {
                    db.close();
                    forget();
                };
                // The browser closed it (storage cleared, the storage process died).
                db.onclose = forget;
                resolve(db);
            };
            req.onerror = (): void => {
                reject(req.error ?? new DOMException("IndexedDB open failed", "UnknownError"));
            };
        });
        connection = opening;
        // A failed open is forgotten, so the next call tries again.
        opening.catch(() => {
            if (connection === opening) {
                connection = null;
            }
        });
        return opening;
    }

    function track<T>(work: Promise<T>): Promise<T> {
        inFlight.add(work);
        const forget = (): void => {
            inFlight.delete(work);
        };
        work.then(forget, forget);
        return work;
    }

    async function list(key: string): Promise<readonly AutosaveEntryMeta[]> {
        const db = await open();
        const tx = db.transaction(ENTRIES, "readonly");
        return request(tx.objectStore(ENTRIES).index("keySeq").getAll(seqsOf(key)) as IDBRequest<AutosaveEntryMeta[]>);
    }

    async function read(id: string): Promise<{ meta: AutosaveEntryMeta; parts: AutosaveParts } | undefined> {
        const db = await open();
        const tx = db.transaction(STORES, "readonly");
        const meta = (await request(tx.objectStore(ENTRIES).get(id))) as AutosaveEntryMeta | undefined;
        if (meta === undefined) {
            return undefined;
        }
        const records = (await request(tx.objectStore(PARTS).getAll(partsOf(id)))) as PartRecord[];
        const parts: Record<string, string | Uint8Array> = {};
        for (const record of records) {
            if (record.blob !== undefined) {
                const blob = (await request(tx.objectStore(BLOBS).get(record.blob))) as BlobRecord | undefined;
                if (blob === undefined) {
                    // Never hand back an entry with a part silently missing.
                    throw new DOMException(`autosave blob ${record.blob} is missing`, "NotFoundError");
                }
                parts[record.part] = blob.value;
            } else if (record.value !== undefined) {
                parts[record.part] = record.value;
            }
        }
        return { meta, parts };
    }

    /**
     * Issues every request of a commit. Throws AutosaveConflict when a fence fails.
     * @param tx - the commit's transaction
     * @param writes - the commit's writes
     * @param prepared - their parts, from prepare()
     */
    async function writeAll(
        tx: IDBTransaction,
        writes: readonly AutosaveWrite[],
        prepared: Map<string, PreparedPart>[],
    ): Promise<void> {
        const entries = tx.objectStore(ENTRIES);
        const parts = tx.objectStore(PARTS);
        const blobs = tx.objectStore(BLOBS);

        for (const write of writes) {
            const stored = (await request(entries.get(write.id))) as AutosaveEntryMeta | undefined;
            const storedGen = stored?.gen ?? 0;
            if (storedGen !== write.expectedGen) {
                throw new AutosaveConflict(write.id, write.expectedGen, storedGen);
            }
        }

        const nextSeq = new Map<string, number>();
        const released: string[] = [];
        for (const [i, write] of writes.entries()) {
            const { key } = write.meta;
            let seq = nextSeq.get(key);
            if (seq === undefined) {
                const newest = await request(entries.index("keySeq").openKeyCursor(seqsOf(key), "prev"));
                seq = newest === null ? 0 : ((newest.key as [string, number])[1] ?? 0);
            }
            seq += 1;
            nextSeq.set(key, seq);
            entries.put({ ...write.meta, id: write.id, gen: write.expectedGen + 1, seq });

            for (const [part, value] of prepared[i] ?? []) {
                const old = (await request(parts.get([write.id, part]))) as PartRecord | undefined;
                if (old?.blob !== undefined) {
                    released.push(old.blob);
                }
                if (value === null) {
                    parts.delete([write.id, part]);
                } else if ("inline" in value) {
                    parts.put({ entryId: write.id, part, value: value.inline } satisfies PartRecord);
                } else {
                    if ((await request(blobs.count(value.blob))) === 0) {
                        blobs.put({ hash: value.blob, value: value.value } satisfies BlobRecord);
                    }
                    parts.put({ entryId: write.id, part, blob: value.blob } satisfies PartRecord);
                }
            }
        }
        await dropUnreferencedBlobs(tx, released);
    }

    async function commit(writes: readonly AutosaveWrite[], commitOptions?: AutosaveCommitOptions): Promise<void> {
        const signal = commitOptions?.signal;
        const aborted = (): boolean => signal?.aborted === true;
        if (aborted()) {
            throw autosaveAbortError();
        }
        const prepared = await prepare(writes);
        const db = await open();
        if (aborted()) {
            throw autosaveAbortError();
        }

        const tx = db.transaction(STORES, "readwrite", { durability: commitOptions?.durability ?? "relaxed" });
        const done = transactionDone(tx);
        const abort = (): void => {
            try {
                tx.abort();
            } catch {
                // Already finished or aborted: done has settled, or will.
            }
        };
        signal?.addEventListener("abort", abort, { once: true });

        let failure: unknown = undefined;
        try {
            await writeAll(tx, writes, prepared);
            options.beforeCommitEnds?.(tx);
        } catch (error) {
            failure = error;
            abort();
        }

        try {
            await done;
        } catch (error) {
            if (failure !== undefined && (isAutosaveConflict(failure) || failure instanceof DOMException)) {
                throw failure;
            }
            throw aborted() ? autosaveAbortError() : error;
        } finally {
            signal?.removeEventListener("abort", abort);
        }
    }

    async function remove(id: string): Promise<void> {
        const db = await open();
        const tx = db.transaction(STORES, "readwrite");
        const done = transactionDone(tx);
        try {
            const records = (await request(tx.objectStore(PARTS).getAll(partsOf(id)))) as PartRecord[];
            tx.objectStore(PARTS).delete(partsOf(id));
            tx.objectStore(ENTRIES).delete(id);
            await dropUnreferencedBlobs(
                tx,
                records.flatMap((r) => (r.blob === undefined ? [] : [r.blob])),
            );
        } catch {
            // Never leave a half-removed entry: abort, and done carries the reason.
            try {
                tx.abort();
            } catch {
                // A failed request already aborted it.
            }
        }
        await done;
    }

    return {
        list: (key) => track(list(key)),
        read: (id) => track(read(id)),
        commit: (writes, commitOptions) => track(commit(writes, commitOptions)),
        remove: (id) => track(remove(id)),
        async close(): Promise<void> {
            while (inFlight.size > 0) {
                await Promise.allSettled([...inFlight]);
            }
            const closing = connection;
            connection = null;
            if (closing !== null) {
                try {
                    (await closing).close();
                } catch {
                    // It never opened; there is nothing to close.
                }
            }
        },
    };
}
