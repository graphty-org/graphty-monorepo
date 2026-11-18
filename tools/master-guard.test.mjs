import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { examineRed } from "./master-guard.mjs";

// Master commits P (oldest) to D, one CI run each, ten minutes apart. `earlier` maps each commit before the red
// run to its Lint outcome ("success" or "failure"); the red run, at `at`, fails Lint with a lint error.
const sha = (c) => c.repeat(40);
const created = (i) => new Date(Date.parse("2026-11-16T09:00:00Z") + i * 600_000).toISOString();
const examine = (earlier, at) => {
    const order = Object.keys(earlier);
    const runs = order
        .map((c, i) => ({
            id: i + 1,
            head_sha: sha(c),
            html_url: `https://run/${c}`,
            conclusion: earlier[c],
            created_at: created(i),
        }))
        .reverse(); // the API lists newest first
    const run = { id: 100, run_attempt: 1, head_sha: sha(at), created_at: created(order.length) };
    const jobs = [
        { id: 7, name: "Lint", conclusion: "failure", steps: [] },
        { id: 99, name: "All Checks Pass", conclusion: "failure", steps: [] },
    ];
    jobs[0].steps = [{ conclusion: "failure", started_at: run.created_at, completed_at: run.created_at }];
    const gh = async (path) => {
        if (path === "/actions/runs/100/attempts/1/jobs?per_page=100") {
            return { jobs };
        }
        if (path === "/actions/jobs/7/logs") {
            return `${run.created_at} graphty-element/src/data/DataSource.ts 564:5 error sonarjs/no-empty-collection`;
        }
        if (path.startsWith("/actions/workflows/ci.yml/runs?")) {
            return { workflow_runs: runs };
        }
        const m = /^\/actions\/runs\/(\d+)\/jobs\?per_page=100$/.exec(path);
        if (m) {
            return { jobs: [{ name: "Lint", conclusion: runs.find((r) => r.id === Number(m[1])).conclusion }] };
        }
        throw new Error(`unexpected ${path}`);
    };
    return examineRed(gh, run);
};

describe("master-guard blames the commit that introduced a failure", () => {
    it("blames A, not later commits and not an outside cause, when Lint is red since A (#8426)", async () => {
        // at B and at C: Lint passed at P and has failed on every commit since A
        for (const [earlier, at] of [
            [{ p: "success", a: "failure" }, "b"],
            [{ p: "success", a: "failure", b: "failure" }, "c"],
        ]) {
            const { outside, culprit } = await examine(earlier, at);
            assert.equal(outside, null, `not external at ${at}`);
            assert.deepEqual(culprit, { sha: sha("a"), url: "https://run/a" }, `A is reverted at ${at}`);
        }
    });

    it("blames B itself when Lint is red on B only", async () => {
        const { outside, culprit } = await examine({ p: "success", a: "success" }, "b");
        // no earlier culprit and no outside cause: the guard reverts the red run's own commit
        assert.equal(culprit, null);
        assert.equal(outside, null);
    });

    it("does not blame A when Lint was red on A, green on B and red again on C", async () => {
        const { outside, culprit } = await examine({ p: "success", a: "failure", b: "success" }, "c");
        assert.equal(culprit, null);
        // a failure that comes and goes may still be external
        assert.deepEqual(outside, [`Lint also failed on the earlier master commit ${sha("a")}.`]);
    });
});
