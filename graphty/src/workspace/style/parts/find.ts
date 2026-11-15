/**
 * What Find a setting matches, and what the panel by part calls each setting: every setting of a
 * kind whose name in the panel, item name or other words match the words typed, grouped by part
 * and item.
 */

import { type Channel, channelsFor } from "@graphty/graphty-element/catalog";

import { channelWord, matchesWordStart } from "../words";
import { SEARCH_ALIASES } from "./aliases";
import { itemChannels, PART_WORDS, type PartItem, PARTS, type PartSpec } from "./parts";

/**
 * The panel's words for settings whose own names use words it uses nowhere else: the middle
 * arrowheads are ends like the others, and the words at an edge's ends are its captions.
 */
const RENAMED: readonly (readonly [from: string, to: string])[] = [
    ["Arrow middle head", "Middle target end"],
    ["Arrow middle tail", "Middle source end"],
    ["Label at target end", "Target caption"],
    ["Label at source end", "Source caption"],
];

/**
 * What the panel calls a channel on its own line.
 * @param channel - the channel.
 * @returns the words.
 */
export function partWord(channel: Channel): string {
    const own = PART_WORDS[channel];
    if (own !== undefined) {
        return own;
    }
    const word = channelWord(channel);
    const renamed = RENAMED.find(([from]) => word === from || word.startsWith(`${from} `));
    return renamed === undefined ? word : `${renamed[1]}${word.slice(renamed[0].length)}`;
}

/** A setting named by its item alone ("Halo" under Halo), named by what it takes instead. */
const TAKES_WORDS: Readonly<Partial<Record<string, string>>> = {
    color: "Color",
    boolean: "On",
    text: "Text",
    enum: "Kind",
};

/**
 * What the panel calls a channel under its item's heading, where the item is already said: "Blur"
 * under Drop shadow, "Color" under Halo, so no two settings of an item read alike.
 * @param channel - the channel.
 * @param item - its item.
 * @returns the words.
 */
export function itemWord(channel: Channel, item: PartItem): string {
    const word = partWord(channel);
    const prefix = (item.prefix ?? item.name).toLowerCase();
    if (word.toLowerCase() === prefix) {
        const side = channel.startsWith("node.") ? "node" : "edge";
        const takes = channelsFor(side).find((each) => each.channel === channel)?.accepts;
        return (takes === undefined ? undefined : TAKES_WORDS[takes]) ?? word;
    }
    if (!word.toLowerCase().startsWith(`${prefix} `)) {
        return word;
    }
    const rest = word.slice(prefix.length + 1);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** One group of results: an item of a part and its matching settings. */
export interface FoundGroup {
    /** "Border", or "Effects - Drop shadow" where the item is named apart from its part. */
    readonly heading: string;
    /** The item. */
    readonly item: PartItem;
    /** The matching settings, in the item's order. */
    readonly channels: readonly Channel[];
}

/**
 * Every setting of one kind that matches the words: by its name in the panel, its item's name or
 * its other words. Shaders are their section's own list, never a setting here.
 * @param side - nodes or edges.
 * @param query - the words typed.
 * @param parts - the kind's parts, as the panel draws them (without an experiment's that is off).
 * @returns the groups that match, in the panel's order.
 */
export function findSettings(
    side: "node" | "edge",
    query: string,
    parts: readonly PartSpec[] = PARTS[side],
): readonly FoundGroup[] {
    return parts
        .filter((part) => part.id !== "shaders")
        .flatMap((part) =>
            part.items.flatMap((item) => {
                const channels = itemChannels(item).filter((channel) =>
                    [partWord(channel), channelWord(channel), item.name, ...(SEARCH_ALIASES[channel] ?? [])].some(
                        (name) => matchesWordStart(name, query),
                    ),
                );
                const heading = item.name === part.title ? part.title : `${part.title} - ${item.name}`;
                return channels.length === 0 ? [] : [{ heading, item, channels }];
            }),
        );
}
