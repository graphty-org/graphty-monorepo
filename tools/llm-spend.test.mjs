// Tests of tools/llm-spend.mjs: the month's spend on release.yml's LLM regression lane.
//
//   node --test tools/llm-spend.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BISECT_STEP, countPaid, httpStatus, paidSteps, RETRY, runJobs, spendWarning, STEP } from "./llm-spend.mjs";

RETRY.waitMs = 0;

const job = (steps) => ({ name: "LLM regression", steps });

describe("paidSteps", () => {
    it("counts passed, failed and cancelled test steps, since each sent paid calls", () => {
        const jobs = [
            job([{ name: STEP, conclusion: "failure", completed_at: "2026-10-24T01:00:00Z" }]),
            job([{ name: STEP, conclusion: "cancelled", completed_at: "2026-10-24T03:00:00Z" }]),
            job([{ name: STEP, conclusion: "skipped", completed_at: "2026-10-24T05:00:00Z" }]),
            job([{ name: STEP, conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }]),
            { name: "Hosts", steps: [{ name: "Run", conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }] },
            { name: "Pick" },
        ];
        assert.deepEqual(paidSteps(jobs), ["2026-10-24T01:00:00Z", "2026-10-24T03:00:00Z", "2026-10-24T07:00:00Z"]);
    });
});

describe("spendWarning", () => {
    it("stays quiet under $60 in a month and warns at it", () => {
        assert.equal(spendWarning(63, "2026-10"), null);
        assert.match(spendWarning(64, "2026-10"), /^spend:llm: 64 LLM regression runs in 2026-10 is about \$60\.16/);
    });
});

// A fake Actions API over one run, in the jobs API's shape ({ total_count, jobs: [{ id, run_id, run_attempt, name,
// steps: [{ name, conclusion, completed_at }] }] }). Modelled on run 40476709992 (2026-10-27, 223 jobs over two
// attempts): every page of 25 or more jobs that holds one particular job answers 502, every time.
function fakeRun({ total = 223, poison = 30, failSizes = 25, flaky = 0 } = {}) {
    const jobs = Array.from({ length: total }, (_, i) => ({
        id: 122132600000 + i,
        run_id: 40476709992,
        run_attempt: i < 108 ? 1 : 2,
        name: i === total - 1 ? "LLM regression" : `CI / Test (shard-${i})`,
        steps: [
            { name: "Set up job", conclusion: "success", completed_at: "2026-10-27T10:20:00Z" },
            ...(i === total - 1 ? [{ name: STEP, conclusion: "success", completed_at: "2026-10-27T10:29:05Z" }] : []),
        ],
    }));
    const calls = [];
    let transient = flaky;
    const get = async (path) => {
        calls.push(path);
        const q = new URL(`https://x/${path}`).searchParams;
        const size = Number(q.get("per_page"));
        const page = Number(q.get("page"));
        const slice = jobs.slice((page - 1) * size, page * size);
        if (transient > 0) {
            transient--;
            throw Object.assign(new Error("gh: Server Error (HTTP 502)"), { status: 502 });
        }
        if (size >= failSizes && slice.some((j) => j.id === jobs[poison]?.id))
            throw Object.assign(new Error("gh: Server Error (HTTP 502)"), { status: 502 });
        return { total_count: total, jobs: slice };
    };
    return { jobs, calls, get };
}

describe("runJobs", () => {
    it("reads a page GitHub keeps failing as smaller pages, losing no job", async () => {
        const f = fakeRun();
        const got = await runJobs(f.get, "o/r", 40476709992);
        assert.deepEqual(
            got.map((j) => j.id),
            f.jobs.map((j) => j.id),
        );
        assert.deepEqual(paidSteps(got), ["2026-10-27T10:29:05Z"]);
    });

    it("retries a transient 5xx on the same page", async () => {
        const f = fakeRun({ total: 40, poison: -1, flaky: 2 });
        assert.equal((await runJobs(f.get, "o/r", 1)).length, 40);
        assert.equal(f.calls.filter((c) => c.includes("per_page=100&page=1")).length, 3);
    });

    it("gives up on a run whose jobs cannot be read at any page size", async () => {
        const f = fakeRun({ failSizes: 1 });
        await assert.rejects(runJobs(f.get, "o/r", 1), { status: 502 });
    });
});

describe("countPaid", () => {
    it("counts an unreadable run as one paid run and names it", async () => {
        const good = fakeRun({ poison: -1 });
        const bad = fakeRun({ failSizes: 1 });
        const get = (path) => (path.includes("/runs/2/") ? bad.get(path) : good.get(path));
        const r = await countPaid(
            get,
            "o/r",
            [
                { id: 1, updated_at: "2026-10-27T11:00:00Z" },
                { id: 2, updated_at: "2026-10-28T11:00:00Z" },
            ],
            STEP,
        );
        assert.deepEqual(r.paid.sort(), ["2026-10-27T10:29:05Z", "2026-10-28T11:00:00Z"]);
        assert.deepEqual(r.unread, [2]);
    });

    it("counts the points of an llm-lane bisect by their test step", async () => {
        // bisect.yml run 40492117633 (2026-10-27): one Point job, its paid step "Run the failing files".
        const point = {
            id: 122148555385,
            run_id: 40492117633,
            run_attempt: 1,
            name: "Point 2490aa3b4add9775f78f1d6631e243dad3689a81",
            steps: [
                { name: "Build every package", conclusion: "success", completed_at: "2026-10-27T11:20:00Z" },
                { name: BISECT_STEP, conclusion: "success", completed_at: "2026-10-27T11:31:00Z" },
                { name: "Record a point that could not build", conclusion: "skipped", completed_at: null },
            ],
        };
        const plan = { id: 1, run_id: 40492117633, run_attempt: 1, name: "Plan the round", steps: [] };
        const get = async () => ({ total_count: 2, jobs: [plan, point] });
        const r = await countPaid(get, "o/r", [{ id: 40492117633, updated_at: "2026-10-27T11:40:00Z" }], BISECT_STEP);
        assert.deepEqual(r, { paid: ["2026-10-27T11:31:00Z"], unread: [] });
    });
});

describe("httpStatus", () => {
    it("reads the status from gh's error line", () => {
        assert.equal(httpStatus("gh: Server Error (HTTP 502)"), 502);
        assert.ok(Number.isNaN(httpStatus("connection reset")));
    });
});
