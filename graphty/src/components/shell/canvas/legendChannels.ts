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
 * the field's path, the scale's id, the domain, the palette, up to twelve swatches with their
 * values and their colours, and the departures as coded facts. It is synchronous and measures
 * nothing. The words for all of it are written here and in `legendWords.ts`: the field's name
 * from the session's attributes or the algorithm catalogue, the scale's from the scale catalogue.
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

import { BUILT_IN_ALGORITHMS, scaleDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel, GraphSession, LegendBlock, LegendSwatch } from "@graphty/graphty-element/session";

import { defaultNodeHex } from "../../../utils/channelControls";
import { factSentence, swatchText } from "../../../workspace/canvas/legendWords";
import { CANVAS_METRICS, LEGEND_BLOCK_ORDER, type LegendChannelId } from "./canvasLayout";
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

/** The names the legend words a block with, which only the session knows. */
interface LegendNames {
    /**
     * The plain name of the field a block reads.
     * @param block - the block.
     * @returns the name, or undefined when the session has none for it.
     */
    readonly field?: (block: LegendBlock) => string | undefined;
    /**
     * The name of a layer, which is what a fixed-value row is called.
     * @param layerId - the layer.
     * @returns the name, or undefined when the stack holds no such layer.
     */
    readonly layer?: (layerId: string) => string | undefined;
}

/**
 * The legend's names out of one session: a run result's plain name from the catalogue entry the
 * block's `field.result` names, a column's from `data.attributes()` by its path.
 * @param session - the session.
 * @returns the names.
 * @public
 */
export function legendNamesOf(session: Pick<GraphSession, "data" | "styles">): LegendNames {
    return {
        field: (block) => {
            const { field } = block;
            if (field === undefined) {
                return undefined;
            }
            const { result } = field;
            if (result !== undefined) {
                return BUILT_IN_ALGORITHMS.find((descriptor) => descriptor.key === result.algorithm)?.fields.find(
                    (candidate) => candidate.name === result.field,
                )?.plainName;
            }
            const target = session.styles.get(block.layerId)?.target;
            return session.data
                .attributes()
                .find((attribute) => attribute.path === field.path && attribute.kind === target)?.plainName;
        },
        layer: (layerId) => session.styles.get(layerId)?.name,
    };
}

/**
 * The last segment of a dotted path.
 * @param path - the path.
 * @returns its last segment.
 */
function lastSegment(path: string): string {
    return path.slice(path.lastIndexOf(".") + 1);
}

/**
 * A field's name when the session has none: the path's last segment in title case
 * (`results.r1.inDegree` reads "In Degree").
 * @param path - the field's path.
 * @returns the name.
 */
function pathWords(path: string): string {
    const words = lastSegment(path)
        .replaceAll(/([a-z\d])([A-Z])/g, "$1 $2")
        .split(/[\s_-]+/u)
        .filter((word) => word !== "");
    const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    return name === "" ? path : name;
}

/**
 * The scale in words, from the scale catalogue, or its id for a scale the catalogue does not list.
 * @param kind - the scale's id.
 * @returns the words.
 */
function scaleWords(kind: string): string {
    return scaleDescriptor(kind)?.plainName ?? kind;
}

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
 * @param block - the block the swatch belongs to.
 * @param swatch - the swatch the element published.
 * @param prefix - {@link MIDPOINT_STOP_PREFIX} for the middle stop, "" for the two ends.
 * @returns the stop, or undefined when the element published no swatch there.
 */
