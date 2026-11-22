/**
 * @file A map keyed by row (a non-negative integer index), held in an array: a read is an array
 * index, not a hash lookup on a map that can hold a million rows. It walks in row order, not in the
 * order rows were set.
 */

/** A map from row to value, held in an array by row. */
export class RowMap<V> {
    private readonly slots: (V | undefined)[] = [];
    private count = 0;

    /**
     * How many rows hold a value.
     * @returns The count.
     */
    get size(): number {
        return this.count;
    }

    /**
     * The value of a row.
     * @param row - The row.
     * @returns Its value, or undefined.
     */
    get(row: number): V | undefined {
        return this.slots[row];
    }

    /**
     * Set a row's value.
     * @param row - The row.
     * @param value - Its value.
     */
    set(row: number, value: V): void {
        if (this.slots[row] === undefined) {
            this.count++;
        }

        this.slots[row] = value;
    }

    /**
     * Forget a row.
     * @param row - The row.
     * @returns True when the row held a value.
     */
    delete(row: number): boolean {
        if (this.slots[row] === undefined) {
            return false;
        }

        this.slots[row] = undefined;
        this.count--;
        return true;
    }

    /** Forget every row. */
    clear(): void {
        this.slots.length = 0;
        this.count = 0;
    }

    /**
     * The rows that hold a value.
     * @yields Each row, in row order.
     */
    *keys(): Generator<number> {
        for (const [row] of this) {
            yield row;
        }
    }

    /**
     * The values.
     * @yields Each value, in row order.
     */
    *values(): Generator<V> {
        for (const [, value] of this) {
            yield value;
        }
    }

    /**
     * The rows and their values.
     * @yields Each row and its value, in row order.
     */
    *[Symbol.iterator](): Generator<[number, V]> {
        const { slots } = this;
        for (let row = 0; row < slots.length; row++) {
            const value = slots[row];
            if (value !== undefined) {
                yield [row, value];
            }
        }
    }
}

/**
 * A map from row to an id and its record, held as two arrays by row: what a `Map<row, { id, record }>`
 * holds with no Map entry and no object per row (about 35 bytes a row at a million rows). A read
 * hands back a fresh `{ id, record }`; it walks in row order.
 */
export class RowIdRecords<I, R> {
    private readonly ids = new RowMap<I>();
    private readonly records: (R | undefined)[] = [];

    /**
     * How many rows hold an id.
     * @returns The count.
     */
    get size(): number {
        return this.ids.size;
    }

    /**
     * The id and record of a row.
     * @param row - The row.
     * @returns Them, or undefined when the row holds none.
     */
    get(row: number): { id: I; record: R } | undefined {
        const id = this.ids.get(row);
        return id === undefined ? undefined : { id, record: this.records[row] as R };
    }

    /**
     * Set a row's id and record.
     * @param row - The row.
     * @param value - The id and record.
     * @param value.id - The id.
     * @param value.record - The record.
     */
    set(row: number, value: { readonly id: I; readonly record: R }): void {
        this.ids.set(row, value.id);
        this.records[row] = value.record;
    }

    /**
     * Forget a row.
     * @param row - The row.
     * @returns True when the row held an id.
     */
    delete(row: number): boolean {
        this.records[row] = undefined;
        return this.ids.delete(row);
    }

    /** Forget every row. */
    clear(): void {
        this.ids.clear();
        this.records.length = 0;
    }

    /**
     * The rows that hold an id.
     * @returns Each row, in row order.
     */
    keys(): Generator<number> {
        return this.ids.keys();
    }

    /**
     * The ids and records.
     * @yields Each, in row order.
     */
    *values(): Generator<{ id: I; record: R }> {
        for (const [row, id] of this.ids) {
            yield { id, record: this.records[row] as R };
        }
    }

    /**
     * The rows with their ids and records.
     * @yields Each row and its id and record, in row order.
     */
    *[Symbol.iterator](): Generator<[number, { id: I; record: R }]> {
        for (const [row, id] of this.ids) {
            yield [row, { id, record: this.records[row] as R }];
        }
    }
}

/** One edge row as {@link RowEdges} hands it back: its record, its two node ids, its row and its counter. */
export interface RowEdge<I, R> {
    readonly record: R;
    readonly sourceId: I;
    readonly targetId: I;
    readonly edgeIndex: number;
    readonly edgeId: number;
}

