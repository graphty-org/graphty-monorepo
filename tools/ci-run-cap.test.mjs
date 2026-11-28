// Tests of tools/ci-run-cap.mjs on recorded GitHub Actions API responses (the shapes of
// GET actions/workflows/<file>/runs and GET actions/runs/<id>/jobs, recorded 2026-10-26, trimmed).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { test } from "node:test";

import {
    DEFAULT_BUDGET,
    earlierActive,
    FULL_RUN_MAX_PARALLEL,
    MASTER_SHARE,
    MAX_WAIT_MINUTES,
    namedIssues,
    parseBudget,
    parseCap,
    POLL_SECONDS,
    RELEASE_SHARE,
    RUN_JOBS_ESTIMATE,
    runCapApi,
    waitTurn,
} from "./ci-run-cap.mjs";

const run = (id, started, status, event = "pull_request") => ({
    id,
    event,
    status,
    created_at: started,
    run_started_at: started,
});
const ME = run(40268423520, "2026-10-26T04:18:51Z", "in_progress");

// a fake API that answers each path from a table, and a fake clock that advances on sleep
function fake({ ci, master = [], release = [], jobs = {}, suites = {} }) {
    const calls = [];
    let t = 0;
    const api = async (path, body) => {
        calls.push(path);
        // suites: check suite id -> { build: its Build check's status, queued, running } (the check run counts)
        if (path === "graphql")
            return {
                data: {
                    nodes: body.variables.ids.map((id) => {
                        const s = suites[id] ?? {};
                        return {
                            id,
                            build: { nodes: s.build ? [{ status: s.build }] : [] },
                            queued: { totalCount: s.queued ?? 0 },
                            running: { totalCount: s.running ?? 0 },
                        };
                    }),
                },
            };
        if (path === `actions/runs/${ME.id}`) return ME;
        if (path.startsWith("actions/workflows/ci.yml/runs?event=push&branch=master")) return { workflow_runs: master };
        if (path.startsWith("actions/workflows/ci.yml/runs")) {
            const status = /status=(\w+)/.exec(path)[1];
            const runs = typeof ci === "function" ? ci(t) : ci;
            return { workflow_runs: runs.filter((r) => r.status === status) };
        }
        if (path.startsWith("actions/workflows/release.yml/runs")) return { workflow_runs: release };
        const m = /^actions\/runs\/(\d+)\/jobs/.exec(path);
        if (m) return { jobs: jobs[m[1]] ?? [], total_count: (jobs[m[1]] ?? []).length };
        throw new Error(`unexpected ${path}`);
    };
    return { api, calls, sleep: async (ms) => void (t += ms), now: () => t, log: () => {} };
}

// the first check's verdict: the "waiting: ..." line, or the outcome when it did not wait
async function firstTurn(f, opts) {
    const lines = [];
    const stop = async () => {
        throw new Error("stopped at the first wait");
    };
    const r = await waitTurn({
        cap: null,
        budget: null,
        runId: ME.id,
        ...f,
        sleep: stop,
        log: (l) => lines.push(l),
        ...opts,
    });
    return lines.find((l) => l.startsWith("waiting:")) ?? r.outcome;
}
const suite = (r, id) => ({ ...r, check_suite_node_id: id });

test("parseCap: default 2, off or junk is no cap", () => {
    assert.equal(parseCap(undefined), 2);
    assert.equal(parseCap("3"), 3);
    assert.equal(parseCap("off"), null);
    assert.equal(parseCap("0"), null);
});

test("parseBudget: unset is the runner ceiling less the full run's and master's shares, off is no budget", () => {
    // 180 runners less the full run's 24 Test and 6 Story tests jobs (#7849) and master's 30 (#9153)
    assert.equal(DEFAULT_BUDGET, 120);
    assert.equal(parseBudget(undefined), DEFAULT_BUDGET);
    assert.equal(parseBudget(""), DEFAULT_BUDGET); // ci.yml passes an unset variable as ""
    assert.equal(parseBudget("120"), 120);
    assert.equal(parseBudget("off"), null);
});

