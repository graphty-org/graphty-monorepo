/**
 * The cluster force (issue #3257; `LayoutSimulation.setClusters`): every node of a community is pulled toward the
 * community's mass-weighted centroid, as if one more edge tied it there. It is added to the attraction, so a
 * simulation's own cooling, speed control and settling apply to it like any other force. The GPU twin is
 * webgpu-graph-algorithms' `cluster-centroid` and `cluster-pull` kernels.
 */

import type { U32 } from "@graphty/graph-format";

import type { ClusterOptions } from "./types.js";

/** The value of `ClusterOptions.communities` for a row in no community. */
export const NO_CLUSTER = 0xffffffff;

/** What setClusters() holds: the caller's choice, copied, and the centroid sums each iteration reuses. */
export interface ClusterField {
    readonly communities: U32;
    readonly strength: number;
    /** Per community: the mass-weighted sum of x, y and z, and the mass. */
    readonly sums: Float64Array;
}

/**
 * Validates and copies what a caller set.
 * @param clusters - the communities and the strength, or null to stop
 * @param n - the node count
 * @returns the field, or null
 * @throws RangeError when there is not one community per row, a community is not below n, or the strength is not a
 * number >= 0
 */
export function clusterField(clusters: ClusterOptions | null, n: number): ClusterField | null {
    if (clusters === null) {
        return null;
    }
    const { communities, strength = 1 } = clusters;
    if (communities.length !== n) {
        throw new RangeError(`setClusters: ${String(communities.length)} communities for ${String(n)} nodes`);
    }
    if (!Number.isFinite(strength) || strength < 0) {
        throw new RangeError(`setClusters: strength must be finite and >= 0, got ${String(strength)}`);
    }
    let count = 0;
    for (const community of communities) {
        if (community !== NO_CLUSTER) {
            if (community >= n) {
                throw new RangeError(`setClusters: community ${String(community)} is not below ${String(n)}`);
            }
            count = Math.max(count, community + 1);
        }
    }
    return { communities: communities.slice(), strength, sums: new Float64Array(4 * count) };
}

/**
 * Adds the pull to a force array: `strength * mass * (centroid - p)`, or, for Fruchterman-Reingold's law of attraction
 * `d^2 / k`, `strength * (d / k) * (centroid - p)`. A row of mass 0 (an inert row) neither counts nor is pulled.
 * @param field - the communities
 * @param positions - stride-3 positions
 * @param massOf - a row's mass
 * @param force - the stride-3 force array to add to
 * @param k - Fruchterman-Reingold's optimal distance; absent, the pull is linear
 */
export function addClusterPull(
    field: ClusterField,
    positions: ArrayLike<number>,
    massOf: (row: number) => number,
    force: Float64Array,
    k?: number,
): void {
    const { communities, strength, sums } = field;
    sums.fill(0);
    for (let i = 0; i < communities.length; i++) {
        const c = communities[i];
        if (c !== NO_CLUSTER) {
            const m = massOf(i);
            sums[4 * c] += m * positions[3 * i];
            sums[4 * c + 1] += m * positions[3 * i + 1];
            sums[4 * c + 2] += m * positions[3 * i + 2];
            sums[4 * c + 3] += m;
        }
    }
    for (let i = 0; i < communities.length; i++) {
        const c = communities[i];
        const m = c === NO_CLUSTER ? 0 : massOf(i);
        if (m > 0) {
            const total = sums[4 * c + 3];
            const dx = sums[4 * c] / total - positions[3 * i];
            const dy = sums[4 * c + 1] / total - positions[3 * i + 1];
            const dz = sums[4 * c + 2] / total - positions[3 * i + 2];
            const pull = strength * (k === undefined ? m : Math.hypot(dx, dy, dz) / k);
            force[3 * i] += pull * dx;
            force[3 * i + 1] += pull * dy;
            force[3 * i + 2] += pull * dz;
        }
    }
}
