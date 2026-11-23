/**
 * @file A refresh's report from its counts: what a network refresh returns, on either build path.
 */

import type { SourceCounts, SourceRefreshReport } from "./types";

/**
 * A refresh's report: the counts, and `I_SOURCE_REFRESHED` or `I_SOURCE_UNCHANGED`.
 * @param counts - What the refresh added, removed and updated, by nodes and edges.
 * @param counts.added - What the source has now that the graph did not.
 * @param counts.removed - What the source no longer has.
 * @param counts.updated - What the source now says differently.
 * @param extra - More members, such as `issues`.
 * @returns The frozen report.
 */
export function refreshReport(
    counts: { readonly added: SourceCounts; readonly removed: SourceCounts; readonly updated: SourceCounts },
    extra: Partial<SourceRefreshReport> = {},
): SourceRefreshReport {
    const { added, removed, updated } = counts;
    const changed = [added, removed, updated].some((c) => c.nodes + c.edges > 0);
    const pair = (c: SourceCounts): number[] => [c.nodes, c.edges];
    return Object.freeze({
        added: Object.freeze({ ...added }),
        removed: Object.freeze({ ...removed }),
        updated: Object.freeze({ ...updated }),
        fact: Object.freeze({
            code: changed ? ("I_SOURCE_REFRESHED" as const) : ("I_SOURCE_UNCHANGED" as const),
            params: { added: pair(added), removed: pair(removed), updated: pair(updated) },
        }),
        ...extra,
    });
}
