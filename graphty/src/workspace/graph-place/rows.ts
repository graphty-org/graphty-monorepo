/**
 * The paint tree's rows (tier1-design.md section 2.5), read from what graphty-element reports:
 * its runs, its style stack and its legend. Nothing here counts or computes over the graph; every
 * count is one the element publishes (a run's summary, a group's size, the selection's size).
 */

import type { Channel, LayerId, RunId } from "@graphty/graphty-element/catalog";
import { type GraphSession, RESULT_SHAPE_CONTRACTS, type Run, type StaleNote } from "@graphty/graphty-element/session";

import { runName } from "../analyze/words";
import { count } from "../inspector/words";
import { colorBlockOf, EVERYTHING_KEY, groupHidden, runColorOf } from "../style/row";

/** The kind of a row, which is also the inspected kind a click on it opens (the inspector's kinds). */
export type RowKind = "selection-row" | "measure-row" | "run-row" | "group-row" | "layer-row" | "everything-row";

/** What the kind slot shows besides the kind's icon. */
type RowState = "ready" | "running" | "partial" | "stale" | "failed" | "canceled";

/** One row of the paint tree. */
export interface PaintRow {
    /**
     * Unique across the tree, and the id the inspector reads: the run id, the layer id, a group's
     * `JSON.stringify([runId, group])`, or the fixed row's own name.
     */
    readonly id: string;
    readonly kind: RowKind;
    readonly name: string;
    readonly state: RowState;
    /** Why an out-of-date run is out of date: `run.stale`. */
    readonly stale?: StaleNote;
    /** Why a failed run failed: graphty-element's message. */
    readonly problem?: string;
    /** The swatch: one color, or the stops of a ramp; absent when the row paints nothing yet. */
    readonly swatch?: { readonly color: string } | { readonly ramp: readonly string[] };
    /**
     * A count the element publishes for this row, or absent; for a path, its length in words
     * ("4 hops"), since the number of elements it measured is not the path.
     */
    readonly count?: number | string;
    /**
     * The layers the eye shows and hides. Empty for the fixed rows, whose layers are the
     * element's own, and for a group row, whose eye hides one value of its run's layer instead.
     */
    readonly layerIds: readonly LayerId[];
    /** For a group row of a run that paints a color: the value its eye hides (`styles.setValueHidden`). */
    readonly value?: { readonly layerId: LayerId; readonly channel: Channel; readonly value: string | number };
    /** Whether every layer the eye covers is switched off, or the group's value is hidden. */
    readonly hidden: boolean;
    /** The run behind the row, when a run made it. */
    readonly runId?: RunId;
    readonly children?: readonly PaintRow[];
}

/**
 * The paint tree's rows, top first: Selection; then the runs and the reader's own layers in paint
 * order, the topmost first, with a run that has no layer yet (queued, running, failed, or styled
 * off) above them, newest first; then Everything, whose paint includes the reader's Everything
 * layer (the layer its Style tab writes), so that layer is not a row of its own.
 * @param session - the element's session.
 * @returns the rows.
 */
