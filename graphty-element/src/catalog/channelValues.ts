/**
 * @file Every value of an enum style channel with a default name and, where the element draws one,
 * a picture, so a value picker never keeps its own table of the element's vocabularies.
 *
 * Node shapes, arrowheads and line patterns take their names and pictures from the glyph tables in
 * `./shapes`, whichever channel lists them: the underlay's shape, a middle arrowhead, an edge's
 * outline pattern. A node's border patterns spell two of the line patterns their own way
 * (`dashed`, `dotted`) and are mapped here. Every other value is named from its id, with the
 * few ids that do not read as words named outright.
 */

import { cssWords, shareSizes } from "../meshes/nodeDecoration";
import { type ChannelDescriptor, channelDescriptor } from "../session/styles/channels";
import { EDGE_ARROW_DESCRIPTORS, EDGE_LINE_DESCRIPTORS, type GlyphDescriptor, NODE_SHAPE_DESCRIPTORS } from "./shapes";
import type { Channel } from "./types";

/**
 * One value of an enum channel: see `CatalogApi.channelValues`.
 * @since 3.40.0
 */
export interface ChannelValueDescriptor {
    /** The value a layer writes, such as `"round-rectangle"`. */
    readonly id: string;
    /** The default name to show for it, such as "Round rectangle". An application may replace it by id. */
    readonly plainName: string;
    /** A static 24 x 24 SVG drawn in `currentColor`, on a value the element has a picture for. */
    readonly glyph?: string;
}

/**
 * The glyph table of a channel whose values are node shapes, arrowheads or line patterns.
 * @param channel - The channel.
 * @returns The table, or undefined for any other channel.
 */
function glyphTableOf(channel: string): readonly GlyphDescriptor[] | undefined {
    if (channel === "node.shape" || channel === "node.underlayShape" || channel === "node.overlayShape") {
        return NODE_SHAPE_DESCRIPTORS;
    }
    if (/^edge\.arrow(Middle)?(Head|Tail)$/.test(channel)) {
        return EDGE_ARROW_DESCRIPTORS;
    }
    if (/^(edge\.(style|outlineStyle)|node\.(borderStyle|outerBorderStyle))$/.test(channel)) {
        return EDGE_LINE_DESCRIPTORS;
    }
    return undefined;
}

/** A border pattern's own spelling of a line pattern. */
const LINE_PATTERN_SPELLING: Readonly<Record<string, string>> = { dashed: "dash", dotted: "dot" };

/** Names for the ids that do not read as words once their dashes are spaces. */
const VALUE_NAMES: Readonly<Record<string, string>> = {
    "-x": "Minus X",
    "-y": "Minus Y",
    "-z": "Minus Z",
    x: "X",
    y: "Y",
    z: "Z",
    false: "Off",
    true: "On",
    barnesHut: "Barnes Hut",
    forceAtlas2: "Force Atlas 2",
    "no-repeat": "Once",
    "repeat-x": "Repeat across",
    "repeat-y": "Repeat down",
    min: "Smaller",
    max: "Larger",
    // The CSS numeric font weights `labelWeight` takes, by their common names.
    "100": "Thin",
    "200": "Extra light",
    "300": "Light",
    "500": "Medium",
    "600": "Semi bold",
    "800": "Extra bold",
    "900": "Black",
};

/**
 * The default name of a value no glyph table names: its id in sentence case, dashes and
 * underscores as spaces.
 * @param id - The value.
 * @returns The name.
 */
