/**
 * Content checks of the views a wire manifest carries (`includeViews`, design sections 9.1 and 9.5),
 * run at the "structure" level before a carried view is installed on the receiver. Every view is a
 * pure function of the core (design section 7.2), so each check is exact: the index views are
 * compared with what the core says arc by arc in O(n + m) without allocating a second copy, and the
 * four f64 views are compared with the snapshot's own computation. A view that disagrees is
 * E_INVALID_SNAPSHOT with `details.invariant` "I2" (a corrupt index array) or "I17" (a corrupt
 * value array) and `details.view` naming it. At "none" nothing is checked (the manifest is trusted,
 * design section 9.5); at "full" carried views are never installed.
 */

import { type GraphFormatError } from "../errors.js";
import { type GraphSnapshot, seedView } from "../snapshot/graph-snapshot.js";
import { invariantViolation } from "../snapshot/validate.js";
import {
    cooViewOf,
    DEGREE_TIER_HIGH,
    DEGREE_TIER_MID,
    edgeListViewOf,
    ReverseAdjacency,
    rowLengths,
} from "../snapshot/views.js";
import { type F32, type F64, type ReverseView, type TypedArrayData, type U32 } from "../types/index.js";
import { badWire } from "./bad-wire.js";

/** The per-arc facts every index-view check reads, computed once per manifest. */
class CoreFacts {
    /** The row (source) of every arc. */
    readonly arcRow: U32;
    /** Loop arcs per node. */
    readonly loops: U32;
    /** In-arcs per node (directed only; the out-degree when undirected). */
    readonly inDegree: U32;

    /**
     * Expand the core once.
     * @param snapshot - the snapshot
     */
    constructor(snapshot: GraphSnapshot) {
        const { nodeCount, arcCount, rowPtr, colIdx, directed } = snapshot;
        const arcRow = new Uint32Array(arcCount);
        const loops = new Uint32Array(nodeCount);
        const inDegree = directed ? new Uint32Array(nodeCount) : rowLengths(rowPtr, nodeCount);
        for (let u = 0; u < nodeCount; u++) {
            const end = rowPtr[u + 1];
            for (let a = rowPtr[u]; a < end; a++) {
                arcRow[a] = u;
                const v = colIdx[a];
                if (v === u) {
                    loops[u]++;
                }
                if (directed) {
                    inDegree[v]++;
                }
            }
        }
        this.arcRow = arcRow;
        this.loops = loops;
        this.inDegree = inDegree;
    }

    /**
     * The exclusive prefix sum of the in-degrees (the reverse rowPtr).
     * @returns nodeCount + 1 offsets
     */
    inDegreePrefix(): U32 {
        const n = this.inDegree.length;
        const out = new Uint32Array(n + 1);
        for (let u = 0; u < n; u++) {
            out[u + 1] = out[u] + this.inDegree[u];
        }
        return out;
    }
}

/**
 * The error for a carried view that disagrees with the core.
 * @param view - the view name
 * @param member - the member array
 * @param index - the offending index
 * @param invariant - "I2" for an index array, "I17" for a value array
 * @returns the error
 */
function viewError(view: string, member: string, index: number, invariant: "I2" | "I17"): GraphFormatError {
    return invariantViolation(invariant, `carried view ${view}.${member} disagrees with the core at ${index}`, {
        view,
        member,
        index,
        reason: "view",
    });
}

/**
 * Compare two arrays element by element (NaN equal to NaN).
 * @param view - the view name
 * @param member - the member name
 * @param found - the carried array
 * @param expected - the truth
 * @param invariant - the invariant to report
 */
function expectSame(
    view: string,
    member: string,
    found: ArrayLike<number>,
    expected: ArrayLike<number>,
    invariant: "I2" | "I17",
): void {
    for (let i = 0; i < expected.length; i++) {
        if (!Object.is(found[i], expected[i]) && found[i] !== expected[i]) {
            throw viewError(view, member, i, invariant);
        }
    }
}

/**
 * Check that an array is a permutation of 0..length-1.
 * @param view - the view name
 * @param member - the member name
 * @param perm - the array
 */
