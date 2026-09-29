import type { F32 } from "@graphty/graph-format";
import { planar } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for Planar Layout
 */
const planarLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(70),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Scale factor for the planar layout",
            step: 0.1,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(2).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D only for planar)",
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
});

const PlanarLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    dim: z.number().default(2),
    seed: z.number().or(z.null()).default(null),
});
type PlanarLayoutConfigType = z.infer<typeof PlanarLayoutConfig>;
type PlanarLayoutOpts = Partial<PlanarLayoutConfigType>;

/**
 * Planar layout engine for planar graphs (no edge crossings)
 */
export class PlanarLayout extends SnapshotLayoutEngine {
    static type = "planar";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = planarLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 70;
    protected readonly dimensions: 2 | 3;
    config: PlanarLayoutConfigType;

    /**
     * Create a planar layout engine
     * @param opts - Configuration options including scale and seed
     */
    constructor(opts: PlanarLayoutOpts) {
        super(opts);
        this.config = PlanarLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Get dimension-specific options for planar layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter or null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Planar layout only supports 2D
        if (dimension > this.maxDimensions) {
            return null;
        }

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
     * Compute planar node positions with no edge crossings
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            planar(input.graph, {
            scale: this.config.scale,
            center: this.config.center ?? undefined,
            dim: layoutDim(this.config.dim),
            seed: this.config.seed,
        }),
            PlanarLayout.scale,
        );
    }
}
