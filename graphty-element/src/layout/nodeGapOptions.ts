/**
 * @file The `nodeGap` and `nodeGapFront` options, one declaration for every force layout that offers them.
 */

import { z } from "zod";

/** Keeps nodes apart by their drawn size; see docs/guide/layouts.md. */
export const nodeGapOption = {
    schema: z.number().min(0).nullable().default(null),
    meta: {
        label: "Node Gap",
        description:
            "Keep at least this much space between two nodes' drawn surfaces, measured from each " +
            "node's drawn size. Unset (null), nodes may be drawn over each other",
        step: 0.5,
        advanced: true,
    },
};

/** Measures {@link nodeGapOption} across x and y. */
export const nodeGapFrontOption = {
    schema: z.boolean().default(false),
    meta: {
        label: "Node Gap From the Front",
        description:
            "In 3D, measure Node Gap as seen from the front (across x and y, not depth), so no node " +
            "is drawn over another in the starting view even when one is behind the other",
        advanced: true,
    },
};
