/**
 * @file `@graphty/graphty-element/format`: the vocabulary for reading a graph snapshot.
 *
 * ```js
 * import { isGraphSnapshot, maskToIndices } from "@graphty/graphty-element/format";
 * ```
 *
 * The element hands out frozen `@graphty/graph-format` snapshots, and a consumer needs names
 * for what it gets back: the snapshot type, the guard that says a value really is one, the
 * sentinel that means "no such node", the mask type its selection and visibility answers use,
 * the two edge views, the three array remappers and the scalar aliases the typed arrays are
 * declared with.
 *
 * Exactly that, and nothing else. Three rules decide the contents.
 *
 * **Reading only.** The construction half of graph-format -- `GraphBuilder`, `AttributeTable`,
 * `NodeIdMap`, `fromRecords` and friends -- and the wire half -- `fromWire`, `fromBytes` and the
 * `Wire*` types -- are absent. A consumer that builds or serialises snapshots depends on
 * `@graphty/graph-format` directly and gets the whole package, correctly versioned.
 *
 * **No brand, no version.** `SNAPSHOT_BRAND` and `FORMAT_VERSION` are never re-exported. The
 * supported check is {@link isGraphSnapshot}. Handing out the brand invites stamping it onto a
 * hand-made object, which produces something that passes every check and violates every
 * invariant the format guarantees.
 *
 * **Nothing called `Node`, `Edge`, `Graph`, `Position` or `NodeId`.** graph-format's `NodeId` and
 * `EdgeId` are deliberately not here: `@graphty/algorithms` and `@graphty/layout` export
 * incompatible pairs of those names, and this package exports classes with them. Three
 * incompatible meanings cannot share one barrel, so the sibling's spellings stay behind their
 * own package name.
 *
 * Why an entry point of its own rather than the root barrel: re-exporting a sibling's types from
 * the root ties this package's major version to that sibling's, permanently. Quarantined here,
 * a graph-format major is a change to one file.
 */

export type {
    AdjacencyView,
    ArcIndex,
    DerivedGraph,
    EdgeIndex,
    EdgeMask,
    F32,
    F64,
    GraphSnapshot,
    I32,
    NodeIndex,
    NodeMask,
    U8,
    U32,
} from "@graphty/graph-format";
export {
    expandEdges,
    foldArcs,
    gatherArray,
    INVALID_INDEX,
    isGraphSnapshot,
    makeMask,
    maskCount,
    maskSet,
    maskTest,
    maskToIndices,
    remapArray,
    scatterArray,
} from "@graphty/graph-format";
