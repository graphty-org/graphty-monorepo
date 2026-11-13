/**
 * One kind's Style sections by part of the drawing (the file-styles experiment): Shape, Fill,
 * Border, Text, Effects, Order and groups, Visibility and Shaders on nodes. Each part is one
 * section; a part the layer writes nothing in is a closed header with "+", and one it writes
 * carries a dot after its title. Fill and Effects list one heading line per paint or effect the
 * layer sets. A part's common properties are offered by its "+"; the rest are drawn once set.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import React from "react";

import { LabelSection } from "../LabelSection";
import type { RowContext } from "../PropertyRow";
import { Section } from "../Section";
import type { SectionSpec } from "../words";
import { itemChannels, PART_WORDS, PARTS, type PartSpec } from "./parts";

/**
 * Every channel the row's layers write, a label style's fields counted as their own channels.
 * @param session - the element's session.
 * @param ctx - the row.
 * @returns the channels.
 */
function writesOf(session: GraphSession, ctx: RowContext): ReadonlySet<Channel> {
    const rows = [...new Set(ctx.layers.map((layer) => layer.row ?? layer.id))];
    return new Set(rows.length === 0 ? [] : session.styles.layersUnder(rows).flatMap((reach) => reach.writes));
}

/**
 * One part as a section of the Style tab.
 * @param part - the part.
 * @param writes - whether the row writes a channel.
 * @returns the section.
 */
function sectionOf(part: PartSpec, writes: (channel: Channel) => boolean): SectionSpec {
    const channels = part.items.flatMap((item) => [...(item.main ?? []), ...(item.tail ?? []), ...(item.quiet ?? [])]);
    return {
        id: part.id,
        title: part.title,
        channels,
        offer: part.items.flatMap((item) => item.main ?? []),
        quiet: part.items.flatMap((item) => item.quiet ?? []),
        configured: part.items.some((item) => itemChannels(item).some(writes)),
        words: PART_WORDS,
        ...(part.id === "shaders" ? { shaders: true } : {}),
        ...(part.list === true
            ? {
                  items: part.items.map((item) => ({
                      id: item.id,
                      name: item.name,
                      channels: [...(item.main ?? []), ...(item.tail ?? [])],
                  })),
              }
            : {}),
    };
}

/**
 * One kind's sections by part of the drawing: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @returns The sections
 */
export function PartsPanel({ ctx: row }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const ctx: RowContext = { ...row, pickers: "listbox" };
    const writes = writesOf(ctx.session, ctx);
    const written = (channel: Channel): boolean => writes.has(channel) || (ctx.many?.count(channel) ?? 0) > 0;
    return (
        <section className="ws-style-group" data-group={ctx.side} data-style-parts="">
            {PARTS[ctx.side].map((part) =>
                part.id === "text" ? (
                    <LabelSection key={part.id} ctx={ctx} />
                ) : (
                    <Section key={part.id} ctx={ctx} spec={sectionOf(part, written)} />
                ),
            )}
        </section>
    );
}
