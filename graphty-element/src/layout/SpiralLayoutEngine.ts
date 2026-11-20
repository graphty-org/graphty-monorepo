import type { F32 } from "@graphty/graph-format";
import { spiral } from "@graphty/layout";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import { centeredLayoutConfigShape, layoutDim } from "./LayoutEngine";
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
            advanced: true,
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
        schema: z.number().int().min(2).max(3).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality: 2D, or 3D for a spiral rising into a cone",
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
    height: {
        schema: z.number().default(1),
        meta: {
            label: "Height",
            description: "In 3D, how far the spiral rises per unit of radius; 0 lies flat",
            step: 0.1,
            advanced: true,
        },
    },
});

const SpiralLayoutConfig = z.strictObject({
    ...centeredLayoutConfigShape,
    resolution: z.number().positive().default(0.35),
    equidistant: z.boolean().default(false),
    height: z.number().default(1),
});
type SpiralLayoutConfigType = z.infer<typeof SpiralLayoutConfig>;
type SpiralLayoutOpts = Partial<SpiralLayoutConfigType>;

/**
 * Spiral layout engine that arranges nodes along a spiral path
 */
export class SpiralLayout extends SnapshotLayoutEngine {
    static readonly type: string = "spiral";
    static readonly maxDimensions: number = 3;
    static readonly zodOptionsSchema: OptionsSchema = spiralLayoutOptionsSchema;
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
                height: this.config.height,
            }),
            this.config.scalingFactor,
        );
    }
}
