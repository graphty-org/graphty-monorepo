import type { F32 } from "@graphty/graph-format";
import { z } from "zod";

import { defineOptions, type OptionsSchema, parseOptions } from "../config";
import type { RankSet } from "../data/groups";
import type { Edge } from "../Edge";
import { GraphtyError } from "../errors";
import type { GraphtyErrorCode } from "../errors/codes";
import { parseBends } from "../meshes/edgeRoute";
import type { Node } from "../Node";
import {
    GRAPHVIZ_NODE_BUDGETS,
    GRAPHVIZ_PACKAGE,
    GRAPHVIZ_TIME_BUDGET_MS,
    type GraphvizEngine,
    graphvizLayoutId,
} from "./graphviz/engines";
import { canvasMeasure, withDrawnFonts } from "./graphviz/fonts";
import {
    clusterMargins,
    edgeBends,
    edgeLabelPlaces,
    type EdgeLabelsAt,
    edgeLabelsLeftOut,
    fromJson,
    nodeXlabelPlaces,
} from "./graphviz/fromJson";
import type { GraphvizFailureCode, GraphvizReply } from "./graphviz/protocol";
import { graphvizStructure } from "./graphviz/structure";
import { type DotStructure, POINTS_PER_UNIT, toDot } from "./graphviz/toDot";
import { type GroupMargins, laidGroupMargins } from "./groupMargins";
import type { EdgePosition } from "./LayoutEngine";
import { SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * The options every engine takes.
 * @param engine - the engine, whose node budget is the default
 * @returns the schema
 */
function commonOptions(engine: GraphvizEngine): OptionsSchema {
    return {
        maxNodes: {
            schema: z.number().int().positive().default(GRAPHVIZ_NODE_BUDGETS[engine]),
            meta: {
                label: "Node budget",
                description: "The largest graph handed to Graphviz; a larger one fails instead of running",
                advanced: true,
            },
        },
        timeoutMs: {
            schema: z.number().int().positive().default(GRAPHVIZ_TIME_BUDGET_MS),
            meta: {
                label: "Time budget (ms)",
                description: "How long one layout may run before it is stopped and fails",
                advanced: true,
            },
        },
        scale: {
            schema: z.number().positive().default(1),
            meta: {
                label: "Scale",
                description:
                    "The scene units one inch of Graphviz's drawing takes: node sizes are handed to Graphviz divided by it and its positions come back multiplied by it",
                advanced: true,
            },
        },
        nodeSize: {
            schema: z.enum(["drawn", "label"]).default("drawn"),
            meta: {
                label: "Node size",
                description:
                    'What size Graphviz lays each node out at: "drawn", the size the element draws it; "label", the size Graphviz gives it from the Graphviz attributes in its data (its label, font, shape and least size), as Graphviz lays out a DOT file',
                advanced: true,
            },
        },
        attributes: {
            schema: z.record(z.string(), z.string()).default({}),
            meta: {
                label: "Graph attributes",
                description: 'Raw Graphviz graph attributes, such as { splines: "ortho" }',
                advanced: true,
            },
        },
    };
}

/** The options of dot, the layered engine. */
const DOT_OPTIONS: OptionsSchema = {
    rankdir: {
        schema: z.enum(["TB", "LR", "BT", "RL"]).optional(),
        meta: { label: "Rank direction", description: "Which way the ranks run" },
    },
    nodesep: {
        schema: z.number().nonnegative().optional(),
        meta: { label: "Node separation", description: "Space between nodes in one rank, in scene units" },
    },
    ranksep: {
        schema: z.number().nonnegative().optional(),
        meta: { label: "Rank separation", description: "Space between ranks, in scene units" },
    },
};

/** The options of the force engines. */
const FORCE_OPTIONS: OptionsSchema = {
    seed: {
        schema: z.number().int().nonnegative().optional(),
        meta: { label: "Seed", description: "The start seed; the same seed gives the same drawing" },
    },
    overlap: {
        schema: z.enum(["true", "false", "scale"]).optional(),
        meta: { label: "Overlap", description: "Whether nodes may overlap, or how overlaps are removed" },
    },
};

/** Each engine's own options, besides the common ones. */
const ENGINE_OPTIONS: Readonly<Record<GraphvizEngine, OptionsSchema>> = {
    dot: DOT_OPTIONS,
    neato: FORCE_OPTIONS,
    fdp: FORCE_OPTIONS,
    sfdp: FORCE_OPTIONS,
    circo: {},
    twopi: {},
    osage: {},
    patchwork: {},
};

/** Which error code each failure reason is reported with. */
const FAILURE_CODES: Readonly<Record<GraphvizFailureCode, GraphtyErrorCode>> = {
    "graphviz.unavailable": "E_MISSING_PACKAGE",
    "graphviz.syntax": "E_PARSE_FAILED",
    "graphviz.error": "E_UNSUPPORTED",
    "graphviz.crashed": "E_EXTENSION_FAILED",
    "graphviz.timeout": "E_CAP_EXCEEDED",
    "graphviz.too-large": "E_CAP_EXCEEDED",
};

/**
 * The error a failed Graphviz layout rejects with: the house code, and the Graphviz reason and
 * its parameters in `details`.
 * @param reason - why it failed
 * @param params - the reason's parameters
 * @returns the error
 */
export function graphvizError(reason: GraphvizFailureCode, params: Readonly<Record<string, unknown>>): GraphtyError {
    const message =
        reason === "graphviz.unavailable"
            ? `Graphviz layouts need the optional package ${GRAPHVIZ_PACKAGE}; install it with npm install ${GRAPHVIZ_PACKAGE}`
            : `the Graphviz layout failed (${reason}): ${JSON.stringify(params)}`;
    return new GraphtyError({
        code: FAILURE_CODES[reason],
        message,
        source: "layout",
        details: { ...params, reason, ...(reason === "graphviz.unavailable" ? { package: GRAPHVIZ_PACKAGE } : {}) },
    });
}

/**
 * The options of one engine, as its catalogue entry publishes them.
 * @param engine - the engine
 * @returns the schema
 */
function graphvizOptionsSchema(engine: GraphvizEngine): OptionsSchema {
    return defineOptions({ ...ENGINE_OPTIONS[engine], ...commonOptions(engine) });
}

/**
 * The graph attributes a run hands Graphviz: the raw ones, then the typed options over them.
 * @param engine - the engine
 * @param options - the parsed options
 * @returns the attributes as Graphviz text
 */
export function graphvizAttributes(
    engine: GraphvizEngine,
    options: Readonly<Record<string, unknown>>,
): Record<string, string> {
    const out: Record<string, string> = { ...(options.attributes as Record<string, string> | undefined) };
    // nodesep and ranksep are given in scene units; Graphviz reads inches.
    const scale = typeof options.scale === "number" ? options.scale : 1;
    for (const name of ["nodesep", "ranksep"]) {
        const value = options[name];
        if (typeof value === "number") {
            out[name] = String(value / scale);
        }
    }
    for (const [name, attribute] of [
        ["rankdir", "rankdir"],
        ["overlap", "overlap"],
        ["seed", "start"],
    ]) {
        const value = options[name];
        if (typeof value === "string" || typeof value === "number") {
            out[attribute] = String(value);
        }
    }

    // Graphviz reads `layout` from the graph itself; the engine is the one this layout names.
    delete out.layout;
    return out;
}

/** twopi's default ring spacing (1 inch) per inch of Graphviz's default node width (0.75 inch). */
const TWOPI_RANKSEP_PER_INCH = 4 / 3;

/**
 * The widest drawn node, in scene units (inches to Graphviz).
 * @param sizes - the drawn size of each node; NaN for a row no node answers
 * @returns the widest, 1 when no row has a size
 */
function widest(sizes: ArrayLike<number> | undefined): number {
    let max = 0;
    for (let i = 0; i < (sizes?.length ?? 0); i++) {
        const size = sizes?.[i] ?? Number.NaN;
        if (Number.isFinite(size) && size > max) {
            max = size;
        }
    }

    return max > 0 ? max : 1;
}

/**
 * Lay a graph out with one Graphviz engine in a Worker.
 * @param engine - the engine
 * @param input - the run's input
 * @param options - the parsed options
 * @param groups - the groups the element draws round their members, each with its member rows:
 *     handed over as clusters, not as nodes
 * @param structure - the edges with their attributes, the clusters' attributes and the rank subgraphs
 * @returns the coordinates, two per row (NaN for a skipped row), the bends of each edge Graphviz
 *     routed off the straight line and where it put each edge label, by its place in `structure.edges`, and how far
 *     each group's cluster reaches past its members on each side, by the group's row
 */
async function computeWith(
    engine: GraphvizEngine,
    input: SnapshotLayoutInput,
    options: Readonly<Record<string, unknown>>,
    groups: ReadonlyMap<number, readonly number[]>,
    structure: DotStructure,
): Promise<{
    positions: F32;
    bends: ReadonlyMap<number, string>;
    labels: ReadonlyMap<number, EdgeLabelsAt>;
    xlabels: ReadonlyMap<number, readonly [number, number] | null>;
    margins: ReadonlyMap<number, GroupMargins>;
}> {
    const n = input.graph.nodeCount;
    if (n === 0) {
        return {
            positions: new Float32Array(0),
            bends: new Map(),
            labels: new Map(),
            xlabels: new Map(),
            margins: new Map(),
        };
    }

    const limit = options.maxNodes as number;
    if (n > limit) {
        throw graphvizError("graphviz.too-large", { engine, nodes: n, limit });
    }

    const attributes = graphvizAttributes(engine, options);
    // The DOT names nodes by row, so a root given as a node's id is given as its row.
    if (attributes.root !== undefined) {
        const { ids } = input.stored;
        const row = [attributes.root, Number(attributes.root)].map((id) => ids.indexOf(id)).find((index) => index >= 0);
        if (row !== undefined) {
            attributes.root = `n${row}`;
        }
    }

    const scale = options.scale as number;
    const sizes = input.nodeSizes?.().map((size) => size / scale);
    const extents = input.nodeExtents?.().map((size) => size / scale);
    // twopi spaces its rings `ranksep` apart (1 inch by default) whatever the nodes' size, which
    // fits Graphviz's 0.75-inch default node; scale it to the widest node the element draws.
    if (engine === "twopi" && attributes.ranksep === undefined && structure.labelSized !== true) {
        attributes.ranksep = String(TWOPI_RANKSEP_PER_INCH * widest(sizes));
    }

    // graph-io reads a spline into bends as it does for a file that stores its routes, and says which font the element
    // draws a `fontname` in, which is the font Graphviz must size the label in
    const { graphvizFont, graphvizPosBends } = await import("@graphty/graph-io/dot");
    const measure = canvasMeasure();
    const handed = measure === null ? structure : withDrawnFonts(structure, graphvizFont, measure);
    const dot = toDot(input.stored, attributes, sizes, extents, groups, handed, engine === "patchwork");
    const { probeGraphviz, runGraphviz } = await import("./graphviz/host");
    if (!(await probeGraphviz())) {
        throw graphvizError("graphviz.unavailable", { engine });
    }

    input.signal.throwIfAborted();
    const reply: GraphvizReply = await runGraphviz(
        { kind: "layout", dot, engine, pinned: structure.positions !== undefined },
        { signal: input.signal, timeoutMs: options.timeoutMs as number },
    );
    if (!reply.ok) {
        throw graphvizError(reply.code, reply.params);
    }

    return {
        positions: fromJson(reply.json, n).map((value) => value * scale),
        bends: edgeBends(reply.json, structure.edges ?? [], graphvizPosBends),
        labels: edgeLabelsAt(reply.json, structure.edges ?? []),
        xlabels: new Map(
            [...nodeXlabelPlaces(reply.json)].map(([row, place]) => [
                row,
                place === null
                    ? null
                    : ([(place[0] / POINTS_PER_UNIT) * scale, (place[1] / POINTS_PER_UNIT) * scale] as const),
            ]),
        ),
        margins: new Map(
            [...clusterMargins(reply.json)].map(([row, m]) => [
                row,
                {
                    left: (m.left / POINTS_PER_UNIT) * scale,
                    right: (m.right / POINTS_PER_UNIT) * scale,
                    bottom: (m.bottom / POINTS_PER_UNIT) * scale,
                    top: (m.top / POINTS_PER_UNIT) * scale,
                },
            ]),
        ),
    };
}

/**
 * Where Graphviz put each edge's labels, by its place in the list handed over: its label (its `lp`, or its `xlp` when
 * it has only an external label), its external label beside a label (`xlp`) and its end labels; and the labels it left
 * out, which have no place.
 * @param json - the `-Tjson` text
 * @param edges - the edges handed over
 * @returns each edge's label places; absent for an edge Graphviz placed none of
 */
function edgeLabelsAt(
    json: string,
    edges: readonly { readonly src: number; readonly dst: number }[],
): Map<number, EdgeLabelsAt> {
    const out = new Map<number, EdgeLabelsAt>();
    // an edge with only an external label draws it as its label; beside a label it is drawn at `xlp` on its own
    const external = edgeLabelPlaces(json, edges, "xlp");
    const places = [
        ["labelAt", "label", external],
        ["xlabelAt", "xlabel", external],
        ["labelAt", "label", edgeLabelPlaces(json, edges)],
        ["headLabelAt", "headLabel", edgeLabelPlaces(json, edges, "head_lp")],
        ["tailLabelAt", "tailLabel", edgeLabelPlaces(json, edges, "tail_lp")],
    ] as const;
    const leftOut = edgeLabelsLeftOut(json);
    for (const [name, part, byEdge] of places) {
        for (const [k, place] of byEdge) {
            // a label left out still has an `lp`, `head_lp` or `tail_lp`, at no place Graphviz drew
            if (!leftOut.get(k)?.includes(part)) {
                out.set(k, { ...out.get(k), [name]: place });
            }
        }
    }
    for (const [k, parts] of leftOut) {
        out.set(k, { ...out.get(k), leftOut: parts });
    }

    return out;
}

/**
 * What the graph's data says about the layout besides node sizes: the edges in the order they arrived with their
 * Graphviz attributes, each group's cluster attributes, and the file's rank subgraphs.
 * @param input - the run's input
 * @param nodes - the layout's nodes
 * @param edges - the layout's edges, in the order they arrived
 * @param followers - the groups drawn round their members, by row: handed over as clusters
 * @param withOutlines - also hand over each node's outline (its `shape`), for a run that routes edges between
 *     nodes already placed
 * @param labelSized - hand each node over for Graphviz to size by its label, font, shape and least size, as it lays
 *     out a DOT file, instead of at its drawn size
 * @returns the structure, and the edge each of its edges is
 */
export function layoutStructure(
    input: SnapshotLayoutInput,
    nodes: readonly Node[],
    edges: readonly Edge[],
    followers: ReadonlyMap<number, readonly number[]>,
    withOutlines = false,
    labelSized = false,
): DotStructure & { readonly edgeOf: readonly Edge[] } {
    const { ids } = input.stored;
    const groups = new Map<number, Readonly<Record<string, unknown>>>();
    const data = new Map<number, Readonly<Record<string, unknown>>>();
    for (const node of nodes) {
        const row = ids.indexOf(node.id);
        if (followers.has(row)) {
            groups.set(row, node.data);
        } else if (withOutlines || labelSized) {
            data.set(row, node.data);
        }
    }

    // An engine driven without an element has nodes whose parent holds no data manager.
    const host: { getDataManager?: () => { readonly rankSets: readonly RankSet[] } } | undefined =
        nodes[0]?.parentGraph;
    const ranks = host?.getDataManager?.().rankSets ?? [];
    return graphvizStructure(
        (id) => ids.indexOf(id),
        edges,
        groups,
        ranks,
        withOutlines || labelSized ? data : undefined,
        labelSized ? { idOf: (row) => ids.idOf(row) } : undefined,
    );
}

/**
 * The bends Graphviz laid each edge along, by edge.
 * @param bends - each route's `bends` text, by place in the list handed over
 * @param edgeOf - the edge at each place
 * @returns each routed edge's bends, flat pairs
 */
export function routesOf(bends: ReadonlyMap<number, string>, edgeOf: readonly Edge[]): Map<Edge, readonly number[]> {
    const routes = new Map<Edge, readonly number[]>();
    for (const [k, text] of bends) {
        const pairs = parseBends(text);
        if (pairs !== null) {
            routes.set(edgeOf[k], pairs);
        }
    }

    return routes;
}

/**
 * Have Graphviz route the edges between nodes that are already placed, moving none of them: neato's `-n2`, which is
 * how Graphviz draws a file whose nodes carry their `pos` and whose edges do not.
 * @param input - the run's input
 * @param positions - every row's coordinates, `dim` per row, in scene units
 * @param dim - the numbers per row
 * @param options - how Graphviz is run
 * @param options.scale - the scene units one inch of Graphviz's drawing takes
 * @param options.attributes - its graph attributes, such as `splines`
 * @param options.timeoutMs - how long Graphviz may take
 * @param followers - the groups drawn round their members, by row: handed over as clusters
 * @param structure - the edges with their attributes, the nodes' outlines and the clusters' attributes
 * @returns each routed edge's bends, by place in `structure.edges`
 */
export async function pinnedRoutes(
    input: SnapshotLayoutInput,
    positions: F32,
    dim: number,
    options: {
        readonly scale: number;
        readonly attributes: Readonly<Record<string, string>>;
        readonly timeoutMs: number;
    },
    followers: ReadonlyMap<number, readonly number[]>,
    structure: DotStructure,
): Promise<ReadonlyMap<number, string>> {
    const n = input.graph.nodeCount;
    const points = new Float32Array(2 * n);
    for (let row = 0; row < n; row++) {
        points[2 * row] = (positions[dim * row] * POINTS_PER_UNIT) / options.scale;
        points[2 * row + 1] = (positions[dim * row + 1] * POINTS_PER_UNIT) / options.scale;
    }

    const { bends } = await computeWith("neato", input, { ...options, maxNodes: Number.POSITIVE_INFINITY }, followers, {
        ...structure,
        positions: points,
    });
    return bends;
}

/** One engine's layout class: a single-pass snapshot layout, two-dimensional. */
type GraphvizLayoutClass = (new (opts: object) => SnapshotLayoutEngine) & {
    readonly type: string;
    readonly maxDimensions: number;
    readonly zodOptionsSchema: OptionsSchema;
    readonly honoursWeights: boolean;
    readonly scoped: boolean;
};

/**
 * Build the layout class for one engine.
 * @param engine - the engine
 * @returns the class, registered under `graphviz-<engine>`
 */
function graphvizLayout(engine: GraphvizEngine): GraphvizLayoutClass {
    const schema = graphvizOptionsSchema(engine);

    return class GraphvizLayout extends SnapshotLayoutEngine {
        static readonly type = graphvizLayoutId(engine);
        static readonly maxDimensions = 2;
        static readonly zodOptionsSchema: OptionsSchema = schema;
        protected readonly dimensions = 2 as const;
        protected readonly options: Readonly<Record<string, unknown>>;
        /** The route Graphviz laid each edge along, as bends, for the edges it did not draw straight. */
        private routes = new Map<Edge, readonly number[]>();
        /** Where Graphviz put each labelled edge's label and end labels, as `along, across` its two ends. */
        private labelPlaces = new Map<Edge, EdgeLabelsAt>();
        /** Where Graphviz put each node's external label, right and down of its center in scene units, by node id as text. */
        private xlabelPlaces = new Map<string, readonly [number, number] | null>();

        /**
         * Build the engine for one `setLayout`.
         * @param opts - the consumer's options
         */
        constructor(opts: object = {}) {
            super(opts);
            this.options = parseOptions(schema, opts as never);
        }

        /**
         * Two-dimensional only.
         * @param dimension - the dimension asked for
         * @returns the options for 2D, null for 3D
         */
        static getOptionsForDimension(dimension: 2 | 3): object | null {
            return dimension > 2 ? null : {};
        }

        protected async compute(input: SnapshotLayoutInput): Promise<F32> {
            // A group drawn round its members is placed by the element, not by Graphviz: it is
            // handed over as a cluster of its members, not as a node with room of its own.
            const structure = layoutStructure(
                input,
                this._nodes,
                this._edges,
                this.followerGroups,
                false,
                this.options.nodeSize === "label",
            );
            const { positions, bends, labels, xlabels, margins } = await computeWith(
                engine,
                input,
                this.options,
                this.followerGroups,
                structure,
            );
            // an answer called off for a newer one leaves the newer one's routes and cluster boxes
            if (!input.signal.aborted) {
                // each cluster is drawn as far past its members as Graphviz drew it: its margin, its
                // label and the edges it routes inside it
                laidGroupMargins.set(this, margins);
                this.routes = routesOf(bends, structure.edgeOf);
                this.labelPlaces = new Map([...labels].map(([k, place]) => [structure.edgeOf[k], place]));
                this.xlabelPlaces = new Map(
                    [...xlabels].map(([row, place]) => [String(input.stored.ids.idOf(row)), place]),
                );
            }
            return positions;
        }

        /**
         * Where Graphviz put a node's external label (its `xlp`).
         * @param n - the node
         * @returns right and down of the node's center, in scene units, or undefined when Graphviz placed none
         */
        override getNodeXlabelOffset(n: Node): readonly [number, number] | undefined {
            return this.xlabelPlaces.get(String(n.id)) ?? undefined;
        }

        /**
         * Whether Graphviz left a node's external label out (the graph's `forcelabels=false` and no room for it).
         * @param n - the node
         * @returns true when Graphviz was handed the label and gave it no place
         */
        override isNodeXlabelLeftOut(n: Node): boolean {
            return this.xlabelPlaces.get(String(n.id)) === null;
        }

        /**
         * Where an edge's ends are, the route Graphviz laid it along when it did not draw it straight, and where it
         * put the edge's label.
         * @param e - the edge
         * @returns its ends, its bends when it has a route, and its label's and end labels' places where Graphviz placed them
         */
        override getEdgePosition(e: Edge): EdgePosition {
            const ends = super.getEdgePosition(e);
            const bends = this.routes.get(e);
            return { ...ends, ...(bends === undefined ? {} : { bends }), ...this.labelPlaces.get(e) };
        }
    };
}

/** The eight Graphviz layout classes, by engine. */
export const GRAPHVIZ_LAYOUTS: Readonly<Record<GraphvizEngine, GraphvizLayoutClass>> = {
    dot: graphvizLayout("dot"),
    neato: graphvizLayout("neato"),
    fdp: graphvizLayout("fdp"),
    sfdp: graphvizLayout("sfdp"),
    circo: graphvizLayout("circo"),
    twopi: graphvizLayout("twopi"),
    osage: graphvizLayout("osage"),
    patchwork: graphvizLayout("patchwork"),
};
