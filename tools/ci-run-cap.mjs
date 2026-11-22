#!/usr/bin/env node
// The cap on concurrent pull request CI runs: the first job of ci.yml on a pull request ("Run cap") runs this
// and every other job of the run waits for it, so a waiting run holds one small runner and nothing else.
//
// Runners run jobs, not runs, and GitHub runs about 180 hosted jobs at once for this repository with no job
// priority: every admitted run's jobs share one queue, so admitting more runs than the runners hold only makes
// each one slower (#7671). So a run waits while the pull request runs of ci.yml created before this one hold
// BUDGET or more jobs (queued or in progress). An earlier run that has not finished its Build job yet (it is
// still waiting at Run cap, or building) has not fanned out, so it counts as RUN_JOBS_ESTIMATE jobs; that
// keeps the waiting runs in order and stops a burst of them all starting in one gap. One GraphQL query reads
// every counted run's job counts from its check suite. A run queued for over a day (STALE_HOURS) is stuck,
// not load, and never counts. CAP also limits the number of earlier active runs.
//
// It also waits while a release.yml run waits for a GitHub-hosted runner and holds fewer than RELEASE_SHARE of
// them (the full run goes first up to its share; ci.yml's max-parallel keeps the full run's matrices within
// that share, so past it pull requests take the rest), and while a ci.yml build of a push to master waits for one
// and holds fewer than MASTER_SHARE (#9153: with no job priority, master's build queued behind every pull request
// job and no master build finished for nearly three hours, so canary and the full run's restart stalled).
// A release run is judged by its jobs, never by its run status: GitHub reports a whole run as "queued" while
// its own max-parallel holds back one matrix leg, and the jobs API shows that leg as "queued" too, the same as
// a leg waiting for a runner. So a queued hosted job counts as waiting for a runner only when its matrix
// (the job name before " (", as "Story tests" in "CI / Story tests (layout)") runs fewer legs than its
// full-run max-parallel (FULL_RUN_MAX_PARALLEL; a job not listed there counts whenever it is queued). The
// release run is waiting when it has such a job and holds fewer than RELEASE_SHARE in-progress hosted jobs.
// A pull request that fixes a red master or a red full run never waits (#9473: the fix for a red full run sat 90
// minutes behind ordinary pull requests): one from a revert/<sha7> branch, or one whose title, body or commits name
// an open alarm issue (ALARM_SEARCH, the title search the rounds use, checked against ALARM_TITLE) with Fixes or
// Refs. A closed or non-alarm issue still waits. It costs at most one commits listing and one issue search.
// Only earlier runs count, so the oldest waiting run always proceeds: no deadlock. A canceled or superseded
// run is completed and frees its place at once.
//
// It never fails the pull request: an API error lets the run proceed, and so does a GITHUB_TOKEN with under
// MIN_RATE_LEFT requests left this hour (the token's 1,000 an hour are shared by every workflow). Waiting its
// turn is long (giving up early let the slowest runs join the backlog exactly when it was longest), but it ends
// at MAX_WAIT_MINUTES, before the job's timeout in ci.yml (twice the job's budget in ci-budgets.json): a job that
// reaches its timeout is canceled, which
// continue-on-error does not cover, so Build and every job after it were skipped and the pull request went red
// (#8219: a 2-hour backlog on 2026-11-14 failed #7878 that way). Past the limit the run proceeds. A run k
// places from its turn checks every k x POLL_SECONDS (at most 5 minutes), so a long queue costs few calls. The wait goes in the job summary.
//
// BUDGET is the repository variable CI_PR_JOB_BUDGET (default DEFAULT_BUDGET, the ~180 jobs GitHub runs at once
// less the full run's RELEASE_SHARE and master's MASTER_SHARE: 180 - 30 - 30 = 120), and CAP is CI_PR_RUN_CAP
// (default 2), both read in ci.yml's "Run cap" job:
//   gh variable set CI_PR_JOB_BUDGET --repo graphty-org/graphty-monorepo --body 120   (fewer pull request jobs)
//   gh variable set CI_PR_RUN_CAP --repo graphty-org/graphty-monorepo --body off      (no run count limit)
// Either "off" removes that limit; both off waits for nothing.
// Environment: GITHUB_TOKEN (actions: read, checks: read), GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_EVENT_PATH, CAP,
// BUDGET, GITHUB_STEP_SUMMARY.
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { githubRequest } from "./lib/github.mjs";

