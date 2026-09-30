import type { F32 } from "@graphty/graph-format";
import { spiral } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for Spiral Layout
 */
const spiralLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(80),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Scale factor for the spiral layout",
            step: 0.1,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(2).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D only for spiral)",
        },
    },
    resolution: {
        schema: z.number().positive().default(0.35),
        meta: {
            label: "Resolution",
            description: "Controls spacing between spiral turns",
            step: 0.05,
            advanced: true,
        },
    },
    equidistant: {
        schema: z.boolean().default(false),
        meta: {
            label: "Equidistant",
            description: "Place nodes at equal distances along the spiral",
            advanced: true,
        },
    },
});

const SpiralLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    dim: z.number().default(2),
    resolution: z.number().positive().default(0.35),
    equidistant: z.boolean().default(false),
});
type SpiralLayoutConfigType = z.infer<typeof SpiralLayoutConfig>;
type SpiralLayoutOpts = Partial<SpiralLayoutConfigType>;

/**
 * Spiral layout engine that arranges nodes along a spiral path
 */
export class SpiralLayout extends SnapshotLayoutEngine {
    static type = "spiral";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = spiralLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 80;
    protected readonly dimensions: 2 | 3;
    config: SpiralLayoutConfigType;

    /**
     * Create a spiral layout engine
     * @param opts - Configuration options including resolution and equidistant spacing
     */
    constructor(opts: SpiralLayoutOpts) {
        super(opts);
        this.config = SpiralLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Get dimension-specific options for spiral layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter or null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Spiral layout only supports 2D
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
     * Compute node positions along a spiral path
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            spiral(input.graph, {
                scale: this.config.scale,
                center: this.config.center ?? undefined,
                dim: layoutDim(this.config.dim),
                resolution: this.config.resolution,
                equidistant: this.config.equidistant,
            }),
            SpiralLayout.scale,
        );
    }
}
