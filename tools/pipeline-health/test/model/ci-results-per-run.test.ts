import { describe, expect, it } from "vitest";

import type { RawItem, ShardRunItem } from "../../src/model/items.js";
import { type Contribution, METRICS } from "../../src/model/metrics.js";
import { job, MIN, run, T0 } from "./helpers.js";

/** source.ci_results_per_run over some items: rows per unit of activity, as a bucket's sum / n. */
function perRun(items: RawItem[]): number {
    const def = METRICS.find((m) => m.id === "source.ci_results_per_run")!;
    let n = 0;
    let sum = 0;
    for (const item of items) {
        for (const s of def.from.filter((f) => f.kind === item.kind)) {
            const out = [(s.fold as (i: RawItem) => Contribution | Contribution[] | null)(item) ?? []].flat();
            for (const c of out) {
                n += c.n ?? 1;
                sum += c.sum ?? 0;
            }
        }
    }
    return sum / n;
}

const shardRun = (id: string): ShardRunItem => ({
    kind: "shard_run",
    id,
    attempt: 1,
    source: "ci",
    variant: "layout|flags=off|selected",
    family: "layout",
    bin: true,
    full: false,
    sha: "abc",
    outcome: "passed",
    startedAt: T0 - 20 * MIN,
    endedAt: T0 - 15 * MIN,
    secs: 300,
    files: [],
});

describe("source.ci_results_per_run", () => {
    it("reads 1 for an hour where every test job posted, however many master builds and tools-only runs land", () => {
        const items: RawItem[] = [
            // A pull request run with two test bins, each posting its row.
            run(1),
            job(11, { runId: 1, name: "Test (layout-1)", family: "layout" }),
            job(12, { runId: 1, name: "Test (layout-2)", family: "layout" }),
            job(13, { runId: 1, name: "Build" }),
            shardRun("1.1.test.layout-1"),
            shardRun("1.1.test.layout-2"),
            // Four master builds and a tools-only pull request: no test jobs, so no rows by design.
            ...[2, 3, 4, 5].map((id) => run(id, { event: "push", branch: "master" })),
            run(6),
            job(61, { runId: 6, name: "Build" }),
            // A full run (release.yml calling ci.yml) whose test shard posted its row.
            run(7, { workflow: "release.yml", event: "workflow_dispatch", branch: "master" }),
            job(71, { runId: 7, workflow: "release.yml", name: "CI / Test (graphty)", family: "graphty" }),
            shardRun("7.1.test.graphty"),
            // Its story-test capture posts a row too, but is no test job: neither side counts it.
            shardRun("7.1.story-tests.graphty"),
            // A test job that was skipped or cancelled posts nothing and is not expected to.
            job(14, { runId: 1, name: "Test (layout-3)", family: "layout", conclusion: "skipped" }),
            job(15, { runId: 1, name: "Test (layout-4)", family: "layout", conclusion: "cancelled" }),
        ];
        expect(perRun(items)).toBe(1);
    });

    it("drops when a test job's row is lost", () => {
        const items: RawItem[] = [
            job(11, { name: "Test (layout-1)", family: "layout" }),
            job(12, { name: "Test (layout-2)", family: "layout" }),
            shardRun("1.1.test.layout-1"),
        ];
        expect(perRun(items)).toBe(0.5);
    });
});
