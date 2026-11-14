/**
 * @file `session.groups`: collapse a group of nodes (a community, a component, the nodes sharing
 * a column's value) to one node, and expand it again. Experimental.
 *
 * A collapse is one undoable step made of ordinary data steps: the members leave the graph, one
 * node takes their place, and their edges to the rest of the graph become one edge per
 * neighbour. Everything that step needs to undo itself rides on the collapsed node's own record,
 * so the collapse is saved with the data, undone with the history and opened with the project,
 * and expanding puts back each member's record, coordinates and pin exactly as they were.
 *
 * The collapsed node and its edges carry neutral facts (`_group.size`, `_group.count`,
 * `_group.weight`) and nothing else: how they look is up to the style layers that read them.
 */

import type { EdgeId, NodeId, Path } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import type { SessionCommand } from "./planning";
import type { RunRef } from "./results/types";
import type { CodedFact } from "./shared";
import type { EdgeRecord, GraphSession, HistoryCode, NodeRecord, PositionEntry } from "./types";

/** A group's value: what its members hold at the path they are grouped by. */
export type GroupValue = string | number | boolean;

/**
 * One group: a run's group (its primary field, such as a community's `group`), or the nodes
 * holding one value at any node path (`data.team`, `results.<run>.<field>`).
 * @experimental groups
 */
export type GroupRef =
    { readonly run: RunRef; readonly group: GroupValue } | { readonly groupBy: Path; readonly group: GroupValue };

/**
 * A group that is collapsed now.
 * @experimental groups
 */
export interface CollapsedGroup {
    /** The path its members were grouped by. */
    readonly groupBy: Path;
    /** Their value at that path. */
    readonly group: GroupValue;
    /** The node standing in for them. */
    readonly node: NodeId;
    /** How many members it stands in for. */
    readonly size: number;
}

/**
 * Collapsing groups of nodes to one node each, and expanding them again. Each call is one
 * undoable step; a collapsed group is saved with the project.
 *
 * The collapsed node's record carries `_group.by`, `_group.value` and `_group.size` (how many
 * members), and each edge standing in for its members' edges carries `_group.count` (how many
 * edges) and `_group.weight` (their summed `weight`, 1 for an edge without one). A style layer
 * reads them like any other value, such as `data._group.size` to size the node.
 * @example
 * ```ts
 * const run = await session.runs.start("louvain");
 * const node = await session.groups.collapse({ run, group: 0 });
 * await session.groups.expand({ run, group: 0 });
 * ```
 * @experimental groups
 */
export interface GroupsApi {
    /**
     * Collapse a group to one node, as one undoable step: its members leave the graph, one node
     * takes their place at their centre, and their edges to each outside node become one edge.
     * @param ref - The group.
     * @returns The id of the node standing in for the group.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when the group has no member in the graph or
     *   is collapsed already.
     */
    collapse(ref: GroupRef): Promise<NodeId>;
    /**
     * Expand a collapsed group, as one undoable step: the node standing in for it leaves, and
     * every member comes back with its record, its coordinates, its pin and its edges.
     * @param ref - The group, as it was collapsed.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when the group is not collapsed, or when an
     *   edge was added to the node standing in for it (its `details.edges`): remove those first.
     */
    expand(ref: GroupRef): Promise<void>;
    /**
     * The groups collapsed now.
     * @returns One entry per collapsed group, in graph order.
     */
    list(): readonly CollapsedGroup[];
}

/**
 * One collapse or expand: the commands it dispatches, in order, as one step. A step, not a
 * `batch`: a batch starts its members together, and the coordinates are written only once the
 * nodes they place are in the graph.
 */
export interface GroupStep {
    readonly label: string;
    readonly fact: CodedFact<HistoryCode>;
    readonly steps: readonly SessionCommand[];
}

/** The record key holding what an expand puts back: bookkeeping, not a column. */
export const RESTORE = "_group.restore";

/** What a collapsed node's record keeps for its expand. */
interface Restore {
    /** The members' records. */
    readonly nodes: readonly NodeRecord[];
    /** Their edges, among themselves and to nodes outside, as `{ source, target, ...attributes }`. */
    readonly edges: readonly Record<string, unknown>[];
    /** Their coordinates, for the members that had one. */
    readonly positions: readonly PositionEntry[];
    /** The members that were pinned. */
    readonly pinned: readonly NodeId[];
}

