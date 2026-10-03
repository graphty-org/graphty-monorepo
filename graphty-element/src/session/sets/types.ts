/**
 * @file The shapes of kept sets as the session hands them out, the change a write produces, and
 * the synchronous half of `session.sets` (design/sets/sets-design.md sections 4.6, 14, 15.2).
 *
 * `session.sets` publishes these; the definition types they name live in `catalog/types.ts`.
 */

import type {
    EdgeId,
    EdgeReading,
    EdgeRef,
    NodeId,
    PathKind,
    ResultItem,
    RunId,
    ScopeInput,
    SetCombine,
    SetCreatedFrom,
    SetDefinition,
    SetDefinitionInput,
    SetId,
} from "../../catalog/types";

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
    /** The set that changed. */
    readonly id: SetId;
    /** OPEN UNION. */
    readonly change: "created" | "updated" | "removed";
    /** Which fields an `updated` change touched; empty otherwise. OPEN UNION. */
    readonly fields: readonly ("name" | "definition" | "order")[];
    /** The frozen record after the change; null after removal. */
    readonly set: ElementSet | null;
    /**
     * What caused it. OPEN UNION: `command`, `load` for a stored slice, or `undo` and `redo` for a
     * history call (a restore across several steps is told as the direction it moved).
     */
    readonly cause: "command" | "load" | "undo" | "redo";
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
    /** What kind of thing names the set. OPEN UNION. */
    readonly kind: "set" | "layer" | "filter" | "layout" | "run" | "note";
    /** Its id: a set, layer, run or note id, or a layout type. Absent for the visibility filter. */
    readonly id?: string;
    /**
     * What to show for it: a layer's or set's name, "Visibility filter", "Layout (ngraph)", a
     * note's first line cut to 80 characters.
     */
    readonly label: string;
}

/**
 * A set a finished run's result offers: community 3, level 2, the path. Using it as a scope,
 * `{ define: offer.definition }`, writes nothing; `createFrom` or `createPath` keeps it.
 *
 * Offers come from the result's shape, never from the algorithm, so a registered algorithm's
 * result offers what a built-in one of the same shape does.
 */
export interface SetOffer {
    /** The item, with the execution it was read from. */
    readonly item: ResultItem;
    /** "Community 3 (1,204 nodes)", "On path", "Level 2". */
    readonly label: string;
    /**
     * How many nodes it holds. Present for an offer read `induced`, counted from the result's own
     * values. For an offer read `listed` (an edge set, a path), whose nodes include its edges'
     * endpoints, filled only once the edge-count pass is cached.
     */
    readonly nodes?: number;
    /** Filled only when this execution's edge-count pass is already cached; `offers` never runs it. */
    readonly edges?: number;
    /** Which edges come with its nodes: `induced` for a group, `listed` for an edge set or a path. */
    readonly reading: EdgeReading;
    /** A path offer: `createPath` accepts it and keeps its order. */
    readonly path: boolean;
    /** The item may be followed across re-runs (not a partition group). */
    readonly followable: boolean;
    /** Usable at once as a scope, `{ define: offer.definition }`: a rule over the one held item. */
    readonly definition: SetDefinition;
}

