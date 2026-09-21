/**
 * @file The field list a node-metric result publishes.
 *
 * The names are fixed by the result's SHAPE rather than by the algorithm -- `results.<run>.value`
 * means the same thing for every metric -- so they are built here once instead of being written
 * out by each algorithm. `test/algorithms/metrics/catalog-agreement.test.ts` asserts that what an
 * algorithm publishes is exactly what the catalogue declares for it, which is what keeps a
 * consumer's options form, the cost gate and the running code describing one thing.
 *
 * The catalogue cannot be imported from here: `src/catalog/algorithms.ts` imports every algorithm
 * class, so reading its private builder back out would be a cycle evaluated while the classes are
 * still being defined.
 */

import type { FieldDescriptor } from "../../catalog/types";
import { RESULT_PATH_RUN_PLACEHOLDER, RESULT_ROOT } from "../../session/results";

/** The root a static field path is written against, with `$` standing for the run id. */
const STATIC_RESULT_ROOT = `${RESULT_ROOT}.${RESULT_PATH_RUN_PLACEHOLDER}`;

/**
 * Add the published path to a field, so no caller spells one out by hand.
 * @param spec - Everything about the field except its path.
 * @returns The field with its path filled in.
 */
export function metricField(spec: Omit<FieldDescriptor, "path">): FieldDescriptor {
    return { ...spec, path: `${STATIC_RESULT_ROOT}.${spec.name}` };
}

/** What one metric's primary value is called. */
interface MetricValueName {
    /** What a reader who has never heard of the algorithm calls the number. */
    readonly plainName: string;
    /** What a paper calls it. */
    readonly technicalName: string;
    /** The value's type. Defaults to "number". */
    readonly type?: "number" | "integer";
}

/**
 * Build the fields every node-metric result publishes.
 *
 * The per-element trio and the seven graph-level statistics are what the shape promises, and an
 * algorithm that measures something extra appends its own fields after these rather than
 * replacing any of them.
 * @param value - What this metric's primary value is called.
 * @returns The uniform field list for the node-metric shape.
 */
export function nodeMetricFields(value: MetricValueName): readonly FieldDescriptor[] {
    return [
        metricField({
            name: "value",
            plainName: value.plainName,
            technicalName: value.technicalName,
            kind: "node",
            type: value.type ?? "number",
        }),
        metricField({ name: "rank", plainName: "Rank", technicalName: "rank", kind: "node", type: "integer" }),
        metricField({
            name: "percentile",
            plainName: "Percentile",
            technicalName: "percentile",
            kind: "node",
            type: "number",
        }),
        metricField({ name: "min", plainName: "Lowest", technicalName: "min", kind: "graph", type: "number" }),
        metricField({ name: "max", plainName: "Highest", technicalName: "max", kind: "graph", type: "number" }),
        metricField({ name: "median", plainName: "Middle", technicalName: "median", kind: "graph", type: "number" }),
        metricField({ name: "mean", plainName: "Average", technicalName: "mean", kind: "graph", type: "number" }),
        metricField({
            name: "measured",
            plainName: "Measured",
            technicalName: "measured",
            kind: "graph",
            type: "integer",
        }),
        metricField({
            name: "normalization",
            plainName: "Normalization",
            technicalName: "normalization",
            kind: "graph",
            type: "string",
        }),
        metricField({
            name: "tiedAtMin",
            plainName: "Tied at the lowest value",
            technicalName: "tiedAtMin",
            kind: "graph",
            type: "integer",
        }),
    ];
}
