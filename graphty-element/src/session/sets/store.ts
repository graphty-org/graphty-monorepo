/**
 * @file The kept-set slice: one keyed map of frozen records, written only through `put` and
 * `delete` inside a write group (design/sets/sets-design.md sections 3.1, 12.4, 13).
 *
 * Beside the slice, never in it:
 *
 * - the ISSUED-ID REGISTER, every id ever minted. Monotonic: appended when a group commits,
 *   never written by `put` or `delete`, never rewound. Minting skips it, the live ids and the ids
 *   pending in the open group, so an id is never issued twice even when a group creates, removes
 *   and re-creates one name.
 * - the TOMBSTONES, `{ id, name, record? }` for each removed id, rewritten at every commit that
 *   removes it. A tombstone is authoritative only while its id is absent from the slice, and the
 *   records they keep are capped by bytes (this module's own accounting), oldest dropped first,
 *   id and name kept.
 * - the ORDER high-water mark: a new set's order is one past the highest order the store has
 *   held, so a restored record can never share its order with a set created after it was removed.
 *
 * A committed group tells its listeners one {@link SetChange} per touched key, from the key's
 * before and after values; a group that throws is rolled back and tells nobody.
 *
 * Only `session/sets/` may import this module (a static test enforces it): nothing else writes
 * set state.
 */

import { compareIds } from "../../catalog/sets/canonical";
import type { SetId } from "../../catalog/types";
import { recordBytes,type RecordView } from "./prepare";
import type { ElementSet, SetChange } from "./types";

/** A removed set's id and last name, and its last record while the byte cap allows. */
interface Tombstone {
    readonly id: SetId;
    readonly name: string;
    readonly record?: ElementSet;
}

/** The default byte cap on tombstoned records. */
const TOMBSTONE_BYTES = 8 * 1024 * 1024;

/**
 * The slug a name mints its id from. The same function `ScopeApi` has always minted with, so a
 * set's first id equals the id `scope.save` gave the same name. Never contains a dot, so a
 * namespaced import id (`set_<ns>.<rest>`) can never equal a local mint.
 * @param name - The trimmed name.
 * @returns Lower-case letters, digits and single dashes; "set" when nothing is left.
 */
function slugOf(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");

    return slug === "" ? "set" : slug;
}

/** A nested write's savepoint: each key's value before it, and the group's state when it began. */
interface Savepoint {
    readonly values: Map<SetId, ElementSet | undefined>;
    readonly minted: number;
    readonly order: number;
}

/**
 * The open write group: each touched key's value before the group, the ids it minted, and the
 * savepoints of the writes open inside it, innermost last.
 */
interface Group {
    readonly before: Map<SetId, ElementSet | undefined>;
    readonly minted: SetId[];
    readonly saves: Savepoint[];
}

/** The kept-set slice and the state beside it. */
export class SetsStore implements RecordView {
    private readonly records = new Map<SetId, ElementSet>();
    private readonly issued = new Set<SetId>();
    private readonly tombstones = new Map<SetId, Tombstone>();
    private readonly listeners = new Set<(change: SetChange) => void>();
    private tombstoneBytes = 0;
    private highestOrder = 0;
    private group: Group | null = null;
    private listed: readonly ElementSet[] | null = null;

    /**
     * An empty store.
     * @param options - Store settings.
     * @param options.tombstoneBytes - The byte cap on tombstoned records.
     */
    constructor(private readonly options: { readonly tombstoneBytes?: number } = {}) {}

    /**
     * One live record.
     * @param id - Its id.
     * @returns The record, or undefined.
     */
    get(id: SetId): ElementSet | undefined {
        return this.records.get(id);
    }

    /**
     * Every live record, in insertion order.
     * @returns The records.
     */
    values(): Iterable<ElementSet> {
        return this.records.values();
    }

    /**
     * Every live record by order, ties by id: the same frozen array until a write.
     * @returns The records.
     */
    list(): readonly ElementSet[] {
        this.listed ??= Object.freeze(
            [...this.records.values()].sort((a, b) => a.order - b.order || compareIds(a.id, b.id)),
        );

        return this.listed;
    }

    /**
     * Every id ever issued and committed.
     * @returns The register.
     */
    register(): ReadonlySet<SetId> {
        return this.issued;
    }

    /**
     * A removed id's tombstone, while the id is not live.
     * @param id - The id.
     * @returns The tombstone, or undefined when the id is live or was never removed.
     */
    tombstone(id: SetId): Tombstone | undefined {
        return this.records.has(id) ? undefined : this.tombstones.get(id);
    }

    /**
     * The bytes the tombstoned records hold, by this module's accounting.
     * @returns The byte count.
     */
    tombstoneRecordBytes(): number {
        return this.tombstoneBytes;
    }

    /**
     * Mint an id for a name: `set_<slug>`, then `_2`, `_3` and on, skipping the register, the
     * live ids and the ids already minted in the open group. Only inside a write group.
     * @param name - The trimmed name.
     * @returns The id, pending until the group commits.
     */
    mint(name: string): SetId {
        const group = this.requireGroup("mint");
        const base = `set_${slugOf(name)}`;
        let id = base;
        for (let suffix = 2; this.issued.has(id) || this.records.has(id) || group.minted.includes(id); suffix++) {
            id = `${base}_${suffix}`;
        }

        group.minted.push(id);

        return id;
    }

