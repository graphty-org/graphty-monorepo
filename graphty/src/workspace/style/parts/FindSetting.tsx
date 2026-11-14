/**
 * Find a setting (the file-styles experiment): a search box at the top of the Style tab whose key,
 * "/", is drawn in it. Typing replaces the parts with every setting whose name, item or other
 * words (`SEARCH_ALIASES`: "stroke" for a border) match, grouped by part and item: a set one with
 * its minus, an unset one with "+". Each says which other layers of the graph set it, and opens
 * one with a click.
 */

import { SearchInput } from "@graphty/compact-mantine";
import type { GraphSession, LayerReach, StyleRow } from "@graphty/graphty-element/session";
import { Button, Kbd, Text } from "@mantine/core";
import React from "react";

import { rowName } from "../../graph-place/rows";
import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { findSettings, itemWord } from "./find";
import { ChannelLine } from "./PartPage";
import type { PartSpec } from "./parts";

/** The search box's accessible name and placeholder. */
const FIND_SETTING = "Find a setting";

/**
 * Every layer row of the style tree.
 * @param rows - the tree's rows.
 * @returns the layer rows' ids.
 */
function layerRows(rows: readonly StyleRow[]): string[] {
    return rows.flatMap((row) => (row.kind === "layer" ? [row.id] : layerRows(row.children)));
}

/**
 * The search box.
 * @param props - Component props
 * @param props.query - the words typed
 * @param props.onQuery - called with new words
 * @param props.inputRef - the box, for the "/" key
 * @returns The box
 */
export function FindSettingBox({
    query,
    onQuery,
    inputRef,
}: Readonly<{
    query: string;
    onQuery: (query: string) => void;
    inputRef: React.Ref<HTMLInputElement>;
}>): React.JSX.Element {
    return (
        <div className="ws-row ws-find-setting">
            <SearchInput
                ref={inputRef}
                value={query}
                onChange={onQuery}
                placeholder={FIND_SETTING}
                aria-label={FIND_SETTING}
                aria-keyshortcuts="/"
                // Always given (null while typing): the field wraps its input only when it has one, so
                // dropping it would mount a new input and lose the keys typed after the first.
                rightSection={query === "" ? <Kbd size="xs">/</Kbd> : null}
            />
        </div>
    );
}

/**
 * The layers other than the row's own that write a setting, as buttons that open them.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.others - the other layer rows that write it
 * @returns The line, or nothing when no other layer writes it
 */
function AlsoSetBy({
    session,
    others,
}: Readonly<{ session: GraphSession; others: readonly LayerReach[] }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    if (others.length === 0) {
        return null;
    }
    return (
        <Text size="xs" c="dimmed" className="ws-also-set">
            Also set by{" "}
            {others.map((reach) => {
                const name = rowName(session, reach.row);
                return (
                    <Button
                        key={reach.row}
                        variant="subtle"
                        size="compact-xs"
                        aria-label={`Open ${name}`}
                        onClick={() => {
                            store.set({ inspected: { kind: "layer-row", id: reach.row } });
                        }}
                    >
                        {name}
                    </Button>
                );
            })}
        </Text>
    );
}

/**
 * The results that replace the parts while words are typed.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.query - the words typed
 * @param props.parts - the kind's parts, as the panel draws them
 * @returns The results
 */
export function FindSettingResults({
    ctx,
    query,
    parts,
}: Readonly<{ ctx: RowContext; query: string; parts: readonly PartSpec[] }>): React.JSX.Element {
    const { session } = ctx;
    const own = new Set(ctx.layers.map((layer) => layer.row ?? layer.id));
    const rows = layerRows(session.styles.tree()).filter((id) => !own.has(id));
    const reaches = rows.length === 0 ? [] : session.styles.layersUnder(rows);
    const groups = findSettings(ctx.side, query, parts);
    return (
        <div data-find-results="">
            {groups.length === 0 ? (
                <Text size="xs" c="dimmed" py={4}>
                    No setting matches
                </Text>
            ) : null}
            {groups.map((group) => (
                <div key={group.heading} data-find-group="">
                    <Text size="xs" fw={600} pt={8}>
                        {group.heading}
                    </Text>
                    {group.channels.map((channel) => (
                        <div key={channel} data-result={channel}>
                            <ChannelLine ctx={ctx} channel={channel} word={itemWord(channel, group.item)} />
                            <AlsoSetBy
                                session={session}
                                others={reaches.filter((reach) => reach.writes.includes(channel))}
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
