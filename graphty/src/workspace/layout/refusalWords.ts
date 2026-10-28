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
        case "layout.needs-location":
            return MISSING_LOCATION_WORDS[String(params.missing)] ?? MISSING_LOCATION_WORDS.location;
        default:
            return "Cannot run on this graph";
    }
}

/** What the location map is missing, by the role the element names. */
const MISSING_LOCATION_WORDS: Readonly<Record<string, string>> = {
    location: "No location columns",
    latitude: "No latitude column",
    longitude: "No longitude column",
};

/**
 * Why a layout the reader applied refused to run, when the element's error carries a refusal it
 * codes or says its code could not be loaded, or null for any other failure.
 * @param error - what `layout.set` rejected with.
 * @returns the words, or null.
 */
export function layoutErrorWords(error: unknown): string | null {
    const failure = error as {
        code?: unknown;
        details?: { refusal?: { code?: unknown; params?: { missing?: unknown } } };
    } | null;
    // The layout's code could not be fetched: usually a page older than the site it came from.
    if (failure?.code === "E_FETCH_FAILED") {
        return "The layout could not be loaded, so the drawing is unchanged. Reload the page to try again";
    }
    const details = failure?.details;
    if (details?.refusal?.code !== "layout.needs-location") {
        return null;
    }
    return MISSING_LOCATION_WORDS[String(details.refusal.params?.missing)] ?? MISSING_LOCATION_WORDS.location;
}

/** The location warnings the Latitude and Longitude fields show. */
const LOCATION_FIELD_CODES: ReadonlySet<string> = new Set([
    "W_LOCATION_UNPARSED",
    "W_LOCATION_OUT_OF_RANGE",
    "W_LOCATION_AMBIGUOUS",
    "W_LOCATION_SWAPPED",
]);

/**
 * How many nodes a location warning leaves off the map, out of how many.
 * @param params - the warning's values.
 * @returns the count and the whole.
 */
function unplacedOf(params: Readonly<Record<string, unknown>>): { unplaced: number; total: number } {
    const unplaced =
        typeof params.unplaced === "number"
            ? params.unplaced
            : Number(params.missing ?? 0) + Number(params.unparsed ?? 0) + Number(params.count ?? 0);
    return { unplaced, total: Number(params.total ?? 0) };
}

/**
 * The location map's notice: how many nodes it left off the map, out of how many, from either
 * warning that counts them. Null for any other warning.
 * @param code - the element's warning code.
 * @param params - its values.
 * @returns the notice's message, or null.
 */
export function layoutWarningWords(code: string, params: Readonly<Record<string, unknown>>): string | null {
    if (code !== "W_LOCATION_UNPARSED" && code !== "W_LOCATION_OUT_OF_RANGE") {
        return null;
    }
    const { unplaced, total } = unplacedOf(params);
    return `${unplaced.toLocaleString()} of ${total.toLocaleString()} nodes unplaced`;
}

/**
 * A location warning as the short line under the Latitude and Longitude fields, or null for a
 * warning that is not about reading locations.
 * @param code - the element's warning code.
 * @param params - its values.
 * @returns the line, or null.
 */
export function locationFieldWords(code: string, params: Readonly<Record<string, unknown>>): string | null {
    if (!LOCATION_FIELD_CODES.has(code)) {
        return null;
    }
    switch (code) {
        case "W_LOCATION_OUT_OF_RANGE":
            return `${Number(params.count ?? 0).toLocaleString()} out of range`;
        case "W_LOCATION_AMBIGUOUS":
            return "May be longitude first: check Format";
        case "W_LOCATION_SWAPPED":
            return "Read longitude first";
        default: {
            const unread = Number(params.missing ?? 0) + Number(params.unparsed ?? 0);
            return `${unread.toLocaleString()} unreadable or empty`;
        }
    }
}

/**
 * Why a column does not fit a location option, as its list entry's note.
 * @param refusal - the element's refusal of the column, or undefined.
 * @param refusal.code - its code.
 * @returns the note, or null for a column that fits.
 */
export function columnFitWords(refusal: { readonly code: string } | undefined): string | null {
    return refusal === undefined ? null : "Not a location";
}

/**
 * Why a layout option is disabled in this view, from the element's coded answer.
 * @param code - the element's code.
 * @returns the reason, or null when the option is in effect.
 */
export function optionEffectWords(code: string): string | null {
    return code === "setting.notIn2d" ? "Not in 2D" : null;
}
