// The Flaky tests members the collector observes (design/ci/health-dashboard.md, section 4.4): tests seen flaky in
// CI with no open issue, open pull requests blocked by a flake, and net new flaky. Read from the flaky.tests daily
// rollup (distinct tests seen flaky in CI, live and backfilled), the RUNTESTS index of test rows (items.ts), the
// open pull requests' checks, and one GraphQL query for the flaky issues per cycle.

import { DAY, floorTo } from "../model/items.js";
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
}

export const testKey = (file: string, name: string) => JSON.stringify([file, name]);

/**
 * Distinct tests seen flaky in CI over the last `days` UTC days, today included, from the flaky.tests daily rollup
 * (its dimension is [family, file, test]; a test in two families is one test).
 * @param store
 * @param now
 * @param days
 */
export async function flakyHistory(store: Store, now: number, days = 28): Promise<Map<string, FlakySeen>> {
    const today = floorTo(now, "1d");
    const series = await loadSeries(store, "flaky.tests", "1d", today - (days - 1) * DAY, today, now);
    const out = new Map<string, FlakySeen>();
    for (const [start, b] of [...series].sort((x, y) => x[0] - y[0]))
        for (const [dim, a] of Object.entries(b.dims ?? {})) {
            if (!a.sum) continue;
            const [, file, name] = JSON.parse(dim) as [string, string, string];
            const k = testKey(file, name);
            const s = out.get(k) ?? { file, name, days: [] };
            out.set(k, s);
            if (s.days.at(-1) !== start) s.days.push(start);
        }
    return out;
}

/** Lowercase words only: "find-no-match", "Find No Match" and "`Find No Match`" all read "find no match". */
export const words = (s: string) =>
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
 * @param issue
 * @param t
 */
export function namesTest(issue: IssueText, t: { file: string; name: string }): boolean {
    const text = words(`${issue.title}\n${issue.body}`);
    if (!text.includes(words(t.file.split("/").at(-1) ?? t.file))) return false;
    return t.file.endsWith(t.name) || text.includes(words(t.name.split(" > ").at(-1) ?? t.name));
}

const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * For each test, whether an open issue names it, and when the newest issue naming it was closed as fixed since
 * `closedSince` (undefined: none). One GraphQL query: the open flaky issues and those closed as fixed since then,
 * matched to the tests here (namesTest). ponytail: 100 issues per side, page through them if that is ever reached.
 * @param gh
 * @param repo
 * @param tests
 * @param closedSince
 */
export async function issuesNaming(
    gh: GitHub,
    repo: string,
    tests: FlakySeen[],
    closedSince: number,
): Promise<Map<string, { open: boolean; closedAt?: number }>> {
    const out = new Map<string, { open: boolean; closedAt?: number }>();
    if (!tests.length) return out;
    const base = `repo:${repo} is:issue flaky`;
    const nodes = `nodes { ... on Issue { title body closedAt } }`;
    type Got = Record<"open" | "closed", { nodes?: (IssueText | null)[] } | undefined>;
    const data = await gh.graphql<Got>(
        `query($o: String!, $c: String!) { open: search(query: $o, type: ISSUE, first: 100) { ${nodes} } ` +
            `closed: search(query: $c, type: ISSUE, first: 100) { ${nodes} } }`,
        { o: `${base} is:open`, c: `${base} is:closed reason:completed closed:>=${isoDay(closedSince)}` },
    );
    const open = (data.open?.nodes ?? []).filter((n): n is IssueText => !!n);
    const closed = (data.closed?.nodes ?? []).filter((n): n is IssueText => !!n?.closedAt);
    for (const t of tests) {
        const at = closed.filter((i) => namesTest(i, t)).map((i) => Date.parse(i.closedAt!));
        out.set(testKey(t.file, t.name), {
            open: open.some((i) => namesTest(i, t)),
            ...(at.length ? { closedAt: Math.max(...at) } : {}),
        });
    }
    return out;
}

/** Days with no detection after which a flaky test counts as resolved (see netChange). */
export const QUIET_DAYS = 7;

/**
 * Net new flaky over the last 7 days (section 4.4): tests first seen flaky in the window, minus tests resolved in
 * it. A test is resolved when an issue naming it was closed as fixed after its last detection, or when it has gone
 * QUIET_DAYS without one. ponytail: the design's "10 clean runs" is read as 7 quiet days, since clean runs per test
 * are not stored; count them from the shard runs' file rows if quiet days prove too coarse.
 * Detections are known by day, so an issue closed on the day of a later detection still counts as the fix.
 * @param history - 28 days of flakyHistory
 * @param fixedAt - when an issue naming the test was closed as fixed, by testKey
 * @param now
 */
