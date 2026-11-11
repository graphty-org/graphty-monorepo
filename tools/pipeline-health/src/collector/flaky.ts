// The Flaky tests members the collector observes (design/ci/health-dashboard.md, section 4.4): tests seen flaky in
// CI with no open issue, open pull requests blocked by a flake, and net new flaky. Read from the flaky.tests daily
// rollup (distinct tests seen flaky in CI, live and backfilled), the RUNTESTS index of test rows (items.ts), the
// open pull requests' checks, and the flaky issue searches (read to their last page) per cycle.

import { type Agg, type Bucket, DAY, floorTo, skTime } from "../model/items.js";
import { fileRunKey } from "../model/metrics.js";
import { loadSeries } from "../model/rollup.js";
import { isLive, type Store } from "../model/store.js";
import type { GitHub } from "./github.js";
import { family, type GqlCheck, type GqlPr } from "./parse.js";
import { failingChecks } from "./snapshots.js";

/** A test seen flaky in CI, with the start of each UTC day that saw it, oldest first. */
export interface FlakySeen {
    file: string;
    name: string;
    days: number[];
    /** The families it was seen flaky in. */
    families: string[];
    /** Its flaky events over the days read. */
    events: number;
}

export const testKey = (file: string, name: string): string => JSON.stringify([file, name]);

/**
 * Distinct tests seen flaky in CI over the last `days` UTC days, today included, from the flaky.tests daily rollup
 * (its dimension is [family, file, test]; a test in two families is one test).
 * @param store - the metrics store holding the rollup
 * @param now - the current time, in ms
 * @param days - how many UTC days to read, today included
 * @returns each test seen flaky, by testKey
 */
export async function flakyHistory(store: Store, now: number, days = 28): Promise<Map<string, FlakySeen>> {
    const today = floorTo(now, "1d");
    const series = await loadSeries(store, "flaky.tests", "1d", today - (days - 1) * DAY, today, now);
    const out = new Map<string, FlakySeen>();
    for (const [start, b] of [...series].sort((x, y) => x[0] - y[0])) {
        for (const [dim, a] of Object.entries(b.dims ?? {})) {
            if (!a.sum) {
                continue;
            }
            const [fam, file, name] = JSON.parse(dim) as [string, string, string];
            const k = testKey(file, name);
            const s = out.get(k) ?? { file, name, days: [], families: [], events: 0 };
            out.set(k, s);
            if (s.days.at(-1) !== start) {
                s.days.push(start);
            }
            if (!s.families.includes(fam)) {
                s.families.push(fam);
            }
            s.events += a.sum;
        }
    }
    return out;
}

/**
 * Lowercase words only: "find-no-match", "Find No Match" and "`Find No Match`" all read "find no match".
 * @param s - the text to normalize
 * @returns the words, space separated with a space at each end
 */
export const words = (s: string): string =>
    ` ${s
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, " ")
        .trim()} `;

/** An issue as the batched search returns it. */
export interface IssueText {
    title: string;
    body: string;
    closedAt?: string | null;
}

/**
 * Whether an issue names a test: its title or body names the test's file (by its file name) and the test, by the last
 * part of "describe > test" (a story's name or id for a story). A whole-file failure, whose name is the file's path,
 * is named by the file alone.
 * @param issue - the issue's title and body
 * @param t - the test
 * @param t.file - the test's file path
 * @param t.name - the test's full name
 * @returns whether the issue names the test
 */
export function namesTest(issue: IssueText, t: { file: string; name: string }): boolean {
    const text = words(`${issue.title}\n${issue.body}`);
    if (!text.includes(words(t.file.split("/").at(-1) ?? t.file))) {
        return false;
    }
    return t.file.endsWith(t.name) || text.includes(words(t.name.split(" > ").at(-1) ?? t.name));
}

const isoDay = (t: number): string => new Date(t).toISOString().slice(0, 10);

/**
 * Every issue a search finds, page by page (GitHub's search stops at 1,000).
 * @param gh - the GitHub client
 * @param q - the search query
 * @returns every issue found
 */
