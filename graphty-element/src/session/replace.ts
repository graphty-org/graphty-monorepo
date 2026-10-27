/**
 * @file Replacing one load with a newer copy of it: which of the load's nodes and edges go, which
 * stay with new values, and which the newer copy adds. Pure planning over plain rows; `SessionData`
 * reads the graph, dispatches the plan as one batch and reports what it counted.
 */

import type { EdgeId, NodeId } from "../catalog/types";
import { readEndpoint } from "../data/endpoints";
import type { HeldRows } from "./commands/data";
import type { JoinRecord, ReplaceCounts, RowUpdate } from "./types";

/** One of the load's rows as the graph holds it now. */
export interface HeldRow<Id> {
    readonly id: Id;
    readonly data: Readonly<Record<string, unknown>>;
}

/** One edge as the graph holds it now. */
export interface HeldEdge extends HeldRow<EdgeId> {
    readonly source: NodeId;
    readonly target: NodeId;
}

/** What the plan reads: the load's rows now, the graph around them, and the newer copy's rows. */
export interface ReplaceInput {
    /** The nodes the load supplied that the graph holds. */
    readonly nodes: readonly HeldRow<NodeId>[];
    /** The edges the load supplied that the graph holds. */
    readonly edges: readonly HeldEdge[];
    /** The load's nodes and edges another load also supplied: they stay whatever the copy says. */
    readonly shared: { readonly nodes: ReadonlySet<NodeId>; readonly edges: ReadonlySet<EdgeId> };
    /** Every edge the graph holds, by endpoint pair: a copy's edge another load holds is not added. */
    readonly graphPairs: ReadonlySet<string>;
    /** Whether the graph holds a node. */
    readonly hasNode: (id: NodeId) => boolean;
    /** Whether the graph's edges are directed. */
    readonly directed: boolean;
    /** The newer copy's rows, as a draft holds them. */
    readonly held: HeldRows;
    /** The expressions a row's id and ends are read with when the held rows name none. */
    readonly paths: { readonly nodeId: string; readonly source: string; readonly target: string };
}

/** What replacing does to the graph, and what it counted. */
export interface ReplacePlan {
    readonly removeNodes: readonly NodeId[];
    readonly removeEdges: readonly EdgeId[];
    readonly nodeRows: readonly RowUpdate<NodeId>[];
    readonly edgeRows: readonly RowUpdate<EdgeId>[];
    readonly nodes: ReplaceCounts;
    readonly edges: ReplaceCounts;
}

/**
 * An endpoint pair as a key: both orders are one pair when the graph is undirected.
 * @param source - one end
 * @param target - the other
 * @param directed - whether order counts
 * @returns the key
 */
export function pairKey(source: string | number, target: string | number, directed: boolean): string {
    const ends = [String(source), String(target)];
    if (!directed) {
        ends.sort(); // NOSONAR(S2871): code-unit order is the point: a locale-free key for the pair
    }

    return ends.join("\u0000");
}

/**
 * An id read from a row, as text, or null when the row gives none.
 * @param value - what the row gave
 * @returns the text
 */
function idText(value: unknown): string | null {
    return typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? String(value) : null;
}

/**
 * The column an expression reads, quoted (`"from"`) or plain (`from`).
 * @param expression - the expression
 * @returns the column's name
 */
function columnOf(expression: string): string {
    return expression.startsWith('"') && expression.endsWith('"') ? (JSON.parse(expression) as string) : expression;
}

/**
 * Whether a newer row says something other than the record the graph holds, over the row's own
 * columns less the ones that name it (the graph keeps an edge's ends apart from its record).
 * @param row - the newer row
 * @param held - the record held
 * @param naming - the columns that name the row
 * @returns true when a value differs
 */
function differs(
    row: Readonly<Record<string, unknown>>,
    held: Readonly<Record<string, unknown>>,
    naming: ReadonlySet<string>,
): boolean {
    return Object.entries(row).some(
        ([name, value]) => !naming.has(name) && JSON.stringify(value) !== JSON.stringify(held[name]),
    );
}

/**
 * Plan a replacement. Edges match by their endpoint pair (a repeated pair is one edge, as the
 * merge that adds the copy's new edges keeps the first); nodes match by id.
 * ponytail: an edge id column (`edgeIdPath`) is not read; match by it when a source keys its edges.
 * @param input - the load's rows, the graph and the newer copy
 * @returns what goes, what changes and the counts
 */
