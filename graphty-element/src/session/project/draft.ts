/**
 * @file The only writer of project state: drafts, the patches they seal into, and applying a
 * patch forward or backward.
 *
 * A draft writes through to live state as it goes and records, for each key it writes, the key's
 * value just before its first write (its prior) and the value it last wrote (its next). Undo puts
 * the priors back and redo puts the nexts back, as the identical objects.
 *
 * Two drafts can be open at once. When one writes a key the other has already written, the key
 * is handed over: the later writer takes the earlier one's prior as its own, and the earlier one
 * drops the key. So each key is in exactly one open draft, a rollback never undoes somebody
 * else's later write, and undoing every step still returns to the state before all of them. See
 * design/undo/undo-design.md section 4.3, "Value slices hand the key over".
 *
 * This module covers the value slices. The op-log slices (`graph`, `pins`) have writers of their
 * own (`./graphOps.ts`), which write live state themselves and hand the draft an {@link OpLogEntry}
 * saying how to put the write back and do it again; the draft keeps those entries in order, and
 * undo, redo and rollback run them. The coordinates a `positions.set` writes are kept as a row
 * patch beside them (`./arrangement.ts`); the history, not the draft, restores them.
 */

import type { CameraState } from "../../camera/types";
import type { RunId, ScopeId } from "../../catalog/types";
import { retentionOf } from "../results/RunResult";
import type { SavedScopeRecord } from "../scope/ScopeApi";
import type { CompiledLayer } from "../styles/Layer";
import { mergeRowPatches, type RowPatch, rowPatchBytes } from "./arrangement";
import type { TouchedIds } from "./graphOps";
import type { LayoutChoice, ProjectState, RunEntry, VisibilityState } from "./state";
import { strictStateEnabled, strictViolation } from "./strict";

/** Stands for "the key had no value": a map key that was not there. */
export const ABSENT: unique symbol = Symbol("absent");

/** The slices a draft writes by value. */
type ValueSlice = "config" | "layout" | "runs" | "styles" | "visibility" | "scopes" | "views";

/** One key a patch wrote: what it held before, and what the patch left in it. */
interface PatchEntry {
    readonly slice: ValueSlice;
    /** The key within the slice; "" for the whole-value slices `styles` and `layout`. */
    readonly key: string;
    readonly prior: unknown;
    readonly next: unknown;
}

/** A slice a patch can touch, by value, as an op-log, or as coordinates. */
export type Slice = ValueSlice | "graph" | "pins" | "arrangement";

/**
 * One write to an op-log slice, recorded by the primitive that made it: live state already holds
 * the write, and this says how to undo and redo it on resolved values. An entry may still grow
 * while its draft is open (a chunked writer appends rows to it); it is never changed once sealed.
 */
export interface OpLogEntry {
    readonly slice: "graph" | "pins";
    /** Put the write back. `rollback` is true when the group never recorded it. */
    undo(rollback: boolean): void;
    /** Write it again, exactly as it was written. */
    redo(): void;
    /** What it retains, approximately, in bytes. */
    bytes(): number;
    /**
     * Report the node and edge ids it wrote, for the selection after an undo or a redo.
     * @param into - Where to report them.
     */
    touched(into: TouchedIds): void;
}

/** What a sealed draft recorded. Frozen. */
export interface Patch {
    readonly entries: readonly PatchEntry[];
    /** The op-log writes, in the order they were made. */
    readonly log: readonly OpLogEntry[];
    /** The rows `positions.set` wrote, or null. */
    readonly rows: RowPatch | null;
}

/**
 * Whether a patch recorded anything.
 * @param patch - The patch.
 * @returns True when it wrote a value key or an op-log entry.
 */
export function isEmptyPatch(patch: Patch): boolean {
    return patch.entries.length === 0 && patch.log.length === 0 && patch.rows === null;
}

/**
 * Whether two slice values are the same: equal primitives, the same object, or plain objects and
 * arrays whose members are the same. Anything else (a map, a typed array, a class instance) is the
 * same only when it is the same object.
 * @param left - One value.
 * @param right - The other.
 * @returns True when they are the same.
 */