async function searchAll(gh: GitHub, q: string): Promise<IssueText[]> {
    type Page = { nodes?: (IssueText | null)[]; pageInfo?: { hasNextPage: boolean; endCursor: string | null } };
    const out: IssueText[] = [];
    let after: string | null = null;
    do {
        const { s }: { s?: Page } = await gh.graphql(
            `query($q: String!, $after: String) { s: search(query: $q, type: ISSUE, first: 100, after: $after) { ` +
                `pageInfo { hasNextPage endCursor } nodes { ... on Issue { title body closedAt } } } }`,
            { q, after },
        );
        out.push(...(s?.nodes ?? []).filter((n): n is IssueText => !!n));
        after = s?.pageInfo?.hasNextPage ? s.pageInfo.endCursor : null;
    } while (after);
    return out;
}

/**
 * For each test, whether an open issue names it, and when the newest issue naming it was closed as fixed since
 * `closedSince` (undefined: none). Two searches, each read to its last page: the open flaky issues and those closed
 * as fixed since then, matched to the tests here (namesTest).
 * @param gh - the GitHub client
 * @param repo - the repository, as owner/name
 * @param tests - the tests to match
 * @param closedSince - the earliest close time to search, in ms
 * @returns for each test by testKey, whether an open issue names it and when one naming it was last fixed
 */
export async function issuesNaming(
    gh: GitHub,
    repo: string,
    tests: FlakySeen[],
    closedSince: number,
): Promise<Map<string, { open: boolean; closedAt?: number }>> {
    const out = new Map<string, { open: boolean; closedAt?: number }>();
    if (!tests.length) {
        return out;
    }
    const base = `repo:${repo} is:issue flaky`;
    const open = await searchAll(gh, `${base} is:open`);
    const closed = (await searchAll(gh, `${base} is:closed reason:completed closed:>=${isoDay(closedSince)}`)).filter(
        (n) => !!n.closedAt,
    );
    for (const t of tests) {
        const at = closed.filter((i) => namesTest(i, t)).map((i) => Date.parse(i.closedAt ?? ""));
        out.set(testKey(t.file, t.name), {
            open: open.some((i) => namesTest(i, t)),
            ...(at.length ? { closedAt: Math.max(...at) } : {}),
        });
    }
    return out;
}

/** How sure the clean runs since a test's last detection must make us that its old failure rate is gone. */
export const RESOLVE_CONFIDENCE = 0.95;

/**
 * Clean runs a test needs before it counts as resolved: enough that, at its old failure rate, at least one failure
 * would have shown with RESOLVE_CONFIDENCE (1 in 10 needs 29, 1 in 50 needs 149).
 * @param rate - the share of its runs it failed, 0 to 1
 * @returns the clean runs needed, at least 1
 */
export function cleanRunsNeeded(rate: number): number {
    if (rate >= 1) {
        return 1;
    }
    return rate <= 0 ? Infinity : Math.ceil(Math.log(1 - RESOLVE_CONFIDENCE) / Math.log(1 - rate));
}

/**
 * Net new flaky over the last 7 days (section 4.4): tests first seen flaky in the window (`added`), and tests resolved
 * in it (`resolved`). A test is resolved when an issue naming it was closed as fixed after its last detection, or on
 * the day its file's clean runs since that detection reach cleanRunsNeeded at its failure rate (its flaky events over
 * its file's runs, both over the days read up to the last detection). A test whose file stopped running is removed,
 * not resolved: it never gathers clean runs. ponytail: runs are its file's (flaky.file_runs), not the test's own, so a
 * test renamed inside a file that still runs counts as resolved; store per-test runs if that proves common.
 * Detections are known by day here; flakyMembers leaves out of `fixedAt` a close that a later event on its day undid.
 * @param history - 28 days of flakyHistory
 * @param fixedAt - when an issue naming the test was closed as fixed, by testKey
 * @param fileRuns - the flaky.file_runs daily buckets over the same days, by bucket start
 * @param now - the current time, in ms
 * @returns the tests newly flaky and the tests resolved, over the window
 */
