import type { F32 } from "@graphty/graph-format";
import { spectral } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for Spectral Layout
 */
const spectralLayoutOptionsSchema = defineOptions({
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
            description: "Scale factor for the spectral layout",
            step: 0.1,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(2).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D only for spectral)",
        },
    },
});

const SpectralLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    dim: z.number().default(2),
});
type SpectralLayoutConfigType = z.infer<typeof SpectralLayoutConfig>;
type SpectralLayoutOpts = Partial<SpectralLayoutConfigType>;

/**
 * Spectral layout engine using graph Laplacian eigenvectors
 */
export class SpectralLayout extends SnapshotLayoutEngine {
    static type = "spectral";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = spectralLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 100;
    protected readonly dimensions: 2 | 3;
    config: SpectralLayoutConfigType;

    /**
     * Create a spectral layout engine
     * @param opts - Configuration options including scale and center
     */
    constructor(opts: SpectralLayoutOpts) {
        super(opts);
        this.config = SpectralLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Get dimension-specific options for spectral layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter or null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Spectral layout only supports 2D
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
     * Compute node positions using spectral graph theory
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            spectral(input.graph, {
                scale: this.config.scale,
                center: this.config.center ?? undefined,
                dim: layoutDim(this.config.dim),
            }),
            SpectralLayout.scale,
        );
    }
}
