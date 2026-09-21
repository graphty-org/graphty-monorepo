import { Edge as LayoutEdge, forceatlas2Layout, Graph as LayoutGraph, Node as LayoutNode } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { pairWeightKey, SimpleLayoutConfig, SimpleLayoutEngine, WEIGHT_EPSILON } from "./LayoutEngine";

/**
 * The attribute name handed to `forceatlas2Layout`.
 *
 * That function gates its whole weight branch on this parameter being truthy -- it defaults to
 * null -- so a name has to be passed for weights to be read at all. It then reaches the element's
 * own `getEdgeData` callback and is ignored there: which record key carries the weight was
 * settled one layer up, at ingest, by `config.data.knownFields.edgeWeightPath`, for every engine
 * at once.
 */
const WEIGHT_ATTRIBUTE = "weight";

/**
 * Zod-based options schema for ForceAtlas2 Layout
 */
const forceAtlas2LayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    maxIter: {
        schema: z.number().int().positive().default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum number of simulation iterations",
        },
    },
    jitterTolerance: {
        schema: z.number().positive().default(1.0),
        meta: {
            label: "Jitter Tolerance",
            description: "Tolerance for position jitter",
            step: 0.1,
            advanced: true,
        },
    },
    scalingRatio: {
        schema: z.number().positive().default(2.0),
        meta: {
            label: "Scaling Ratio",
            description: "Ratio for force scaling",
            step: 0.1,
        },
    },
    gravity: {
        schema: z.number().positive().default(1.0),
        meta: {
            label: "Gravity",
            description: "Strength of center gravity",
            step: 0.1,
        },
    },
    distributedAction: {
        schema: z.boolean().default(false),
        meta: {
            label: "Distributed Action",
            description: "Use distributed attraction for hubs",
            advanced: true,
        },
    },
    strongGravity: {
        schema: z.boolean().default(false),
        meta: {
            label: "Strong Gravity",
            description: "Use stronger gravity to prevent escape",
            advanced: true,
        },
    },
    dissuadeHubs: {
        schema: z.boolean().default(false),
        meta: {
            label: "Dissuade Hubs",
            description: "Push hubs away from each other",
            advanced: true,
        },
    },
    linlog: {
        schema: z.boolean().default(false),
        meta: {
            label: "LinLog Mode",
            description: "Use logarithmic attraction",
            advanced: true,
        },
    },
    seed: {
        schema: z.number().nullable().default(null),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible layout",
            advanced: true,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(3).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    weighted: {
        schema: z.boolean().default(true),
        meta: {
            label: "Use Edge Weights",
            description: "Pull strongly connected nodes closer together",
        },
    },
});

const ForceAtlas2LayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    pos: z.record(z.number(), z.array(z.number()).min(2).max(3)).or(z.null()).default(null),
    maxIter: z.number().positive().default(100),
    jitterTolerance: z.number().positive().default(1.0),
    scalingRatio: z.number().positive().default(2.0),
    gravity: z.number().positive().default(1.0),
    distributedAction: z.boolean().default(false),
    strongGravity: z.boolean().default(false),
    nodeMass: z.record(z.number(), z.number()).or(z.null()).default(null),
    nodeSize: z.record(z.number(), z.number()).or(z.null()).default(null),
    weighted: z.boolean().default(true),
    dissuadeHubs: z.boolean().default(false),
    linlog: z.boolean().default(false),
    seed: z.number().or(z.null()).default(null),
    dim: z.number().default(2),
});
type ForceAtlas2LayoutConfigType = z.infer<typeof ForceAtlas2LayoutConfig>;
type ForceAtlas2LayoutOpts = Partial<ForceAtlas2LayoutConfigType>;

/**
 * ForceAtlas2 layout engine for graph visualization with scaling and gravity options
 */
export class ForceAtlas2Layout extends SimpleLayoutEngine {
    static type = "forceatlas2";
    static maxDimensions = 3;
    static override honoursWeights = true;
    static zodOptionsSchema: OptionsSchema = forceAtlas2LayoutOptionsSchema;
    scalingFactor = 100;
    config: ForceAtlas2LayoutConfigType;

    /**
     * Create a ForceAtlas2 layout engine
     * @param opts - Configuration options for the ForceAtlas2 algorithm
     */
    constructor(opts: ForceAtlas2LayoutOpts) {
        super(opts);
        this.config = ForceAtlas2LayoutConfig.parse(opts);
    }

    /**
     * Get dimension-specific options for ForceAtlas2 layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }

    /**
     * Compute node positions using the ForceAtlas2 algorithm
     *
     * A WEIGHT IS PASSED THROUGH AS IT IS STORED. ForceAtlas2 reads a weight as an attraction
     * STRENGTH -- it becomes the adjacency matrix entry the attraction force is scaled by -- which
     * is already what a weight means everywhere else in the element, so a heavier edge pulls its
     * two nodes closer and nothing has to be inverted. Kamada-Kawai reads the very same number as
     * a distance and therefore does invert it; the two engines disagree about the arithmetic so
     * that they agree about the meaning.
     */
    doLayout(): void {
        this.stale = false;
        const nodes = (): LayoutNode[] => this._nodes.map((n) => n.id as LayoutNode);
        const edges = (): LayoutEdge[] => this._edges.map((e) => [e.srcId, e.dstId] as LayoutEdge);
        const graph: LayoutGraph = { nodes, edges };

        const weights = this.config.weighted ? this.pairWeights(this._edges) : null;
        if (weights !== null) {
            this.reportClampedWeights("forceatlas2", weights);
            graph.getEdgeData = (source: LayoutNode, target: LayoutNode): number | undefined => {
                const weight = weights.get(pairWeightKey(source, target));
                if (weight === undefined) {
                    return undefined;
                }

                return Math.max(weight, WEIGHT_EPSILON);
            };
        }

        this.positions = forceatlas2Layout(
            graph,
            this.config.pos,
            this.config.maxIter,
            this.config.jitterTolerance,
            this.config.scalingRatio,
            this.config.gravity,
            this.config.distributedAction,
            this.config.strongGravity,
            this.config.nodeMass,
            this.config.nodeSize,
            weights === null ? null : WEIGHT_ATTRIBUTE,
            this.config.dissuadeHubs,
            this.config.linlog,
            this.config.seed,
            this.config.dim,
        );
    }
}