function sameValue(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        return left.length === right.length && left.every((member, at) => sameValue(member, right[at]));
    }

    if (!isPlainRecord(left) || !isPlainRecord(right)) {
        return false;
    }

    const keys = Object.keys(left);
    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]))
    );
}

/**
 * Whether a value is a plain object: `{...}` or one made with a null prototype.
 * @param value - The value.
 * @returns True when it is.
 */
function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Whether a patch entry wrote what was there already. A style stack is compared layer by layer,
 * as each layer is described, because compiling a layer again makes a new selector predicate.
 * @param entry - The entry.
 * @returns True when its next value is the same as its prior one.
 */
function wroteNothing(entry: PatchEntry): boolean {
    if (entry.slice !== "styles") {
        return sameValue(entry.prior, entry.next);
    }

    const prior = entry.prior as readonly CompiledLayer[];
    const next = entry.next as readonly CompiledLayer[];
    return prior.length === next.length && prior.every((layer, at) => sameValue(layer.layer, next[at].layer));
}

/**
 * A patch without the value entries that wrote what was there already, so a command that set
 * something to its current value records no step.
 * @param patch - The patch.
 * @returns It, or a copy without those entries.
 */
export function withoutNoOps(patch: Patch): Patch {
    const entries = patch.entries.filter((entry) => !wroteNothing(entry));
    return entries.length === patch.entries.length
        ? patch
        : Object.freeze({ ...patch, entries: Object.freeze(entries) });
}

/**
 * What a patch retains, for the history's byte budget.
 * @param patch - The patch.
 * @returns Bytes; value entries are held by reference and count nothing here.
 */
export function patchBytes(patch: Patch): number {
    return patch.log.reduce((sum, entry) => sum + entry.bytes(), patch.rows === null ? 0 : rowPatchBytes(patch.rows));
}

/**
 * Report the node and edge ids a patch touched: its op-log writes, the rows `positions.set` wrote,
 * and the explicit members of a scope it saved or removed. Value slices name no element.
 * @param patch - The patch.
 * @param into - Where to report them.
 */
export function touchedBy(patch: Patch, into: TouchedIds): void {
    for (const entry of patch.log) {
        entry.touched(into);
    }

    for (const id of patch.rows?.ids ?? []) {
        into.node(id);
    }

    for (const entry of patch.entries) {
        if (entry.slice !== "scopes") {
            continue;
        }

        for (const record of [entry.prior, entry.next]) {
            // ponytail: only a scope saved as a list of nodes names its members; one saved as an
            // expression would need resolving here, and none of the history paths does that yet.
            const spec = record === ABSENT ? null : (record as SavedScopeRecord).spec;
            if (typeof spec === "object" && spec !== null && "nodes" in spec) {
                for (const id of spec.nodes) {
                    into.node(id);
                }
            }
        }
    }
}

/**
 * What the run results a patch holds retain, counted once across the history: each result's
 * columns and caches, and each id index that is not the resident snapshot's
 * (design/undo/undo-design.md section 7).
 * @param patch - The patch.
 * @param token - The resident snapshot's graph token.
 * @param seen - Results and indexes already counted against an older step.
 * @returns Bytes.
 */
export function patchCharge(patch: Patch, token: number, seen: WeakSet<object>): number {
    let bytes = 0;
    for (const entry of patch.entries) {
        if (entry.slice !== "runs") {
            continue;
        }

        for (const value of [entry.prior, entry.next]) {
            const result = value === ABSENT ? undefined : (value as RunEntry).result;
            if (result === undefined || seen.has(result)) {
                continue;
            }

            seen.add(result);
            const retained = retentionOf(result);
            bytes += retained.bytes;
            for (const index of retained.indexes) {
                if (index.token !== token && !seen.has(index.index)) {
                    seen.add(index.index);
                    bytes += index.bytes;
                }
            }
        }
    }

    return bytes;
}

/** Writes one key of a keyed slice. */
interface KeyedWriter<K extends string, V> {
    set(key: K, value: V): void;
    delete(key: K): void;
}

