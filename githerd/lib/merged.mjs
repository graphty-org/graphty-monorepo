/**
 * Merged pull requests and the issue refresh they feed (design sections 5.1, 6.2 and 10, row 17).
 *
 * When the default branch's head moves, one GraphQL search lists the pull requests merged since
 * the last scan with their merge commit, the issues they close, the issues they mention without
 * closing them and their first 100 changed paths. They accumulate in `state.merged.pending` until a
 * refresh triage job hands them, with the open issues, to a Claude session, which judges which
 * issues the merges affect (jobs.mjs); code never guesses that from the issue text. Issues a merged
 * pull request closes are left out: GitHub closes them.
 *
 * The same merges, and the commit subjects on the default branch, are also kept as references:
 * which commits and pull requests name an open issue. An issue job for such an issue asks its
 * worker to verify it first (jobs.mjs), since a fix that names its issue without a closing keyword
 * leaves it open.
 *
 * Only a merge that landed on the default branch is evidence of anything: one based on the default
 * branch, or a stacked one whose merge commit the default branch later took in. A pull request
 * merged into another pull request's branch waits in `stacked` until its merge commit is an
 * ancestor of the default branch (`landStacked`); one whose parent never merges never counts.
 */

/** The search document; `files(first:100)` truncates large pull requests. */
export const MERGED_QUERY = `query($q: String!) {
  search(type: ISSUE, query: $q, first: 50) {
    issueCount
    nodes { ... on PullRequest { number title body headRefName baseRefName mergedAt mergeCommit { oid }
      closingIssuesReferences(first: 10) { nodes { number } }
      files(first: 100) { totalCount nodes { path } } } }
  }
}`;

/**
 * @typedef {{number: number, title: string, headRef: string | null, base: string | null,
 *   mergedAt: string, mergeSha: string | null, closes: number[], mentions: number[], paths: string[],
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
                base: n.baseRefName ?? null,
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
 * so a rescan of the same window changes nothing. `lastScanAt` only moves forward. Other fields of
 * the record are kept. One merged into a branch other than `branch` lands nowhere yet: it goes to
 * `stacked`, not to `refs`, `closed` or `pending`.
 * @param {{lastScanAt?: string | null, pending?: PendingMerge[], closed?: number[],
 *   count?: number, refs?: Record<string, string[]>, stacked?: MergedPr[]}} saved `state.merged`
 * @param {MergedPr[]} prs from `parseMerged`
 * @param {string} [branch] the default branch
 * @returns {{lastScanAt: string | null, pending: PendingMerge[], closed: number[], count: number,
 *   refs: Record<string, string[]>, stacked: MergedPr[]}}
 *   the new record; `pending` holds the merges since the last refresh job, `closed` the issues the
 *   merged pull requests close, `count` every merge seen, which the triage passes count (jobs.mjs),
 *   and `refs` every issue a merged pull request closes or mentions, with its `#pr`, kept for good
 *   so an issue job knows its issue may already be fixed; `stacked` the merges not landed yet
 */
export function accumulateMerged(saved, prs, branch = "master") {
    const refs = Object.fromEntries(Object.entries(saved.refs ?? {}).map(([n, list]) => [n, [...list]]));
    const stacked = [...(saved.stacked ?? [])];
    const pending = [...(saved.pending ?? [])];
    const closed = new Set(saved.closed ?? []);
    let lastScanAt = saved.lastScanAt ?? null;
    let count = saved.count ?? 0;
    for (const pr of prs) {
        // A rescan of the same window sees a merge at the scan time again; only a later one counts.
        if (!saved.lastScanAt || pr.mergedAt > saved.lastScanAt) count += 1;
        if (!lastScanAt || pr.mergedAt > lastScanAt) lastScanAt = pr.mergedAt;
        if (pr.base && pr.base !== branch) {
            if (!stacked.some((p) => p.number === pr.number)) stacked.push(pr);
            continue;
        }
        addRefs(refs, pr);
        for (const n of pr.closes) closed.add(n);
        if (!pending.some((p) => p.number === pr.number)) {
            const { number, title, mergeSha, paths, truncated } = pr;
            pending.push({ number, title, mergeSha, paths, truncated, mentions: pr.mentions ?? [] });
        }
    }
    return { ...saved, lastScanAt, pending, closed: [...closed].sort((a, b) => a - b), count, refs, stacked };
}

