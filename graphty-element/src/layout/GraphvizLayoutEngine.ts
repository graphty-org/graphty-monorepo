import type { F32 } from "@graphty/graph-format";
import { z } from "zod";

import { defineOptions, type OptionsSchema, parseOptions } from "../config";
import { GraphtyError } from "../errors";
import type { GraphtyErrorCode } from "../errors/codes";
import {
    GRAPHVIZ_NODE_BUDGETS,
    GRAPHVIZ_PACKAGE,
    GRAPHVIZ_TIME_BUDGET_MS,
    type GraphvizEngine,
    graphvizLayoutId,
} from "./graphviz/engines";
import { fromJson } from "./graphviz/fromJson";
import type { GraphvizFailureCode, GraphvizReply } from "./graphviz/protocol";
import { toDot } from "./graphviz/toDot";
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
 * @param skip - the rows Graphviz is not handed: groups the element draws round their members
 * @returns the coordinates, two per row (NaN for a skipped row)
 */
async function computeWith(
    engine: GraphvizEngine,
    input: SnapshotLayoutInput,
    options: Readonly<Record<string, unknown>>,
    skip: (row: number) => boolean,
): Promise<F32> {
    const n = input.graph.nodeCount;
    if (n === 0) {
        return new Float32Array(0);
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
    if (engine === "twopi" && attributes.ranksep === undefined) {
        attributes.ranksep = String(TWOPI_RANKSEP_PER_INCH * widest(sizes));
    }

    const dot = toDot(input.stored, attributes, sizes, extents, skip, engine === "patchwork");
    const { probeGraphviz, runGraphviz } = await import("./graphviz/host");
    if (!(await probeGraphviz())) {
        throw graphvizError("graphviz.unavailable", { engine });
    }

    input.signal.throwIfAborted();
    const reply: GraphvizReply = await runGraphviz(
        { kind: "layout", dot, engine },
        { signal: input.signal, timeoutMs: options.timeoutMs as number },
    );
    if (!reply.ok) {
        throw graphvizError(reply.code, reply.params);
    }

    return fromJson(reply.json, n).map((value) => value * scale);
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

        protected compute(input: SnapshotLayoutInput): Promise<F32> {
            // A group drawn round its members is placed by the element, not by Graphviz: handed
            // over as a node, it would take up room of its own beside the members it encloses.
            return computeWith(engine, input, this.options, (row) => this.isFollower(row));
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