export function netChange(history: Map<string, FlakySeen>, fixedAt: Map<string, number>, now: number): number {
    const today = floorTo(now, "1d");
    const windowStart = today - 6 * DAY;
    let net = 0;
    for (const [k, s] of history) {
        const last = s.days.at(-1)!;
        if (s.days[0] >= windowStart) net++;
        const quietSince = today - last;
        const fixed = fixedAt.get(k);
        const wentQuiet = quietSince >= QUIET_DAYS * DAY && quietSince < (QUIET_DAYS + 7) * DAY;
        const fixedSince = last >= windowStart && fixed !== undefined && fixed >= last;
        if (wentQuiet || fixedSince) net--;
    }
    return net;
}

const RUN_OF = /\/actions\/runs\/(\d+)\//;

export interface BlockCandidate {
    pr: number;
    /** The workflow runs of its failing checks. */
    runs: number[];
    /** When its oldest failing check started. */
    since: number;
}

/** The runs of a pull request's head checks with these names, from each check's details URL. */
function runsOf(p: GqlPr, names: Set<string>): number[] {
    const ctx = (p.commits?.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []) as (GqlCheck & {
        detailsUrl?: string | null;
    })[];
    const runs = new Set<number>();
    for (const c of ctx) {
        const run = c.name && names.has(c.name) ? RUN_OF.exec(c.detailsUrl ?? "")?.[1] : undefined;
        if (run) runs.add(Number(run));
    }
    return [...runs];
}

/**
 * Open, ready pull requests whose every failing check (bins folded, aggregators aside) is a test check, with the
 * runs those checks belong to (read from the check's details URL).
 * @param open
 * @param now
 */
export function blockCandidates(open: GqlPr[], now: number): BlockCandidate[] {
    const out: BlockCandidate[] = [];
    for (const p of open) {
        if (p.state !== "OPEN" || p.isDraft) continue;
        const failing = failingChecks(p).filter((f) => !f.alone);
        if (!failing.length || !failing.every((f) => family(f.name) !== undefined)) continue;
        const runs = runsOf(p, new Set(failing.map((f) => f.name)));
        if (!runs.length) continue;
        out.push({ pr: p.number, runs, since: Math.min(now, ...failing.map((f) => f.startedAt ?? now)) });
    }
    return out;
}

/**
 * The tests that failed for good in each run's newest attempt: its RUNTESTS rows still `failed` (a test that passed on
 * its shard's retry was rewritten `flaky`).
 * @param store
 * @param run
 * @param now
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
 * @param store
 * @param open
 * @param flaky - testKeys with a flaky detection
 * @param now
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
        for (const run of c.runs) for (const k of await failedTests(store, run, now)) failed.add(k);
        if (failed.size && [...failed].every((k) => flaky.has(k))) {
            prs.push(c.pr);
            oldest = Math.min(oldest, c.since);
        }
    }
    return { prs, oldestMs: now - oldest };
}

/**
 * The four observations, at one cycle.
 * @param store
 * @param gh
 * @param repo
 * @param open - the open pull requests with their checks
 * @param now
 */
export async function flakyMembers(store: Store, gh: GitHub, repo: string, open: GqlPr[], now: number) {
    const history = await flakyHistory(store, now);
    const weekStart = floorTo(now, "1d") - 6 * DAY;
    const week = [...history.values()].filter((s) => s.days.at(-1)! >= weekStart);
    const issues = await issuesNaming(gh, repo, week, weekStart);
    const fixedAt = new Map<string, number>();
    for (const [k, v] of issues) if (v.closedAt !== undefined) fixedAt.set(k, v.closedAt);
    const blocked = await blockedPrs(store, open, new Set(history.keys()), now);
    return {
        // A test is filed while an issue naming it is open, or once one was closed as fixed on or after its last
        // detection's day (the same rule as netChange).
        "flaky.no_issue": week.filter((s) => {
            const i = issues.get(testKey(s.file, s.name));
            return !i?.open && !(i?.closedAt !== undefined && i.closedAt >= s.days.at(-1)!);
        }).length,
        "flaky.blocked_prs": blocked.prs.length,
        "flaky.blocked_oldest_ms": blocked.oldestMs,
        "flaky.net_change": netChange(history, fixedAt, now),
    };
}
