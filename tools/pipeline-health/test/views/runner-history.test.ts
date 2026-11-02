// The runner history the idle-time screenshot dispatcher is tuned from (design/visual-testing/early-capture.md,
// plan step 1): running, queued, longest-queued and saturated time per 15-minute bucket, over 7 days.
import { describe, expect, it } from "vitest";

import { routeOf } from "../../src/handlers/read.js";
import { DAY, floorTo, type RawItem } from "../../src/model/items.js";
import { putRaw } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { Reads } from "../../src/views/members.js";
import { jobs } from "../../src/views/sections.js";
import type { JobsSection } from "../../web/src/contract.js";
import { MIN, obs, T0 } from "../model/helpers.js";

const Q = 15 * MIN;

describe("runner history", () => {
    it("gives 7 days of 15-minute buckets: last and peak running and queued, longest queued, saturated time", async () => {
        const items: RawItem[] = [];
        for (let t = T0 - 7 * DAY + 5 * MIN; t <= T0; t += 5 * MIN) {
            // A burst 3 hours ago: one 5-minute cycle with 40 queued and the pool saturated, then quiet again.
            const burst = t === T0 - 3 * 60 * MIN;
            items.push(
                obs("ci.jobs_running", burst ? 60 : 8, t),
                obs("ci.jobs_queued", burst ? 40 : 0, t),
                obs("ci.longest_queued_ms", burst ? 7 * MIN : 0, t),
                obs("ci.saturated_ms", burst ? 5 * MIN : 0, t),
            );
        }
        const store = new MemoryStore();
        await putRaw(store, items, T0);
        // A week of marks drains over several collector cycles (MAX_MARKS a cycle).
        let left = 1;
        while (left > 0) {
            ({ buckets: left } = await recompute(store, T0));
        }
        const s = (await jobs(new Reads(store, T0, await evaluate(store, T0), SLAS), "7d")) as JobsSection;
        expect(s.kind).toBe("jobs");
        expect(s.step).toBe("15m");
        expect(s.running.length).toBeGreaterThanOrEqual(7 * 96 - 1);
        const n = s.running.length;
        for (const k of ["runningMax", "queuedMax", "longestQueuedMs", "saturatedMs"] as const) {
            expect(s[k], k).toHaveLength(n);
        }
        const i = (floorTo(T0 - 3 * 60 * MIN, "15m") - Date.parse(s.start)) / Q;
        expect(s.queuedMax![i]).toBe(40);
        expect(s.runningMax![i]).toBe(60);
        expect(s.longestQueuedMs![i]).toBe(7 * MIN);
        expect(s.saturatedMs![i]).toBe(5 * MIN);
        // The burst ended inside its bucket: the end-of-bucket stock says 0 queued, the peak keeps the 40.
        expect(s.queued[i]).toBe(0);
        expect(s.queuedMax![i - 1]).toBe(0);
        expect(s.saturatedMs![i + 1]).toBe(0);
    });

    it("leaves a bucket the collector never wrote null, not zero", async () => {
        const store = new MemoryStore();
        await putRaw(store, [obs("ci.jobs_running", 3, T0 - 2 * DAY), obs("ci.jobs_running", 4, T0 - MIN)], T0);
        await recompute(store, T0);
        const s = (await jobs(new Reads(store, T0, await evaluate(store, T0), SLAS), "7d")) as JobsSection;
        // The newest bucket (12:00) is the current one, still empty; 11:45 holds the 11:59 sample.
        expect(s.runningMax!.at(-1)).toBeNull();
        expect(s.runningMax!.at(-2)).toBe(4);
        expect(s.queuedMax!.at(-2)).toBeNull();
        expect(s.running.at(-1)).toBe(4);
    });

    it("answers /v1/page/runners/jobs at 7 d only", () => {
        expect(routeOf("/v1/page/runners/jobs", { range: "7d" })).toEqual({
            kind: "section",
            page: "runners",
            section: "jobs",
            range: "7d",
        });
        expect(routeOf("/v1/page/runners/jobs", {})).toMatchObject({ kind: "section", range: "7d" });
        expect(routeOf("/v1/page/runners/jobs", { range: "28d" })).toEqual({ status: 400, code: "bad_range" });
        // The other slow sections keep their routes.
        expect(routeOf("/v1/page/ci/shards", { range: "28d" })).toMatchObject({ section: "shards", runKind: "full" });
        expect(routeOf("/v1/page/ci/shards", { kind: "pr-bins" })).toMatchObject({ range: "7d", runKind: "pr-bins" });
        expect(routeOf("/v1/page/ci/shards", { kind: "x" })).toEqual({ status: 400, code: "bad_kind" });
        expect(routeOf("/v1/page/flaky/hotspots", { range: "28d" })).toEqual({
            kind: "section",
            page: "flaky",
            section: "hotspots",
            range: "28d",
        });
        expect(routeOf("/v1/page/flaky/hotspots", { range: "1h" })).toEqual({ status: 400, code: "bad_range" });
        expect(routeOf("/v1/page/runners/holders", {})).toEqual({ status: 404, code: "unknown_section" });
    });
});