/**
 * Lands the stacked merges whose merge commit the default branch now contains: they become
 * references and pending merges like any other. GitHub closes nothing for a pull request based on
 * another branch, so the issues it would close are only mentions: open, and judged.
 * @param {ReturnType<typeof accumulateMerged>} saved `state.merged`
 * @param {(sha: string) => Promise<boolean>} isAncestor whether a commit is on the default branch
 * @returns {Promise<ReturnType<typeof accumulateMerged>>} the new record
 */
export async function landStacked(saved, isAncestor) {
    const landed = [];
    const stacked = [];
    for (const pr of saved.stacked ?? []) {
        if (pr.mergeSha && (await isAncestor(pr.mergeSha))) landed.push(pr);
        else stacked.push(pr);
    }
    if (!landed.length) return saved;
    const prs = landed.map((pr) => ({
        ...pr,
        base: null,
        closes: [],
        mentions: [...new Set([...pr.closes, ...pr.mentions])].sort((a, b) => a - b),
    }));
    return accumulateMerged({ ...saved, stacked }, prs);
}

/**
 * Records a merged pull request as a reference of every issue it closes or mentions.
 * @param {Record<string, string[]>} refs issue number to `#pr` references, changed in place
 * @param {{number: number, closes?: number[], mentions?: number[]}} pr the merged pull request
 */
function addRefs(refs, pr) {
    for (const n of new Set([...(pr.closes ?? []), ...(pr.mentions ?? [])])) {
        const list = (refs[n] ??= []);
        if (!list.includes(`#${pr.number}`)) list.push(`#${pr.number}`);
    }
}

/** The search document of the one-time backfill: only what references need, 100 a page. */
export const REFS_QUERY = `query($q: String!, $after: String) {
  search(type: ISSUE, query: $q, first: 100, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { ... on PullRequest { number title body baseRefName mergedAt mergeCommit { oid }
      closingIssuesReferences(first: 10) { nodes { number } } } }
  }
}`;

/**
 * The references of pull requests merged before githerd's first scan, read once: every pull
 * request merged since the oldest open issue was opened (an older one cannot name it). Search
 * stops at 1000 results, 10 pages. Only merges that landed on the default branch count.
 * @param {{graphql: (query: string, vars?: Record<string, unknown>) => Promise<any>}} gitHub the client
 * @param {string} repo `owner/name`
 * @param {string} since ISO time the oldest open issue was opened
 * @param {string} [branch] the default branch
 * @param {(sha: string) => Promise<boolean>} [isAncestor] whether a commit is on the default branch
 * @returns {Promise<Record<string, string[]>>} issue number to `#pr` references
 */
export async function backfillRefs(gitHub, repo, since, branch = "master", isAncestor = async () => false) {
    const q = `repo:${repo} is:pr is:merged merged:>=${since}`;
    /** @type {Record<string, string[]>} */
    const refs = {};
    let after = null;
    for (let page = 0; page < 10; page++) {
        const data = await gitHub.graphql(REFS_QUERY, { q, after });
        for (const pr of parseMerged(data)) {
            const landed = !pr.base || pr.base === branch || (pr.mergeSha && (await isAncestor(pr.mergeSha)));
            if (landed) addRefs(refs, pr);
        }
        const info = data?.search?.pageInfo;
        if (!info?.hasNextPage) break;
        after = info.endCursor;
    }
    return refs;
}

/**
 * The commits on the default branch whose subject names an open issue as `#n` (word-bounded, so
 * `#9060` is not `#906`): a fix that says which issue it fixes without closing it.
 * @param {string} log `git log --format=%h%x09%s` output, one commit a line
 * @param {number[]} open the open issue numbers
 * @returns {Record<string, string[]>} issue number to short shas, newest first
 */
export function commitRefs(log, open) {
    const wanted = new Set(open);
    /** @type {Record<string, string[]>} */
    const refs = {};
    for (const line of log.split("\n")) {
        const [sha, subject = ""] = line.split("\t");
        for (const m of subject.matchAll(/(?<![\w&/])#(\d+)\b/g)) {
            const n = Number(m[1]);
            if (!wanted.has(n) || refs[n]?.includes(sha)) continue;
            refs[n] ??= [];
            refs[n].push(sha);
        }
    }
    return refs;
}