test("earlierActive counts only earlier, active pull request runs", () => {
    const runs = [
        ME,
        run(40268220173, "2026-10-26T04:16:32Z", "completed"), // canceled by a newer push: frees its place
        run(40264114276, "2026-10-26T03:26:48Z", "in_progress"),
        run(40264114000, "2026-10-26T03:20:00Z", "queued"),
        run(40269999999, "2026-10-26T04:20:00Z", "in_progress"), // later: never counts (no deadlock)
        run(40257099973, "2026-10-26T02:02:09Z", "in_progress", "workflow_dispatch"),
        run(40268423519, ME.created_at, "in_progress"), // same second, lower id: earlier
    ];
    assert.deepEqual(
        earlierActive(ME, runs).map((r) => r.id),
        [40264114276, 40264114000, 40268423519],
    );
});

test("proceeds at once under the cap, with one listing per status", async () => {
    const f = fake({ ci: [ME, run(1, "2026-10-26T04:00:00Z", "in_progress")] });
    const r = await waitTurn({ cap: 2, runId: ME.id, ...f });
    assert.deepEqual(r, { waitedSeconds: 0, outcome: "proceeded", checks: 1 });
    assert.equal(
        f.calls.filter((c) => c.startsWith("actions/workflows/ci.yml") && c.includes("pull_request")).length,
        2,
    );
    assert.match(f.calls[1], /event=pull_request&status=in_progress&per_page=100$/);
});

test("waits while the cap is full, polling every POLL_SECONDS, until an earlier run finishes", async () => {
    // two earlier runs active; one completes after 3 minutes
    const ci = (t) => [
        ME,
        run(1, "2026-10-26T04:00:00Z", "in_progress"),
        run(2, "2026-10-26T04:01:00Z", t >= 180e3 ? "completed" : "in_progress"),
    ];
    const f = fake({ ci });
    const r = await waitTurn({ cap: 2, runId: ME.id, ...f });
    assert.equal(r.outcome, "proceeded");
    assert.equal(r.waitedSeconds, 180);
    assert.equal(r.checks, 180 / POLL_SECONDS + 1);
});

test("a run further back checks less often", async () => {
    const ahead = [1, 2, 3, 4].map((i) => run(i, `2026-10-26T04:0${i}:00Z`, "in_progress"));
    const f = fake({ ci: (t) => [ME, ...ahead.filter((_, i) => t < 600e3 || i > 2)] });
    const r = await waitTurn({ cap: 2, runId: ME.id, ...f });
    // 3 places from its turn: a check every 180 s until three runs finish at 600 s
    assert.deepEqual(r, { waitedSeconds: 720, outcome: "proceeded", checks: 5 });
});

test("yields to a release run waiting for a GitHub-hosted runner, not to a T4 or an approval", async () => {
    const release = [run(77, "2026-10-26T02:02:09Z", "in_progress", "workflow_dispatch")];
    const hosted = {
        77: [
            { status: "queued", labels: ["ubuntu-24.04"] },
            { status: "completed", labels: ["ubuntu-24.04"] },
        ],
    };
    const other = {
        77: [
            { status: "queued", labels: ["machine", "gpu=T4"] },
            { status: "waiting", labels: ["ubuntu-24.04"] },
        ],
    };
    const f1 = fake({ ci: [ME], release, jobs: hosted });
    assert.match(await firstTurn(f1, { cap: 2 }), /release run 77 is waiting/);
    const f2 = fake({ ci: [ME], release, jobs: other });
    assert.equal((await waitTurn({ cap: 2, runId: ME.id, ...f2 })).outcome, "proceeded");
    const f3 = fake({
        ci: [ME],
        release: [run(78, "2026-10-26T02:02:09Z", "queued", "workflow_dispatch")],
        jobs: { 78: [{ status: "queued", labels: ["ubuntu-24.04"] }] },
    });
    assert.match(await firstTurn(f3, { cap: 2 }), /release run 78 is waiting/);
    // a release run that already holds its share of runners: its queued jobs are its own max-parallel tail
    const full = {
        77: [
            ...Array.from({ length: RELEASE_SHARE }, () => ({ status: "in_progress", labels: ["ubuntu-24.04"] })),
            { status: "queued", labels: ["ubuntu-24.04"] },
        ],
    };
    const f4 = fake({ ci: [ME], release, jobs: full });
    assert.equal((await waitTurn({ cap: 2, runId: ME.id, ...f4 })).outcome, "proceeded");
});

