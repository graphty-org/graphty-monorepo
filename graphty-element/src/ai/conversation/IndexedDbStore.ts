/**
 * @file Conversations kept in the browser's IndexedDB (design/ai/tanstack-ai-harness-design.md,
 * section 5.1). Reached only through `import()` from `openConversationStore`, with the format's
 * schemas, so neither is in `./ai` up front.
 *
 * One database (`graphty-ai` unless the host names another) whose IndexedDB version is never
 * bumped -- format versions live per record -- and one object store, `conversations`, keyed by id.
 * Every write is one `readwrite` transaction that reads the stored record and writes in the same
 * transaction, so two instances never lose each other's messages and only one claimant of a
 * pending entry wins. A `BroadcastChannel` tells the other instances to re-read. A failed write
 * reports `AI_STORAGE_FAILED` and the store carries on in memory.
 */

import type {
    ConversationStore,
    ConversationStoreChange,
    ConversationStoreOptions,
    OpenedConversationStore,
} from "./Conversation";
import { type ConversationRecord, readConversation, writeConversation } from "./formats";
import { claimEntry, MemoryStore, newestFirst, nextRevision } from "./MemoryStore";

/** The database a store opens when the host names none. */
export const DEFAULT_HISTORY_DATABASE = "graphty-ai";

const STORE = "conversations";

/** Never bumped: a format change is a record version, not a database version. */
const DATABASE_VERSION = 1;

/** What one instance tells the others: the conversation it changed, or none for a clear. */
interface ChangeMessage {
    readonly conversationId?: string;
}

/**
 * Open the IndexedDB store, or a memory store when IndexedDB cannot open (no IndexedDB, private
 * mode, a database another release upgraded, a blocked open).
 * @param options - The database's name and the keys to keep out.
 * @returns The store, with `AI_HISTORY_UNAVAILABLE` when it is a memory store.
 */
export async function openIndexedDbStore(options: ConversationStoreOptions): Promise<OpenedConversationStore> {
    const name = options.database ?? DEFAULT_HISTORY_DATABASE;
    try {
        return { store: new IndexedDbStore(await openDatabase(name), name, options.secrets) };
    } catch {
        return {
            store: new MemoryStore(),
            failure: { code: "AI_HISTORY_UNAVAILABLE", params: { reason: "storage-unavailable" } },
        };
    }
}

/**
 * Open the database, creating its one object store the first time.
 * @param name - The database.
 * @returns The connection.
 */
function openDatabase(name: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open(name, DATABASE_VERSION);
        let blocked = false;
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE, { keyPath: "id" });
        };
        request.onsuccess = () => {
            if (blocked) {
                // Opened after it was given up on: nothing will use it.
                request.result.close();
                return;
            }

            const db = request.result;
            // Let another tab delete or upgrade the database rather than wait on this connection.
            db.onversionchange = () => {
                db.close();
            };
            resolve(db);
        };
        request.onerror = () => {
            reject(request.error ?? new DOMException("IndexedDB open failed", "UnknownError"));
        };
        request.onblocked = () => {
            blocked = true;
            reject(new DOMException("IndexedDB open blocked", "AbortError"));
        };
    });
}

/**
 * The name of what a failed write threw.
 * @param error - What it threw.
 * @returns Its name, such as `QuotaExceededError`.
 */
function errorName(error: unknown): string {
    return error instanceof Error || error instanceof DOMException ? error.name : "UnknownError";
}

/** Conversations in IndexedDB, one record each. */
class IndexedDbStore implements ConversationStore {
    private readonly listeners = new Set<(change: ConversationStoreChange) => void>();
    private readonly channel?: BroadcastChannel;
    /** Where the conversations live after a write failed. */
    private fallback?: MemoryStore;

    /**
     * A store on an open database.
     * @param db - The connection.
     * @param name - The database's name, which names the channel too.
     * @param secrets - Configured API keys, kept out of what is written.
     */
    constructor(
        private readonly db: IDBDatabase,
        name: string,
        private readonly secrets?: () => readonly string[],
    ) {
        if (typeof BroadcastChannel !== "undefined") {
            this.channel = new BroadcastChannel(`graphty-ai:${name}`);
            this.channel.onmessage = (event: MessageEvent<ChangeMessage | null>) => {
                const conversationId = event.data?.conversationId;
                this.emit(typeof conversationId === "string" ? { conversationId } : {});
            };
        }
    }

    /**
     * The saved conversations, newest first; an invalid or newer-format record is left out.
     * @param key - Only those of this scope; every one when absent.
     * @returns The records.
     */
    async list(key?: string): Promise<ConversationRecord[]> {
        if (this.fallback) {
            return this.fallback.list(key);
        }

        const tx = this.db.transaction(STORE, "readonly");
        const all = tx.objectStore(STORE).getAll();
        await settled(tx);
        return newestFirst(
            (all.result as unknown[]).flatMap((value) => {
                const read = readConversation(value);
                return read.ok && (key === undefined || read.record.key === key) ? [read.record] : [];
            }),
        );
    }

