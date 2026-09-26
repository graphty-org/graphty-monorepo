/**
 * @file Where a compiled selector actually reads: the session's own columns, by dense index.
 *
 * `./predicate` compiles a selector into a closure over {@link SelectorSource} and implements
 * none of it -- two value readers, two presence tests, two id readers, and nothing about where a
 * value lives. THIS file is the other half: a `data.*` path is a column of the snapshot or a key
 * of the record a node arrived with, and a `results.*` path is one field of one run's result. The
 * split is what lets the compiler stay a compiler; it never learns what a session is, and this
 * file never learns what an expression is.
 *
 * FOUR DECISIONS SHAPE EVERY LINE BELOW, and each of them is a bug that was available instead.
 *
 * PRESENCE IS SUPPLIED RATHER THAN DERIVED. `{match:"has", path}` compiles to `nodeHas`, and so
 * does ``<path> != `null` `` -- they are the two spellings of one question, and an element that
 * answered them differently would paint two different sets from one intent. A column answers
 * presence from its validity bitmap without materialising the value, which is the whole reason
 * the interface offers the member; leaving it out would throw that away and read the value anyway.
 * Present means NEITHER ABSENT NOR NULL, exactly as the contract states it, so an unset row of a
 * column that declares a default is PRESENT: that row reads the default, and a reader who gets a
 * value back would not understand being told there is none.
 *
 * A PATH NOTHING ANSWERS READS ABSENT, AND NEVER THROWS. A selector naming a run that has not
 * finished, an attribute no record carries, or a field that belongs to the graph rather than to
 * an element, is an ordinary state and matches nothing. The evaluator this replaces threw from
 * inside the paint loop, which aborted the frame and left every later element unstyled -- one
 * mistyped path, and the picture stopped halfway with nothing on screen to say so.
 *
 * A FREEZE THAT RENUMBERS IS FOLLOWED. Every lookup starts from the snapshot the session holds
 * NOW and rebuilds what is derived from it the moment the object changes. Holding the snapshot
 * instead -- or, worse, an id map or a table of resolved indices built from it -- means looking an
 * id up in the graph as it was: the row that was node 7 is somebody else's row after a compacting
 * freeze, and the layer paints a node it never named. `SelectionApi` carries the same hazard and
 * the same answer, and the answer is written down in both places because it is invisible in a
 * passing test suite until a removal happens.
 *
 * NOTHING IS ALLOCATED PER ELEMENT. These readers run once per element per layer inside the
 * repaint, where the compiled selector costs single-digit nanoseconds, so one object per read
 * would cost more than everything it was measuring. A path is parsed once and memoised; a column
 * is resolved once per freeze; an edge id is minted once per row per freeze and then read from an
 * array; and the snapshot check that keeps all of it honest is one call and one identity compare.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Column, GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path, RunId } from "../../catalog/types";
import { RESULT_ROOT, type RunResult } from "../results";
import { edgeSpaceOf } from "../scope";
import type { SessionRecordSource } from "../types";
import type { SelectorSource, SelectorTarget } from "./predicate";

// ---------------------------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------------------------

/** Everything {@link createSelectorSource} needs from the session around it. */
export interface SelectorSourceParts {
    /**
     * The snapshot the dense indices address.
     *
     * A function rather than the snapshot itself, and called on every lookup rather than captured:
     * the store replaces the snapshot on every freeze, and a source holding the previous one would
     * answer confidently about a graph that no longer exists.
     * @returns The snapshot as it stands now.
     */
    readonly snapshot: () => GraphSnapshot;
    /**
     * One run's published result, by run id.
     *
     * A reader rather than the `ResultsApi`, because this is called once per element per layer and
     * `ResultsApi.get` builds a registry entry object on every call. A session hands in
     * `(id) => runs.get(id)?.result`, which is a map lookup and a field read. Absent, no
     * `results.*` path is answered and every one of them reads absent -- which is what a session
     * that has run nothing should say.
     * @param runId - The run to read.
     * @returns Its result, or undefined when the run has not published one.
     */
    readonly results?: (runId: RunId) => RunResult | undefined;
    /**
     * Where the attributes a record arrived with are read.
     *
     * The second half of a `data.*` path, and the one that goes away: the store does not yet carry
     * the arbitrary keys a record was imported with, so a session over a rendered graph reads them
     * through this seam. A key the snapshot holds a COLUMN for is read from the column instead --
     * see {@link createSelectorSource} for why one key has one source and never two.
     */
    readonly records?: SessionRecordSource;
}

