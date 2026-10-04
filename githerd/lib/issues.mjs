/**
 * Changed issues, read every poll (design sections 5.2 and 6.1).
 *
 * `GET issues?state=all&since=<high-water>&sort=updated&direction=asc` returns issues and pull
 * requests updated at or after the high-water mark, oldest first, cursor-paged through the `Link`
 * header. Items carrying a `pull_request` key are pull requests and are dropped. The high-water
 * mark advances to the largest `updated_at` seen, never to the wall clock, so clock skew cannot
 * skip an update; because pages are oldest first, a poll that stops early resumes where it stopped.
 * Each poll asks from 10 minutes before the mark, because GitHub's `since` answers can lag and
 * miss an update stamped just before it (design 4.2); an issue re-read unchanged is not news.
 */

/** How far before the high-water mark a `since` poll starts. */
const SINCE_OVERLAP_MS = 10 * 60_000;

/**
 * The `since` value a poll sends for a high-water mark: the mark less the overlap.
 * @param {string} mark ISO time of the high-water mark
 * @returns {string} the ISO time to poll from
 */
export function overlapped(mark) {
    return new Date(Date.parse(mark) - SINCE_OVERLAP_MS).toISOString();
}

/** Pages read per poll at most; the rest are read on the next poll, from the advanced mark. */
export const MAX_PAGES = 10;
/** How much of an issue body is kept, for ranking a refresh pass. */
const ISSUE_TEXT_MAX = 2000;

/**
 * The first poll's path.
 * @param {string} repo `owner/name`
 * @param {string} since ISO time of the high-water mark
 * @returns {string} the REST path
 */
export function issuesPath(repo, since) {
    return `repos/${repo}/issues?state=all&since=${encodeURIComponent(since)}&sort=updated&direction=asc&per_page=100`;
}

/**
 * The `rel="next"` target of a `Link` header, as a path `gh api` accepts.
 * @param {string | undefined} link the header value
 * @returns {string | null} the path, or null on the last page
 */
export function nextPage(link) {
    const m = /<([^>]+)>;\s*rel="next"/.exec(link ?? ""); // NOSONAR(S5852): one Link header from GitHub, a few hundred characters
    return m ? m[1].replace(/^https:\/\/api\.github\.com\//, "") : null;
}

/**
 * Merges changed issues into the saved record. Fields githerd owns (triage, refresh, proposal,
 * veto) are kept; fields GitHub owns are replaced. The high-water mark only moves forward.
 * @param {{since: string | null, byNumber: Record<string, object>}} saved `state.issues`
 * @param {any[]} items REST issue items, pull requests included
 * @returns {{since: string | null, byNumber: Record<string, object>, changed: number[]}} the new
 *   record, and the numbers of the issues that changed
 */
export function applyIssues(saved, items) {
    const byNumber = { ...saved.byNumber };
    /** @type {number[]} */
    const changed = [];
    let since = saved.since;
    for (const item of items) {
        if (!since || item.updated_at > since) since = item.updated_at;
        if ("pull_request" in item) continue;
        const old = byNumber[item.number];
        if (old && old.updatedAt === item.updated_at) continue;
        byNumber[item.number] = {
            lastTriagedAt: null,
            lastRefreshedAt: null,
            proposal: null,
            closeVetoed: false,
            ...old,
            updatedAt: item.updated_at,
            createdAt: item.created_at ?? null,
            state: item.state,
            labels: (item.labels ?? []).map((/** @type {any} */ l) => (typeof l === "string" ? l : l.name)),
            author: item.user?.login ?? null,
            // For ranking a refresh pass (jobs.mjs); a worker reads the issue through githerd_read.
            text: `${item.title ?? ""}\n${String(item.body ?? "").slice(0, ISSUE_TEXT_MAX)}`,
        };
        changed.push(item.number);
    }
    return { since, byNumber, changed };
}

/**
 * Reads every page of issues changed since the high-water mark and merges them.
 * @param {{get: (path: string) => Promise<{headers: Record<string, string>, body: any}>}} gitHub the client
 * @param {string} repo `owner/name`
 * @param {{since: string | null, byNumber: Record<string, object>}} saved `state.issues`; a mark
 *   is read from 10 minutes before it, and a null mark starts at `start`
 * @param {string} start ISO time to start from when there is no mark yet
 * @returns {Promise<{since: string | null, byNumber: Record<string, object>, changed: number[], complete: boolean}>}
 *   the new record; `complete` is false when `MAX_PAGES` stopped the read early
 */
export async function pollIssues(gitHub, repo, saved, start) {
    let record = { ...saved, changed: /** @type {number[]} */ ([]) };
    /** @type {string | null} */
    let path = issuesPath(repo, saved.since ? overlapped(saved.since) : start);
    for (let page = 0; path && page < MAX_PAGES; page++) {
        const res = await gitHub.get(path);
        const next = applyIssues(record, res.body);
        record = { ...next, changed: [...new Set([...record.changed, ...next.changed])] };
        path = nextPage(res.headers.link);
    }
    return { ...record, complete: path === null };
}