/** One edge standing in for others, being summed. */
interface Aggregate {
    readonly source: NodeId;
    readonly target: NodeId;
    count: number;
    weight: number;
}

/**
 * The refusal of a call naming a group it cannot act on.
 * @param message - What is wrong.
 * @param details - Its values.
 * @returns The error.
 */
function refusal(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
}

/**
 * An edge's weight for summing: its `weight` when that is a finite number, else 1.
 * @param edge - The edge record.
 * @returns The weight.
 */
function weightOf(edge: Readonly<Record<string, unknown>>): number {
    const held = edge["_group.weight"] ?? edge.weight;
    return typeof held === "number" && Number.isFinite(held) ? held : 1;
}

/**
 * An edge record as an add takes it back: without its element-assigned id.
 * @param edge - The edge record.
 * @returns The record.
 */
function edgeInput(edge: EdgeRecord): Record<string, unknown> {
    const { id: _id, ...rest } = edge;
    return rest;
}

/**
 * Sum one edge into the aggregates.
 * @param into - The aggregates by ends.
 * @param source - The aggregate's source.
 * @param target - The aggregate's target.
 * @param edge - The edge summed: an aggregate adds its own count and weight.
 * @param directed - Whether the graph is directed.
 */
function addTo(
    into: Map<string, Aggregate>,
    source: NodeId,
    target: NodeId,
    edge: Readonly<Record<string, unknown>>,
    directed: boolean,
): void {
    // On an undirected graph a-b and b-a are one pair: one edge stands in for both, the way round
    // the first one seen runs.
    const ends = [JSON.stringify(source), JSON.stringify(target)];
    if (!directed) {
        ends.sort((a, b) => a.localeCompare(b));
    }

    const key = ends.join(",");
    const held = into.get(key) ?? { source, target, count: 0, weight: 0 };
    const count = edge["_group.count"];
    held.count += typeof count === "number" ? count : 1;
    held.weight += weightOf(edge);
    into.set(key, held);
}

/**
 * The records of aggregate edges.
 * @param aggregates - The aggregates.
 * @returns The records.
 */
function aggregateRecords(aggregates: Map<string, Aggregate>): Record<string, unknown>[] {
    return [...aggregates.values()].map(({ source, target, count, weight }) => ({
        source,
        target,
        "_group.count": count,
        "_group.weight": weight,
    }));
}

/**
 * The step adding edges, when there are any.
 * @param records - The edge records, `source` and `target` naming their ends.
 * @returns The step, or none.
 */
function addEdgesStep(records: readonly Record<string, unknown>[]): SessionCommand[] {
    return records.length === 0
        ? []
        : [{ op: "data.apply", mutation: { kind: "add-edges", records, source: "source", target: "target" } }];
}

/**
 * The step placing a collapsed node at the centre of its members, when any was placed.
 * @param node - The collapsed node.
 * @param positions - The members' coordinates.
 * @returns The step, or none.
 */
function centreStep(node: NodeId, positions: readonly PositionEntry[]): SessionCommand[] {
    if (positions.length === 0) {
        return [];
    }

    const mean = (axis: "x" | "y" | "z"): number =>
        positions.reduce((sum, each) => sum + (each[axis] ?? 0), 0) / positions.length;
    return [{ op: "positions.set", entries: [{ id: node, x: mean("x"), y: mean("y"), z: mean("z") }] }];
}

/**
 * Build `session.groups`.
 * @param session - The session it reads.
 * @param edit - Dispatches a step in line with the loads, built once they have landed.
 * @returns The API.
 */
