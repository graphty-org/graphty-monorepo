/**
 * @file The shapes of kept sets as the session hands them out, the change a write produces, and
 * the synchronous half of `session.sets` (design/sets/sets-design.md sections 4.6, 14, 15.2).
 *
 * `session.sets` publishes these; the definition types they name live in `catalog/types.ts`.
 */

import type { EdgeRef, NodeId, PathKind, RunId, ScopeInput, SetCreatedFrom, SetDefinition, SetDefinitionInput, SetId } from "../../catalog/types";

/**
 * A kept set as the session hands it out: plain, frozen, structured-cloneable.
 *
 * `get` and `list` return the same frozen object until the record changes, so reference equality
 * is a valid change test. The stored record is every field but `revision`, plus any top-level
 * field a newer element wrote, carried through every write unchanged.
 */
export interface ElementSet {
    /** Element-minted, `set_` then opaque; never reissued within a project. */
    readonly id: SetId;
    /** Trimmed, never empty; unique among live sets at the doors. */
    readonly name: string;
    /** Listing position. Undoing a removal puts the set back where it was. */
    readonly order: number;
    /** The canonical definition. Edge members are always in stable form. */
    readonly definition: SetDefinition;
    /** How the set came to exist. Written once, at create. */
    readonly createdFrom: SetCreatedFrom;
    /**
     * `r1:<hex>`, a digest of the canonical definition. Derived: computed on first read and
     * memoised, never stored. Rename does not change it.
     */
    readonly revision: string;
}

/** One kept set's committed change. One per touched key per write. */
export interface SetChange {
    readonly id: SetId;
    /** OPEN UNION. */
    readonly change: "created" | "updated" | "removed";
    /** Which fields an `updated` change touched; empty otherwise. OPEN UNION. */
    readonly fields: readonly ("name" | "definition" | "order")[];
    /** The frozen record after the change; null after removal. */
    readonly set: ElementSet | null;
    /** What caused it. OPEN UNION: `command`, or `load` for a stored slice; undo and redo are added later. */
    readonly cause: "command" | "load";
}

/**
 * Whether a set still means what it meant, derived on read from what its definition reads and the
 * last pass over it. Never resolves.
 */
export interface SetStatus {
    /**
     * OPEN UNION: values may be added in a minor release; handle unknown values. The screen never
     * says "stale". `out-of-date`: a run it reads has inputs that changed (verb "Re-run").
     * `cannot-rerun`: the same, but the run's algorithm is no longer registered. `detached`: a
     * referent was removed (verb "Restore"). `unresolvable`: nothing was removed, but the
     * definition cannot be evaluated -- a cycle, a failed compile, a capability this element lacks
     * (verbs "Edit rule" or "Update graphty-element").
     */
    readonly freshness: "current" | "out-of-date" | "cannot-rerun" | "detached" | "unresolvable";
    /**
     * Why it is not current, or why it resolves to less than its definition names. May be
     * non-empty when current: render reasons whatever the freshness.
     */
    readonly reasons: readonly SetStatusReason[];
    /**
     * Runs whose held execution (in the definition or in what the set was created from) is no
     * longer the run's current one: "Earlier run". Empty otherwise.
     */
    readonly earlierRuns: readonly RunId[];
}

/** Why a set is not current. OPEN UNION on `kind`: kinds may be added in a minor release. */
export type SetStatusReason =
    | { readonly kind: "run-out-of-date"; readonly run: RunId }
    | { readonly kind: "missing-run"; readonly run: RunId }
    | { readonly kind: "missing-set"; readonly id: SetId; readonly name: string }
    | { readonly kind: "cycle"; readonly through: readonly string[] }
    /** `name` is a kind, field or algorithm; a plugin's is spelled `<package>:<kind>`, naming what to install. */
    | { readonly kind: "missing-capability"; readonly name: string }
    /** A held execution's values were not kept: the set resolves to nothing. */
    | { readonly kind: "values-not-kept"; readonly run: RunId }
    /** Edge members more than one edge carries, which bind neither. */
    | { readonly kind: "ambiguous-parallel-edge"; readonly count: number }
    | { readonly kind: "invalid"; readonly message: string }
    /** A run recorded a revision of another scheme version; its freshness is unknown until re-run. */
    | { readonly kind: "revision-unknown"; readonly run: RunId }
    /** A set this one reads is not current. */
    | { readonly kind: "input"; readonly id: SetId; readonly freshness: Exclude<SetStatus["freshness"], "current"> };

