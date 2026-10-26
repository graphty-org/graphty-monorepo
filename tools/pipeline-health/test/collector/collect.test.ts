import { describe, expect, it } from "vitest";
import rates from "../../config/rates.json" with { type: "json" };
import { backfill } from "../../src/collector/backfill.js";
import { collect, type Deps } from "../../src/collector/collect.js";
import { GitHub } from "../../src/collector/github.js";
import type { Rates } from "../../src/collector/parse.js";
import { MIN, sourceKey, type ObservationItem } from "../../src/model/items.js";
import { getCursor } from "../../src/model/raw.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { fakeGitHub, NOW } from "./fake-github.js";

const deps = (store: MemoryStore, fake: ReturnType<typeof fakeGitHub>, now = NOW, withApp = true): Deps => ({
    store,
    now,
    gh: withApp ? new GitHub(async () => "ghs_test", fake.fetch) : undefined,
    fetch: fake.fetch,
    awsCosts: async () => [{ day: "2026-10-25", usd: 0.12 }],
    rates: rates as unknown as Rates,
    limits: { linux_windows: SLAS.runnerLimits.linux_windows, macos: SLAS.runnerLimits.macos },
    org: "graphty-org",
    repo: "graphty-org/graphty-monorepo",
});

const homes = (store: MemoryStore, kind: string) =>
    [...store.items.values()].filter((i) => i.pk.startsWith(`R#${kind}#`));
const observed = (store: MemoryStore, metric: string, at = NOW) =>
    (store.items.get(`R#obs#${metric}#${at}\u0000A#1`) as ObservationItem | undefined)?.value;

describe("collector without the GitHub App", () => {
    it("collects nothing from GitHub and leaves the GitHub sources not set up", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-24T19:48:28Z" });
        const report = await collect(deps(store, fake, NOW, false));
        expect(report).toMatchObject({ github: "not set up", calls: 0, errors: {} });
        expect(fake.urls.some((u) => u.includes("api.github.com"))).toBe(false);
        expect(await store.get(sourceKey("collector"))).toBeUndefined();
        expect(await store.get(sourceKey("coverage"))).toMatchObject({ lastOkAt: Date.parse("2026-10-24T19:48:28Z") });
        expect(homes(store, "cost").map((c) => c.line)).toContain("aws");

        const e = await evaluate(store, NOW, SLAS);
        const state = (id: string) => e.sources.find((s) => s.id === id)?.state;
        for (const id of ["collector", "release", "npm", "stress", "hosts"]) expect(state(id), id).toBe("not set up");
        expect(state("billing")).toBe("ok");
        expect(state("coverage")).toBe("stale"); // 29 h old: past its 24 h limit
    });
});