test("yields to a master push build waiting for a runner, until it holds MASTER_SHARE of them (#9153)", async () => {
    // a master build whose Build job waits for a runner behind pull request jobs
    const master = [run(44669000001, "2026-11-20T04:13:00Z", "in_progress", "push")];
    const jobs = { 44669000001: [job("Run cap", "completed"), job("Build", "queued")] };
    assert.match(await firstTurn(fake({ ci: [ME], master, jobs }), { cap: 2 }), /master build 44669000001 is waiting/);
    // a pending master build (held by its concurrency group, no jobs yet) and a finished one hold nothing
    const idle = [
        run(44669000002, "2026-11-20T04:14:00Z", "pending", "push"),
        run(44669000003, "2026-11-20T04:00:00Z", "completed", "push"),
    ];
    const done = { 44669000003: [job("Build", "queued")] };
    assert.equal(
        (await waitTurn({ cap: 2, runId: ME.id, ...fake({ ci: [ME], master: idle, jobs: done }) })).outcome,
        "proceeded",
    );
    // a master build that already holds its share no longer holds pull requests back
    const full = { 44669000001: [...legs("visual", MASTER_SHARE, "in_progress"), job("Build", "queued")] };
    assert.equal(
        (await waitTurn({ cap: 2, runId: ME.id, ...fake({ ci: [ME], master, jobs: full }) })).outcome,
        "proceeded",
    );
});

test("never fails: an API error proceeds, and no cap asks nothing", async () => {
    const f = fake({ ci: [] });
    const broken = async () => {
        throw new Error("GET x: HTTP 403");
    };
    assert.equal((await waitTurn({ cap: 2, runId: ME.id, ...f, api: broken })).outcome, "API error");
    assert.equal((await waitTurn({ cap: null, runId: ME.id, ...f })).outcome, "no cap");
    assert.equal(f.calls.length, 0);
});

test("counts the jobs earlier runs hold, not the runs, in one GraphQL query", async () => {
    const ci = [
        ME,
        suite(run(1, "2026-10-26T04:00:00Z", "in_progress"), "CS_1"), // fanned out: 70 jobs queued or running
        suite(run(2, "2026-10-26T04:01:00Z", "in_progress"), "CS_2"), // only its screenshot tail is left
        suite(run(3, "2026-10-26T04:02:00Z", "in_progress"), "CS_3"), // a small run, one package
    ];
    const suites = {
        CS_1: { build: "COMPLETED", queued: 40, running: 30 },
        CS_2: { build: "COMPLETED", running: 2 },
        CS_3: { build: "COMPLETED", queued: 1, running: 5 },
    };
    const f = fake({ ci, suites });
    assert.equal(await firstTurn(f, { budget: 79 }), "proceeded"); // 78 jobs held
    assert.equal(f.calls.filter((c) => c === "graphql").length, 1);
    assert.equal(
        await firstTurn(fake({ ci, suites }), { budget: 78 }),
        "waiting: 3 earlier pull request runs hold 78 jobs (budget 78)",
    );
    // three runs are no reason to wait when the budget has room; the run cap still limits the count when set
    assert.equal(await firstTurn(fake({ ci, suites }), { budget: DEFAULT_BUDGET }), "proceeded");
    assert.match(await firstTurn(fake({ ci, suites }), { cap: 3, budget: DEFAULT_BUDGET }), /cap 3/);
});