/** An open draft: typed writers per value slice, and nothing else. */
export interface Draft {
    styles: readonly CompiledLayer[];
    layout: LayoutChoice | null;
    readonly config: KeyedWriter<string, unknown>;
    readonly runs: KeyedWriter<RunId, RunEntry>;
    readonly scopes: KeyedWriter<ScopeId, SavedScopeRecord>;
    readonly views: KeyedWriter<string, CameraState>;
    readonly visibility: {
        set<K extends keyof VisibilityState>(key: K, value: VisibilityState[K]): void;
    };
    /**
     * Keep an op-log write, made to live state already, so undo, redo and rollback can reach it.
     * @param entry - How to put it back and do it again.
     */
    log(entry: OpLogEntry): void;
    /**
     * Keep rows `positions.set` wrote to the lane already, merged with any the draft holds.
     * @param rows - The rows, with their prior and new values.
     */
    arrange(rows: RowPatch): void;
    /** Close the draft and hand back what it recorded. */
    seal(): Patch;
    /**
     * Close the draft and put back every key it still holds, through `applyBackward`.
     * @returns What was reverted; no entries when nothing live changed.
     */
    rollback(): Patch;
    /**
     * Remember what the draft holds now.
     * @returns A function that puts back every key written since, releases the keys first written
     * since, and returns the slices it changed. Keys handed to another draft since are theirs.
     */
    checkpoint(): () => readonly Slice[];
}

/** Project state plus the drafts that write it. */
export interface ProjectStore {
    readonly state: ProjectState;
    open(): Draft;
    /** Redo: write every key's `next`. */
    applyForward(patch: Patch): void;
    /** Undo: write every key's `prior`. */
    applyBackward(patch: Patch): void;
}

/** A patch entry while its draft is open. */
interface OpenEntry {
    readonly slice: ValueSlice;
    readonly key: string;
    readonly prior: unknown;
    next: unknown;
}