export function paintRows(session: GraphSession): PaintRow[] {
    const layers = session.styles.list();
    const runs = session.runs.list().filter((run) => run.status !== "removed");
    const byId = new Map(runs.map((run) => [run.id, run]));

    const rowFor = (run: (typeof runs)[number]): PaintRow => {
        const layerIds = session.runs.bindings(run.id);
        const owned = layers.filter((layer) => layerIds.includes(layer.id));
        const color = colorBlockOf(session, run.id);
        // The eye's target is read from the style stack, which the legend lags while it repaints.
        const bound = runColorOf(session, run.id);
        const { summary } = run.record;
        // The element publishes groups only for a result that partitions.
        const groups = summary?.groups;
        const hidden = owned.length > 0 && owned.every((layer) => !layer.enabled);
        const base = {
            id: run.id,
            name: runName(session, run),
            state: run.status === "succeeded" && run.stale !== null ? "stale" : stateOf(run.status, run.partial),
            stale: run.stale ?? undefined,
            problem: run.error?.message,
            layerIds: owned.map((layer) => layer.id),
            hidden,
            runId: run.id,
        };
        if (groups !== undefined) {
            // The group count the run publishes; `groups` itself is bounded.
            const graph = run.result?.graph;
            const published = graph?.groupCount ?? graph?.levelCount;
            return {
                ...base,
                kind: "run-row",
                count: typeof published === "number" ? published : undefined,
                children: groups.map((group) => {
                    const swatch = color?.swatches.find((s) => s.value === group.group)?.color;
                    return {
                        id: JSON.stringify([run.id, group.group]),
                        kind: "group-row",
                        name: group.rank === undefined ? String(group.group) : `Group ${String(group.rank)}`,
                        state: "ready",
                        swatch: swatch === undefined ? undefined : { color: swatch },
                        count: group.size,
                        layerIds: [],
                        value:
                            bound === undefined
                                ? undefined
                                : { layerId: bound.layerId, channel: bound.channel, value: group.group },
                        hidden: hidden || (bound !== undefined && groupHidden(bound, group.group)),
                        runId: run.id,
                    };
                }),
            };
        }
        const ramp = color?.swatches.flatMap((s) => (s.color === undefined ? [] : [s.color])) ?? [];
        return {
            ...base,
            // A run whose primary field is one value per element is a single measure row.
            kind: RESULT_SHAPE_CONTRACTS[run.shape].primaryField === "value" ? "measure-row" : "run-row",
            count: run.shape === "path" ? pathSize(run) : summary?.measured,
            swatch: ramp.length === 0 ? undefined : { ramp },
        };
    };

    const middle: PaintRow[] = [];
    const placed = new Set<string>();
    for (const layer of [...layers].reverse()) {
        const { source } = layer;
        if (source.by === "element" || layer.userData?.[EVERYTHING_KEY] === true) {
            continue;
        }
        if (source.by === "run") {
            const run = byId.get(source.runId);
            if (run !== undefined && !placed.has(run.id)) {
                placed.add(run.id);
                middle.push(rowFor(run));
            }
            continue;
        }
        middle.push({
            id: layer.id,
            kind: "layer-row",
            name: layer.name,
            state: "ready",
            layerIds: [layer.id],
            hidden: !layer.enabled,
        });
    }
    const unplaced = runs.filter((run) => !placed.has(run.id)).reverse();

    const selected = session.selection.size;
    return [
        {
            id: "selection",
            kind: "selection-row",
            name: "Selection",
            state: "ready",
            count: selected > 0 ? selected : undefined,
            layerIds: [],
            hidden: false,
        },
        ...unplaced.map(rowFor),
        ...middle,
        { id: "everything", kind: "everything-row", name: "Everything", state: "ready", layerIds: [], hidden: false },
    ];
}

/**
 * What the kind slot shows for a run's status.
 * @param status - the run's status.
 * @param partial - whether it stopped early.
 * @returns the row state.
 */
function stateOf(status: string, partial: boolean): RowState {
    if (status === "queued" || status === "running") {
        return "running";
    }
    if (status === "failed") {
        return "failed";
    }
    if (status === "canceled") {
        return "canceled";
    }
    return partial ? "partial" : "ready";
}

/**
 * Finds a row by id anywhere in the tree.
 * @param rows - the rows.
 * @param id - the row id.
 * @returns the row, or undefined.
 */
export function findRow(rows: readonly PaintRow[], id: string): PaintRow | undefined {
    for (const row of rows) {
        if (row.id === id) {
            return row;
        }
        const child = findRow(row.children ?? [], id);
        if (child !== undefined) {
            return child;
        }
    }
    return undefined;
}

/**
 * Whether a row has an eye: it owns layers, or it is a group whose run paints a color.
 * @param row - the row.
 * @returns true when it has one.
 */
export function hasEye(row: PaintRow): boolean {
    return row.layerIds.length > 0 || row.value !== undefined;
}

/**
 * Whether a row can be dragged or moved: a run, measure or layer row that paints. Selection,
 * Everything, a group row and a run with no layer yet never move.
 * @param row - the row.
 * @returns true when it moves.
 */
export function isMovable(row: PaintRow): boolean {
    return row.layerIds.length > 0 && row.kind !== "group-row";
}

/**
 * Where a row would sit in the style stack if it were the top-level row at `index`, counted
 * with it taken out (the tree's move): below the bottom layer of the nearest row above it that
 * paints, or at the top (null) when none does. Undefined for a place it cannot go: inside
 * another row, above Selection or below Everything.
 * @param rows - the rows, top first.
 * @param id - the moving row.
 * @param parentId - the row it would land in, null for the top level.
 * @param index - its place among the top-level rows without it.
 * @returns the layer it would sit below, null for the top, or undefined.
 */
export function layerAbove(
    rows: readonly PaintRow[],
    id: string,
    parentId: string | null,
    index: number,
): LayerId | null | undefined {
    const others = rows.filter((row) => row.id !== id);
    if (parentId !== null || others.length === rows.length || index < 1 || index > others.length - 1) {
        return undefined;
    }
    const above = others
        .slice(0, index)
        .reverse()
        .find((row) => row.layerIds.length > 0);
    return above?.layerIds[0] ?? null;
}

/**
 * A path run's length, as its graph result publishes it: "4 hops", or absent before it has one
 * (or when no path was found). Short, so the row's name stays whole beside it.
 * @param run - the path run.
 * @returns the words, or undefined.
 */
function pathSize(run: Run): string | undefined {
    const { hops } = run.result?.graph ?? {};
    return typeof hops === "number" ? count(hops, "hop") : undefined;
}
