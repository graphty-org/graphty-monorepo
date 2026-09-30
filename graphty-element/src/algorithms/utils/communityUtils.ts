/**
 * @file Shared utilities for community detection algorithms
 */

/**
 * Convert a community assignment map to an array of arrays.
 *
 * Takes a Map where keys are node IDs and values are community IDs,
 * and returns an array where each element is an array of node IDs in that community.
 * @param communities - Map of node ID to community ID
 * @returns Array of arrays, where each inner array contains node IDs in the same community
 * @example
 * ```typescript
 * const communities = new Map([["A", 0], ["B", 0], ["C", 1]]);
 * const result = extractCommunities(communities);
 * // result: [["A", "B"], ["C"]]
 * ```
 */
export function extractCommunities(communities: Map<number | string, number>): (number | string)[][] {
    const communityArrays = new Map<number, (number | string)[]>();

    for (const [nodeId, communityId] of communities) {
        let communityArray = communityArrays.get(communityId);

        if (communityArray === undefined) {
            communityArray = [];
            communityArrays.set(communityId, communityArray);
        }

        communityArray.push(nodeId);
    }

    return Array.from(communityArrays.values());
}

/**
 * Count the number of unique communities in a community assignment map.
 * @param communities - Map of node ID to community ID
 * @returns Number of unique communities
 * @example
 * ```typescript
 * const communities = new Map([["A", 0], ["B", 0], ["C", 1]]);
 * const count = countUniqueCommunities(communities);
 * // count: 2
 * ```
 */
export function countUniqueCommunities(communities: Map<number | string, number>): number {
    const uniqueCommunities = new Set<number>();

    for (const communityId of communities.values()) {
        uniqueCommunities.add(communityId);
    }

    return uniqueCommunities.size;
}