test("a run that has not finished Build counts as RUN_JOBS_ESTIMATE, so waiting runs keep their order", async () => {
    const ci = [
        ME,
        suite(run(1, "2026-10-26T04:00:00Z", "in_progress"), "CS_1"),
        suite(run(2, "2026-10-26T04:01:00Z", "in_progress"), "CS_2"), // still waiting at Run cap: one job
        suite(run(3, "2026-10-26T04:02:00Z", "queued"), "CS_3"), // not even a runner for Run cap yet
    ];
    const suites = { CS_1: { build: "COMPLETED", running: 10 }, CS_2: { running: 1 }, CS_3: { queued: 1 } };
    const held = 10 + 2 * RUN_JOBS_ESTIMATE;
    assert.equal(await firstTurn(fake({ ci, suites }), { budget: held + 1 }), "proceeded");
    assert.equal(
        await firstTurn(fake({ ci, suites }), { budget: held }),
        `waiting: 3 earlier pull request runs hold ${held} jobs (budget ${held})`,
    );
    // a run with no check suite yet counts the same
    const bare = [ME, run(1, "2026-10-26T04:00:00Z", "queued")];
    assert.match(await firstTurn(fake({ ci: bare }), { budget: RUN_JOBS_ESTIMATE }), /hold 40 jobs/);
});

test("a run queued for over a day is stuck, not load, and never counts", async () => {
    const stuck = suite(run(1, "2026-10-24T03:00:00Z", "queued"), "CS_1"); // 49 hours before ME
    const recent = suite(run(2, "2026-10-26T03:00:00Z", "queued"), "CS_2");
    assert.deepEqual(
        earlierActive(ME, [stuck, recent]).map((r) => r.id),
        [2],
    );
    const f = fake({ ci: [ME, stuck] });
    assert.equal(await firstTurn(f, { cap: 1, budget: 1 }), "proceeded");
    assert.ok(!f.calls.includes("graphql"), "no earlier run, no query");
});

test("waits its turn past 25 minutes until the jobs drain", async () => {
    const ci = [ME, suite(run(1, "2026-10-26T04:00:00Z", "in_progress"), "CS_1")];
    const f = fake({ ci, suites: { CS_1: { build: "COMPLETED", queued: 200 } } });
    // the earlier run's jobs drain after an hour
    const api = async (path, body) => {
        const res = await f.api(path, body);
        if (path === "graphql" && f.now() >= 3600e3) res.data.nodes[0].queued.totalCount = 10;
        return res;
    };
    const r = await waitTurn({ cap: null, budget: DEFAULT_BUDGET, runId: ME.id, ...f, api });
    assert.equal(r.outcome, "proceeded");
    assert.ok(r.waitedSeconds >= 3600, `waited ${r.waitedSeconds} s`);
});

test("ends its wait at MAX_WAIT_MINUTES and proceeds, so the job's timeout never cancels the run", async () => {
    const ci = [ME, suite(run(1, "2026-10-26T04:00:00Z", "in_progress"), "CS_1")];
    const f = fake({ ci, suites: { CS_1: { build: "COMPLETED", queued: 1000 } } });
    const r = await waitTurn({ cap: null, budget: DEFAULT_BUDGET, runId: ME.id, ...f });
    assert.equal(r.outcome, "wait limit");
    assert.equal(r.waitedSeconds, MAX_WAIT_MINUTES * 60);
});

test("MAX_WAIT_MINUTES ends before the Run cap job's timeout in ci.yml", () => {
    const yml = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    const timeout = Number(/\n {4}run-cap:\n(?: {8}.*\n)*? {8}timeout-minutes: (\d+)\n/.exec(yml)?.[1]);
    assert.ok(MAX_WAIT_MINUTES + 5 <= timeout, `wait ${MAX_WAIT_MINUTES} min, job timeout ${timeout} min`);
});

