/**
 * @file The groups a file nests nodes in, which the element lays out by their members.
 *
 * graph-io reads a file's containment -- a yEd group, a Cytoscape compound node, a Graphviz
 * cluster -- into the `parent` or `parents` node role. A group the file gives a position keeps
 * it, and the box the file stores; a group with none is not a node for the layout to place: it
 * follows its members' box (see `LayoutManager.placeGroups`).
 */

import { RANK_COLUMN, RANK_SET_COLUMN } from "@graphty/graph-io/dot";

import type { NodeIdType } from "../Node";
import { childrenOf } from "../session/styles/fileStyles/translate";
import { filePositionsOf } from "./filePositions";
import { readerImport } from "./graph-io-import";

/** The graph value the groups of the loaded files are kept under. */
export const GROUPS_VALUE = "groups";

/** One group with no stored position, and the nodes it holds. */
export interface NodeGroup {
    /** The group node. */
    readonly group: NodeIdType;
    /** The nodes it holds directly. */
    readonly members: readonly NodeIdType[];
}

/**
 * The groups with no stored position in the file a reader last read.
 * @param reader - The data source.
 * @param heldId - The id the graph holds a node under, for an id it may spell the other way.
 * @returns The groups; empty when the reader read no graph-io import or the file nests nothing.
 */
export async function readGroups(
    reader: object,
    heldId: (id: NodeIdType) => NodeIdType | undefined,
): Promise<NodeGroup[]> {
    const pending = readerImport(reader);
    if (pending === null) {
        return [];
    }

    const { imported } = await pending;
    const { snapshot } = imported;
    const children = childrenOf(snapshot);
    if (children.size === 0) {
        return [];
    }

    const positions = filePositionsOf(imported);
    const coords = positions?.usable === true ? positions.coords : null;
    const idOf = (row: number): NodeIdType => {
        const id = snapshot.ids.idOf(row);
        return heldId(id) ?? id;
    };
    const out: NodeGroup[] = [];
    for (const [row, members] of children) {
        if (coords !== null && !Number.isNaN(coords[3 * row])) {
            continue;
        }

        out.push({ group: idOf(row), members: members.map(idOf) });
    }

    return out;
}

/**
 * The groups a graph value holds, read defensively: anything else reads as none.
 * @param value - The graph value.
 * @returns The groups.
 */
export function groupsOf(value: unknown): readonly NodeGroup[] {
    return Array.isArray(value) ? (value as NodeGroup[]) : [];
}

/** The graph value the rank subgraphs of the loaded files are kept under. */
export const RANK_SETS_VALUE = "rankSets";

/**
 * Nodes a Graphviz file puts on one rank (a `rank=same` subgraph), or on the first or last
 * (`min`, `max`, `source`, `sink`), which a Graphviz layout hands back to Graphviz.
 */
export interface RankSet {
    /** The subgraph's `rank`. */
    readonly rank: string;
    /** Its nodes. */
    readonly members: readonly NodeIdType[];
}

/**
 * The rank subgraphs of the file a reader last read (graph-io's `graphty.rank` and
 * `graphty.rankSet` node columns), in the order their first node was read.
 * @param reader - The data source.
 * @param heldId - The id the graph holds a node under, for an id it may spell the other way.
 * @returns The rank sets; empty when the file has none.
 */
export async function readRankSets(
    reader: object,
    heldId: (id: NodeIdType) => NodeIdType | undefined,
): Promise<RankSet[]> {
    const pending = readerImport(reader);
    if (pending === null) {
        return [];
    }

    const { snapshot } = (await pending).imported;
    const rank = snapshot.nodes.get(RANK_COLUMN);
    const set = snapshot.nodes.get(RANK_SET_COLUMN);
    if (rank === null || set === null) {
        return [];
    }

    const sets = new Map<string, { rank: string; members: NodeIdType[] }>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (!rank.isSet(row) || !set.isSet(row)) {
            continue;
        }

        const key = String(set.value(row));
        const entry = sets.get(key) ?? { rank: String(rank.value(row)), members: [] };
        const id = snapshot.ids.idOf(row);
        entry.members.push(heldId(id) ?? id);
        sets.set(key, entry);
    }

    return [...sets.values()];
}

/**
 * The rank sets a graph value holds, read defensively: anything else reads as none.
 * @param value - The graph value.
 * @returns The rank sets.
 */
export function rankSetsOf(value: unknown): readonly RankSet[] {
    return Array.isArray(value) ? (value as RankSet[]) : [];
}