export function netChange(
    history: Map<string, FlakySeen>,
    fixedAt: Map<string, number>,
    fileRuns: Map<number, Bucket>,
    now: number,
): { added: number; resolved: number } {
    const today = floorTo(now, "1d");
    const windowStart = today - 6 * DAY;
    const days = [...fileRuns.keys()].sort((a, b) => a - b);
    let added = 0;
    let resolved = 0;
    for (const [k, s] of history) {
        const last = s.days.at(-1) ?? s.days[0];
        if (s.days[0] >= windowStart) {
            added++;
        }
        const fixed = fixedAt.get(k);
        if (last >= windowStart && fixed !== undefined && fixed >= last) {
            resolved++;
            continue;
        }
        const keys = [...new Set(s.families.map((f) => fileRunKey(f, s.file)))];
        const runsOn = (d: number): Agg[] => keys.map((key) => fileRuns.get(d)?.dims?.[key] ?? { n: 0, sum: 0 });
        const before = days.filter((d) => d <= last).flatMap(runsOn);
        const runs = before.reduce((t, a) => t + a.n, 0);
        const needed = cleanRunsNeeded(s.events / Math.max(runs, s.events));
        let clean = 0;
        for (const d of days.filter((x) => x > last)) {
            clean += runsOn(d).reduce((t, a) => t + a.sum, 0);
            if (clean >= needed) {
                resolved += d >= windowStart ? 1 : 0;
                break;
            }
        }
    }
    return { added, resolved };
}

const RUN_OF = /\/actions\/runs\/(\d+)\//;

export interface BlockCandidate {
    pr: number;
    /** The workflow runs of its failing checks. */
    runs: number[];
    /** When its oldest failing check started. */
    since: number;
}

/**
 * The runs of a pull request's head checks with these names, from each check's details URL.
 * @param p - the pull request with its head checks
 * @param names - the check names to read
 * @returns the distinct run ids
 */
function runsOf(p: GqlPr, names: Set<string>): number[] {
    const ctx = (p.commits?.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []) as (GqlCheck & {
        detailsUrl?: string | null;
    })[];
    const runs = new Set<number>();
    for (const c of ctx) {
        const run = c.name && names.has(c.name) ? RUN_OF.exec(c.detailsUrl ?? "")?.[1] : undefined;
        if (run) {
            runs.add(Number(run));
        }
    }
    return [...runs];
}

/**
 * Open, ready pull requests whose every failing check (bins folded, aggregators aside) is a test check, with the
 * runs those checks belong to (read from the check's details URL).
 * @param open - the open pull requests with their checks
 * @param now - the current time, in ms
 * @returns the pull requests red only on test checks, with their runs
 */
export function blockCandidates(open: GqlPr[], now: number): BlockCandidate[] {
    const out: BlockCandidate[] = [];
    for (const p of open) {
        if (p.state !== "OPEN" || p.isDraft) {
            continue;
        }
        const failing = failingChecks(p).filter((f) => !f.alone);
        if (!failing.length || !failing.every((f) => family(f.name) !== undefined)) {
            continue;
        }
        const runs = runsOf(p, new Set(failing.map((f) => f.name)));
        if (!runs.length) {
            continue;
        }
        out.push({ pr: p.number, runs, since: Math.min(now, ...failing.map((f) => f.startedAt ?? now)) });
    }
    return out;
}

/**
 * The tests that failed for good in each run's newest attempt: its RUNTESTS rows still `failed` (a test that passed on
 * its shard's retry was rewritten `flaky`).
 * @param store - the metrics store
 * @param run - the workflow run id
 * @param now - the current time, in ms
 * @returns the failed tests, by testKey
 */
async function failedTests(store: Store, run: number, now: number): Promise<Set<string>> {
    const rows = (await store.query(`RUNTESTS#${run}`)).filter((r) => isLive(r, now));
    const attempt = Math.max(0, ...rows.map((r) => Number(r.sk.split("#")[0])));
    return new Set(
        rows
            .filter((r) => Number(r.sk.split("#")[0]) === attempt && r.outcome === "failed")
            .map((r) => testKey(String(r.file), String(r.name))),
    );
}

