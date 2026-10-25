/**
 * The app's words for why a layout cannot run. graphty-element reports a refused layout as a code
 * and its values (`CostEstimate.refusal`); the app writes the sentence, naming a grouping made by
 * a run by the run's name and an algorithm by the app's name for it.
 */

import type { CostEstimate, GraphSession } from "@graphty/graphty-element/session";

import { wordsFor } from "../analyze/words";
import { runName } from "../runWords";

/** The algorithm the app points a reader to when a layout needs groups and none exist. */
const GROUPING_ALGORITHM = "louvain";

/**
 * What a grouping is called: the run's name when a run made it, else the column's own name.
 * @param session - the element's session.
 * @param params - the refusal's values.
 * @returns the name.
 */
function groupingName(session: GraphSession, params: Readonly<Record<string, unknown>>): string {
    const run = typeof params.run === "string" ? session.runs.get(params.run) : undefined;
    return run === undefined ? String(params.attribute) : runName(session, run);
}

/**
 * The app's name for the algorithm that finds groups.
 * @param session - the element's session.
 * @returns the name.
 */
function groupingAlgorithmName(session: GraphSession): string {
    const descriptor = session.catalog.algorithms().find((algorithm) => algorithm.key === GROUPING_ALGORITHM);
    return descriptor === undefined ? "a community algorithm" : wordsFor(descriptor).name;
}

/**
 * Why a layout cannot run, in the app's words.
 * @param session - the element's session.
 * @param estimate - the element's estimate of the layout, unavailable.
 * @returns the sentence.
 */
export function layoutRefusalWords(session: GraphSession, estimate: CostEstimate): string {
    const params = estimate.refusal?.params ?? {};
    switch (estimate.refusal?.code) {
        case "layout.not-planar":
            return "Some edges of this graph must cross, so it cannot be drawn without crossings";
        case "layout.needs-node":
            return "Select a node first";
        case "layout.node-missing":
            return `The node ${String(params.node)} is not in this graph`;
        case "layout.needs-grouping":
            return `Needs groups: run ${groupingAlgorithmName(session)} in Analyze first`;
        case "layout.grouping-absent":
            return `No node has a value for ${groupingName(session, params)}`;
        case "layout.needs-two-groups":
            return `Needs exactly two groups; ${groupingName(session, params)} has ${String(params.groups)}`;
        case "layout.needs-accelerator":
            return "Needs hardware acceleration, which this browser does not offer";
        default:
            return "Cannot run on this graph";
    }
}
