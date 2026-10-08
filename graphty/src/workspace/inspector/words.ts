/**
 * The inspector's words. graphty-element hands over codes and numbers; what a reader reads is
 * the app's, and lives here.
 */

import type {
    Channel,
    EdgeRecord,
    GraphSession,
    GraphStatistics,
    GraphtyErrorCode,
    Measurement,
    StaleNote,
    SummaryGroup,
    XrCapability,
    XrUnavailableReason,
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
    "layer-row": "Layer",
    attribute: "Attribute",
    "filter-step": "Filter step",
    source: "Source",
};

/** The kind word of a path run's row, which is a measure row by shape but not a measure to a reader. */
export const PATH_WORD = "Path";

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
 * The graph's direction and who settled it ("Undirected, from the file"). The file's own
 * statement (GML "directed 0", DOT "digraph") is not quoted: a reader cannot read it.
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
        return `${word}, from the file`;
    }
    if (by === "configuration") {
        return `${word}, set in the project`;
    }
    return word;
}

/**
 * An edge by its two ends: "Ava -> Kofi" on a directed graph, "Ava -- Kofi" otherwise.
 * @param session - the session, which says whether the graph is directed.
 * @param edge - the edge's record.
 * @returns the words.
 */
export function edgeName(session: GraphSession, edge: Pick<EdgeRecord, "source" | "target">): string {
    return `${String(edge.source)}${edgeJoiner(session)}${String(edge.target)}`;
}

/**
 * What goes between an edge's two ends in its name, which Find also matches an edge by.
 * @param session - the session, which says whether the graph is directed.
 * @returns " -> " on a directed graph, " -- " otherwise.
 */
export function edgeJoiner(session: GraphSession): string {
    return session.status.directed ? " -> " : " -- ";
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
 * A neighborhood's heading and status line, one form at every hop count: "Javert's 17
 * connections". The Hops control above the list says how far out.
 * @param center - the center node's name.
 * @param around - how many nodes, the center left out.
 * @returns the words.
 */
export function neighborhoodWords(center: string, around: number): string {
    return `${center}'s ${count(around, "connection")}`;
}

/** What Filter to neighbors does, off and on. */
export const NEIGHBOR_FILTER_WORDS = {
    off: "Hide every node outside this neighborhood",
    on: "Showing only this neighborhood. Press again to show every node",
} as const;

/**
 * A selection's size, leaving out a zero half ("2 nodes selected", "3 nodes, 1 edge selected").
 * @param nodes - how many nodes are selected.
 * @param edges - how many edges are selected.
 * @returns the words.
 */
export function selectionWords(nodes: number, edges: number): string {
    const parts = [nodes > 0 ? count(nodes, "node") : "", edges > 0 ? count(edges, "edge") : ""];
    return `${parts.filter(Boolean).join(", ")} selected`;
}

/**
 * A route's size ("3 nodes, 2 edges").
 * @param nodes - how many nodes are on it.
 * @param edges - how many edges are on it.
 * @returns the words.
 */
export function routeWords(nodes: number, edges: number): string {
    return `${count(nodes, "node")}, ${count(edges, "edge")}`;
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

/** What each kind's word means, as a sentence for its tooltip. */
const MEASUREMENT_GLOSS: Readonly<Record<Named<Measurement>, string>> = {
    categorical: "Each value names a group, such as a department. Groups have no order.",
    ordinal: "The values have an order, such as small, medium, large, but the steps between them are not equal.",
    quantitative: "Each value is a quantity, such as a count or a distance, so values can be compared and averaged.",
    time: "Each value is a date or a time.",
};

/**
 * What a column's kind means, for the tooltip on its word.
 * @param measurement - the element's measurement.
 * @returns the sentence, or an empty string for a measurement the app has no words for.
 */
export function measurementGloss(measurement: Measurement | undefined): string {
    return measurement !== undefined && Object.hasOwn(MEASUREMENT_GLOSS, measurement)
        ? MEASUREMENT_GLOSS[measurement as Named<Measurement>]
        : "";
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

/**
 * The state bar's words, and the paint row's description, for a run that is out of date: what
 * changed, in the element's numbers ("Ran on 20 nodes; 15 shown now").
 * @param note - `run.stale`.
 * @returns the words.
 */
export function staleWords(note: Pick<StaleNote, "reason" | "ranOn" | "nowVisible">): string {
    return note.reason === "data-changed"
        ? "Data changed since this run"
        : `Ran on ${count(note.ranOn, "node")}; ${COUNT.format(note.nowVisible)} shown now`;
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
    return group.rank === undefined ? String(group.group) : rankedName(group);
}

/**
 * A partition group's name from its rank, or nothing for a category or no group at all.
 * @param group - the group, if any.
 * @returns "Group 3", or "".
 */
export function rankedName(group: SummaryGroup | undefined): string {
    return group?.rank === undefined ? "" : `Group ${String(group.rank)}`;
}

/** An immersive mode, or both of them in one row. */
type XrRowMode = "vr" | "ar" | "both";

const XR_MODE_WORDS: Readonly<Record<XrRowMode, string>> = { vr: "VR", ar: "AR", both: "VR or AR" };

/** The words for each reason a mode cannot be entered; a reason the element adds fails to compile. */
const XR_REASON_WORDS: Readonly<Record<XrUnavailableReason, (mode: XrRowMode) => string>> = {
    "no-webxr": (mode) => `This browser has no ${XR_MODE_WORDS[mode]}`,
    "insecure-context": () => "Needs a secure (https) page",
    unsupported: (mode) =>
        ({ vr: "No VR headset found", ar: "This device has no AR", both: "This device has no VR or AR" })[mode],
    "webgpu-renderer": () => "Not available with the WebGPU renderer",
    disabled: () => "Turned off for this graph",
    probing: () => "Checking...",
};

/**
 * Why VR, AR or both cannot be entered, in the app's words, from the element's reason code.
 * @param reason - the element's reason.
 * @param mode - the row the reason is for.
 * @returns the words; never the code itself.
 */
export function xrReasonWords(reason: XrUnavailableReason, mode: XrRowMode): string {
    return XR_REASON_WORDS[reason](mode);
}

/**
 * The XR rows the View menu draws: one "VR / AR" row when neither mode can be entered for the
 * same reason, otherwise one row per mode, each with its reason or null.
 * @param xr - the element's XR facts.
 * @returns the rows, top to bottom.
 */
export function xrRows(xr: XrCapability): { mode: XrRowMode; reason: string | null }[] {
    const { vr, ar } = xr.reasons;
    if (vr !== null && vr === ar) {
        return [{ mode: "both", reason: xrReasonWords(vr, "both") }];
    }
    return (["vr", "ar"] as const).map((mode) => {
        const reason = xr.reasons[mode];
        return { mode, reason: reason === null ? null : xrReasonWords(reason, mode) };
    });
}

/**
 * The notice for an immersive session the browser would not start.
 * @param mode - VR or AR.
 * @param code - the element's error code, when it gave one.
 * @returns the words; never the code itself.
 */
export function xrEntryFailureWords(mode: "vr" | "ar", code: GraphtyErrorCode | undefined): string {
    const words = XR_MODE_WORDS[mode];
    return code === "E_UNSUPPORTED"
        ? `Could not enter ${words}: it is turned off for this graph`
        : `Could not enter ${words}`;
}
