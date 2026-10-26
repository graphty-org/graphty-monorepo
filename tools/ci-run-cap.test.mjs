// Tests of tools/ci-run-cap.mjs on recorded GitHub Actions API responses (the shapes of
// GET actions/workflows/<file>/runs and GET actions/runs/<id>/jobs, recorded 2026-10-26, trimmed).
import assert from "node:assert/strict";
import { test } from "node:test";

import { earlierActive, MAX_WAIT_MINUTES, parseCap, POLL_SECONDS, waitTurn } from "./ci-run-cap.mjs";

const run = (id, started, status, event = "pull_request") => ({
    id,
    event,
    status,
    created_at: started,
    run_started_at: started,
});
const ME = run(40268423520, "2026-10-26T04:18:51Z", "in_progress");

// a fake API that answers each path from a table, and a fake clock that advances on sleep
function fake({ ci, release = [], jobs = {} }) {
    const calls = [];
    let t = 0;
    const api = async (path) => {
        calls.push(path);
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

test("parseCap: default 2, off or junk is no cap", () => {
    assert.equal(parseCap(undefined), 2);
    assert.equal(parseCap("3"), 3);
    assert.equal(parseCap("off"), null);
    assert.equal(parseCap("0"), null);
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
    const r1 = await waitTurn({ cap: 2, runId: ME.id, ...f1 });
    assert.equal(r1.outcome, "gave up waiting");
    assert.equal(r1.waitedSeconds, MAX_WAIT_MINUTES * 60);
    const f2 = fake({ ci: [ME], release, jobs: other });
    assert.equal((await waitTurn({ cap: 2, runId: ME.id, ...f2 })).outcome, "proceeded");
    const f3 = fake({ ci: [ME], release: [run(78, "2026-10-26T02:02:09Z", "queued", "workflow_dispatch")] });
    assert.equal((await waitTurn({ cap: 2, runId: ME.id, ...f3 })).outcome, "gave up waiting");
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