/**
 * A selector source that answers every optional member, plus the measured-column reader.
 *
 * The four optional members of {@link SelectorSource} are declared required here because this
 * source supplies all of them, and their absence is a refusal rather than a widening: a session
 * that cannot say which id sits at which row refuses an `ids` selector outright.
 */
export interface SessionSelectorSource extends SelectorSource {
    /**
     * Whether one node carries a value for a path.
     * @param index - The dense node index.
     * @param path - The column path.
     * @returns True when the node carries a value that is neither undefined nor null.
     */
    readonly nodeHas: (index: number, path: Path) => boolean;
    /**
     * Whether one edge carries a value for a path.
     * @param index - The dense (logical) edge index.
     * @param path - The column path.
     * @returns True when the edge carries a value that is neither undefined nor null.
     */
    readonly edgeHas: (index: number, path: Path) => boolean;
    /**
     * The id of the node at a dense index.
     * @param index - The dense node index, already bounded by the caller.
     * @returns The id at that row.
     */
    readonly nodeIdOf: (index: number) => NodeId;
    /**
     * The id of the edge at a dense index.
     * @param index - The dense (logical) edge index, already bounded by the caller.
     * @returns The id at that row.
     */
    readonly edgeIdOf: (index: number) => EdgeId;
    /**
     * The dense indices that carry a value for one column, when the column is a run's.
     *
     * THIS IS WHAT MAKES A RUN-BOUND LAYER COST ITS RUN. A repaint hands the list back to a
     * `{match:"has"}` layer as the elements to walk, so a run that measured 300 nodes of 50,000
     * visits 300 and the elements it never measured are not consulted at all. The indices are
     * exactly the elements {@link SessionSelectorSource.nodeHas} accepts, never a superset: an
     * index missing from here is an element the layer would silently skip.
     *
     * A `data.*` path answers undefined rather than a list. Enumerating one means a walk over
     * every element that allocates an array as long as the graph, to save a walk over every
     * element that allocates nothing -- so the honest answer is "this session cannot enumerate
     * that", and the repaint walks the element list.
     * @param path - The column path, such as `results.louvain.group`.
     * @param target - Whether the asking layer paints nodes or edges.
     * @returns The indices, ascending, or undefined when the column cannot be enumerated.
     */
    readonly measured: (path: Path, target: SelectorTarget) => ArrayLike<number> | undefined;
    /**
     * The lowest value in the top `n` of a run's column, from `RunResult.top`, which keeps it.
     * @param path - The column path, `results.<run>.<field>`.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param n - The most elements the top may hold.
     * @returns The cut, or undefined when nothing is taken or the path names no numeric field of
     *     this kind of element.
     */
    readonly topCut: (path: Path, target: SelectorTarget, n: number) => number | undefined;
}

// ---------------------------------------------------------------------------------------------
// How a path is read
// ---------------------------------------------------------------------------------------------

/** The prefix an attribute path carries in front of the key the record actually holds. */
const ATTRIBUTE_PREFIX = "data.";

/**
 * The id of the node at one end of an edge, for the attribute keys that name an endpoint.
 *
 * An edge's endpoints are graph structure, so the importer removes the keys they arrived under
 * (`src`/`dst`, or whatever the id paths name) from the record a selector reads, to keep the data
 * table from showing them twice. Without this, `data.source == 'A'` matched no edge at all and
 * said nothing -- the empty answer looked exactly like a correct zero. So `source` and `target`
 * are read from the snapshot for an edge whose record holds nothing under that key; an edge that
 * really carries a `source` attribute (a provenance field, with its endpoints under `src`/`dst`)
 * keeps it.
 * @param graph - The snapshot the index addresses.
 * @param index - The dense (logical) edge index, already bounded by the caller.
 * @param key - The attribute key, without the `data.` prefix.
 * @returns The endpoint's node id, or undefined when the key names no endpoint.
 */
export function edgeEndpointOf(graph: GraphSnapshot, index: number, key: string): NodeId | undefined {
    if (key === "source") {
        return graph.ids.idOf(graph.edgeSource(index));
    }

    if (key === "target") {
        return graph.ids.idOf(graph.edgeTarget(index));
    }

    return undefined;
}

