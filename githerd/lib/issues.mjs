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
 * A fresh state sends no `since` at all: GitHub answers `since=1970-01-01T00:00:00Z` with an empty
 * list (seen live 2026-10-04), so the epoch cannot stand in for "from the beginning".
 */

import { TERMINAL } from "./board.mjs";
import { LABEL as HEARTBEAT } from "./heartbeat.mjs";
import { TERMINAL as PROPOSAL_ENDED } from "./proposals.mjs";

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
/** How much of an issue body is kept in the state. */
const ISSUE_TEXT_MAX = 2000;

/**
 * The first poll's path.
 * @param {string} repo `owner/name`
 * @param {string | null} since ISO time to read from, or null for the whole history
 * @returns {string} the REST path
 */
export function issuesPath(repo, since) {
    const from = since ? `&since=${encodeURIComponent(since)}` : "";
    return `repos/${repo}/issues?state=all${from}&sort=updated&direction=asc&per_page=100`;
}

/**
 * The `rel="next"` target of a `Link` header, as a path the client's `get` accepts.
 * @param {string | undefined} link the header value
 * @returns {string | null} the path, or null on the last page
 */
export function nextPage(link) {
    for (const part of (link ?? "").split(",")) {
        const [target, ...params] = part.split(";");
        const url = target.trim();
        if (params.some((p) => p.trim() === 'rel="next"') && url.startsWith("<") && url.endsWith(">")) {
            return url.slice(1, -1).replace(/^https:\/\/api\.github\.com\//, "");
        }
    }
    return null;
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
        // githerd's own heartbeat issue (heartbeat.mjs) is no work: no job, no triage.
        if ((item.labels ?? []).some((/** @type {any} */ l) => (typeof l === "string" ? l : l.name) === HEARTBEAT)) {
            delete byNumber[item.number];
            continue;
        }
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
            // The title is the open-issue list a refresh job gets (jobs.mjs); a worker reads the
            // issue itself through githerd_read.
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
 *   is read from 10 minutes before it, and a null mark reads the whole history
 * @returns {Promise<{since: string | null, byNumber: Record<string, object>, changed: number[], complete: boolean}>}
 *   the new record; `complete` is false when `MAX_PAGES` stopped the read early
 */
export async function pollIssues(gitHub, repo, saved) {
    let record = { ...saved, changed: /** @type {number[]} */ ([]) };
    /** @type {string | null} */
    let path = issuesPath(repo, saved.since ? overlapped(saved.since) : null);
    for (let page = 0; path && page < MAX_PAGES; page++) {
        const res = await gitHub.get(path);
        const next = applyIssues(record, res.body);
        record = { ...next, changed: [...new Set([...record.changed, ...next.changed])] };
        path = nextPage(res.headers.link);
    }
    return { ...record, complete: path === null };
}

/**
 * The issue numbers something in the state still looks up in `state.issues.byNumber`: a job that
 * has not ended (its target and a triage batch), a deferral, a left-out bundle member, a proposal
 * that has not ended, an owner item that has not ended, a flaky test's issue, a dequeued release's
 * issue and an unresolved escalation's hold issue. Built once per pass.
 * @param {any} state the daemon state
 * @returns {Set<string>} the numbers, as `byNumber` keys
 */
function referencedIssues(state) {
    const out = new Set([...Object.keys(state.deferred ?? {}), ...Object.keys(state.unbundled ?? {})]);
    /**
     * Records an issue number.
     * @param {number | string | null | undefined} n the number
     */
    const add = (n) => {
        if (n != null) out.add(String(n));
    };
    const live = (/** @type {Record<string, any> | undefined} */ records, /** @type {(r: any) => boolean} */ ended) =>
        Object.values(records ?? {}).filter((r) => !ended(r));
    for (const j of live(state.jobs, (j) => TERMINAL.includes(j.state))) {
        add(issueOf(j.target));
        for (const n of j.facts?.batch ?? []) add(n);
    }
    for (const p of live(state.proposals, (p) => PROPOSAL_ENDED.has(p.status))) add(issueOf(p.target));
    for (const i of live(state.ownerItems, (i) => Boolean(i.endedAt))) add(issueOf(i.target));
    for (const e of live(state.escalations, (e) => Boolean(e.resolvedAt))) add(e.holdIssue);
    for (const t of Object.values(state.flakes?.tests ?? {})) add(t.issue);
    for (const r of Object.values(state.releaseQueue ?? {})) add(r.issue);
    return out;
}

/**
 * The issue number a job, proposal or owner item target names (`#12`, `issue:12`), or undefined.
 * @param {string | null | undefined} target the target
 * @returns {string | undefined} the number
 */
function issueOf(target) {
    return /^(?:#|issue:)(\d+)$/.exec(target ?? "")?.[1];
}

/**
 * Drops each closed issue nothing refers to any more (`referencedIssues`) from
 * `state.issues.byNumber`, in place. A dropped issue that reopens comes back on the next poll: the
 * reopen changes its `updated_at`, so the `since` read returns it and `applyIssues` records it anew.
 * @param {any} state the daemon state
 * @returns {number} how many issues were dropped
 */
export function pruneClosedIssues(state) {
    const byNumber = state.issues?.byNumber ?? {};
    const kept = referencedIssues(state);
    let dropped = 0;
    for (const [n, i] of Object.entries(byNumber)) {
        if (i.state !== "closed" || kept.has(n)) continue;
        delete byNumber[n];
        dropped += 1;
    }
    return dropped;
}