test("a failed GraphQL query is an API failure: it proceeds", async () => {
    const ci = [ME, suite(run(1, "2026-10-26T04:00:00Z", "in_progress"), "CS_1")];
    const f = fake({ ci });
    const api = async (path, body) => {
        if (path === "graphql") return { errors: [{ message: "rate limited" }] };
        return f.api(path, body);
    };
    assert.equal((await waitTurn({ cap: null, budget: 1, runId: ME.id, ...f, api })).outcome, "API error");
});

test("ci.yml passes CI_PR_JOB_BUDGET to the run cap", () => {
    const yml = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    assert.match(yml, /\n {18}BUDGET: \$\{\{ vars\.CI_PR_JOB_BUDGET \}\}\n {14}run: node tools\/ci-run-cap\.mjs\n/);
});

// a full run's jobs, as GET actions/runs/<id>/jobs names them (release run 42966344736, 2026-11-11)
const job = (name, status) => ({ name: `CI / ${name}`, status, labels: ["ubuntu-24.04"] });
const legs = (matrix, n, status) => Array.from({ length: n }, (_, i) => job(`${matrix} (leg-${i})`, status));

test("a full run whose only queued job is held by its own max-parallel does not hold pull requests", async () => {
    // GitHub reports the whole run as "queued" while one story leg waits behind its six running siblings
    const release = [run(42966344736, "2026-11-11T05:20:00Z", "queued", "workflow_dispatch")];
    const jobs = {
        42966344736: [
            ...legs("Story tests", FULL_RUN_MAX_PARALLEL["Story tests"], "in_progress"),
            ...legs("Test", 9, "in_progress"),
            job("Story tests (graph-io-fidelity-4)", "queued"),
            job("Build", "completed"),
        ],
    };
    const f = fake({ ci: [ME], release, jobs });
    assert.deepEqual(await waitTurn({ cap: 2, runId: ME.id, ...f }), {
        waitedSeconds: 0,
        outcome: "proceeded",
        checks: 1,
    });
    assert.equal(f.calls.filter((c) => c.includes("/jobs")).length, 1);
});

test("a full run waiting for runners with fewer than its share still holds pull requests", async () => {
    const release = [run(42966344736, "2026-11-11T05:20:00Z", "in_progress", "workflow_dispatch")];
    // three story legs run, a fourth waits for a runner though the matrix allows six
    const jobs = {
        42966344736: [
            ...legs("Story tests", 3, "in_progress"),
            ...legs("Test", FULL_RUN_MAX_PARALLEL.Test, "in_progress"),
            job("Story tests (graph-io-fidelity-4)", "queued"),
        ],
    };
    assert.match(await firstTurn(fake({ ci: [ME], release, jobs }), { cap: 2 }), /release run 42966344736/);
    // a test shard queued behind its running siblings at max-parallel is the run's own max-parallel, not a runner wait
    jobs[42966344736][jobs[42966344736].length - 1] = job("Test (layout-2)", "queued");
    const ok = await waitTurn({ cap: 2, runId: ME.id, ...fake({ ci: [ME], release, jobs }) });
    assert.equal(ok.outcome, "proceeded");
});

test("FULL_RUN_MAX_PARALLEL matches ci.yml's full-run max-parallel", () => {
    const yml = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    for (const [name, n] of Object.entries(FULL_RUN_MAX_PARALLEL)) {
        const re = new RegExp(`name: ${name} \\(\\$\\{\\{[^]*?max-parallel: .*\\|\\| (\\d+) \\}\\}`);
        assert.equal(Number(re.exec(yml)?.[1]), n, `${name}'s full-run max-parallel in ci.yml`);
    }
    assert.equal(RELEASE_SHARE, 30);
    // the run cap's comment in ci.yml states the default budget it derives
    assert.match(yml, new RegExp(`CI_PR_JOB_BUDGET \\(a repository variable, default ${DEFAULT_BUDGET}\\b`));
});