function expectPermutation(view: string, member: string, perm: U32): void {
    const seen = new Uint8Array(perm.length);
    for (let i = 0; i < perm.length; i++) {
        const p = perm[i];
        if (p >= perm.length || seen[p] === 1) {
            throw viewError(view, member, i, "I2");
        }
        seen[p] = 1;
    }
}

/**
 * outDegree: the row lengths.
 * @param snapshot - the snapshot
 * @param data - the carried array
 */
function checkOutDegree(snapshot: GraphSnapshot, data: U32): void {
    expectSame("outDegree", "data", data, rowLengths(snapshot.rowPtr, snapshot.nodeCount), "I2");
}

/**
 * inDegree (directed): the in-arc counts.
 * @param facts - the core facts
 * @param data - the carried array
 */
function checkInDegree(facts: CoreFacts, data: U32): void {
    expectSame("inDegree", "data", data, facts.inDegree, "I2");
}

/**
 * degree: outDegree + inDegree (directed) or outDegree + loops (undirected), design section 3.4.
 * @param snapshot - the snapshot
 * @param facts - the core facts
 * @param data - the carried array
 */
function checkDegree(snapshot: GraphSnapshot, facts: CoreFacts, data: U32): void {
    const out = rowLengths(snapshot.rowPtr, snapshot.nodeCount);
    const add = snapshot.directed ? facts.inDegree : facts.loops;
    for (let u = 0; u < out.length; u++) {
        if (data[u] !== out[u] + add[u]) {
            throw viewError("degree", "data", u, "I2");
        }
    }
}

/**
 * selfLoopsPerNode: the loop arcs per row.
 * @param facts - the core facts
 * @param data - the carried array
 */
function checkSelfLoopsPerNode(facts: CoreFacts, data: U32): void {
    expectSame("selfLoopsPerNode", "data", data, facts.loops, "I2");
}

/**
 * selfLoopArcs: ascending arcs, each a loop; with the length fixed to selfLoopCount that is exact.
 * @param snapshot - the snapshot
 * @param facts - the core facts
 * @param data - the carried array
 */
function checkSelfLoopArcs(snapshot: GraphSnapshot, facts: CoreFacts, data: U32): void {
    const { colIdx, arcCount } = snapshot;
    for (let i = 0; i < data.length; i++) {
        const a = data[i];
        if (a >= arcCount || colIdx[a] !== facts.arcRow[a] || (i > 0 && a <= data[i - 1])) {
            throw viewError("selfLoopArcs", "data", i, "I2");
        }
    }
}

/**
 * coo.src: the row of every arc.
 * @param facts - the core facts
 * @param src - the carried array
 */
function checkCooSrc(facts: CoreFacts, src: U32): void {
    expectSame("coo", "src", src, facts.arcRow, "I2");
}

/**
 * edgeList: `src[e]` is the row of `edgeToArc[e]`, `dst[e]` its target, `weights[e]` its weight.
 * @param snapshot - the snapshot
 * @param facts - the core facts
 * @param src - the carried sources
 * @param dst - the carried targets, or null when colIdx is aliased
 * @param weights - the carried weights, or null when aliased or unweighted
 */
function checkEdgeList(
    snapshot: GraphSnapshot,
    facts: CoreFacts,
    src: U32,
    dst: U32 | null,
    weights: F32 | null,
): void {
    const { edgeCount, edgeToArc, colIdx, arcCount } = snapshot;
    const forward = snapshot.weights;
    for (let e = 0; e < edgeCount; e++) {
        const a = edgeToArc[e];
        if (a >= arcCount || src[e] !== facts.arcRow[a]) {
            throw viewError("edgeList", "src", e, "I2");
        }
        if (dst !== null && dst[e] !== colIdx[a]) {
            throw viewError("edgeList", "dst", e, "I2");
        }
        if (weights !== null && forward !== null && !Object.is(weights[e], forward[a])) {
            throw viewError("edgeList", "weights", e, "I17");
        }
    }
}

/**
 * mate (undirected): an involution pairing the two arcs of every non-loop edge (invariant I7) and
 * fixing every loop arc.
 * @param snapshot - the snapshot
 * @param facts - the core facts
 * @param mate - the carried array
 */