export function createGroupsApi(
    session: GraphSession,
    edit: (build: () => Promise<GroupStep>) => Promise<void>,
): GroupsApi {
    const groupByOf = (ref: GroupRef): Path => ("run" in ref ? session.results.path(ref.run) : ref.groupBy);
    const nodeIdOf = (groupBy: Path, group: GroupValue): NodeId => `group:${groupBy}=${String(group)}`;
    const restoreOf = (node: NodeRecord | undefined): Restore | undefined => node?.[RESTORE] as Restore | undefined;
    const indexOf = (id: NodeId): number => session.data.snapshot().ids.indexOf(id);
    const sum = (
        into: Map<string, Aggregate>,
        source: NodeId,
        target: NodeId,
        edge: Readonly<Record<string, unknown>>,
    ): void => {
        addTo(into, source, target, edge, session.status.directed);
    };

    /**
     * Where each hidden node is held: the collapsed node whose record keeps it.
     * @returns The collapsed node by hidden id.
     */
    const hiddenIn = (): Map<NodeId, NodeId> => {
        const held = new Map<NodeId, NodeId>();
        for (const node of session.data.nodes()) {
            for (const member of restoreOf(node)?.nodes ?? []) {
                held.set(member.id, node.id);
            }
        }
        return held;
    };

    /**
     * The members' edges: the ones to keep for the expand, and one aggregate per outside end.
     * @param members - The members.
     * @param node - The node standing in for them.
     * @returns The kept edges and the aggregates.
     */
    const outsideEdges = (
        members: ReadonlySet<NodeId>,
        node: NodeId,
    ): { edges: Record<string, unknown>[]; aggregates: Map<string, Aggregate> } => {
        // ponytail: walks every edge per call; read each member's neighbours when graphs outgrow it.
        const edges: Record<string, unknown>[] = [];
        const aggregates = new Map<string, Aggregate>();
        for (const edge of session.data.edges()) {
            const fromInside = members.has(edge.source);
            const toInside = members.has(edge.target);
            if (!fromInside && !toInside) {
                continue;
            }

            // An edge standing in for others keeps them in its collapsed end's record: summed, not kept.
            if (edge["_group.count"] === undefined) {
                edges.push(edgeInput(edge));
            }

            if (!(fromInside && toInside)) {
                sum(aggregates, fromInside ? node : edge.source, toInside ? node : edge.target, edge);
            }
        }
        return { edges, aggregates };
    };

    /**
     * The members' records, coordinates and pins.
     * @param members - The members.
     * @returns What an expand puts back of them.
     */
    const memberState = (members: ReadonlySet<NodeId>): Omit<Restore, "edges"> => {
        const nodes: NodeRecord[] = [];
        const positions: PositionEntry[] = [];
        const point = { x: 0, y: 0, z: 0 };
        for (const id of members) {
            const record = session.data.node(id);
            if (record !== undefined) {
                nodes.push(record);
            }

            const index = indexOf(id);
            if (session.positions.isPlaced(index)) {
                session.positions.read(index, point);
                positions.push({ id, x: point.x, y: point.y, z: point.z });
            }
        }
        return { nodes, positions, pinned: [...members].filter((id) => session.positions.pinned.has(id)) };
    };

    /**
     * The stored edges of a group being expanded: those whose ends are all in the graph again, and
     * those to a member of another collapsed group, summed into an edge to that group's node and
     * moved into its record.
     * @param restore - The group's record.
     * @param held - The collapsed node holding each node still hidden.
     * @returns The plain edges, the aggregates and the moved edges by keeper.
     */
    const storedEdgesBack = (
        restore: Restore,
        held: ReadonlyMap<NodeId, NodeId>,
    ): {
        plain: Record<string, unknown>[];
        aggregates: Map<string, Aggregate>;
        moved: Map<NodeId, Record<string, unknown>[]>;
    } => {
        const at = (id: NodeId): NodeId => held.get(id) ?? id;
        const plain: Record<string, unknown>[] = [];
        const aggregates = new Map<string, Aggregate>();
        const moved = new Map<NodeId, Record<string, unknown>[]>();
        for (const edge of restore.edges) {
            const source = edge.source as NodeId;
            const target = edge.target as NodeId;
            const keeper = held.get(source) ?? held.get(target);
            if (keeper === undefined) {
                plain.push(edge);
                continue;
            }

            sum(aggregates, at(source), at(target), edge);
            moved.set(keeper, [...(moved.get(keeper) ?? []), edge]);
        }
        return { plain, aggregates, moved };
    };

    /**
     * Another collapsed node's edges to a member that is back, summed into an edge to that member.
     * @param back - The members coming back.
     * @param held - The collapsed node holding each node still hidden.
     * @param into - The aggregates to sum into.
     */
    const othersEdgesBack = (
        back: ReadonlySet<NodeId>,
        held: ReadonlyMap<NodeId, NodeId>,
        into: Map<string, Aggregate>,
    ): void => {
        for (const other of new Set(held.values())) {
            for (const edge of restoreOf(session.data.node(other))?.edges ?? []) {
                const source = edge.source as NodeId;
                const target = edge.target as NodeId;
                if (back.has(source) || back.has(target)) {
                    sum(into, back.has(source) ? source : other, back.has(target) ? target : other, edge);
                }
            }
        }
    };

    const collapseCommand = async (groupBy: Path, group: GroupValue): Promise<GroupStep> => {
        const node = nodeIdOf(groupBy, group);
        if (session.data.node(node) !== undefined) {
            throw refusal(`The group ${String(group)} of ${groupBy} is collapsed already.`, { groupBy, group });
        }

        const resolved = await session.scope.resolve({
            define: {
                kind: "rule",
                where: { kind: "categories", attribute: groupBy, values: [String(group)] },
                reading: "induced",
            },
        });
        const members = new Set(resolved.nodes);
        if (members.size === 0) {
            throw refusal(`The group ${String(group)} of ${groupBy} has no node in the graph.`, { groupBy, group });
        }

        const { edges, aggregates } = outsideEdges(members, node);
        const restore: Restore = { ...memberState(members), edges };
        const steps: SessionCommand[] = [
            { op: "data.apply", mutation: { kind: "remove-nodes", ids: [...members] } },
            {
                op: "data.apply",
                mutation: {
                    kind: "add-nodes",
                    idPath: "id",
                    records: [
                        {
                            id: node,
                            "_group.by": groupBy,
                            "_group.value": group,
                            "_group.size": members.size,
                            [RESTORE]: restore,
                        },
                    ],
                },
            },
            ...addEdgesStep(aggregateRecords(aggregates)),
            ...centreStep(node, restore.positions),
        ];

        return {
            label: `Collapsed group ${String(group)}`,
            fact: { code: "groups.collapse", params: { groupBy, group, size: members.size } },
            steps,
        };
    };

    const expandCommand = (groupBy: Path, group: GroupValue): GroupStep => {
        const node = nodeIdOf(groupBy, group);
        const restore = restoreOf(session.data.node(node));
        if (restore === undefined) {
            throw refusal(`The group ${String(group)} of ${groupBy} is not collapsed.`, { groupBy, group });
        }

        // An edge someone added to the node standing in has no member to go back to.
        const added = session.data
            .edges()
            .filter((edge) => (edge.source === node || edge.target === node) && edge["_group.count"] === undefined)
            .map((edge) => edge.id);
        if (added.length > 0) {
            throw refusal(`The node standing in for group ${String(group)} of ${groupBy} holds edges added to it.`, {
                groupBy,
                group,
                edges: added,
            });
        }

        const back = new Set(restore.nodes.map((each) => each.id));
        const held = hiddenIn();
        for (const id of back) {
            held.delete(id);
        }

        // An end is back, in the graph, or held by another collapsed node: then the edge is summed
        // into an edge to that node, and kept in its record for its own expand.
        const { plain, aggregates, moved } = storedEdgesBack(restore, held);
        othersEdgesBack(back, held, aggregates);
        const rows = [...moved].map(([keeper, edges]) => {
            const kept = restoreOf(session.data.node(keeper)) as Restore;
            return { id: keeper, values: { [RESTORE]: { ...kept, edges: [...kept.edges, ...edges] } } };
        });
        const steps: SessionCommand[] = [
            { op: "data.apply", mutation: { kind: "remove-nodes", ids: [node] } },
            { op: "data.apply", mutation: { kind: "add-nodes", idPath: "id", records: restore.nodes } },
            ...addEdgesStep(plain),
            ...addEdgesStep(aggregateRecords(aggregates)),
            ...(rows.length === 0
                ? []
                : [{ op: "data.apply", mutation: { kind: "update-rows", target: "node", rows } } as const]),
            ...(restore.positions.length === 0 ? [] : [{ op: "positions.set", entries: restore.positions } as const]),
            ...(restore.pinned.length === 0
                ? []
                : [{ op: "positions.pin", ids: restore.pinned, pinned: true } as const]),
        ];

        return {
            label: `Expanded group ${String(group)}`,
            fact: { code: "groups.expand", params: { groupBy, group, size: restore.nodes.length } },
            steps,
        };
    };

    return {
        async collapse(ref: GroupRef): Promise<NodeId> {
            const groupBy = groupByOf(ref);
            await edit(() => collapseCommand(groupBy, ref.group));
            return nodeIdOf(groupBy, ref.group);
        },
        async expand(ref: GroupRef): Promise<void> {
            const groupBy = groupByOf(ref);
            await edit(() => Promise.resolve(expandCommand(groupBy, ref.group)));
        },
        list(): readonly CollapsedGroup[] {
            return session.data.nodes().flatMap((node) => {
                const restore = restoreOf(node);
                return restore === undefined
                    ? []
                    : [
                          {
                              groupBy: node["_group.by"] as Path,
                              group: node["_group.value"] as GroupValue,
                              node: node.id,
                              size: restore.nodes.length,
                          },
                      ];
            });
        },
    };
}

