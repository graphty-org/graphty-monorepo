/**
 * @file The field lists each result shape publishes.
 *
 * A shape fixes the names -- `group` and `groupSize` on a community, `onPath` and `order` on a
 * route, `in` on a set -- and the catalogue states what those names are called in words. These
 * builders state which of them a run filled, so the two halves of the same fact are written once
 * each and a test can hold them against one another.
 */

import type { ResultFieldSpec } from "./types";

/**
 * The fields a metric result publishes: the value the algorithm measured, and the ranking and
 * range the element derives from that column.
 * @param kind - Whether the metric is measured per node or per edge.
 * @param valueType - What the measured value is: a real number, or a whole one such as a count
 *   or a position.
 * @returns The field list.
 */
export function metricFieldSpecs(
    kind: "node" | "edge",
    valueType: "number" | "integer" = "number",
): readonly ResultFieldSpec[] {
    return [
        { name: "value", kind, type: valueType },
        { name: "rank", kind, type: "integer" },
        { name: "percentile", kind, type: "number" },
        { name: "min", kind: "graph", type: "number" },
        { name: "max", kind: "graph", type: "number" },
        { name: "median", kind: "graph", type: "number" },
        { name: "mean", kind: "graph", type: "number" },
        { name: "measured", kind: "graph", type: "integer" },
        { name: "normalization", kind: "graph", type: "string" },
        { name: "tiedAtMin", kind: "graph", type: "integer" },
    ];
}

/** The fields a community result publishes, with the group sizes the element derives. */
const COMMUNITY_BASE: readonly ResultFieldSpec[] = [
    { name: "group", kind: "node", type: "integer" },
    { name: "groupSize", kind: "node", type: "integer" },
    { name: "groupCount", kind: "graph", type: "integer" },
    { name: "sizes", kind: "graph", type: "table" },
];

/**
 * The fields a community result publishes.
 * @param withModularity - Whether this method scores its own partition. Only a method that does
 *   may publish modularity; a number invented to fill a table is worse than a missing one.
 * @returns The field list.
 */
export function communityFieldSpecs(withModularity: boolean): readonly ResultFieldSpec[] {
    return withModularity
        ? [...COMMUNITY_BASE, { name: "modularity", kind: "graph", type: "number" }]
        : COMMUNITY_BASE;
}

/** The fields a layered grouping publishes, with the level sizes the element derives. */
export const LAYERED_GROUPING_FIELD_SPECS: readonly ResultFieldSpec[] = [
    { name: "level", kind: "node", type: "integer" },
    { name: "levelSize", kind: "node", type: "integer" },
    { name: "levelCount", kind: "graph", type: "integer" },
    { name: "sizes", kind: "graph", type: "table" },
];

/** The fields a route publishes: membership and position per element, and the route's size. */
export const PATH_FIELD_SPECS: readonly ResultFieldSpec[] = [
    { name: "onPath", kind: "node", type: "boolean" },
    { name: "order", kind: "node", type: "integer" },
    { name: "onPath", kind: "edge", type: "boolean" },
    { name: "length", kind: "graph", type: "integer" },
    { name: "cost", kind: "graph", type: "number" },
    { name: "hops", kind: "graph", type: "integer" },
];

/**
 * The fields a set publishes: membership per element, the count, and the one number the set is
 * actually read for.
 * @param kind - Whether the set is a set of nodes or of edges.
 * @param headline - The graph-level scalar of the algorithm's own naming.
 * @returns The field list.
 */
export function setFieldSpecs(
    kind: "node" | "edge",
    headline: Omit<ResultFieldSpec, "kind">,
): readonly ResultFieldSpec[] {
    return [
        { name: "in", kind, type: "boolean" },
        { name: "count", kind: "graph", type: "integer" },
        { ...headline, kind: "graph" },
    ];
}