export function planReplace(input: ReplaceInput): ReplacePlan {
    const { held, paths, directed } = input;
    const nodePath = held.idPath ?? paths.nodeId;
    const sourcePath = held.source ?? paths.source;
    const targetPath = held.target ?? paths.target;

    // The copy's nodes: its node rows by id, and every id an edge names.
    const newNodes = new Map<string, Readonly<Record<string, unknown>>>();
    const named = new Set<string>();
    for (const row of held.nodes) {
        const id = idText(readEndpoint(row, nodePath));
        if (id !== null) {
            named.add(id);
            if (!newNodes.has(id)) {
                newNodes.set(id, row);
            }
        }
    }

    const newEdges = new Map<string, Readonly<Record<string, unknown>>>();
    for (const row of held.edges) {
        const source = idText(readEndpoint(row, sourcePath));
        const target = idText(readEndpoint(row, targetPath));
        if (source === null || target === null) {
            continue;
        }

        named.add(source);
        named.add(target);
        const key = pairKey(source, target, directed);
        if (!newEdges.has(key)) {
            newEdges.set(key, row);
        }
    }

    // The load's edges: gone, changed or kept.
    const ends = new Set([columnOf(sourcePath), columnOf(targetPath)]);
    const removeEdges: EdgeId[] = [];
    const edgeRows: RowUpdate<EdgeId>[] = [];
    const oldPairs = new Set<string>();
    for (const edge of input.edges) {
        const key = pairKey(edge.source, edge.target, directed);
        oldPairs.add(key);
        const row = newEdges.get(key);
        if (row === undefined) {
            if (!input.shared.edges.has(edge.id)) {
                removeEdges.push(edge.id);
            }
        } else if (differs(row, edge.data, ends)) {
            edgeRows.push({ id: edge.id, values: row });
        }
    }

    let edgesAdded = 0;
    for (const key of newEdges.keys()) {
        if (!oldPairs.has(key) && !input.graphPairs.has(key)) {
            edgesAdded++;
        }
    }

    // The load's nodes: gone, changed or kept.
    const ids = new Set([columnOf(nodePath)]);
    const removeNodes: NodeId[] = [];
    const nodeRows: RowUpdate<NodeId>[] = [];
    for (const node of input.nodes) {
        const row = newNodes.get(String(node.id));
        if (!named.has(String(node.id))) {
            if (!input.shared.nodes.has(node.id)) {
                removeNodes.push(node.id);
            }
        } else if (row !== undefined && differs(row, node.data, ids)) {
            nodeRows.push({ id: node.id, values: row });
        }
    }

    // A node that goes is one the copy does not name, so every named id the graph lacks is new.
    const nodesAdded = [...named].filter((id) => !input.hasNode(id)).length;

    return {
        removeNodes,
        removeEdges,
        nodeRows,
        edgeRows,
        nodes: { added: nodesAdded, removed: removeNodes.length, changed: nodeRows.length },
        edges: { added: edgesAdded, removed: removeEdges.length, changed: edgeRows.length },
    };
}

/**
 * A joined table of edges as its newer copy has it: the copy's rows, and how many of them match
 * two nodes the graph holds. A join of values keeps its record: a newer copy of it is joined
 * again with `editJoin`.
 * ponytail: an end only this join made counts as matched; subtract the join's own nodes if the
 * count must match `joinReport` exactly.
 * @param join - the join as recorded
 * @param held - the newer copy's rows
 * @param hasNode - whether the graph holds a node
 * @param paths - the expressions a row's ends are read with when the held rows name none
 * @returns the join, recounted
 */
export function rejoined(
    join: JoinRecord,
    held: HeldRows,
    hasNode: (id: NodeId) => boolean,
    paths: Pick<ReplaceInput["paths"], "source" | "target">,
): JoinRecord {
    if (join.shape !== "edges") {
        return join;
    }

    const sourcePath = held.source ?? paths.source;
    const targetPath = held.target ?? paths.target;
    const found = (row: Readonly<Record<string, unknown>>, path: string): boolean => {
        const id = idText(readEndpoint(row, path));
        return id !== null && hasNode(id);
    };
    const matched = held.edges.filter((row) => found(row, sourcePath) && found(row, targetPath)).length;
    const columns = [...new Set(held.edges.flatMap((row) => Object.keys(row)))];
    return Object.freeze({
        ...join,
        rows: held.edges.length,
        matched,
        table: Object.freeze({
            name: join.table.name,
            columns: Object.freeze(columns),
            rows: Object.freeze([...held.edges]),
        }),
    });
}
