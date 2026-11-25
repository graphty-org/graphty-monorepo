/**
 * What a parallel color list's lines read and write (`colorItems.tsx`, `ListItems.tsx`): its lists as the row draws
 * them, the shares graphty-element draws (`listShares`), and the writes of a whole list, a reorder and a removal.
 */

import { type Channel, type ChannelDescriptor, listShares } from "@graphty/graphty-element/catalog";

import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { lineIn } from "../row";
import { drawnItems, type ListSpec, writeList } from "./lists";

/**
 * A number descriptor for one item of a number list: graphty-element's item range (`listItems`), a fraction
 * stepping by hundredths.
 * @param descriptor - the list channel.
 * @returns the descriptor a number field reads.
 */
export function itemDescriptor(descriptor: ChannelDescriptor): ChannelDescriptor {
    const range = descriptor.listItems;
    return range === undefined
        ? { ...descriptor, accepts: "number", min: 0 }
        : { ...descriptor, accepts: "number", min: range.min, max: range.max, step: 0.01 };
}

/** One list of the thing and what it is. */
export interface Part {
    readonly channel: Channel;
    readonly descriptor: ChannelDescriptor;
    readonly name: string;
    /** Its items in their places, an unset one "". */
    readonly items: string[];
    /** A whole-list binding the layer holds (a column holding a list per node). */
    readonly bound: boolean;
}

/** Everything a list's lines read. */
export interface ListState {
    readonly ctx: RowContext;
    readonly list: ListSpec;
    readonly colors: Part;
    readonly share?: Part;
    readonly opacity?: Part;
    readonly value?: Part;
    readonly own: boolean;
    readonly shares: readonly number[];
    readonly fail: (error: unknown) => void;
}

/**
 * One list's part, or undefined where the element does not offer it here.
 * @param ctx - the row.
 * @param channel - the list channel.
 * @param name - its quantity's name.
 * @returns the part.
 */
function partOf(ctx: RowContext, channel: Channel, name: string): Part | undefined {
    const descriptor = shownChannel(ctx.session, ctx.side, channel, true);
    if (descriptor === undefined) {
        return undefined;
    }
    const line = lineIn(ctx, channel);
    return { channel, descriptor, name, items: drawnItems(ctx, channel).items, bound: line?.binding !== undefined };
}

/**
 * Read a list thing's lists.
 * @param ctx - the row.
 * @param list - the list.
 * @param fail - reports a failed write.
 * @returns its state, or undefined where the element offers no colors list here.
 */
export function stateOf(ctx: RowContext, list: ListSpec, fail: (error: unknown) => void): ListState | undefined {
    const colors = partOf(ctx, list.colors, "Color");
    if (colors === undefined) {
        return undefined;
    }
    const numbers = list.numbers.flatMap((each) => {
        const part = partOf(ctx, each.channel, each.name);
        return part === undefined ? [] : [part];
    });
    const share = numbers.find((part) => part.descriptor.listItems?.share === true);
    const opacity = numbers.find((part) => part !== share && part.descriptor.listItems !== undefined);
    const value = numbers.find((part) => part !== share && part !== opacity);
    const count = colors.items.length;
    const sizes = share === undefined ? undefined : share.items.map((item) => (item === "" ? "auto" : item)).join(" ");
    return {
        ctx,
        list,
        colors,
        share,
        opacity,
        value,
        own: drawnItems(ctx, list.colors).own,
        shares: share === undefined ? [] : listShares(share.channel, sizes, count),
        fail,
    };
}

/**
 * Write every list at once on this layer (one undo step): the colors, and the number lists given or held.
 * @param state - the lists.
 * @param colors - the colors.
 * @param numbers - number lists that change, by channel.
 */
export function writeAll(
    state: ListState,
    colors: readonly string[],
    numbers: Readonly<Partial<Record<Channel, readonly string[]>>> = {},
): void {
    const held = Object.fromEntries(
        [state.share, state.opacity, state.value].flatMap((part) =>
            part === undefined || part.bound ? [] : [[part.channel, part.items]],
        ),
    );
    writeList(state.ctx, state.list, colors, { ...held, ...numbers }).catch(state.fail);
}

/**
 * Move or remove items: `order[newIndex]` is the old index. A layer's own lists move with their item values and
 * bindings (`styles.moveListItems`); lists the layers beneath draw are written whole on this layer in the new order.
 * @param state - the lists.
 * @param order - the old index of each new place.
 */
export function reorder(state: ListState, order: readonly number[]): void {
    const { ctx, colors } = state;
    const layer = lineIn(ctx, colors.channel)?.layer;
    if (state.own && layer !== undefined) {
        const channels = [colors, state.share, state.opacity, state.value].flatMap((part) =>
            part === undefined ? [] : [part.channel],
        );
        Promise.resolve(ctx.session.styles.moveListItems(layer.id, channels, order)).catch(state.fail);
        return;
    }
    const pick = (items: readonly string[]): string[] => order.map((old) => items[old] ?? "");
    writeAll(
        state,
        pick(colors.items),
        Object.fromEntries(
            [state.share, state.opacity, state.value].flatMap((part) =>
                part === undefined || part.bound ? [] : [[part.channel, pick(part.items)]],
            ),
        ),
    );
}

/**
 * The order with one item moved.
 * @param count - how many items.
 * @param from - its place.
 * @param to - its new place.
 * @returns the order.
 */
export function movedOrder(count: number, from: number, to: number): number[] {
    const order = Array.from({ length: count }, (_, at) => at).filter((at) => at !== from);
    order.splice(to, 0, from);
    return order;
}
