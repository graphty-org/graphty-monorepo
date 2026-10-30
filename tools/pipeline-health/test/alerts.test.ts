import { describe, expect, it } from "vitest";

import { duration, openMessage, REALERT_MS, resolvedMessage, SECRETS, sendAlerts } from "../src/alerts/index.js";
import { MemoryStore } from "../src/model/store.js";
import { type AlertConfig, type MemberConfig, type SlaConfig, SLAS } from "../src/sla/config.js";
import type { Episode, Evaluation, MemberStatus } from "../src/sla/engine.js";
import { DAY } from "../src/model/items.js";
import { HOUR, MIN, T0 } from "./model/helpers.js";

const member = (id: string, category: string, state: MemberStatus["state"] = "FAILING"): MemberStatus => ({
    id,
    category,
    label: `${id} label`,
    window: "now",
    state,
    judged: true,
    value: 3,
    fail: [">=", 2],
    sources: [],
    headline: true,
});

const evaluation = (m: MemberStatus | MemberStatus[], e: Partial<Episode> = {}): Evaluation => {
    const ms = Array.isArray(m) ? m : [m];
    return {
        at: T0,
        categories: [...new Set(ms.map((x) => x.category))].map((c) => ({
            id: c,
            label: `${c} cat`,
            state: "FAILING" as const,
            others: [],
        })),
        members: ms,
        episodes: ms.map((x) => ({
            member: x.id,
            category: x.category,
            worst: "FAILING" as const,
            start: T0 - 10 * MIN,
            peak: 4,
            ...e,
        })),
        sources: [],
    };
};

/** A test configuration: each id pages with these settings (at once, priority 1, a resolved after 0 min). */
function config(alerts: Record<string, Partial<AlertConfig>>): SlaConfig {
    const members = Object.entries(alerts).map(([id, a]): MemberConfig => ({
        id,
        category: "x",
        label: `${id} label`,
        window: "now",
        measure: { type: "last", metric: id },
        sources: [],
        alert: {
            afterMs: 0,
            priority: 1,
            title: "{value} wrong",
            text: "It is {value}, red at {limit}, for {for}.",
            action: "fix it",
            resolved: { title: "fine again", text: "It lasted {for}.", clearAfterMs: 0 },
            ...a,
        },
    }));
    return { ...SLAS, members };
}

const PAGES = config({ master_red: {} });

const keys = { [SECRETS.token]: "tok", [SECRETS.user]: "usr" };

function pushover(status = 200) {
    const calls: URLSearchParams[] = [];
    const fetch = (async (_url: string, init: { body: URLSearchParams }) => {
        calls.push(init.body);
        return new Response("{}", { status });
    }) as unknown as typeof globalThis.fetch;
    return { calls, fetch };
}

const run = (
    store: MemoryStore,
    ev: Evaluation,
    now: number,
    fetch: typeof globalThis.fetch,
    cfg: SlaConfig = PAGES,
    secrets = keys,
) => sendAlerts({ evaluation: ev, store, now, getSecret: async (n) => secrets[n], fetch, log: () => {}, config: cfg });

