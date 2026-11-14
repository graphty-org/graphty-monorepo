/**
 * @file Records held as columns and built on demand (design/rendering/row-renderer.md 4.6,
 * "Records into columns", stage 29). A `"batched"` `importColumns` hands the load records that
 * carry their source and row; the graph slice's maps and the op log keep the row, a small integer,
 * and build the record the first time it is read. The map keeps what it built, so `Node.data` and
 * every reader see one object per record from then on.
 */

import type { GraphRecord } from "./state";

/** Where a run of rows' records come from: one `importColumns` call's columns. */
export interface RowSource {
    /** How many rows it holds. */
    readonly size: number;
    /**
     * Build one row's record, frozen, exactly as the record doors would have been handed it.
     * @param row - The row.
     * @returns The record.
     */
    build(row: number): GraphRecord;
}

/** A built record's source and row, for the writer that stores it. */
interface RowTag {
    readonly source: RowSource;
    readonly row: number;
}

const ROW_TAG = Symbol("graphty.columnRow");

/**
 * Whether a record was built from columns for a load, so the graph slice keeps only its row and a
 * holder may read it back from the slice instead of keeping it.
 * @param record - The record.
 * @returns True for a record from columns.
 */
export function fromColumns(record: object): boolean {
    return ROW_TAG in record;
}

/** Records built from columns, counted: what the stage 29 test reads (no timing). */
export const recordsBuilt = { count: 0 };

/**
 * Build a row's record and tag it with where it came from, so a writer storing it keeps the row.
 * @param source - The source.
 * @param row - The row.
 * @returns The record, frozen.
 */
function taggedRecord(source: RowSource, row: number): GraphRecord {
    const record = source.build(row);
    const tagged: Record<string | number, unknown> = { ...record };
    Object.defineProperty(tagged, ROW_TAG, { value: { source, row } satisfies RowTag });
    return Object.freeze(tagged);
}

/**
 * The records of a source as an array the record doors read, holding none of them: each read
 * builds the row's record afresh, so the command the journal keeps holds the columns, not a
 * million objects. `Array.isArray` is true of it.
 * @param source - The source.
 * @returns The array view.
 */
export function rowsView(source: RowSource): readonly GraphRecord[] {
    const isRow = (key: string | symbol): number => {
        if (typeof key !== "string") {
            return -1;
        }

        const row = Number(key);
        return Number.isInteger(row) && row >= 0 && row < source.size && String(row) === key ? row : -1;
    };
    return new Proxy<GraphRecord[]>([], {
        get(target, key, receiver) {
            if (key === "length") {
                return source.size;
            }

            const row = isRow(key);
            return row < 0 ? Reflect.get(target, key, receiver) : taggedRecord(source, row);
        },
        has(target, key) {
            return isRow(key) >= 0 || Reflect.has(target, key);
        },
        getOwnPropertyDescriptor(target, key) {
            const row = isRow(key);
            if (row < 0) {
                const own = Reflect.getOwnPropertyDescriptor(target, key);
                return key === "length" && own !== undefined ? { ...own, value: source.size } : own;
            }

            return { value: taggedRecord(source, row), writable: false, enumerable: true, configurable: true };
        },
        ownKeys(target) {
            return [...Array.from({ length: source.size }, (_, row) => String(row)), ...Reflect.ownKeys(target)];
        },
        set() {
            return false;
        },
        defineProperty() {
            return false;
        },
        deleteProperty() {
            return false;
        },
    });
}

/**
 * The graph slice's map of records by id. A record built from columns is stored as a number, its
 * place among the rows of every source this map was given, and built and kept when it is first read
 * by `get` or any iteration; anything else is stored as it is, so a map no column record reaches is
 * a plain `Map`.
 */
export class RecordMap<K> extends Map<K, GraphRecord> {
    private readonly sources: RowSource[] = [];
    private readonly bases: number[] = [];
    private next = 0;

    /**
     * What to store for a record: its place when it was built from columns, else the record.
     * @param record - The record a writer is storing.
     * @returns The value to store, and to keep in the op log.
     */
    stored(record: GraphRecord): GraphRecord | number {
        const tag = (record as { [ROW_TAG]?: RowTag })[ROW_TAG];
        if (tag === undefined) {
            return record;
        }

        let at = this.sources.lastIndexOf(tag.source);
        if (at < 0) {
            at = this.sources.push(tag.source) - 1;
            this.bases.push(this.next);
            this.next += tag.source.size;
        }

        return this.bases[at] + tag.row;
    }

    /**
     * Store a value `stored` gave.
     * @param key - The id.
     * @param value - The record or its place.
     * @returns This map.
     */
    put(key: K, value: GraphRecord | number): this {
        return super.set(key, value as GraphRecord);
    }

    /**
     * The record a stored value stands for, built afresh for a place.
     * @param value - The record or its place.
     * @returns The record.
     */
    resolve(value: GraphRecord | number): GraphRecord {
        if (typeof value !== "number") {
            return value;
        }

        // Sources are appended in place order, so the last base at or below the place is its source.
        let at = this.bases.length - 1;
        while (this.bases[at] > value) {
            at--;
        }

        recordsBuilt.count++;
        return this.sources[at].build(value - this.bases[at]);
    }

    /**
     * Resolve an entry and keep what was built.
     * @param key - The id.
     * @param value - What the map holds for it.
     * @returns The record.
     */
    private kept(key: K, value: GraphRecord | number): GraphRecord {
        if (typeof value !== "number") {
            return value;
        }

        const record = this.resolve(value);
        super.set(key, record);
        return record;
    }

    /**
     * The record for an id, built from columns and kept on first read.
     * @param key - The id.
     * @returns The record, or undefined.
     */
    override get(key: K): GraphRecord | undefined {
        const value = super.get(key) as GraphRecord | number | undefined;
        return value === undefined ? undefined : this.kept(key, value);
    }

    /**
     * Every id and record, each built and kept on first read.
     * @yields The entries.
     */
    override *entries(): MapIterator<[K, GraphRecord]> {
        for (const [key, value] of super.entries()) {
            yield [key, this.kept(key, value)];
        }
    }

    /**
     * Every record, each built and kept on first read.
     * @yields The records.
     */
    override *values(): MapIterator<GraphRecord> {
        for (const [key, value] of super.entries()) {
            yield this.kept(key, value);
        }
    }

    /**
     * The entries, as `entries` gives them.
     * @returns The iterator.
     */
    override [Symbol.iterator](): MapIterator<[K, GraphRecord]> {
        return this.entries();
    }

    /**
     * Call a function for each entry, each record built and kept on first read.
     * @param fn - The function.
     * @param self - Its `this`.
     */
    override forEach(fn: (value: GraphRecord, key: K, map: Map<K, GraphRecord>) => void, self?: unknown): void {
        for (const [key, value] of this.entries()) {
            fn.call(self, value, key, this);
        }
    }
}