describe("collector with the GitHub App", () => {
    it("writes runs, jobs, pull requests, issues, release lanes and observations, and advances its cursors", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const report = await collect(deps(store, fake));
        expect(report.errors).toEqual({});
        expect(report.github).toBe("collected");

        // Runs from the created-since list, the in-progress list, and the release list; jobs of the in-progress run.
        expect(homes(store, "run").length).toBeGreaterThanOrEqual(5);
        expect(homes(store, "job").length).toBeGreaterThanOrEqual(25);
        expect(homes(store, "pr").length).toBeGreaterThan(0);
        expect(homes(store, "issue").length).toBeGreaterThan(0);
        expect(homes(store, "npm").some((n) => n.pkg === "@graphty/graph-format" && n.publishedAt)).toBe(true);
        expect(new Set(homes(store, "cost").map((c) => c.line))).toEqual(new Set(["github", "cloudflare", "aws"]));

        // Master: the newer cancelled build timed out, so it is red (classified from its annotations).
        expect(observed(store, "master.red_builds")).toBe(1);
        expect(observed(store, "master.red_span_ms")).toBe(NOW - Date.parse("2026-10-26T00:13:00Z"));
        expect(observed(store, "master.red_ms")).toBe(5 * MIN);
        // Release: the newest tested attempt (40119894804) had t4, audit and ci red; no newer tested one.
        expect(observed(store, "release.lanes_red")).toBe(3);
        expect(observed(store, "master.full_run_failed")).toBe(1);
        // The 18:00 shadow attempt skipped every lane on 1fa254bf, a commit no attempt tested (design 4.5).
        expect(observed(store, "release.train_skipped")).toBe(1);
        expect(observed(store, "github.rate_remaining_share")).toBe(0.8);
        expect(observed(store, "npm.tagged_missing")).toBeGreaterThan(0);
        expect(observed(store, "ci.running")).toBeGreaterThanOrEqual(0);

        for (const s of ["collector", "release", "npm", "coverage", "billing"])
            expect((await store.get(sourceKey(s)))?.error, s).toBeUndefined();
        expect(await getCursor(store, "runs#graphty-org/graphty-monorepo")).toBe("2026-10-26T00:35:00Z");
        expect(JSON.parse((await getCursor(store, "open#graphty-org/graphty-monorepo"))!)).toContain(40238975833);
        expect(await getCursor(store, "cycle")).toBe(String(NOW));
    });

    it("rewrites the same items on a second cycle without duplicating them, and skips finished runs", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        await collect(deps(store, fake));
        const runs = homes(store, "run").length;
        const jobs = homes(store, "job").length;
        const first = fake.urls.length;
        await collect(deps(store, fake, NOW + 5 * MIN));
        expect(homes(store, "run").length).toBe(runs);
        expect(homes(store, "job").length).toBe(jobs);
        // Not hourly or daily again, finished release attempts not fetched again.
        const second = fake.urls.slice(first);
        expect(second.some((u) => u.includes("registry.npmjs.org") || u.includes("coveralls.io"))).toBe(false);
        expect(second.filter((u) => /runs\/40119894804\/jobs/.test(u))).toHaveLength(0);
        expect(await getCursor(store, "runs#graphty-org/graphty-monorepo")).toBe("2026-10-26T00:40:00Z");
    });

    it("records a failing part against its source and still finishes the cycle", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub();
        const report = await collect(deps(store, fake));
        expect(report.errors.coverage).toMatch(/coveralls: HTTP 500/);
        expect(await store.get(sourceKey("coverage"))).toMatchObject({ error: expect.stringMatching(/HTTP 500/) });
        expect((await store.get(sourceKey("collector")))?.lastOkAt).toBe(NOW);
    });
});

describe("backfill", () => {
    it("loads each day's runs and jobs once, resumes from its cursor, and stays under its request budget", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub();
        const gh = new GitHub(async () => "t", fake.fetch);
        const waits: number[] = [];
        const o = {
            store,
            gh,
            repos: ["graphty-org/graphty-monorepo"],
            repo: "graphty-org/graphty-monorepo",
            days: 2,
            perHour: 1_000_000,
            now: NOW,
            sleep: async (ms: number) => void waits.push(ms),
        };
        const r = await backfill(o);
        expect(r.runs).toBeGreaterThan(0);
        expect(homes(store, "job").length).toBeGreaterThan(0);
        expect(homes(store, "pr").length).toBeGreaterThan(0);
        expect([...store.items.values()].some((i) => i.pk === "DIRTY")).toBe(true);
        // Days before today are done; a second run starts after them.
        expect(await getCursor(store, "backfill#graphty-org/graphty-monorepo")).toBe("2026-10-25");
        const calls = gh.calls;
        await backfill(o);
        const dayCalls = fake.urls.slice(-(gh.calls - calls)).filter((u) => /actions\/runs\?created=/.test(u));
        expect(dayCalls.every((u) => u.includes("created=2026-10-26"))).toBe(true);

        // A tight budget waits before calls instead of exceeding it.
        const slow = new GitHub(async () => "t", fakeGitHub().fetch);
        await backfill({ ...o, store: new MemoryStore(), gh: slow, perHour: 10 });
        expect(waits.length).toBeGreaterThan(0);
    });
});