function checkMate(snapshot: GraphSnapshot, facts: CoreFacts, mate: U32): void {
    const { arcCount, arcToEdge, colIdx } = snapshot;
    for (let a = 0; a < arcCount; a++) {
        const m = mate[a];
        const loop = colIdx[a] === facts.arcRow[a];
        if (m >= arcCount || mate[m] !== a || arcToEdge[m] !== arcToEdge[a] || (m === a) !== loop) {
            throw viewError("mate", "data", a, "I2");
        }
    }
}

/**
 * degreeOrder / reverseDegreeOrder: a permutation ordered by non-increasing degree with ties in
 * ascending node index, and the cuGraph tier offsets of design section 7.2.
 * @param name - the view name
 * @param degree - the degree of every node the order sorts by
 * @param perm - the carried permutation
 * @param segmentOffsets - the carried tier offsets
 */
function checkDegreeOrder(
    name: "degreeOrder" | "reverseDegreeOrder",
    degree: U32,
    perm: U32,
    segmentOffsets: U32,
): void {
    expectPermutation(name, "perm", perm);
    let hi = 0;
    let mid = 0;
    let low = 0;
    for (let i = 0; i < perm.length; i++) {
        const d = degree[perm[i]];
        if (i > 0) {
            const previous = degree[perm[i - 1]];
            if (d > previous || (d === previous && perm[i] < perm[i - 1])) {
                throw viewError(name, "perm", i, "I2");
            }
        }
        if (d >= DEGREE_TIER_HIGH) {
            hi++;
        } else if (d >= DEGREE_TIER_MID) {
            mid++;
        } else if (d >= 1) {
            low++;
        }
    }
    const expected = [0, hi, hi + mid, hi + mid + low, perm.length];
    expectSame(name, "segmentOffsets", segmentOffsets, expected, "I2");
}

/**
 * reverse: within a row, entry k (forward arc `a` from `source`) sorts after entry k - 1 by source,
 * then by forward arc.
 * @param fwdArc - the carried forward arcs
 * @param arcRow - the source of each forward arc
 * @param k - the entry, not the first of its row
 * @param a - fwdArc[k]
 * @param source - arcRow[a]
 */
function checkReverseTieOrder(fwdArc: U32, arcRow: U32, k: number, a: number, source: number): void {
    const previous = fwdArc[k - 1];
    const previousSource = arcRow[previous];
    if (source < previousSource || (source === previousSource && a <= previous)) {
        throw viewError("reverse", "fwdArc", k, "I2");
    }
}

/**
 * reverse (directed): the in-adjacency with rows sorted by source and ties by forward arc, `fwdArc`
 * a permutation of the arcs, `colIdx` the sources, `weights` the forward weights gathered.
 * @param snapshot - the snapshot
 * @param facts - the core facts
 * @param reverse - the carried view
 */
function checkReverse(snapshot: GraphSnapshot, facts: CoreFacts, reverse: ReverseView): void {
    const { nodeCount, arcCount, colIdx } = snapshot;
    const forward = snapshot.weights;
    const { rowPtr, fwdArc } = reverse;
    const revIdx = reverse.colIdx;
    const revWeights = reverse.weights;
    if (rowPtr[0] !== 0 || rowPtr[nodeCount] !== arcCount) {
        throw viewError("reverse", "rowPtr", 0, "I2");
    }
    expectSame("reverse", "rowPtr", rowPtr, facts.inDegreePrefix(), "I2");
    expectPermutation("reverse", "fwdArc", fwdArc);
    for (let v = 0; v < nodeCount; v++) {
        const end = rowPtr[v + 1];
        for (let k = rowPtr[v]; k < end; k++) {
            const a = fwdArc[k];
            const source = facts.arcRow[a];
            if (colIdx[a] !== v || revIdx[k] !== source) {
                throw viewError("reverse", "colIdx", k, "I2");
            }
            if (k > rowPtr[v]) {
                checkReverseTieOrder(fwdArc, facts.arcRow, k, a, source);
            }
            if (revWeights !== null && forward !== null && !Object.is(revWeights[k], forward[a])) {
                throw viewError("reverse", "weights", k, "I17");
            }
        }
    }
}

