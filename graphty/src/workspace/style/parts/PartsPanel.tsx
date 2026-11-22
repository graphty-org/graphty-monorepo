/**
 * One kind's Style sections by part of the drawing (the file-styles experiment): Shape, Fill,
 * Border, Text, Effects, Order and groups, Visibility and Shaders on nodes; Line, Ends, Text,
 * Route, Effects, Visibility and Shaders on edges. Find a setting sits above them, and "/" with
 * focus in the panel (not in a text field) moves to it. Each part is one
 * section; a part the layer writes nothing in is a closed header with "+", and one it writes
 * carries a dot after its title. Fill and Effects list one heading line per paint or effect the
 * layer sets. A part's common properties are offered by its "+"; the rest are drawn once set,
 * and every one of them is on the part's settings page, opened by its sliders button.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useRef, useState } from "react";

import { cosmographOn } from "../../features";
import { findTreeRow } from "../../graph-place/rows";
import { LabelSection } from "../LabelSection";
import type { RowContext } from "../PropertyRow";
import { Section } from "../Section";
import { experimentChannelsOff, type SectionSpec } from "../words";
import { itemWord, partWord } from "./find";
import { FindSettingBox, FindSettingResults } from "./FindSetting";
import { PartPage } from "./PartPage";
import { itemChannels, partChannels, partsFor, type PartSpec } from "./parts";
import { useFindKey } from "./useFindKey";

/**
 * Every channel the row's layers write, a label style's fields counted as their own channels.
 * @param session - the element's session.
 * @param ctx - the row.
 * @returns the channels.
 */
function writesOf(session: GraphSession, ctx: RowContext): ReadonlySet<Channel> {
    // The element's own base layers are no row of the tree: they write nothing a reader set.
    const tree = session.styles.tree();
    const rows = [...new Set(ctx.layers.map((layer) => layer.row ?? layer.id))].filter(
        (id) => findTreeRow(tree, id) !== undefined,
    );
    return new Set(rows.length === 0 ? [] : session.styles.layersUnder(rows).flatMap((reach) => reach.writes));
}

/**
 * One part as a section of the Style tab.
 * @param part - the part.
 * @param writes - whether the row writes a channel.
 * @returns the section.
 */
function sectionOf(part: PartSpec, writes: (channel: Channel) => boolean): SectionSpec {
    const channels = part.items.flatMap((item) => [...(item.main ?? []), ...(item.tail ?? [])]);
    // A part with no common property (Order and groups) offers its others from "+", so its "+" is never dead.
    const main = part.items.flatMap((item) => item.main ?? []);
    return {
        id: part.id,
        title: part.title,
        channels,
        offer: main.length > 0 ? main : part.items.flatMap((item) => item.tail ?? []),
        configured: part.items.some((item) => itemChannels(item).some(writes)),
        // A list's lines sit under their item's heading, and drop the words it already says.
        words: Object.fromEntries(
            part.items.flatMap((item) =>
                itemChannels(item).map((channel) => [
                    channel,
                    part.list === true ? itemWord(channel, item) : partWord(channel),
                ]),
            ),
        ),
        ...(part.together === true ? { together: part.items.flatMap((item) => item.main ?? []) } : {}),
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
    const [query, setQuery] = useState("");
    const box = useRef<HTMLInputElement>(null);
    const ctx: RowContext = { ...row, pickers: "listbox" };
    // The label lists are Style panel v2's further-label rows (v2/labelEntries.ts): this panel has no line for them.
    const parts = partsFor(
        ctx.side,
        new Set<Channel>([
            ...experimentChannelsOff({ cosmograph: cosmographOn(ctx.session) }),
            "node.labels",
            "edge.labels",
        ]),
    );
    const writes = writesOf(ctx.session, ctx);
    const written = (channel: Channel): boolean => writes.has(channel) || (ctx.many?.count(channel) ?? 0) > 0;
    const onKeyDown = useFindKey(box);
    const page = (part: PartSpec): React.ReactNode =>
        part.id === "shaders" || part.id === "visibility" ? undefined : <PartPage ctx={ctx} part={part} />;
    const itemPage = (part: PartSpec, id: string): React.ReactNode => {
        const item = part.items.find((each) => each.id === id);
        return item === undefined ? undefined : <PartPage ctx={ctx} part={part} item={item} />;
    };
    let body: React.ReactNode = <FindSettingResults ctx={ctx} query={query} parts={parts} />;
    if (query.trim() === "") {
        body = parts.map((part) => {
            if (part.id === "text") {
                return (
                    <LabelSection
                        key={part.id}
                        ctx={ctx}
                        configured={part.items.some((item) => itemChannels(item).some(written))}
                        actions={page(part)}
                        loose={partChannels(part)}
                    />
                );
            }
            const listed = part.list === true ? { itemActions: (id: string) => itemPage(part, id) } : {};
            return <Section key={part.id} ctx={ctx} spec={sectionOf(part, written)} actions={page(part)} {...listed} />;
        });
    }
    return (
        <div // eslint-disable-line jsx-a11y/no-static-element-interactions -- only catches the "/" key bubbling from the panel's own controls
            onKeyDown={onKeyDown}
        >
            <section className="ws-style-group" data-group={ctx.side} data-style-parts="">
                <FindSettingBox query={query} onQuery={setQuery} inputRef={box} />
                {body}
            </section>
        </div>
    );
}
