/**
 * @file The kept sets: the `sets` slice of project state, one keyed map of frozen records written
 * only by the `set.*` commands through the session's dispatcher, and the state kept beside it
 * (design/sets/sets-design.md sections 3.1, 12.4, 13; design/sets/undo-integration.md section 1).
 *
 * Beside the slice, never in it:
 *
 * - the ISSUED-ID REGISTER, every id ever minted. Monotonic: appended when a group commits,
 *   never written by `put` or `delete`, never rewound. Minting skips it, the live ids and the ids
 *   minted and not yet sealed, so an id is never issued twice even when a transaction creates,
 *   removes and re-creates one name. Undo, redo and a rollback never rewind it.
 * - the TOMBSTONES, `{ id, name, record? }` for each removed id, rewritten at every commit that
 *   removes it. A tombstone is authoritative only while its id is absent from the slice. Its
 *   record is kept while anything still names the id -- a reference to a removed set resolves
 *   through it, and `sets.restore` brings it back -- and dropped by {@link SetsStore.forget} once
 *   nothing does, id and name kept. There is no byte cap: a cap could drop the one record a
 *   visible Detached mark needs.
 * - the SEEDS, per set id: for each edge member a door added from a session edge id, the counter
 *   it came through (design 4.2). A binding cache, not state a command writes: never in a record,
 *   never rolled back, kept after a removal so an undo that restores the record binds the same
 *   edges. Counters are never reissued in a session, so a seed can only ever name its own edge.
 * - the ORDER high-water mark: a new set's order is one past the highest order the store has
 *   held, so a restored record can never share its order with a set created after it was removed.
 *
 * Each change of the slice the dispatcher publishes -- a step recorded, undone or redone --
 * tells the listeners one {@link SetChange} per changed key, from the key's before and after
 * values; a rollback tells nobody.
 *
 * Only `session/sets/` may import this module (a static test enforces it).
 */