function nameOf(id: string): string {
    const named = VALUE_NAMES[id];
    if (named !== undefined) {
        return named;
    }
    const words = id.replaceAll(/[-_]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The answers already built, by descriptor: a descriptor is frozen, so its answer never changes. */
const built = new WeakMap<ChannelDescriptor, readonly ChannelValueDescriptor[]>();

/**
 * Every value of one enum channel, named, in the descriptor's order.
 * @param descriptor - The channel as the session offers it (with the experiment off, without the
 *     values it added).
 * @returns The values; empty for a channel that is not an enum.
 */
export function channelValuesOf(descriptor: ChannelDescriptor | undefined): readonly ChannelValueDescriptor[] {
    if (descriptor?.accepts !== "enum" || descriptor.values === undefined) {
        return Object.freeze([]);
    }
    const held = built.get(descriptor);
    if (held !== undefined) {
        return held;
    }
    const table = glyphTableOf(descriptor.channel);
    const values = Object.freeze(
        descriptor.values.map((id): ChannelValueDescriptor => {
            const glyph = table?.find((entry) => entry.id === (LINE_PATTERN_SPELLING[id] ?? id));
            return Object.freeze(
                glyph === undefined
                    ? { id, plainName: nameOf(id) }
                    : { id, plainName: glyph.plainName, glyph: glyph.glyph },
            );
        }),
    );
    built.set(descriptor, values);
    return values;
}

/** The word a number list holds in an unset item's place, so the items after it keep their places. */
export const UNSET_LIST_ITEM = "auto";

/** How {@link readChannelList} reads a list. */
export interface ReadChannelListOptions {
    /**
     * Keep each item in its place: an item of a number list that is no number (the `auto` placeholder) reads as
     * `undefined` rather than being dropped, so item `i` is always the list's `i`th word.
     */
    readonly keepPlace?: boolean;
}

/** A list item as {@link readChannelList} reads it with `keepPlace`: an unset item is `undefined`. */
export type PlacedListItem = string | number | undefined;

/**
 * The items of a list channel's value (`listOf` on its descriptor): the colors of
 * `node.gradientColors` as written ("rgb(1, 2, 3)" stays one item), the numbers of
 * `node.gradientStops`. What the renderer reads, so an editor that shows the items never splits the
 * text itself. A number list's word that is no number is dropped.
 * @param channel - The channel.
 * @param value - Its value, as a layer holds it.
 * @returns The items in order; empty for a channel that holds no list, or a value that is not text.
 * @since 3.40.0
 */
export function readChannelList(channel: Channel, value: unknown): readonly (string | number)[];
/**
 * The items of a list channel's value, each in its place: a number list's word that is no number (the `auto`
 * placeholder) reads as `undefined`.
 * @param channel - The channel.
 * @param value - Its value, as a layer holds it.
 * @param options - `keepPlace`.
 * @returns The items in order.
 * @since 3.69.0
 */
export function readChannelList(
    channel: Channel,
    value: unknown,
    options: ReadChannelListOptions,
): readonly PlacedListItem[];
/**
 * See the overloads.
 * @param channel - The channel.
 * @param value - Its value.
 * @param options - How to read it.
 * @returns The items.
 */
export function readChannelList(
    channel: Channel,
    value: unknown,
    options: ReadChannelListOptions = {},
): readonly PlacedListItem[] {
    const listOf = channelDescriptor(channel)?.listOf;
    if (listOf === undefined || typeof value !== "string") {
        return Object.freeze([]);
    }
    const words = cssWords(value);
    if (listOf === "color") {
        return Object.freeze(words);
    }
    const numbers = words.map(Number);
    return Object.freeze(
        options.keepPlace === true
            ? numbers.map((number) => (Number.isFinite(number) ? number : undefined))
            : numbers.filter((number) => Number.isFinite(number)),
    );
}

/**
 * A list channel's value written from its items, as {@link readChannelList} reads it back. An `undefined` item is
 * written as the placeholder `auto` ({@link UNSET_LIST_ITEM}), which the renderer reads as unset.
 * @param channel - The channel.
 * @param items - The items in order.
 * @returns The value to write.
 * @since 3.40.0
 */
export function writeChannelList(channel: Channel, items: readonly PlacedListItem[]): string {
    const listOf = channelDescriptor(channel)?.listOf;
    return items
        .map((item) => {
            if (item === undefined) {
                return UNSET_LIST_ITEM;
            }
            return listOf === "number" ? String(Number(item)) : String(item).trim();
        })
        .join(" ");
}

/**
 * The share each item of a share list (`listItems.share`, such as `node.stripeSizes`) draws: its own where set,
 * capped at what the items before it left, and an unset item an equal part of what the set ones leave. The renderer
 * reads the same numbers, so an editor shows what is drawn.
 * @param channel - The share list channel.
 * @param value - Its value.
 * @param count - How many items are drawn (the colors list's length).
 * @returns One share per item, 0 to 1.
 * @since 3.69.0
 */
export function listShares(channel: Channel, value: unknown, count: number): readonly number[] {
    const text = channelDescriptor(channel)?.listOf === "number" && typeof value === "string" ? value : undefined;
    return Object.freeze(shareSizes(text, Math.max(0, Math.floor(count))));
}

/**
 * A share list's new value after item `index` is set to `share`: that item as given (0 to 1), and when the set items
 * then add up to more than the whole, the others give way, the later ones first from the end, then the earlier ones
 * nearest first, each lowered until the shares fit. Unset items stay unset (written `auto` where an item after them is
 * set), taking what is left.
 * @param channel - The share list channel.
 * @param value - Its value before the edit (for a drag, its value when the drag began).
 * @param count - How many items are drawn.
 * @param index - The item set.
 * @param share - Its share, 0 to 1; `undefined` unsets it.
 * @returns The value to write.
 * @since 3.69.0
 */
export function setListShare(
    channel: Channel,
    value: unknown,
    count: number,
    index: number,
    share: number | undefined,
): string {
    const items: (number | undefined)[] = Array.from({ length: Math.max(count, index + 1) }, (_, at) => {
        const item = readChannelList(channel, value, { keepPlace: true })[at];
        return typeof item === "number" ? Math.max(0, Math.min(1, item)) : undefined;
    });
    items[index] = share === undefined ? undefined : Math.max(0, Math.min(1, share));
    let excess = items.reduce<number>((sum, item) => sum + (item ?? 0), 0) - 1;
    const order = [
        ...Array.from({ length: items.length - index - 1 }, (_, k) => items.length - 1 - k),
        ...Array.from({ length: index }, (_, k) => index - 1 - k),
    ];
    for (const at of order) {
        const item = items[at];
        if (excess <= 1e-9) {
            break;
        }
        if (item !== undefined) {
            const cut = Math.min(item, excess);
            items[at] = Math.round((item - cut) * 1e6) / 1e6;
            excess -= cut;
        }
    }
    while (items.length > 0 && items.at(-1) === undefined) {
        items.pop();
    }
    return writeChannelList(channel, items);
}
