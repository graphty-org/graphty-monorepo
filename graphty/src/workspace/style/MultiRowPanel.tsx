import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer, LayerReach, StyleRow } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React, { useState } from "react";

import { count, findTreeRow, type FoundRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import type { LayerSequence, LayerValues } from "./BulkBinding";
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
import { RowStyle, StateLine } from "./StylePanel";
import { useStyleVersion } from "./useStyleVersion";
import { channelWord, hexOf } from "./words";

/** One value or binding written to a channel, or each layer its own values (Vary by Layer). */
type Write =
    | LiteralWrite
    | { readonly binding: DataBinding }
    | { readonly each: LayerSequence; readonly combine?: DataBinding["combine"] };

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
 * The patch that writes a layer its own plain values, one channel after another (the property's,
 * and an overflow's second cue's).
 * @param layer - the layer.
 * @param values - the values, by channel.
 * @param combine - how a number meets the layers beneath.
 * @returns the patch.
 */
function patchOfValues(
    layer: Layer,
    values: LayerValues,
    combine: DataBinding["combine"],
): Pick<Layer, "set" | "encode"> {
    let next: Pick<Layer, "set" | "encode"> = { set: layer.set, encode: layer.encode };
    for (const [channel, value] of Object.entries(values) as [Channel, LayerValues[Channel]][]) {
        if (value !== undefined) {
            next = patchOf({ ...layer, ...next }, channel, typeof value === "number" ? { value, combine } : { value });
        }
    }
    return next;
}

/**
 * A binding as one layer of several keeps it: one that reads a run's result, copied into a layer
 * that meets some of its groups, holds what it paints those groups now in its own value table, so
 * a re-run that renumbers the groups (graphty-element carries a table's entries to the group
 * sharing most members) leaves each group painted as it was; a group the reader gave its own value
 * keeps it. Any other binding is copied as it is.
 * @param session - the element's session.
 * @param layer - the layer it is written to.
 * @param channel - the channel.
 * @param binding - the binding.
 * @returns the binding for that layer.
 */
function bindingFor(session: GraphSession, layer: Layer, channel: Channel, binding: DataBinding): DataBinding {
    const { map: given, ...rest } = binding;
    if (!rest.by.startsWith("results.")) {
        return binding;
    }
    const color = channel.endsWith("color");
    const map: Record<string, string | number> = {};
    for (const bin of session.styles.preview(rest, { channel, within: layer.id }).bins) {
        const paints = color ? hexOf(bin.paints) : bin.paints;
        if (bin.count > 0 && bin.value !== undefined && (typeof paints === "string" || typeof paints === "number")) {
            map[categoryOf(bin.value)] = paints;
        }
    }
    Object.assign(map, given);
    return Object.keys(map).length === 0 ? rest : { ...rest, map };
}

/**
 * A value as a binding's value table spells it: text as it is, anything else as JSON.
 * @param value - the value.
 * @returns the key.
 */
function categoryOf(value: unknown): string {
    return typeof value === "string" ? value : JSON.stringify(value);
}

/** What several rows edited together need beyond the rows: the locked rows and the receipt. */
interface Bulk {
    /** The names of the locked layers an edit leaves alone. */
    readonly locked: readonly string[];
    readonly last: LastWrite | null;
    readonly setLast: (last: LastWrite | null) => void;
}

/**
 * Whether a layer holds one value of a field its rule selects by (a run's group, a column's
 * value), read from what a binding on that field paints within it (`styles.preview`'s `within`):
 * a binding copied into each such layer paints each one its own way.
 * @param session - the element's session.
 * @param layer - the layer.
 * @param channel - a channel of the layer's kind.
 * @returns true when it does.
 */
function holdsOneValue(session: GraphSession, layer: Layer, channel: Channel): boolean {
    const where = layer.selector.match === "rule" ? layer.selector.where : undefined;
    if (where?.kind !== "categories" || where.values.length !== 1) {
        return false;
    }
    // ponytail: one preview per layer, a walk over the graph each; cache by the style version if a
    // folder of hundreds of layers is slow.
    return (
        session.styles
            .preview({ by: where.attribute, scale: "ordinal" }, { channel, within: layer.id })
            .bins.filter((bin) => bin.count > 0).length === 1
    );
}

/**
 * The words a write to several layers goes into the history by: "changing fill on 5 layers".
 * @param channel - the channel.
 * @param n - how many layers.
 * @returns the words.
 */
function stepWords(channel: Channel, n: number): string {
    return `changing ${channelWord(channel).toLowerCase()} on ${count(n, "layer")}`;
}

/**
 * How several rows read and write one kind's channels together: the value every row that sets a
 * channel sets alike, or Mixed; a write goes, as one undo step (`styles.updateMany`), to the rows
 * that already set the channel, or to every row when none does; a receipt says what it did and
 * offers to set the rest.
 * @param session - the element's session.
 * @param all - the unlocked rows; a kind reads only those that paint it.
 * @param side - nodes or edges.
 * @param bulk - the locked rows and the last write.
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
    // Copies of one binding differ only in each layer's own table: they count as one value.
    const key = (line: Line): string => {
        const { map: _map, ...binding } = line.binding ?? { by: "" };
        return JSON.stringify([line.value, line.binding === undefined ? null : binding, line.combine]);
    };
    // The write rule: the rows that already set it, unless none does.
    const targetsOf = (channel: Channel): FoundRow[] => {
        const lines = linesOf(channel);
        const setting = rows.filter((_, at) => lines[at] !== undefined);
        return setting.length > 0 ? setting : rows;
    };
    // Beneath the lowest of them in paint order, so no selected row reads as beneath another.
    const stack = session.styles.list().map((layer) => layer.id);
    // The rows as the tree lists them, top first, by the layer a write of the channel reaches.
    const topFirst = (targets: readonly FoundRow[], channel: Channel): FoundRow[] =>
        [...targets].sort(
            (a, b) => stack.indexOf(homeOf(b, channel)?.id ?? "") - stack.indexOf(homeOf(a, channel)?.id ?? ""),
        );
    // `from`: where in a Vary by Layer sequence these rows start ("Also set those" goes on after the first write).
    const writeRows = async (
        targets: readonly FoundRow[],
        channel: Channel,
        write: Write,
        from = 0,
    ): Promise<{ readonly updated: readonly unknown[]; readonly skipped: readonly unknown[] }> => {
        const ordered = "each" in write ? topFirst(targets, channel) : targets;
        const values = "each" in write ? write.each(from + ordered.length) : [];
        const patches = ordered.flatMap((row, at) => {
            const layer = homeOf(row, channel);
            if (layer === undefined) {
                return [];
            }
            if ("each" in write) {
                return [{ id: layer.id, patch: patchOfValues(layer, values[from + at] ?? {}, write.combine) }];
            }
            const each = "binding" in write ? { binding: bindingFor(session, layer, channel, write.binding) } : write;
            return [{ id: layer.id, patch: patchOf(layer, channel, each) }];
        });
        // Named in the history as what it did ("Undid changing fill on 5 layers").
        return session.transaction(stepWords(channel, patches.length), (tx) => tx.styles.updateMany(patches));
    };
    const lowest = [...rows].sort(
        (a, b) =>
            stack.indexOf(treeLayers(session, a.row.id)[0] ?? "") -
            stack.indexOf(treeLayers(session, b.row.id)[0] ?? ""),
    )[0]?.row.id;
    const below = beneathOf(session, lowest);
    const last = bulk.last?.side === side ? bulk.last : null;
    const channelOfKind: Channel = side === "node" ? "node.color" : "edge.color";
    const varyRows = (channel: Channel): { take: FoundRow[]; leave: FoundRow[] } => {
        const targets = targetsOf(channel);
        const take = targets.filter((row) => {
            const layer = homeOf(row, channel);
            return layer !== undefined && holdsOneValue(session, layer, channelOfKind);
        });
        return { take, leave: targets.filter((row) => !take.includes(row)) };
    };
    const record = async (
        channel: Channel,
        write: Write,
        targets: readonly FoundRow[],
        leave: readonly FoundRow[],
    ): Promise<void> => {
        const left = rows.filter((row) => !targets.includes(row) && !leave.includes(row));
        const result = await writeRows(targets, channel, write);
        bulk.setLast({
            side,
            channel,
            write,
            changed: result.updated.length,
            unset: left.map((row) => row.row.name),
            left: left.map((row) => row.row.id),
            locked: bulk.locked.length + result.skipped.length,
            kept: leave.map((row) => row.row.name),
            everything: left.filter((row) => reachesEvery(session, row.row.id, side)).map((row) => row.row.name),
        });
    };
    const many: ManyRows = {
        line: (channel) => {
            const lines = linesOf(channel).filter((line): line is Line => line !== undefined);
            return lines.length > 0 && lines.every((line) => key(line) === key(lines[0])) ? lines[0] : undefined;
        },
        count: (channel) => linesOf(channel).filter((line) => line !== undefined).length,
        of: rows.length,
        write: (channel, write) => record(channel, write, targetsOf(channel), []),
        clear: async (channel) => {
            const patches = rows.flatMap((row) => {
                const layer = lineOfRow(row, channel)?.layer;
                return layer === undefined
                    ? []
                    : [
                          {
                              id: layer.id,
                              patch: { set: without(layer.set, channel), encode: without(layer.encode, channel) },
                          },
                      ];
            });
            await session.transaction(
                `removing ${channelWord(channel).toLowerCase()} from ${count(patches.length, "layer")}`,
                (tx) => tx.styles.updateMany(patches, { keepEmpty: true }),
            );
        },
        breakdown: (channel) => {
            const lines = linesOf(channel);
            return {
                set: rows.filter((_, at) => lines[at] !== undefined).map((row) => row.row.name),
                unset: rows.filter((_, at) => lines[at] === undefined).map((row) => row.row.name),
                values: new Set(lines.filter((line): line is Line => line !== undefined).map(key)).size,
                locked: bulk.locked,
            };
        },
        varies: (channel) => {
            const { take, leave } = varyRows(channel);
            // Top first, as the tree draws them.
            const layers = take
                .map((row) => homeOf(row, channel))
                .filter((layer): layer is Layer => layer !== undefined)
                .sort((a, b) => stack.indexOf(b.id) - stack.indexOf(a.id));
            return { layers, left: leave.map((row) => row.row.name) };
        },
        vary: async (channel, binding) => {
            const { take, leave } = varyRows(channel);
            await record(channel, { binding }, take, leave);
        },
        inOrder: (channel) =>
            topFirst(targetsOf(channel), channel).flatMap((row) => {
                const layer = homeOf(row, channel);
                return layer === undefined ? [] : [{ id: layer.id, name: row.row.name }];
            }),
        writeEach: (channel, each, combine) => record(channel, { each, combine }, targetsOf(channel), []),
        receipt: (channel) => (last?.channel === channel ? last : undefined),
        alsoSet: async (channel) => {
            if (last?.channel !== channel) {
                return;
            }
            const targets = rows.filter((row) => last.left.includes(row.row.id));
            const result = await writeRows(targets, channel, last.write, last.changed);
            bulk.setLast({
                ...last,
                changed: last.changed + result.updated.length,
                unset: [],
                left: [],
                everything: [],
            });
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
 * Whether a layer row matches every node (or edge) of the graph: setting a property on it paints
 * over everything beneath.
 * @param session - the element's session.
 * @param id - the layer row.
 * @param side - nodes or edges.
 * @returns true when it does.
 */
function reachesEvery(session: GraphSession, id: string, side: Target): boolean {
    const parts = session.styles.parts(id);
    const layer = side === "node" ? parts?.node : parts?.edge;
    if (layer === undefined) {
        return false;
    }
    const { matched } = session.styles.counts(layer);
    const { totalNodes, totalEdges } = session.visibility.summary;
    const total = side === "node" ? totalNodes : totalEdges;
    return total > 0 && matched >= total;
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
 * (all of them when none does), with a receipt under the field. Vary by Layer gives each its own
 * value, in list order.
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
    const locked = reach.filter((row) => row.locked).map((row) => findTreeRow(tree, row.row)?.row.name ?? row.row);
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
        </Stack>
    );
}
