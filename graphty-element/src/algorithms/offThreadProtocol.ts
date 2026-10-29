/**
 * @file The messages between the page and the Worker an algorithm's CPU port runs in. See
 * `offThread.ts`.
 */

/** One dispatcher call, sent to the Worker. */
export interface OffThreadRequest {
    /** Which call this is, so the answer finds it. */
    readonly id: number;
    /** The dispatcher member. */
    readonly member: string;
    /** The graph, as `snapshot.toBytes()` wrote it: a copy in a buffer of its own. */
    readonly bytes: Uint8Array;
    /** The member's other arguments. */
    readonly args: readonly unknown[];
}

/** The Worker's answer: the member's plain-data result, or word that it failed. */
export type OffThreadReply =
    { readonly id: number; readonly ok: true; readonly value: unknown } | { readonly id: number; readonly ok: false };
