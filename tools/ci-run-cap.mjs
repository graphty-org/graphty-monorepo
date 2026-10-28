#!/usr/bin/env node
// The cap on concurrent pull request CI runs: the first job of ci.yml on a pull request ("Run cap") runs this
// and every other job of the run waits for it, so a waiting run holds one small runner and nothing else.
//
// It waits while CAP or more other pull request runs of ci.yml created before this one are still active
// (queued or running), and while a release.yml run waits for a GitHub-hosted runner (the full run goes
// first; GitHub Actions has no job priority). A run whose "All Checks Pass" job has already completed (only its
// screenshot tail is left) does not count; one GraphQL query asks that of every counted run. Only earlier runs count, so the oldest waiting run always
// proceeds: no deadlock. A cancelled or superseded run is completed and frees its place at once.
//
// It never fails the pull request: an API error, or waiting longer than MAX_WAIT_MINUTES, lets the run
// proceed, and so does a GITHUB_TOKEN with under MIN_RATE_LEFT requests left this hour (the token's 1,000 an
// hour are shared by every workflow). A run k places from its turn checks every k x POLL_SECONDS (at most
// 5 minutes), so a long queue costs few calls. The wait goes in the job summary.
//
// CAP is the repository variable CI_PR_RUN_CAP (default 2), read in ci.yml's "Run cap" job:
//   gh variable set CI_PR_RUN_CAP --repo graphty-org/graphty-monorepo --body 3    (raise it)
//   gh variable set CI_PR_RUN_CAP --repo graphty-org/graphty-monorepo --body off  (no cap)
// Environment: GITHUB_TOKEN (actions: read, checks: read), GITHUB_REPOSITORY, GITHUB_RUN_ID, CAP, GITHUB_STEP_SUMMARY.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const POLL_SECONDS = 60;
const MAX_POLL_SECONDS = 300;
export const MIN_RATE_LEFT = 300;
export const MAX_WAIT_MINUTES = 25;
const ACTIVE = new Set(["queued", "in_progress", "requested", "pending", "waiting"]);
const HOSTED = /^(ubuntu|windows|macos)-/;
const SUMMARY_CHECK = "All Checks Pass";

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
        return t < mine || (t === mine && r.id < me.id);
    });
}

/**
 * The runs whose "All Checks Pass" check has not completed yet, asked in one GraphQL query over their check
 * suites. A run with no such check yet, or any error, counts as not finished, so the cap never loosens by mistake.
 * @param runs workflow_runs entries (with check_suite_node_id)
 * @param api path, body -> parsed JSON; a body means a POST to the GraphQL endpoint
 * @returns the runs still before their summary check
 */
export async function unfinished(runs, api) {
    const ids = runs.map((r) => r.check_suite_node_id).filter(Boolean);
    if (ids.length === 0) return runs;
    let done;
    try {
        const query = `query($ids: [ID!]!) { nodes(ids: $ids) { ... on CheckSuite { id
            checkRuns(first: 10, filterBy: { checkName: "${SUMMARY_CHECK}" }) { nodes { status } } } } }`;
        const res = await api("graphql", { query, variables: { ids } });
        const finished = (n) =>
            n?.checkRuns?.nodes?.length > 0 && n.checkRuns.nodes.every((c) => c.status === "COMPLETED");
        done = new Set((res.data?.nodes ?? []).filter(finished).map((n) => n.id));
    } catch {
        return runs;
    }
    return runs.filter((r) => !done.has(r.check_suite_node_id));
}

/**
 * Whether a release run is waiting for a GitHub-hosted runner.
 * @param runs workflow_runs of a release.yml runs listing
 * @param jobsOf run id -> jobs of that run (only asked for a running run)
 * @returns the id of the waiting release run, or null
 */
export async function releaseWaiting(runs, jobsOf) {
    for (const r of runs) {
        if (r.status === "queued") return r.id;
        if (r.status !== "in_progress") continue;
        const jobs = await jobsOf(r.id);
        if (jobs.some((j) => j.status === "queued" && (j.labels ?? []).some((l) => HOSTED.test(l)))) return r.id;
    }
    return null;
}