/** The mutable side of one open draft. */
interface OpenDraft {
    readonly entries: Map<string, OpenEntry>;
    readonly log: OpLogEntry[];
    rows: RowPatch | null;
    closed: boolean;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Wrap a state as a store. The store is the state's only writer from here on.
 * @param initial - The state; its maps must be the store's alone (see `createProjectState`).
 * @param onWrite - Told of every key written to live state, whoever wrote it: a draft, undo,
 * redo or a rollback. The derivation lane marks the key dirty.
 * @returns The store.
 */
export function createProjectStore(
    initial: ProjectState,
    onWrite: (slice: ValueSlice, key: string) => void = () => undefined,
): ProjectStore {
    const state = initial as Mutable<ProjectState>;
    const maps = {
        config: state.config as Map<string, unknown>,
        runs: state.runs as Map<string, unknown>,
        scopes: state.scopes as Map<string, unknown>,
        views: state.views as Map<string, unknown>,
    };
    /** Which open draft holds each key, by `slice/key`. */
    const owners = new Map<string, OpenDraft>();
    const openDrafts = new Set<OpenDraft>();
    const strict = strictStateEnabled();

    const read = (slice: ValueSlice, key: string): unknown => {
        switch (slice) {
            case "styles":
                return state.styles;
            case "layout":
                return state.layout;
            case "visibility":
                return state.visibility[key as keyof VisibilityState];
            default:
                return maps[slice].has(key) ? maps[slice].get(key) : ABSENT;
        }
    };

    const put = (slice: ValueSlice, key: string, value: unknown): void => {
        onWrite(slice, key);
        switch (slice) {
            case "styles":
                state.styles = value as readonly CompiledLayer[];
                return;
            case "layout":
                state.layout = value as LayoutChoice | null;
                return;
            case "visibility":
                state.visibility = Object.freeze({ ...state.visibility, [key]: value });
                return;
            default:
                if (value === ABSENT) {
                    maps[slice].delete(key);
                } else {
                    maps[slice].set(key, value);
                }
        }
    };

    const write = (draft: OpenDraft, slice: ValueSlice, key: string, value: unknown): void => {
        if (draft.closed) {
            throw new Error(`A closed draft cannot write ${slice}/${key}.`);
        }

        const id = `${slice}/${key}`;
        let entry = draft.entries.get(id);
        if (entry === undefined) {
            const holder = owners.get(id);
            let prior: unknown;
            if (holder === undefined) {
                prior = read(slice, key);
            } else {
                // Hand-over: the earlier open draft gives up the key and its prior.
                prior = holder.entries.get(id)?.prior;
                holder.entries.delete(id);
            }

            entry = { slice, key, prior, next: value };
            draft.entries.set(id, entry);
            owners.set(id, draft);
            if (strict) {
                const holders = [...openDrafts].filter((open) => open.entries.has(id)).length;
                if (holders !== 1) {
                    throw strictViolation(`after a hand-over, ${id} is in ${holders} open patches, not one`);
                }
            }
        }

        entry.next = value;
        put(slice, key, value);
    };

    const close = (draft: OpenDraft): void => {
        if (draft.closed) {
            throw new Error("This draft is already closed.");
        }

        draft.closed = true;
        openDrafts.delete(draft);
        for (const id of draft.entries.keys()) {
            owners.delete(id);
        }
    };

    const keyed = <K extends string, V>(draft: OpenDraft, slice: ValueSlice): KeyedWriter<K, V> => ({
        set: (key, value) => {
            write(draft, slice, key, value);
        },
        delete: (key) => {
            write(draft, slice, key, ABSENT);
        },
    });

    const store: ProjectStore = {
        state,
        open(): Draft {
            const draft: OpenDraft = { entries: new Map(), log: [], rows: null, closed: false };
            openDrafts.add(draft);
            const seal = (): Patch => {
                close(draft);

                return Object.freeze({
                    entries: Object.freeze([...draft.entries.values()].map((entry) => Object.freeze({ ...entry }))),
                    log: Object.freeze([...draft.log]),
                    rows: draft.rows,
                });
            };

            return {
                get styles() {
                    return state.styles;
                },
                set styles(next) {
                    write(draft, "styles", "", next);
                },
                get layout() {
                    return state.layout;
                },
                set layout(next) {
                    write(draft, "layout", "", next);
                },
                config: keyed(draft, "config"),
                runs: keyed(draft, "runs"),
                scopes: keyed(draft, "scopes"),
                views: keyed(draft, "views"),
                visibility: {
                    set: (key, value) => {
                        write(draft, "visibility", key, value);
                    },
                },
                log(entry) {
                    if (draft.closed) {
                        throw new Error(`A closed draft cannot write ${entry.slice}.`);
                    }

                    draft.log.push(entry);
                },
                arrange(rows) {
                    if (draft.closed) {
                        throw new Error("A closed draft cannot write arrangement.");
                    }

                    draft.rows = draft.rows === null ? rows : mergeRowPatches(draft.rows, rows);
                },
                seal,
                rollback() {
                    const patch = seal();
                    backward(patch, true);
                    return patch;
                },
                checkpoint() {
                    const saved = new Map([...draft.entries].map(([id, entry]) => [id, entry.next]));
                    const logged = draft.log.length;

                    return () => {
                        const changed = new Set<Slice>();
                        for (const entry of draft.log.splice(logged).reverse()) {
                            entry.undo(true);
                            changed.add(entry.slice);
                        }

                        for (const [id, entry] of draft.entries) {
                            if (!saved.has(id)) {
                                put(entry.slice, entry.key, entry.prior);
                                draft.entries.delete(id);
                                owners.delete(id);
                                changed.add(entry.slice);
                            } else if (saved.get(id) !== entry.next) {
                                entry.next = saved.get(id);
                                put(entry.slice, entry.key, entry.next);
                                changed.add(entry.slice);
                            }
                        }

                        return [...changed];
                    };
                },
            };
        },
        applyForward(patch) {
            for (const entry of patch.entries) {
                put(entry.slice, entry.key, entry.next);
            }

            for (const entry of patch.log) {
                entry.redo();
            }
        },
        applyBackward(patch) {
            backward(patch, false);
        },
    };

    /**
     * Put every key of a patch back, and undo its op-log writes newest first.
     * @param patch - The patch.
     * @param rollback - Whether the patch was never recorded.
     */
    function backward(patch: Patch, rollback: boolean): void {
        for (let index = patch.log.length - 1; index >= 0; index--) {
            patch.log[index].undo(rollback);
        }

        for (let index = patch.entries.length - 1; index >= 0; index--) {
            const entry = patch.entries[index];
            put(entry.slice, entry.key, entry.prior);
        }
    }

    return store;
}

/**
 * One patch doing what `older` and then `newer` did: each key keeps its first prior and takes
 * its last written value. How a coalesced step absorbs the next edit.
 * @param older - The patch recorded first.
 * @param newer - The patch recorded after it.
 * @returns The merged patch, frozen.
 */
export function mergePatches(older: Patch, newer: Patch): Patch {
    const merged = new Map<string, PatchEntry>();
    for (const entry of older.entries) {
        merged.set(`${entry.slice}/${entry.key}`, entry);
    }

    for (const entry of newer.entries) {
        const id = `${entry.slice}/${entry.key}`;
        const first = merged.get(id);
        merged.set(id, first === undefined ? entry : Object.freeze({ ...entry, prior: first.prior }));
    }

    const rows =
        older.rows === null || newer.rows === null
            ? (newer.rows ?? older.rows)
            : mergeRowPatches(older.rows, newer.rows);

    return Object.freeze({
        entries: Object.freeze([...merged.values()]),
        log: Object.freeze([...older.log, ...newer.log]),
        rows,
    });
}

/**
 * Freeze an object and everything reachable from it, in place.
 * @param value - The value.
 * @returns The same value.
 */
export function deepFreeze<T>(value: T): T {
    // ponytail: typed arrays cannot be frozen and Map/Set contents are not reached; command
    // arguments are plain data, so neither occurs yet.
    if (typeof value === "object" && value !== null && !ArrayBuffer.isView(value) && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }
    }

