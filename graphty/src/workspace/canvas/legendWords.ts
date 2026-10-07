/**
 * The legend card's words (tier1-design.md section 2.4).
 *
 * graphty-element publishes the legend as neutral facts -- `styles.legend()` blocks with their
 * channel, field, domain and swatches -- and the app writes every word a reader sees: the section
 * titles, the Other row and the overflow line.
 *
 * Not written yet, because the element does not publish the facts behind them (#912): the
 * sentence saying what a higher value means, and the bound size range. The app does not work them
 * out from the swatches.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import type { LegendBlock, LegendFact, LegendFactCode, LegendSwatch } from "@graphty/graphty-element/session";

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

/** The channels whose swatches carry a size. */
const SIZE_CHANNELS: ReadonlySet<Channel> = new Set<Channel>(["node.size", "edge.width"]);

/**
 * Whether a block describes a size, so its swatches carry `size` rather than `color`.
 * @param block - the block.
 * @returns true for node size and edge width.
 */
export function isSizeBlock(block: LegendBlock): boolean {
    return SIZE_CHANNELS.has(block.channel);
}

/**
 * The section title: "<Property>: <row>", or the row's name alone for a channel the app has no
 * word for, so a reader never sees a channel id.
 * @param block - the block.
 * @param rowName - the name of the row that paints it (the run's name, or the layer's).
 * @returns the title.
 */
export function sectionTitle(block: LegendBlock, rowName: string): string {
    const word = PROPERTY_WORDS[block.channel];
    return word === undefined ? rowName : `${word}: ${rowName}`;
}

/**
 * A number the way a legend prints it: four significant figures with the trailing zeros taken
 * off, whole numbers as they are, and very large or very small ones in exponent form.
 * @param value - the number.
 * @returns the words.
 */
export function legendNumber(value: number): string {
    if (!Number.isFinite(value) || (Number.isInteger(value) && Math.abs(value) < 1e7)) {
        return String(value);
    }
    const magnitude = Math.abs(value);
    if (magnitude >= 1e7 || (magnitude > 0 && magnitude < 1e-3)) {
        return value.toExponential(2);
    }
    return String(Number(value.toPrecision(4)));
}

/**
 * The text of one legend row, worded from the row's facts: "Group 3" for a run's group, "0 - 25"
 * for a stepped range, "0.3" for a ramp stop, the category itself, the layer's name for a fixed
 * value, and "other: 4 groups" for the folded bucket.
 * @param block - the block the row belongs to.
 * @param swatch - the row.
 * @param layerName - the name of the layer behind the block, for a fixed-value row.
 * @returns the text.
 */
export function swatchText(block: LegendBlock, swatch: LegendSwatch, layerName?: string): string {
    const { value } = swatch;
    if (swatch.role === "other") {
        const groups = Array.isArray(value) ? value.length : 0;
        return `other: ${String(groups)} ${groups === 1 ? "group" : "groups"}`;
    }
    if (swatch.rank !== undefined) {
        return `Group ${String(swatch.rank)}`;
    }
    if (swatch.extent !== undefined) {
        const { min, max } = swatch.extent;
        return min === max ? legendNumber(min) : `${legendNumber(min)} - ${legendNumber(max)}`;
    }
    if (block.kind === "literal" || block.kind === "highlight") {
        return layerName ?? String(value);
    }
    if (block.kind !== "categorical" && typeof value === "number") {
        return legendNumber(value);
    }
    return String(value);
}

/**
 * The name of one row of a list block; the Other row, the one bucket the paint folded the smaller
 * groups into, is "Other".
 * @param block - the block the row belongs to.
 * @param swatch - the row.
 * @param layerName - the name of the layer behind the block, for a fixed-value row.
 * @returns its name.
 */
export function swatchName(block: LegendBlock, swatch: LegendSwatch, layerName?: string): string {
    return swatch.role === "other" ? "Other" : swatchText(block, swatch, layerName);
}

/** The sentence each legend fact is printed as. */
const FACT_SENTENCES: Readonly<Record<LegendFactCode, (param: (name: string) => string) => string>> = {
    "legend.clamped": (param) => `clamped at p${param("from")}/p${param("to")}`,
    "legend.not-plottable": (param) => `${param("count")} not plottable on a ${param("scale")} scale`,
    "legend.none-plottable": (param) => `no value is plottable on a ${param("scale")} scale`,
    "legend.no-value-in-domain": (param) => `no value has a place between ${param("min")} and ${param("max")}`,
    "legend.nothing-measured": () => "nothing measured",
    "legend.unreadable": (param) => `${param("count")} carry no value the scale can read`,
    "legend.lumped": (param) => `${param("count")} lumped into "other"`,
    "legend.not-measured": (param) => `not measured (${param("count")})`,
    "legend.painted-over": (param) => `painted over by "${param("name")}"`,
};

/**
 * One legend fact as the sentence a reader sees, or null for a code this app has no words for
 * (the element may add codes in a minor release).
 * @param fact - the fact.
 * @returns the sentence, or null.
 */
export function factSentence(fact: LegendFact): string | null {
    const sentence = (FACT_SENTENCES as Partial<Record<string, (param: (name: string) => string) => string>>)[
        fact.code
    ];
    return sentence === undefined ? null : sentence((name) => String(fact.params[name]));
}

/**
 * What a list row paints when that is not a color: a shape or a line pattern in words
 * ("triangular_prism" reads "Triangular prism"), or a size as its number.
 * @param swatch - the row.
 * @returns the words, or null for a row that paints a color or nothing.
 */
export function paintWords(swatch: LegendSwatch): string | null {
    if (typeof swatch.paints === "string" && swatch.paints !== "") {
        const words = swatch.paints.replaceAll(/[-_]+/g, " ");
        return words.charAt(0).toUpperCase() + words.slice(1);
    }
    return swatch.size === undefined ? null : String(Number(swatch.size.toPrecision(3)));
}

/**
 * The line under a list that did not fit.
 * @param hidden - how many rows were left out.
 * @returns "28 more".
 */
export function overflowLine(hidden: number): string {
    return `${String(hidden)} more`;
}
