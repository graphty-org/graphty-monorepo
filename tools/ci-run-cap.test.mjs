// Tests of tools/ci-run-cap.mjs on recorded GitHub Actions API responses (the shapes of
// GET actions/workflows/<file>/runs and GET actions/runs/<id>/jobs, recorded 2026-10-26, trimmed).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
    DEFAULT_BUDGET,
    earlierActive,
    FULL_RUN_MAX_PARALLEL,
    parseBudget,
    parseCap,
    POLL_SECONDS,
    RELEASE_SHARE,
    RUN_JOBS_ESTIMATE,
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
function fake({ ci, release = [], jobs = {}, suites = {} }) {
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

test("parseBudget: unset is the runner ceiling less the full run's share, off is no budget", () => {
    // 180 runners less the full run's 24 Test and 6 Story tests jobs (#7849; 160 while the full run ran 14)
    assert.equal(DEFAULT_BUDGET, 150);
    assert.equal(parseBudget(undefined), DEFAULT_BUDGET);
    assert.equal(parseBudget(""), DEFAULT_BUDGET); // ci.yml passes an unset variable as ""
    assert.equal(parseBudget("120"), 120);
    assert.equal(parseBudget("off"), null);
});

test("earlierActive counts only earlier, active pull request runs", () => {
    const runs = [
        ME,
        run(40268220173, "2026-10-26T04:16:32Z", "completed"), // cancelled by a newer push: frees its place
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
    assert.equal(f.calls.filter((c) => c.startsWith("actions/workflows/ci.yml")).length, 2);
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

test("waits its turn with no time limit of its own: past 25 minutes until the jobs drain", async () => {
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
