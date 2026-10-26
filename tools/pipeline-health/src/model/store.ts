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
    }
}

const id = (k: Key) => `${k.pk}\u0000${k.sk}`;
const copy = <T>(v: T): T => structuredClone(v);

/**
 *
 */
export class MemoryStore implements Store {
    readonly items = new Map<string, Item>();
    /** Write units spent, one per put, update or delete: lets tests count work. */
    writes = 0;

    /**
     *
     * @param key
     */
    async get(key: Key) {
        const item = this.items.get(id(key));
        return item && copy(item);
    }

    /**
     *
     * @param item
     * @param condition
     */
    async put(item: Item, condition?: Condition) {
        if (!holds(this.items.get(id(item)), condition)) {
            return false;
        }
        this.writes++;
        this.items.set(id(item), copy(item));
        return true;
    }

    /**
     *
     * @param pk
     * @param range
     * @param range.from
     * @param range.to
     */
    async query(pk: string, range: { from?: string; to?: string } = {}) {
        return [...this.items.values()]
            .filter(
                (i) =>
                    i.pk === pk &&
                    (range.from === undefined || i.sk >= range.from) &&
                    (range.to === undefined || i.sk <= range.to),
            )
            .sort((a, b) => Number(a.sk > b.sk) - Number(a.sk < b.sk))
            .map(copy);
    }

    /**
     *
     * @param key
     * @param change
     * @param condition
     */
    async update(key: Key, change: Change, condition?: Condition) {
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
    }

    /**
     *
     * @param ops
     */
    async batch(ops: BatchOp[]) {
        for (const op of ops) {
            this.writes++;
            if ("put" in op) {
                this.items.set(id(op.put), copy(op.put));
            } else {
                this.items.delete(id(op.delete));
            }
        }
    }

    async transact(ops: TransactOp[]) {
        if (!ops.every((op) => !("put" in op) || holds(this.items.get(id(op.put)), op.condition))) {
            return false;
        }
        await this.batch(ops.map((op) => ("put" in op ? { put: op.put } : op)));
        return true;
    }
}
