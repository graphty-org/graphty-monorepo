/**
 * @file Which saved conversation belongs to an element and its graph
 * (design/ai/tanstack-ai-harness-design.md, section 5.1, "Scope").
 */

import type { ConversationRecord } from "./formats";
import { newestFirst } from "./MemoryStore";

/**
 * The scope a conversation is saved under by default: the element's id and the page's path.
 * @param elementId - The element's id.
 * @param pathname - The page's path.
 * @returns The key.
 */
export function defaultConversationKey(elementId: string, pathname: string = globalThis.location.pathname): string {
    return `${elementId}:${pathname}`;
}

/** The graph a conversation should be about. */
export interface ConversationGraph {
    /** The host's name for the data, when it set one. */
    readonly dataKey?: string | null;
    /** `session.data.fingerprint()` of the loaded graph. */
    readonly fingerprint: string;
}

/**
 * The conversation to reopen: the newest of `key` whose `dataKey` matches, or failing that, whose
 * fingerprint matches.
 * @param records - The saved conversations.
 * @param key - The scope.
 * @param graph - The loaded graph.
 * @returns The record, or undefined when a new conversation should start.
 */
export function conversationToReopen(
    records: readonly ConversationRecord[],
    key: string,
    graph: ConversationGraph,
): ConversationRecord | undefined {
    const newest = newestFirst(records.filter((record) => record.key === key));
    const { dataKey } = graph;
    return (
        (dataKey === undefined || dataKey === null
            ? undefined
            : newest.find((record) => record.graph.dataKey === dataKey)) ??
        newest.find((record) => record.graph.fingerprint === graph.fingerprint)
    );
}