// a red fix skips the wait (#9473): a pull request that names an open alarm issue, or a revert/<sha7> branch
test("a pull request that fixes an open red-master or full-run alarm skips the wait", async () => {
    const ci = [run(40268423000, "2026-10-26T04:00:00Z", "in_progress"), ME];
    const issues = [
        { number: 9456, state: "open", title: "Full run red: CI / Test (layout) fails curve.test.ts" },
        { number: 9100, state: "open", title: "GPU lane red on master" },
        { number: 9200, state: "open", title: "Red master: CI failed on abc1234" },
        { number: 9300, state: "open", title: "Red masterpiece in the docs" },
        { number: 9465, state: "open", title: "Full run red: x", pull_request: {} },
    ];
    // the pull request as it is now (title, body, commits), answered by the one GraphQL query redFix makes
    const withSearch = (now = {}) => {
        const f = fake({ ci });
        const inner = f.api;
        f.api = async (path, body) => {
            if (path.startsWith("/search/issues?")) {
                f.calls.push(path);
                const q = decodeURIComponent(path);
                assert.match(q, /repo:o\/r is:issue is:open "Full run red" OR "Failing on master" OR "Red master"/);
                return { items: issues };
            }
            if (path === "graphql" && body.variables.n !== undefined) {
                f.calls.push("pr-text");
                assert.deepEqual(body.variables, { owner: "o", name: "r", n: 7 });
                const nodes = (now.commits ?? []).map((message) => ({ commit: { message } }));
                const pullRequest = { title: now.title ?? "fix: curve", body: now.body ?? "", commits: { nodes } };
                return { data: { repository: { pullRequest } } };
            }
            return inner(path, body);
        };
        return f;
    };
    // the event payload: the body it fired with is stale, so redFix reads the current one
    const pr = (ref = "fix/9456-curve") => ({ number: 7, title: "fix: curve", body: "", head: { ref } });
    const outcome = async (body, commits, ref) =>
        (await waitTurn({ cap: 1, runId: ME.id, repo: "o/r", pr: pr(ref), ...withSearch({ body, commits }) })).outcome;

    assert.equal(await outcome("Fixes #9456"), "red fix");
    assert.equal(await outcome("Refs #9100"), "red fix");
    assert.equal(await outcome("No issue", ["fix: curve\n\nFixes #9200"]), "red fix");
    assert.equal(await outcome("", [], "revert/1a2b3c4"), "red fix");
    // a closed alarm is not in the open search, and a non-alarm issue or a pull request still waits
    for (const body of ["Fixes #9999", "Fixes #9300", "Refs #9465", "mentions #9456 only"])
        assert.equal(await outcome(body), "wait limit", body);
    assert.equal(await outcome("", [], "revert/not-a-sha"), "wait limit");
    // a search that fails waits as usual, never jumps the queue
    const f = withSearch({ body: "Fixes #9456" });
    const api = f.api;
    f.api = async (path, body) => {
        if (path.startsWith("/search/")) throw new Error("GET search: HTTP 403");
        return api(path, body);
    };
    assert.equal((await waitTurn({ cap: 1, runId: ME.id, repo: "o/r", pr: pr(), ...f })).outcome, "wait limit");
    // no event payload: no extra calls
    const plain = withSearch();
    await waitTurn({ cap: 1, runId: ME.id, ...plain, maxWaitSeconds: 0 });
    assert.ok(!plain.calls.some((c) => c.startsWith("/search") || c === "pr-text"));
});