describe("sendAlerts", () => {
    it("pages a member with an alert, with its words, value, limit, duration, action and page", async () => {
        const p = pushover();
        const r = await run(new MemoryStore(), evaluation(member("master_red", "master")), T0, p.fetch);
        expect(r).toEqual({ state: "ok", sent: [{ member: "master_red", kind: "open" }], failed: 0 });
        const body = Object.fromEntries(p.calls[0]);
        expect(body).toMatchObject({ token: "tok", user: "usr", title: "3 wrong", priority: "1" });
        expect(body.message).toBe("It is 3, red at 2, for 10 min.\nWhat to do: fix it");
        expect(body.url).toBe("https://health.graphty.app/#/master");
        expect(body.url_title).toBe("Open the master cat page");
    });

    it("never pages a member without an alert, even FAILING for days", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const ev = evaluation(member("pr.time_to_merge", "pull_requests"));
        for (let t = T0; t < T0 + 2 * DAY; t += 6 * HOUR) {
            expect((await run(store, ev, t, p.fetch, SLAS)).sent).toEqual([]);
        }
        expect(p.calls).toHaveLength(0);
        expect(store.writes).toBe(0);
    });

    it("only the members the policy names page", () => {
        expect(
            SLAS.members
                .filter((m) => m.alert)
                .map((m) => m.id)
                .sort(),
        ).toEqual(
            [
                "ci.runners_not_assigned",
                "cost.aws",
                "cost.cloudflare_usage",
                "cost.llm",
                "cost.spend",
                "cost.t4",
                "data.collector",
                "data.sources_age",
                "master.red_now",
                "master.untested_age",
                "release.lanes_red",
            ].sort(),
        );
    });

    it("never pages a member whose source is not set up", async () => {
        const p = pushover();
        const m = { ...member("cost.cloudflare_usage", "costs", "NOT SET UP"), value: undefined };
        const r = await run(new MemoryStore(), evaluation(m), T0 + 30 * DAY, p.fetch, SLAS);
        expect(r.sent).toEqual([]);
    });

    it("waits until the member has been failing for its afterMs", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const cfg = config({ pr_wait: { afterMs: 30 * MIN } });
        const ev = evaluation(member("pr_wait", "pull_requests"));
        await run(store, ev, T0, p.fetch, cfg);
        await run(store, ev, T0 + 30 * MIN - MIN, p.fetch, cfg);
        expect(p.calls).toHaveLength(0);
        const r = await run(store, ev, T0 + 30 * MIN, p.fetch, cfg);
        expect(r.sent).toEqual([{ member: "pr_wait", kind: "open" }]);
        expect(Object.fromEntries(p.calls[0]).url).toBe("https://health.graphty.app/#/pull-requests");
    });

    it("restarts the wait when the member leaves FAILING", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const cfg = config({ ci_x: { afterMs: 30 * MIN } });
        const m = member("ci_x", "ci");
        await run(store, evaluation(m), T0, p.fetch, cfg);
        await run(store, evaluation({ ...m, state: "WARNING" }), T0 + 20 * MIN, p.fetch, cfg);
        await run(store, evaluation(m), T0 + 25 * MIN, p.fetch, cfg);
        await run(store, evaluation(m), T0 + 35 * MIN, p.fetch, cfg);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(m), T0 + 55 * MIN, p.fetch, cfg);
        expect(p.calls).toHaveLength(1);
    });

    it("sends once per episode across runs, and a quiet resolved when it clears", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const m = member("master_red", "master");
        await run(store, evaluation(m), T0, p.fetch);
        await run(store, evaluation(m), T0 + 5 * MIN, p.fetch);
        expect(p.calls).toHaveLength(1);
        const ended = evaluation({ ...m, state: "OK", value: 0 }, { endedAt: T0 + 10 * MIN });
        const r = await run(store, ended, T0 + 10 * MIN, p.fetch);
        await run(store, ended, T0 + 15 * MIN, p.fetch);
        expect(r.sent).toEqual([{ member: "master_red", kind: "clear" }]);
        expect(p.calls).toHaveLength(2);
        expect(Object.fromEntries(p.calls[1])).toMatchObject({
            title: "fine again",
            message: "It lasted 20 min.\nNothing to do.",
            priority: "-1",
        });
    });

    it("sends resolved only after the member has stayed OK for clearAfterMs, and a relapse sends neither", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const cfg = config({ m: { resolved: { title: "fine", text: "", clearAfterMs: 15 * MIN } } });
        const m = member("m", "master");
        const ok = (now: number) =>
            run(store, evaluation({ ...m, state: "OK", value: 0 }, { endedAt: now }), now, p.fetch, cfg);
        await run(store, evaluation(m), T0, p.fetch, cfg);
        await ok(T0 + 5 * MIN);
        await ok(T0 + 15 * MIN);
        await run(store, evaluation(m), T0 + 18 * MIN, p.fetch, cfg); // relapse: still the same episode
        await ok(T0 + 20 * MIN);
        await ok(T0 + 30 * MIN);
        expect(p.calls).toHaveLength(1);
        await ok(T0 + 35 * MIN);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["3 wrong", "fine"]);
    });

    it("sends no resolved for a member whose alert has none (costs, the screenshot reminder)", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const cfg = config({ c: { resolved: undefined } });
        const m = member("c", "costs");
        await run(store, evaluation(m), T0, p.fetch, cfg);
        await run(store, evaluation({ ...m, state: "OK" }, { endedAt: T0 + 5 * MIN }), T0 + 5 * MIN, p.fetch, cfg);
        expect(p.calls).toHaveLength(1);
    });

    it("alerts once across red, source error, red, source error, even as the episode's start moves (2026-10-27)", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const cfg = config({ "master.red_same_check": {} });
        const m = member("master.red_same_check", "master");
        const gray: MemberStatus = { ...m, state: "NO DATA", judged: true, value: undefined };
        for (let i = 0; i < 6; i++) {
            const now = T0 + i * 5 * MIN;
            // A member with no history the engine can read restarts its episode at every red step.
            const ev = i % 2 === 0 ? evaluation(m, { start: now }) : { ...evaluation(gray), episodes: [] };
            await run(store, ev, now, p.fetch, cfg);
        }
        expect(p.calls).toHaveLength(1);
    });

    it("an episode ends only when the member is judged OK, and pages at most once per floor", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const m = member("master_red", "master");
        const ok = (now: number) =>
            run(store, evaluation({ ...m, state: "OK", value: 0 }, { endedAt: now }), now, p.fetch);
        await run(store, evaluation(m), T0, p.fetch);
        await ok(T0 + 10 * MIN);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["3 wrong", "fine again"]);
        // A new episode an hour later that ends inside the floor sends neither page nor resolved.
        await run(store, evaluation(m, { start: T0 + HOUR }), T0 + HOUR, p.fetch);
        await ok(T0 + HOUR + 10 * MIN);
        expect(p.calls).toHaveLength(2);
        // One that stays red waits for the floor, then pages once.
        await run(store, evaluation(m, { start: T0 + 2 * HOUR }), T0 + 2 * HOUR, p.fetch);
        await run(store, evaluation(m, { start: T0 + 2 * HOUR }), T0 + REALERT_MS - MIN, p.fetch);
        expect(p.calls).toHaveLength(2);
        await run(store, evaluation(m, { start: T0 + 2 * HOUR }), T0 + REALERT_MS, p.fetch);
        await run(store, evaluation(m, { start: T0 + 2 * HOUR }), T0 + REALERT_MS + 5 * MIN, p.fetch);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["3 wrong", "fine again", "3 wrong"]);
    });

    it("never clears an episode that never alerted", async () => {
        const p = pushover();
        const ended = evaluation(member("master_red", "master", "OK"), { endedAt: T0 });
        expect((await run(new MemoryStore(), ended, T0, p.fetch)).sent).toEqual([]);
        expect(p.calls).toHaveLength(0);
    });

    it("an overlapping run does not send while another holds the claim", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const ev = evaluation(member("master_red", "master"));
        await Promise.all([run(store, ev, T0, p.fetch), run(store, ev, T0, p.fetch)]);
        expect(p.calls).toHaveLength(1);
    });

    it("a failed send writes no mark and retries on the next run", async () => {
        const store = new MemoryStore();
        const ev = evaluation(member("master_red", "master"));
        const bad = pushover(500);
        expect(await run(store, ev, T0, bad.fetch)).toMatchObject({ state: "ok", sent: [], failed: 1 });
        const good = pushover();
        expect((await run(store, ev, T0 + 5 * MIN, good.fetch)).sent).toHaveLength(1);
        expect(good.calls).toHaveLength(1);
    });

    it("sends nothing and reports not set up without the Pushover keys", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const r = await run(store, evaluation(member("master_red", "master")), T0, p.fetch, PAGES, {});
        expect(r).toEqual({ state: "not set up", sent: [], failed: 0 });
        expect(p.calls).toHaveLength(0);
        expect(store.writes).toBe(0);
    });

    it("reports an error instead of throwing when the table fails", async () => {
        const store = new MemoryStore();
        store.get = async () => {
            throw new Error("dynamo down");
        };
        const r = await run(store, evaluation(member("master_red", "master")), T0, pushover().fetch);
        expect(r).toMatchObject({ state: "error", error: "dynamo down" });
    });
});

