/**
 * @file The one place an edge id is written and read.
 *
 * An edge is identified by the element-assigned counter the store stamps into its
 * `graphty.edgeId` column, printed as a string. Everything that turns that counter into an id, or
 * an id back into that counter, calls one of the two functions here.
 *
 * Nothing else stringifies or parses an edge id. Before this module the pair-string convention
 * was implemented independently in four places, two of which carried a doc comment claiming to be
 * the only one, and the two sides of a style join could -- and did -- disagree in silence.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId } from "../catalog/types";

/**
 * The id of the edge carrying one counter value.
 *
 * The id is a string and never a number, because it crosses into a DOM `CustomEvent` detail, a
 * persisted scope document, a JMESPath selector and Map keys shared with node ids. A `string |
 * number` id would make every one of those surfaces decide about coercion, and `"17" !== 17` as a
 * Map key fails as an empty selection with no error.
 * @param counter - the value of the edge's `graphty.edgeId` column
 * @returns the edge id
 */
export function edgeIdOf(counter: number): EdgeId {
    return String(counter);
}

/**
 * The counter an edge id names.
 * @param id - an edge id, as {@link edgeIdOf} wrote it
 * @returns the counter, or `INVALID_INDEX` when the id is not one this element ever assigned
 */
export function edgeCounterOf(id: EdgeId): number {
    // Number() would accept "", " 3 ", "0x10" and "1e2", all of which would resolve to a real
    // edge under an id no element ever handed out. An id is the decimal printing of a
    // non-negative integer and nothing else.
    if (!/^\d+$/.test(id)) {
        return INVALID_INDEX;
    }

    const counter = Number(id);
    return Number.isSafeInteger(counter) ? counter : INVALID_INDEX;
}

/**
 * The counter behind `GraphStore.nextEdgeId()`.
 *
 * An object rather than a number held by the store, so that its owner (`DataManager`, or a
 * headless `GraphSession`) can hand the same one to every store it builds: a Clear or a replacing
 * import then starts a new store without rewinding the counter, and an edge id is never issued
 * twice in one session.
 */
export interface EdgeCounter {
    /** The value the next edge takes. */
    next: number;
}

/**
 * A counter starting at 0.
 * @returns the counter
 */
export function createEdgeCounter(): EdgeCounter {
    return { next: 0 };
}

/**
 * Continue a counter one past a value already issued, as a graph restored with its edge-id column
 * must, so a restored id is never issued again. Never moves the counter backwards.
 * @param counter - the counter
 * @param last - the largest counter value the restored graph carries
 */
export function resumeEdgeCounter(counter: EdgeCounter, last: number): void {
    counter.next = Math.max(counter.next, last + 1);
}
