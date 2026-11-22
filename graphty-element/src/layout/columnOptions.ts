/**
 * @file The options the two column layouts (bipartite and multipartite) share.
 */

import { z } from "zod";

import type { OptionsSchema } from "../config";

const alignSchema = z.enum(["vertical", "horizontal"]).default("vertical");
const scaleSchema = z.number().positive().default(1);
const aspectRatioSchema = z
    .number()
    .positive()
    .default(4 / 3);

/**
 * The align, scale and aspectRatio entries of a column layout's options schema.
 * @param alignDescription - what the align option's description says
 * @param aspectRatioDescription - what the aspectRatio option's description says
 * @returns the option entries, to spread into defineOptions
 */
export function columnLayoutOptions(alignDescription: string, aspectRatioDescription: string): OptionsSchema {
    return {
        align: {
            schema: alignSchema,
            meta: { label: "Alignment", description: alignDescription },
        },
        scale: {
            schema: scaleSchema,
            meta: { label: "Scale", description: "Scale factor for the layout", step: 0.1 },
        },
        aspectRatio: {
            schema: aspectRatioSchema,
            meta: { label: "Aspect Ratio", description: aspectRatioDescription, step: 0.1 },
        },
    };
}

/** The align, scale, center and aspectRatio fields of a column layout's parsed configuration. */
export const columnLayoutConfigShape = {
    align: alignSchema,
    scale: scaleSchema,
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    aspectRatio: aspectRatioSchema,
};
