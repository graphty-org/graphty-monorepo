import { describe, expect, it } from "vitest";

import { type CostItem, DAILY_ROW_LIMIT, DAY, floorTo, type RawItem } from "../../src/model/items.js";
import { putRaw, recordSource, takeQuota } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { type MemberConfig, type SlaConfig, SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { HOUR, job, MIN, obs, pr, run, T0 } from "../model/helpers.js";

const LIVE = ["collector", "ci-results", "release", "npm", "billing", "coverage"];

/** A store whose sources have written for hours and just now, holding `items`, recomputed. */
async function world(items: RawItem[], now = T0, fresh = LIVE) {
    const store = new MemoryStore();
    for (const s of fresh) {
        await recordSource(store, s, now - 3 * HOUR, { ok: true });
        await recordSource(store, s, now, { ok: true });
    }
    await putRaw(store, items, now);
    await recompute(store, now);
    return store;
}

const only = (...ids: string[]): SlaConfig => ({ ...SLAS, members: SLAS.members.filter((m) => ids.includes(m.id)) });
const member = async (store: MemoryStore, id: string, now = T0, cfg = only(id)) =>
    (await evaluate(store, now, cfg)).members.find((m) => m.id === id)!;

const hangs = (k: number, at = T0 - 20 * MIN) =>
    Array.from({ length: k }, (_, i) => job(100 + i, { hang: true, startedAt: at - MIN, completedAt: at }));

describe("config", () => {
    it("names every member of sections 4.1 to 4.7 once, with known sources and one headline per category", () => {
        const ids = SLAS.members.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const c of SLAS.categories) {
            expect(SLAS.members.filter((m) => m.category === c.id && m.headline)).toHaveLength(1);
        }
        for (const m of SLAS.members) {
            for (const s of m.sources) {
                expect(SLAS.sources[s], `${m.id} reads ${s}`).toBeDefined();
            }
        }
        // The noisy rates are the "1 h, 6 h agrees" members of the design's tables.
        expect(
            SLAS.members
                .filter((m) => m.window === "1h+6h")
                .map((m) => m.id)
                .sort(),
        ).toEqual(
            [
                "ci.bins_over_8",
                "ci.first_attempt",
                "ci.pr_check_duration",
                "ci.reruns",
                "data.sources_thin",
                "flaky.rate",
                "pr.merge_ratio",
                "pr.time_to_merge",
            ].sort(),
        );
    });
});

describe("thresholds", () => {
    it("hangs: none OK, one WARNING, two FAILING", async () => {
        expect((await member(await world([job(1)]), "ci.hangs")).state).toBe("OK");
        expect((await member(await world(hangs(1)), "ci.hangs")).state).toBe("WARNING");
        const red = await member(await world(hangs(2)), "ci.hangs");
        expect(red).toMatchObject({ state: "FAILING", value: 2, judged: true });
    });

    it("a state member reads the newest value, and an extra red condition turns it red", async () => {
        const at = T0 - 2 * MIN;
        expect((await member(await world([obs("master.red_span_ms", 0, at)]), "master.red_now")).state).toBe("OK");
        expect((await member(await world([obs("master.red_span_ms", 5 * MIN, at)]), "master.red_now")).state).toBe(
            "WARNING",
        );
        const two = await world([obs("master.red_span_ms", 5 * MIN, at), obs("master.red_builds", 2, at)]);
        expect((await member(two, "master.red_now")).state).toBe("FAILING");
        expect((await member(await world([obs("master.red_span_ms", 20 * MIN, at)]), "master.red_now")).state).toBe(
            "FAILING",
        );
    });

    it("green time is the share of the hour master was not red", async () => {
        const red = (ms: number) => [0, 1, 2, 3].map((i) => obs("master.red_ms", ms / 4, T0 - (5 + i * 5) * MIN));
        expect((await member(await world(red(4 * MIN)), "master.green_time")).state).toBe("OK");
        expect((await member(await world(red(10 * MIN)), "master.green_time")).state).toBe("WARNING");
        expect((await member(await world(red(20 * MIN)), "master.green_time")).state).toBe("FAILING");
    });

    it("a noisy rate is red only when its 6 h value agrees", async () => {
        const hour = Array.from({ length: 10 }, (_, i) => run(i, { conclusion: i < 5 ? "failure" : "success" }));
        const earlier = Array.from({ length: 40 }, (_, i) =>
            run(100 + i, { createdAt: T0 - 4 * HOUR, startedAt: T0 - 4 * HOUR, completedAt: T0 - 3 * HOUR }),
        );
        const both = await member(await world(hour), "ci.first_attempt");
        expect(both).toMatchObject({ state: "FAILING", value: 0.5, value6h: 0.5, n: 10 });
        const burst = await member(await world([...hour, ...earlier]), "ci.first_attempt");
        expect(burst).toMatchObject({ state: "WARNING", value: 0.5, value6h: 0.9, n6h: 50 });
    });

    it("a rate under its minimum n is gray, with its 6 h value", async () => {
        const merged = [1, 2].map((n) => pr(n, { readyAt: T0 - 40 * MIN, mergedAt: T0 - 10 * MIN }));
        const old = [3, 4, 5].map((n) =>
            pr(n, { createdAt: T0 - 5 * HOUR, readyAt: T0 - 5 * HOUR, mergedAt: T0 - 4 * HOUR }),
        );
        const m = await member(await world([...merged, ...old]), "pr.time_to_merge");
        expect(m).toMatchObject({
            state: "TOO FEW SAMPLES",
            judged: false,
            n: 2,
            reason: { code: "too_few", params: { n: 2, min: 5 } },
        });
        expect(m.value6h).toBeGreaterThan(30 * MIN);
    });

    it("projects the month's money lines from the days billed so far", async () => {
        const monthStart = Date.UTC(2026, 9, 1);
        const days = (floorTo(T0, "1d") - monthStart) / DAY; // 24 whole days before the 25th
        const lines: CostItem[] = Array.from({ length: days }, (_, d) => ({
            kind: "cost",
            id: `t4#${d}`,
            attempt: 1,
            line: "t4",
            day: monthStart + d * DAY,
            usd: 10,
        }));
        const store = await world(lines);
        const t4 = await member(store, "cost.t4");
        expect(t4.value).toBeCloseTo(310);
        expect(t4.state).toBe("FAILING");
        expect((await member(store, "cost.llm")).value).toBe(0);
    });
});

