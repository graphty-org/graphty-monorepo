/**
 * The paint tree's rows (tier1-design.md section 2.5), read from what graphty-element reports:
 * its runs, its style stack and its legend. Nothing here counts or computes over the graph; every
 * count is one the element publishes (a run's summary, a group's size, the selection's size).
 */

import type { LayerId, RunId } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";

/** The kind of a row, which is also the inspected kind a click on it opens. */
export type RowKind = "selection" | "measure-row" | "run-row" | "group-row" | "layer-row" | "everything";

/** What the kind slot shows besides the kind's icon. */
type RowState = "ready" | "running" | "partial" | "failed" | "canceled";

/** One row of the paint tree. */
export interface PaintRow {
    /** Unique across the tree: the run id, the layer id, `<run id>/<group>`, or the fixed row's kind. */
    readonly id: string;
    readonly kind: RowKind;
    readonly name: string;
    readonly state: RowState;
    /** Why a failed run failed: graphty-element's message. */
    readonly problem?: string;
    /** The swatch: one color, or the stops of a ramp; absent when the row paints nothing yet. */
    readonly swatch?: { readonly color: string } | { readonly ramp: readonly string[] };
    /** A count the element publishes for this row, or absent. */
    readonly count?: number;
    /**
     * The layers the eye shows and hides. Empty when the row has no eye: the fixed rows, whose
     * layers are the element's own, and a group row, whose paint is one part of its run's layer
     * (#907 asks the element to hide one group's paint).
     */
    readonly layerIds: readonly LayerId[];
    /** Whether every layer the eye covers is switched off. */
    readonly hidden: boolean;
    /** The run behind the row, when a run made it. */
    readonly runId?: RunId;
    readonly children?: readonly PaintRow[];
}

/** The shapes a run row draws its groups for. */
const GROUP_SHAPES = new Set(["community", "layered-grouping", "category-table"]);
/** The shapes that are one value per element: a single measure row. */
const MEASURE_SHAPES = new Set(["node-metric", "edge-metric"]);

/**
 * The paint tree's rows, top first: Selection; then the runs and the reader's own layers in paint
 * order, the topmost first, with a run that has no layer yet (queued, running, failed, or styled
 * off) above them, newest first; then Everything.
 * @param session - the element's session.
 * @returns the rows.
 */
export function paintRows(session: GraphSession): PaintRow[] {
    const layers = session.styles.list();
    const legend = session.styles.legend();
    const runs = session.runs.list().filter((run) => run.status !== "removed");
    const byId = new Map(runs.map((run) => [run.id, run]));

    const rowFor = (run: (typeof runs)[number]): PaintRow => {
        const layerIds = session.runs.bindings(run.id);
        const owned = layers.filter((layer) => layerIds.includes(layer.id));
        const blocks = legend.filter((block) => block.runId === run.id);
        const color = blocks.find((block) => block.channel.endsWith(".color")) ?? blocks[0];
        const { summary } = run.record;
        const groups = GROUP_SHAPES.has(run.shape) ? (summary?.groups ?? []) : undefined;
        const hidden = owned.length > 0 && owned.every((layer) => !layer.enabled);
        const base = {
            id: run.id,
            name: run.label,
            state: stateOf(run.status, run.partial),
            problem: run.error?.message,
            layerIds: owned.map((layer) => layer.id),
            hidden,
            runId: run.id,
        };
        if (groups !== undefined) {
            return {
                ...base,
                kind: "run-row",
                count: groups.length > 0 ? groups.length : undefined,
                children: groups.map((group) => {
                    // Draws no color until the legend and the summary spell a group the same way
                    // (#906: a number in the summary, a string in the legend).
                    const swatch = color?.swatches.find((s) => s.value === group.group)?.color;
                    return {
                        id: `${run.id}/${String(group.group)}`,
                        kind: "group-row",
                        name: group.name ?? String(group.group),
                        state: "ready",
                        swatch: swatch === undefined ? undefined : { color: swatch },
                        count: group.size,
                        layerIds: [],
                        hidden,
                        runId: run.id,
                    };
                }),
            };
        }
        const ramp = color?.swatches.flatMap((s) => (s.color === undefined ? [] : [s.color])) ?? [];
        return {
            ...base,
            kind: MEASURE_SHAPES.has(run.shape) ? "measure-row" : "run-row",
            count: summary?.measured,
            swatch: ramp.length === 0 ? undefined : { ramp },
        };
    };

    const middle: PaintRow[] = [];
    const placed = new Set<string>();
    for (const layer of [...layers].reverse()) {
        const { source } = layer;
        if (source.by === "element") {
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
            kind: "selection",
            name: "Selection",
            state: "ready",
            count: selected > 0 ? selected : undefined,
            layerIds: [],
            hidden: false,
        },
        ...unplaced.map(rowFor),
        ...middle,
        { id: "everything", kind: "everything", name: "Everything", state: "ready", layerIds: [], hidden: false },
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

