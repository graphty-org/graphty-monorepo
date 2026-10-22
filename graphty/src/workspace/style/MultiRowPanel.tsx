/// <reference lib="es2023.array" />
import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, HistoryStepId, Layer, LayerReach, StyleRow } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React, { useState } from "react";

import { count, findTreeRow, type FoundRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import type { LayerSequence, LayerValues } from "./BulkBinding";
import { writeKind } from "./cards";
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
import { type KindControl, RowStyle, StateLine } from "./StylePanel";
import { useStyleVersion } from "./useStyleVersion";
import { WhichPicker } from "./WhichPicker";
import { channelPhrase } from "./words";

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
    /** Where "Also set those" goes on in a Vary by Layer sequence: how many rows it already gave values. */
    readonly next: number;
    /** The history's position just after the write: undone past it, the receipt goes. */
    readonly position: number;
    /** The layers it changed, so writes merged into one undo step count each layer once. */
    readonly changedIds?: readonly string[];
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
 * Whether a layer already holds these plain values, so writing them again changes nothing.
 * @param layer - the layer.
 * @param values - the values, by channel.
 * @param combine - how a number meets the layers beneath.
 * @returns true when every value is already the layer's own.
 */
function holdsValues(layer: Layer, values: LayerValues, combine: DataBinding["combine"]): boolean {
    return (Object.entries(values) as [Channel, LayerValues[Channel]][]).every(([channel, value]) => {
        if (value === undefined) {
            return true;
        }
        const encoded = layer.encode?.[channel] as { value?: unknown; combine?: unknown } | undefined;
        if (typeof value === "number" && combine !== undefined && combine !== "replace") {
            return encoded?.value === value && encoded.combine === combine;
        }
        return encoded === undefined && sameValue(layer.set?.[channel], value);
    });
}

/**
 * Whether two plain values are the same: a hex color in either case is one color ("#e69f00" as a
 * run writes it, "#E69F00" as a paint reads).
 * @param a - one value.
 * @param b - the other.
 * @returns true when they are the same.
 */
function sameValue(a: unknown, b: unknown): boolean {
    const hex = /^#[\da-f]+$/i;
    return typeof a === "string" && typeof b === "string" && hex.test(a) && hex.test(b)
        ? a.toLowerCase() === b.toLowerCase()
        : a === b;
}

/** What several rows edited together need beyond the rows: the locked rows and the receipt. */
interface Bulk {
    /** The names of the locked layers an edit leaves alone. */
    readonly locked: readonly string[];
    readonly last: LastWrite | null;
    readonly setLast: (last: LastWrite | null) => void;
}

/**
 * The words a write to several layers goes into the history by: "changing node color on 5
 * layers", counting only the layers it changes.
 * @param channel - the channel.
 * @param n - how many layers.
 * @returns the words.
 */
function stepWords(channel: Channel, n: number): string {
    return `changing ${channelPhrase(channel)} on ${count(n, "layer")}`;
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
        lineOfRow(row, channel)?.layer ?? layersOf(row).findLast((layer) => !layer.locked);
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
        after?: HistoryStepId,
    ): Promise<{ readonly updated: readonly Layer[]; readonly skipped: readonly unknown[] }> => {
        const ordered = "each" in write ? topFirst(targets, channel) : targets;
        const values = "each" in write ? write.each(from + ordered.length) : [];
        const patches = ordered.flatMap((row, at) => {
            const layer = homeOf(row, channel);
            if (layer === undefined) {
                return [];
            }
            if ("each" in write) {
                // A layer left on its own value is not written, so the receipt counts only real changes.
                const own = values[from + at] ?? {};
                return holdsValues(layer, own, write.combine)
                    ? []
                    : [{ id: layer.id, patch: patchOfValues(layer, own, write.combine) }];
            }
            // A layer that already holds the value is not written, so the step counts real changes.
            if ("value" in write && holdsValues(layer, { [channel]: write.value }, write.combine)) {
                return [];
            }
            return [{ id: layer.id, patch: patchOf(layer, channel, write) }];
        });
        if (patches.length === 0) {
            return { updated: [], skipped: [] };
        }
        // Named in the history as what it did ("Undid changing node color on 5 layers"), counting
        // the layers this write changes. ponytail: a value for each layer is written change by
        // change into one step, which keeps the first change's words; name the step afresh on a
        // merge if the element ever lets a step be renamed.
        return session.transaction(
            stepWords(channel, patches.length),
            (tx) => tx.styles.updateMany(patches),
            after === undefined ? {} : { after },
        );
    };
    const lowest = [...rows].sort(
        (a, b) =>
            stack.indexOf(treeLayers(session, a.row.id)[0] ?? "") -
            stack.indexOf(treeLayers(session, b.row.id)[0] ?? ""),
    )[0]?.row.id;
    const below = beneathOf(session, lowest);
    // A receipt speaks for its write only while that write is applied: undone, it goes. (Not
    // "the last step": "Also set those" adds a step before the receipt learns of it.)
    const last = bulk.last?.side === side && session.history.position >= bulk.last.position ? bulk.last : null;
    const record = async (channel: Channel, write: Write, after?: HistoryStepId): Promise<void> => {
        const targets = targetsOf(channel);
        const left = rows.filter((row) => !targets.includes(row));
        const result = await writeRows(targets, channel, write, 0, after);
        // A write merged into the step before it adds to that step's receipt.
        const merged = after !== undefined && last?.channel === channel ? (last.changedIds ?? []) : [];
        const changedIds = [...new Set([...merged, ...result.updated.map((layer) => layer.id)])];
        if (changedIds.length === 0 && result.skipped.length === 0 && left.length === 0) {
            return;
        }
        bulk.setLast({
            side,
            channel,
            write,
            changed: changedIds.length,
            changedIds,
            unset: left.map((row) => row.row.name),
            left: left.map((row) => row.row.id),
            next: targets.length,
            position: session.history.position,
            locked: bulk.locked.length + result.skipped.length,
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
        write: (channel, write) => record(channel, write),
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
                `removing ${channelPhrase(channel)} from ${count(patches.length, "layer")}`,
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
        plain: (channel) => {
            const targets = topFirst(targetsOf(channel), channel);
            const lines = targets.map((row) => lineOfRow(row, channel));
            const set = lines.filter((line): line is Line => line !== undefined);
            if (set.length < 2 || set.some((line) => line.binding !== undefined) || new Set(set.map(key)).size < 2) {
                return undefined;
            }
            return targets.flatMap((row, at) => {
                const line = lines[at];
                return line?.value === undefined ? [] : [{ id: line.layer.id, name: row.row.name, value: line.value }];
            });
        },
        vary: (channel, binding, after) => record(channel, { binding }, after),
        inOrder: (channel) =>
            topFirst(targetsOf(channel), channel).flatMap((row) => {
                const layer = homeOf(row, channel);
                return layer === undefined ? [] : [{ id: layer.id, name: row.row.name }];
            }),
        writeEach: (channel, each, combine, after) => record(channel, { each, combine }, after),
        receipt: (channel) => (last?.channel === channel ? last : undefined),
        alsoSet: async (channel) => {
            if (last?.channel !== channel) {
                return;
            }
            const targets = rows.filter((row) => last.left.includes(row.row.id));
            const result = await writeRows(targets, channel, last.write, last.next);
            bulk.setLast({
                ...last,
                changed: last.changed + result.updated.length,
                unset: [],
                left: [],
                next: last.next + targets.length,
                position: session.history.position,
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
 * @returns the words, or nothing when they would only repeat the header's count.
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
    // "3 layers." alone repeats the panel's header: there is nothing to add.
    if (single === undefined && parts.length === 0 && later === "") {
        return "";
    }
    const tail = parts.length === 0 ? "" : `: ${parts.join(", ")}`;
    return `${head}${tail}.${later}`;
}

/**
 * What the kinds of several layer rows do: how many style nodes or edges, turning a kind on or off
 * for all of them in one step, and the picker of which elements each kind styles.
 * @param session - the element's session.
 * @param store - the workspace store.
 * @param layerRows - the layer rows (a folder has no pick of its own).
 * @returns the kind control.
 */
function kindControl(
    session: GraphSession,
    store: ReturnType<typeof useWorkspace>["store"],
    layerRows: readonly string[],
): KindControl {
    const has = (id: string, side: Target): boolean => {
        const parts = session.styles.parts(id);
        return (side === "node" ? parts?.node : parts?.edge) !== undefined;
    };
    return {
        state: (side) => ({ on: layerRows.filter((id) => has(id, side)).length, of: layerRows.length }),
        toggle: async (side, on) => {
            const changed = await session.transaction(
                `${on ? "styling" : "not styling"} ${side === "node" ? "nodes" : "edges"} on ${count(layerRows.length, "layer")}`,
                async (tx) => {
                    let n = 0;
                    for (const id of layerRows) {
                        if (await writeKind(session, tx, id, side, on)) {
                            n++;
                        }
                    }
                    return n;
                },
            );
            const kind = side === "node" ? "nodes" : "edges";
            store.set({
                announcement: on
                    ? `${count(changed, "layer")} now style ${kind}`
                    : `${count(changed, "layer")} no longer style ${kind}`,
            });
        },
        pick: (side, justOn, elsewhere) => (
            <WhichPicker
                key={side}
                session={session}
                rows={layerRows.filter((id) => has(id, side))}
                side={side}
                autoOpen={justOn}
                {...elsewhere}
            />
        ),
    };
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
    const { session, element, store } = useWorkspace();
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
    // Layer rows only: a folder has no pick of its own.
    const layerRows = open.filter((row) => row.row.kind !== "folder").map((row) => row.row.id);
    const kinds = kindControl(session, store, layerRows);
    const scope = scopeWords(tree, picked, reach);
    return (
        <Stack gap={0}>
            {scope === "" ? null : <StateLine id="ws-bulk-scope">{scope}</StateLine>}
            {sides.length > 0 && (
                <RowStyle
                    key={layerIds.join(" ")}
                    session={session}
                    row={layerIds}
                    sides={sides}
                    kinds={layerRows.length > 0 ? kinds : undefined}
                    many={(side) => manyOf(session, open, side, bulk)}
                />
            )}
        </Stack>
    );
}