    return value;
}

/**
 * A node or edge record as the `graph` slice keeps it: deep-frozen. Plain objects and arrays not
 * frozen yet are copied as they are frozen, so the caller's own object is never frozen under it;
 * anything else is copied with `structuredClone`. A value already frozen is kept as it is, which
 * is what makes patching one key of a large record cost that key and not the record.
 * @param value - The record, or a value inside one.
 * @returns The frozen value.
 */
export function frozenRecord<T>(value: T): T {
    if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
        return value;
    }

    if (Array.isArray(value)) {
        return Object.freeze(value.map((entry: unknown) => frozenRecord(entry))) as T;
    }

    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
        return deepFreeze(structuredClone(value));
    }

    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        copy[key] = frozenRecord(entry);
    }

    return Object.freeze(copy) as T;
}

/**
 * Copy a command argument that will be stored, and deep-freeze the copy, so a caller mutating
 * its own object afterwards changes nothing in state.
 * @param value - The argument, as the caller handed it in.
 * @param byReference - Keys whose values are kept as the caller's own objects, wherever they
 * appear, neither copied nor frozen (a style layer's `userData`).
 * @returns A frozen copy.
 */
export function deepFreezeArgs<T>(value: T, byReference: readonly string[] = []): T {
    return byReference.length === 0 ? deepFreeze(structuredClone(value)) : (copyKeeping(value, byReference) as T);
}

/**
 * A frozen copy of plain data that leaves the values of some keys as they are.
 * @param value - The value.
 * @param keep - The keys whose values are kept by reference.
 * @returns The copy.
 */
function copyKeeping(value: unknown, keep: readonly string[]): unknown {
    if (Array.isArray(value)) {
        return Object.freeze(value.map((entry: unknown) => copyKeeping(entry, keep)));
    }

    if (typeof value !== "object" || value === null) {
        return value;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
        return deepFreeze(structuredClone(value));
    }

    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        copy[key] = keep.includes(key) ? entry : copyKeeping(entry, keep);
    }

    return Object.freeze(copy);
}