/** The prefix a result path carries in front of the run id. */
const RESULT_PREFIX = `${RESULT_ROOT}.`;

/** What a path names, settled once when the path is first seen. */
type PathKind =
    /** A key of the record a node or an edge arrived with, or a column of the snapshot. */
    | "attribute"
    /** Nothing this session can answer, so every read of it is absent. */
    | "none"
    /** One per-element field of one run's result. */
    | "result";

/** One path, parsed. */
interface PathEntry {
    /** Which reader answers it. */
    readonly kind: PathKind;
    /** The column name and record key, for an attribute path; empty otherwise. */
    readonly key: string;
    /** The run, for a result path; empty otherwise. */
    readonly runId: RunId;
    /** The field, for a result path; empty otherwise. */
    readonly field: string;
}

/** The entry every path that nothing answers shares. */
const NOTHING: PathEntry = Object.freeze({ kind: "none", key: "", runId: "", field: "" });

/**
 * Work out what a path names.
 *
 * Called once per path and memoised, because the alternative is splitting a string per element.
 *
 * A `results.*` path that is not exactly `results.<run>.<field>` is refused into
 * {@link NOTHING} rather than guessed at. `results.<run>` on its own addresses the run's whole
 * result object, which is a graph-level thing and belongs to no element, and a deeper path names
 * a field of a field, which no result publishes.
 * @param path - The path as the selector spelled it.
 * @returns What reads it.
 */
function parsePath(path: Path): PathEntry {
    if (path.startsWith(RESULT_PREFIX)) {
        const dot = path.indexOf(".", RESULT_PREFIX.length);
        const runId = dot === -1 ? "" : path.slice(RESULT_PREFIX.length, dot);
        const field = dot === -1 ? "" : path.slice(dot + 1);

        if (runId === "" || field === "" || field.includes(".")) {
            return NOTHING;
        }

        return { kind: "result", key: "", runId, field };
    }

    // The prefix is stripped rather than required, matching the session's filter value source:
    // a filter names an attribute by its published path and a record bag is keyed by the key the
    // record arrived with, and one of those two spellings has to give way to the other.
    const key = path.startsWith(ATTRIBUTE_PREFIX) ? path.slice(ATTRIBUTE_PREFIX.length) : path;

    return key === "" ? NOTHING : { kind: "attribute", key, runId: "", field: "" };
}

// ---------------------------------------------------------------------------------------------
// One snapshot's worth of derived readers
// ---------------------------------------------------------------------------------------------

/** One attribute column, with the one fact about it that a presence test needs. */
interface ColumnReader {
    /** The column itself. */
    readonly column: Column;
    /**
     * Whether an unset row still reads a value.
     *
     * A column that declares a default hands that default out for a row nothing wrote, so such a
     * row carries a value even though its validity bit is clear. Read off the metadata once,
     * here, rather than asked per element.
     */
    readonly defaultPresent: boolean;
}

/** What one run's measured column came to, and the result it was built from. */
interface MeasuredEntry {
    /** The result the indices were walked out of, so a run that publishes later rebuilds them. */
    readonly result: RunResult | undefined;
    /** The dense indices, ascending. */
    readonly indices: Uint32Array;
}

/**
 * Everything derived from one snapshot, replaced as one object.
 *
 * One object rather than five variables so that replacing it is atomic. A frame holding the new
 * snapshot beside the previous frame's edge ids would address edges by endpoints that have moved,
 * and would do it in silence.
 */
interface Frame {
    /** The snapshot this was all built from, and the identity that decides it is still current. */
    readonly graph: GraphSnapshot;
    /** Nodes in it. */
    readonly nodeCount: number;
    /** Edges in it. */
    readonly edgeCount: number;
    /** The one implementation of the edge id convention, borrowed rather than rewritten. */
    readonly mintEdgeId: (index: number) => EdgeId;
    /** The edge ids minted so far, filled row by row; null until an edge id is asked for. */
    edgeIds: (EdgeId | undefined)[] | null;
    /** Node columns by key, holding null for a key the snapshot has no column for. */
    readonly nodeColumns: Map<string, ColumnReader | null>;
    /** Edge columns by key, on the same terms. */
    readonly edgeColumns: Map<string, ColumnReader | null>;
    /** Measured node indices by path. */
    readonly nodeMeasured: Map<Path, MeasuredEntry>;
    /** Measured edge indices by path. */
    readonly edgeMeasured: Map<Path, MeasuredEntry>;
}

