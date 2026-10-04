/**
 * The inspector's words. graphty-element hands over codes and numbers; what a reader reads is
 * the app's, and lives here.
 */

import type {
    Channel,
    GraphStatistics,
    GraphtyErrorCode,
    Measurement,
    SummaryGroup,
} from "@graphty/graphty-element/session";

import type { InspectedKindId } from "./inspected";

/** The kind word on the header's second line (tier1-design.md section 2.7). */
export const KIND_WORDS: Readonly<Record<InspectedKindId, string>> = {
    graph: "Graph",
    node: "Node",
    edge: "Edge",
    several: "Selection",
    neighborhood: "Neighborhood",
    "measure-row": "Measure",
    "run-row": "Groups",
    "group-row": "Group",
    "everything-row": "Everything",
    "selection-row": "Selection",
    attribute: "Attribute",
};

/**
 * The property token Why this look shows for each channel. Two channels may share one word. Every
 * channel has one, so a channel the element adds fails to compile here instead of reaching the
 * reader as a code.
 */
const CHANNEL_WORDS: Readonly<Record<Channel, string>> = {
    "node.color": "Color",
    "node.size": "Size",
    "node.shape": "Shape",
    "node.label": "Label",
    "node.labelStyle": "Label",
    "node.tooltip": "Tooltip",
    "node.tooltipStyle": "Tooltip",
    "node.opacity": "Opacity",
    "node.outline": "Outline",
    "node.glow": "Glow",
    "node.glowStrength": "Glow",
    "node.wireframe": "Wireframe",
    "node.flat": "Flat",
    "node.marker": "Marker",
    "edge.color": "Color",
    "edge.width": "Width",
    "edge.opacity": "Opacity",
    "edge.style": "Line",
    "edge.patternCount": "Line",
    "edge.curvature": "Curve",
    "edge.arrowHead": "Arrow",
    "edge.arrowHeadSize": "Arrow",
    "edge.arrowHeadColor": "Arrow",
    "edge.arrowHeadOpacity": "Arrow",
    "edge.arrowHeadText": "Arrow",
    "edge.arrowHeadTextStyle": "Arrow",
    "edge.arrowTail": "Arrow",
    "edge.arrowTailSize": "Arrow",
    "edge.arrowTailColor": "Arrow",
    "edge.arrowTailOpacity": "Arrow",
    "edge.arrowTailText": "Arrow",
    "edge.arrowTailTextStyle": "Arrow",
    "edge.animationSpeed": "Motion",
    "edge.label": "Label",
    "edge.labelStyle": "Label",
};

/**
 * The tokens for the channels a layer won, each word once, in the order given.
 * @param channels - the channels.
 * @returns the words.
 */
export function channelTokens(channels: readonly Channel[]): string[] {
    return [...new Set(channels.map((channel) => CHANNEL_WORDS[channel]))];
}

const NUMBER = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });
/** Counts are exact: 12,345 nodes, never 12,350. */
const COUNT = new Intl.NumberFormat();

/**
 * A number as a reader reads it: four significant digits, grouped.
 * @param value - the number.
 * @returns the text.
 */
export function formatNumber(value: number): string {
    return NUMBER.format(value);
}

/**
 * The graph's direction and where it was settled ("Undirected, from the file: digraph").
 * @param statistics - the element's statistics.
 * @returns the words.
 */
export function directionWords(statistics: GraphStatistics): string {
    const word = {
        directed: "Directed",
        undirected: "Undirected",
        mixed: "Mixed",
        unknown: "Not settled",
    }[statistics.directedness];
    const { by, statedBy } = statistics.directednessSource;
    if (by === "file" && statedBy !== null) {
        return `${word}, from the file: ${statedBy}`;
    }
    if (by === "configuration") {
        return `${word}, set in the project`;
    }
    return word;
}

/**
 * A count of things, with the noun made plural when it needs to be ("1 node", "7 nodes").
 * @param count - how many.
 * @param noun - the singular noun.
 * @returns the words.
 */
