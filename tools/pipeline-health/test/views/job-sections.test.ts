import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { nonGatingJobs } from "../../src/collector/jobs.js";
import { withPoint } from "../../src/model/benchmarks.js";
import { HOUR, MIN, type JobItem, type ObservationItem } from "../../src/model/items.js";
import { putRaw, recordSource, setCursor } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import type { ChronicJob } from "../../src/model/snapshots.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { benchmarksTable, chronicTable, nonGatingTable } from "../../src/views/job-sections.js";
import { Reads } from "../../src/views/members.js";

const NOW = Date.parse("2026-10-27T03:00:00Z");
const REPO = "graphty-org/graphty-monorepo";
const CI_YML = readFileSync(new URL("../../../../.github/workflows/ci.yml", import.meta.url), "utf8");

const PERF: ChronicJob = {
    workflow: "release.yml",
    job: "CI / Performance Benchmarks",
    runs: 10,
    failed: 8,
    lastPassAt: Date.parse("2026-10-26T21:13:32Z"),
    failingSince: Date.parse("2026-10-27T01:08:46Z"),
};

const job = (i: number, name: string, conclusion: string, over: Partial<JobItem> = {}): JobItem => ({
    kind: "job",
    id: `${REPO}/${i}`,
    attempt: 1,
    repo: REPO,
    runId: 40_000_000_000 + i,
    workflow: "release.yml",
    name,
    pool: "linux_windows",
    load: "full",
    status: "completed",
    conclusion,
    createdAt: NOW - (i + 2) * HOUR,
    startedAt: NOW - (i + 2) * HOUR + MIN,
    completedAt: NOW - (i + 1) * HOUR,
    ...over,
});

const obs = (metric: string, value: number): ObservationItem => ({
    kind: "obs",
    id: `${metric}#${NOW - MIN}`,
    attempt: 1,
    metric,
    value,
    at: NOW - MIN,
});

async function reads(store: MemoryStore) {
    await recompute(store, NOW);
    return new Reads(store, NOW, await evaluate(store, NOW), SLAS);
}

describe("chronically failing jobs", () => {
    it("lists each job with its failures, last pass and issue, and marks one with no open issue", async () => {
        const store = new MemoryStore();
        expect((await chronicTable(await reads(store))).kind).toBe("empty");
        await setCursor(store, "chronic-jobs", JSON.stringify([PERF, { ...PERF, job: "CI / Docs", issue: 3413 }]), NOW);
        const s = await chronicTable(await reads(store));
        expect(s.kind === "table" && s.rows.map((r) => [r.cells.failed, r.cells.rate, r.cells.issue])).toEqual([
            [
                { t: "num", n: 8, of: 10 },
                { t: "num", n: 80, unit: "pct" },
                { t: "mark", state: "bad", cell: { t: "fact", fact: { code: "ci.no_issue" } } },
            ],
            [
                { t: "num", n: 8, of: 10 },
                { t: "num", n: 80, unit: "pct" },
                { t: "issue", n: 3413 },
            ],
        ]);
    });

    it("is red with a chronic job no open issue names, yellow when every one has an issue", async () => {
        const state = async (chronic: number, unfiled: number) => {
            const store = new MemoryStore();
            await recordSource(store, "collector", NOW - MIN, { ok: true });
            await putRaw(store, [obs("ci.chronic_jobs", chronic), obs("ci.chronic_no_issue", unfiled)], NOW);
            await recompute(store, NOW);
            return (await evaluate(store, NOW)).members.find((m) => m.id === "ci.chronic_jobs")?.state;
        };
        expect(await state(1, 1)).toBe("FAILING");
        expect(await state(1, 0)).toBe("WARNING");
        expect(await state(0, 0)).toBe("OK");
    });
});