export const POLL_SECONDS = 60;
// the longest wait for a turn, below the Run cap job's timeout-minutes in ci.yml (ci-run-cap.test.mjs checks it)
export const MAX_WAIT_MINUTES = 110;
const MAX_POLL_SECONDS = 300;
export const MIN_RATE_LEFT = 300;
const ACTIVE = new Set(["queued", "in_progress", "requested", "pending", "waiting"]);
const HOSTED = /^(ubuntu|windows|macos)-/;
const BUILD_CHECK = "Build";
// a run queued longer than this is stuck (one sat queued 47 hours on 2026-11-11), not load
export const STALE_HOURS = 24;
// what an earlier run that has not fanned out yet is taken to need: 13 pull request runs held 962 jobs
// (74 each) on 2026-11-13; runs that touch one package need far fewer, so it errs on the small side
export const RUN_JOBS_ESTIMATE = 40;
// ci.yml's full-run max-parallel per matrix, by job name (ci-run-cap.test.mjs checks it against ci.yml)
export const FULL_RUN_MAX_PARALLEL = { Test: 24, "Story tests": 6 };
// the full run's share of runners: its matrices' max-parallel together
export const RELEASE_SHARE = Object.values(FULL_RUN_MAX_PARALLEL).reduce((a, b) => a + b);
// the runners kept free for a master push: its ci.yml build (13 jobs, 2026-11-20) and the other workflows a push
// to master starts (about 15 more), and the slack a newly admitted pull request run fans out into
export const MASTER_SHARE = 30;
// the hosted jobs GitHub ran at once for this repository, never more, measured 2026-11-13 (176-184)
const RUNNER_CEILING = 180;
export const DEFAULT_BUDGET = RUNNER_CEILING - RELEASE_SHARE - MASTER_SHARE;
// the open alarm issues a red fix names: the rounds' title search, then the titles it means
// (tools/refresh-inherited-prs.mjs ALARM, less its flaky-test titles)
export const ALARM_SEARCH = '"Full run red" OR "Failing on master" OR "Red master" OR "lane red on master" in:title';
export const ALARM_TITLE = /^(?:Full run red:|Failing on master\b|Red master:)|\blane red on master\b/i;
const REVERT_BRANCH = /^revert\/[0-9a-f]{7,40}$/;
const ISSUE_REF = /\b(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?|refs?)\b:?\s+#(\d+)/gi;

/**
 * The issue numbers a text names with Fixes, Closes, Resolves or Refs.
 * @param text a pull request's title, body or commit messages
 * @returns the numbers
 */
export function namedIssues(text) {
    return new Set([...(text ?? "").matchAll(ISSUE_REF)].map((m) => Number(m[1])));
}

/**
 * Why this pull request fixes a red master or full run and skips the wait, or null.
 * @param pr the event payload's pull_request ({ number, title, body, head: { ref } })
 * @param repo owner/name
 * @param api path -> parsed JSON (a path starting with "/" is under the API root, not the repository)
 * @returns the reason, or null
 */
export async function redFix(pr, repo, api) {
    if (REVERT_BRANCH.test(pr.head?.ref ?? "")) return `branch ${pr.head.ref} reverts a master commit`;
    let nums = namedIssues(`${pr.title ?? ""}\n${pr.body ?? ""}`);
    if (nums.size === 0) {
        const commits = await api(`pulls/${pr.number}/commits?per_page=100`);
        nums = namedIssues(commits.map((c) => c.commit?.message ?? "").join("\n"));
    }
    if (nums.size === 0) return null;
    const q = encodeURIComponent(`repo:${repo} is:issue is:open ${ALARM_SEARCH}`);
    const found = await api(`/search/issues?q=${q}&per_page=100`);
    const alarm = found.items.find(
        (i) => nums.has(i.number) && i.state === "open" && !i.pull_request && ALARM_TITLE.test(i.title),
    );
    return alarm ? `it fixes the open alarm #${alarm.number}` : null;
}

/**
 * The parsed cap.
 * @param raw the CAP value
 * @returns a positive integer, or null for no cap
 */
