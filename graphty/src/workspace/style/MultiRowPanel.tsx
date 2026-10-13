import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React from "react";

import { findTreeRow, type FoundRow, isLocked, rowLayers as treeRowLayers } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import type { BeneathValue, ManyRows, RowContext } from "./PropertyRow";
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
import { channelWord } from "./words";

/**
 * The patch that writes one value or binding to a layer, as `writeLine` writes a row's own.
 * @param layer - the layer.
 * @param channel - the channel.
 * @param write - the value or the binding.
 * @returns the patch.
 */
function patchOf(
    layer: Layer,
    channel: Channel,
    write: LiteralWrite | { readonly binding: DataBinding },
): Pick<Layer, "set" | "encode"> {
    if ("value" in write && (write.combine === undefined || write.combine === "replace")) {
        return { set: { ...layer.set, [channel]: write.value }, encode: without(layer.encode, channel) };
    }
    const encoded = "binding" in write ? write.binding : { value: write.value, combine: write.combine };
    return { set: without(layer.set, channel), encode: { ...layer.encode, [channel]: encoded } };
}

/**
 * How several rows read and write one kind's channels together: a value they all write alike, or
 * "Mixed" naming the rows that write it when they differ; and writes that reach each row's
 * topmost layer of that kind in one `session.transaction`, so one Undo takes them all back.
 * @param session - the element's session.
 * @param all - the rows written, each unlocked; a kind reads only those that paint it.
 * @param side - nodes or edges.
 * @returns the reader, the writer, and what lies beneath when none of them writes a channel.
 */
function manyOf(session: GraphSession, all: readonly FoundRow[], side: Target): Pick<RowContext, "many" | "beneath"> {
    const layersOf = (row: FoundRow): Layer[] => rowLayers(session, treeRowLayers(session, row.row.id), side);
    // Only the rows that paint this kind read and take its fields.
    const rows = all.filter((row) => layersOf(row).length > 0);
    const linesOf = (channel: Channel): (Line | undefined)[] =>
        rows.map((row) => {
            const line = lineOf(layersOf(row), channel);
            return line?.layer.locked === true ? undefined : line;
        });
    const homes = (): Layer[] =>
        rows.flatMap(
            (row) =>
                layersOf(row)
                    .filter((layer) => !layer.locked)
                    .at(-1) ?? [],
        );
    const key = (line: Line | undefined): string =>
        line === undefined ? "" : JSON.stringify([line.value, line.binding, line.combine]);
    // Beneath the lowest of them in paint order, so no selected row reads as beneath another.
    const stack = session.styles.list().map((layer) => layer.id);
    const lowest = [...rows].sort(
        (a, b) =>
            stack.indexOf(treeRowLayers(session, a.row.id)[0] ?? "") -
            stack.indexOf(treeRowLayers(session, b.row.id)[0] ?? ""),
    )[0]?.row.id;
    const below = beneathOf(session, lowest);
    const many: ManyRows = {
        line: (channel) => {
            const lines = linesOf(channel);
            return lines.every((line) => line !== undefined && key(line) === key(lines[0])) ? lines[0] : undefined;
        },
        write: (channel, write) =>
            session.transaction(`Change ${channelWord(channel)}`, async (tx) => {
                for (const layer of homes()) {
                    await tx.styles.update(layer.id, patchOf(layer, channel, write));
                }
            }),
        clear: (channel) =>
            session.transaction(`Clear ${channelWord(channel)}`, async (tx) => {
                for (const layer of homes()) {
                    await tx.styles.update(layer.id, {
                        set: without(layer.set, channel),
                        encode: without(layer.encode, channel),
                    });
                }
            }),
    };
    const beneath = (channel: Channel): BeneathValue => {
        const lines = linesOf(channel);
        if (lines.every((line) => line === undefined)) {
            return below(channel);
        }
        // Some write it and they differ, or some leave it to what lies beneath: "Mixed".
        return { words: { mixed: rows.filter((_, i) => lines[i] !== undefined).map((row) => row.row.name) } };
    };
    return { many, beneath };
}

/**
 * The panel of several rows selected together (tier3 design, section 2.2), headed "N layers" by
 * the inspector: a line naming any locked row, which is left out of every write; a group for each
 * kind any of the other rows paints, with its properties, Text and Effects, each field holding the
 * value the rows of that kind share or "Mixed", and every write reaching each of them in one undo
 * step; then their Selection colors.
 * @param props - Component props
 * @param props.ids - the rows' ids, top first
 * @returns The panel
 */
export function MultiRowPanel({ ids }: Readonly<{ ids: readonly string[] }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const tree = session.styles.tree();
    const found = ids.flatMap((id) => findTreeRow(tree, id) ?? []);
    if (found.length === 0) {
        return <StateLine>These rows are gone</StateLine>;
    }
    // A folder paints nothing: it adds its colors, not fields.
    const layerRows = found.filter((row) => row.row.kind === "layer");
    const locked = layerRows.filter(isLocked);
    const open = layerRows.filter((row) => !isLocked(row));
    const sides = (["node", "edge"] as const).filter(
        (side) =>
            open.length > 0 &&
            open.some((row) => rowLayers(session, treeRowLayers(session, row.row.id), side).length > 0),
    );
    const layerIds = open.flatMap((row) => treeRowLayers(session, row.row.id));
    return (
        <Stack gap={0}>
            {locked.length > 0 && (
                <StateLine>Locked, left unchanged: {locked.map((row) => row.row.name).join(", ")}</StateLine>
            )}
            {sides.length > 0 && (
                <RowStyle
                    key={layerIds.join(" ")}
                    session={session}
                    row={layerIds}
                    sides={sides}
                    many={(side) => manyOf(session, open, side)}
                />
            )}
            <SelectionColors rowIds={found.map((row) => row.row.id)} />
        </Stack>
    );
}
