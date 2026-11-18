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

import { cssWords } from "../meshes/nodeDecoration";
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

/**
 * The items of a list channel's value (`listOf` on its descriptor): the colors of
 * `node.gradientColors` as written ("rgb(1, 2, 3)" stays one item), the numbers of
 * `node.gradientStops`. What the renderer reads, so an editor that shows the items never splits the
 * text itself.
 * @param channel - The channel.
 * @param value - Its value, as a layer holds it.
 * @returns The items in order; empty for a channel that holds no list, or a value that is not text.
 * @since 3.40.0
 */
export function readChannelList(channel: Channel, value: unknown): readonly (string | number)[] {
    const listOf = channelDescriptor(channel)?.listOf;
    if (listOf === undefined || typeof value !== "string") {
        return Object.freeze([]);
    }
    const words = cssWords(value);
    return Object.freeze(listOf === "color" ? words : words.map(Number).filter((number) => Number.isFinite(number)));
}

/**
 * A list channel's value written from its items, as {@link readChannelList} reads it back.
 * @param channel - The channel.
 * @param items - The items in order.
 * @returns The value to write.
 * @since 3.40.0
 */
export function writeChannelList(channel: Channel, items: readonly (string | number)[]): string {
    const listOf = channelDescriptor(channel)?.listOf;
    return items.map((item) => (listOf === "number" ? String(Number(item)) : String(item).trim())).join(" ");
}
