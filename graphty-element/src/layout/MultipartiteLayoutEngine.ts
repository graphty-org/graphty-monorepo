import { type F32, INVALID_INDEX } from "@graphty/graph-format";
import { multipartite } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for Multipartite Layout
 */
const multipartiteLayoutOptionsSchema = defineOptions({
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
            description: "Direction of multipartite partitions",
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

const MultipartiteLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    // subsetKey: z.string().or(z.record(z.number(), z.array(z.string().or(z.number())))),
    subsetKey: z.record(z.string(), z.array(z.string().or(z.number()))),
    align: z.enum(["vertical", "horizontal"]).default("vertical"),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
});
type MultipartiteLayoutConfigType = z.infer<typeof MultipartiteLayoutConfig>;
type MultipartiteLayoutOpts = Partial<MultipartiteLayoutConfigType>;

/**
 * Multipartite layout engine for graphs with multiple node partitions
 */
export class MultipartiteLayout extends SnapshotLayoutEngine {
    static type = "multipartite";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = multipartiteLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 40;
    protected readonly dimensions: 2 | 3;
    config: MultipartiteLayoutConfigType;

    /**
     * Create a multipartite layout engine
     * @param opts - Configuration options including subset keys and alignment
     */
    constructor(opts: MultipartiteLayoutOpts) {
        super(opts);
        this.config = MultipartiteLayoutConfig.parse(opts);
        this.dimensions = 2;
    }

    /**
     * Get dimension-specific options for multipartite layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Multipartite only supports 2D
        if (dimension > this.maxDimensions) {
            return null;
        }

        // Multipartite doesn't use 'dim' parameter
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
     * Compute node positions for multipartite graph
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            multipartite(input.graph, {
            // A node a layer names that the graph does not hold has nowhere to be drawn.
            subsets: Object.values(this.config.subsetKey).map((layer) =>
                layer.map((id) => this.rowOfId(id)).filter((row) => row !== INVALID_INDEX),
            ),
            align: this.config.align,
            scale: this.config.scale,
            center: this.config.center ?? undefined,
        }),
            MultipartiteLayout.scale,
        );
    }
}
