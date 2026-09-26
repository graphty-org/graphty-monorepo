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
 * This module covers the value slices. The op-log slices (`graph`, `pins`) and the `arrangement`
 * capture have writers of their own.
 */

import type { CameraState } from "../../camera/types";
import type { RunId, ScopeId } from "../../catalog/types";
import type { SavedScope } from "../scope/ScopeApi";
import type { CompiledLayer } from "../styles/Layer";
import type { LayoutChoice, ProjectState, RunEntry, VisibilityState } from "./state";
import { strictStateEnabled, strictViolation } from "./strict";

/** Stands for "the key had no value": a map key that was not there. */
export const ABSENT: unique symbol = Symbol("absent");

/** The slices a draft writes by value. */
export type ValueSlice = "config" | "layout" | "runs" | "styles" | "visibility" | "scopes" | "views";

/** One key a patch wrote: what it held before, and what the patch left in it. */
interface PatchEntry {
    readonly slice: ValueSlice;
    /** The key within the slice; "" for the whole-value slices `styles` and `layout`. */
    readonly key: string;
    readonly prior: unknown;
    readonly next: unknown;
}

/** What a sealed draft recorded. Frozen. */
export interface Patch {
    readonly entries: readonly PatchEntry[];
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
    readonly scopes: KeyedWriter<ScopeId, SavedScope>;
    readonly views: KeyedWriter<string, CameraState>;
    readonly visibility: {
        set<K extends keyof VisibilityState>(key: K, value: VisibilityState[K]): void;
    };
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
    checkpoint(): () => readonly ValueSlice[];
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
    closed: boolean;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Wrap a state as a store. The store is the state's only writer from here on.
 * @param initial - The state; its maps must be the store's alone (see `createProjectState`).
 * @returns The store.
 */
export function createProjectStore(initial: ProjectState): ProjectStore {
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
            const draft: OpenDraft = { entries: new Map(), closed: false };
            openDrafts.add(draft);
            const seal = (): Patch => {
                close(draft);

                return Object.freeze({
                    entries: Object.freeze([...draft.entries.values()].map((entry) => Object.freeze({ ...entry }))),
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
                seal,
                rollback() {
                    const patch = seal();
                    store.applyBackward(patch);
                    return patch;
                },
                checkpoint() {
                    const saved = new Map([...draft.entries].map(([id, entry]) => [id, entry.next]));

                    return () => {
                        const changed = new Set<ValueSlice>();
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
        },
        applyBackward(patch) {
            for (let index = patch.entries.length - 1; index >= 0; index--) {
                const entry = patch.entries[index];
                put(entry.slice, entry.key, entry.prior);
            }
        },
    };

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

    return Object.freeze({ entries: Object.freeze([...merged.values()]) });
}

/**
 * Freeze an object and everything reachable from it, in place.
 * @param value - The value.
 * @returns The same value.
 */
function deepFreeze<T>(value: T): T {
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
 * Copy a command argument that will be stored, and deep-freeze the copy, so a caller mutating
 * its own object afterwards changes nothing in state.
 * @param value - The argument, as the caller handed it in.
 * @returns A frozen copy.
 */
export function deepFreezeArgs<T>(value: T): T {
    return deepFreeze(structuredClone(value));
}