describe("data states", () => {
    it("a stale source makes its members NO DATA, and the category shows NO DATA", async () => {
        const store = new MemoryStore();
        await recordSource(store, "collector", T0 - 3 * HOUR, { ok: true });
        await recordSource(store, "collector", T0 - 30 * MIN, { ok: true });
        const e = await evaluate(store, T0, only("ci.hangs", "data.collector"));
        expect(e.members.find((m) => m.id === "ci.hangs")).toMatchObject({
            state: "NO DATA",
            judged: true,
            reason: { code: "stale", params: { source: "collector", since: T0 - 15 * MIN } },
        });
        expect(e.members.find((m) => m.id === "data.collector")).toMatchObject({ state: "FAILING", value: 30 * MIN });
        expect(e.categories.find((c) => c.id === "ci")).toMatchObject({ state: "NO DATA", setBy: "ci.hangs" });
    });

    it("a rejected token is NO DATA with its error", async () => {
        const store = await world([]);
        await recordSource(store, "npm", T0, { ok: false, error: "token rejected" });
        const m = await member(store, "release.tagged_not_on_npm");
        expect(m).toMatchObject({ state: "NO DATA", reason: { code: "error", params: { error: "token rejected" } } });
    });

    it("idle by design is IDLE, out of the rollup, while a broken source is NO DATA", async () => {
        const local: MemberConfig = {
            ...SLAS.members.find((m) => m.id === "ci.hangs")!,
            id: "local.hangs",
            sources: ["local"],
        };
        const cfg = { ...only("ci.hangs"), members: [local] };
        const e = await evaluate(await world([]), T0, cfg);
        expect(e.members[0]).toMatchObject({ state: "IDLE", judged: false, reason: { code: "idle" } });
        expect(e.categories.find((c) => c.id === "ci")?.state).toBe("IDLE");
        // The same member on a source that stopped writing is NO DATA (one that never wrote is not set up).
        const quiet = await world([], T0, []);
        await recordSource(quiet, "collector", T0 - 3 * HOUR, { ok: true });
        const stale = await evaluate(quiet, T0, only("ci.hangs"));
        expect(stale.members[0]).toMatchObject({ state: "NO DATA", reason: { code: "stale" } });
    });

    it("a source not set up keeps its members out of the status until it first writes", async () => {
        const e = await evaluate(
            await world([]),
            T0,
            only("cost.cloudflare_usage", "release.canary_age", "ci.superseded_running"),
        );
        for (const m of e.members) {
            expect(m).toMatchObject({ state: "NOT SET UP", judged: false });
        }
        expect(e.members.find((m) => m.id === "cost.cloudflare_usage")?.reason).toMatchObject({
            code: "not_set_up",
            params: { source: "cloudflare-token" },
        });
        const later = await world([obs("cost.cloudflare_usage_share", 0.95, T0 - MIN)], T0, [
            ...LIVE,
            "cloudflare-token",
        ]);
        expect((await member(later, "cost.cloudflare_usage")).state).toBe("FAILING");
    });

    it("a source younger than the hour is a partial window", async () => {
        const store = new MemoryStore();
        await recordSource(store, "collector", T0 - 24 * MIN, { ok: true });
        await recordSource(store, "collector", T0, { ok: true });
        expect(await member(store, "master.green_time")).toMatchObject({
            state: "PARTIAL WINDOW",
            reason: { code: "partial", params: { hours: 0.4, of: 1 } },
        });
    });

    it("judges the write budget and the sources past their limit", async () => {
        const store = await world([], T0, [...LIVE, "stress", "hosts"]);
        await takeQuota(store, 0.95 * DAILY_ROW_LIMIT, T0);
        expect(await member(store, "data.write_budget")).toMatchObject({ state: "FAILING", value: 0.95 });
        await recordSource(store, "hosts", T0 - 50 * HOUR, { ok: true }); // 30 h limit: past it, not yet 2x
        expect(await member(store, "data.sources_age")).toMatchObject({ state: "WARNING", value: 1 });
        await recordSource(store, "stress", T0 - 20 * DAY, { ok: true }); // 8 d limit: past 2x
        expect(await member(store, "data.sources_age")).toMatchObject({ state: "FAILING", value: 2 });
    });
});

