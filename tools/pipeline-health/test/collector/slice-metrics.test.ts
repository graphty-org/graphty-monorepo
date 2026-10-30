import { describe, expect, it } from "vitest";
import rates from "../../config/rates.json" with { type: "json" };
import sliceConfig from "../../config/slices.json" with { type: "json" };
import { collect } from "../../src/collector/collect.js";
import { GitHub } from "../../src/collector/github.js";
import type { GhJob, GhRun, Rates } from "../../src/collector/parse.js";
import {
    budgetShares,
    type Capture,
    contention,
    reviewLags,
    setAge,
    type StoryCaptures,
    UNIT_GONE_MS,
} from "../../src/collector/slice-metrics.js";
import type { SliceConfig } from "../../src/collector/slices.js";
import { DAY, HOUR, MIN } from "../../src/model/items.js";
import { getCursor, setCursor } from "../../src/model/raw.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { fakeGitHub, NOW } from "./fake-github.js";

const cfg = sliceConfig as SliceConfig;
const T = Date.parse("2026-10-29T08:00:00Z");

describe("the screenshot set's age (dashboard freshness)", () => {
    it("is the oldest unit's newest capture, leaving out units not rendered for 7 days and counting them", () => {
        const units = [{ at: T - 2 * HOUR }, { at: T - 5 * HOUR }, { at: T - UNIT_GONE_MS - MIN }];
        expect(setAge({ units }, T)).toEqual({ oldestAt: T - 5 * HOUR, dropped: 1 });
    });

    it("falls back to every unit when none was rendered in 7 days, and to the summary before units exist", () => {
        expect(setAge({ units: [{ at: T - 9 * DAY }, { at: T - 8 * DAY }] }, T)).toEqual({
            oldestAt: T - 9 * DAY,
            dropped: 2,
        });
        expect(setAge({ summary: { oldestNewestAt: 5 } }, T)).toEqual({ oldestAt: 5, dropped: 0 });
        expect(setAge({}, T)).toEqual({ oldestAt: null, dropped: 0 });
    });
});

describe("slice runner-minutes against each cap", () => {
    it("divides base and idle today, and idle over the last hour, by their caps", () => {
        const spent = [
            { run: 1, attempt: 1, mode: "base" as const, at: T - HOUR, minutes: 400 },
            { run: 2, attempt: 1, mode: "idle" as const, at: T - 10 * MIN, minutes: 60 },
            { run: 3, attempt: 1, mode: "idle" as const, at: T - 3 * HOUR, minutes: 80 },
        ];
        expect(budgetShares(spent, T, cfg)).toEqual({
            base: 400 / cfg.baseDailyMin,
            idle: 140 / cfg.idleDailyMin,
            idleHour: 60 / cfg.idleHourlyMin,
        });
    });
});

const run = (id: number, path: string): GhRun =>
    ({ id, path: `.github/workflows/${path}`, status: "in_progress", created_at: new Date(T).toISOString() }) as GhRun;
const job = (status: string, labels = ["ubuntu-latest"], ageMin = 10): GhJob =>
    ({ status, labels, created_at: new Date(T - ageMin * MIN).toISOString() }) as GhJob;

