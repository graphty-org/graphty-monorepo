/**
 * A part's settings page (the file-styles experiment): the sliders button on a part's header, or
 * on a list item's heading, opens every setting of the part or item, set or not. A set one is its
 * ordinary line with its minus; an unset one is its name and a "+" that adds its line, waiting for
 * a value. A text item's label settings sit on named pages (Type, Box, Place, Wrap, View). Find a
 * setting draws its results with the same lines.
 */

import { SegmentedControl } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/catalog";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../../glyphs";
import { SettingsPopout } from "../../options/SettingsPopout";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { Field, type RowContext } from "../PropertyRow";
import { lineIn, partlySet } from "../row";
import { WireframeRow } from "../Section";
import { writeWireframe } from "../shaderSlots";
import { focusLineNext } from "../useFocusLine";
import { failureWords } from "../words";
import { itemWord, partWord } from "./find";
import type { PartItem, PartSpec } from "./parts";

/**
 * One setting as a line: its field when the row sets it or it waits for a value, else its name
 * and a "+" that adds it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the setting
 * @param props.word - its name on the line, where its item is already said ("Blur" under Drop shadow)
 * @returns The line, or nothing for a setting the element does not offer here
 */
export function ChannelLine({
    ctx,
    channel,
    word = partWord(channel),
}: Readonly<{ ctx: RowContext; channel: Channel; word?: string }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const [waiting, setWaiting] = useState(false);
    const held = lineIn(ctx, channel) !== undefined || partlySet(ctx, channel) !== undefined;
    const descriptor = shownChannel(ctx.session, ctx.side, channel, held);
    if (descriptor?.renderable !== true) {
        return null;
    }
    if (channel === "node.wireframe" && held) {
        return <WireframeRow ctx={ctx} />;
    }
    if (held || waiting) {
        return (
            <Field
                ctx={ctx}
                descriptor={descriptor}
                word={word}
                pending={!held}
                onCancel={() => {
                    setWaiting(false);
                }}
            />
        );
    }
    // Named in full, as it is away from its item's heading: "Add node shadow blur".
    const label = `Add ${ctx.side} ${partWord(channel).toLowerCase()}`;
    const add = (): void => {
        focusLineNext(ctx.session, channel);
        if (channel === "node.wireframe") {
            writeWireframe(ctx, true).catch((error: unknown) => {
                store.set({ notice: { message: failureWords(partWord(channel), "added", error), error: true } });
            });
            return;
        }
        setWaiting(true);
        store.set({ announcement: `${partWord(channel)} added: pick a value` });
    };
    return (
        // Not a `data-line`: focus asked for the line "+" adds goes to its field, never to this "+".
        <div className="ws-row" data-unset-line={channel}>
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" title={word}>
                        {word}
                    </span>
                </span>
                <div className="ws-field-control" />
                <span className="ws-slot" />
                <span className="ws-slot">
                    <Tooltip label={label} position="top">
                        <ActionIcon variant="subtle" size="sm" aria-label={label} onClick={add}>
                            <GLYPHS.add size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
        </div>
    );
}

/**
 * One item's settings: its own, then, for a text item, the page picked of its named pages.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.item - the item
 * @param props.named - whether to head it with its name (a page of several items)
 * @returns The settings
 */
function ItemSettings({
    ctx,
    item,
    named,
}: Readonly<{ ctx: RowContext; item: PartItem; named: boolean }>): React.JSX.Element {
    const pages = Object.keys(item.pages ?? {});
    const [page, setPage] = useState(pages[0] ?? "");
    const own = [...(item.main ?? []), ...(item.tail ?? []), ...(item.quiet ?? [])];
    return (
        <div data-item-settings={item.id}>
            {named ? (
                <Text size="xs" fw={600} px={8} pt={8}>
                    {item.name}
                </Text>
            ) : null}
            {own.map((channel) => (
                <ChannelLine key={channel} ctx={ctx} channel={channel} word={itemWord(channel, item)} />
            ))}
            {pages.length === 0 ? null : (
                <>
                    <SegmentedControl
                        label={`${item.name} settings page`}
                        size="xs"
                        fullWidth
                        value={page}
                        data={pages}
                        onChange={setPage}
                    />
                    {(item.pages?.[page] ?? []).map((channel) => (
                        <ChannelLine key={channel} ctx={ctx} channel={channel} word={itemWord(channel, item)} />
                    ))}
                </>
            )}
        </div>
    );
}

/**
 * A part's, or one of its items', sliders button and settings page.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.part - the part
 * @param props.item - one item of a list part; absent for the whole part
 * @returns The button and its page
 */
export function PartPage({
    ctx,
    part,
    item,
}: Readonly<{ ctx: RowContext; part: PartSpec; item?: PartItem }>): React.JSX.Element {
    const kind = ctx.side === "node" ? "Node" : "Edge";
    const title = `${kind} ${(item?.name ?? part.title).toLowerCase()}`;
    const items = item === undefined ? part.items : [item];
    return (
        <SettingsPopout label={`${title} settings`} title={title} icon={<GLYPHS.sliders size={14} aria-hidden />}>
            {items.map((each) => (
                <ItemSettings key={each.id} ctx={ctx} item={each} named={items.length > 1} />
            ))}
        </SettingsPopout>
    );
}