// #10351: the event payload is the pull request as it was when the event fired, and pr-open.sh writes the final
// body (with its Refs line) only after the pull request exists
test("a red fix is judged by the pull request's current body and every commit, never the event payload", async () => {
    const ci = [run(40268423000, "2026-10-26T04:00:00Z", "in_progress"), ME];
    const alarm = { number: 10340, state: "open", title: "Full run red: CI / Test (graph-io) fails x.test.ts" };
    const other = { number: 10305, state: "open", title: "Some ordinary bug" };
    const judge = async (now, payloadBody = "") => {
        const f = fake({ ci });
        const inner = f.api;
        f.api = async (path, body) => {
            if (path.startsWith("/search/issues?")) {
                f.calls.push("search");
                return { items: [alarm, other] };
            }
            if (path === "graphql" && body.variables.n !== undefined) {
                f.calls.push("pr-text");
                const nodes = (now.commits ?? []).map((message) => ({ commit: { message } }));
                return {
                    data: { repository: { pullRequest: { title: "fix: x", body: now.body, commits: { nodes } } } },
                };
            }
            if (path.startsWith("pulls/")) throw new Error(`unexpected ${path}`);
            return inner(path, body);
        };
        const pr = { number: 7, title: "fix: x", body: payloadBody, head: { ref: "fix/10340-x" } };
        const r = await waitTurn({ cap: 1, runId: ME.id, repo: "o/r", pr, ...f });
        return { outcome: r.outcome, calls: f.calls.filter((c) => c === "pr-text" || c === "search").length };
    };
    // the body was updated after the event: the payload had no Refs line, the pull request now has one
    assert.deepEqual(await judge({ body: "Refs #10340" }, "draft"), { outcome: "red fix", calls: 2 });
    // a commit names the red issue while the body names only an ordinary one
    assert.equal((await judge({ body: "Fixes #10305", commits: ["fix: x\n\nRefs #10340"] })).outcome, "red fix");
    // a pull request that fixes nothing red stays capped, even when its stale payload named the alarm
    const plain = await judge({ body: "Fixes #10305", commits: ["fix: x\n\nFixes #10305"] }, "Refs #10340");
    assert.equal(plain.outcome, "wait limit");
});

// #10481: the search API's own bucket reports at most 30 left, which the MIN_RATE_LEFT floor (for the hourly core
// bucket) once read as "the token is nearly out", so every red fix waited the full MAX_WAIT_MINUTES
test("a red fix skips the wait when the search response reports 30 left", async () => {
    const alarm = { number: 10477, state: "open", title: "Red master: CI failed on b02a405" };
    const server = createServer((req, res) => {
        const search = req.url.startsWith("/search/issues?");
        const headers = { "content-type": "application/json", "x-ratelimit-remaining": search ? "30" : "4000" };
        headers["x-ratelimit-resource"] = search ? "search" : "graphql";
        const pullRequest = { title: "fix: x", body: "Fixes #10477", commits: { nodes: [] } };
        const answer = search ? { items: [alarm] } : { data: { repository: { pullRequest } } };
        res.writeHead(200, headers).end(JSON.stringify(answer));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
        const api = runCapApi("o/r", `http://127.0.0.1:${server.address().port}`, "t");
        const pr = { number: 7, head: { ref: "fix/10477-x" } };
        const lines = [];
        const r = await waitTurn({
            cap: 1,
            runId: ME.id,
            api,
            pr,
            repo: "o/r",
            sleep: async () => {},
            log: (l) => lines.push(l),
        });
        assert.equal(r.outcome, "red fix", lines.join("\n"));
    } finally {
        server.close();
    }
});

test("namedIssues reads Fixes, Closes, Resolves and Refs, and not a bare mention", () => {
    assert.deepEqual([...namedIssues("Fixes #1, refs #2\ncloses: #3 resolved #4 see #5")], [1, 2, 3, 4]);
    assert.equal(namedIssues(undefined).size, 0);
});

test("ci.yml gives the run cap the event payload's reads: pull requests and issues", () => {
    const yml = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    const job = /\n {4}run-cap:\n([\s\S]*?)\n {4}\S/.exec(yml)[1];
    assert.match(job, /pull-requests: read/);
    assert.match(job, /issues: read/);
});
