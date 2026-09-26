/**
 * The canvas legend's blocks, translated from the element's own encoding model.
 *
 * WHAT THIS FILE STOPPED DOING. It used to REBUILD the legend: it held the community
 * palette and re-indexed it by rank, it re-derived a viridis ramp's three stops from a
 * ranking the shell had summarised itself, it wrote the scale out in words from a table of
 * its own, and it counted the nodes a run did not reach so it could print the departure.
 * Every one of those was a second reading of a picture the element had already worked out,
 * free to disagree with the canvas the moment either side moved -- and one of them did
 * exactly that: the swatch beside a metric's result card was drawn at the palette's top
 * rather than at the top node's own fraction, so a run whose fractions were all zero drew
 * a yellow chip over a deep-purple graph.
 *
 * `styles.legend()` answers all of it from the prepared bindings the repaint painted from:
 * the field's plain and technical names, the scale's own words out of the scale catalogue,
 * the domain, the palette, up to twelve swatches with their values and their colours, and
 * the departures as finished sentences. It is synchronous and measures nothing.
 *
 * WHAT IS LEFT HERE is presentation, which is the app's: which of the element's channels
 * the canvas legend draws a block for, the canvas's own five-category cap and its Other
 * row, and the three-stop shape a quantitative block takes on this surface. None of it
 * invents a number, and since this pass none of it invents a WORD for one either: the middle
 * stop used to be labelled "median" over a value the element had swept out of the domain,
 * which named a statistic nothing here had computed. It says "midpoint", which is what that
 * value is.
 *
 * The Other row is drawn in the colours of the swatches it rolls up, read off the block like every
 * other swatch: the categories past the cap are painted on the canvas in their own colours, and a
 * bucket the element lumped is its own swatch carrying the element's own bucket colour. The
 * fallback for a swatch with no colour is read off the element's default node style, because a
 * hex written down beside the element is a copy that goes wrong the moment the element changes it.
 */