/**
 * One thing that names a set: "Used by". OPEN UNION on `kind`: kinds may be added in a minor
 * release; render `label` for a kind you do not know.
 */
export interface SetUser {
    readonly kind: "set" | "layer" | "filter" | "layout" | "run";
    readonly id?: string;
    readonly label: string;
}

/** Members to add to or remove from a fixed set. Edges by session id or stable identity. Internal name. */
export interface SetMemberDelta {
    readonly nodes?: readonly NodeId[];
    readonly edges?: readonly EdgeRef[];
}

/**
 * Kept sets: the reads that only look at records and the writes that resolve nothing. Every write
 * is one operation (`set.create`, `set.rename`, `set.redefine`, `set.members`, `set.remove`) and
 * a no-op records and emits nothing.
 */
export interface SetsApi {
    /**
     * Every kept set, by `order`, ties by id. The same frozen objects until a record changes.
     * @returns The sets.
     */
    list(): readonly ElementSet[];
    /**
     * One kept set.
     * @param id - Its id.
     * @returns The record, or undefined when no live set has that id.
     */
    get(id: SetId): ElementSet | undefined;
    /**
     * Whether a set, or any scope, still means what it meant: from what it reads and the last pass
     * over it. Never resolves, so a panel may call it for every row.
     * @param ref - The set, as `{ set: id }`, or any scope.
     * @returns The status.
     * @throws `E_BAD_COMMAND` for a malformed scope or an id that was never issued.
     */
    status(ref: ScopeInput): SetStatus;
    /**
     * A path set's kind. Derived from its definition; never resolves.
     * @param id - The set.
     * @returns The kind, or undefined for a set that is not a path or not live.
     */
    pathKind(id: SetId): PathKind | undefined;
    /**
     * What names a set: the kept sets whose definitions name it and the runs whose scope names it.
     * @param id - The set.
     * @returns The users, sets first, each group in listing order.
     */
    usedBy(id: SetId): readonly SetUser[];
    /**
     * Keep a definition as given; created from `user`. Edge members may be given as session edge
     * ids and are stored in stable form.
     * @param definition - The definition.
     * @param options - How to keep it.
     * @param options.name - The name; "Set N" (the smallest free N) when absent.
     * @returns The minted id.
     */
    create(definition: SetDefinitionInput, options?: { readonly name?: string }): SetId;
    /**
     * Rename a set. Keeps its id and its revision.
     * @param id - The set.
     * @param name - The new name, trimmed; unique among live sets.
     */
    rename(id: SetId, name: string): void;
    /**
     * Replace a set's definition.
     * @param id - The set.
     * @param definition - The new definition.
     */
    redefine(id: SetId, definition: SetDefinitionInput): void;
    /**
     * Add members to a fixed set.
     * @param id - The set.
     * @param members - The nodes and edges to add.
     * @param members.nodes - The node ids.
     * @param members.edges - The edges, by session id or stable identity.
     */
    addMembers(id: SetId, members: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeRef[] }): void;
    /**
     * Remove members from a fixed set. Removing a node also removes its incident edge members.
     * @param id - The set.
     * @param members - The nodes and edges to remove.
     * @param members.nodes - The node ids.
     * @param members.edges - The edges, by session id or stable identity.
     */
    removeMembers(id: SetId, members: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeRef[] }): void;
    /**
     * Remove the set itself. Anything that names it becomes detached.
     * @param id - The set.
     */
    remove(id: SetId): void;
}