describe("categories", () => {
    it("take their worst judged member; gray members never color them", async () => {
        const store = await world([...hangs(1), pr(1, { readyAt: T0 - 40 * MIN, mergedAt: T0 - MIN })]);
        const e = await evaluate(
            store,
            T0,
            only("ci.hangs", "ci.runner_wait", "ci.superseded_running", "pr.time_to_merge"),
        );
        expect(e.categories.find((c) => c.id === "ci")).toMatchObject({
            state: "WARNING",
            setBy: "ci.hangs",
            others: [],
        });
        expect(e.members.find((m) => m.id === "ci.runner_wait")?.state).toBe("TOO FEW SAMPLES");
        expect(e.categories.find((c) => c.id === "pull_requests")).toMatchObject({
            state: "IDLE",
            headline: "pr.time_to_merge",
        });
        expect(e.categories.find((c) => c.id === "master")?.state).toBe("IDLE");
    });

    it("of two members at the same state, the one furthest past its threshold sets it", async () => {
        const at = T0 - MIN;
        const store = await world([obs("pr.open", 40, at), obs("pr.oldest_open_ms", 4 * DAY, at)]);
        const e = await evaluate(store, T0, only("pr.open", "pr.oldest_open"));
        expect(e.categories.find((c) => c.id === "pull_requests")).toMatchObject({
            state: "FAILING",
            setBy: "pr.open",
            others: ["pr.oldest_open"],
        });
    });
});

describe("episodes", () => {
    it("open when a member passes its target, say cleared once the newest bucket recovers, and end with the hour", async () => {
        const store = await world(hangs(2, T0 - 48 * MIN));
        const now = await evaluate(store, T0, only("ci.hangs"));
        expect(now.members[0]).toMatchObject({ state: "FAILING", clearedAt: T0 - 45 * MIN });
        expect(now.episodes).toEqual([
            {
                member: "ci.hangs",
                category: "ci",
                worst: "FAILING",
                start: T0 - 50 * MIN,
                clearedAt: T0 - 45 * MIN,
                peak: 2,
            },
        ]);
        for (const s of ["collector"]) {
            await recordSource(store, s, T0 + 10 * MIN, { ok: true });
        }
        const later = await evaluate(store, T0 + 10 * MIN, only("ci.hangs"));
        expect(later.members[0].state).toBe("OK");
        expect(later.episodes).toEqual([
            {
                member: "ci.hangs",
                category: "ci",
                worst: "FAILING",
                start: T0 - 50 * MIN,
                clearedAt: T0 - 45 * MIN,
                endedAt: T0 + 10 * MIN, // the first step whose hour no longer holds the 5-minute bucket of the hangs
                peak: 2,
            },
        ]);
    });

    it("a state member's episode runs from its first bad step until it is OK again", async () => {
        const items = [
            obs("pr.open", 10, T0 - 3 * HOUR),
            obs("pr.open", 20, T0 - 2 * HOUR),
            obs("pr.open", 30, T0 - 90 * MIN),
            obs("pr.open", 10, T0 - 30 * MIN),
        ];
        const e = await evaluate(await world(items), T0, only("pr.open"));
        expect(e.episodes).toEqual([
            {
                member: "pr.open",
                category: "pull_requests",
                worst: "FAILING",
                start: T0 - 2 * HOUR,
                clearedAt: T0 - 30 * MIN,
                endedAt: T0 - 30 * MIN,
                peak: 30,
            },
        ]);
    });

    it("evaluates the whole configuration on an empty store without throwing", async () => {
        const e = await evaluate(new MemoryStore(), T0);
        expect(e.members).toHaveLength(SLAS.members.length);
        expect(e.categories).toHaveLength(7);
        expect(e.members.find((m) => m.id === "data.collector")).toMatchObject({
            state: "NO DATA",
            reason: { code: "no_value" },
        });
    });
});