/** The answer for a run that has published nothing: no element carries a value, and that is knowable. */
const NO_INDICES = new Uint32Array(0);

/**
 * Build the derived readers for one snapshot.
 * @param graph - The snapshot.
 * @returns The frame.
 */
function frameOf(graph: GraphSnapshot): Frame {
    // `edgeSpaceOf` is where the element decides an edge is named by its two endpoint ids joined
    // by a colon. A second implementation written here is how a selector and a filter end up
    // disagreeing about what an edge is called.
    const edges = edgeSpaceOf(graph);

    return {
        graph,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        mintEdgeId: (index: number): EdgeId => edges.idOf(index),
        edgeIds: null,
        nodeColumns: new Map<string, ColumnReader | null>(),
        edgeColumns: new Map<string, ColumnReader | null>(),
        nodeMeasured: new Map<Path, MeasuredEntry>(),
        edgeMeasured: new Map<Path, MeasuredEntry>(),
    };
}

/**
 * Wrap a column the snapshot holds, or report that it holds none.
 * @param column - What the attribute table answered.
 * @returns The reader, or null when there is no such column.
 */
function readerFor(column: Column | null): ColumnReader | null {
    if (column === null) {
        return null;
    }

    const fallback: unknown = column.meta.default;

    return { column, defaultPresent: fallback !== undefined && fallback !== null };
}

/**
 * One cell of a column, or undefined when the row is outside it.
 *
 * Bounded here rather than trusted: a column throws `E_INDEX_RANGE` for a row it does not have,
 * and a repaint that read one row past the end would abort instead of painting nothing.
 * @param reader - The column.
 * @param index - The dense index.
 * @returns The value, the column's default for an unset row, or undefined.
 */
function cellValue(reader: ColumnReader, index: number): unknown {
    if (index < 0 || index >= reader.column.length) {
        return undefined;
    }

    return reader.column.value(index);
}

/**
 * Whether one cell of a column holds a value.
 *
 * The validity bit answers it without materialising anything, which is the reason a source
 * supplies presence rather than letting it be derived. A set row never holds null -- writing null
 * unsets the row -- so a set bit IS a present value.
 * @param reader - The column.
 * @param index - The dense index.
 * @returns True when the row carries a value that is neither undefined nor null.
 */
function cellPresent(reader: ColumnReader, index: number): boolean {
    if (reader.column.isSet(index)) {
        return true;
    }

    return reader.defaultPresent && index >= 0 && index < reader.column.length;
}

/**
 * Whether a value counts as present, on the contract's own terms.
 * @param value - What a reader answered.
 * @returns True when it is neither undefined nor null.
 */
function isPresent(value: unknown): boolean {
    return value !== undefined && value !== null;
}

// ---------------------------------------------------------------------------------------------
// The source
// ---------------------------------------------------------------------------------------------

/**
 * Build the selector source for one session.
 *
 * ONE KEY HAS ONE SOURCE. When the snapshot holds a column under an attribute's key, that column
 * answers the key and the record bags are not consulted for it -- not even for a row the column
 * leaves unset. The alternative, falling through to the records when a column answers nothing,
 * makes the answer depend on which of two stores happened to be written first, and an attribute
 * whose value appears for some rows and not others is the hardest kind of wrong picture to read
 * back to a cause.
 * @param parts - The snapshot, the result reader and the record source.
 * @returns The source, which is also the `measured` reader a repaint takes.
 * @example
 * ```ts
 * const elements = createSelectorSource({
 *     snapshot: () => session.snapshot(),
 *     results: (id) => session.runs.get(id)?.result,
 *     records,
 * });
 * ```
 */
