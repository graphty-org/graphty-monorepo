/**
 * Merged pull requests and the issue refresh they feed (design sections 5.1, 6.2 and 10, row 17).
 *
 * When the default branch's head moves, one GraphQL search lists the pull requests merged since
 * the last scan with their merge commit, the issues they close, the issues they mention without
 * closing them and their first 100 changed paths. They accumulate in `state.merged.pending` until a
 * refresh triage job hands them, with the open issues, to a Claude session, which judges which
 * issues the merges affect (jobs.mjs); code never guesses that from the issue text. Issues a merged
 * pull request closes are left out: GitHub closes them.
 */

/** The search document; `files(first:100)` truncates large pull requests. */
export const MERGED_QUERY = `query($q: String!) {
  search(type: ISSUE, query: $q, first: 50) {
    issueCount
    nodes { ... on PullRequest { number title body headRefName mergedAt mergeCommit { oid }
      closingIssuesReferences(first: 10) { nodes { number } }
      files(first: 100) { totalCount nodes { path } } } }
  }
}`;

/**
 * @typedef {{number: number, title: string, headRef: string | null, mergedAt: string,
 *   mergeSha: string | null, closes: number[], mentions: number[], paths: string[],
 *   truncated: boolean}} MergedPr
 */

/**
 * The `#n` references in a pull request's title and body that it does not close (design 5.1, the
 * row "Fixed elsewhere but still open"). A reference is an explicit fact, not a guess; numbers that
 * are not open issues are dropped when the refresh job is made.
 * @param {string} text the title and body
 * @param {number[]} closes the issues it closes
 * @returns {number[]} the mentioned issue numbers, ascending
 */
function mentioned(text, closes) {
    const nums = [...text.matchAll(/(?<![\w&/])#(\d+)\b/g)].map((m) => Number(m[1]));
    return [...new Set(nums)].filter((n) => !closes.includes(n)).sort((a, b) => a - b);
}

/**
 * Parses the search response.
 * @param {any} data the GraphQL `data` object
 * @returns {MergedPr[]} the merged pull requests; a truncated file list keeps its first paths
 */
export function parseMerged(data) {
    return (data?.search?.nodes ?? [])
        .filter((/** @type {any} */ n) => n?.number && n.mergedAt)
        .map((/** @type {any} */ n) => {
            const paths = (n.files?.nodes ?? []).map((/** @type {any} */ f) => f.path);
            const closes = (n.closingIssuesReferences?.nodes ?? []).map((/** @type {any} */ i) => i.number);
            return {
                number: n.number,
                title: n.title,
                headRef: n.headRefName ?? null,
                mergedAt: n.mergedAt,
                mergeSha: n.mergeCommit?.oid ?? null,
                closes,
                mentions: mentioned(`${n.title ?? ""}\n${n.body ?? ""}`, closes),
                paths,
                // ponytail: a truncated list keeps its first 100 paths, flagged for the refresh job;
                // page files if a session needs the rest (git show --stat on the merge commit works)
                truncated: (n.files?.totalCount ?? paths.length) > paths.length,
            };
        });
}

/**
 * Searches for pull requests merged at or after `since`.
 * @param {{graphql: (query: string, vars?: Record<string, unknown>) => Promise<any>}} gitHub the client
 * @param {string} repo `owner/name`
 * @param {string} since ISO time of the last scan
 * @returns {Promise<MergedPr[]>} the merged pull requests
 */
export async function searchMerged(gitHub, repo, since) {
    const q = `repo:${repo} is:pr is:merged merged:>=${since} sort:updated-desc`;
    return parseMerged(await gitHub.graphql(MERGED_QUERY, { q }));
}

/**
 * @typedef {{number: number, title: string, mergeSha: string | null, paths: string[],
 *   truncated: boolean, mentions: number[]}} PendingMerge a merge the next refresh job is given
 */

/**
 * Adds merged pull requests to `state.merged`. A pull request already pending is not added twice,
 * so a rescan of the same window changes nothing. `lastScanAt` only moves forward.
 * @param {{lastScanAt?: string | null, pending?: PendingMerge[], closed?: number[],
 *   count?: number}} saved `state.merged`
 * @param {MergedPr[]} prs from `parseMerged`
 * @returns {{lastScanAt: string | null, pending: PendingMerge[], closed: number[], count: number}}
 *   the new record; `pending` holds the merges since the last refresh job, `closed` the issues the
 *   merged pull requests close, and `count` every merge seen, which the triage passes count (jobs.mjs)
 */
export function accumulateMerged(saved, prs) {
    const pending = [...(saved.pending ?? [])];
    const closed = new Set(saved.closed ?? []);
    let lastScanAt = saved.lastScanAt ?? null;
    let count = saved.count ?? 0;
    for (const pr of prs) {
        // A rescan of the same window sees a merge at the scan time again; only a later one counts.
        if (!saved.lastScanAt || pr.mergedAt > saved.lastScanAt) count += 1;
        if (!lastScanAt || pr.mergedAt > lastScanAt) lastScanAt = pr.mergedAt;
        for (const n of pr.closes) closed.add(n);
        if (!pending.some((p) => p.number === pr.number)) {
            const { number, title, mergeSha, paths, truncated } = pr;
            pending.push({ number, title, mergeSha, paths, truncated, mentions: pr.mentions ?? [] });
        }
    }
    return { lastScanAt, pending, closed: [...closed].sort((a, b) => a - b), count };
}