/**
 * An f64 view: compared with the snapshot's own computation.
 * @param name - the view name
 * @param found - the carried array
 * @param expected - the computed truth
 */
function checkF64View(name: string, found: F64, expected: F64): void {
    expectSame(name, "data", found, expected, "I17");
}

// ============================================================ installing carried views

/** The member arrays of the views a manifest carried, keyed by view name then member name. */
export type CarriedViews = Map<string, Map<string, TypedArrayData>>;

/**
 * One member array of a carried view, checked for class and length.
 * @param members - the view's member arrays
 * @param view - the view name (for the error path)
 * @param member - the member name
 * @param ctor - the required typed-array class
 * @param length - the required length
 * @param required - whether an absent member is an error
 * @returns the array, or null when absent and not required
 */
function viewMember<T extends TypedArrayData>(
    members: ReadonlyMap<string, TypedArrayData>,
    view: string,
    member: string,
    ctor: new (length: number) => T,
    length: number,
    required: boolean,
): T | null {
    const path = `views.${view}.${member}`;
    const array = members.get(member);
    if (array === undefined) {
        if (required) {
            throw badWire(path, "the carried view is missing this member");
        }
        return null;
    }
    if (!(array instanceof ctor)) {
        throw badWire(path, `expected ${ctor.name}, found ${array.constructor.name}`, {
            expected: ctor.name,
            found: array.constructor.name,
        });
    }
    if (array.length !== length) {
        throw badWire(path, `expected ${length} entries, found ${array.length}`, {
            expected: length,
            found: array.length,
        });
    }
    return array;
}

/**
 * The per-node or per-arc array of a single-member view.
 * @param members - the view's member arrays
 * @param view - the view name
 * @param ctor - the required typed-array class
 * @param length - the required length
 * @returns the array
 */
function dataMember<T extends TypedArrayData>(
    members: ReadonlyMap<string, TypedArrayData>,
    view: string,
    ctor: new (length: number) => T,
    length: number,
): T {
    return viewMember(members, view, "data", ctor, length, true) as T;
}

/**
 * Install the views a manifest carried into the snapshot's cache (design section 9.1), so the
 * receiver does not recompute them. Views that alias another view on an undirected snapshot
 * (`reverse`, `inDegree`, `weightedInDegree`, `reverseDegreeOrder`) are left to the snapshot, which
 * produces the alias itself; `mate` on a directed snapshot and unknown view names are ignored.
 * Every installed member must have the class and length of the view it claims to be
 * (E_BAD_SERIALIZATION otherwise); at the "structure" level (`verify`) every carried view is also
 * checked against the core before it is installed (src/wire/carried-views.ts), so a corrupt or
 * forged view never enters the cache below "full".
 * @param snapshot - the freshly built snapshot
 * @param carried - the carried member arrays
 * @param verify - whether to check the contents (the "structure" level)
 */
export function installViews(snapshot: GraphSnapshot, carried: CarriedViews, verify: boolean): void {
    let facts: CoreFacts | null = null;
    const ctx: ViewInstall = {
        snapshot,
        verify,
        facts: (): CoreFacts => {
            facts ??= new CoreFacts(snapshot);
            return facts;
        },
    };
    for (const [name, members] of carried) {
        if (!isAliasView(name, snapshot.directed)) {
            installView(ctx, name, members);
        }
    }
}

/** What installing one carried view needs. */
interface ViewInstall {
    readonly snapshot: GraphSnapshot;
    /** Whether to check the contents against the core (the "structure" level). */
    readonly verify: boolean;
    /** The core facts, computed on first use and shared by every view. */
    readonly facts: () => CoreFacts;
}

type ViewMembers = ReadonlyMap<string, TypedArrayData>;

/** The views an undirected snapshot produces as aliases of another view. */
const UNDIRECTED_ALIAS_VIEWS: ReadonlySet<string> = new Set([
    "reverse",
    "inDegree",
    "weightedInDegree",
    "reverseDegreeOrder",
]);

