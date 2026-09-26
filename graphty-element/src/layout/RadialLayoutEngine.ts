import { Edge as LayoutEdge, Node as LayoutNode, radialLayout } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig, SimpleLayoutEngine } from "./LayoutEngine";

/**
 * Zod-based options schema for Radial Layout
 */
const radialLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    root: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Root Node",
            description: "The node at the centre; empty picks the node with the most edges",
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Radius of the outermost ring",
            step: 0.1,
        },
    },
});

const RadialLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    root: z.union([z.string(), z.number()]).nullable().default(null),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
});
type RadialLayoutConfigType = z.infer<typeof RadialLayoutConfig>;
type RadialLayoutOpts = Partial<RadialLayoutConfigType>;

/**
 * Radial layout engine that places nodes on rings by hop distance from a root node
 */
export class RadialLayout extends SimpleLayoutEngine {
    static type = "radial";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = radialLayoutOptionsSchema;
    scalingFactor = 100;
    config: RadialLayoutConfigType;

    /**
     * Create a radial layout engine
     * @param opts - Configuration options including the root node
     */
    constructor(opts: RadialLayoutOpts) {
        super(opts);
        this.config = RadialLayoutConfig.parse(opts);
    }

    /**
     * Get dimension-specific options for radial layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        if (dimension > this.maxDimensions) {
            return null;
        }

        return {};
    }

    /**
     * Compute node positions on rings around the root
     */
    doLayout(): void {
        this.stale = false;
        const nodes = (): LayoutNode[] => this._nodes.map((n) => n.id as LayoutNode);
        const edges = (): LayoutEdge[] => this._edges.map((e) => [e.srcId, e.dstId] as LayoutEdge);

        this.positions = radialLayout({ nodes, edges }, this.config.root, this.config.scale, this.config.center);
    }
}
