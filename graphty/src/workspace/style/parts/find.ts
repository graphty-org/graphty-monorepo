/**
 * What Find a setting matches: every setting of a kind whose name in the panel, item name or other
 * words match the words typed, grouped by part and item.
 */

import type { Channel } from "@graphty/graphty-element/catalog";

import { channelWord, matchesWordStart } from "../words";
import { SEARCH_ALIASES } from "./aliases";
import { itemChannels, PART_WORDS, PARTS } from "./parts";

/**
 * What the panel calls a channel on its own line.
 * @param channel - the channel.
 * @returns the words.
 */
export const partWord = (channel: Channel): string => PART_WORDS[channel] ?? channelWord(channel);

/** One group of results: an item of a part and its matching settings. */
export interface FoundGroup {
    /** "Border", or "Effects - Drop shadow" where the item is named apart from its part. */
    readonly heading: string;
    /** The matching settings, in the item's order. */
    readonly channels: readonly Channel[];
}

/**
 * Every setting of one kind that matches the words: by its name in the panel, its item's name or
 * its other words. Shaders are their section's own list, never a setting here.
 * @param side - nodes or edges.
 * @param query - the words typed.
 * @returns the groups that match, in the panel's order.
 */
export function findSettings(side: "node" | "edge", query: string): readonly FoundGroup[] {
    return PARTS[side]
        .filter((part) => part.id !== "shaders")
        .flatMap((part) =>
            part.items.flatMap((item) => {
                const channels = itemChannels(item).filter((channel) =>
                    [partWord(channel), item.name, ...(SEARCH_ALIASES[channel] ?? [])].some((name) =>
                        matchesWordStart(name, query),
                    ),
                );
                const heading = item.name === part.title ? part.title : `${part.title} - ${item.name}`;
                return channels.length === 0 ? [] : [{ heading, channels }];
            }),
        );
}