/**
 * A map from row to an edge, held as four arrays by row: what a `RowMap` of one five-field object
 * per edge holds with no object per row (about 40 bytes an edge at a million edges, against 16).
 * The row is the edge's `edgeIndex`. A read hands back a fresh object; it walks in row order.
 */
export class RowEdges<I, R> {
    private readonly edgeIds: (number | undefined)[] = [];
    private readonly records: (R | undefined)[] = [];
    private readonly sources: (I | undefined)[] = [];
    private readonly targets: (I | undefined)[] = [];
    private count = 0;

    /**
     * How many rows hold an edge.
     * @returns The count.
     */
    get size(): number {
        return this.count;
    }

    /**
     * The edge of a row.
     * @param row - The row.
     * @returns It, or undefined when the row holds none.
     */
    get(row: number): RowEdge<I, R> | undefined {
        const edgeId = this.edgeIds[row];
        return edgeId === undefined ? undefined : this.at(row, edgeId);
    }

    /**
     * The counter of a row's edge, with no object made.
     * @param row - The row.
     * @returns It, or undefined when the row holds none.
     */
    edgeIdAt(row: number): number | undefined {
        return this.edgeIds[row];
    }

    /**
     * The source node id of a row's edge, with no object made.
     * @param row - The row.
     * @returns It, or undefined when the row holds none.
     */
    sourceAt(row: number): I | undefined {
        return this.sources[row];
    }

    /**
     * The target node id of a row's edge, with no object made.
     * @param row - The row.
     * @returns It, or undefined when the row holds none.
     */
    targetAt(row: number): I | undefined {
        return this.targets[row];
    }

    /**
     * Set a row's edge. Its `edgeIndex` is not kept: a read answers the row.
     * @param row - The row, the edge's `edgeIndex`.
     * @param value - The edge.
     */
    set(row: number, value: RowEdge<I, R>): void {
        if (this.edgeIds[row] === undefined) {
            this.count++;
        }

        this.edgeIds[row] = value.edgeId;
        this.records[row] = value.record;
        this.sources[row] = value.sourceId;
        this.targets[row] = value.targetId;
    }

    /**
     * Forget a row.
     * @param row - The row.
     * @returns True when the row held an edge.
     */
    delete(row: number): boolean {
        if (this.edgeIds[row] === undefined) {
            return false;
        }

        this.count--;
        this.edgeIds[row] = undefined;
        this.records[row] = undefined;
        this.sources[row] = undefined;
        this.targets[row] = undefined;
        return true;
    }

    /** Forget every row. */
    clear(): void {
        this.count = 0;
        this.edgeIds.length = 0;
        this.records.length = 0;
        this.sources.length = 0;
        this.targets.length = 0;
    }

    /**
     * The rows that hold an edge.
     * @yields Each row, in row order.
     */
    *keys(): Generator<number> {
        const { edgeIds } = this;
        for (let row = 0; row < edgeIds.length; row++) {
            if (edgeIds[row] !== undefined) {
                yield row;
            }
        }
    }

    /**
     * The edges.
     * @yields Each, in row order.
     */
    *values(): Generator<RowEdge<I, R>> {
        for (const [, edge] of this) {
            yield edge;
        }
    }

    /**
     * The rows with their edges.
     * @yields Each row and its edge, in row order.
     */
    *[Symbol.iterator](): Generator<[number, RowEdge<I, R>]> {
        const { edgeIds } = this;
        for (let row = 0; row < edgeIds.length; row++) {
            const edgeId = edgeIds[row];
            if (edgeId !== undefined) {
                yield [row, this.at(row, edgeId)];
            }
        }
    }

    /**
     * Each row's two node ids, with no object made per row: what pairs edges up.
     * @param visit - Called with each row and its ends, in row order.
     */
    forEachEnds(visit: (row: number, sourceId: I, targetId: I) => void): void {
        const { edgeIds, sources, targets } = this;
        for (let row = 0; row < edgeIds.length; row++) {
            if (edgeIds[row] !== undefined) {
                visit(row, sources[row] as I, targets[row] as I);
            }
        }
    }

    private at(row: number, edgeId: number): RowEdge<I, R> {
        return {
            record: this.records[row] as R,
            sourceId: this.sources[row] as I,
            targetId: this.targets[row] as I,
            edgeIndex: row,
            edgeId,
        };
    }
}
