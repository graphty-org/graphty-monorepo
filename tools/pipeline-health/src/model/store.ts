// The storage the model needs from DynamoDB, and an in-memory copy of it for tests. The AWS SDK adapter implements
// the same interface over the single table `graphty-health` (pk, sk, ttl), with strongly consistent reads.
// Expired items (past `ttl`) are NOT filtered here, as DynamoDB does not filter them before its TTL sweep runs;
// readers filter with isLive().

export interface Key {
    pk: string;
    sk: string;
}

export interface Item extends Key {
    /** Expiry, epoch SECONDS (DynamoDB TTL). */
    ttl?: number;
    [field: string]: unknown;
}

/** A condition the write needs; DynamoDB ConditionExpression in the adapter. */
export type Condition =
    | { notExists: true }
    | { field: string; op: "<=" | "<" | "=" | ">=" | ">"; value: number | string; orNotExists?: boolean };

export interface Change {
    /** Numbers added to fields (DynamoDB ADD); a missing field starts at 0. */
    add?: Record<string, number>;
    set?: Record<string, unknown>;
}

export type BatchOp = { put: Item } | { delete: Key };
export type TransactOp = { put: Item; condition?: Condition } | { delete: Key };

export interface Store {
    get(key: Key): Promise<Item | undefined>;
    /** False when the condition failed; the item is then unchanged. */
    put(item: Item, condition?: Condition): Promise<boolean>;
    /** Items of one partition, sk ascending, with from <= sk <= to when given. */
    query(pk: string, range?: { from?: string; to?: string }): Promise<Item[]>;
    /** The item after the change, or undefined when the condition failed. */
    update(key: Key, change: Change, condition?: Condition): Promise<Item | undefined>;
    /** Unconditional puts and deletes; the adapter chunks them into BatchWriteItem calls of 25. */
    batch(ops: BatchOp[]): Promise<void>;
    /** All the ops or none (TransactWriteItems, at most 100): false, writing nothing, when a put's condition failed. */
    transact(ops: TransactOp[]): Promise<boolean>;
}

export const isLive = (item: Item, nowMs: number): boolean => item.ttl === undefined || item.ttl * 1000 > nowMs;

function holds(item: Item | undefined, c: Condition | undefined): boolean {
    if (!c) {
        return true;
    }
    if ("notExists" in c) {
        return item === undefined;
    }
    if (item === undefined || item[c.field] === undefined) {
        return c.orNotExists === true;
    }
    const v = item[c.field] as number | string;
    switch (c.op) {
        case "<=":
            return v <= c.value;
        case "<":
            return v < c.value;
        case "=":
            return v === c.value;
        case ">=":
            return v >= c.value;
        case ">":
            return v > c.value;
        default:
            return false;
    }
}

const id = (k: Key): string => `${k.pk}\u0000${k.sk}`;
const copy = <T>(v: T): T => structuredClone(v);
/**
 * Runs f now and wraps its result in a promise; a throw becomes a rejection, as in an async function.
 * @param f - the synchronous work
 * @returns a promise of f's result
 */
const settle = <T>(f: () => T): Promise<T> =>
    new Promise((resolve) => {
        resolve(f());
    });

/** In-memory Store for tests: same semantics as the DynamoDB adapter, and it counts writes. */
export class MemoryStore implements Store {
    readonly items = new Map<string, Item>();
    /** Write units spent, one per put, update or delete: lets tests count work. */
    writes = 0;

    /**
     * Reads one item.
     * @param key - partition and sort key of the item
     * @returns a copy of the item, or undefined when absent
     */
    get(key: Key): Promise<Item | undefined> {
        return settle(() => {
            const item = this.items.get(id(key));
            return item && copy(item);
        });
    }

    /**
     * Writes one item when the condition holds.
     * @param item - the item to store (copied)
     * @param condition - optional condition on the existing item
     * @returns false when the condition failed, true when written
     */
    put(item: Item, condition?: Condition): Promise<boolean> {
        return settle(() => {
            if (!holds(this.items.get(id(item)), condition)) {
                return false;
            }
            this.writes++;
            this.items.set(id(item), copy(item));
            return true;
        });
    }

    /**
     * Reads the items of one partition.
     * @param pk - partition key
     * @param range - optional inclusive sort-key bounds
     * @param range.from - lowest sort key to include
     * @param range.to - highest sort key to include
     * @returns copies of the matching items, sk ascending
     */
    query(pk: string, range: { from?: string; to?: string } = {}): Promise<Item[]> {
        return settle(() =>
            [...this.items.values()]
                .filter(
                    (i) =>
                        i.pk === pk &&
                        (range.from === undefined || i.sk >= range.from) &&
                        (range.to === undefined || i.sk <= range.to),
                )
                .sort((a, b) => Number(a.sk > b.sk) - Number(a.sk < b.sk))
                .map(copy),
        );
    }

    /**
     * Applies adds and sets to one item, creating it when absent.
     * @param key - partition and sort key of the item
     * @param change - fields to add to and fields to set
     * @param condition - optional condition on the existing item
     * @returns a copy of the item after the change, or undefined when the condition failed
     */
    update(key: Key, change: Change, condition?: Condition): Promise<Item | undefined> {
        return settle(() => {
            const old = this.items.get(id(key));
            if (!holds(old, condition)) {
                return undefined;
            }
            const next: Item = { ...(old ? copy(old) : {}), pk: key.pk, sk: key.sk, ...copy(change.set ?? {}) };
            for (const [f, n] of Object.entries(change.add ?? {})) {
                next[f] = ((next[f] as number | undefined) ?? 0) + n;
            }
            this.writes++;
            this.items.set(id(key), next);
            return copy(next);
        });
    }

    /**
     * Applies unconditional puts and deletes in order.
     * @param ops - the puts and deletes
     * @returns a promise that settles once every op is applied
     */
    batch(ops: BatchOp[]): Promise<void> {
        return settle(() => {
            for (const op of ops) {
                this.writes++;
                if ("put" in op) {
                    this.items.set(id(op.put), copy(op.put));
                } else {
                    this.items.delete(id(op.delete));
                }
            }
        });
    }

    /**
     * Applies all the ops, or none when any put's condition fails.
     * @param ops - conditional puts and deletes
     * @returns false, writing nothing, when a condition failed; true otherwise
     */
    async transact(ops: TransactOp[]): Promise<boolean> {
        if (!ops.every((op) => !("put" in op) || holds(this.items.get(id(op.put)), op.condition))) {
            return false;
        }
        await this.batch(ops.map((op) => ("put" in op ? { put: op.put } : op)));
        return true;
    }
}
