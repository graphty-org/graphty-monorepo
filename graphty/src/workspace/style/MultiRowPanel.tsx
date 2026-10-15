import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer, LayerReach, StyleRow } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React, { useState } from "react";

import { count, findTreeRow, type FoundRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import type { BeneathValue, BulkReceipt, ManyRows, RowContext } from "./PropertyRow";
import {
    beneathOf,
    type DataBinding,
    type Line,
    lineOf,
    type LiteralWrite,
    rowLayers,
    type Target,
    without,
} from "./row";
import { SelectionColors } from "./SelectionColors";
import { RowStyle, StateLine } from "./StylePanel";
import { useStyleVersion } from "./useStyleVersion";

/** One value or binding written to a channel. */
type Write = LiteralWrite | { readonly binding: DataBinding };

/** What the last write did, and the rows it left unset, so "Also set those" can write them. */
interface LastWrite extends BulkReceipt {
    readonly side: Target;
    readonly channel: Channel;
    readonly write: Write;
    /** The rows that did not set the channel and were left out. */
    readonly left: readonly string[];
}

/**
 * The patch that writes one value or binding to a layer, as `writeLine` writes a row's own.
 * @param layer - the layer.
 * @param channel - the channel.
 * @param write - the value or the binding.
 * @returns the patch.
 */
function patchOf(layer: Layer, channel: Channel, write: Write): Pick<Layer, "set" | "encode"> {
    if ("value" in write && (write.combine === undefined || write.combine === "replace")) {
        return { set: { ...layer.set, [channel]: write.value }, encode: without(layer.encode, channel) };
    }
    const encoded = "binding" in write ? write.binding : { value: write.value, combine: write.combine };
    return { set: without(layer.set, channel), encode: { ...layer.encode, [channel]: encoded } };
}

/** What several rows edited together need beyond the rows: the locked count and the receipt. */
interface Bulk {
    readonly locked: number;
    readonly last: LastWrite | null;
    readonly setLast: (last: LastWrite | null) => void;
}

/**
 * How several rows read and write one kind's channels together: a value they all write alike, or
 * Mixed; a write goes, as one undo step (`styles.updateMany`), to the rows that already set the
 * channel, or to every row when none does; a receipt says what it did and offers to set the rest.
 * @param session - the element's session.
 * @param all - the unlocked rows; a kind reads only those that paint it.
 * @param side - nodes or edges.
 * @param bulk - the locked count and the last write.
 * @returns the reader, the writer, and what lies beneath when none of them writes a channel.
 */
function manyOf(
    session: GraphSession,
    all: readonly FoundRow[],
    side: Target,
    bulk: Bulk,
): Pick<RowContext, "many" | "beneath"> {
    const layersOf = (row: FoundRow): Layer[] => rowLayers(session, [...treeLayers(session, row.row.id)], side);
    const rows = all.filter((row) => layersOf(row).length > 0);
    const lineOfRow = (row: FoundRow, channel: Channel): Line | undefined => {
        const line = lineOf(layersOf(row), channel);
        return line?.layer.locked === true ? undefined : line;
    };
    const linesOf = (channel: Channel): (Line | undefined)[] => rows.map((row) => lineOfRow(row, channel));
    // Where a row takes a write: the layer that already sets the channel, else its topmost layer.
    const homeOf = (row: FoundRow, channel: Channel): Layer | undefined =>
        lineOfRow(row, channel)?.layer ??
        layersOf(row)
            .filter((layer) => !layer.locked)
            .at(-1);
    const key = (line: Line | undefined): string =>
        line === undefined ? "" : JSON.stringify([line.value, line.binding, line.combine]);
    const writeRows = (
        targets: readonly FoundRow[],
        channel: Channel,
        write: Write,
    ): ReturnType<typeof session.styles.updateMany> =>
        session.styles.updateMany(
            targets.flatMap((row) => {
                const layer = homeOf(row, channel);
                return layer === undefined ? [] : [{ id: layer.id, patch: patchOf(layer, channel, write) }];
            }),
        );
    // Beneath the lowest of them in paint order, so no selected row reads as beneath another.
    const stack = session.styles.list().map((layer) => layer.id);
    const lowest = [...rows].sort(
        (a, b) =>
            stack.indexOf(treeLayers(session, a.row.id)[0] ?? "") -
            stack.indexOf(treeLayers(session, b.row.id)[0] ?? ""),
    )[0]?.row.id;
    const below = beneathOf(session, lowest);
    const last = bulk.last?.side === side ? bulk.last : null;
    const many: ManyRows = {
        line: (channel) => {
            const lines = linesOf(channel);
            return lines.every((line) => line !== undefined && key(line) === key(lines[0])) ? lines[0] : undefined;
        },
        count: (channel) => linesOf(channel).filter((line) => line !== undefined).length,
        of: rows.length,
        write: async (channel, write) => {
            const lines = linesOf(channel);
            const setting = rows.filter((_, at) => lines[at] !== undefined);
            // The write rule: only the rows that already set it, unless none does.
            const targets = setting.length > 0 ? setting : rows;
            const left = rows.filter((row) => !targets.includes(row));
            const result = await writeRows(targets, channel, write);
            bulk.setLast({
                side,
                channel,
                write,
                changed: result.updated.length,
                unset: left.map((row) => row.row.name),
                left: left.map((row) => row.row.id),
                locked: bulk.locked + result.skipped.length,
            });
        },
        clear: async (channel) =>
            await session.styles.updateMany(
                rows.flatMap((row) => {
                    const layer = lineOfRow(row, channel)?.layer;
                    return layer === undefined
                        ? []
                        : [
                              {
                                  id: layer.id,
                                  patch: { set: without(layer.set, channel), encode: without(layer.encode, channel) },
                              },
                          ];
                }),
                { keepEmpty: true },
            ),
        breakdown: (channel) => {
            const lines = linesOf(channel);
            return {
                set: rows.filter((_, at) => lines[at] !== undefined).map((row) => row.row.name),
                unset: rows.filter((_, at) => lines[at] === undefined).map((row) => row.row.name),
                values: new Set(lines.filter((line) => line !== undefined).map(key)).size,
            };
        },
        receipt: (channel) => (last?.channel === channel ? last : undefined),
        alsoSet: async (channel) => {
            if (last?.channel !== channel) {
                return;
            }
            const targets = rows.filter((row) => last.left.includes(row.row.id));
            const result = await writeRows(targets, channel, last.write);
            bulk.setLast({ ...last, changed: last.changed + result.updated.length, unset: [], left: [] });
        },
        dismiss: () => {
            bulk.setLast(null);
        },
    };
    // What "+" starts a property from: what lies beneath the lowest of them.
    const beneath = (channel: Channel): BeneathValue => below(channel);
    return { many, beneath };
}

/**
 * A tree row's layers: both parts of a two-kind row.
 * @param session - the element's session.
 * @param id - the layer row.
 * @returns the layer ids.
 */
function treeLayers(session: GraphSession, id: string): string[] {
    const parts = session.styles.parts(id);
    return parts === undefined ? [] : [parts.node, parts.edge].filter((layer): layer is string => layer !== undefined);
}

/**
 * The scope line: how many layers an edit reaches and what it leaves alone. "12 layers in Louvain:
 * 2 in Fantine's, 2 hidden, 1 locked and skipped. Layers added later are not changed."
 * @param tree - the style tree.
 * @param picked - the rows picked: layer rows and folders.
 * @param reach - the layer rows they reach.
 * @returns the words.
 */
function scopeWords(tree: readonly StyleRow[], picked: readonly FoundRow[], reach: readonly LayerReach[]): string {
    const folders = picked.filter((row) => row.row.kind === "folder");
    const single = picked.length === 1 && folders.length === 1 ? folders[0].row : undefined;
    const head =
        single === undefined ? count(reach.length, "layer") : `${count(reach.length, "layer")} in ${single.name}`;
    // Layers inside a folder nested in what was picked, by that folder's name.
    const nested = new Map<string, number>();
    for (const each of reach) {
        const found = findTreeRow(tree, each.row);
        const holder = found?.folders.at(-1);
        const top = picked.some((row) => row.row.id === holder?.id || row.row.id === each.row);
        if (holder !== undefined && !top) {
            nested.set(holder.name, (nested.get(holder.name) ?? 0) + 1);
        }
    }
    const hidden = reach.filter((row) => row.hidden).length;
    const locked = reach.filter((row) => row.locked).length;
    const parts = [
        ...[...nested].map(([name, n]) => `${String(n)} in ${name}`),
        ...(hidden === 0 ? [] : [`${String(hidden)} hidden`]),
        ...(locked === 0 ? [] : [`${String(locked)} locked and skipped`]),
    ];
    const later = folders.length > 0 ? " Layers added later are not changed." : "";
    return `${head}${parts.length === 0 ? "" : `: ${parts.join(", ")}`}.${later}`;
}

/**
 * The panel of several rows, or of a folder (B4, bulk editing): a scope line saying how many layers
 * an edit reaches -- through folders at every depth -- and which it skips; a group for each kind
 * the reached rows paint, each field holding the value they share or Mixed, which takes a typed
 * or picked value; every write reaching, in one undo step, the rows that already set the property
 * (all of them when none does), with a receipt under the field; then their Selection colors.
 * @param props - Component props
 * @param props.ids - the rows' ids: layer rows and folders, top first
 * @returns The panel
 */
export function MultiRowPanel({ ids }: Readonly<{ ids: readonly string[] }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const [last, setLast] = useState<LastWrite | null>(null);
    if (session === null) {
        return null;
    }
    const tree = session.styles.tree();
    const picked = ids.flatMap((id) => findTreeRow(tree, id) ?? []);
    if (picked.length === 0) {
        return <StateLine>These rows are gone</StateLine>;
    }
    const reach = session.styles.layersUnder(picked.map((row) => row.row.id));
    const open = reach.filter((row) => !row.locked).flatMap((row) => findTreeRow(tree, row.row) ?? []);
    const locked = reach.filter((row) => row.locked).length;
    const sides = (["node", "edge"] as const).filter((side) =>
        open.some((row) => rowLayers(session, treeLayers(session, row.row.id), side).length > 0),
    );
    const layerIds = open.flatMap((row) => treeLayers(session, row.row.id));
    const bulk: Bulk = { locked, last, setLast };
    return (
        <Stack gap={0}>
            <StateLine id="ws-bulk-scope">{scopeWords(tree, picked, reach)}</StateLine>
            {sides.length > 0 && (
                <RowStyle
                    key={layerIds.join(" ")}
                    session={session}
                    row={layerIds}
                    sides={sides}
                    many={(side) => manyOf(session, open, side, bulk)}
                />
            )}
            <SelectionColors rowIds={picked.map((row) => row.row.id)} />
        </Stack>
    );
}