    /**
     * The order a new set takes: one past the highest the store has held.
     * @returns The order.
     */
    nextOrder(): number {
        return this.highestOrder + 1;
    }

    /**
     * Write one record. Only inside a write group.
     * @param record - A frozen record from `prepare`, or restored.
     */
    put(record: ElementSet): void {
        this.touch(record.id);
        this.records.set(record.id, record);
        this.highestOrder = Math.max(this.highestOrder, record.order);
    }

    /**
     * Remove one record. Only inside a write group.
     * @param id - Its id.
     */
    delete(id: SetId): void {
        this.touch(id);
        this.records.delete(id);
    }

    /**
     * Run one write group: every `mint`, `put` and `delete` inside commits together, or, when
     * `write` throws, none of them does. A nested call joins the open group as a savepoint: when
     * it throws, its own writes and mints are undone and the group goes on.
     * @param write - The writes.
     * @returns What `write` returned.
     */
    transact<T>(write: () => T): T {
        const outer = this.group;
        const group: Group = outer ?? { before: new Map(), minted: [], saves: [] };
        // A nested call is a savepoint: when it throws, only its own writes and mints are undone
        // and the outer group carries on, so a refused door inside a group leaves no trace.
        const save = { values: new Map<SetId, ElementSet | undefined>(), minted: group.minted.length, order: this.highestOrder };
        group.saves.push(save);
        this.group = group;
        let result: T;
        try {
            result = write();
        } catch (error) {
            for (const [id, record] of save.values) {
                if (record === undefined) {
                    this.records.delete(id);
                } else {
                    this.records.set(id, record);
                }
            }

            group.minted.length = save.minted;
            this.highestOrder = save.order;
            this.listed = null;
            throw error;
        } finally {
            group.saves.pop();
            this.group = outer;
        }

        const parent = group.saves.at(-1);
        if (parent !== undefined) {
            for (const [id, record] of save.values) {
                if (!parent.values.has(id)) {
                    parent.values.set(id, record);
                }
            }
        }

        if (outer === null) {
            this.commit(group);
        }

        return result;
    }

    /**
     * Listen to committed changes: one call per touched key per group.
     * @param listener - The listener.
     * @returns A function that stops listening.
     */
    onChange(listener: (change: SetChange) => void): () => void {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * The open group.
     * @param verb - What needs it, for the message.
     * @returns The group.
     * @throws An Error outside a write group.
     */
    private requireGroup(verb: string): Group {
        if (this.group === null) {
            throw new Error(`SetsStore.${verb} runs inside transact().`);
        }

        return this.group;
    }

    /**
     * Remember a key's value before the group first touched it.
     * @param id - The key.
     */
    private touch(id: SetId): void {
        const { before, saves } = this.requireGroup("put and delete");
        const prior = this.records.get(id);
        if (!before.has(id)) {
            before.set(id, prior);
        }

        const save = saves.at(-1);
        if (save !== undefined && !save.values.has(id)) {
            save.values.set(id, prior);
        }

        this.listed = null;
    }

    /**
     * Commit a group: register its ids, tombstone what it removed, tell the listeners.
     * @param group - The group.
     */
    private commit(group: Group): void {
        for (const id of group.minted) {
            this.issued.add(id);
        }

        const changes: SetChange[] = [];
        for (const [id, before] of group.before) {
            const after = this.records.get(id);
            if (before === after) {
                continue;
            }

            if (after === undefined) {
                this.bury(before as ElementSet);
                changes.push({ id, change: "removed", fields: [], set: null, cause: "command" });
            } else if (before === undefined) {
                changes.push({ id, change: "created", fields: [], set: after, cause: "command" });
            } else {
                const fields: ("name" | "definition" | "order")[] = [];
                if (before.name !== after.name) {
                    fields.push("name");
                }

                if (before.definition !== after.definition) {
                    fields.push("definition");
                }

                if (before.order !== after.order) {
                    fields.push("order");
                }

                changes.push({ id, change: "updated", fields, set: after, cause: "command" });
            }
        }

        for (const change of changes) {
            const frozen = Object.freeze({ ...change, fields: Object.freeze(change.fields) });
            for (const listener of [...this.listeners]) {
                try {
                    listener(frozen);
                } catch {
                    // A listener's failure is the listener's; the write has committed.
                }
            }
        }
    }

    /**
     * Tombstone a removed record, newest last, then drop the oldest records past the byte cap.
     * @param record - The record removed.
     */
    private bury(record: ElementSet): void {
        const prior = this.tombstones.get(record.id);
        if (prior?.record !== undefined) {
            this.tombstoneBytes -= recordBytes(prior.record);
        }

        this.tombstones.delete(record.id);
        this.tombstones.set(record.id, Object.freeze({ id: record.id, name: record.name, record }));
        this.tombstoneBytes += recordBytes(record);

        const cap = this.options.tombstoneBytes ?? TOMBSTONE_BYTES;
        for (const [id, tombstone] of this.tombstones) {
            if (this.tombstoneBytes <= cap) {
                break;
            }

            if (tombstone.record !== undefined) {
                this.tombstoneBytes -= recordBytes(tombstone.record);
                this.tombstones.set(id, Object.freeze({ id, name: tombstone.name }));
            }
        }
    }
}