export function createSelectorSource(parts: SelectorSourceParts): SessionSelectorSource {
    const { snapshot: readSnapshot, records } = parts;
    const readResult = parts.results;
    const paths = new Map<Path, PathEntry>();
    let frame: Frame | null = null;

    /**
     * The frame for the graph as it stands, rebuilt when a freeze has replaced the snapshot.
     * @returns The current frame.
     */
    const current = (): Frame => {
        const graph = readSnapshot();

        if (frame === null || frame.graph !== graph) {
            frame = frameOf(graph);
        }

        return frame;
    };

    /**
     * What a path names, parsed on its first appearance and remembered.
     * @param path - The path as the selector spelled it.
     * @returns Its entry.
     */
    const entryFor = (path: Path): PathEntry => {
        const held = paths.get(path);

        if (held !== undefined) {
            return held;
        }

        const parsed = parsePath(path);
        paths.set(path, parsed);

        return parsed;
    };

    /**
     * The column one attribute key is answered from, resolved once per freeze.
     * @param held - The frame.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param key - The attribute key.
     * @returns The column, or null when the snapshot holds none under that key.
     */
    const columnFor = (held: Frame, target: SelectorTarget, key: string): ColumnReader | null => {
        const cache = target === "node" ? held.nodeColumns : held.edgeColumns;
        const resolved = cache.get(key);

        if (resolved !== undefined) {
            return resolved;
        }

        const table = target === "node" ? held.graph.nodes : held.graph.edges;
        const reader = readerFor(table.get(key));
        cache.set(key, reader);

        return reader;
    };

    /**
     * The id of one edge, minted once per row per freeze.
     * @param held - The frame.
     * @param index - The dense (logical) edge index.
     * @returns The edge id.
     */
    const edgeIdAt = (held: Frame, index: number): EdgeId => {
        held.edgeIds ??= new Array<EdgeId | undefined>(held.edgeCount);
        const known = held.edgeIds[index];

        if (known !== undefined) {
            return known;
        }

        const minted = held.mintEdgeId(index);
        held.edgeIds[index] = minted;

        return minted;
    };

    /**
     * The fields one run published for one element, or undefined when it published none for it.
     * @param held - The frame.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param index - The element's dense index.
     * @param runId - The run to read.
     * @returns The element's record, or undefined.
     */
    const recordOf = (
        held: Frame,
        target: SelectorTarget,
        index: number,
        runId: RunId,
    ): Readonly<Record<string, unknown>> | undefined => {
        const result = readResult?.(runId);

        if (result === undefined) {
            return undefined;
        }

        if (target === "node") {
            return index >= 0 && index < held.nodeCount ? result.node(held.graph.ids.idOf(index)) : undefined;
        }

        return index >= 0 && index < held.edgeCount ? result.edge(edgeIdAt(held, index)) : undefined;
    };

    /**
     * The attributes one element arrived with, from whichever store holds them.
     * @param held - The frame.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param index - The element's dense index.
     * @param key - The attribute key.
     * @returns The value, or undefined when the element carries none.
     */
    const attributeOf = (held: Frame, target: SelectorTarget, index: number, key: string): unknown => {
        if (target === "edge") {
            if (index < 0 || index >= held.edgeCount) {
                return undefined;
            }

            // An attribute the edge really carries under `source` / `target` wins; the snapshot's
            // endpoint answers only when the record has nothing under that key.
            return storedAttributeOf(held, target, index, key) ?? edgeEndpointOf(held.graph, index, key);
        }

        return storedAttributeOf(held, target, index, key);
    };

    /**
     * The attribute one element arrived with, from its column or its record.
     * @param held - The frame.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param index - The element's dense index, already bounded for an edge.
     * @param key - The attribute key.
     * @returns The value, or undefined when the element carries none.
     */
    const storedAttributeOf = (held: Frame, target: SelectorTarget, index: number, key: string): unknown => {
        const column = columnFor(held, target, key);

        if (column !== null) {
            return cellValue(column, index);
        }

        if (records === undefined) {
            return undefined;
        }

        if (target === "edge") {
            return records.edgeAttributes(index)?.[key];
        }

        if (index < 0 || index >= held.nodeCount) {
            return undefined;
        }

        return records.nodeAttributes(index, held.graph.ids.idOf(index))?.[key];
    };

    /**
     * One element's value for a path.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param index - The element's dense index.
     * @param path - The column path.
     * @returns The value, or undefined when the element carries none.
     */
    const valueOf = (target: SelectorTarget, index: number, path: Path): unknown => {
        const entry = entryFor(path);

        if (entry.kind === "none") {
            return undefined;
        }

        const held = current();

        if (entry.kind === "result") {
            return recordOf(held, target, index, entry.runId)?.[entry.field];
        }

        return attributeOf(held, target, index, entry.key);
    };

    /**
     * Whether one element carries a value for a path.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param index - The element's dense index.
     * @param path - The column path.
     * @returns True when it carries a value that is neither undefined nor null.
     */
    const presentAt = (target: SelectorTarget, index: number, path: Path): boolean => {
        const entry = entryFor(path);

        if (entry.kind === "none") {
            return false;
        }

        const held = current();

        if (entry.kind === "result") {
            return isPresent(recordOf(held, target, index, entry.runId)?.[entry.field]);
        }

        // An endpoint key is answered by the value reader, which falls back to the snapshot.
        if (target === "edge" && (entry.key === "source" || entry.key === "target")) {
            return isPresent(attributeOf(held, target, index, entry.key));
        }

        const column = columnFor(held, target, entry.key);

        // The bitmap road: a column says whether a row is set without reading what is in it, which
        // is the reason this member is supplied rather than derived from the value reader.
        if (column !== null) {
            return cellPresent(column, index);
        }

        return isPresent(attributeOf(held, target, index, entry.key));
    };

    /**
     * Walk out every element one run published a value for.
     *
     * O(n) in the elements, once per freeze per path, and cached against both -- which is the
     * price of a `RunResult` that can be asked about one element and cannot enumerate the elements
     * it holds. Every repaint after the first costs the run's element count instead of the graph's.
     * @param held - The frame.
     * @param target - Whether the asking layer paints nodes or edges.
     * @param entry - The parsed result path.
     * @param result - The run's result, or undefined when it has published none.
     * @returns The dense indices, ascending.
     */
    const walkMeasured = (
        held: Frame,
        target: SelectorTarget,
        entry: PathEntry,
        result: RunResult | undefined,
    ): Uint32Array => {
        if (result === undefined) {
            return NO_INDICES;
        }

        const count = target === "node" ? held.nodeCount : held.edgeCount;
        const read =
            target === "node"
                ? (index: number): Readonly<Record<string, unknown>> | undefined => result.node(held.graph.ids.idOf(index))
                : (index: number): Readonly<Record<string, unknown>> | undefined => result.edge(edgeIdAt(held, index));
        const found = new Uint32Array(count);
        let kept = 0;

        for (let index = 0; index < count; index++) {
            if (isPresent(read(index)?.[entry.field])) {
                found[kept] = index;
                kept++;
            }
        }

        // Trimmed rather than handed back as a subarray: a run of three hundred over fifty
        // thousand elements would otherwise keep the whole two-hundred-kilobyte buffer alive for
        // as long as the layer reading it exists.
        return kept === count ? found : found.slice(0, kept);
    };

    return {
        nodeValue: (index: number, path: Path): unknown => valueOf("node", index, path),
        edgeValue: (index: number, path: Path): unknown => valueOf("edge", index, path),
        nodeHas: (index: number, path: Path): boolean => presentAt("node", index, path),
        edgeHas: (index: number, path: Path): boolean => presentAt("edge", index, path),
        nodeIdOf: (index: number): NodeId => current().graph.ids.idOf(index),
        edgeIdOf: (index: number): EdgeId => {
            const held = current();

            return edgeIdAt(held, index);
        },
        measured: (path: Path, target: SelectorTarget): ArrayLike<number> | undefined => {
            const entry = entryFor(path);

            if (entry.kind !== "result") {
                return undefined;
            }

            const held = current();
            const cache = target === "node" ? held.nodeMeasured : held.edgeMeasured;
            const result = readResult?.(entry.runId);
            const known = cache.get(path);

            // The result object is part of the key, not only the snapshot: a run that finishes
            // while the graph stands still publishes a column where there was none, and a cache
            // keyed on the snapshot alone would go on reporting that nobody measured anything.
            if (known !== undefined && known.result === result) {
                return known.indices;
            }

            const indices = walkMeasured(held, target, entry, result);
            cache.set(path, { result, indices });

            return indices;
        },
        topCut: (path: Path, target: SelectorTarget, n: number): number | undefined => {
            const entry = entryFor(path);
            const result = entry.kind === "result" ? readResult?.(entry.runId) : undefined;
            const declared = result?.fields.find((candidate) => candidate.name === entry.field);

            // Checked rather than caught: `top` refuses a field that is not a number published per
            // element, and a refusal thrown here would come out of the paint loop.
            if (
                result === undefined ||
                declared?.kind !== target ||
                (declared.type !== "number" && declared.type !== "integer")
            ) {
                return undefined;
            }

            return result.top(entry.field, n).entries.at(-1)?.value;
        },
    };
}
