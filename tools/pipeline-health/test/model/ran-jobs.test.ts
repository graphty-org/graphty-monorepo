import { describe, expect, it } from "vitest";

import type { RawItem } from "../../src/model/items.js";
import { type Contribution, METRICS } from "../../src/model/metrics.js";
import { job, MIN, T0 } from "./helpers.js";

/** Every contribution one metric folds out of one item. */
function fold(metric: string, item: RawItem): Contribution[] {
    const def = METRICS.find((m) => m.id === metric)!;
    return def.from
        .filter((f) => f.kind === item.kind)
        .flatMap((s) => [(s.fold as (i: RawItem) => Contribution | Contribution[] | null)(item) ?? []].flat());
}

// GitHub gives a job cancelled before any runner took it (runner_id 0, no steps) started_at == created_at, so a
// pull request push superseded while 170 of its jobs queued read as 12,000 runner-minutes it never spent (#5085).
describe("jobs that never got a runner", () => {
    const queuedThenCancelled = job(1, {
        load: "pr",
        os: "linux",
        conclusion: "cancelled",
        createdAt: T0 - 73 * MIN,
        startedAt: T0 - 73 * MIN,
        completedAt: T0,
    });

    it("spend no runner-minutes, no billed minutes and no runner wait", () => {
        expect(fold("ci.runner_minutes", queuedThenCancelled)).toEqual([]);
        expect(fold("ci.job_minutes", queuedThenCancelled)).toEqual([]);
        expect(fold("ci.runner_wait", queuedThenCancelled)).toEqual([]);
    });

    it("still count a job a runner ran, cancelled or not", () => {
        const ran = { ...queuedThenCancelled, startedAt: T0 - 70 * MIN };
        expect(fold("ci.runner_minutes", ran)).toEqual([{ n: 0, sum: 70, dim: "pr" }]);
        expect(fold("ci.job_minutes", ran)).toEqual([{ sum: 70, dim: JSON.stringify(["ci.yml", "linux"]) }]);
        expect(fold("ci.runner_wait", ran)).toEqual([{ value: 3 * MIN, dim: "graphty-org/graphty-monorepo" }]);
        const done = { ...queuedThenCancelled, conclusion: "success" };
        expect(fold("ci.runner_minutes", done)).toEqual([{ n: 0, sum: 73, dim: "pr" }]);
    });
});
