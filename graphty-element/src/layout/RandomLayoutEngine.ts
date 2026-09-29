import type { F32 } from "@graphty/graph-format";
import { random } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * The seed used when none is given. The element recommends this layout for large graphs as "the
 * same every time", and a consumer applies it by name alone, so the default must be fixed rather
 * than drawn from `Math.random()` on every load.
 */
const DEFAULT_SEED = 1;

/**
 * Zod-based options schema for Random Layout
 */
const randomLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    dim: {
        schema: z.number().int().min(2).max(3).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    seed: {
        schema: z.number().positive().nullable().default(DEFAULT_SEED),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible random positions",
            advanced: true,
        },
    },
});

const RandomLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(2),
    seed: z.number().positive().or(z.null()).default(DEFAULT_SEED),
});
type RandomLayoutConfigType = z.infer<typeof RandomLayoutConfig>;
type RandomLayoutOpts = Partial<RandomLayoutConfigType>;

/**
 * Random layout engine that places nodes at random positions
 */
export class RandomLayout extends SnapshotLayoutEngine {
    static type = "random";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = randomLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 100;
    protected readonly dimensions: 2 | 3;
    config: RandomLayoutConfigType;

    /**
     * Create a random layout engine
     * @param opts - Configuration options including dimensions and seed
     */
    constructor(opts: RandomLayoutOpts) {
        super(opts);
        this.config = RandomLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Get dimension-specific options for random layout
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
     * Compute random node positions
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            random(input.graph, {
            center: this.config.center ?? undefined,
            dim: layoutDim(this.config.dim),
            seed: this.config.seed,
        }),
            RandomLayout.scale,
        );
    }
}
