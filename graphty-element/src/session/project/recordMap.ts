/**
 * @file Records held as columns and built on demand (design/rendering/row-renderer.md 4.6,
 * "Records into columns", stage 29). A `"batched"` `importColumns` hands the load records that
 * carry their source and row; the graph slice's maps and the op log keep the row, a small integer,
 * and build the record each time it is read. The map never keeps what it built: something reads
 * every record after a load (measured: keeping them held the whole 90 MB at 1M + 1M), so a kept
 * record would undo the saving. A `Node`, once built, keeps its own record as `Node.data`.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../../data/edgeIdentity";
import { frozenRecord } from "./draft";
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

/**
 * Every record built from columns, counted, whoever asked for it: the load's own reads through
 * `rowsView` and every later read through a `RecordMap`. Each is short-lived; what the stage 29
 * test proves is that none is kept (`RecordMap.heldRecords`), and this count shows they were built.
 */
export const recordsBuilt = { count: 0 };

/**
 * Build a row's record and tag it with where it came from, so a writer storing it keeps the row.
 * @param source - The source.
 * @param row - The row.
 * @returns The record, frozen.
 */
function taggedRecord(source: RowSource, row: number): GraphRecord {
    recordsBuilt.count++;
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
    const view = new Proxy<GraphRecord[]>([], {
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
    viewSources.set(view, source);
    return view;
}

/** Each `rowsView` array's source, so the journal can hand out its records as plain data. */
const viewSources = new WeakMap<object, RowSource>();

/**
 * A `rowsView` array as the journal hands it out: a getter that builds a plain frozen array of
 * plain records on read, so a consumer may clone or freeze it, and keeps it only while the reader
 * holds it, so the journal keeps the columns, not a million objects. Anything else is returned as
 * it is.
 * @param records - The records a command holds.
 * @returns A property descriptor for `records`.
 */
export function plainRecords(records: readonly GraphRecord[]): PropertyDescriptor {
    const source = viewSources.get(records);
    if (source === undefined) {
        return { value: records, enumerable: true };
    }

    let last: WeakRef<readonly GraphRecord[]> | undefined;
    return {
        enumerable: true,
        get(): readonly GraphRecord[] {
            let built = last?.deref();
            if (built === undefined) {
                recordsBuilt.count += source.size;
                built = Object.freeze(Array.from({ length: source.size }, (_, row) => source.build(row)));
                last = new WeakRef(built);
            }

            return built;
        },
    };
}

/**
 * How a map's keys turn into counters, and back, so a run of rows can be held in an array by
 * counter instead of one `Map` entry each (stage 127). `counterOf` answers -1 for a key with none.
 */
export interface DenseKeys<K> {
    counterOf(key: K): number;
    keyOf(counter: number): K;
}

/** A dense run may skip at most this many counters at once; a wider gap goes to the `Map`. */
const MAX_GAP = 1024;

/**
 * The graph slice's map of records by id. A record built from columns is stored as a number, its
 * place among the rows of every source this map was given, and built afresh on every `get` or
 * iteration; anything else is stored as it is, so a map no column record reaches is a plain `Map`.
 *
 * Under `"batched"` a writer may also start a dense run (row-renderer.md 4.6, stage 127): while
 * every key written is a counter above every one held, values sit in an array by counter and the
 * `Map` itself holds nothing, so a load of a million rows makes no `Map.set`. Any other write
 * moves the run into the `Map` first, in order, so the map always answers as a `Map` does,
 * insertion order included. A map whose writer never asks for a run is a plain `Map`.
 */
export class RecordMap<K> extends Map<K, GraphRecord> {
    private readonly sources: RowSource[] = [];
    private readonly bases: number[] = [];
    private next = 0;
    /** The dense run's values by counter less `first`, holes undefined; null when there is none. */
    private dense: (GraphRecord | number | undefined)[] | null = null;
    private first = 0;
    private held = 0;

    /**
     * @param keys - How keys turn into counters, for a dense run; without it the map never starts one.
     */
    constructor(private readonly denseKeys?: DenseKeys<K>) {
        super();
    }

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
     * How many records this map keeps as objects; a record from columns is kept as its place.
     * @returns The count.
     */
    heldRecords(): number {
        let held = 0;
        for (const value of this.rawValues()) {
            if (typeof value !== "number") {
                held++;
            }
        }

        return held;
    }

    /**
     * How many ids the `Map` itself holds as entries; the rest are in the dense run.
     * @returns The count.
     */
    mapEntries(): number {
        return super.size;
    }

    /**
     * Store a value `stored` gave.
     * @param key - The id.
     * @param value - The record or its place.
     * @param dense - Whether an empty map may start a dense run with it (the `"batched"` writer).
     * @param counter - The key's counter, when the writer already has it; -1 for none.
     * @returns This map.
     */
    put(
        key: K,
        value: GraphRecord | number,
        dense = false,
        counter = this.denseKeys === undefined ? -1 : this.denseKeys.counterOf(key),
    ): this {
        if (this.dense === null) {
            if (dense && counter >= 0 && super.size === 0) {
                this.dense = [value];
                this.first = counter;
                this.held = 1;
                return this;
            }

            return super.set(key, value as GraphRecord);
        }

        const at = counter - this.first;
        if (counter >= 0 && at >= 0 && at < this.dense.length && this.dense[at] !== undefined) {
            this.dense[at] = value;
            return this;
        }

        if (counter >= 0 && at >= this.dense.length && at - this.dense.length <= MAX_GAP) {
            while (this.dense.length < at) {
                this.dense.push(undefined);
            }

            this.dense.push(value);
            this.held++;
            return this;
        }

        // A key a Map would put anywhere but last: hand the run to the Map, then write it there.
        this.spill();
        return super.set(key, value as GraphRecord);
    }

    /** Move the dense run into the `Map`, in counter order, which is the order it was written. */
    private spill(): void {
        const { dense, denseKeys: keys } = this;
        this.dense = null;
        if (dense === null || keys === undefined) {
            return;
        }

        dense.forEach((value, at) => {
            if (value !== undefined) {
                super.set(keys.keyOf(this.first + at), value as GraphRecord);
            }
        });
    }

    /**
     * The value held for an id, as stored.
     * @param key - The id.
     * @returns The record or its place, or undefined.
     */
    private raw(key: K): GraphRecord | number | undefined {
        if (this.dense === null) {
            return super.get(key) as GraphRecord | number | undefined;
        }

        const at = (this.denseKeys as DenseKeys<K>).counterOf(key) - this.first;
        return at >= 0 ? this.dense[at] : undefined;
    }

    /**
     * Every id and value, as stored, in insertion order.
     * @yields The entries.
     */
    private *rawEntries(): Generator<[K, GraphRecord | number]> {
        const { dense, denseKeys: keys } = this;
        if (dense === null) {
            yield* super.entries() as Iterable<[K, GraphRecord | number]>;
            return;
        }

        for (let at = 0; at < dense.length; at++) {
            const value = dense[at];
            if (value !== undefined) {
                yield [(keys as DenseKeys<K>).keyOf(this.first + at), value];
            }
        }
    }

    /**
     * Every value, as stored, in insertion order.
     * @yields The values.
     */
    private *rawValues(): Generator<GraphRecord | number> {
        if (this.dense === null) {
            yield* super.values() as Iterable<GraphRecord | number>;
            return;
        }

        for (const value of this.dense) {
            if (value !== undefined) {
                yield value;
            }
        }
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
     * How many ids it holds.
     * @returns The count.
     */
    override get size(): number {
        return this.dense === null ? super.size : this.held;
    }

    /**
     * Store a record for an id.
     * @param key - The id.
     * @param value - The record.
     * @returns This map.
     */
    override set(key: K, value: GraphRecord): this {
        return this.put(key, value);
    }

    /**
     * Whether it holds an id.
     * @param key - The id.
     * @returns True when it does.
     */
    override has(key: K): boolean {
        return this.dense === null ? super.has(key) : this.raw(key) !== undefined;
    }

    /**
     * Forget an id.
     * @param key - The id.
     * @returns True when it was held.
     */
    override delete(key: K): boolean {
        if (this.dense === null) {
            return super.delete(key);
        }

        const at = (this.denseKeys as DenseKeys<K>).counterOf(key) - this.first;
        if (at < 0 || this.dense[at] === undefined) {
            return false;
        }

        this.dense[at] = undefined;
        if (--this.held === 0) {
            this.dense = null;
        }

        return true;
    }

    /** Forget every id. */
    override clear(): void {
        this.dense = null;
        super.clear();
    }

    /**
     * The record for an id, built from columns when held as its place.
     * @param key - The id.
     * @returns The record, or undefined.
     */
    override get(key: K): GraphRecord | undefined {
        const value = this.raw(key);
        return value === undefined ? undefined : this.resolve(value);
    }

    /**
     * Every id, in insertion order.
     * @yields The ids.
     */
    override *keys(): MapIterator<K> {
        for (const [key] of this.rawEntries()) {
            yield key;
        }
    }

    /**
     * Every id and record, each built from columns when held as its place.
     * @yields The entries.
     */
    override *entries(): MapIterator<[K, GraphRecord]> {
        for (const [key, value] of this.rawEntries()) {
            yield [key, this.resolve(value)];
        }
    }

    /**
     * Every record, each built from columns when held as its place.
     * @yields The records.
     */
    override *values(): MapIterator<GraphRecord> {
        for (const value of this.rawValues()) {
            yield this.resolve(value);
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
     * Call a function for each entry, each record built from columns when held as its place.
     * @param fn - The function.
     * @param self - Its `this`.
     */
    override forEach(fn: (value: GraphRecord, key: K, map: Map<K, GraphRecord>) => void, self?: unknown): void {
        for (const [key, value] of this.entries()) {
            fn.call(self, value, key, this);
        }
    }
}

/**
 * Whether an array is a `rowsView`, so a load can say its rows came through columns.
 * @param records - The records a load was handed.
 * @returns True for a view over a row source.
 */
export function isRowsView(records: object): boolean {
    return viewSources.has(records);
}

/**
 * Whether two key lists are the same, in order.
 * @param a - One list.
 * @param b - The other.
 * @returns True when they match.
 */
function sameKeys(a: readonly string[], b: readonly string[]): boolean {
    return a.length === b.length && a.every((key, at) => key === b[at]);
}

/**
 * Read plain records once into columns (row-renderer.md 4.6, stage 29, second pull request): one
 * array per key, and per row which keys it has, in its own order. A row's record is built from them
 * on each read, equal to the copy the records path keeps (`frozenRecord`), so the caller's records
 * and their copies are not held. Each value is frozen as the records path freezes it.
 * @param records - Plain records, as `columnsEligible` admits them.
 * @returns The row source.
 */
export function recordsSource(records: readonly object[]): RowSource {
    const shapes: string[][] = [];
    const shapeIds = new Map<string, number>();
    const shapeOf = new Uint32Array(records.length);
    const columns = new Map<string, unknown[]>();
    let shape = -1;
    records.forEach((record, row) => {
        const keys = Object.keys(record);
        if (shape < 0 || !sameKeys(shapes[shape], keys)) {
            const name = JSON.stringify(keys);
            shape = shapeIds.get(name) ?? shapes.push(keys) - 1;
            shapeIds.set(name, shape);
        }

        shapeOf[row] = shape;
        for (const key of keys) {
            let column = columns.get(key);
            if (column === undefined) {
                column = new Array<unknown>(records.length);
                columns.set(key, column);
            }

            column[row] = frozenRecord((record as Record<string, unknown>)[key]);
        }
    });
    return {
        size: records.length,
        build(row: number): GraphRecord {
            const record: Record<string, unknown> = {};
            for (const key of shapes[shapeOf[row]]) {
                record[key] = (columns.get(key) as unknown[])[row];
            }

            return Object.freeze(record);
        },
    };
}

/** A node id is its own counter when it is a non-negative safe integer number. */
const NODE_KEYS: DenseKeys<NodeId> = {
    counterOf: (id) => (typeof id === "number" && Number.isSafeInteger(id) && id >= 0 ? id : -1),
    keyOf: (counter) => counter,
};

/** An edge id is the printing of its counter (`edgeIdOf`). */
const EDGE_KEYS: DenseKeys<EdgeId> = {
    counterOf: (id) => {
        const counter = edgeCounterOf(id);
        return counter === INVALID_INDEX ? -1 : counter;
    },
    keyOf: edgeIdOf,
};

/**
 * An empty node map for the graph slice, able to hold a run of numbered ids densely.
 * @returns The map.
 */
export function nodeRecordMap(): RecordMap<NodeId> {
    return new RecordMap(NODE_KEYS);
}

/**
 * An empty edge map for the graph slice, able to hold a run of edge counters densely.
 * @returns The map.
 */
export function edgeRecordMap(): RecordMap<EdgeId> {
    return new RecordMap(EDGE_KEYS);
}
