import { describe, expect, it } from "vitest";

import { RED_FOR_MS, SECRETS, sendAlerts } from "../src/alerts/index.js";
import { MemoryStore } from "../src/model/store.js";
import type { Episode, Evaluation, MemberStatus } from "../src/sla/engine.js";
import { MIN, T0 } from "./model/helpers.js";

const member = (id: string, category: string, state: MemberStatus["state"] = "FAILING"): MemberStatus => ({
    id,
    category,
    label: `${id} label`,
    window: "1h",
    state,
    judged: true,
    value: 3,
    fail: [">=", 2],
    sources: [],
    headline: true,
});

const evaluation = (m: MemberStatus, e: Partial<Episode> = {}): Evaluation => ({
    at: T0,
    categories: [{ id: m.category, label: `${m.category} cat`, state: "FAILING", others: [] }],
    members: [m],
    episodes: [{ member: m.id, category: m.category, worst: "FAILING", start: T0 - 10 * MIN, peak: 4, ...e }],
    sources: [],
});

const keys = { [SECRETS.token]: "tok", [SECRETS.user]: "usr" };

function pushover(status = 200) {
    const calls: URLSearchParams[] = [];
    const fetch = (async (_url: string, init: { body: URLSearchParams }) => {
        calls.push(init.body);
        return new Response("{}", { status });
    }) as unknown as typeof globalThis.fetch;
    return { calls, fetch };
}

const run = (store: MemoryStore, ev: Evaluation, now: number, fetch: typeof globalThis.fetch, secrets = keys) =>
    sendAlerts({ evaluation: ev, store, now, getSecret: async (n) => secrets[n], fetch, log: () => {} });

describe("sendAlerts", () => {
    it("alerts a Master episode at FAILING at once, naming category, member, value, threshold and page", async () => {
        const p = pushover();
        const r = await run(new MemoryStore(), evaluation(member("master_red", "master")), T0, p.fetch);
        expect(r).toEqual({ state: "ok", sent: [{ member: "master_red", kind: "open" }], failed: 0 });
        const body = Object.fromEntries(p.calls[0]);
        expect(body).toMatchObject({ token: "tok", user: "usr", title: "master cat FAILING" });
        expect(body.message).toBe("master_red label: 3 (red >= 2, peak 4)");
        expect(body.url).toBe("https://health.graphty.app/#/master");
    });

    it("waits until another category has been FAILING for 30 minutes", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const ev = evaluation(member("pr_wait", "pull_requests"));
        await run(store, ev, T0, p.fetch);
        await run(store, ev, T0 + RED_FOR_MS - MIN, p.fetch);
        expect(p.calls).toHaveLength(0);
        const r = await run(store, ev, T0 + RED_FOR_MS, p.fetch);
        expect(r.sent).toEqual([{ member: "pr_wait", kind: "open" }]);
        expect(Object.fromEntries(p.calls[0]).url).toBe("https://health.graphty.app/#/pull-requests");
    });

    it("restarts the 30 minutes when the member leaves FAILING", async () => {
        const store = new MemoryStore();
        const p = pushover();
        const m = member("ci_x", "ci");
        await run(store, evaluation(m), T0, p.fetch);
        await run(store, evaluation({ ...m, state: "WARNING" }), T0 + 20 * MIN, p.fetch);
        await run(store, evaluation(m), T0 + 25 * MIN, p.fetch);
        await run(store, evaluation(m), T0 + RED_FOR_MS + 5 * MIN, p.fetch);
        expect(p.calls).toHaveLength(0);
        await run(store, evaluation(m), T0 + 25 * MIN + RED_FOR_MS, p.fetch);
        expect(p.calls).toHaveLength(1);
    });

    it("sends once per episode across runs, and once when it clears", async () => {
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
        expect(Object.fromEntries(p.calls[1]).title).toBe("master cat cleared");
    });

    it("never clears an episode that never alerted", async () => {
        const p = pushover();
        const ended = evaluation(member("pr_wait", "pull_requests", "OK"), { endedAt: T0 });
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
        const r = await run(store, evaluation(member("master_red", "master")), T0, p.fetch, {});
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
