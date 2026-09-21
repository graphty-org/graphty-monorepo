import {
    Edge as LayoutEdge,
    Graph as LayoutGraph,
    kamadaKawaiLayout,
    Node as LayoutNode,
} from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { pairWeightKey, SimpleLayoutConfig, SimpleLayoutEngine, WEIGHT_EPSILON } from "./LayoutEngine";

/**
 * The attribute name handed to `kamadaKawaiLayout`.
 *
 * It reaches the element's own `getEdgeData` callback and is ignored there: which record key
 * carries the weight was already settled one layer up, at ingest, by
 * `config.data.knownFields.edgeWeightPath`, for every engine at once. A second attribute name here
 * would be a second weight channel, and the two would disagree.
 */
const WEIGHT_ATTRIBUTE = "weight";

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
     *
     * WHAT IS ASKED FOR IS NOT YET WHAT IS DRAWN, and a reader comparing this code against a
     * screenshot needs to know why. `@graphty/layout`'s Kamada-Kawai solver does not converge from
     * its own circular starting layout once the ideal distances stop being uniform: its
     * backtracking line search gives up after twenty halvings and takes the step anyway, so a
     * large first gradient -- which is exactly what a non-uniform distance matrix produces -- lands
     * it somewhere with a stress many times higher than the optimum. Started AT the optimum it
     * stays there, which is how the cost function and its gradient are known to be right. The
     * defect is upstream and the fix belongs there; the request this engine makes is correct as it
     * stands and needs no change when it is fixed.
     */
    doLayout(): void {
        this.stale = false;
        const nodes = (): LayoutNode[] => this._nodes.map((n) => n.id as LayoutNode);
        const edges = (): LayoutEdge[] => this._edges.map((e) => [e.srcId, e.dstId] as LayoutEdge);
        const graph: LayoutGraph = { nodes, edges };

        const weights = this.config.weighted ? this.pairWeights(this._edges) : null;
        if (weights !== null) {
            this.reportClampedWeights("kamada-kawai", weights);
            graph.getEdgeData = (source: LayoutNode, target: LayoutNode): number | undefined => {
                const weight = weights.get(pairWeightKey(source, target));
                if (weight === undefined) {
                    return undefined;
                }

                return 1 / Math.max(weight, WEIGHT_EPSILON);
            };
        }

        this.positions = kamadaKawaiLayout(
            graph,
            this.config.dist,
            this.config.pos,
            WEIGHT_ATTRIBUTE,
            this.config.scale,
            this.config.center,
            this.config.dim,
        );
    }
}
