/**
 * @file The graph slice's edge records under the "batched" render path, kept in an array by edge
 * counter instead of a hash map keyed by the counter's printed id.
 *
 * A load of a million edges spends most of `GraphOps.addEdge` writing one string key into a
 * million-entry `Map` (design/rendering/row-renderer.md, G8's fourth pull request). An edge's id is
 * its counter printed in decimal ({@link edgeIdOf}) and counters are handed out in order, so the
 * records fit an array the counter indexes, written in order with no string built.
 *
 * It is a `Map`, so every reader (and `instanceof Map`) is unchanged, with one difference: it
 * iterates by counter, not by insertion. The two differ only after an undo puts a removed edge
 * back, and nothing that reads the slice depends on the order (the digest sorts).
 */

import type { EdgeId } from "../catalog/types";
import type { GraphRecord } from "../session/project/state";
import { edgeIdOf } from "./edgeIdentity";

/** How far past the end of the table a counter may land and still be written into it. */
const MAX_GAP = 1024;

/**
 * The counter an id names when it is one {@link edgeIdOf} could print, read with no allocation.
 * @param id - The id.
 * @returns The counter, or -1.
 */
function counterOf(id: EdgeId): number {
    const { length } = id;
    if (length === 0 || length > 15 || (length > 1 && id.charCodeAt(0) === 48)) {
        return -1;
    }

    let counter = 0;
    for (let at = 0; at < length; at++) {
        const digit = id.charCodeAt(at) - 48;
        if (digit < 0 || digit > 9) {
            return -1;
        }

        counter = counter * 10 + digit;
    }

    return counter;
}

/** Edge records by counter, as a `Map` from edge id to record. */
export class EdgeRecordMap extends Map<EdgeId, GraphRecord> {
    /** Records by counter minus {@link base}; a hole is an absent edge. */
    private rows: (GraphRecord | undefined)[] = [];
    /** The counter of the table's first slot, set by the first write. */
    private base = -1;
    private count = 0;
    /** Ids outside the table: not a printed counter, below the base, or too far past its end. */
    private readonly others = new Map<EdgeId, GraphRecord>();

    /**
     * How many edges have a record.
     * @returns The count.
     */
    override get size(): number {
        return this.count + this.others.size;
    }

    /**
     * The table slot of an id, or -1 when the id is not in the table's range.
     * @param id - The id.
     * @param growing - Whether a write may extend the table.
     * @returns The slot.
     */
    private slotOf(id: EdgeId, growing: boolean): number {
        const counter = counterOf(id);
        if (counter < 0) {
            return -1;
        }

        if (this.base < 0 && growing && this.others.size === 0) {
            this.base = counter;
        }

        const slot = counter - this.base;
        const limit = growing ? this.rows.length + MAX_GAP : this.rows.length - 1;
        return this.base < 0 || slot < 0 || slot > limit ? -1 : slot;
    }

    /**
     * An edge's record.
     * @param id - The edge id.
     * @returns The record, or undefined.
     */
    override get(id: EdgeId): GraphRecord | undefined {
        const slot = this.slotOf(id, false);
        return slot < 0 ? this.others.get(id) : this.rows[slot];
    }

    /**
     * Whether an edge has a record.
     * @param id - The edge id.
     * @returns Whether it has one.
     */
    override has(id: EdgeId): boolean {
        const slot = this.slotOf(id, false);
        return slot < 0 ? this.others.has(id) : this.rows[slot] !== undefined;
    }

    /**
     * Write an edge's record.
     * @param id - The edge id.
     * @param record - The record.
     * @returns This map.
     */
    override set(id: EdgeId, record: GraphRecord): this {
        const slot = this.others.has(id) ? -1 : this.slotOf(id, true);
        if (slot < 0) {
            this.others.set(id, record);
            return this;
        }

        if (this.rows[slot] === undefined) {
            this.count++;
        }

        this.rows[slot] = record;
        return this;
    }

    /**
     * Drop an edge's record.
     * @param id - The edge id.
     * @returns Whether it had one.
     */
    override delete(id: EdgeId): boolean {
        const slot = this.slotOf(id, false);
        if (slot < 0 || this.rows[slot] === undefined) {
            return this.others.delete(id);
        }

        this.rows[slot] = undefined;
        this.count--;
        return true;
    }

    /** Drop every record. */
    override clear(): void {
        this.rows = [];
        this.base = -1;
        this.count = 0;
        this.others.clear();
    }

    /**
     * Every id and record, by counter, then the ids outside the table.
     * @yields An id and its record.
     */
    override *entries(): MapIterator<[EdgeId, GraphRecord]> {
        const { rows, base } = this;
        for (let slot = 0; slot < rows.length; slot++) {
            const record = rows[slot];
            if (record !== undefined) {
                yield [edgeIdOf(base + slot), record];
            }
        }

        yield* this.others.entries();
    }

    /**
     * Every id, in the order of {@link entries}.
     * @yields An id.
     */
    override *keys(): MapIterator<EdgeId> {
        for (const [id] of this.entries()) {
            yield id;
        }
    }

    /**
     * Every record, in the order of {@link entries}.
     * @yields A record.
     */
    override *values(): MapIterator<GraphRecord> {
        for (const record of this.rows) {
            if (record !== undefined) {
                yield record;
            }
        }

        yield* this.others.values();
    }

    /**
     * Every id and record, as {@link entries}.
     * @returns The iterator.
     */
    override [Symbol.iterator](): MapIterator<[EdgeId, GraphRecord]> {
        return this.entries();
    }

    /**
     * Visit every record, in the order of {@link entries}.
     * @param visit - Called with each record, its id and this map.
     * @param self - The `this` of each call.
     */
    override forEach(
        visit: (record: GraphRecord, id: EdgeId, map: Map<EdgeId, GraphRecord>) => void,
        self?: unknown,
    ): void {
        for (const [id, record] of this.entries()) {
            visit.call(self, record, id, this);
        }
    }
}
