/**
 * @file The ForceAtlas2 layout: the Gephi arrangement, computed on the CPU or on an accelerator.
 *
 * It used to be a one-shot pass -- run `forceatlas2Layout` over a node and edge list, publish the
 * answer, stop -- which is why the catalogue called it a batch layout. It is now a steppable
 * simulation from `@graphty/layout`, so it keeps running until the arrangement settles and reheats
 * on a drag or a pin, and the element decides at every load whether the simulation is the CPU's or
 * the accelerator's.
 */

import type { SimulationType } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimulationLayoutEngine } from "./SimulationLayoutEngine";

/**
 * Zod-based options schema for ForceAtlas2 Layout
 */
const forceAtlas2LayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    maxIter: {
        schema: z.number().int().positive().default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum number of simulation iterations",
        },
    },
    jitterTolerance: {
        schema: z.number().positive().default(1.0),
        meta: {
            label: "Jitter Tolerance",
            description: "Tolerance for position jitter",
            step: 0.1,
            advanced: true,
        },
    },
    scalingRatio: {
        schema: z.number().positive().default(2.0),
        meta: {
            label: "Scaling Ratio",
            description: "Ratio for force scaling",
            step: 0.1,
        },
    },
    gravity: {
        // NONNEGATIVE, not positive: zero gravity is a legal ForceAtlas2 setting -- nothing pulls
        // the graph towards the centre and the components drift apart -- and it is what the
        // Storybook slider has always offered as its lowest value.
        schema: z.number().nonnegative().default(1.0),
        meta: {
            label: "Gravity",
            description: "Strength of center gravity",
            step: 0.1,
        },
    },
    distributedAction: {
        schema: z.boolean().default(false),
        meta: {
            label: "Distributed Action",
            description: "Use distributed attraction for hubs",
            advanced: true,
        },
    },
    strongGravity: {
        schema: z.boolean().default(false),
        meta: {
            label: "Strong Gravity",
            description: "Use stronger gravity to prevent escape",
            advanced: true,
        },
    },
    dissuadeHubs: {
        schema: z.boolean().default(false),
        meta: {
            label: "Dissuade Hubs",
            description: "Push hubs away from each other",
            advanced: true,
        },
    },
    linlog: {
        schema: z.boolean().default(false),
        meta: {
            label: "LinLog Mode",
            description: "Use logarithmic attraction",
            advanced: true,
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
    dim: {
        schema: z.number().int().min(2).max(3).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    weighted: {
        schema: z.boolean().default(true),
        meta: {
            label: "Use Edge Weights",
            description: "Pull strongly connected nodes closer together",
        },
    },
    nodeMass: {
        schema: z.record(z.string(), z.number()).or(z.string()).or(z.null()).default(null),
        meta: {
            label: "Node Mass",
            description:
                "How hard each node is to move, in one of three forms: a mass per node id, the " +
                "name of a numeric node attribute to read it from, or nothing at all -- which " +
                "gives every node a mass of one more than its degree, so a hub holds its ground.",
            advanced: true,
        },
    },
});

/**
 * The ForceAtlas2 engine, as the element declares it.
 *
 * Every member is a static the element reads: `LayoutManager` builds the bridge itself, with the
 * graph's acceleration controller, so this class never runs a layout of its own. It declares no
 * `static descriptor` because its arrangement is authored in the layout catalogue, where it sits
 * under `force`.
 */
export class ForceAtlas2Layout extends SimulationLayoutEngine {
    static type = "forceatlas2";
    static simulationType: SimulationType = "forceatlas2";
    static maxDimensions = 3;

    /**
     * A WEIGHT IS AN ATTRACTION STRENGTH HERE, and is passed through as it is stored: a heavier
     * edge pulls its two nodes closer, which is what a weight means everywhere else in the
     * element. Kamada-Kawai reads the very same number as a distance and therefore inverts it; the
     * two engines disagree about the arithmetic so that they agree about the meaning.
     */
    static override honoursWeights = true;
    static zodOptionsSchema: OptionsSchema = forceAtlas2LayoutOptionsSchema;

    /**
     * Get dimension-specific options for ForceAtlas2 layout.
     * @param dimension - The desired dimension (2 or 3).
     * @returns Options object with dim parameter.
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }
}
