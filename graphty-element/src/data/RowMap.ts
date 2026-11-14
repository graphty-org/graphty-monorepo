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
        for (const [, value] of this) {
            yield value;
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