/**
 * Blocked by a flake (section 4.4): open pull requests red only on tests that have a flaky detection, and the age of
 * the oldest block. A candidate with no recorded failed test is not counted: nothing says what failed.
 * ponytail: "an unstable story" is left out; story captures are not test checks, add them once the capture's
 * unstable verdict reaches the store.
 * @param store - the metrics store
 * @param open - the open pull requests with their checks
 * @param flaky - testKeys with a flaky detection
 * @param now - the current time, in ms
 * @returns the blocked pull requests and the age of the oldest block, in ms
 */
export async function blockedPrs(
    store: Store,
    open: GqlPr[],
    flaky: Set<string>,
    now: number,
): Promise<{ prs: number[]; oldestMs: number }> {
    const prs: number[] = [];
    let oldest = now;
    for (const c of blockCandidates(open, now)) {
        const failed = new Set<string>();
        for (const run of c.runs) {
            for (const k of await failedTests(store, run, now)) {
                failed.add(k);
            }
        }
        if (failed.size && [...failed].every((k) => flaky.has(k))) {
            prs.push(c.pr);
            oldest = Math.min(oldest, c.since);
        }
    }
    return { prs, oldestMs: now - oldest };
}

/**
 * Whether an issue closed at `closedAt` came after the test's last flaky event. The rollup knows detections by day, so
 * a close on the day of the last detection is settled by that day's event times in the test's history.
 * @param store - the metrics store
 * @param s - the test, as flakyHistory read it
 * @param closedAt - when the issue was closed, in ms
 * @param now - the current time, in ms
 * @returns whether no flaky event follows the close
 */
async function closedAfterLastFlake(store: Store, s: FlakySeen, closedAt: number, now: number): Promise<boolean> {
    const day = s.days.at(-1) ?? 0;
    if (closedAt < day || closedAt >= day + DAY) {
        return closedAt >= day;
    }
    const rows = await store.query(`TESTH#${s.file}`, { from: skTime(day), to: skTime(day + DAY) });
    return !rows.some(
        (r) =>
            isLive(r, now) &&
            r.name === s.name &&
            r.source === "ci" &&
            r.outcome === "flaky" &&
            !r.bump &&
            Number(r.seenAt) > closedAt,
    );
}

/**
 * The four observations, at one cycle.
 * @param store - the metrics store
 * @param gh - the GitHub client
 * @param repo - the repository, as owner/name
 * @param open - the open pull requests with their checks
 * @param now - the current time, in ms
 * @returns the flaky members' values, by member name
 */
export async function flakyMembers(
    store: Store,
    gh: GitHub,
    repo: string,
    open: GqlPr[],
    now: number,
): Promise<Record<string, number>> {
    const history = await flakyHistory(store, now);
    const today = floorTo(now, "1d");
    const fileRuns = await loadSeries(store, "flaky.file_runs", "1d", today - 27 * DAY, today, now);
    const weekStart = floorTo(now, "1d") - 6 * DAY;
    const week = [...history.values()].filter((s) => (s.days.at(-1) ?? 0) >= weekStart);
    const issues = await issuesNaming(gh, repo, week, weekStart);
    const fixedAt = new Map<string, number>();
    for (const s of week) {
        const k = testKey(s.file, s.name);
        const closedAt = issues.get(k)?.closedAt;
        if (closedAt !== undefined && (await closedAfterLastFlake(store, s, closedAt, now))) {
            fixedAt.set(k, closedAt);
        }
    }
    const blocked = await blockedPrs(store, open, new Set(history.keys()), now);
    const net = netChange(history, fixedAt, fileRuns, now);
    return {
        // A test is filed while an issue naming it is open, or once one was closed as fixed after its last flaky event.
        "flaky.no_issue": week.filter((s) => {
            const k = testKey(s.file, s.name);
            return !issues.get(k)?.open && !fixedAt.has(k);
        }).length,
        "flaky.blocked_prs": blocked.prs.length,
        "flaky.blocked_oldest_ms": blocked.oldestMs,
        "flaky.net_change": net.added - net.resolved,
        "flaky.net_added": net.added,
        "flaky.net_resolved": net.resolved,
    };
}