function stopOf(block: LegendBlock, swatch: LegendSwatch | undefined, prefix: string): LegendStop | undefined {
    if (swatch === undefined) {
        return undefined;
    }

    return {
        label: `${prefix}${swatchText(block, swatch)}`,
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
 * @param block - the block the element published, its swatches low to high.
 * @returns the stops, in drawing order.
 */
function rampStops(block: LegendBlock): readonly LegendStop[] {
    const { swatches } = block;
    if (swatches.length === 0) {
        return [];
    }

    const middle = swatches.length > 2 ? swatches[Math.floor(swatches.length / 2)] : undefined;
    const stops = [
        stopOf(block, swatches[0], ""),
        stopOf(block, middle, MIDPOINT_STOP_PREFIX),
        stopOf(block, swatches.length > 1 ? swatches.at(-1) : undefined, ""),
    ];

    return stops.filter((stop): stop is LegendStop => stop !== undefined);
}

/**
 * The categorical rows a block draws, capped at the canvas's own five.
 * @param block - the block the element published, its swatches largest first.
 * @param layerName - the name of the layer behind the block, for a fixed-value row.
 * @returns at most five rows.
 */
function categoriesOf(block: LegendBlock, layerName: string | undefined): readonly LegendCategory[] {
    return block.swatches.slice(0, CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS).map((swatch, index): LegendCategory => ({
        id: `swatch-${String(index)}`,
        label: swatchText(block, swatch, layerName),
        color: swatchColor(swatch),
    }));
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
 * @param names - the session's names for fields and layers.
 * @returns the canvas's own block, or undefined.
 * @public
 */
export function legendChannelOf(block: LegendBlock, names: LegendNames = {}): LegendChannel | null {
    const id = CANVAS_BLOCK_OF[block.channel];

    if (id === undefined) {
        return null;
    }

    const scaleLine = block.scale === undefined ? LITERAL_SCALE_SHORT : scaleWords(block.scale.kind);
    const fieldName = block.field === undefined ? undefined : (names.field?.(block) ?? pathWords(block.field.path));
    const departures = block.facts.flatMap((fact) => factSentence(fact) ?? []);
    const common = {
        channel: id,
        channelLabel: BLOCK_LABEL[id],
        attribute: fieldName ?? (block.scale === undefined ? BLOCK_LABEL[id] : scaleLine),
        ...(block.field?.technicalName === undefined ? {} : { technicalName: block.field.technicalName }),
        scaleLine,
        scaleShort: block.scale?.kind ?? LITERAL_SCALE_SHORT,
        ...(departures.length === 0 ? {} : { departures }),
    };

    if (isQuantitative(block)) {
        return { ...common, stops: rampStops(block) };
    }

    const other = otherRowOf(block);

    return {
        ...common,
        categories: categoriesOf(block, names.layer?.(block.layerId)),
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
 * @param names - the session's names for fields and layers ({@link legendNamesOf}).
 * @returns one canvas block per channel the canvas legend draws, topmost encoding first.
 * @public
 */
export function legendChannels(blocks: readonly LegendBlock[], names: LegendNames = {}): readonly LegendChannel[] {
    const channels: LegendChannel[] = [];

    for (let at = blocks.length - 1; at >= 0; at--) {
        const channel = legendChannelOf(blocks[at], names);

        if (channel !== null && !channels.some((held) => held.channel === channel.channel)) {
            channels.push(channel);
        }
    }

    return channels;
}

/**
 * Puts the encoded channels into the legend's fixed block order and drops anything
 * that is not one of the five channels. A channel with no encoding never reaches here.
 * @param channels - the encoded channels, in any order.
 * @returns the channels in the order Color, Size, Outline, Edge width, Arrow.
 */
export function orderLegendChannels(channels: readonly LegendChannel[]): readonly LegendChannel[] {
    return LEGEND_BLOCK_ORDER.flatMap((id) => channels.filter((channel) => channel.channel === id));
}

/**
 * Applies the canvas's own categorical cap: the five largest categories, and the Other
 * row that follows carries the coverage footer for everything else.
 * @param categories - the categories the encoding model supplies, largest first.
 * @returns at most five of them.
 */
export function capLegendCategories(categories: readonly LegendCategory[]): readonly LegendCategory[] {
    return categories.slice(0, CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS);
}
