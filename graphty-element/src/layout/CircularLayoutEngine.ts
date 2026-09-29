import type { F32 } from "@graphty/graph-format";
import { circular } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * NEW: Zod-based options schema with UI metadata for Circular Layout
 *
 * This is the new unified schema system that provides both Zod validation
 * and rich UI metadata for configuration interfaces.
 */
const circularLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Scale factor for the circular layout radius",
            step: 0.1,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(3).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
});

// Legacy Zod config (kept for backward compatibility)
const CircularLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(2),
});
type CircularLayoutConfigType = z.infer<typeof CircularLayoutConfig>;
type CircularLayoutOpts = Partial<CircularLayoutConfigType>;

/**
 * Circular layout engine that arranges nodes in a circle
 */
export class CircularLayout extends SnapshotLayoutEngine {
    static type = "circular";
    static maxDimensions = 3;

    /**
     * NEW: Zod-based options schema for unified validation and UI metadata
     */
    static zodOptionsSchema: OptionsSchema = circularLayoutOptionsSchema;

    /** Layout units to scene units. */
    private static readonly scale = 80;
    protected readonly dimensions: 2 | 3;
    config: CircularLayoutConfigType;

    /**
     * Create a circular layout engine
     * @param opts - Configuration options including scale and dimensions
     */
    constructor(opts: CircularLayoutOpts) {
        super(opts);
        this.config = CircularLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Get dimension-specific options for circular layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }

    /**
     * The options the layout reads: the parsed configuration.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Compute node positions in a circular arrangement
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            circular(input.graph, {
            scale: this.config.scale,
            center: this.config.center ?? undefined,
            dim: layoutDim(this.config.dim),
        }),
            CircularLayout.scale,
        );
    }
}