/**
 * Whether a carried view is left to the snapshot: an alias on an undirected snapshot, or `mate` on a
 * directed one.
 * @param name - the view name
 * @param directed - whether the snapshot is directed
 * @returns true when the carried view is ignored
 */
function isAliasView(name: string, directed: boolean): boolean {
    return directed ? name === "mate" : UNDIRECTED_ALIAS_VIEWS.has(name);
}

/**
 * Install one carried view by name; unknown names (a newer minor) and scalar views are ignored and
 * recomputed.
 * @param ctx - the snapshot, the level and the core facts
 * @param name - the view name
 * @param members - the view's member arrays
 */
function installView(ctx: ViewInstall, name: string, members: ViewMembers): void {
    const { snapshot } = ctx;
    switch (name) {
        case "reverse":
            installReverse(ctx, members);
            break;
        case "coo":
            installCoo(ctx, members);
            break;
        case "edgeList":
            installEdgeList(ctx, members);
            break;
        case "outDegree":
            installCountView(ctx, "outDegree", members, snapshot.nodeCount, (data) => {
                checkOutDegree(snapshot, data);
            });
            break;
        case "degree":
            installCountView(ctx, "degree", members, snapshot.nodeCount, (data) => {
                checkDegree(snapshot, ctx.facts(), data);
            });
            break;
        case "selfLoopsPerNode":
            installCountView(ctx, "selfLoopsPerNode", members, snapshot.nodeCount, (data) => {
                checkSelfLoopsPerNode(ctx.facts(), data);
            });
            break;
        case "inDegree":
            installCountView(ctx, "inDegree", members, snapshot.nodeCount, (data) => {
                checkInDegree(ctx.facts(), data);
            });
            break;
        case "selfLoopArcs":
            installCountView(ctx, "selfLoopArcs", members, snapshot.selfLoopCount, (data) => {
                checkSelfLoopArcs(snapshot, ctx.facts(), data);
            });
            break;
        case "mate":
            installCountView(ctx, "mate", members, snapshot.arcCount, (data) => {
                checkMate(snapshot, ctx.facts(), data);
            });
            break;
        case "weightedOutDegree":
        case "weightedInDegree":
        case "weightedDegree":
        case "selfLoopWeight":
            installF64View(ctx, name, members);
            break;
        case "degreeOrder":
        case "reverseDegreeOrder":
            installDegreeOrder(ctx, name, members);
            break;
        default:
            // An unknown view name (a newer minor) or a scalar view: ignored and recomputed.
            break;
    }
}

/**
 * Refuse a weights member carried for an unweighted snapshot.
 * @param snapshot - the snapshot
 * @param view - the view name
 * @param weights - the carried weights, or null
 */
function rejectStrayWeights(snapshot: GraphSnapshot, view: string, weights: F32 | null): void {
    if (weights !== null && snapshot.weights === null) {
        throw badWire(`views.${view}.weights`, "weights carried for an unweighted snapshot");
    }
}

/**
 * Install a carried directed `reverse` view.
 * @param ctx - the snapshot, the level and the core facts
 * @param members - the view's member arrays
 */
function installReverse(ctx: ViewInstall, members: ViewMembers): void {
    const { snapshot } = ctx;
    const { nodeCount, arcCount } = snapshot;
    const rowPtr = viewMember(members, "reverse", "rowPtr", Uint32Array, nodeCount + 1, true) as U32;
    const colIdx = viewMember(members, "reverse", "colIdx", Uint32Array, arcCount, true) as U32;
    const fwdArc = viewMember(members, "reverse", "fwdArc", Uint32Array, arcCount, true) as U32;
    const weights = viewMember(members, "reverse", "weights", Float32Array, arcCount, snapshot.weights !== null);
    rejectStrayWeights(snapshot, "reverse", weights);
    const reverse = new ReverseAdjacency(snapshot, rowPtr, colIdx, weights, fwdArc);
    if (ctx.verify) {
        checkReverse(snapshot, ctx.facts(), reverse);
    }
    seedView(snapshot, "reverse", reverse);
}