import type { Channel, LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";

import { defaultNodeHex } from "../../../utils/channelControls";
import { CANVAS_METRICS, type LegendChannelId } from "./canvasLayout";
import type { LegendCategory, LegendChannel, LegendStop } from "./Legend";

/**
 * Which canvas legend block one element channel belongs to.
 *
 * The canvas draws five blocks (`LEGEND_BLOCK_ORDER`) and the element paints twenty-two
 * channels, so this is a narrowing and not a rename: a channel with no entry draws no
 * block, which is the honest reading of "the canvas legend has no row for that".
 */
const CANVAS_BLOCK_OF: Partial<Record<Channel, LegendChannelId>> = {
    "node.color": "color",
    "node.size": "size",
    "node.outline": "outline",
    "edge.color": "color",
    "edge.width": "edgeWidth",
    "edge.arrowHead": "arrow",
};

/** The word the legend puts at the head of each block. */
const BLOCK_LABEL: Readonly<Record<LegendChannelId, string>> = {
    color: "Color",
    size: "Size",
    outline: "Outline",
    edgeWidth: "Edge width",
    arrow: "Arrow",
};

/**
 * The word the MIDDLE stop carries inside its own label, and it is "midpoint" rather than
 * "median" because a midpoint is what the element publishes there.
 *
 * A quantitative block's swatches are stops the element swept across the DOMAIN -- seven evenly
 * spaced values for a ramp, one per painted group for a stepped encoding -- so the middle one is
 * the middle of that row of stops and says nothing about where the values actually sit. Calling
 * it the median was a claim about the distribution that no number in the block supports, and
 * "median 3" over a column whose median is 47 is exactly the false reading this file's header
 * says a legend exists to prevent. Build spec 01 section 9 writes the line as "the domain
 * endpoints with the median or midpoint", so naming the midpoint is the specified form for a
 * block that carries one.
 */
const MIDPOINT_STOP_PREFIX = "midpoint ";

/** What the compact form's dimmed suffix says for a block with no scale of its own. */
const LITERAL_SCALE_SHORT = "fixed";

/**
 * The colour a swatch is drawn in: its own, or what the element paints a node no layer has
 * encoded when the swatch carries none (a size-only categorical block, for one).
 * @param swatch - the swatch the element published.
 * @returns the colour.
 */
function swatchColor(swatch: LegendSwatch): string {
    return swatch.color ?? defaultNodeHex();
}

/**
 * Whether a legend block describes a ramp rather than a list.
 * @param block - the block the element published.
 * @returns true for a sequential or diverging encoding.
 */
function isQuantitative(block: LegendBlock): boolean {
    return block.kind === "sequential" || block.kind === "diverging";
}

/**
 * One swatch as the canvas draws a ramp endpoint.
 *
 * The colour is the swatch's OWN colour, never a palette lookup at a position this module
 * chose: the element painted the canvas from the same prepared binding, so the chip and the
 * node it stands for are one value read twice rather than two guesses.
 * @param swatch - the swatch the element published.
 * @param prefix - {@link MIDPOINT_STOP_PREFIX} for the middle stop, "" for the two ends.
 * @returns the stop, or undefined when the element published no swatch there.
 */
function stopOf(swatch: LegendSwatch | undefined, prefix: string): LegendStop | undefined {
    if (swatch === undefined) {
        return undefined;
    }

    return {
        label: `${prefix}${swatch.label}`,
        ...(swatch.color === undefined ? {} : { color: swatch.color }),
        ...(swatch.size === undefined ? {} : { radius: swatch.size }),
    };
}

/**
 * The three stops a quantitative block draws: the two ends of the domain and the middle.
 *
 * The middle is the swatch the element put in the middle of its own list, and it carries the
 * COLOUR that swatch carries rather than a palette lookup at a position chosen here -- so the
 * chip and the nodes it stands for are one value read twice. A block with fewer than three
 * swatches draws the ones it has.
 * @param swatches - the swatches the element published, low to high.
 * @returns the stops, in drawing order.
 */
function rampStops(swatches: readonly LegendSwatch[]): readonly LegendStop[] {
    if (swatches.length === 0) {
        return [];
    }

    const middle = swatches.length > 2 ? swatches[Math.floor(swatches.length / 2)] : undefined;
    const stops = [
        stopOf(swatches[0], ""),
        stopOf(middle, MIDPOINT_STOP_PREFIX),
        stopOf(swatches.length > 1 ? swatches[swatches.length - 1] : undefined, ""),
    ];

    return stops.filter((stop): stop is LegendStop => stop !== undefined);
}

/**
 * The categorical rows a block draws, capped at the canvas's own five.
 * @param swatches - the swatches the element published, largest first.
 * @returns at most five rows.
 */
function categoriesOf(swatches: readonly LegendSwatch[]): readonly LegendCategory[] {
    return swatches.slice(0, CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS).map(
        (swatch, index): LegendCategory => ({
            id: `swatch-${String(index)}`,
            label: swatch.label,
            color: swatchColor(swatch),
        }),
    );
}

/**
 * The Other row, when the encoding covers more categories than the canvas names.
 *
 * The count is every category the BLOCK does not name -- the ones the cap pushed out plus
 * the ones the element's own twelve-swatch limit never sent -- because a painted-but-unnamed
 * category disappearing from the legend altogether is the defect this row exists to prevent.
 * The share is counted from the swatches' own counts and is omitted when the element could
 * not say how many elements carry each value.
 *
 * The chip carries each distinct colour of the swatches the cap rolled up, in the block's order,
 * so a row standing for one painted group or for the element's lumped bucket is drawn in exactly
 * that colour, and a row standing for several is drawn in all of them. Categories past the
 * element's own twelve-swatch limit carry no colour here, so they add none.
 * @param block - the block the element published.
 * @returns the row, or undefined when every category is named.
 */
function otherRowOf(block: LegendBlock): LegendChannel["other"] {
    const named = Math.min(block.swatches.length, CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS);
    const remaining = block.swatches.length - named + (block.overflow?.hidden ?? 0);

    if (remaining <= 0) {
        return undefined;
    }

    return {
        label: "Other",
        coverage: `${String(remaining)} ${remaining === 1 ? "category" : "categories"}`,
        colors: [...new Set(block.swatches.slice(named).map(swatchColor))],
    };
}

/**
 * One canvas legend block, or undefined when the canvas draws no block for that channel.
 *
 * A LITERAL block -- a layer painting a fixed colour -- is drawn as a single category, which
 * is what it is: one value, one chip. It carries the scale word "fixed" rather than a scale
 * it does not have.
 * @param block - the block the element published.
 * @returns the canvas's own block, or undefined.
 * @public
 */
export function legendChannelOf(block: LegendBlock): LegendChannel | null {
    const id = CANVAS_BLOCK_OF[block.channel];

    if (id === undefined) {
        return null;
    }

    const scaleLine = block.scale?.label ?? LITERAL_SCALE_SHORT;
    const common = {
        channel: id,
        channelLabel: BLOCK_LABEL[id],
        attribute: block.field?.plainName ?? block.scale?.label ?? BLOCK_LABEL[id],
        ...(block.field?.technicalName === undefined ? {} : { technicalName: block.field.technicalName }),
        scaleLine,
        scaleShort: block.scale?.kind ?? LITERAL_SCALE_SHORT,
        ...(block.departures.length === 0 ? {} : { departures: block.departures }),
    };

    if (isQuantitative(block)) {
        return { ...common, stops: rampStops(block.swatches) };
    }

    const other = otherRowOf(block);

    return {
        ...common,
        categories: categoriesOf(block.swatches),
        ...(other === undefined ? {} : { other }),
    };
}

/**
 * Every canvas legend block, from the element's own legend.
 *
 * The element returns its blocks BOTTOM FIRST, which is paint order, so the list is reversed
 * on the way out: a reader looks at the topmost encoding first, and `orderLegendChannels`
 * then puts what survives into the canvas's fixed block order.
 * @param blocks - what `session.styles.legend()` answered.
 * @returns one canvas block per channel the canvas legend draws, topmost encoding first.
 * @public
 */
export function legendChannels(blocks: readonly LegendBlock[]): readonly LegendChannel[] {
    const channels: LegendChannel[] = [];

    for (let at = blocks.length - 1; at >= 0; at--) {
        const channel = legendChannelOf(blocks[at]);

        if (channel !== null && !channels.some((held) => held.channel === channel.channel)) {
            channels.push(channel);
        }
    }

    return channels;
}
