import { describe, expect, it } from "vitest";

import {
    causeWords,
    daytime,
    duration,
    human,
    openMessage,
    REALERT_MS,
    resolvedMessage,
    SECRETS,
    sendAlerts,
} from "../src/alerts/index.js";
import { MemoryStore } from "../src/model/store.js";
import { type AlertConfig, type MemberConfig, type SlaConfig, SLAS } from "../src/sla/config.js";
import type { Episode, Evaluation, MemberStatus } from "../src/sla/engine.js";
import { DAY } from "../src/model/items.js";
import { HOUR, MIN, T0 } from "./model/helpers.js";
/** 13:00 Pacific on T0's day, for the pages that wait for daytime. */
const DAY_T0 = T0 + 8 * HOUR;

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
        // T0 is 05:00 Pacific: a priority-1 page is held by the owner's quiet hours at night.
        expect(body).toMatchObject({ token: "tok", user: "usr", title: "3 wrong", priority: "0" });
        // The action leads, so the lock screen shows it; the details follow.
        expect(body.message).toBe("What to do: fix it\nIt is 3, red at 2, for 10 min.");
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
        const m = { ...member("cost.t4", "costs", "NOT SET UP"), value: undefined };
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
        const early = Date.UTC(2026, 10, 3, 20); // noon Pacific
        const ev = evaluation([cost("cost.t4", 232, 40), cost("cost.llm", 87.55, 12)]);
        await run(store, ev, early, p.fetch, SLAS);
        await run(store, ev, early + 7 * HOUR, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        const late = Date.UTC(2026, 10, 7, 20);
        await run(store, ev, late, p.fetch, SLAS);
        const r = await run(store, ev, late + 6 * HOUR, p.fetch, SLAS);
        expect(r.sent.map((s) => s.member).sort()).toEqual(["cost.llm", "cost.t4"]);
        expect(p.calls).toHaveLength(1);
        const body = Object.fromEntries(p.calls[0]);
        // The title names what is over and asks for the decision.
        expect(body.title).toBe("T4 GPU and LLM tests over Nov limits: pick new limits");
        expect(body.priority).toBe("0");
        // One limit per service: the red line that triggered the page, the one the Costs page draws red at.
        expect(body.message).toContain(
            "\nT4 GPU test lane: $232 forecast by Nov 30, limit $200, $40 spent so far. It runs on every release, so it cannot be cut.\n",
        );
        // One decision that names every suggested budget, not one decision per member. Early in the month it holds
        // from now on, and a cut starts today.
        expect(body.message).toContain(
            "What to do: Choose the limits from now on: raise T4 GPU to $240, LLM tests to $90 a month, or keep them and accept the overruns. Cutting LLM test runs from today to fit their $75 limit saves about $13, but T4 GPU stays over.",
        );
        expect(body.message.match(/What to do/g)).toHaveLength(1);
        expect(body.message).toMatch(/^What to do: /);
        // The shared closing step is said once, not once per member.
        expect(body.message.match(/tell any Claude session your choice/g)).toHaveLength(1);
        // The T4 lane runs in every full run (owner's rule): a page never offers running it less.
        expect(body.message).not.toMatch(/fewer full runs|over budget for/);
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

    it("a cost still over budget pages again a week later, and in the next month from day 7", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const ev = evaluation(cost("cost.t4", 232, 150), { start: Date.UTC(2026, 9, 1) });
        const sentAt: number[] = [];
        // Noon Pacific every day from Oct 20 to Nov 12, and 6 h later, with the forecast over budget throughout.
        for (let t = Date.UTC(2026, 9, 20, 19); t < Date.UTC(2026, 10, 12); t += DAY) {
            for (const at of [t, t + 6 * HOUR]) {
                if ((await run(store, ev, at, p.fetch, SLAS)).sent.length) sentAt.push(at);
            }
        }
        expect(sentAt.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
            "2026-10-21", // 6 h past 19:00 UTC on the 20th
            "2026-10-28",
            "2026-11-07", // Nov 1 to 6 (UTC) wait for day 7, as month-to-date is under red; then 6 h
        ]);
    });

    it("a cost page due at night waits for the morning", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const night = Date.UTC(2026, 10, 10, 8); // midnight Pacific
        const ev = evaluation(cost("cost.t4", 232, 150));
        await run(store, ev, night, p.fetch, SLAS);
        await run(store, ev, night + 7 * HOUR, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        expect((await run(store, ev, night + 9 * HOUR, p.fetch, SLAS)).sent).toHaveLength(1);
        expect([night, night + 9 * HOUR].map(daytime)).toEqual([false, true]);
    });

    it("a projection early in the month pages when month-to-date spend is already past red", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const early = Date.UTC(2026, 10, 3, 12);
        const ev = evaluation(cost("cost.llm", 120, 80));
        await run(store, ev, early, p.fetch, SLAS);
        expect((await run(store, ev, early + 6 * HOUR, p.fetch, SLAS)).sent).toHaveLength(1);
    });

    it("AWS pages once past its $8 yellow line, well before its $10 lockout, with the Costs page's forecast", async () => {
        const aws = (v: number, projected: number) =>
            evaluation({ ...cost("cost.aws", v, v), state: "WARNING", facts: { projected } });
        const sent = async (v: number, projected: number) => {
            const p = pushover();
            const store = new MemoryStore();
            const day = Date.UTC(2026, 9, 29, 20); // 13:00 Pacific
            await run(store, aws(v, projected), day, p.fetch, SLAS);
            await run(store, aws(v, projected), day + HOUR, p.fetch, SLAS);
            return p.calls.map((c) => c.get("title"));
        };
        expect(await sent(7.9, 9.5)).toEqual([]); // under the yellow line
        // Billing data lags a day: past $8 it pages, even with the forecast under $10.
        expect(await sent(8.4, 9.02)).toEqual([
            "Health alerts stop at $10 AWS spend (forecast $9.02): raise the limit?",
        ]);
        // The forecast is the engine's month-end projection (facts.projected), the one the Costs page shows.
        expect(await sent(8.4, 13.1)).toEqual(["Health alerts stop at $10 AWS spend (forecast $13): raise the limit?"]);
    });

    it("a cost group pages once per floor, naming every limit over, though members cross their lines apart", async () => {
        const sentFor = async (spendFrom: number) => {
            const p = pushover();
            const store = new MemoryStore();
            const start = Date.UTC(2026, 9, 14, 16); // 09:00 Pacific
            const sent: string[][] = [];
            for (let t = start; t < start + DAY; t += 5 * MIN) {
                const llm = { ...cost("cost.llm", 90, 40) };
                const ms = t >= spendFrom ? [llm, cost("cost.spend", 420, 180)] : [llm];
                const ev = evaluation(ms);
                ev.episodes = ev.episodes.map((e) => ({ ...e, start: e.member === "cost.llm" ? start : spendFrom }));
                const r = await run(store, ev, t, p.fetch, SLAS);
                if (r.sent.length) sent.push(r.sent.map((x) => x.member).sort());
            }
            return { sent, p };
        };
        // The total crosses an hour after the LLM tests: still red but short of its own 6 h when the LLM tests are
        // due, it goes out with them, in one message that offers the LLM cut against the total.
        const apart = await sentFor(Date.UTC(2026, 9, 14, 17));
        expect(apart.sent).toEqual([["cost.llm", "cost.spend"]]);
        expect(apart.p.calls[0].get("title")).toBe("Over budget for Oct: $420 of $360 (LLM tests). Pick new limits");
        expect(apart.p.calls[0].get("message")).toContain("Cutting LLM test runs from today");
        // The total crosses after the LLM page went out: the group's floor holds it, so no second decision.
        const after = await sentFor(Date.UTC(2026, 9, 14, 23));
        expect(after.sent).toEqual([["cost.llm"]]);
    });

    it("master red pages after 3 h, and not while GitHub is not starting jobs", async () => {
        const red: MemberStatus = {
            ...member("master.red_now", "master"),
            value: 3 * HOUR + 15 * MIN,
            fail: [">=", 15 * MIN],
        };
        const outage = {
            ...member("ci.runners_not_assigned", "ci"),
            value: 30 * MIN,
            facts: { "ci.jobs_running": 0, "ci.jobs_waiting_runner": 40 },
        };
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation([red, outage]), T0, p.fetch, SLAS);
        await run(store, evaluation([red, outage]), T0 + 3 * HOUR, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["GitHub not starting CI jobs: 0 running, 40 waiting"]);
        // GitHub recovers: while the runners page is open (until its resolved), master red still waits.
        const ok = { ...outage, state: "OK" as const, value: 0 };
        await run(store, evaluation([red, ok]), T0 + 3 * HOUR + 5 * MIN, p.fetch, SLAS);
        await run(store, evaluation([red, ok]), T0 + 3 * HOUR + 20 * MIN, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))[1]).toBe("GitHub is starting CI jobs again");
        await run(store, evaluation(red), T0 + 3 * HOUR + 25 * MIN, p.fetch, SLAS);
        expect((await run(store, evaluation(red), T0 + 6 * HOUR + 25 * MIN, p.fetch, SLAS)).sent).toEqual([
            { member: "master.red_now", kind: "open" },
        ]);
        expect(Object.fromEntries(p.calls[2])).toMatchObject({
            title: "Master broken for 3 h 15 min and no agent has fixed it",
            priority: "1",
        });
    });

    it("a CI slowdown (runners member FAILING, but GitHub still running jobs) does not hold back master red", async () => {
        const red: MemberStatus = {
            ...member("master.red_now", "master"),
            value: 3 * HOUR + 15 * MIN,
            fail: [">=", 15 * MIN],
        };
        const slow = {
            ...member("ci.runners_not_assigned", "ci"),
            value: 5 * HOUR,
            facts: { "ci.jobs_running": 40, "ci.jobs_waiting_runner": 600 },
        };
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation([red, slow]), T0, p.fetch, SLAS);
        await run(store, evaluation([red, slow]), T0 + 3 * HOUR, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["Master broken for 3 h 15 min and no agent has fixed it"]);
    });

    it("an outage where runs sit queued before GitHub creates their jobs still pages", async () => {
        // The runs with no jobs count as jobs waiting for a runner; the all-statuses job count stays 0.
        const outage = {
            ...member("ci.runners_not_assigned", "ci"),
            value: 75 * MIN,
            facts: { "ci.jobs_running": 0, "ci.jobs_waiting_runner": 12, "ci.jobs_queued": 0 },
        };
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(outage), T0, p.fetch, SLAS);
        await run(store, evaluation(outage), T0 + HOUR, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["GitHub not starting CI jobs: 0 running, 12 waiting"]);
    });

    it("GitHub running some jobs while many wait is a slowdown, not an outage: it never pages", async () => {
        const slow = {
            ...member("ci.runners_not_assigned", "ci"),
            value: 5 * HOUR,
            facts: { "ci.jobs_running": 40, "ci.jobs_waiting_runner": 600 },
        };
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(slow), T0, p.fetch, SLAS);
        await run(store, evaluation(slow), T0 + 2 * HOUR, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        // When GitHub stops starting jobs, the page says what was measured.
        const stuck = { ...slow, facts: { "ci.jobs_running": 2, "ci.jobs_waiting_runner": 600 } };
        await run(store, evaluation(stuck), T0 + 3 * HOUR, p.fetch, SLAS);
        await run(store, evaluation(stuck), T0 + 4 * HOUR, p.fetch, SLAS);
        expect(p.calls[0].get("message")).toContain(
            "2 CI jobs running and 600 waiting for a runner, some for 5 h. All CI and merging are stalled.",
        );
    });

    it("the screenshot reminder pages for a green-images nightly hold a day old, with its issue", async () => {
        const held = (waitMs: number, holdOpenMs = 0): MemberStatus => ({
            ...member("release.lanes_red", "releases"),
            value: 0,
            facts: {
                "release.review_wait_ms": waitMs,
                "release.review_issue": 4700,
                "release.hold_open_ms": holdOpenMs,
            },
        });
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(held(20 * HOUR)), DAY_T0, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(held(25 * HOUR)), DAY_T0 + 10 * MIN, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["Nightly waiting on your screenshot review"]);
        expect(p.calls[0].get("message")).toContain("waited 25 h for your review");
        expect(p.calls[0].get("url")).toBe("https://github.com/graphty-org/graphty-monorepo/issues/4700");
        // A reminder: the same hold still waiting a day later is sent again, and not before.
        await run(store, evaluation(held(40 * HOUR)), DAY_T0 + 7 * HOUR, p.fetch, SLAS); // 20:00 Pacific
        expect(p.calls).toHaveLength(1);
        await run(store, evaluation(held(49 * HOUR)), DAY_T0 + DAY + 10 * MIN, p.fetch, SLAS);
        expect(p.calls).toHaveLength(2);
        expect(p.calls[1].get("message")).toContain("waited 2 d 1 h for your review");
    });

    it("a publish hold or a red hold open a day never sends the screenshot reminder", async () => {
        const p = pushover();
        const m: MemberStatus = {
            ...member("release.lanes_red", "releases"),
            value: 2,
            facts: { "release.review_wait_ms": 0, "release.review_issue": 0, "release.hold_open_ms": 30 * HOUR },
        };
        const store = new MemoryStore();
        await run(store, evaluation(m), T0, p.fetch, SLAS);
        await run(store, evaluation({ ...m, value: 0 }), T0 + 2 * DAY, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
    });

    it("data sources page only for an owner's credential erroring an hour, quoting it", async () => {
        const src = (facts?: Record<string, number>, source = "cloudflare-token"): MemberStatus => ({
            ...member("data.sources_age", "data_sources"),
            value: 1,
            ...(facts ? { facts } : {}),
            cause: { code: "error", params: { source, label: "Cloudflare", error: "HTTP 403" } },
        });
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(src()), DAY_T0, p.fetch, SLAS); // stale, no credential error
        await run(store, evaluation(src({ credential_error_ms: 30 * MIN })), DAY_T0 + 5 * MIN, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(src({ credential_error_ms: 65 * MIN })), DAY_T0 + 40 * MIN, p.fetch, SLAS);
        expect(p.calls[0].get("title")).toBe("Cloudflare token rejected: make a new one");
        expect(p.calls[0].get("message")).toContain("read Cloudflare costs and usage for 1 h 5 min;");
        expect(p.calls[0].get("message")).toMatch(
            /^What to do: Make a new read-only Cloudflare token at https:\/\/dash\.cloudflare\.com\/profile\/api-tokens .*\n.*\nError: 'HTTP 403'\.$/,
        );
        // Fixed: the resolved names the feed, though the OK member no longer carries the cause.
        const ok = { ...src(), state: "OK" as const, value: 0, cause: undefined };
        await run(store, { ...evaluation(ok), episodes: [] }, DAY_T0 + 50 * MIN, p.fetch, SLAS);
        await run(store, { ...evaluation(ok), episodes: [] }, DAY_T0 + 65 * MIN, p.fetch, SLAS);
        expect(p.calls[1].get("title")).toBe("Cloudflare token works again");
    });

    it("a credential agents can fix (billing role, results store token) never pages", async () => {
        const p = pushover();
        const store = new MemoryStore();
        for (const source of ["billing", "story-slices"]) {
            const m: MemberStatus = {
                ...member("data.sources_age", "data_sources"),
                value: 1,
                facts: { credential_error_ms: 3 * HOUR },
                cause: { code: "error", params: { source, label: source, error: "ExpiredTokenException" } },
            };
            await run(store, evaluation(m), T0, p.fetch, SLAS);
            await run(store, evaluation(m), T0 + HOUR, p.fetch, SLAS);
        }
        expect(p.calls).toHaveLength(0);
    });

    it("a GitHub outage blinding the collector pages once, quietly, after 2 h", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const blind = (value: number): MemberStatus => ({
            ...member("data.collector", "data_sources"),
            value,
            cause: { code: "error", params: { source: "collector", error: "GitHub graphql: HTTP 502" } },
        });
        await run(store, evaluation(blind(30 * MIN)), T0, p.fetch, SLAS);
        await run(store, evaluation(blind(90 * MIN)), T0 + HOUR, p.fetch, SLAS);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(blind(150 * MIN)), T0 + 2 * HOUR, p.fetch, SLAS);
        expect(p.calls.map((c) => [c.get("title"), c.get("priority")])).toEqual([
            ["Health dashboard down (GitHub API down) for 2 h 30 min", "0"],
        ]);
    });

    it("a missing fact is a gap: it neither ends the episode nor sends a false resolved", async () => {
        const cfg = config({ stuck: { facts: { since: [">", 7 * HOUR] } } });
        const stuck = (facts: Record<string, number>): MemberStatus => ({ ...member("stuck", "x"), facts });
        const p = pushover();
        const store = new MemoryStore();
        await run(store, evaluation(stuck({ since: 9 * HOUR })), DAY_T0, p.fetch, cfg);
        expect(p.calls).toHaveLength(1);
        // The collector part that measures the fact fails for two hours: no fact, still red.
        for (const t of [2, 2.5, 3]) await run(store, evaluation(stuck({})), DAY_T0 + t * HOUR, p.fetch, cfg);
        expect(p.calls).toHaveLength(1);
        expect((await store.get({ pk: "ALERT#stuck", sk: "episode" }))?.endedAt).toBe(0);
    });

    it("a GitHub outage pages once: the collector blinded by it stays quiet while the runners page is open", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const outage = {
            ...member("ci.runners_not_assigned", "ci"),
            value: 75 * MIN,
            facts: { "ci.jobs_running": 0, "ci.jobs_waiting_runner": 40 },
        };
        await run(store, evaluation(outage), DAY_T0, p.fetch, SLAS);
        await run(store, evaluation(outage), DAY_T0 + HOUR, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual(["GitHub not starting CI jobs: 0 running, 40 waiting"]);
        // GitHub's API then fails too: the runners member has no data (a gap), the collector is blind for hours.
        const blind = (value: number): MemberStatus => ({
            ...member("data.collector", "data_sources"),
            value,
            cause: { code: "error", params: { source: "collector", error: "GitHub graphql: HTTP 502" } },
        });
        const gap = { ...outage, state: "NO DATA" as const, value: undefined, facts: undefined };
        for (const h of [2, 3, 4, 5]) {
            await run(store, evaluation([gap, blind(h * HOUR)]), DAY_T0 + h * HOUR, p.fetch, SLAS);
        }
        expect(p.calls).toHaveLength(1);
    });

    it("master's resolved says how long it was broken, to the fix, not the value when it paged", async () => {
        const red = (value: number, state: MemberStatus["state"] = "FAILING"): MemberStatus => ({
            ...member("master.red_now", "master", state),
            value,
            ok: ["<=", 0],
        });
        const p = pushover();
        const store = new MemoryStore();
        const ev = (m: MemberStatus) => evaluation(m, { start: DAY_T0 });
        await run(store, ev(red(5 * MIN)), DAY_T0 + 5 * MIN, p.fetch, SLAS);
        await run(store, ev(red(3 * HOUR + 20 * MIN)), DAY_T0 + 3 * HOUR + 20 * MIN, p.fetch, SLAS);
        expect(p.calls).toHaveLength(1);
        const ok = { ...evaluation(red(0, "OK")), episodes: [] };
        await run(store, ok, DAY_T0 + 3 * HOUR + 45 * MIN, p.fetch, SLAS);
        await run(store, ok, DAY_T0 + 4 * HOUR, p.fetch, SLAS);
        expect(p.calls[1].get("message")).toBe("Master was broken for about 3 h 45 min.\nNothing to do.");
    });

    it("every page fits Pushover's limits with every step kept, even all costs at once or a huge error", () => {
        const at = Date.UTC(2026, 9, 30, 19);
        const due = (id: string, m: Partial<MemberStatus>) => {
            const c = SLAS.members.find((x) => x.id === id)! as Required<Pick<MemberConfig, "alert">> & MemberConfig;
            const e: Episode = { member: id, category: c.category, worst: "FAILING", start: at - 7 * HOUR };
            const s: MemberStatus = { ...member(id, c.category), ok: c.ok, fail: c.fail, ...m };
            return { key: { pk: "", sk: "" }, e, m: s, c, start: e.start };
        };
        const ctx = { evaluation: evaluation([]), now: at };
        const costs = openMessage(ctx, [
            due("cost.spend", { value: 412.3, facts: { month_to_date: 385 } }),
            due("cost.t4", { value: 232.1, facts: { month_to_date: 221 } }),
            due("cost.llm", { value: 87.55, facts: { month_to_date: 83 } }),
        ]);
        expect(costs.message.length).toBeLessThanOrEqual(1024);
        // The total already holds T4 and the LLM tests: the title names them, it does not add them up.
        expect(costs.title).toBe("Over budget for Oct: $412 of $360 (T4 GPU and LLM tests). Pick Nov limits");
        expect(costs.message).toContain(
            "\nAll paid services (T4 GPU and LLM tests included): $412 forecast by Oct 31, limit $360, $385 spent so far.\n",
        );
        // In the month's last week October is spent: the choice is November's budget.
        // Every option closes the gap it names: cutting the LLM tests is offered with what it leaves over.
        expect(costs.message).toContain(
            "What to do: Choose November's limits: raise Total to $420, T4 GPU to $240, LLM tests to $90 a month, or keep them and accept the overruns. Cutting LLM test runs from Nov 1 to fit their $75 limit saves about $13, but T4 GPU stays over and the total stays about $39 over. Nothing is cut unless you say so; tell any Claude session your choice.\n",
        );
        expect(costs.message).toMatch(/^What to do: /);
        const blind = openMessage(ctx, [
            due("data.collector", {
                value: 32 * MIN,
                cause: { code: "error", params: { source: "collector", error: `TypeError: ${"x".repeat(2000)}` } },
            }),
        ]);
        expect(blind.message.length).toBeLessThanOrEqual(1024);
        expect(blind.message).toMatch(
            /^What to do: Ask any Claude session [^\n]+\n[^\n]+\nLast error: '[^\n]+\.\.\.'\.$/,
        );
    });

    it("the LLM cut is said to bring the total within budget only when the real amounts say so", () => {
        const at = Date.UTC(2026, 9, 14, 19);
        const due = (id: string, value: number) => {
            const c = SLAS.members.find((x) => x.id === id)! as Required<Pick<MemberConfig, "alert">> & MemberConfig;
            const e: Episode = { member: id, category: c.category, worst: "FAILING", start: at - 7 * HOUR };
            const m: MemberStatus = { ...member(id, c.category), ok: c.ok, fail: c.fail, value };
            return { key: { pk: "", sk: "" }, e, m, c, start: e.start };
        };
        // $5.40 over the total and $4.50 over the LLM tests: each rounds to $5, but the cut leaves $0.90 over.
        const msg = openMessage({ evaluation: evaluation([]), now: at }, [
            due("cost.spend", 365.4),
            due("cost.llm", 79.5),
        ]).message;
        expect(msg).not.toContain("within budget");
        expect(msg).toContain("saves about $4.50, but the total stays about $0.90 over.");
    });

    it("rounds money to cents before choosing its format", () => {
        expect([9.999, 0.004, 9.5, 8.4].map((v) => human("cost.llm", v))).toEqual(["$10", "$0", "$9.50", "$8.40"]);
    });

    it("a mark from before the current words counts as a new episode and pages once in them", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const key = { pk: "ALERT#master_red", sk: "episode" };
        await store.put({ ...key, start: T0 - DAY, endedAt: 0, open: 8.64e15, lastOpenAt: T0 - HOUR });
        const r = await run(store, evaluation(member("master_red", "master")), T0, p.fetch);
        expect(r.sent).toEqual([{ member: "master_red", kind: "open" }]);
        expect((await run(store, evaluation(member("master_red", "master")), T0 + 5 * MIN, p.fetch)).sent).toEqual([]);
    });

    it("the collector's resolved says how long it was blind, from the run that saw it longest", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const blind = (now: number, value: number): Evaluation => ({
            ...evaluation({ ...member("data.collector", "data_sources"), value, fail: [">", 20 * MIN] }),
            // A member the engine measures without history: its episode restarts at every red step, with no peak.
            episodes: [{ member: "data.collector", category: "data_sources", worst: "FAILING", start: now }],
        });
        for (let t = 0; t <= 100 * MIN; t += 10 * MIN) {
            await run(store, blind(T0 + t, 20 * MIN + t), T0 + t, p.fetch, SLAS);
        }
        const ok = { ...evaluation({ ...member("data.collector", "data_sources", "OK"), value: MIN }), episodes: [] };
        await run(store, ok, T0 + 110 * MIN, p.fetch, SLAS);
        await run(store, ok, T0 + 125 * MIN, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual([
            "Health dashboard down (bug in its code) for 30 min",
            "Health dashboard is working again",
        ]);
        // From the episode's start to the first run that saw it fixed (110 min), never less than the peak (2 h).
        expect(p.calls[1].get("message")).toBe("The health dashboard was down for about 2 h.\nNothing to do.");
    });

    it("the collector's resolved counts from its last good read, the engine's episode start, adding nothing", () => {
        const c = SLAS.members.find((x) => x.id === "data.collector")! as Required<Pick<MemberConfig, "alert">> &
            MemberConfig;
        // Blind from 40 min before the run that saw it fixed; the last bad run, 5 min earlier, saw 35 min.
        const e: Episode = {
            member: c.id,
            category: c.category,
            worst: "FAILING",
            start: DAY_T0 - 40 * MIN,
            peak: 35 * MIN,
        };
        const m: MemberStatus = { ...member(c.id, c.category, "OK"), value: MIN, ok: c.ok, fail: c.fail };
        const done = resolvedMessage(
            { evaluation: evaluation([]), now: DAY_T0 + 15 * MIN },
            { key: { pk: "", sk: "" }, e, m, c, start: e.start },
            DAY_T0,
        );
        expect(done.message).toBe("The health dashboard was down for about 40 min.\nNothing to do.");
    });

    it("a credential's resolved counts from when the credential failed, not from an older stale source", async () => {
        const src = (credMs: number): MemberStatus => ({
            ...member("data.sources_age", "data_sources"),
            value: 2,
            facts: { credential_error_ms: credMs },
            cause: { code: "error", params: { source: "cloudflare-token", label: "Cloudflare", error: "HTTP 403" } },
        });
        const p = pushover();
        const store = new MemoryStore();
        // The episode began 5 h ago with a stale billing feed; the token has failed for 65 min.
        for (const t of [0, 10, 20]) {
            await run(
                store,
                evaluation(src(65 * MIN + t * MIN), { start: DAY_T0 - 5 * HOUR }),
                DAY_T0 + t * MIN,
                p.fetch,
                SLAS,
            );
        }
        const ok = { ...evaluation({ ...src(0), state: "OK" as const, value: 0, cause: undefined }), episodes: [] };
        await run(store, ok, DAY_T0 + 30 * MIN, p.fetch, SLAS);
        await run(store, ok, DAY_T0 + 45 * MIN, p.fetch, SLAS);
        expect(p.calls.map((c) => c.get("title"))).toEqual([
            "Cloudflare token rejected: make a new one",
            "Cloudflare token works again",
        ]);
        // Failing from 65 min before the page until the first run that saw it fixed, 30 min after it.
        expect(p.calls[1].get("message")).toBe(
            "The dashboard reads Cloudflare costs and usage again, after about 1 h 35 min.\nNothing to do.",
        );
    });

    it("a new cause in the same collector episode pages once: a GitHub outage, then the App key refused", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const blind = (value: number, error: string): MemberStatus => ({
            ...member("data.collector", "data_sources"),
            value,
            cause: { code: "error", params: { source: "collector", error } },
        });
        for (let t = 0; t <= 12 * HOUR; t += 30 * MIN) {
            const error = t < 3 * HOUR ? "GitHub graphql: HTTP 502" : "GitHub graphql: HTTP 401 Bad credentials";
            await run(store, evaluation(blind(30 * MIN + t, error)), T0 + t, p.fetch, SLAS);
        }
        // The key page waits out the 6 h floor after the outage page, then goes out once.
        expect(p.calls.map((c) => c.get("title"))).toEqual([
            "Health dashboard down (GitHub API down) for 2 h 30 min",
            "Health dashboard down (GitHub App key refused) for 8 h 30 min",
        ]);
        expect(p.calls[1].get("message")).toMatch(/^What to do: Make a new private key/);
    });

    it("a second owner's credential failing in the same sources episode pages too: Cloudflare, then Sentry", async () => {
        const p = pushover();
        const store = new MemoryStore();
        const src = (source: string, credMs: number): MemberStatus => ({
            ...member("data.sources_age", "data_sources"),
            value: 2,
            facts: { credential_error_ms: credMs },
            cause: { code: "error", params: { source, label: source, error: "HTTP 401" } },
        });
        for (let t = 0; t <= 7 * HOUR; t += 30 * MIN) {
            const m = t < HOUR ? src("cloudflare-token", 2 * HOUR + t) : src("sentry-token", 90 * MIN + t);
            await run(store, evaluation(m), DAY_T0 + t, p.fetch, SLAS);
        }
        expect(p.calls.map((c) => c.get("title"))).toEqual([
            "Cloudflare token rejected: make a new one",
            "Sentry token rejected: make a new one",
        ]);
    });

    it("a stopped release scheduler pages once a day from 13 h without a full run, in the daytime only", async () => {
        const untested = (sinceSlot?: number): MemberStatus => ({
            ...member("master.untested_age", "master"),
            value: 25 * HOUR,
            ...(sinceSlot === undefined ? {} : { facts: { "release.since_slot_ms": sinceSlot } }),
        });
        const titles = async (m: MemberStatus, times: number[]) => {
            const p = pushover();
            const store = new MemoryStore();
            for (const t of times) await run(store, evaluation(m), t, p.fetch, SLAS);
            return p.calls.map((c) => c.get("title"));
        };
        expect(await titles(untested(14 * HOUR), [DAY_T0, DAY_T0 + HOUR, DAY_T0 + 6 * HOUR])).toEqual([
            "No full test run in 14 h: release scheduler may be down",
        ]);
        expect(await titles(untested(12 * HOUR), [DAY_T0, DAY_T0 + HOUR])).toEqual([]);
        expect(await titles(untested(), [DAY_T0, DAY_T0 + HOUR])).toEqual([]);
        // T0 is 05:00 Pacific: the page waits for 09:00.
        expect(await titles(untested(14 * HOUR), [T0])).toEqual([]);
        expect(await titles(untested(14 * HOUR), [T0, T0 + 4 * HOUR])).toEqual([
            "No full test run in 14 h: release scheduler may be down",
        ]);
    });
});

