/**
 * @file The spring-electrical layout: ngraph's force model, computed on an accelerator.
 *
 * It is registered whatever hardware is present, and `setLayout("spring-electrical")` without an
 * accelerator that implements it fails loudly with `E_NO_ACCELERATOR` rather than quietly
 * arranging the graph some other way. A picker does not have to try it to find out: the layout
 * catalogue's entry for this engine declares `requires: { accelerator: true }`, which a consumer
 * reads beside `capabilities.acceleration.state` and greys the entry out.
 */

import type { SimulationType } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimulationLayoutEngine } from "./SimulationLayoutEngine";

/**
 * The published options, in ngraph's vocabulary and with ngraph's defaults, which is what a reader
 * who has tuned an ngraph force layout before already knows.
 */
const springElectricalLayoutOptionsSchema = defineOptions({
    springLength: {
        schema: z.number().positive().default(10),
        meta: {
            label: "Spring Length",
            description: "The distance an edge pulls its two nodes towards",
            step: 1,
        },
    },
    springCoefficient: {
        schema: z.number().positive().default(0.8),
        meta: {
            label: "Spring Strength",
            description: "How hard an edge pulls; Hooke's constant",
            step: 0.1,
        },
    },
    gravity: {
        schema: z.number().default(-12),
        meta: {
            label: "Repulsion",
            description: "How hard two nodes push each other apart; negative repels",
            step: 1,
        },
    },
    dragCoefficient: {
        schema: z.number().positive().default(0.9),
        meta: {
            label: "Drag",
            description: "How quickly motion bleeds away, which is what lets the shape settle",
            step: 0.05,
            advanced: true,
        },
    },
    timeStep: {
        schema: z.number().positive().default(0.5),
        meta: {
            label: "Time Step",
            description: "How far one iteration integrates; larger is faster and less stable",
            step: 0.1,
            advanced: true,
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
        schema: z.number().nullable().default(null),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible layout",
            advanced: true,
        },
    },
});

/**
 * The spring-electrical engine, as the element declares it.
 *
 * Every member is a static the element reads: `LayoutManager` builds the bridge itself, with the
 * graph's acceleration controller, so this class never runs a layout of its own. It declares no
 * `static descriptor` because its arrangement is authored in the layout catalogue, where it sits
 * under `force` beside ngraph, d3, ForceAtlas2, Spring and Kamada-Kawai.
 */
export class SpringElectricalLayout extends SimulationLayoutEngine {
    static type = "spring-electrical";
    static simulationType: SimulationType = "spring-electrical";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = springElectricalLayoutOptionsSchema;

    /**
     * Get dimension-specific options for the spring-electrical layout.
     * @param dimension - The desired dimension (2 or 3).
     * @returns Options object with dim parameter.
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }
}