describe("what slices cost other work (design section 6)", () => {
    const slice = { run: run(1, "story-slices.yml"), jobs: [job("in_progress"), job("in_progress"), job("queued")] };
    const ci = { run: run(2, "ci.yml"), jobs: [job("in_progress"), job("queued"), job("queued", undefined, 3)] };
    const gpu = { run: run(3, "gpu.yml"), jobs: [job("queued", ["machine.dev"])] };

    it("counts slice runner-minutes held while other jobs waited for a runner, and their minutes queued in the cycle", () => {
        expect(contention([slice, ci, gpu], "story-slices.yml", false, 5, T)).toEqual({
            contendedMin: 10,
            queueWaitMin: 5 + 3,
        });
    });

    it("counts nothing for jobs not waiting for a runner: created under 2 minutes ago, concurrency or approval", () => {
        const notWaiting = {
            run: run(2, "ci.yml"),
            jobs: [job("queued", undefined, 1), job("pending"), job("waiting"), job("queued", ["macos-latest"])],
        };
        expect(contention([slice, notWaiting], "story-slices.yml", false, 5, T)).toEqual({
            contendedMin: 0,
            queueWaitMin: 0,
        });
    });

    it("counts held minutes while saturated even with nothing else queued, and nothing with no slice running", () => {
        const quiet = { ...ci, jobs: [job("in_progress")] };
        expect(contention([slice, quiet], "story-slices.yml", true, 5, T)).toEqual({
            contendedMin: 10,
            queueWaitMin: 0,
        });
        expect(contention([ci], "story-slices.yml", true, 5, T)).toEqual({ contendedMin: 0, queueWaitMin: 0 });
        expect(contention([slice, quiet], "story-slices.yml", false, 5, T)).toEqual({
            contendedMin: 0,
            queueWaitMin: 0,
        });
    });
});

const cap = (story: string, status: string, tree: string, at: number): Capture => ({
    project: "p",
    story,
    mode: "",
    status,
    baselinesTree: tree,
    at,
});

describe("review lag: first rolling capture of a changed picture to its approval merging", () => {
    it("starts at the first changed capture and ends at the approval merge before the capture under the new tree", () => {
        const first = reviewLags(undefined, [cap("a", "changed", "B", T)], [], T);
        expect(first.lags).toEqual([]);
        // A newer render of the same changed picture keeps the first capture's time.
        const again = reviewLags(first.state, [cap("a", "changed", "B", T + HOUR)], [], T + HOUR);
        expect(again.state.pending).toEqual(first.state.pending);
        const merged = T + 3 * HOUR;
        const done = reviewLags(again.state, [cap("a", "unchanged", "B2", T + 4 * HOUR)], [merged], T + 4 * HOUR);
        expect(done.lags).toEqual([3 * HOUR]);
        expect(done.state.pending).toEqual({});
    });

    it("takes the newest approval merge before the capture: an earlier one may have rejected the picture", () => {
        const s = reviewLags(undefined, [cap("a", "changed", "B", T)], [], T).state;
        const merges = [T + HOUR, T + 3 * HOUR, T + 5 * HOUR];
        const out = reviewLags(s, [cap("a", "unchanged", "B2", T + 4 * HOUR)], merges, T + 4 * HOUR);
        expect(out.lags).toEqual([3 * HOUR]);
    });

    it("ends at the capture when no approval merge is known, and counts nothing when the tree never changed", () => {
        const s = reviewLags(undefined, [cap("a", "new", "B", T), cap("b", "changed", "B", T)], [], T).state;
        const out = reviewLags(
            s,
            [cap("a", "unchanged", "B2", T + 2 * HOUR), cap("b", "unchanged", "B", T + 2 * HOUR)],
            [],
            T + 2 * HOUR,
        );
        expect(out.lags).toEqual([2 * HOUR]);
        expect(out.state.pending).toEqual({});
    });

    it("forgets a story that left the store and approval merges older than 8 days", () => {
        const s = reviewLags(undefined, [cap("a", "changed", "B", T)], [T - 9 * DAY, T - HOUR], T).state;
        expect(s.approvals).toEqual([T - HOUR]);
        expect(reviewLags(s, [], [], T).state.pending).toEqual({});
    });
});

