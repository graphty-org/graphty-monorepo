/**
 * @file Reordering or removing items of parallel list channels on one layer (`styles.moveListItems`): the lists
 * themselves, and every item value and item binding (`node.stripeColors.1`) moved to its item's new place.
 */

import { readChannelList, writeChannelList } from "../../catalog/channelValues";
import type { Channel, LayerSpec } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { listItemAddress, parseListItemAddress } from "./channels";
import type { Layer } from "./Layer";

/**
 * The patch that moves list items: `order[newIndex]` is the old index of the item that goes there; an old index left
 * out is removed.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @param channels - The parallel list channels.
 * @param order - The old index of each new place.
 * @returns The patch: the layer's whole `set` and `encode`.
 */
export function moveListItemsPatch(
    layer: Layer | undefined,
    channels: readonly Channel[],
    order: readonly number[],
): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }
    const bad = channels.find((channel) => parseListItemAddress(listItemAddress(channel, 0)) === null);
    if (
        bad !== undefined ||
        order.some((at) => !Number.isInteger(at) || at < 0) ||
        new Set(order).size !== order.length
    ) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                bad === undefined
                    ? "An order lists each old index once, as whole numbers from 0."
                    : `${bad} is not a list channel.`,
            source: "style",
            details: { id: layer.id, reason: bad === undefined ? "bad-order" : "not-a-list", channels, order },
        });
    }
    const newPlace = new Map(order.map((old, place) => [old, place]));
    const listed = new Set<string>(channels);
    const moveItems = <T>(held: Readonly<Record<string, T>> | undefined): Record<string, T> => {
        const out: Record<string, T> = {};
        for (const [key, value] of Object.entries(held ?? {})) {
            const target = parseListItemAddress(key);
            if (target === null || !listed.has(target.channel)) {
                out[key] = value;
                continue;
            }
            const place = newPlace.get(target.index);
            if (place !== undefined) {
                out[listItemAddress(target.channel, place)] = value;
            }
        }
        return out;
    };
    const set = moveItems(layer.set as Readonly<Record<string, unknown>> | undefined);
    for (const channel of channels) {
        const value = (layer.set as Readonly<Record<string, unknown>> | undefined)?.[channel];
        if (typeof value === "string") {
            const items = readChannelList(channel, value, { keepPlace: true });
            const moved = order.map((old) => items[old]);
            while (moved.length > 0 && moved.at(-1) === undefined) {
                moved.pop();
            }
            set[channel] = writeChannelList(channel, moved);
        }
    }
    return {
        set,
        encode: moveItems(layer.encode),
    };
}
