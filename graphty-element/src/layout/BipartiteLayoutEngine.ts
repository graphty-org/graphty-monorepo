import { INVALID_INDEX, makeMask, maskSet } from "@graphty/graph-format";
import { bipartite } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig, SimpleLayoutEngine } from "./LayoutEngine";

/**
 * Zod-based options schema for Bipartite Layout
 */
const bipartiteLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(40),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    align: {
        schema: z.enum(["vertical", "horizontal"]).default("vertical"),
        meta: {
            label: "Alignment",
            description: "Direction of bipartite partitions",
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
    aspectRatio: {
        schema: z
            .number()
            .positive()
            .default(4 / 3),
        meta: {
            label: "Aspect Ratio",
            description: "Width to height ratio",
            step: 0.1,
        },
    },
});

const BipartiteLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    nodes: z.array(z.number().or(z.string())),
    align: z.enum(["vertical", "horizontal"]).default("vertical"),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    aspectRatio: z
        .number()
        .positive()
        .default(4 / 3),
});
type BipartiteLayoutConfigType = z.infer<typeof BipartiteLayoutConfig>;
type BipartiteLayoutOpts = Partial<BipartiteLayoutConfigType>;

/**
 * Bipartite layout engine for graphs with two distinct node sets
 */
export class BipartiteLayout extends SimpleLayoutEngine {
    static type = "bipartite";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = bipartiteLayoutOptionsSchema;
    scalingFactor = 40;
    config: BipartiteLayoutConfigType;

    /**
     * Create a bipartite layout engine
     * @param opts - Configuration options including node partitions and alignment
     */
    constructor(opts: BipartiteLayoutOpts) {
        super(opts);
        this.config = BipartiteLayoutConfig.parse(opts);
    }

    /**
     * Get dimension-specific options for bipartite layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Bipartite only supports 2D
        if (dimension > this.maxDimensions) {
            return null;
        }

        // Bipartite doesn't use 'dim' parameter
        return {};
    }

    /**
     * Compute node positions for bipartite graph
     */
    doLayout(): void {
        this.stale = false;
        const top = makeMask(this.graph.nodeCount);
        for (const id of this.config.nodes) {
            const row = this.rowOfId(id);
            if (row !== INVALID_INDEX) {
                maskSet(top, row, true);
            }
        }

        this.result = bipartite(this.graph, {
            top,
            align: this.config.align,
            scale: this.config.scale,
            center: this.config.center ?? undefined,
            aspectRatio: this.config.aspectRatio,
        });
    }
}