/** What holds one element: the inspector's "Memberships". OPEN: may gain members in a minor release. */
export interface Memberships {
    /** Kept sets holding the element, in listing order. */
    readonly sets: readonly SetId[];
    /** The partition items holding it: "Louvain: community 4 of 212". */
    readonly items: readonly {
        /** The item, with the execution it was read from. */
        readonly item: ResultItem;
        /** "Louvain: community 4". */
        readonly label: string;
        /** How many items the result's partition has. */
        readonly of: number;
    }[];
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
     * The sets a finished run's result offers, largest first, from its shape: one per group of a
     * partition (a components run's first is the largest component), one per level, one per
     * category, one for a node or edge set, one for a path. Metrics, temporal results and
     * candidate pairs offer none. Never resolves and never runs the edge-count pass.
     * @param run - The run.
     * @param options - How many to return.
     * @param options.limit - The most offers returned; 100 by default.
     * @returns The largest `limit` offers and how many were left out.
     * @throws `E_UNKNOWN_RUN` for a run this session does not hold; `E_BAD_COMMAND` for a limit that
     * is not a whole number of at least 0.
     */
    offers(
        run: RunId,
        options?: { readonly limit?: number },
    ): {
        /** The largest `limit` offers, largest first. */
        readonly offers: readonly SetOffer[];
        /** How many offers were left out. */
        readonly more: number;
    };
    /**
     * What holds one element: the kept sets, and the partition items of every finished run. A
     * cached resolution is tested when present; else a fixed set of nodes alone is a binary
     * search of them, and a rule whose leaves are all element-local is tested at this element.
     * Anything else is resolved once and cached.
     * @param element - The node or edge.
     * @param element.node - A node id.
     * @param element.edge - A session edge id.
     * @returns The memberships.
     * @throws `E_BAD_COMMAND` for an element the graph does not hold.
     */
    containing(element: { readonly node: NodeId } | { readonly edge: EdgeId }): Promise<Memberships>;
    /**
     * Keep a definition as given; created from `user`. Edge members may be given as session edge
     * ids and are stored in stable form.
     * @param definition - The definition.
     * @param options - How to keep it.
     * @param options.name - The name; "Set N" (the smallest free N) when absent. At most 256
     * characters, because the id is minted from it.
     * @returns The minted id.
     */
    create(definition: SetDefinitionInput, options?: { readonly name?: string }): SetId;
    /**
     * Create set: keep a scope's current members as a fixed set, created from `selection` or from
     * the scope. Resolves first, then mints the id and names the set in one step, so two calls in
     * flight never share an id: the second with a taken name is refused `E_DUPLICATE_ID`.
     *
     * The reading, unless `options.reading` says otherwise: a selection holding nodes keeps the
     * selected nodes and edges and reads `induced`; a selection of edges alone reads `listed`;
     * any other scope keeps the reading it resolves with, and `clipped` (such as `"visible"`)
     * freezes to `listed`, which holds the same members. A defaulted `listed` result whose edges
     * are exactly those its nodes induce is stored `induced` with no edges, so it GAINS an edge
     * added later between two of its members; an explicit `listed` never does.
     * `"largest-component"` stores its nodes alone.
     *
     * An offer keeps its own reading and is created from `result`, holding its execution. With
     * `follow`, it is kept instead as a rule over the item without the execution, so it follows
     * the run's re-runs; a partition group cannot be followed, because a group number means
     * nothing in another run.
     *
     * The members are read when the asynchronous step resolves the source, not when the call is
     * made: a set the source names that is redefined synchronously after this call is frozen as
     * redefined. Await the call before changing what it reads to freeze the membership as it was.
     * @param source - The scope; `"selection"` for the current selection with its edges; or an offer.
     * @param options - How to keep it.
     * @param options.name - The name; "Set N" (the smallest free N) when absent.
     * @param options.reading - The reading to store instead of the default.
     * @param options.follow - Keep an offer as a rule that follows its run.
     * @returns The minted id.
     * @throws `E_SCOPE_EMPTY` when the source holds nothing; `E_BAD_COMMAND` for a malformed scope,
     * an unknown set or a bad reading; `E_DUPLICATE_ID` for a taken name; `E_BAD_COMMAND` with
     * `details.reason: "stale-offer"` for an offer whose execution is no longer its run's current
     * one, checked before resolving and again at commit, and `"follow-group"` for following a
     * partition group.
     */
    createFrom(
        source: ScopeInput | SetOffer,
        options?: { readonly name?: string; readonly reading?: EdgeReading; readonly follow?: boolean },
    ): Promise<SetId>;
    /**
     * Create path: order the selected edges into a walk, created from `selection`. Parallel and
     * reciprocal edges between one pair become one step. The walk starts at the end from which
     * every step follows a declared edge direction when only one end allows that, else at the end
     * whose id sorts first. One selected node and no edges is a zero-length path.
     *
     * A path offer is kept in its result's `order`, each step naming the on-path edges between its
     * pair, created from `result`; a stale one is refused as `createFrom` refuses it.
     * @param source - `"selection"`, or a path offer.
     * @param options - How to keep it.
     * @param options.name - The name; "Set N" when absent.
     * @returns The minted id.
     * @throws `E_BAD_COMMAND` with `details.reason: "ambiguous-path"` and `details.why` (`no-edges`,
     * `self-loop`, `branch`, `cycle`, `disconnected`, `off-path-nodes`) when the selection is not
     * one open chain.
     */
    createPath(source: SetOffer | "selection", options?: { readonly name?: string }): Promise<SetId>;
    /**
     * Combine two or more sets into one fixed set of their current members, created from
     * `combine`. `difference` is the first minus the union of the rest; `symmetric-difference`
     * keeps what an odd number of them hold. Every operand read `induced` gives an induced result;
     * otherwise edges are combined first and the result keeps their endpoints, so "edges in the
     * Kruskal tree but not the Prim tree" keeps the differing edges and the nodes they join. An
     * empty result is kept.
     * @param op - The combination.
     * @param of - Two or more scopes.
     * @param options - How to keep it.
     * @param options.name - The name; "Set N" when absent.
     * @param options.reading - The reading to store instead of the default.
     * @returns The minted id.
     */
    combine(
        op: SetCombine,
        of: readonly ScopeInput[],
        options?: { readonly name?: string; readonly reading?: EdgeReading },
    ): Promise<SetId>;
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
    removeMembers(
        id: SetId,
        members: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeRef[] },
    ): void;
    /**
     * Remove the set itself. Anything that names it becomes detached, and keeps working: a style
     * layer, filter or rule that names a removed set reads it from the set's kept record, so
     * removing a set never blanks a layer or changes what a filter shows. New work over a removed
     * set -- a run, an explicit layout scope -- is refused. The record is kept while anything
     * names the set, and dropped once nothing does.
     * @param id - The set.
     */
    remove(id: SetId): void;
    /**
     * Bring a removed set back from its kept record, under the same id, name and definition.
     * Tells one `set:changed` with change `"created"`.
     * @param id - The removed set.
     * @throws `E_BAD_COMMAND` when the id names a live set (`details.reason: "live"`), was never
     * issued (`"unknown-id"`), or its record was dropped because nothing named it any more
     * (`"record-dropped"`).
     */
    restore(id: SetId): void;
}