/** One collector cycle at NOW that sees a screenshot approval pull request merged 2 hours earlier. */
async function cycleWithApproval(store: MemoryStore, readStore: () => Promise<StoryCaptures>) {
    const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
    const base = fake.fetch;
    fake.fetch = async (url, init) => {
        const res = await base(url, init);
        const body = init?.body ? String(init.body) : "";
        if (!url.endsWith("/graphql") || !body.includes("pullRequests")) return res;
        const data = (await res.json()) as {
            data: { repository: { recent: { nodes: Record<string, unknown>[] } } };
        };
        const recent = data.data.repository.recent.nodes;
        recent.unshift({
            ...recent[0],
            number: 9001,
            state: "MERGED",
            headRefName: "visual/approve-rolling-abcdef012345",
            updatedAt: new Date(NOW - MIN).toISOString(),
            mergedAt: new Date(NOW - 2 * HOUR).toISOString(),
        });
        return Response.json(data);
    };
    return collect({
        store,
        now: NOW,
        gh: new GitHub(async () => "ghs_test", fake.fetch),
        fetch: fake.fetch,
        awsCosts: async () => [],
        rates: rates as unknown as Rates,
        limits: { linux_windows: SLAS.runnerLimits.linux_windows, macos: SLAS.runnerLimits.macos },
        org: "graphty-org",
        repo: "graphty-org/graphty-monorepo",
        slices: { cfg, readStore },
    });
}

describe("the collector cycle's dashboard observations", () => {
    it("keeps an approval merge seen in a cycle that does not read the store, for the next read's review lag", async () => {
        const store = new MemoryStore();
        await setCursor(store, "capture-read", String(NOW - 5 * MIN), NOW - 5 * MIN);
        let reads = 0;
        await cycleWithApproval(store, async () => {
            reads++;
            return {};
        });
        expect(reads).toBe(0);
        expect(JSON.parse((await getCursor(store, "review-lag")) ?? "{}").approvals).toEqual([NOW - 2 * HOUR]);
    });

    it("writes the set's age, cap shares, slice costs and review lags, and marks story-slices", async () => {
        const store = new MemoryStore();
        const tree = "b".repeat(40);
        await setCursor(
            store,
            "review-lag",
            JSON.stringify({ pending: { "p/s/": { since: NOW - 5 * HOUR, tree } }, approvals: [] }),
            NOW - 5 * MIN,
        );
        await setCursor(
            store,
            "channels",
            JSON.stringify({ canary: [], promotions: {}, refs: { nightly: "c".repeat(40) } }),
            NOW - 5 * MIN,
        );
        const report = await cycleWithApproval(store, async () => ({
            units: [{ at: NOW - 4 * HOUR }, { at: NOW - 30 * MIN }],
            captures: [cap("s", "unchanged", "d".repeat(40), NOW - 10 * MIN)],
        }));
        expect(report.errors).toEqual({});
        // One entry per observation (the store keeps an index copy beside each item).
        const byId = new Map([...store.items.values()].filter((i) => i.kind === "obs").map((i) => [String(i.id), i]));
        const obs = new Map<string, number[]>();
        for (const i of byId.values())
            obs.set(String(i.metric), [...(obs.get(String(i.metric)) ?? []), Number(i.value)]);
        expect(obs.get("slices.set_age_ms")).toEqual([4 * HOUR]);
        expect(obs.get("slices.units_dropped")).toEqual([0]);
        expect(obs.get("release.review_lag_ms")).toEqual([3 * HOUR]);
        // a channel/nightly move is no observation: promotions are counted from the stored release.yml jobs (#5125)
        expect(obs.get("release.nightly_promotions")).toBeUndefined();
        expect(obs.get("slices.base_cap_share")).toEqual([0]);
        expect(obs.get("slices.idle_cap_share")).toEqual([0]);
        expect(obs.get("slices.idle_hour_cap_share")).toEqual([0]);
        expect(obs.get("slices.contended_min")).toEqual([0]);
        expect(obs.get("slices.queue_wait_min")).toEqual([0]);
        expect(JSON.parse((await getCursor(store, "review-lag")) ?? "{}").pending).toEqual({});
        expect([...store.items.keys()].some((k) => k.includes("story-slices"))).toBe(true);
    });
});