describe("the policy's conditions", () => {
    const cost = (id: string, value: number, mtd: number): MemberStatus => ({
        ...member(id, "costs"),
        value,
        ok: SLAS.members.find((m) => m.id === id)!.ok,
        fail: SLAS.members.find((m) => m.id === id)!.fail,
        facts: { month_to_date: mtd },
    });

    it("due cost members go out as one Costs message, after 6 h, never before day 7 unless already spent", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const early = Date.UTC(2026, 10, 3, 12);
        const ev = evaluation([cost("cost.t4", 232, 40), cost("cost.llm", 87.55, 12)]);
        await run(store, ev, early, p.fetch, SLAS);
        await run(store, ev, early + 7 * HOUR, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        const late = Date.UTC(2026, 10, 7, 12);
        await run(store, ev, late, p.fetch, SLAS);
        const r = await run(store, ev, late + 6 * HOUR, p.fetch, SLAS);
        expect(r.sent.map((s) => s.member).sort()).toEqual(["cost.llm", "cost.t4"]);
        expect(p.calls).toHaveLength(1);
        const body = Object.fromEntries(p.calls[0]);
        expect(body.title).toBe("Over budget: T4 GPU $232, LLM regression $87.55");
        expect(body.priority).toBe("0");
        expect(body.message).toContain(
            "T4 GPU test lane: $232 projected for this month (budget $180, red above $200), over budget for",
        );
        expect(body.message).toContain("What to do:\n- ");
        // Floor: a week.
        await run(
            store,
            evaluation([cost("cost.t4", 232, 40)], { start: late + 2 * DAY }),
            late + 3 * DAY,
            p.fetch,
            SLAS,
        );
        expect(p.calls).toHaveLength(1);
    });

    it("a projection early in the month pages when month-to-date spend is already past red", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const early = Date.UTC(2026, 10, 3, 12);
        const ev = evaluation(cost("cost.llm", 120, 80));
        await run(store, ev, early, p.fetch, SLAS);
        expect((await run(store, ev, early + 6 * HOUR, p.fetch, SLAS)).sent).toHaveLength(1);
    });

    it("AWS pages at its $8 yellow line, before the $10 Budget lockout", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const ev = evaluation({ ...cost("cost.aws", 8.4, 8.4), state: "WARNING" });
        await run(store, ev, T0, p.fetch, SLAS);
        expect((await run(store, ev, T0 + HOUR, p.fetch, SLAS)).sent).toHaveLength(1);
        expect(p.calls[0].get("title")).toBe("AWS hosting at $8.40 this month, lockout at $10");
    });

    it("master red pages after 3 h, and not while GitHub is not starting jobs", async () => {
        const red: MemberStatus = {
            ...member("master.red_now", "master"),
            value: 3 * HOUR + 15 * MIN,
            fail: [">=", 15 * MIN],
        };
        const outage = { ...member("ci.runners_not_assigned", "ci"), value: 30 * MIN };
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation([red, outage]), T0, p.fetch, SLAS);
        await run(store, evaluation([red, outage]), T0 + 3 * HOUR, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["GitHub not starting CI jobs for 30 min"]);
        await run(store, evaluation(red), T0 + 3 * HOUR + 5 * MIN, p.fetch, SLAS);
        expect((await run(store, evaluation(red), T0 + 6 * HOUR + 5 * MIN, p.fetch, SLAS)).sent).toEqual([
            { member: "master.red_now", kind: "open" },
        ]);
        expect(Object.fromEntries(p.calls[1])).toMatchObject({
            title: "Master broken for 3 h 15 min, no agent has fixed it",
            priority: "1",
        });
    });

    it("the screenshot reminder pages only with no red lane and the hold open a day", async () => {
        const lanes = (n: number, holdMs: number): MemberStatus => ({
            ...member("release.lanes_red", "releases"),
            value: n,
            facts: { "release.hold_open_ms": holdMs },
        });
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(lanes(2, 30 * HOUR)), T0, p.fetch, SLAS);
        await run(store, evaluation(lanes(0, 20 * HOUR)), T0 + 5 * MIN, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(lanes(0, 25 * HOUR)), T0 + 10 * MIN, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["Nightly waiting on your screenshot review"]);
        expect(p.calls[0].get("message")).toContain("held for 25 h");
    });

    it("data sources page only for a credential error an hour old, quoting it", async () => {
        const src = (facts?: Record<string, number>): MemberStatus => ({
            ...member("data.sources_age", "data_sources"),
            value: 1,
            ...(facts ? { facts } : {}),
            cause: { code: "error", params: { source: "billing", label: "Billing", error: "ExpiredToken" } },
        });
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(src()), T0, p.fetch, SLAS); // stale, no credential error
        await run(store, evaluation(src({ credential_error_ms: 30 * MIN })), T0 + 5 * MIN, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(src({ credential_error_ms: 65 * MIN })), T0 + 40 * MIN, p.fetch, SLAS);
        expect(p.calls[0].get("title")).toBe("Dashboard feed lost its credential: Billing");
        expect(p.calls[0].get("message")).toContain("failed for 1 h 5 min with a credential error: 'ExpiredToken'");
    });
});

