/**
 * @file A saved conversation in memory: the store interface every history store implements, and
 * the window of a conversation a model is shown (design/ai/tanstack-ai-harness-design.md, section 5.1).
 *
 * The record keeps everything; the window only chooses what one turn sends. Nothing here loads
 * zod or IndexedDB: the IndexedDB store is reached through `import()` alone, so `./ai` does not
 * grow by it.
 */

import type { AiResultCode, AiResultParams } from "../../catalog/ai";
import type { ToolProfile } from "../tools/prompt";
import type { ConversationRecord } from "./formats";
import type { SavedMessage, SavedPart } from "./formats/v1";
import { MemoryStore } from "./MemoryStore";

/** Something a store tells its listeners: another instance changed a record, or a store failed. */
export interface ConversationStoreChange {
    /** The conversation that changed; absent when every one did (a clear) or for a failure. */
    readonly conversationId?: string;
    /** `AI_STORAGE_FAILED` or `AI_HISTORY_UNAVAILABLE`, for a failure. */
    readonly code?: AiResultCode;
    readonly params?: AiResultParams;
}

/** Where conversations are kept: in memory, or in the browser's IndexedDB. */
export interface ConversationStore {
    /**
     * The saved conversations, newest first.
     * @param key - Only those of this scope; every one when absent.
     */
    list(key?: string): Promise<ConversationRecord[]>;
    load(id: string): Promise<ConversationRecord | undefined>;
    /**
     * Save a record. It is written as it is when the stored copy is still at `record.revision`
     * (the revision it was loaded at); otherwise the two are merged (see `mergeRecords`).
     * @returns The record as stored, its revision bumped.
     */
    save(record: ConversationRecord): Promise<ConversationRecord>;
    /**
     * Claim a pending entry, to resolve it: sets its `claim` and bumps the revision in one step,
     * so exactly one of several claimants wins.
     * @returns The record as stored, or undefined when the entry is gone or someone else claimed it.
     */
    claim(conversationId: string, pendingId: string, claimant: string): Promise<ConversationRecord | undefined>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
    /**
     * Hear what other instances changed, and this store's failures.
     * @returns A function that stops listening.
     */
    subscribe(listener: (change: ConversationStoreChange) => void): () => void;
    close(): void;
}

/** Where a conversation is kept, and the settings the store needs. */
export interface ConversationStoreOptions {
    readonly store: "memory" | "browser";
    /** The IndexedDB database's name; `graphty-ai` when absent. */
    readonly database?: string;
    /** Configured API keys, kept out of what is written. */
    readonly secrets?: () => readonly string[];
}

/**
 * The internal option a test or the regression harness hands a store through, in place of the one
 * `history` names: a memory store seeded from a saved record stands in for a reload.
 */
export const STORE_OVERRIDE: unique symbol = Symbol("graphty.ai.conversationStore");

/** A store, and the failure that made it a memory store instead of the one asked for. */
export interface OpenedConversationStore {
    readonly store: ConversationStore;
    readonly failure?: { readonly code: AiResultCode; readonly params: AiResultParams };
}

/**
 * Open a conversation store. The IndexedDB one is loaded on first use, with the format's schemas.
 * @param options - Which store.
 * @returns The store; a memory store with `AI_HISTORY_UNAVAILABLE` when IndexedDB cannot open.
 */
export async function openConversationStore(options: ConversationStoreOptions): Promise<OpenedConversationStore> {
    if (options.store === "memory") {
        return { store: new MemoryStore() };
    }

    const { openIndexedDbStore } = await import("./IndexedDbStore");
    return openIndexedDbStore(options);
}

/** How many tokens of history a turn is shown, by profile, when the host sets none. */
export const DEFAULT_HISTORY_BUDGET_TOKENS: Readonly<Record<ToolProfile, number>> = { standard: 16000, small: 3000 };

/**
 * The characters of a message a model reads: its text, its calls and their results.
 * @param message - The message.
 * @returns The count.
 */
function messageChars(message: SavedMessage): number {
    return message.parts.reduce((sum, part) => sum + partChars(part), 0);
}

/**
 * The characters of one part a model reads.
 * @param part - The part.
 * @returns The count.
 */
function partChars(part: SavedPart): number {
    switch (part.type) {
        case "text":
        case "live-transcript":
            return part.text.length;
        case "reasoning":
            return part.text?.length ?? 0;
        case "tool-call":
            return part.command.length + JSON.stringify(part.arguments).length;
        case "tool-result":
            return part.content.length;
        default:
            return 0;
    }
}

/**
 * Whether a part is a facts block: the graph's facts, written into a user message by graphty.
 * @param part - The part.
 * @returns Whether it is.
 */
function isFacts(part: SavedPart): boolean {
    return part.type === "text" && part.origin === "graph-data";
}

/**
 * The part of a conversation one turn is shown: whole exchanges (a user message and everything up
 * to the next one, so a tool call never leaves its result), newest first while they fit in
 * `budgetTokens` (characters / 4), and only the newest facts block. The newest exchange is always
 * shown. The messages themselves are never changed.
 * @param messages - The conversation's messages, oldest first.
 * @param budgetTokens - The budget.
 * @returns The messages to send, oldest first.
 */
export function historyWindow(messages: readonly SavedMessage[], budgetTokens: number): SavedMessage[] {
    let newestFacts = -1;
    messages.forEach((message, i) => {
        if (message.role === "user" && message.parts.some(isFacts)) {
            newestFacts = i;
        }
    });
    const shown = messages.map((message, i) =>
        i === newestFacts || message.role !== "user" || !message.parts.some(isFacts)
            ? message
            : { ...message, parts: message.parts.filter((part) => !isFacts(part)) },
    );

    const exchanges: SavedMessage[][] = [];
    for (const message of shown) {
        if (message.role === "user" || exchanges.length === 0) {
            exchanges.push([]);
        }

        exchanges[exchanges.length - 1].push(message);
    }

    const budgetChars = budgetTokens * 4;
    let used = 0;
    let first = exchanges.length;
    for (let i = exchanges.length - 1; i >= 0; i--) {
        const chars = exchanges[i].reduce((sum, message) => sum + messageChars(message), 0);
        if (first < exchanges.length && used + chars > budgetChars) {
            break;
        }

        used += chars;
        first = i;
    }

    return exchanges.slice(first).flat();
}
