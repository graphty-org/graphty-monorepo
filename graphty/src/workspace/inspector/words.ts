/**
 * The inspector's words. graphty-element hands over codes and numbers; what a reader reads is
 * the app's, and lives here.
 */

import type { Channel, GraphStatistics } from "@graphty/graphty-element/session";

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

/** The property token Why this look shows for each channel. Two channels may share one word. */
const CHANNEL_WORDS: Partial<Record<Channel, string>> = {
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
};

/**
 * The tokens for the channels a layer won, each word once, in the order given.
 * @param channels - the channels.
 * @returns the words.
 */
export function channelTokens(channels: readonly Channel[]): string[] {
    return [...new Set(channels.map((channel) => CHANNEL_WORDS[channel] ?? channel))];
}

const NUMBER = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });

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
    return `${formatNumber(count)} ${noun}${count === 1 ? "" : "s"}`;
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
