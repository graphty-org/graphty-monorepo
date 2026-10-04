/**
 * The legend card's words (tier1-design.md section 2.4).
 *
 * graphty-element publishes the legend as neutral facts -- `styles.legend()` blocks with their
 * channel, field, domain and swatches -- and the app writes every word a reader sees: the section
 * titles, the one sentence saying what a higher value means, the Other row and the overflow line.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import type { LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";

/** The property word each channel a legend shows goes by ("Color: PageRank"). */
const PROPERTY_WORDS: Partial<Record<Channel, string>> = {
    "node.color": "Color",
    "node.size": "Size",
    "node.shape": "Shape",
    "node.opacity": "Opacity",
    "node.outline": "Outline",
    "node.glow": "Glow",
    "node.label": "Label",
    "edge.color": "Edge color",
    "edge.width": "Edge width",
    "edge.opacity": "Edge opacity",
    "edge.style": "Edge line",
};

/** The channels whose swatches carry a size, so the card shows the drawn range. */
const SIZE_CHANNELS: ReadonlySet<Channel> = new Set<Channel>(["node.size", "edge.width"]);

/**
 * The property word of a channel.
 * @param channel - the channel.
 * @returns its word, or the channel id itself for one the app has no word for.
 */
function propertyWord(channel: Channel): string {
    return PROPERTY_WORDS[channel] ?? channel;
}

/**
 * Whether a block describes a size, so its swatches carry `size` rather than `color`.
 * @param block - the block.
 * @returns true for node size and edge width.
 */
export function isSizeBlock(block: LegendBlock): boolean {
    return SIZE_CHANNELS.has(block.channel);
}

/**
 * The section title: "<Property>: <row>".
 * @param block - the block.
 * @param rowName - the name of the row that paints it (the run's name, or the layer's).
 * @returns the title.
 */
export function sectionTitle(block: LegendBlock, rowName: string): string {
    return `${propertyWord(block.channel)}: ${rowName}`;
}

/**
 * Relative luminance of a `#rgb`, `#rrggbb` or `#rrggbbaa` color (WCAG 2), alpha ignored.
 * @param color - the hex color.
 * @returns 0 (black) to 1 (white), or null for anything that is not a hex color.
 */
export function luminance(color: string): number | null {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color)?.[1];
    if (hex === undefined) {
        return null;
    }
    const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
    const [r, g, b] = [0, 2, 4].map((at) => {
        const value = parseInt(full.slice(at, at + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The one plain sentence saying what a higher value means on this drawing (round 8), for a
 * continuous block that reads a field: "Darker means higher PageRank.", "Larger means higher
 * Degree.". Read off the block's own lowest and highest swatch, so it follows a reversed palette.
 * @param block - the block.
 * @returns the sentence, or null when the block is not continuous, reads no field, or its two
 *   ends do not differ.
 */
export function readingSentence(block: LegendBlock): string | null {
    if (block.kind !== "sequential" || block.field === undefined) {
        return null;
    }
    const swatches = block.swatches.filter((swatch) => swatch.role === undefined);
    const low = swatches.at(0);
    const high = swatches.at(-1);
    if (low === undefined || high === undefined || low === high) {
        return null;
    }
    const field = block.field.plainName;
    if (isSizeBlock(block)) {
        if (low.size === undefined || high.size === undefined || low.size === high.size) {
            return null;
        }
        return `${high.size > low.size ? "Larger" : "Smaller"} means higher ${field}.`;
    }
    const lowLight = low.color === undefined ? null : luminance(low.color);
    const highLight = high.color === undefined ? null : luminance(high.color);
    if (lowLight === null || highLight === null || lowLight === highLight) {
        return null;
    }
    return `${highLight < lowLight ? "Darker" : "Lighter"} means higher ${field}.`;
}

/**
 * The drawn size range of a size block, in the element's own size units: "1 to 3". Never in
 * pixels: node size is unitless and drawn in perspective.
 * @param block - the block.
 * @returns the range, or null when the block carries no sizes.
 */
export function sizeRange(block: LegendBlock): string | null {
    const sizes = block.swatches.flatMap((swatch) => (swatch.size === undefined ? [] : [swatch.size]));
    if (!isSizeBlock(block) || sizes.length === 0) {
        return null;
    }
    const format = (size: number): string => String(Number(size.toPrecision(3)));
    return `${format(Math.min(...sizes))} to ${format(Math.max(...sizes))}`;
}

/**
 * The name of one row of a list block. The Other row, the one bucket the paint folded the
 * smaller groups into, says how many groups it holds.
 * @param swatch - the row.
 * @returns its name.
 */
export function swatchName(swatch: LegendSwatch): string {
    if (swatch.role !== "other") {
        return swatch.label;
    }
    const groups = Array.isArray(swatch.value) ? swatch.value.length : 0;
    return groups === 0 ? "Other" : `Other (${String(groups)} ${groups === 1 ? "group" : "groups"})`;
}

/**
 * The line under a list that did not fit.
 * @param hidden - how many rows were left out.
 * @returns "28 more".
 */
export function overflowLine(hidden: number): string {
    return `${String(hidden)} more`;
}
