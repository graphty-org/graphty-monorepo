/**
 * Style panel v2's list things (design/ui/style-panel-v2/design.md, section 7.1, R15): which
 * graphty-element list channels make each item of a pie, stripes or a chart, the color a new item
 * starts with, and the one write of every list of an edit.
 */

import { type Channel, readChannelList, writeChannelList } from "@graphty/graphty-element/catalog";

import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";

/** One number of each item: its list channel, its name, and whether it reads as a percent. */
export interface ListNumber {
    readonly channel: Channel;
    readonly name: string;
    readonly percent?: boolean;
}

/** A list thing's list: the legend, the colors (one an item) and each item's numbers. */
export interface ListSpec {
    readonly name: string;
    /** The item's name, for each line's controls ("Slice 2 color"). */
    readonly item: string;
    readonly colors: Channel;
    readonly numbers: readonly ListNumber[];
}

/** The list things (design 7.1), by thing id. */
export const LISTS: Readonly<Record<string, ListSpec>> = {
    pie: {
        name: "Slices",
        item: "Slice",
        colors: "node.pieColors",
        numbers: [
            { channel: "node.pieSizes", name: "Share" },
            { channel: "node.pieOpacities", name: "Opacity", percent: true },
        ],
    },
    stripes: {
        name: "Stripes",
        item: "Stripe",
        colors: "node.stripeColors",
        numbers: [
            { channel: "node.stripeSizes", name: "Share" },
            { channel: "node.stripeOpacities", name: "Opacity", percent: true },
        ],
    },
    chart: {
        name: "Values",
        item: "Value",
        colors: "node.chartColors",
        numbers: [{ channel: "node.chartValues", name: "Value" }],
    },
};

/**
 * The color a new item starts with (design 5.1): the next of the document's colors after the
 * list's, else the color the row's nodes are drawn in.
 * @param ctx - the row.
 * @param colors - the list's colors now.
 * @returns the color.
 */
export function nextColor(ctx: RowContext, colors: readonly string[]): string {
    const unused = ctx.documentColors.find((color) => !colors.includes(color));
    if (unused !== undefined) {
        return unused;
    }
    const drawn = lineIn(ctx, "node.color")?.value ?? ctx.session.styles.defaultValue("node.color");
    return typeof drawn === "string" ? drawn : "#808080";
}

/**
 * Writes every list of a list thing in one undo step: the colors, and each number list that holds
 * items or is given new ones.
 * @param ctx - the row.
 * @param list - the list.
 * @param colors - the colors.
 * @param numbers - each number list's items, by channel.
 * @returns when it is written.
 */
export function writeList(
    ctx: RowContext,
    list: ListSpec,
    colors: readonly string[],
    numbers: Readonly<Partial<Record<Channel, readonly string[]>>>,
): Promise<unknown> {
    const also = Object.fromEntries(
        list.numbers.flatMap(({ channel }) => {
            const items = numbers[channel];
            return items === undefined || items.length === 0 ? [] : [[channel, writeChannelList(channel, items)]];
        }),
    );
    return writeIn(ctx, list.colors, { value: writeChannelList(list.colors, colors) }, also, true);
}

/**
 * A list channel's items as the row holds them.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns the items, as text.
 */
export function itemsOf(ctx: RowContext, channel: Channel): string[] {
    return readChannelList(channel, lineIn(ctx, channel)?.value).map(String);
}
