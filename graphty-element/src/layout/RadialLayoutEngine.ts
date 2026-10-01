import type { F32 } from "@graphty/graph-format";
import { radial } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

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
export class RadialLayout extends SnapshotLayoutEngine {
    static type = "radial";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = radialLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 100;
    protected readonly dimensions: 2 | 3;
    config: RadialLayoutConfigType;

    /**
     * Create a radial layout engine
     * @param opts - Configuration options including the root node
     */
    constructor(opts: RadialLayoutOpts) {
        super(opts);
        this.config = RadialLayoutConfig.parse(opts);
        this.dimensions = 2;
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
     * The options the layout reads: the parsed configuration.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Compute node positions on rings around the root
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        const { root } = this.config;
        return sceneUnits(
            radial(input.graph, {
                root: root === null ? null : this.requireRow(root, "root"),
                scale: this.config.scale,
                center: this.config.center ?? undefined,
            }),
            RadialLayout.scale,
        );
    }
}
