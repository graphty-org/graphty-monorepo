/**
 * What the inspector shows (tier1-design.md section 2.7): a row another package asked for, or
 * else whatever graphty-element has selected.
 *
 * A package opens a row by writing `inspected` in the workspace store with one of the kinds
 * below. The selection needs no writing: with no row open, the inspector reads the element's
 * selection, and a selection change closes any open row (the inspector shows the selected thing).
 */

import type { GraphSession, NodeId, RunId, SelectionDirection } from "@graphty/graphty-element/session";

import { groupRowOf } from "../graph-place/rows";
import type { WorkspaceState } from "../state/store";

/**
 * Every kind the inspector draws, with the id each one carries in `inspected.id`.
 *
 * - `graph`: nothing selected, or the Graph place's title opened it; no id.
 * - `node`: one node selected; no id (read from the selection).
 * - `edge`: one edge selected; no id.
 * - `several`: more than one element selected; no id.
 * - `neighborhood`: the nodes within some hops of a center node, following edges one way or
 *   both; the id is `neighborhoodKey(center, hops, direction)`.
 * - `measure-row` and `run-row`: a run's row; the id is the run id. Either kind opens either
 *   view: the run's result shape decides between the measure and the groups.
 * - `group-row`: one group of a grouping run; the id is `groupKey(runId, group)`.
 * - `everything-row` and `selection-row`: the Graph place's two built-in rows; no id.
 * - `layer-row`: one row of the style tree; the id is the row's id (its layer, or its node part).
 * - `folder-row`: a folder of the style tree; the id is the folder's id.
 * - `rows`: several rows of the style tree selected together; the id is their ids as a JSON array.
 * - `attribute`: an attribute from the Data place; the id is its path, such as `data.age`.
 * - `filter-step`: the filter step editor; the id is the step's id, `new`, or
 *   `new:<node|edge>:<path>` for a new step on that attribute.
 * - `source`: a Sources row in the Data place; the id is the row's id, `source:<load>` or
 *   `source:<load>:<table>`, where `<load>` indexes `data.sources()`.
 */
export const INSPECTED_KINDS = [
    "graph",
    "node",
    "edge",
    "several",
    "neighborhood",
    "measure-row",
    "run-row",
    "group-row",
    "everything-row",
    "selection-row",
    "layer-row",
    "folder-row",
    "rows",
    "attribute",
    "filter-step",
    "source",
] as const;

/** The kinds only the Data place shows a row for: leaving that place closes them. */
export const DATA_PLACE_KINDS: readonly string[] = ["attribute", "filter-step", "source"];

/** One of {@link INSPECTED_KINDS}. */
export type InspectedKindId = (typeof INSPECTED_KINDS)[number];

/** What the inspector draws now. */
export type Resolved =
    | { readonly kind: "graph" }
    | { readonly kind: "node"; readonly node: NodeId }
    | { readonly kind: "edge"; readonly edge: string }
    | { readonly kind: "several" }
    | {
          readonly kind: "neighborhood";
          readonly node: NodeId;
          readonly hops: number;
          readonly direction: SelectionDirection;
      }
    | { readonly kind: "measure-row" | "run-row"; readonly run: RunId }
    | { readonly kind: "group-row"; readonly run: RunId; readonly group: string | number }
    | { readonly kind: "everything-row" | "selection-row" }
    | { readonly kind: "layer-row"; readonly layer: string }
    | { readonly kind: "folder-row"; readonly row: string }
    | { readonly kind: "rows"; readonly rows: readonly string[] }
    | { readonly kind: "attribute"; readonly path: string }
    | { readonly kind: "filter-step"; readonly step: string }
    | { readonly kind: "source"; readonly row: string };

/**
 * The id a node carries in `inspected.id`. A node id is a string or a number, and the two must
 * not meet: node 1 and node "1" are different nodes.
 * @param id - the node id.
 * @returns the key.
 */
export function nodeKey(id: NodeId): string {
    return JSON.stringify(id);
}

/**
 * The id a neighborhood carries in `inspected.id`: the center's `nodeKey` for its one-hop
 * neighbors both ways, else the center, the hop count and the direction followed.
 * @param center - the node at the center.
 * @param hops - how many hops out the neighborhood reaches.
 * @param direction - which way edges are followed.
 * @returns the key.
 */
export function neighborhoodKey(center: NodeId, hops = 1, direction: SelectionDirection = "all"): string {
    return hops === 1 && direction === "all" ? nodeKey(center) : JSON.stringify([center, hops, direction]);
}

/**
 * The id a group row carries in `inspected.id`.
 * @param run - the grouping run.
 * @param group - the group's value, as the run publishes it.
 * @returns the key.
 */
export function groupKey(run: RunId, group: string | number): string {
    return JSON.stringify([run, group]);
}

/**
 * What opening one group of a grouping run inspects: the layer row that paints it when the run made
 * one per group (the row the Graph place lists under the run's folder, with that row's header),
 * else the group itself.
 * @param session - the element's session.
 * @param run - the run.
 * @param group - the group, as the run's summary spells it.
 * @returns the store's `inspected`.
 */
export function groupInspected(
    session: GraphSession,
    run: RunId,
    group: string | number,
): { readonly kind: "layer-row" | "group-row"; readonly id: string } {
    const row = groupRowOf(session, run, group);
    return row === undefined ? { kind: "group-row", id: groupKey(run, group) } : { kind: "layer-row", id: row };
}

