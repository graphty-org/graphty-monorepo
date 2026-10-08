/**
 * What the inspector shows (tier1-design.md section 2.7): a row another package asked for, or
 * else whatever graphty-element has selected.
 *
 * A package opens a row by writing `inspected` in the workspace store with one of the kinds
 * below. The selection needs no writing: with no row open, the inspector reads the element's
 * selection, and a selection change closes any open row (the inspector shows the selected thing).
 */

import type { NodeId, RunId } from "@graphty/graphty-element/session";

import type { WorkspaceState } from "../state/store";

/**
 * Every kind the inspector draws, with the id each one carries in `inspected.id`.
 *
 * - `graph`: nothing selected; no id.
 * - `node`: one node selected; no id (read from the selection).
 * - `edge`: one edge selected; no id.
 * - `several`: more than one element selected; no id.
 * - `neighborhood`: a node's neighbors; the id is `nodeKey(center)`.
 * - `measure-row` and `run-row`: a run's row; the id is the run id. Either kind opens either
 *   view: the run's result shape decides between the measure and the groups.
 * - `group-row`: one group of a grouping run; the id is `groupKey(runId, group)`.
 * - `everything-row` and `selection-row`: the Graph place's two built-in rows; no id.
 * - `layer-row`: one of the reader's own style layers in the Graph place; the id is the layer id.
 * - `attribute`: an attribute from the Data place; the id is its path, such as `data.age`.
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
    "attribute",
] as const;

/** One of {@link INSPECTED_KINDS}. */
export type InspectedKindId = (typeof INSPECTED_KINDS)[number];

/** What the inspector draws now. */
export type Resolved =
    | { readonly kind: "graph" }
    | { readonly kind: "node"; readonly node: NodeId }
    | { readonly kind: "edge"; readonly edge: string }
    | { readonly kind: "several" }
    | { readonly kind: "neighborhood"; readonly node: NodeId }
    | { readonly kind: "measure-row" | "run-row"; readonly run: RunId }
    | { readonly kind: "group-row"; readonly run: RunId; readonly group: string | number }
    | { readonly kind: "everything-row" | "selection-row" }
    | { readonly kind: "layer-row"; readonly layer: string }
    | { readonly kind: "attribute"; readonly path: string };

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
 * The id a group row carries in `inspected.id`.
 * @param run - the grouping run.
 * @param group - the group's value, as the run publishes it.
 * @returns the key.
 */
export function groupKey(run: RunId, group: string | number): string {
    return JSON.stringify([run, group]);
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

/** The selection as the inspector reads it. */
interface SelectionView {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly string[];
}

/**
 * The open row, when there is one and it parses.
 * @param inspected - the store's `inspected`.
 * @returns what to draw, or undefined to fall back to the selection.
 */
function fromRow(inspected: WorkspaceState["inspected"]): Resolved | undefined {
    switch (inspected?.kind) {
        case "neighborhood": {
            const node = idOf(parse(inspected.id));
            if (node !== undefined) {
                return { kind: "neighborhood", node };
            }
            break;
        }
        case "measure-row":
        case "run-row":
            if (inspected.id !== undefined) {
                return { kind: inspected.kind, run: inspected.id };
            }
            break;
        case "group-row": {
            const parsed = parse(inspected.id);
            const run: unknown = Array.isArray(parsed) ? parsed[0] : undefined;
            const group = Array.isArray(parsed) ? idOf(parsed[1]) : undefined;
            if (typeof run === "string" && group !== undefined) {
                return { kind: "group-row", run, group };
            }
            break;
        }
        case "everything-row":
        case "selection-row":
            return { kind: inspected.kind };
        case "layer-row":
            if (inspected.id !== undefined) {
                return { kind: "layer-row", layer: inspected.id };
            }
            break;
        case "attribute":
            if (inspected.id !== undefined) {
                return { kind: "attribute", path: inspected.id };
            }
            break;
        default:
            break;
    }
    return undefined;
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
