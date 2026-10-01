/**
 * @file The Spring layout: Fruchterman-Reingold, computed on the CPU or on an accelerator.
 *
 * It used to be a one-shot pass -- run `springLayout` over a node and edge list, publish the
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
 * Zod-based options schema for Spring Layout
 */
const springLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    k: {
        schema: z.number().nullable().default(null),
        meta: {
            label: "Spring Constant",
            description: "Optimal distance between nodes (auto-calculated if null)",
            advanced: true,
        },
    },
    iterations: {
        schema: z.number().positive().default(50),
        meta: {
            label: "Iterations",
            description: "Number of spring simulation iterations",
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
    dim: {
        schema: z.number().int().min(2).max(3).default(3),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
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

/**
 * The Spring engine, as the element declares it.
 *
 * Every member is a static the element reads: `LayoutManager` builds the bridge itself, with the
 * graph's acceleration controller, so this class never runs a layout of its own. It declares no
 * `static descriptor` because its arrangement is authored in the layout catalogue, where it sits
 * under `force`.
 */
export class SpringLayout extends SimulationLayoutEngine {
    static type = "spring";
    static simulationType: SimulationType = "spring";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = springLayoutOptionsSchema;

    /**
     * Get dimension-specific options for spring layout.
     * @param dimension - The desired dimension (2 or 3).
     * @returns Options object with dim parameter.
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }
}