describe("allowed to fail, and failing", () => {
    it("gives each continue-on-error job of ci.yml its 7-day pass rate over every run kind", async () => {
        const store = new MemoryStore();
        const items = [
            // Performance Benchmarks in full runs: 3 of 4 failed
            ...["failure", "failure", "success", "failure"].map((c, i) => job(i, "CI / Performance Benchmarks", c)),
            // a story-test matrix job, in a pull request run and a full run (gating in ci.yml since #4613)
            job(10, "Story tests (graphty-element)", "success", { workflow: "ci.yml", load: "pr" }),
            job(11, "CI / Story tests (graphty)", "failure"),
            job(12, "CI / Story tests (graphty)", "cancelled"),
            // gating jobs are not listed here
            job(13, "CI / Build", "failure"),
        ];
        await putRaw(store, items, NOW);
        await setCursor(store, "non-gating", JSON.stringify(nonGatingJobs(CI_YML)), NOW);
        const s = await nonGatingTable(await reads(store));
        if (s.kind !== "table") throw new Error(s.kind);
        const row = (job: string) => s.rows.find((r) => r.cells.job.t === "name" && r.cells.job.v === job)?.cells;
        expect(row("Performance Benchmarks")).toEqual({
            job: { t: "name", v: "Performance Benchmarks" },
            runs: { t: "num", n: 4 },
            failed: { t: "num", n: 3 },
            rate: { t: "mark", state: "bad", cell: { t: "num", n: 25, unit: "pct" } },
        });
        // a gating job (Story tests is, since #4613) gets no row, however often it failed
        expect(row("Story tests (${{ matrix.name || matrix.project }})")).toBeUndefined();
        expect(row("Build")).toBeUndefined();
        expect(s.rows[0].cells.job).toEqual({ t: "name", v: "Performance Benchmarks" });
    });

    it("folds a continue-on-error matrix job's runs into one row", async () => {
        const store = new MemoryStore();
        const yaml = [
            "jobs:",
            "    story-tests:",
            "        name: Story tests (${{ matrix.project }})",
            "        continue-on-error: true",
            "",
        ].join("\n");
        await putRaw(
            store,
            [
                job(10, "Story tests (graphty-element)", "success", { workflow: "ci.yml", load: "pr" }),
                job(11, "CI / Story tests (graphty)", "failure"),
                job(12, "CI / Story tests (graphty)", "cancelled"),
            ],
            NOW,
        );
        await setCursor(store, "non-gating", JSON.stringify(nonGatingJobs(yaml)), NOW);
        const s = await nonGatingTable(await reads(store));
        if (s.kind !== "table") throw new Error(s.kind);
        expect(s.rows.map((r) => [r.cells.job, r.cells.failed])).toEqual([
            [
                { t: "name", v: "Story tests (${{ matrix.project }})" },
                { t: "num", n: 1 },
            ],
        ]);
    });
});

describe("benchmarks", () => {
    it("lists each benchmark's trend, a sustained regression first and marked", async () => {
        const store = new MemoryStore();
        const post = async (benchmark: string, vs: number[]) => {
            let item;
            for (const [i, v] of vs.entries()) item = withPoint(item, benchmark, "ms", { at: i, v, run: i }, NOW);
            await store.put(item!);
        };
        await post("algorithms: Dijkstra n=10000", [18, 18, 19, 18, 17, 18, 18, 19, 18, 18, 18, 19, 18]);
        await post("algorithms: PageRank n=10000", [41, 40, 42, 41, 43, 40, 41, 42, 41, 40, 52, 53, 51]);
        await post("webgpu-graph-algorithms: upload / residency", [14, 15]);
        const s = await benchmarksTable(await reads(store));
        if (s.kind !== "table") throw new Error(s.kind);
        expect(s.rows.map((r) => [r.cells.benchmark, r.cells.ratio])).toEqual([
            [
                { t: "name", v: "algorithms: PageRank n=10000" },
                { t: "mark", state: "bad", cell: { t: "num", n: 1.27, unit: "x" } },
            ],
            [
                { t: "name", v: "algorithms: Dijkstra n=10000" },
                { t: "num", n: 1, unit: "x" },
            ],
            [{ t: "name", v: "webgpu-graph-algorithms: upload / residency" }, { t: "none" }],
        ]);
    });
});