/**
 * One check: why this run must wait, or null to proceed.
 * @param ctx the check's inputs
 * @param ctx.me this run ({ id, run_started_at })
 * @param ctx.cap the cap
 * @param ctx.api path -> parsed JSON of a GET under the repository (path, body: a GraphQL POST)
 * @returns null to proceed, else why it waits and how many places it is from its turn
 */
export async function check({ me, cap, api }) {
    // two small listings (active runs only), the second only when the first leaves room
    const list = async (status) =>
        (await api(`actions/workflows/ci.yml/runs?event=pull_request&status=${status}&per_page=100`)).workflow_runs;
    let ahead = earlierActive(me, await list("in_progress"));
    if (ahead.length >= cap) ahead = await unfinished(ahead, api);
    if (ahead.length < cap) ahead = ahead.concat(earlierActive(me, await list("queued")));
    if (ahead.length >= cap)
        return { why: `${ahead.length} earlier pull request runs active (cap ${cap})`, places: ahead.length - cap + 1 };
    const rel = await api("actions/workflows/release.yml/runs?per_page=10");
    const active = rel.workflow_runs.filter((r) => ACTIVE.has(r.status));
    const waiting = await releaseWaiting(active, async (id) => {
        const jobs = [];
        for (let page = 1; ; page++) {
            const r = await api(`actions/runs/${id}/jobs?per_page=100&filter=latest&page=${page}`);
            jobs.push(...r.jobs);
            if (r.jobs.length < 100 || jobs.length >= r.total_count) return jobs;
        }
    });
    return waiting ? { why: `release run ${waiting} is waiting for runners`, places: 1 } : null;
}

/**
 * Wait until this run may proceed. Never throws.
 * @param opts the wait's inputs
 * @param opts.cap the cap, or null for none
 * @param opts.api path -> parsed JSON of a GET under the repository
 * @param opts.runId this run's id
 * @param opts.sleep ms -> a promise that resolves after them
 * @param opts.now the clock, in ms
 * @param opts.log where the progress lines go
 * @returns waitedSeconds, outcome and the number of checks made
 */
export async function waitTurn({ cap, api, runId, sleep, now = Date.now, log = console.log }) {
    const start = now();
    let checks = 0;
    if (cap === null) return { waitedSeconds: 0, outcome: "no cap", checks };
    try {
        const me = await api(`actions/runs/${runId}`);
        for (;;) {
            checks++;
            const turn = await check({ me, cap, api });
            const waited = Math.round((now() - start) / 1000);
            if (!turn) return { waitedSeconds: waited, outcome: "proceeded", checks };
            if (waited >= MAX_WAIT_MINUTES * 60) {
                log(`::warning::Run cap: waited ${waited} s, the most it waits; proceeding (${turn.why})`);
                return { waitedSeconds: waited, outcome: "gave up waiting", checks };
            }
            log(`waiting: ${turn.why}`);
            const left = MAX_WAIT_MINUTES * 60 - waited;
            await sleep(Math.max(POLL_SECONDS, Math.min(turn.places * POLL_SECONDS, MAX_POLL_SECONDS, left)) * 1000);
        }
    } catch (e) {
        log(`::warning::Run cap: ${e.message}; proceeding without waiting further`);
        return { waitedSeconds: Math.round((now() - start) / 1000), outcome: "API error", checks };
    }
}

async function main() {
    const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_STEP_SUMMARY } = process.env;
    const base = process.env.GITHUB_API_URL ?? "https://api.github.com";
    const api = async (path, body) => {
        const res = await fetch(body ? `${base}/graphql` : `${base}/repos/${GITHUB_REPOSITORY}/${path}`, {
            method: body ? "POST" : "GET",
            body: body && JSON.stringify(body),
            headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`${body ? "POST" : "GET"} ${path}: HTTP ${res.status}`);
        const left = Number(res.headers.get("x-ratelimit-remaining") ?? Infinity);
        if (left < MIN_RATE_LEFT) throw new Error(`only ${left} API requests left this hour`);
        return res.json();
    };
    const cap = parseCap(process.env.CAP);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const r = await waitTurn({ cap, api, runId: Number(GITHUB_RUN_ID), sleep });
    const line = `Run cap (${cap ?? "off"}): waited ${r.waitedSeconds} s for a turn, ${r.checks} check(s), ${r.outcome}.`;
    console.log(line);
    if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `${line}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