export function parseCap(raw) {
    const n = Number(raw ?? 2);
    return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * The parsed job budget.
 * @param raw the BUDGET value
 * @returns a positive integer (DEFAULT_BUDGET when unset or empty), or null for no budget
 */
export function parseBudget(raw) {
    return raw === undefined || raw === "" ? DEFAULT_BUDGET : parseCap(raw);
}

/**
 * Pull request runs of ci.yml created before this one that are still active.
 * @param me this run ({ id, created_at })
 * @param runs workflow_runs of a ci.yml runs listing
 * @returns the earlier active runs
 */
export function earlierActive(me, runs) {
    // a run's place is its current attempt's start, so a re-run of an old run queues like a new one
    const mine = Date.parse(me.run_started_at ?? me.created_at);
    return runs.filter((r) => {
        if (r.id === me.id || r.event !== "pull_request" || !ACTIVE.has(r.status)) return false;
        const t = Date.parse(r.run_started_at ?? r.created_at);
        if (r.status === "queued" && mine - t > STALE_HOURS * 3600e3) return false;
        return t < mine || (t === mine && r.id < me.id);
    });
}

/**
 * The jobs the given runs hold or are about to hold, asked in one GraphQL query over their check suites: a run's
 * queued plus in-progress check runs once its Build job has completed, else RUN_JOBS_ESTIMATE (it has not fanned
 * out yet). A run with no check suite counts as RUN_JOBS_ESTIMATE. A failed query throws.
 * @param runs workflow_runs entries (with check_suite_node_id)
 * @param api path, body -> parsed JSON; a body means a POST to the GraphQL endpoint
 * @returns the total
 */
export async function jobsHeld(runs, api) {
    const ids = runs.map((r) => r.check_suite_node_id).filter(Boolean);
    let total = (runs.length - ids.length) * RUN_JOBS_ESTIMATE;
    if (ids.length === 0) return total;
    const query = `query($ids: [ID!]!) { nodes(ids: $ids) { ... on CheckSuite { id
        build: checkRuns(first: 1, filterBy: { checkName: "${BUILD_CHECK}" }) { nodes { status } }
        queued: checkRuns(filterBy: { status: QUEUED }) { totalCount }
        running: checkRuns(filterBy: { status: IN_PROGRESS }) { totalCount } } } }`;
    const res = await api("graphql", { query, variables: { ids } });
    if (res.errors?.length) throw new Error(`GraphQL: ${res.errors[0].message}`);
    const nodes = res.data?.nodes ?? [];
    for (const id of ids) {
        const n = nodes.find((x) => x?.id === id);
        const built = n?.build?.nodes?.[0]?.status === "COMPLETED";
        total += built ? n.queued.totalCount + n.running.totalCount : RUN_JOBS_ESTIMATE;
    }
    return total;
}

/**
 * Whether a run is waiting for a GitHub-hosted runner while it holds fewer than share of them.
 * @param runs workflow_runs of a release.yml or master ci.yml runs listing
 * @param jobsOf run id -> jobs of that run
 * @param share the runners the run may hold before its queued jobs stop counting
 * @returns the id of the waiting run, or null
 */
export async function runWaiting(runs, jobsOf, share) {
    for (const r of runs.filter((x) => ACTIVE.has(x.status))) {
        const jobs = await jobsOf(r.id);
        const hosted = jobs.filter((j) => (j.labels ?? []).some((l) => HOSTED.test(l)));
        const running = hosted.filter((j) => j.status === "in_progress");
        if (running.length >= share) continue;
        const matrix = (j) => /([^/]+?) \(/.exec(j.name ?? "")?.[1].trim();
        const legs = (m) => running.filter((j) => matrix(j) === m).length;
        const heldBack = (j) => legs(matrix(j)) >= (FULL_RUN_MAX_PARALLEL[matrix(j)] ?? Infinity);
        if (hosted.some((j) => j.status === "queued" && !heldBack(j))) return r.id;
    }
    return null;
}

/**
 * One check: why this run must wait, or null to proceed.
 * @param ctx the check's inputs
 * @param ctx.me this run ({ id, run_started_at })
 * @param ctx.cap the cap on earlier active runs, or null for none
 * @param ctx.budget the budget of earlier runs' jobs, or null for none
 * @param ctx.api path -> parsed JSON of a GET under the repository (path, body: a GraphQL POST)
 * @returns null to proceed, else why it waits and how many places it is from its turn
 */
export async function check({ me, cap, budget, api }) {
    // two small listings (active runs only) and one GraphQL query for their jobs
    const list = async (status) =>
        (await api(`actions/workflows/ci.yml/runs?event=pull_request&status=${status}&per_page=100`)).workflow_runs;
    const ahead = earlierActive(me, [...(await list("in_progress")), ...(await list("queued"))]);
    if (cap !== null && ahead.length >= cap)
        return { why: `${ahead.length} earlier pull request runs active (cap ${cap})`, places: ahead.length - cap + 1 };
    if (budget !== null && ahead.length > 0) {
        const held = await jobsHeld(ahead, api);
        if (held >= budget) {
            const places = Math.ceil((held - budget + 1) / RUN_JOBS_ESTIMATE);
            return { why: `${ahead.length} earlier pull request runs hold ${held} jobs (budget ${budget})`, places };
        }
    }
    const jobsOf = async (id) => {
        const jobs = [];
        for (let page = 1; ; page++) {
            const r = await api(`actions/runs/${id}/jobs?per_page=100&filter=latest&page=${page}`);
            jobs.push(...r.jobs);
            if (r.jobs.length < 100 || jobs.length >= r.total_count) return jobs;
        }
    };
    const master = await api("actions/workflows/ci.yml/runs?event=push&branch=master&per_page=5");
    const build = await runWaiting(master.workflow_runs, jobsOf, MASTER_SHARE);
    if (build) return { why: `master build ${build} is waiting for runners`, places: 1 };
    const rel = await api("actions/workflows/release.yml/runs?per_page=10");
    const waiting = await runWaiting(rel.workflow_runs, jobsOf, RELEASE_SHARE);
    return waiting ? { why: `release run ${waiting} is waiting for runners`, places: 1 } : null;
}

/**
 * Wait until this run may proceed. Never throws.
 * @param opts the wait's inputs
 * @param opts.cap the cap on earlier active runs, or null for none
 * @param opts.budget the budget of earlier runs' jobs, or null for none
 * @param opts.api path -> parsed JSON of a GET under the repository
 * @param opts.runId this run's id
 * @param opts.sleep ms -> a promise that resolves after them
 * @param opts.now the clock, in ms
 * @param opts.log where the progress lines go
 * @param opts.maxWaitSeconds the longest wait, after which the run proceeds
 * @param opts.pr the event payload's pull_request, to let a red fix skip the wait (none: it waits as usual)
 * @param opts.repo owner/name, for the alarm issue search
 * @returns waitedSeconds, outcome and the number of checks made
 */
export async function waitTurn({
    cap,
    budget = null,
    api,
    runId,
    sleep,
    now = Date.now,
    log = console.log,
    maxWaitSeconds = MAX_WAIT_MINUTES * 60,
    pr = null,
    repo = "",
}) {
    const start = now();
    let checks = 0;
    if (cap === null && budget === null) return { waitedSeconds: 0, outcome: "no cap", checks };
    if (pr) {
        try {
            const why = await redFix(pr, repo, api);
            if (why) {
                log(`Run cap: no wait, ${why}`);
                return { waitedSeconds: 0, outcome: "red fix", checks };
            }
        } catch (e) {
            // not knowing is no reason to jump the queue: wait as usual
            log(`::warning::Run cap: could not tell whether this fixes a red master (${e.message})`);
        }
    }
    try {
        const me = await api(`actions/runs/${runId}`);
        for (;;) {
            checks++;
            const turn = await check({ me, cap, budget, api });
            const waited = Math.round((now() - start) / 1000);
            if (!turn) return { waitedSeconds: waited, outcome: "proceeded", checks };
            const left = maxWaitSeconds - waited;
            if (left <= 0) {
                log(`::warning::Run cap: still waiting (${turn.why}) after ${waited} s; proceeding`);
                return { waitedSeconds: waited, outcome: "wait limit", checks };
            }
            log(`waiting: ${turn.why}`);
            const pause = Math.max(POLL_SECONDS, Math.min(turn.places * POLL_SECONDS, MAX_POLL_SECONDS));
            await sleep(Math.min(pause, left) * 1000);
        }
    } catch (e) {
        log(`::warning::Run cap: ${e.message}; proceeding without waiting further`);
        return { waitedSeconds: Math.round((now() - start) / 1000), outcome: "API error", checks };
    }
}

async function main() {
    const { GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_STEP_SUMMARY, GITHUB_EVENT_PATH } = process.env;
    const opts = { base: process.env.GITHUB_API_URL, timeoutMs: 30_000, minRateLeft: MIN_RATE_LEFT };
    const api = (path, body) => {
        if (body) return githubRequest("POST", "/graphql", body, opts);
        return githubRequest(
            "GET",
            path.startsWith("/") ? path : `/repos/${GITHUB_REPOSITORY}/${path}`,
            undefined,
            opts,
        );
    };
    const cap = parseCap(process.env.CAP);
    const budget = parseBudget(process.env.BUDGET);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let pr = null;
    try {
        pr = JSON.parse(readFileSync(GITHUB_EVENT_PATH, "utf8")).pull_request ?? null;
    } catch {
        // no event payload: wait as usual
    }
    const runId = Number(GITHUB_RUN_ID);
    const r = await waitTurn({ cap, budget, api, runId, sleep, pr, repo: GITHUB_REPOSITORY });
    const line = `Run cap (${cap ?? "off"} runs, ${budget ?? "off"} jobs): waited ${r.waitedSeconds} s for a turn, ${r.checks} check(s), ${r.outcome}.`;
    console.log(line);
    if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `${line}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
