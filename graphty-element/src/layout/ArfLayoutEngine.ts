import type { F32 } from "@graphty/graph-format";
import { arf } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput, startFrom } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for ARF Layout
 */
const arfLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    scaling: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scaling",
            description: "Scale factor for the attractive force",
            step: 0.1,
        },
    },
    a: {
        schema: z.number().positive().default(1.1),
        meta: {
            label: "Attraction Ratio",
            description: "Ratio of attraction to repulsion",
            step: 0.1,
            advanced: true,
        },
    },
    maxIter: {
        schema: z.number().int().positive().default(1000),
        meta: {
            label: "Max Iterations",
            description: "Maximum number of iterations",
        },
    },
    seed: {
        schema: z.number().positive().nullable().default(null),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible layout",
            advanced: true,
        },
    },
});

const ArfLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    pos: z.record(z.number(), z.array(z.number())).or(z.null()).default(null),
    scaling: z.number().positive().default(1),
    a: z.number().positive().default(1.1),
    maxIter: z.number().positive().default(1000),
    seed: z.number().positive().or(z.null()).default(null),
});
type ArfLayoutConfigType = z.infer<typeof ArfLayoutConfig>;
type ArfLayoutOpts = Partial<ArfLayoutConfigType>;

/**
 * ARF (Attractive-Repulsive Force) layout engine for 2D graph visualization
 */
export class ArfLayout extends SnapshotLayoutEngine {
    static type = "arf";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = arfLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 100;
    protected readonly dimensions: 2 | 3;
    config: ArfLayoutConfigType;

    /**
     * Create an ARF layout engine
     * @param opts - Configuration options for the ARF algorithm
     */
    constructor(opts: ArfLayoutOpts) {
        super(opts);
        this.config = ArfLayoutConfig.parse(opts);
        this.dimensions = 2;
    }

    /**
     * Get dimension-specific options for ARF layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Arf only supports 2D
        if (dimension > this.maxDimensions) {
            return null;
        }

        // Arf doesn't use 'dim' parameter
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
     * Compute node positions using the ARF algorithm
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            arf(input.graph, {
                pos: startFrom(input, 2, ArfLayout.scale) ?? this.rowsOfRecord(this.config.pos, 2),
                scaling: this.config.scaling,
                a: this.config.a,
                maxIter: this.config.maxIter,
                seed: this.config.seed,
            }),
            ArfLayout.scale,
        );
    }
}