/**
 * Parses a key, or undefined when it is not one.
 * @param key - the key.
 * @returns the parsed value.
 */
function parse(key: string | undefined): unknown {
    if (key === undefined) {
        return undefined;
    }
    try {
        return JSON.parse(key) as unknown;
    } catch {
        return undefined;
    }
}

/**
 * A string or number id, or undefined.
 * @param value - anything.
 * @returns the id.
 */
function idOf(value: unknown): string | number | undefined {
    return typeof value === "string" || typeof value === "number" ? value : undefined;
}

/**
 * A group row, when its key parses as `[run, group]`.
 * @param key - the row's key.
 * @returns what to draw, or undefined when the key is not a group row's.
 */
function groupRowFromKey(key: string | undefined): Resolved | undefined {
    const parsed = parse(key);
    const run: unknown = Array.isArray(parsed) ? parsed[0] : undefined;
    const group = Array.isArray(parsed) ? idOf(parsed[1]) : undefined;
    if (typeof run === "string" && group !== undefined) {
        return { kind: "group-row", run, group };
    }
    return undefined;
}

/** The selection as the inspector reads it. */
interface SelectionView {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly string[];
}

/**
 * A neighborhood row from its id: its center node, hops and direction.
 * @param id - the row's id.
 * @returns the row, or undefined when the id does not parse.
 */
function neighborhoodFromId(id: string | undefined): Resolved | undefined {
    const parsed = parse(id);
    const node = idOf(Array.isArray(parsed) ? parsed[0] : parsed);
    const hops: unknown = Array.isArray(parsed) ? parsed[1] : 1;
    const direction: unknown = Array.isArray(parsed) ? (parsed[2] ?? "all") : "all";
    if (
        node !== undefined &&
        typeof hops === "number" &&
        Number.isInteger(hops) &&
        hops >= 1 &&
        (direction === "all" || direction === "in" || direction === "out")
    ) {
        return { kind: "neighborhood", node, hops, direction };
    }
    return undefined;
}

/**
 * Several style rows from their id, a list of row ids.
 * @param id - the row's id.
 * @returns the rows, or undefined when the id does not parse.
 */
function rowsFromId(id: string | undefined): Resolved | undefined {
    const parsed = parse(id);
    return Array.isArray(parsed) && parsed.every((each) => typeof each === "string")
        ? { kind: "rows", rows: parsed }
        : undefined;
}

/** The kinds of open row whose id is the thing itself. */
type IdKind = "measure-row" | "run-row" | "layer-row" | "folder-row" | "attribute" | "filter-step" | "source";

/**
 * An open row whose id is the thing itself: a run, a layer, a folder, an attribute, a filter
 * step or a source.
 * @param kind - the row's kind.
 * @param id - the row's id.
 * @returns the row.
 */
function fromId(kind: IdKind, id: string): Resolved {
    switch (kind) {
        case "measure-row":
        case "run-row":
            return { kind, run: id };
        case "layer-row":
            return { kind: "layer-row", layer: id };
        case "folder-row":
            return { kind: "folder-row", row: id };
        case "attribute":
            return { kind: "attribute", path: id };
        case "filter-step":
            return { kind: "filter-step", step: id };
        default:
            return { kind: "source", row: id };
    }
}

/**
 * The open row, when there is one and it parses.
 * @param inspected - the store's `inspected`.
 * @returns what to draw, or undefined to fall back to the selection.
 */
function fromRow(inspected: WorkspaceState["inspected"]): Resolved | undefined {
    switch (inspected?.kind) {
        case "graph":
            return { kind: "graph" };
        case "neighborhood":
            return neighborhoodFromId(inspected.id);
        case "group-row":
            return groupRowFromKey(inspected.id);
        case "everything-row":
        case "selection-row":
            return { kind: inspected.kind };
        case "rows":
            return rowsFromId(inspected.id);
        case "measure-row":
        case "run-row":
        case "layer-row":
        case "folder-row":
        case "attribute":
        case "filter-step":
        case "source":
            return inspected.id === undefined ? undefined : fromId(inspected.kind, inspected.id);
        default:
            return undefined;
    }
}

/**
 * What the inspector draws: the open row when there is one and it parses, else the selection.
 * @param inspected - the store's `inspected`.
 * @param selection - the element's selection, or null before the element is up.
 * @returns what to draw.
 */
export function resolveInspected(inspected: WorkspaceState["inspected"], selection: SelectionView | null): Resolved {
    const row = fromRow(inspected);
    if (row !== undefined) {
        return row;
    }
    const nodes = selection?.nodes ?? [];
    const edges = selection?.edges ?? [];
    if (nodes.length === 0 && edges.length === 0) {
        return { kind: "graph" };
    }
    if (nodes.length === 1 && edges.length === 0) {
        return { kind: "node", node: nodes[0] };
    }
    if (nodes.length === 0 && edges.length === 1) {
        return { kind: "edge", edge: edges[0] };
    }
    return { kind: "several" };
}

/**
 * The key that tells one inspected thing from another, so a tab picked on one node is dropped
 * when another opens.
 * @param resolved - what is drawn.
 * @returns the key.
 */
export function identityOf(resolved: Resolved): string {
    return JSON.stringify(resolved);
}