/**
 * The graph as it would be with every group expanded: what a project file saves, so a collapse is
 * saved as the decision and the members' records, coordinates and run values are saved as they
 * are. Null when no group is collapsed.
 */
export interface ExpandedGraph {
    /** Every node: the graph's own, then the members held by the collapsed nodes. */
    readonly nodes: readonly NodeRecord[];
    /**
     * Every edge as a save writes it (`{ source, target, ...attributes }`) beside its id: the
     * graph's own edges keep theirs; a member's edge kept for an expand gets one no graph holds.
     */
    readonly edges: readonly { readonly id: EdgeId; readonly record: Readonly<Record<string, unknown>> }[];
    /** Where each placed node stands. */
    readonly positions: readonly PositionEntry[];
    /** The pinned nodes. */
    readonly pinned: readonly NodeId[];
    /** The collapses, in the order they are made again on open. */
    readonly collapsed: readonly { readonly groupBy: Path; readonly group: GroupValue }[];
    /** Edges added to a node standing in for a group, added again once the groups are collapsed. */
    readonly added: readonly Record<string, unknown>[];
}

/**
 * The graph with every group expanded, read without changing anything.
 * @param session - The session.
 * @returns The expanded graph, or null when no group is collapsed.
 */
export function expandedGraph(session: GraphSession): ExpandedGraph | null {
    // ponytail: a member that is itself a collapsed node (a group of collapsed nodes) is saved as
    // that node; flatten here if nesting collapses ever becomes a use.
    // Asked on every save, so answered first from the attribute list, kept per data revision,
    // before any record is read.
    if (!session.data.attributes().some((each) => each.kind === "node" && each.path === "data._group.by")) {
        return null;
    }

    const all = session.data.nodes();
    const standing = all.filter((node) => node[RESTORE] !== undefined);
    if (standing.length === 0) {
        return null;
    }

    const stands = new Set(standing.map((node) => node.id));
    const restores = standing.map((node) => node[RESTORE] as Restore);
    const { ids } = session.data.snapshot();
    const point = { x: 0, y: 0, z: 0 };
    const positions: PositionEntry[] = [];
    const nodes: NodeRecord[] = [];
    for (const node of all) {
        if (stands.has(node.id)) {
            continue;
        }

        nodes.push(node);
        const index = ids.indexOf(node.id);
        if (session.positions.isPlaced(index)) {
            session.positions.read(index, point);
            positions.push({ id: node.id, x: point.x, y: point.y, z: point.z });
        }
    }

    const edges: { id: EdgeId; record: Readonly<Record<string, unknown>> }[] = [];
    const added: Record<string, unknown>[] = [];
    for (const edge of session.data.edges()) {
        if (!stands.has(edge.source) && !stands.has(edge.target)) {
            edges.push({ id: edge.id, record: edgeInput(edge) });
        } else if (edge["_group.count"] === undefined) {
            added.push(edgeInput(edge));
        }
    }

    for (const restore of restores) {
        nodes.push(...restore.nodes);
        positions.push(...restore.positions);
        for (const record of restore.edges) {
            edges.push({ id: `${RESTORE}:${String(edges.length)}`, record });
        }
    }

    return {
        nodes,
        edges,
        positions,
        pinned: [
            ...[...session.positions.pinned].filter((id) => !stands.has(id)),
            ...restores.flatMap((restore) => restore.pinned),
        ],
        collapsed: standing.map((node) => ({
            groupBy: node["_group.by"] as Path,
            group: node["_group.value"] as GroupValue,
        })),
        added,
    };
}