import { compareIds } from "../../catalog/sets/canonical";
import type { SetId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import { SET_DEFINITIONS } from "../commands/sets";
import { Dispatcher } from "../project/Dispatcher";
import { loadRecord, type RecordView } from "./prepare";
import type { EdgeSeeds } from "./resolve";
import type { ElementSet, SetChange } from "./types";

/** A removed set's id and last name, and its last record while anything names the id. */
interface Tombstone {
    readonly id: SetId;
    readonly name: string;
    readonly record?: ElementSet;
}

/**
 * The slice and what sits beside it, as stored: the one serialised form a project file or an undo
 * slice uses (design 12, 12.4). Plain JSON once stringified: a record's `revision` is not an own
 * enumerable field, a fixed set's edge members are, and unknown top-level fields are kept. Seeds
 * and every derived value are left out; the order high-water mark is recovered from the records
 * and the tombstones.
 */
interface LogicalSets {
    /** The live records, by order. */
    readonly records: readonly ElementSet[];
    /** Every id ever issued. */
    readonly register: readonly SetId[];
    /** Removed ids, oldest first, with their last name and, while anything named them, record. */
    readonly tombstones: readonly Tombstone[];
}

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

/** What caused a change of the slice, as the dispatcher reports it. */
type SliceCause = "command" | "undo" | "redo" | "restore" | "rollback";

/** The kept sets and the state beside them. */
export class SetsStore implements RecordView {
    /** The dispatcher whose `sets` slice holds the records and whose commands write them. */
    readonly dispatcher: Dispatcher;
    private readonly issued = new Set<SetId>();
    /** Ids minted for a write not yet sealed; dropped once no group is open. */
    private readonly pending = new Set<SetId>();
    private readonly tombstones = new Map<SetId, Tombstone>();
    private readonly listeners = new Set<(change: SetChange) => void>();
    private readonly commitListeners = new Set<(changes: readonly SetChange[]) => void>();
    private readonly seeds = new Map<SetId, { readonly counters: Map<string, number>; version: number }>();
    private highestOrder = 0;
    private listed: { readonly writes: number; readonly list: readonly ElementSet[] } | null = null;
    /** The records as the listeners were last told of them. */
    private told = new Map<SetId, ElementSet>();
    /** The history position the listeners were last told at, to tell a restore's direction. */
    private position = 0;

    /**
     * Keep sets in a dispatcher's `sets` slice.
     * @param dispatcher - The session's dispatcher; one of its own, over the set ops alone, when
     *     absent.
     */
    constructor(dispatcher?: Dispatcher) {
        this.dispatcher = dispatcher ?? new Dispatcher({ definitions: SET_DEFINITIONS });
        const beside = this.dispatcher.events.project;
        this.dispatcher.events.project = (change) => {
            beside?.(change);
            if (change.slices.includes("sets")) {
                this.tell(change.cause);
            }
        };
    }

    /**
     * The slice, live.
     * @returns The records by id.
     */
    private get records(): ReadonlyMap<SetId, ElementSet> {
        return this.dispatcher.state.sets;
    }

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
     * Every live record by order, ties by id: the same frozen array until the slice is written.
     * @returns The records.
     */
    list(): readonly ElementSet[] {
        const writes = this.dispatcher.lane.writes("sets");
        if (this.listed?.writes !== writes) {
            this.listed = {
                writes,
                list: Object.freeze(
                    [...this.records.values()].sort((a, b) => a.order - b.order || compareIds(a.id, b.id)),
                ),
            };
        }

        return this.listed.list;
    }

    /**
     * Every id ever issued and sealed.
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
     * A set's seeds.
     * @param id - The set.
     * @returns The seeds, or undefined when no door has seeded the set.
     */
    seedsOf(id: SetId): EdgeSeeds | undefined {
        return this.seeds.get(id);
    }

    /**
     * Record the counters edge members entered a set through, replacing earlier ones for the same
     * members. Moves the seeds' version, so a binding plan built before is rebuilt.
     * @param id - The set.
     * @param entries - Member key and counter pairs. A Map given for a set with no seeds yet is
     * adopted, not copied, so the caller must not touch it afterwards.
     */
    seed(id: SetId, entries: Iterable<readonly [key: string, counter: number]>): void {
        // ponytail: one string-keyed Map entry per seeded member; a typed-array form keyed like the
        // edge columns when million-edge sets from createFrom make its memory matter.
        let seeds = this.seeds.get(id);
        if (seeds === undefined && entries instanceof Map) {
            // A fresh set adopts the map its materialising door built (and hands over), instead of
            // one set() per member.
            if (entries.size > 0) {
                this.seeds.set(id, { counters: entries as Map<string, number>, version: 1 });
            }

            return;
        }

        for (const [key, counter] of entries) {
            if (seeds === undefined) {
                seeds = { counters: new Map(), version: 0 };
                this.seeds.set(id, seeds);
            }

            seeds.counters.set(key, counter);
            seeds.version++;
        }
    }

    /**
     * Drop the kept record of every removed id nothing names any more, keeping its id and name.
     * @param named - Whether anything live still names an id.
     */
    forget(named: (id: SetId) => boolean): void {
        for (const [id, tombstone] of this.tombstones) {
            if (tombstone.record !== undefined && !this.records.has(id) && !named(id)) {
                this.tombstones.set(id, Object.freeze({ id, name: tombstone.name }));
            }
        }
    }

    /**
     * Mint an id for a name: `set_<slug>`, then `_2`, `_3` and on, skipping the register, the
     * live ids and the ids minted for writes not yet sealed.
     * @param name - The trimmed name.
     * @returns The id, issued once the step that writes it is sealed.
     */
    mint(name: string): SetId {
        if (this.dispatcher.idle) {
            // Nothing is open, so an id still pending belongs to a write that was rolled back.
            this.pending.clear();
        }

        const base = `set_${slugOf(name)}`;
        let id = base;
        for (let suffix = 2; this.issued.has(id) || this.records.has(id) || this.pending.has(id); suffix++) {
            id = `${base}_${suffix}`;
        }

        this.pending.add(id);

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
     * Note a record a set op is about to write: its order is never given out again. Called by the
     * set service, never rewound.
     * @param record - The record.
     */
    written(record: ElementSet): void {
        this.highestOrder = Math.max(this.highestOrder, record.order);
    }

    /**
     * Keep an id in the register: the step that wrote it has been sealed.
     * @param id - The id.
     */
    issue(id: SetId): void {
        this.issued.add(id);
        this.pending.delete(id);
    }

    /**
     * Tombstone a record about to be removed, newest last, so `sets.restore` can bring it back.
     * @param record - The record.
     */
    bury(record: ElementSet): void {
        this.tombstones.delete(record.id);
        this.tombstones.set(record.id, Object.freeze({ id: record.id, name: record.name, record }));
    }

    /**
     * The slice as stored. Internal: the one serialiser a project file or an undo slice uses.
     * @returns The records, the register and the tombstones.
     */
    toLogicalRecords(): LogicalSets {
        return Object.freeze({
            records: this.list(),
            register: Object.freeze([...this.issued]),
            tombstones: Object.freeze([...this.tombstones.values()]),
        });
    }

    /**
     * Load a stored slice into this empty store, as the baseline: every record validated in load
     * mode, the register and the tombstones restored, and the listeners told once, as `load`.
     * Internal.
     * @param stored - What {@link toLogicalRecords} returned, after any JSON round trip.
     *
     * A record's `createdFrom` of a kind this version does not know is kept as given and written
     * back unchanged, as an unknown definition kind is (design 12.5). A tombstone whose id is also
     * a live record is dropped: a tombstone speaks only for an absent id.
     * @throws `E_BAD_COMMAND` for a malformed slice, record or tombstone, or two records with one
     *     id; an Error for a non-empty store, or once the history has recorded a step.
     */
    loadLogicalRecords(stored: unknown): void {
        const value = stored as { records?: unknown; register?: unknown; tombstones?: unknown } | null;
        if (this.records.size > 0 || this.issued.size > 0 || this.tombstones.size > 0) {
            throw new Error("Stored sets load only into an empty store.");
        }

        if (
            typeof value !== "object" ||
            value === null ||
            !Array.isArray(value.records) ||
            !Array.isArray(value.register) ||
            !value.register.every((id) => typeof id === "string") ||
            !Array.isArray(value.tombstones)
        ) {
            throw badSlice("Stored sets are { records, register, tombstones }.");
        }

        const records = value.records.map((record) => loadRecord(record));
        const live = new Set<SetId>();
        for (const record of records) {
            if (live.has(record.id)) {
                throw badSlice(`Two stored sets have the id "${record.id}".`, { id: record.id });
            }

            live.add(record.id);
        }

        const tombstones = value.tombstones.flatMap((entry: unknown): Tombstone[] => {
            const t = entry as { id?: unknown; name?: unknown; record?: unknown } | null;
            if (typeof t !== "object" || t === null || typeof t.id !== "string" || typeof t.name !== "string") {
                throw badSlice("A stored tombstone is { id, name, record? }.");
            }

            return live.has(t.id)
                ? []
                : [
                      Object.freeze({
                          id: t.id,
                          name: t.name,
                          ...(t.record === undefined ? {} : { record: loadRecord(t.record) }),
                      }),
                  ];
        });

        // The baseline: what history starts from, recorded as no step.
        this.dispatcher.seed((draft) => {
            for (const record of records) {
                draft.sets.set(record.id, record);
            }
        });
        for (const record of records) {
            this.written(record);
        }

        for (const id of [...value.register, ...records.map((record) => record.id), ...tombstones.map((t) => t.id)]) {
            this.issued.add(id);
        }

        for (const tombstone of tombstones) {
            this.tombstones.set(tombstone.id, tombstone);
            if (tombstone.record !== undefined) {
                this.highestOrder = Math.max(this.highestOrder, tombstone.record.order);
            }
        }

        this.tell("load");
    }

    /**
     * Listen to committed changes: one call per changed key per change of the slice.
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
     * Hear each change of the slice whole, before any per-key listener: the change notification
     * (`./notify`) re-resolves live sets here, ahead of `set:changed`.
     * @param listener - The listener, handed every change of the group.
     * @returns A function that stops listening.
     */
    onCommit(listener: (changes: readonly SetChange[]) => void): () => void {
        this.commitListeners.add(listener);

        return () => {
            this.commitListeners.delete(listener);
        };
    }

    /**
     * Tell the listeners what changed since they were last told: the diff of the slice.
     * @param cause - What changed it. A rollback puts back what nobody was told of, so it tells
     *     nobody.
     */
    private tell(cause: SliceCause | "load"): void {
        const was = this.told;
        const now = new Map(this.records);
        this.told = now;
        const { position } = this.dispatcher.history;
        const moved = position < this.position ? "undo" : "redo";
        this.position = position;
        if (cause === "rollback") {
            return;
        }

        const told: SetChange["cause"] = cause === "restore" ? moved : cause;
        const changes: SetChange[] = [];
        for (const id of new Set([...was.keys(), ...now.keys()])) {
            const before = was.get(id);
            const after = now.get(id);
            if (before === after) {
                continue;
            }

            if (after === undefined) {
                changes.push({ id, change: "removed", fields: [], set: null, cause: told });
            } else if (before === undefined) {
                changes.push({ id, change: "created", fields: [], set: after, cause: told });
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

                // Written and put back within one step (renamed and renamed back): no change.
                if (fields.length > 0) {
                    changes.push({ id, change: "updated", fields, set: after, cause: told });
                }
            }
        }

        if (changes.length === 0) {
            return;
        }

        const committed = Object.freeze(
            changes.map((change) => Object.freeze({ ...change, fields: Object.freeze(change.fields) })),
        );
        for (const listener of [...this.commitListeners]) {
            try {
                listener(committed);
            } catch {
                // A listener's failure is the listener's; the write has committed.
            }
        }

        for (const frozen of committed) {
            for (const listener of [...this.listeners]) {
                try {
                    listener(frozen);
                } catch {
                    // A listener's failure is the listener's; the write has committed.
                }
            }
        }
    }
}

/**
 * The refusal of a malformed stored slice.
 * @param message - What is wrong.
 * @param details - What names it.
 * @returns The error to throw.
 */
function badSlice(message: string, details: Record<string, unknown> = {}): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message,
        source: "data",
        details: { reason: "bad-slice", ...details },
    });
}
