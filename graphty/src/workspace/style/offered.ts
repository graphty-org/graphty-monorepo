/**
 * The style channels the Style tab offers: the ones the element's session offers
 * (`session.catalog.channels`), which leave out what an experiment the element has off adds. A
 * channel a layer already sets is still drawn, as graphty-element ships it, so the reader can see
 * and remove it.
 */

import { type Channel, type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";

/**
 * The channels the session offers for one kind of element.
 * @param session - the element's session, or null before it comes up.
 * @param side - nodes or edges.
 * @returns the channels, in the element's order.
 */
function offeredChannels(
    session: Pick<GraphSession, "catalog"> | null | undefined,
    side: "node" | "edge",
): readonly ChannelDescriptor[] {
    return session?.catalog.channels(side) ?? channelsFor(side);
}

/**
 * One channel as the session offers it.
 * @param session - the element's session, or null before it comes up.
 * @param side - nodes or edges.
 * @param channel - the channel.
 * @returns its descriptor, or undefined when the session does not offer it.
 */
export function offeredChannel(
    session: Pick<GraphSession, "catalog"> | null | undefined,
    side: "node" | "edge",
    channel: Channel,
): ChannelDescriptor | undefined {
    return offeredChannels(session, side).find((d) => d.channel === channel);
}

/**
 * One channel as the Style tab draws it: as the session offers it, else, when a layer already
 * sets it, as graphty-element ships it.
 * @param session - the element's session, or null before it comes up.
 * @param side - nodes or edges.
 * @param channel - the channel.
 * @param held - whether a layer already sets it.
 * @returns its descriptor, or undefined when it is neither offered nor held.
 */
export function shownChannel(
    session: Pick<GraphSession, "catalog"> | null | undefined,
    side: "node" | "edge",
    channel: Channel,
    held: boolean,
): ChannelDescriptor | undefined {
    return (
        offeredChannel(session, side, channel) ??
        (held ? channelsFor(side).find((d) => d.channel === channel) : undefined)
    );
}