export function count(count: number, noun: string): string {
    return `${COUNT.format(count)} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * A value from the data, as text: numbers formatted, everything else as given.
 * @param value - the value.
 * @returns the text.
 */
export function valueText(value: unknown): string {
    if (typeof value === "number") {
        return formatNumber(value);
    }
    if (typeof value === "string") {
        return value;
    }
    return JSON.stringify(value);
}

/**
 * When a run started, as a short date ("Oct 3").
 * @param iso - the run's `startedAt`.
 * @returns the date, or null when it never started.
 */
export function runDate(iso: string | null): string | null {
    if (iso === null) {
        return null;
    }
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The named members of an open string union, without its `string & {}` catch-all. */
type Named<T> = T extends string ? (string extends T ? never : T) : never;

/**
 * The role tag for each measurement graphty-element names, so a name it adds fails to compile
 * here; a measurement outside its names (the union is open) shows no tag rather than a code.
 */
const MEASUREMENT_WORDS: Readonly<Record<Named<Measurement>, string>> = {
    categorical: "Groups",
    ordinal: "Ordered",
    quantitative: "Amount",
    time: "Time",
};

/**
 * The role tag for a column's measurement.
 * @param measurement - the element's measurement.
 * @returns the word, or undefined for a measurement the app has no word for.
 */
export function measurementWord(measurement: Measurement): string | undefined {
    return Object.hasOwn(MEASUREMENT_WORDS, measurement)
        ? MEASUREMENT_WORDS[measurement as Named<Measurement>]
        : undefined;
}

/** Why a run failed, in the app's words, for the codes a run can fail with. */
const RUN_FAILURE_WORDS: Partial<Readonly<Record<GraphtyErrorCode, string>>> = {
    E_TOO_LARGE: "the graph is too large for this analysis",
    E_OUT_OF_MEMORY: "it ran out of memory",
    E_CAP_EXCEEDED: "it passed its size limit",
    E_SCOPE_EMPTY: "there was nothing to analyze",
    E_NOT_CONVERGED: "it did not settle on an answer",
    E_OPTION_RANGE: "a setting is out of range",
    E_UNKNOWN_OPTION: "a setting is not one this analysis has",
    E_UNKNOWN_ALGORITHM: "this analysis is not available",
    E_NO_ACCELERATOR: "the graphics card could not run it",
    E_NO_WEBGPU: "the graphics card could not run it",
    E_NO_ADAPTER: "the graphics card could not run it",
    E_SOFTWARE_ONLY: "the graphics card could not run it",
    E_DEVICE_INCORRECT: "the graphics card gave a wrong answer",
    E_DEVICE_LOST: "the graphics card stopped during the run",
    E_UNSUPPORTED: "this analysis cannot run here",
};

/**
 * The state bar's words for a failed run.
 * @param code - the element's error code, or undefined.
 * @returns the words; never the code itself.
 */
export function runFailureWords(code: GraphtyErrorCode | undefined): string {
    const reason = code === undefined ? undefined : RUN_FAILURE_WORDS[code];
    return reason === undefined ? "The run failed" : `The run failed: ${reason}`;
}

const ORDINAL = new Intl.PluralRules("en-US", { type: "ordinal" });
const ORDINAL_SUFFIX: Readonly<Record<Intl.LDMLPluralRule, string>> = {
    zero: "th",
    one: "st",
    two: "nd",
    few: "rd",
    many: "th",
    other: "th",
};

/**
 * The state bar's words for a run waiting its turn ("Queued, 2nd").
 * @param position - the element's queue position, counting from 0.
 * @returns the words.
 */
export function queuedWords(position: number | null): string {
    if (position === null) {
        return "Queued";
    }
    const place = position + 1;
    return `Queued, ${String(place)}${ORDINAL_SUFFIX[ORDINAL.select(place)]}`;
}

/**
 * What to call a group: "Group 1" for the largest group of a partition (the element ranks them),
 * else the group's own value (a category).
 * @param group - the group.
 * @returns the name.
 */
export function groupName(group: SummaryGroup): string {
    return group.rank === undefined ? String(group.group) : `Group ${String(group.rank)}`;
}