describe("messages", () => {
    const realistic: Record<string, Partial<MemberStatus>> = {
        "master.red_now": { value: 3 * HOUR + 20 * MIN },
        "master.untested_age": { value: 25 * HOUR, facts: { "release.since_slot_ms": 14 * HOUR } },
        "ci.runners_not_assigned": { value: 75 * MIN, facts: { "ci.jobs_running": 0, "ci.jobs_waiting_runner": 40 } },
        "release.lanes_red": { value: 0, facts: { "release.review_wait_ms": 26 * HOUR, "release.review_issue": 4700 } },
        "cost.spend": { value: 412.3, facts: { month_to_date: 280 } },
        "cost.t4": { value: 232.1, facts: { month_to_date: 150 } },
        "cost.llm": { value: 87.55, facts: { month_to_date: 70 } },
        "cost.aws": { value: 8.4, state: "WARNING", facts: { projected: 9.9 } },
        "data.sources_age": {
            value: 1,
            facts: { credential_error_ms: 70 * MIN },
            cause: { code: "error", params: { source: "sentry-token", label: "Sentry", error: "HTTP 401" } },
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
            const open = openMessage({ evaluation: ev, now: DAY_T0 }, [d]);
            const done = resolvedMessage({ evaluation: ev, now: T0 }, { ...d, e: { ...e, peak: m.value } });
            for (const text of [open.title, open.message, done.title, done.message]) {
                expect(text).not.toMatch(/\{\w+(:[\w.]+)?\}/); // every placeholder filled
                expect(text).not.toMatch(/no value|FAILING|undefined|NaN/);
                // A number over 9999 is raw milliseconds unless it is money.
                expect(text.replace(/https?:\S+/g, "").replace(/\$[\d.]+/g, "")).not.toMatch(/\d{5,}/);
            }
            expect(open.message).toMatch(/^What to do: \S/);
            expect(open.message).toMatch(/\d+ (min|h|d)\b|\$\d|\d+%/);
            expect(open.priority).toBe(String(c.alert!.priority));
            // No repository paths a phone reader cannot open (links are fine).
            expect(open.message.replace(/https?:\S+/g, "")).not.toMatch(/tools\/|\.ts\b|\.yml\b|README/);
            expect(done.priority).toBe("-1");
        });
    }

    it("every alert text uses only placeholders fill() knows, and the thresholds they read exist", () => {
        const known =
            /^(value|limit|target|over|suggest|pace|mtd|month|mon|choose|pick|cutFrom|end|peak|lasted|for|error|since|feed|frozen|problem|fix|off|(ms|issue|n):[\w.]+)$/;
        for (const c of SLAS.members.filter((x) => x.alert)) {
            const a = c.alert!;
            const texts = [
                a.title,
                a.text,
                a.action,
                a.then ?? "",
                a.link?.url ?? "",
                a.resolved?.title ?? "",
                a.resolved?.text ?? "",
            ].join(" ");
            for (const [, k] of texts.matchAll(/\{([^}]+)\}/g)) {
                expect(k, `${c.id}: {${k}}`).toMatch(known);
            }
            // Every fact a page needs or names is one the engine writes for this member: a typo would be a fact
            // that is never there, a permanent gap, and the member would silently never page.
            const facts = new Set(["month_to_date", "credential_error_ms", ...(c.also ?? []).map((x) => x.metric)]);
            const named = [...texts.matchAll(/\{(?:ms|n|issue):([\w.]+)\}/g)].map(([, k]) => k);
            for (const k of [...Object.keys(a.facts ?? {}), ...named]) {
                expect(facts.has(k), `${c.id}: fact ${k}`).toBe(true);
            }
            if (/\{limit\}/.test(texts)) expect(c.fail, `${c.id} uses {limit}`).toBeDefined();
            if (/\{(target|over)\}/.test(texts)) expect(c.ok, `${c.id} uses {target}`).toBeDefined();
        }
    });

    it("names the collector's one step from its error", () => {
        const words = (error: string) =>
            causeWords({
                ...member("data.collector", "data_sources"),
                cause: { code: "error", params: { source: "collector", error } },
            });
        expect(words("GitHub App token: HTTP 401 Bad credentials").fix).toContain(
            "settings/apps/graphty-pipeline-health",
        );
        expect(words("GitHub: HTTP 502").problem).toBe("GitHub API down");
        expect(words("installation token: HTTP 503").problem).toBe("GitHub API down");
        expect(words("TypeError: x after 500 ms").problem).toBe("bug in its code");
        expect(words("TypeError: x is undefined").fix).toContain("fix the health dashboard");
        // The collector's own allowance or slowness is agent work, not a GitHub outage.
        expect(words("GitHub graphql: HTTP 429 secondary rate limit").problem).toBe("bug in its code");
        // A request timing out and GitHub's degraded GraphQL reply are GitHub failing, not the collector's code.
        expect(words("github: The operation was aborted due to timeout").problem).toBe("GitHub API down");
        expect(
            words("issues: GitHub graphql: Something went wrong while executing your query. Please try again.").problem,
        ).toBe("GitHub API down");
        // The token endpoint rate limiting the collector is not a refused key; an uninstalled App (404) is.
        expect(words("installation token: HTTP 429").problem).toBe("bug in its code");
        expect(words("installation token: HTTP 403").problem).toBe("bug in its code");
        expect(words("installation token: HTTP 404").problem).toBe("GitHub App key refused");
    });

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
