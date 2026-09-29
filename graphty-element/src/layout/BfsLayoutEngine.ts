import type { F32 } from "@graphty/graph-format";
import { bfs } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for BFS Layout
 */
const bfsLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(20),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    start: {
        schema: z.union([z.string(), z.number()]),
        meta: {
            label: "Start Node",
            description: "Starting node for BFS traversal",
        },
    },
    align: {
        schema: z.enum(["vertical", "horizontal"]).default("vertical"),
        meta: {
            label: "Alignment",
            description: "Direction of BFS tree expansion",
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
});

const BfsLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    start: z.number().or(z.string()),
    align: z.enum(["vertical", "horizontal"]).default("vertical"),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
});
type BfsLayoutConfigType = z.infer<typeof BfsLayoutConfig>;
type BfsLayoutOpts = Partial<BfsLayoutConfigType>;

/**
 * BFS (Breadth-First Search) layout engine for tree-like graph visualization
 */
export class BfsLayout extends SnapshotLayoutEngine {
    static type = "bfs";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = bfsLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 20;
    protected readonly dimensions: 2 | 3;
    config: BfsLayoutConfigType;

    /**
     * Create a BFS layout engine
     * @param opts - Configuration options including start node and alignment
     */
    constructor(opts: BfsLayoutOpts) {
        super(opts);
        this.config = BfsLayoutConfig.parse(opts);
        this.dimensions = 2;
    }

    /**
     * Get dimension-specific options for BFS layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Bfs only supports 2D
        if (dimension > this.maxDimensions) {
            return null;
        }

        // Bfs doesn't use 'dim' parameter
        return {};
    }

    /**
     * The options the layout reads: the parsed configuration.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Compute node positions using BFS traversal
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            bfs(input.graph, {
            start: this.requireRow(this.config.start, "start"),
            align: this.config.align,
            scale: this.config.scale,
            center: this.config.center ?? undefined,
        }),
            BfsLayout.scale,
        );
    }
}
