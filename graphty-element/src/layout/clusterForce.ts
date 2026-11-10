/**
 * @file The cluster force's options and the part every force engine shares: `clusterBy` names a node attribute or a
 * run's field, and the nodes that share a value are pulled toward their centroid. The simulations do the pulling
 * themselves (`LayoutSimulation.setClusters`); the ngraph and d3 engines add a force of their own over
 * {@link clusterCentroids}.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { z } from "zod";

import type { Node } from "../Node";
import { atPath } from "./SnapshotLayoutEngine";

/** The `clusterBy` option every force layout publishes. */
export const clusterByOption = {
    schema: z.string().nullable().default(null),
    meta: {
        label: "Cluster By",
        description: "The node attribute or result field whose values name each node's community; unset, no pull",
    },
};

/** The `clusterStrength` option every force layout publishes. */
export const clusterStrengthOption = {
    schema: z.number().nonnegative().default(1),
    meta: {
        label: "Cluster Strength",
        description: "How hard a node is pulled toward its community's centroid: 1 is about one more edge",
        step: 0.1,
    },
};

/**
 * Reads a `data.<key>` or `results.<run>.<field>` path through the session, by row of a snapshot.
 * @param path - The path.
 * @param graph - The snapshot whose rows the values are laid out over; absent, the element's current one.
 * @returns The values, or null when nothing carries the path.
 */
export type ClusterColumn = (path: string, graph?: GraphSnapshot) => readonly unknown[] | null;

/**
 * Each node's community: numbered in order of first appearance, so the same partition reads the same. A node with no
 * value, and one `skip` answers true for, is in none.
 * @param path - The option's value.
 * @param nodes - The nodes.
 * @param column - Reads a session path; null when nothing can.
 * @param skip - Answers true for a row the force must leave alone.
 * @param graph - The snapshot the rows belong to.
 * @returns The community of every node that is in one.
 */
export function readCommunities(
    path: string,
    nodes: Iterable<Node>,
    column: ClusterColumn | null,
    skip: (row: number) => boolean,
    graph?: GraphSnapshot,
): Map<Node, number> {
    return readMembers(
        path,
        nodes,
        (node) => node.index,
        (node) => node.data,
        column,
        skip,
        graph,
    );
}

/**
 * {@link readCommunities} over rows rather than `Node`s, for renderPath "batched", where a row may have no `Node`.
 * @param path - The option's value.
 * @param rowCount - How many rows the snapshot has.
 * @param dataOf - A row's record.
 * @param column - Reads a session path; null when nothing can.
 * @param skip - Answers true for a row the force must leave alone.
 * @param graph - The snapshot the rows belong to.
 * @returns The community of every row that is in one.
 */
export function readRowCommunities(
    path: string,
    rowCount: number,
    dataOf: (row: number) => unknown,
    column: ClusterColumn | null,
    skip: (row: number) => boolean,
    graph?: GraphSnapshot,
): Map<number, number> {
    const rows = Array.from({ length: rowCount }, (_, row) => row);
    return readMembers(path, rows, (row) => row, dataOf, column, skip, graph);
}

/**
 * The reading both {@link readCommunities} and {@link readRowCommunities} share.
 * @param path - The option's value.
 * @param members - The nodes or rows, in the order communities are numbered.
 * @param rowOf - A member's row.
 * @param dataOf - A member's record.
 * @param column - Reads a session path; null when nothing can.
 * @param skip - Answers true for a row the force must leave alone.
 * @param graph - The snapshot the rows belong to.
 * @returns The community of every member that is in one.
 */
function readMembers<M>(
    path: string,
    members: Iterable<M>,
    rowOf: (member: M) => number,
    dataOf: (member: M) => unknown,
    column: ClusterColumn | null,
    skip: (row: number) => boolean,
    graph?: GraphSnapshot,
): Map<M, number> {
    const fromSession = path.startsWith("results.") || path.startsWith("data.");
    const values = fromSession ? (column?.(path, graph) ?? null) : null;
    const numbers = new Map<unknown, number>();
    const communities = new Map<M, number>();
    for (const member of members) {
        const row = rowOf(member);
        const value = fromSession ? values?.[row] : atPath(dataOf(member), path);
        if (value !== undefined && value !== null && !skip(row)) {
            const community = numbers.get(value) ?? numbers.size;
            numbers.set(value, community);
            communities.set(member, community);
        }
    }

    return communities;
}

/**
 * Whether two reads name the same partition.
 * @param a - One read.
 * @param b - The other.
 * @returns True when every node is in the same community in both.
 */
export function sameCommunities<M>(a: ReadonlyMap<M, number>, b: ReadonlyMap<M, number>): boolean {
    return a.size === b.size && [...a].every(([member, community]) => b.get(member) === community);
}

/** A body with a position, in the shape both d3's nodes and ngraph's body positions have. */
export interface ClusterPoint {
    x: number;
    y: number;
    z?: number;
}

/**
 * Each community's centroid.
 * @param points - One position per member.
 * @param communities - The community of each, in the same order, each below `count`.
 * @param count - How many communities there are.
 * @param massOf - A member's mass.
 * @returns x, y and z per community.
 */
export function clusterCentroids(
    points: readonly ClusterPoint[],
    communities: readonly number[],
    count: number,
    massOf: (member: number) => number,
): Float64Array {
    const sums = new Float64Array(4 * count);
    points.forEach(({ x, y, z = 0 }, member) => {
        const at = 4 * communities[member];
        const mass = massOf(member);
        sums[at] += mass * x;
        sums[at + 1] += mass * y;
        sums[at + 2] += mass * z;
        sums[at + 3] += mass;
    });
    const centroids = new Float64Array(3 * count);
    for (let c = 0; c < count; c++) {
        const mass = sums[4 * c + 3] || 1;
        centroids[3 * c] = sums[4 * c] / mass;
        centroids[3 * c + 1] = sums[4 * c + 1] / mass;
        centroids[3 * c + 2] = sums[4 * c + 2] / mass;
    }

    return centroids;
}
