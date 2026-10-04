/**
 * Merged pull requests and the issue refresh they feed (design sections 5.1, 6.2 and 10, row 17).
 *
 * When the default branch's head moves, one GraphQL search lists the pull requests merged since
 * the last scan with their merge commit, the issues they close and their first 100 changed paths.
 * The paths accumulate in `state.merged.pendingPaths` until a refresh pass ranks open issues by
 * how many of those paths, or their leading directories, the issue text mentions. Issues a merged
 * pull request closes are left out: GitHub closes them.
 */

/** The search document; `files(first:100)` truncates large pull requests. */
export const MERGED_QUERY = `query($q: String!) {
  search(type: ISSUE, query: $q, first: 50) {
    issueCount
    nodes { ... on PullRequest { number title headRefName mergedAt mergeCommit { oid }
      closingIssuesReferences(first: 10) { nodes { number } }
      files(first: 100) { totalCount nodes { path } } } }
  }
}`;

/**
 * @typedef {{number: number, title: string, headRef: string | null, mergedAt: string,
 *   mergeSha: string | null, closes: number[], paths: string[], truncated: boolean}} MergedPr
 */

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
            return {
                number: n.number,
                title: n.title,
                headRef: n.headRefName ?? null,
                mergedAt: n.mergedAt,
                mergeSha: n.mergeCommit?.oid ?? null,
                closes: (n.closingIssuesReferences?.nodes ?? []).map((/** @type {any} */ i) => i.number),
                paths,
                // ponytail: a truncated list keeps its first 100 paths; page files when a package
                // beyond them goes missing from the ranking
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
 * Adds merged pull requests to `state.merged`. A pull request already recorded for a path is not
 * added twice, so a rescan of the same window changes nothing. `lastScanAt` only moves forward.
 * @param {{lastScanAt?: string | null, pendingPaths?: Record<string, number[]>, closed?: number[],
 *   count?: number}} saved `state.merged`
 * @param {MergedPr[]} prs from `parseMerged`
 * @returns {{lastScanAt: string | null, pendingPaths: Record<string, number[]>, closed: number[],
 *   count: number}} the new record; `closed` holds the issues the merged pull requests close, and
 *   `count` every merge seen, which the triage passes count (jobs.mjs)
 */
export function accumulateMerged(saved, prs) {
    const pendingPaths = { ...saved.pendingPaths };
    const closed = new Set(saved.closed ?? []);
    let lastScanAt = saved.lastScanAt ?? null;
    let count = saved.count ?? 0;
    for (const pr of prs) {
        // A rescan of the same window sees a merge at the scan time again; only a later one counts.
        if (!saved.lastScanAt || pr.mergedAt > saved.lastScanAt) count += 1;
        if (!lastScanAt || pr.mergedAt > lastScanAt) lastScanAt = pr.mergedAt;
        for (const n of pr.closes) closed.add(n);
        for (const path of pr.paths) {
            const list = pendingPaths[path] ?? [];
            if (!list.includes(pr.number)) pendingPaths[path] = [...list, pr.number];
        }
    }
    return { lastScanAt, pendingPaths, closed: [...closed].sort((a, b) => a - b), count };
}

/**
 * Escapes a string for use inside a regular expression.
 * @param {string} s the text
 * @returns {string} the escaped text
 */
const escape = (s) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * True when `text` names `word` as a whole path token: not inside a longer name.
 * @param {string} text the issue text
 * @param {string} word a path, file name or directory
 * @returns {boolean} true when mentioned
 */
const mentions = (text, word) => new RegExp(String.raw`(?<![\w.-])${escape(word)}(?![\w-])`).test(text);

/**
 * Ranks open issues for refresh. An issue scores the number of changed files it names (by full
 * path or by file name), then the number of their leading directories it names; files outrank
 * directories. Issues that name none, and issues in `exclude`, are left out.
 * @param {{number: number, title?: string, body?: string | null}[]} issues open issues with their text
 * @param {string[]} paths changed paths, e.g. the keys of `state.merged.pendingPaths`
 * @param {number[]} [exclude] issues not to refresh, e.g. `state.merged.closed`
 * @returns {{number: number, files: number, dirs: number}[]} best first; ties by issue number
 */
export function rankForRefresh(issues, paths, exclude = []) {
    const dirs = new Set();
    for (const path of paths) {
        const parts = path.split("/");
        for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
    }
    const skip = new Set(exclude);
    return issues
        .filter((issue) => !skip.has(issue.number))
        .map((issue) => {
            const text = `${issue.title ?? ""}\n${issue.body ?? ""}`;
            // ponytail: common file names (index.ts, package.json) match many issues; add a stop
            // list if they crowd the top of the ranking
            const files = paths.filter((p) => mentions(text, p) || mentions(text, p.split("/").pop() ?? p)).length;
            const named = [...dirs].filter((d) => mentions(text, d)).length;
            return { number: issue.number, files, dirs: named };
        })
        .filter((r) => r.files + r.dirs > 0)
        .sort((a, b) => b.files - a.files || b.dirs - a.dirs || a.number - b.number);
}