/**
 * Install a carried `coo` view (its src array; dst is the core colIdx).
 * @param ctx - the snapshot, the level and the core facts
 * @param members - the view's member arrays
 */
function installCoo(ctx: ViewInstall, members: ViewMembers): void {
    const { snapshot } = ctx;
    const src = viewMember(members, "coo", "src", Uint32Array, snapshot.arcCount, true) as U32;
    if (ctx.verify) {
        checkCooSrc(ctx.facts(), src);
    }
    seedView(snapshot, "coo", cooViewOf(snapshot, src));
}

/**
 * Install a carried `edgeList` view; dst and weights are omitted when arcToEdge is the identity.
 * @param ctx - the snapshot, the level and the core facts
 * @param members - the view's member arrays
 */
function installEdgeList(ctx: ViewInstall, members: ViewMembers): void {
    const { snapshot } = ctx;
    const { edgeCount } = snapshot;
    const identity = snapshot.flags.arcToEdgeIsIdentity;
    const src = viewMember(members, "edgeList", "src", Uint32Array, edgeCount, true) as U32;
    const dst = viewMember(members, "edgeList", "dst", Uint32Array, edgeCount, !identity);
    const weights = viewMember(
        members,
        "edgeList",
        "weights",
        Float32Array,
        edgeCount,
        snapshot.weights !== null && !identity,
    );
    rejectStrayWeights(snapshot, "edgeList", weights);
    if (ctx.verify) {
        checkEdgeList(snapshot, ctx.facts(), src, dst, weights);
    }
    seedView(snapshot, "edgeList", edgeListViewOf(snapshot, src, dst ?? snapshot.colIdx, weights ?? snapshot.weights));
}

/**
 * Install a single-member u32 view (a per-node count, the self-loop arcs or the mates).
 * @param ctx - the snapshot, the level and the core facts
 * @param name - the view name
 * @param members - the view's member arrays
 * @param length - the required length
 * @param check - the contents check run under `verify`
 */
function installCountView(
    ctx: ViewInstall,
    name: "outDegree" | "degree" | "selfLoopsPerNode" | "inDegree" | "selfLoopArcs" | "mate",
    members: ViewMembers,
    length: number,
    check: (data: U32) => void,
): void {
    const data = dataMember(members, name, Uint32Array, length);
    if (ctx.verify) {
        check(data);
    }
    seedView(ctx.snapshot, name, data);
}

/**
 * Install an f64 view; under `verify` it is compared with the snapshot's own computation instead
 * (which then stays cached), so a corrupt value array never enters the cache.
 * @param ctx - the snapshot, the level and the core facts
 * @param name - the view
 * @param members - the view's member arrays
 */
function installF64View(
    ctx: ViewInstall,
    name: "weightedOutDegree" | "weightedInDegree" | "weightedDegree" | "selfLoopWeight",
    members: ViewMembers,
): void {
    const { snapshot } = ctx;
    const data = dataMember(members, name, Float64Array, snapshot.nodeCount);
    if (ctx.verify) {
        checkF64View(name, data, snapshot[name]());
        return;
    }
    seedView(snapshot, name, data);
}

/**
 * Install a carried degree order (`degreeOrder`, or `reverseDegreeOrder` on a directed snapshot).
 * @param ctx - the snapshot, the level and the core facts
 * @param name - the view
 * @param members - the view's member arrays
 */
function installDegreeOrder(ctx: ViewInstall, name: "degreeOrder" | "reverseDegreeOrder", members: ViewMembers): void {
    const { snapshot } = ctx;
    const { nodeCount } = snapshot;
    const perm = viewMember(members, name, "perm", Uint32Array, nodeCount, true) as U32;
    const segmentOffsets = viewMember(members, name, "segmentOffsets", Uint32Array, 5, true) as U32;
    if (ctx.verify) {
        const degree = name === "degreeOrder" ? rowLengths(snapshot.rowPtr, nodeCount) : ctx.facts().inDegree;
        checkDegreeOrder(name, degree, perm, segmentOffsets);
    }
    seedView(snapshot, name, Object.freeze({ perm, segmentOffsets }));
}
