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

import { findTreeRow } from "../../graph-place/rows";
import { isTypingTarget } from "../../keys/keys";
import { useWorkspace } from "../../state/WorkspaceContext";
import { LabelSection } from "../LabelSection";
import type { RowContext } from "../PropertyRow";
import { Section } from "../Section";
import type { SectionSpec } from "../words";
import { FindSettingBox, FindSettingResults } from "./FindSetting";
import { PartPage } from "./PartPage";
import { itemChannels, PART_WORDS, PARTS, type PartSpec } from "./parts";

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
    const channels = part.items.flatMap((item) => [...(item.main ?? []), ...(item.tail ?? []), ...(item.quiet ?? [])]);
    return {
        id: part.id,
        title: part.title,
        channels,
        offer: part.items.flatMap((item) => item.main ?? []),
        quiet: part.items.flatMap((item) => item.quiet ?? []),
        configured: part.items.some((item) => itemChannels(item).some(writes)),
        words: PART_WORDS,
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
    const { store } = useWorkspace();
    const [query, setQuery] = useState("");
    const box = useRef<HTMLInputElement>(null);
    const ctx: RowContext = { ...row, pickers: "listbox" };
    const writes = writesOf(ctx.session, ctx);
    const written = (channel: Channel): boolean => writes.has(channel) || (ctx.many?.count(channel) ?? 0) > 0;
    // "/" in the panel, outside a text field, is Find a setting's: the graph's Find keeps it elsewhere.
    const onKeyDown = (event: React.KeyboardEvent): void => {
        const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
        if (event.key !== "/" || !plain || isTypingTarget(event.target) || !store.get().singleKeyShortcuts) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        box.current?.focus();
    };
    const page = (part: PartSpec): React.ReactNode =>
        part.id === "shaders" || part.id === "visibility" ? undefined : <PartPage ctx={ctx} part={part} />;
    const itemPage =
        (part: PartSpec) =>
        (id: string): React.ReactNode => {
            const item = part.items.find((each) => each.id === id);
            return item === undefined ? undefined : <PartPage ctx={ctx} part={part} item={item} />;
        };
    return (
        // NOSONAR(S6848): only catches the "/" key bubbling from the panel's own controls
        <div onKeyDown={onKeyDown}>
            <section className="ws-style-group" data-group={ctx.side} data-style-parts="">
                <FindSettingBox query={query} onQuery={setQuery} inputRef={box} />
                {query.trim() === "" ? (
                    PARTS[ctx.side].map((part) =>
                        part.id === "text" ? (
                            <LabelSection
                                key={part.id}
                                ctx={ctx}
                                configured={part.items.some((item) => itemChannels(item).some(written))}
                                actions={page(part)}
                            />
                        ) : (
                            <Section
                                key={part.id}
                                ctx={ctx}
                                spec={sectionOf(part, written)}
                                actions={page(part)}
                                {...(part.list === true ? { itemActions: itemPage(part) } : {})}
                            />
                        ),
                    )
                ) : (
                    <FindSettingResults ctx={ctx} query={query} />
                )}
            </section>
        </div>
    );
}
