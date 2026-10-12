/**
 * @file Conversations kept in memory: gone when the page goes. The store for `history: "memory"`,
 * and what `"browser"` falls back to when IndexedDB cannot open or a write fails.
 */

import type { ConversationStore, ConversationStoreChange } from "./Conversation";
import type { ConversationRecord } from "./formats";
import type { SavedPending } from "./formats/v1";

/** Conversations in a Map, each a copy, so a caller's later edits never reach the store. */
export class MemoryStore implements ConversationStore {
    private readonly records = new Map<string, ConversationRecord>();

    /**
     * A store, empty or holding copies of these records as they are (their revisions kept).
     * @param records - What it starts with.
     */
    constructor(records: Iterable<ConversationRecord> = []) {
        for (const record of records) {
            this.records.set(record.id, structuredClone(record));
        }
    }

    /**
     * The saved conversations, newest first.
     * @param key - Only those of this scope; every one when absent.
     * @returns Copies of them.
     */
    list(key?: string): Promise<ConversationRecord[]> {
        return Promise.resolve(
            newestFirst([...this.records.values()].filter((record) => key === undefined || record.key === key)).map(
                (record) => structuredClone(record),
            ),
        );
    }

    /**
     * One conversation.
     * @param id - Its id.
     * @returns A copy, or undefined.
     */
    load(id: string): Promise<ConversationRecord | undefined> {
        const record = this.records.get(id);
        return Promise.resolve(record === undefined ? undefined : structuredClone(record));
    }

    /**
     * Save a record, merging it into a newer stored copy.
     * @param record - The record, at the revision it was loaded at.
     * @returns The stored copy.
     */
    save(record: ConversationRecord): Promise<ConversationRecord> {
        const saved = nextRevision(this.records.get(record.id), structuredClone(record));
        this.records.set(saved.id, saved);
        return Promise.resolve(structuredClone(saved));
    }

    /**
     * Claim a pending entry.
     * @param conversationId - Its conversation.
     * @param pendingId - The entry.
     * @param claimant - Who claims it.
     * @returns The stored copy, or undefined when the claim was lost.
     */
    claim(conversationId: string, pendingId: string, claimant: string): Promise<ConversationRecord | undefined> {
        const claimed = claimEntry(this.records.get(conversationId), pendingId, claimant);
        if (claimed !== undefined) {
            this.records.set(conversationId, claimed);
        }

        return Promise.resolve(claimed === undefined ? undefined : structuredClone(claimed));
    }

    /**
     * Delete a conversation.
     * @param id - Its id.
     * @returns When done.
     */
    delete(id: string): Promise<void> {
        this.records.delete(id);
        return Promise.resolve();
    }

    /**
     * Delete every conversation.
     * @returns When done.
     */
    clear(): Promise<void> {
        this.records.clear();
        return Promise.resolve();
    }

    /**
     * Nothing else shares this store, and it never fails.
     * @param _listener - Unused.
     * @returns A function that does nothing.
     */
    subscribe(_listener: (change: ConversationStoreChange) => void): () => void {
        return () => undefined;
    }

    /** Nothing to close. */
    close(): void {
        // A Map holds no connection.
    }
}

/**
 * Records sorted newest first.
 * @param records - The records.
 * @returns Them, by `updatedAt` descending.
 */
export function newestFirst(records: ConversationRecord[]): ConversationRecord[] {
    // ISO timestamps in UTC sort as text.
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * What a save stores: the record, merged into the stored copy when that moved on, revision bumped.
 * @param stored - The stored copy, if any.
 * @param record - The record being saved.
 * @returns The record to store.
 */
export function nextRevision(stored: ConversationRecord | undefined, record: ConversationRecord): ConversationRecord {
    const next = stored === undefined || stored.revision === record.revision ? record : mergeRecords(stored, record);
    return { ...next, revision: next.revision + 1 };
}

/**
 * A record with one pending entry claimed, or undefined when it is gone or already claimed.
 * @param stored - The stored record.
 * @param pendingId - The entry.
 * @param claimant - Who claims it.
 * @returns The record to store.
 */
export function claimEntry(
    stored: ConversationRecord | undefined,
    pendingId: string,
    claimant: string,
): ConversationRecord | undefined {
    const entry = stored?.pending.find((item) => item.id === pendingId);
    if (stored === undefined || entry?.claim !== null) {
        return undefined;
    }

    return {
        ...stored,
        revision: stored.revision + 1,
        pending: stored.pending.map((item) => (item.id === pendingId ? { ...item, claim: claimant } : item)),
    };
}

/**
 * Merge a record saved from a stale copy into the stored one. Messages are append-only and keyed
 * by id: the stored ones, then the incoming ones the store does not have. Pending entries are
 * merged by id, the stored entry winning, so a claim is never lost.
 * @param stored - The record as the store holds it.
 * @param incoming - The record being saved.
 * @returns The merged record, at the stored revision.
 */
export function mergeRecords(stored: ConversationRecord, incoming: ConversationRecord): ConversationRecord {
    const messageIds = new Set(stored.messages.map((message) => message.id));
    const pendingIds = new Set(stored.pending.map((entry) => entry.id));
    // ponytail: an entry one copy resolved (removed) may come back from the other, claimed; a claimed
    // entry is never asked about again. Drop resolved entries by id if records grow from it.
    return {
        ...incoming,
        revision: stored.revision,
        key: stored.key,
        createdAt: stored.createdAt,
        messages: [...stored.messages, ...incoming.messages.filter((message) => !messageIds.has(message.id))],
        pending: [
            ...stored.pending,
            ...incoming.pending.filter((entry): entry is SavedPending => !pendingIds.has(entry.id)),
        ],
    };
}