describe("messages", () => {
    const realistic: Record<string, Partial<MemberStatus>> = {
        "master.red_now": { value: 3 * HOUR + 20 * MIN },
        "master.untested_age": { value: 25 * HOUR },
        "ci.runners_not_assigned": { value: 75 * MIN },
        "release.lanes_red": { value: 0, facts: { "release.hold_open_ms": 26 * HOUR } },
        "cost.spend": { value: 412.3, facts: { month_to_date: 280 } },
        "cost.t4": { value: 232.1, facts: { month_to_date: 150 } },
        "cost.llm": { value: 87.55, facts: { month_to_date: 70 } },
        "cost.aws": { value: 8.4, state: "WARNING" },
        "cost.cloudflare_usage": { value: 0.93 },
        "data.sources_age": {
            value: 1,
            facts: { credential_error_ms: 70 * MIN },
            cause: { code: "error", params: { source: "billing", label: "Billing", error: "ExpiredToken" } },
        },
        "data.collector": {
            value: 32 * MIN,
            cause: { code: "error", params: { source: "collector", error: "HTTP 401 Bad credentials" } },
        },
    };

    for (const c of SLAS.members.filter((x) => x.alert)) {
        it(`${c.id}: words, units, no raw milliseconds, and an action`, () => {
            const m: MemberStatus = {
                ...member(c.id, c.category),
                ...(c.ok ? { ok: c.ok } : {}),
                ...(c.fail ? { fail: c.fail } : {}),
                ...realistic[c.id],
            };
            const e: Episode = { member: c.id, category: c.category, worst: "FAILING", start: T0 - 4 * HOUR };
            const d = {
                key: { pk: "", sk: "" },
                e,
                m,
                c: c as Required<Pick<MemberConfig, "alert">> & MemberConfig,
                start: e.start,
            };
            const ev = evaluation(m);
            const open = openMessage({ evaluation: ev, now: T0 }, [d]);
            const done = resolvedMessage({ evaluation: ev, now: T0 }, { ...d, e: { ...e, peak: m.value } });
            for (const text of [open.title, open.message, done.title, done.message]) {
                expect(text).not.toMatch(/\{\w+(:[\w.]+)?\}/); // every placeholder filled
                expect(text).not.toMatch(/no value|FAILING|undefined|NaN/);
                // A number over 9999 is raw milliseconds unless it is money.
                expect(text.replace(/https?:\S+/g, "").replace(/\$[\d.]+/g, "")).not.toMatch(/\d{5,}/);
            }
            expect(open.message).toMatch(/\nWhat to do: \S/);
            expect(open.message).toMatch(/\d+ (min|h|d)\b|\$\d|\d+%/);
            expect(open.priority).toBe(c.alert!.priority === 1 ? "1" : "0");
            expect(done.priority).toBe("-1");
        });
    }

    it("writes durations as a person says them", () => {
        expect([20_000, 45 * MIN, 3 * HOUR + 6 * MIN, 25 * HOUR, 3 * DAY + 4 * HOUR].map(duration)).toEqual([
            "under 1 min",
            "45 min",
            "3 h 6 min",
            "25 h",
            "3 d 4 h",
        ]);
    });
});
