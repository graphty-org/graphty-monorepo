import { type GraphSnapshot, INVALID_INDEX, type NumericVector } from "@graphty/graph-format";
import { kamadaKawai } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { GraphtyLogger } from "../logging/GraphtyLogger.js";
import { layoutDim, SimpleLayoutConfig, SimpleLayoutEngine } from "./LayoutEngine";

const logger = GraphtyLogger.getLogger(["graphty", "layout"]);

/**
 * The smallest summed weight the layout acts on.
 *
 * A record may carry `weight: 0`, and the distance of a zero-weight edge is `1 / 0`. Clamping here
 * means zero reads as "as weak as the solver can express": the largest possible distance.
 */
const WEIGHT_EPSILON = 1e-6;

/** The derived edge column the layout reads its distances from. */
const DISTANCE_COLUMN = "graphty.kamadaKawaiDistance";

/**
 * The graph's per-edge weights at full precision: the f64 role-`weight` column when there is one,
 * else the f32 weights, else null for an unweighted graph.
 * @param g - the graph
 * @returns one weight per edge, or null
 */
function edgeWeights(g: GraphSnapshot): NumericVector | null {
    const exact = g.edges.byRole("weight");
    return exact?.dtype === "f64" ? exact.data : g.edgeList().weights;
}

/**
 * The graph with one distance per edge, `1 / w` where `w` is the SUM of the weights of every edge
 * between the same two nodes, or null when every weight is 1 and there is nothing to read.
 *
 * Summed first because Kamada-Kawai keeps one distance per pair of nodes: left to itself it would
 * take the shortest of two parallel edges, so the order a file listed them in -- or which of the
 * two was heavier -- would decide the picture instead of the connection they make together.
 *
 * The sum is taken over `source`, the graph as stored, and not over `g`: turning a directed graph
 * undirected has already collapsed a reciprocal pair (a->b and b->a) into one edge carrying only
 * the first edge's weight, so summing after that would drop the other half.
 * @param g - the undirected graph the layout reads
 * @param source - the graph `g` was derived from, with the same node rows; `g` itself when undirected
 * @returns the graph with the distance column, or null
 */
function withDistances(g: GraphSnapshot, source: GraphSnapshot): GraphSnapshot | null {
    const weights = edgeWeights(source);
    if (weights === null || weights.every((w) => w === 1)) {
        return null;
    }

    const n = g.nodeCount;
    const pairKey = (a: number, b: number): number => Math.min(a, b) * n + Math.max(a, b);
    const summed = new Map<number, number>();
    const stored = source.edgeList();
    for (let e = 0; e < source.edgeCount; e++) {
        const key = pairKey(stored.src[e], stored.dst[e]);
        summed.set(key, (summed.get(key) ?? 0) + weights[e]);
    }

    const { src, dst } = g.edgeList();

    let clamped = 0;
    for (const w of summed.values()) {
        if (w < WEIGHT_EPSILON) {
            clamped++;
        }
    }

    if (clamped > 0) {
        // Once per run and not per edge: a graph whose weights are all zero would otherwise bury
        // every other message in the run it happened during.
        logger.warn("Edge weights at or below zero were clamped before the layout read them", {
            layout: "kamada-kawai",
            clamped,
            epsilon: WEIGHT_EPSILON,
        });
    }

    const distance = new Float64Array(g.edgeCount);
    for (let e = 0; e < g.edgeCount; e++) {
        distance[e] = 1 / Math.max(summed.get(pairKey(src[e], dst[e])) ?? 1, WEIGHT_EPSILON);
    }

    return g.withColumns(undefined, { [DISTANCE_COLUMN]: distance });
}

/**
 * Zod-based options schema for Kamada-Kawai Layout
 */
const kamadaKawaiLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(50),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Scale factor for the layout",
            step: 0.1,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(3).default(3),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    weighted: {
        schema: z.boolean().default(true),
        meta: {
            label: "Use Edge Weights",
            description: "Place strongly connected nodes closer together",
        },
    },
});

const KamadaKawaiLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    dist: z.record(z.number(), z.record(z.number(), z.number())).or(z.null()).default(null),
    pos: z.record(z.number(), z.array(z.number()).min(1).max(3)).or(z.null()).default(null),
    weighted: z.boolean().default(true),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(3),
});
type KamadaKawaiLayoutConfigType = z.infer<typeof KamadaKawaiLayoutConfig>;
type KamadaKawaiLayoutOpts = Partial<KamadaKawaiLayoutConfigType>;

/**
 * Kamada-Kawai layout engine using spring-embedder energy minimization
 */
export class KamadaKawaiLayout extends SimpleLayoutEngine {
    static type = "kamada-kawai";
    static maxDimensions = 3;
    static override honoursWeights = true;
    static zodOptionsSchema: OptionsSchema = kamadaKawaiLayoutOptionsSchema;
    scalingFactor = 50;
    config: KamadaKawaiLayoutConfigType;

    /**
     * Create a Kamada-Kawai layout engine
     * @param opts - Configuration options including scale and dimensions
     */
    constructor(opts: KamadaKawaiLayoutOpts) {
        super(opts);
        this.config = KamadaKawaiLayoutConfig.parse(opts);
    }

    /**
     * Get dimension-specific options for Kamada-Kawai layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }

    /**
     * Compute node positions using Kamada-Kawai algorithm
     *
     * A WEIGHT IS INVERTED ON THE WAY IN, and that is the one thing about this engine a reader
     * has to know. Kamada-Kawai reads its weight as a graph DISTANCE -- it is fed straight to
     * Floyd-Warshall and then drawn as a length -- so a heavier edge would push its two nodes
     * FURTHER APART, the opposite of what a weight means everywhere else in the element, where a
     * larger number is a stronger connection. Nothing on screen would say which convention was in
     * force. So the element hands this solver `1 / weight` and the whole package keeps one
     * reading: heavier means more strongly connected, means drawn closer together.
     */
    doLayout(): void {
        this.stale = false;
        const dim = layoutDim(this.config.dim);
        const weighted = this.config.weighted ? withDistances(this.graph, this.sourceGraph) : null;
        this.result = kamadaKawai(weighted ?? this.graph, {
            dist: this.distances(),
            pos: this.startPositions(dim) ?? this.rowsOfRecord(this.config.pos, dim),
            weight: weighted === null ? false : DISTANCE_COLUMN,
            scale: this.config.scale,
            center: this.config.center ?? undefined,
            dim,
        });
    }

    /**
     * The `dist` option as the matrix the layout reads, `n * n` distances row by row; a pair the
     * record does not give is unreachable.
     * @returns the matrix, or null for no option
     */
    private distances(): Float64Array | null {
        const { dist } = this.config;
        if (dist === null) {
            return null;
        }

        const n = this.graph.nodeCount;
        const out = new Float64Array(n * n).fill(Number.POSITIVE_INFINITY);
        for (const [source, row] of Object.entries(dist)) {
            const i = this.rowOfId(source);
            for (const [target, d] of Object.entries(row)) {
                const j = this.rowOfId(target);
                if (i !== INVALID_INDEX && j !== INVALID_INDEX) {
                    out[i * n + j] = d;
                }
            }
        }

        return out;
    }
}