    /**
     * One conversation.
     * @param id - Its id.
     * @returns The record, or undefined when there is none or it cannot be read.
     */
    async load(id: string): Promise<ConversationRecord | undefined> {
        if (this.fallback) {
            return this.fallback.load(id);
        }

        const tx = this.db.transaction(STORE, "readonly");
        const get = tx.objectStore(STORE).get(id);
        await settled(tx);
        const read = get.result === undefined ? undefined : readConversation(get.result);
        return read?.ok ? read.record : undefined;
    }

    /**
     * Save a record: as it is at its loaded revision, else merged into the stored one.
     * @param record - The record.
     * @returns The record as stored.
     */
    async save(record: ConversationRecord): Promise<ConversationRecord> {
        // Validates (a bug in the caller throws here) and keeps configured keys out.
        const written = JSON.parse(writeConversation(record, { secrets: this.secrets?.() })) as ConversationRecord;
        const saved = await this.write(
            () => this.update(record.id, (stored) => nextRevision(stored, written)),
            (memory) => memory.save(written),
            record.id,
        );
        return saved ?? written;
    }

    /**
     * Claim a pending entry; only one claimant wins.
     * @param conversationId - Its conversation.
     * @param pendingId - The entry.
     * @param claimant - Who claims it.
     * @returns The record as stored, or undefined when the claim was lost.
     */
    async claim(conversationId: string, pendingId: string, claimant: string): Promise<ConversationRecord | undefined> {
        return this.write(
            () => this.update(conversationId, (stored) => claimEntry(stored, pendingId, claimant)),
            (memory) => memory.claim(conversationId, pendingId, claimant),
            conversationId,
        );
    }

    /**
     * Delete a conversation.
     * @param id - Its id.
     */
    async delete(id: string): Promise<void> {
        await this.write(
            async () => {
                const tx = this.db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).delete(id);
                await settled(tx);
            },
            (memory) => memory.delete(id),
            id,
        );
    }

    /** Delete every conversation. */
    async clear(): Promise<void> {
        await this.write(
            async () => {
                const tx = this.db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).clear();
                await settled(tx);
            },
            (memory) => memory.clear(),
        );
    }

    /**
     * Hear other instances' changes and this store's failures.
     * @param listener - Called with each.
     * @returns A function that stops listening.
     */
    subscribe(listener: (change: ConversationStoreChange) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** Close the connection and the channel. */
    close(): void {
        this.listeners.clear();
        this.channel?.close();
        this.db.close();
    }

    /**
     * Tell every listener.
     * @param change - What changed.
     */
    private emit(change: ConversationStoreChange): void {
        for (const listener of this.listeners) {
            listener(change);
        }
    }

    /**
     * Run a write against IndexedDB and tell the other instances; after a failure, run it in memory.
     * @param attempt - The IndexedDB write.
     * @param inMemory - The same write on the memory store.
     * @param conversationId - What it changes, for the other instances; none for a clear.
     * @returns What the write returned.
     */
    private async write<T>(
        attempt: () => Promise<T>,
        inMemory: (memory: MemoryStore) => Promise<T>,
        conversationId?: string,
    ): Promise<T> {
        if (this.fallback) {
            return inMemory(this.fallback);
        }

        let result: T;
        try {
            result = await attempt();
        } catch (error) {
            // ponytail: everything moves to memory after one failed write; retry IndexedDB if hosts need it.
            this.fallback = new MemoryStore();
            this.emit({ code: "AI_STORAGE_FAILED", params: { reason: errorName(error) } });
            return inMemory(this.fallback);
        }

        const message: ChangeMessage = conversationId === undefined ? {} : { conversationId };
        this.channel?.postMessage(message);
        return result;
    }

    /**
     * Read one record and write what `change` makes of it, in one `readwrite` transaction.
     * @param id - The record's id.
     * @param change - The record to write, from the stored one; undefined writes nothing.
     * @returns What was written, or undefined.
     */
    private async update(
        id: string,
        change: (stored: ConversationRecord | undefined) => ConversationRecord | undefined,
    ): Promise<ConversationRecord | undefined> {
        const tx = this.db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const get = store.get(id);
        let written: ConversationRecord | undefined;
        let thrown: unknown;
        get.onsuccess = () => {
            try {
                const read = get.result === undefined ? undefined : readConversation(get.result);
                if (read !== undefined && !read.ok && read.code === "AI_HISTORY_NEWER_FORMAT") {
                    // A newer release's record is never overwritten.
                    throw new DOMException("newer record format", "VersionError");
                }

                written = change(read?.ok ? read.record : undefined);
                if (written !== undefined) {
                    store.put(written);
                }
            } catch (error) {
                thrown = error;
                tx.abort();
            }
        };
        await settled(tx, () => thrown);
        return written;
    }
}

/**
 * Wait for a transaction to commit.
 * @param tx - The transaction.
 * @param cause - What a handler threw, the reason when it aborted.
 * @returns When it committed; rejects when it failed or aborted.
 */
function settled(tx: IDBTransaction, cause: () => unknown = () => undefined): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            resolve();
        };
        const fail = (): void => {
            const reason = cause() ?? tx.error;
            reject(reason instanceof Error ? reason : new DOMException("transaction aborted", "AbortError"));
        };
        tx.onerror = fail;
        tx.onabort = fail;
    });
}
