import { describe, expect, it } from "vitest";
import rates from "../../config/rates.json" with { type: "json" };
import sliceConfig from "../../config/slices.json" with { type: "json" };
import { collect } from "../../src/collector/collect.js";
import { GitHub } from "../../src/collector/github.js";
import type { GhJob, GhRun, Rates } from "../../src/collector/parse.js";
import {
    decideSlice,
    isQuiet,
    jobMinutes,
    newestGreen,
    nextState,
    type RunnerSample,
    type SliceConfig,
    type SliceInput,
    type SliceSpend,
    SLICE_STORE_PARAMS,
    sliceDeps,
    spentMinutes,
    storeSummary,
} from "../../src/collector/slices.js";
import { HOUR, MIN } from "../../src/model/items.js";
import { getCursor } from "../../src/model/raw.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { fakeGitHub, masterRuns, NOW } from "./fake-github.js";

const cfg = sliceConfig as SliceConfig;
const T = Date.parse("2026-10-29T08:00:00Z");

/** One sample per 5 minutes over the last hour, all quiet unless `over` says otherwise. */
function samples(over: Partial<RunnerSample> = {}, n = 12, now = T): RunnerSample[] {
    return Array.from({ length: n }, (_, k) => ({
        at: now - (n - 1 - k) * 5 * MIN,
        running: 4,
        queued: 0,
        saturated: false,
        longestQueuedMs: 0,
        ...over,
    }));
}

const spend = (mode: "base" | "idle", minutes: number, at: number, run = at): SliceSpend => ({
    run,
    attempt: 1,
    mode,
    at,
    minutes,
});

/** A quiet pool, master's newest green build not sliced yet, a store whose oldest capture is 5 hours old. */
function input(over: Partial<SliceInput> = {}, state: Partial<SliceInput["state"]> = {}): SliceInput {
    return {
        now: T,
        cfg,
        state: { samples: samples(), spent: [], ...state },
        running: false,
        newestGreen: { sha: "new" },
        store: { lastSlicedSha: "old", oldestAt: T - 5 * HOUR },
        ...over,
    };
}

const dispatch = (mode: string, sha = "new") => ({ action: "dispatch", mode, sha });
const none = (reason: string) => ({ action: "none", reason });

describe("decideSlice: the decision table (design 4b)", () => {
    const rows: [string, SliceInput, unknown][] = [
        ["quiet, stale, few running: idle", input(), dispatch("idle")],
        [
            "quiet, fresh, new green build: base",
            input({ store: { lastSlicedSha: "old", oldestAt: T - HOUR } }),
            dispatch("base"),
        ],
        [
            "quiet, fresh, green build already sliced: nothing",
            input({ store: { lastSlicedSha: "new", oldestAt: T - HOUR } }),
            none("fresh-and-current"),
        ],
        [
            "green build already dispatched (a failed slice posts nothing): no second base",
            input(
                { store: { lastSlicedSha: "old", oldestAt: T - HOUR } },
                { dispatched: { at: T - HOUR, sha: "new", mode: "base", seen: true } },
            ),
            none("fresh-and-current"),
        ],
        ["never captured anything: idle", input({ store: { lastSlicedSha: null, oldestAt: null } }), dispatch("idle")],
        ["a slice run queued or running: never", input({ running: true }), none("in-flight")],
        [
            "dispatched 5 minutes ago and its run not seen yet: never",
            input({}, { dispatched: { at: T - 5 * MIN, sha: "x", mode: "idle" } }),
            none("in-flight"),
        ],
        [
            "dispatched 20 minutes ago and never seen: no longer in flight",
            input({}, { dispatched: { at: T - 20 * MIN, sha: "x", mode: "idle" } }),
            dispatch("idle"),
        ],
        ["no sample this cycle: never", input({}, { samples: samples({}, 12, T - 10 * MIN) }), none("no-runner-data")],
        ["no runner samples at all: never", input({}, { samples: [] }), none("no-runner-data")],
        [
            "a job queued 20 minutes ago: not quiet",
            input({}, { samples: samples().map((s, k) => (k === 8 ? { ...s, queued: 1 } : s)) }),
            none("not-quiet"),
        ],
        [
            "saturated in one cycle of the 30 minutes: not quiet",
            input({}, { samples: samples().map((s, k) => (k === 10 ? { ...s, saturated: true } : s)) }),
            none("not-quiet"),
        ],
        [
            "a 6-minute runner wait 50 minutes ago: not quiet",
            input({}, { samples: samples().map((s, k) => (k === 1 ? { ...s, longestQueuedMs: 6 * MIN } : s)) }),
            none("not-quiet"),
        ],
        [
            "a queued job 40 minutes ago (outside the 30) with a short wait: quiet",
            input({}, { samples: samples().map((s, k) => (k === 3 ? { ...s, queued: 2, longestQueuedMs: MIN } : s)) }),
            dispatch("idle"),
        ],
        [
            "a missed cycle in the 30 minutes: not quiet",
            input({}, { samples: samples().filter((_, k) => k !== 9) }),
            none("not-quiet"),
        ],
        ["no green master build known: never", input({ newestGreen: undefined }), none("no-green-build")],
        ["11 running: no idle, base instead", input({}, { samples: samples({ running: 11 }) }), dispatch("base")],
        ["31 running: neither", input({}, { samples: samples({ running: 31 }) }), none("busy")],
        [
            "30 running and the green build sliced: nothing",
            input({ store: { lastSlicedSha: "new", oldestAt: T - 5 * HOUR } }, { samples: samples({ running: 30 }) }),
            none("fresh-and-current"),
        ],
        [
            "idle share used up today (680 + 29 > 700): base instead",
            input({}, { spent: [spend("idle", 680, T - 3 * HOUR)] }),
            dispatch("base"),
        ],
        [
            "idle hour used up (100 + 29 > 120): base instead",
            input({}, { spent: [spend("idle", 100, T - 30 * MIN)] }),
            dispatch("base"),
        ],
        [
            "idle hour spent 70 minutes ago: idle again",
            input({}, { spent: [spend("idle", 100, T - 70 * MIN)] }),
            dispatch("idle"),
        ],
        [
            "base share used up, idle not needed: nothing",
            input(
                { store: { lastSlicedSha: "old", oldestAt: T - HOUR } },
                { spent: [spend("base", 795, T - 2 * HOUR)] },
            ),
            none("fresh-and-current"),
        ],
        [
            "base share used up never spends idle on a base: idle only when stale",
            input({}, { spent: [spend("base", 795, T - 2 * HOUR)] }),
            dispatch("idle"),
        ],
        [
            "both shares used up: never, and the store is not read",
            input({ store: null }, { spent: [spend("base", 795, T - HOUR), spend("idle", 690, T - 2 * HOUR)] }),
            none("caps-used"),
        ],
        [
            "yesterday's spend does not count (UTC day)",
            input({}, { spent: [spend("idle", 700, Date.parse("2026-10-28T23:00:00Z"))] }),
            dispatch("idle"),
        ],
        ["store not read yet: ask for it", input({ store: null }), none("store-unavailable")],
        ["store did not answer: never", input({ store: undefined }), none("store-unavailable")],
    ];
    for (const [name, i, want] of rows) it(name, () => expect(decideSlice(i)).toEqual(want));

    it("checks the store last, so a busy or noisy pool never costs a store read", () => {
        expect(decideSlice(input({ store: null, running: true }))).toEqual(none("in-flight"));
        expect(decideSlice(input({ store: null }, { samples: samples({ queued: 1 }) }))).toEqual(none("not-quiet"));
    });
});

describe("the slice runner-minutes", () => {
    const job = (started: string | null, completed: string | null) =>
        ({ started_at: started, completed_at: completed }) as GhJob;

    it("sums every job's started-to-completed time, skipped jobs as zero", () => {
        expect(
            jobMinutes([
                job("2026-10-29T08:00:00Z", "2026-10-29T08:00:42Z"),
                job("2026-10-29T08:01:00Z", "2026-10-29T08:05:30Z"),
                job(null, "2026-10-29T08:05:30Z"),
            ]),
        ).toBeCloseTo(0.7 + 4.5);
    });

    it("splits by share: base and idle per UTC day, idle over the last hour", () => {
        const spent = [
            spend("base", 10, T - 2 * HOUR, 1),
            spend("idle", 29, T - 30 * MIN, 2),
            spend("idle", 30, T - 2 * HOUR, 3),
            spend("base", 50, T - 10 * HOUR, 4), // yesterday (22:00 UTC)
        ];
        expect(spentMinutes(spent, T)).toEqual({ baseToday: 10, idleToday: 59, idleLastHour: 29 });
    });

    it("records a finished slice run once, by its mode from the run name, and keeps an hour of samples", () => {
        const run = (id: number, title: string) =>
            ({ id, run_attempt: 1, display_title: title, updated_at: "2026-10-29T07:58:00Z" }) as GhRun;
        const jobs = [job("2026-10-29T07:50:00Z", "2026-10-29T07:56:00Z")];
        const prev = { samples: samples(), spent: [spend("base", 10, T - HOUR, 7)] };
        const sample = { at: T + 5 * MIN, running: 1, queued: 0, saturated: false, longestQueuedMs: 0 };
        const next = nextState(prev, T + 5 * MIN, sample, [
            { run: run(7, "Story slices: base abc"), jobs }, // already counted
            { run: run(8, "Story slices: idle abc"), jobs },
            { run: run(9, "Story slices"), jobs }, // no mode: not a slice the dispatcher knows
        ]);
        expect(next.spent.map((s) => [s.run, s.mode, s.minutes])).toEqual([
            [7, "base", 10],
            [8, "idle", 6],
        ]);
        expect(next.spent[1].at).toBe(Date.parse("2026-10-29T07:58:00Z"));
        expect(next.samples.at(-1)).toEqual(sample);
        expect(next.samples.length).toBe(12);
    });

    it("quiet needs samples covering the whole 30 minutes, one per cycle", () => {
        expect(isQuiet(samples({}, 7), T, cfg)).toBe(true); // 08:00 back to 07:30
        expect(isQuiet(samples({}, 6), T, cfg)).toBe(false); // only back to 07:35: the collector just started
        expect(isQuiet(samples({}, 7), T + 9 * MIN, cfg)).toBe(false); // no sample in the last cycle
    });
});

describe("the store summary", () => {
    it("takes the oldest unit capture, else the oldest newest capture, else null", () => {
        expect(
            storeSummary({
                summary: { lastSliced: { sha: "abc" }, oldestNewestAt: 5 },
                units: [{ at: 30 }, { at: 20 }],
            }),
        ).toEqual({ lastSlicedSha: "abc", oldestAt: 20 });
        expect(storeSummary({ summary: { lastSliced: null, oldestNewestAt: 5 } })).toEqual({
            lastSlicedSha: null,
            oldestAt: 5,
        });
        expect(storeSummary({})).toEqual({ lastSlicedSha: null, oldestAt: null });
    });
});

describe("sliceDeps", () => {
    it("reads nothing and dispatches nothing when nothing is set up", () => {
        expect(sliceDeps(cfg, {}, undefined, fetch, "o/r")).toEqual({ cfg });
    });

    it("never dispatches with dispatch switched off, even with the App's key", () => {
        const app = { appId: "1", installationId: "2", privateKey: "unused" };
        expect(sliceDeps({ ...cfg, dispatch: false }, {}, app, fetch, "o/r").dispatch).toBeUndefined();
        expect(sliceDeps(cfg, {}, app, fetch, "o/r").dispatch).toBeTypeOf("function");
    });

    it("reads the store with its token and dispatches story-slices.yml on master as the App", async () => {
        const calls: { url: string; init?: RequestInit }[] = [];
        const f = async (url: string, init?: RequestInit) => {
            calls.push({ url, init });
            if (url.endsWith("/access_tokens"))
                return Response.json({ token: "ghs_dispatch", expires_at: "2099-01-01T00:00:00Z" });
            if (url.endsWith("/v1/story-captures"))
                return Response.json({ summary: { lastSliced: { sha: "s1" } }, units: [{ at: 9 }] });
            return new Response(null, { status: 204 });
        };
        const { generateKeyPairSync } = await import("node:crypto");
        const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
        const deps = sliceDeps(
            cfg,
            { [SLICE_STORE_PARAMS.url]: "https://store.example/", [SLICE_STORE_PARAMS.token]: "tok" },
            {
                appId: "1",
                installationId: "2",
                privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
            },
            f,
            "o/r",
        );
        expect(await deps.readStore?.()).toEqual({ lastSlicedSha: "s1", oldestAt: 9 });
        expect(new Headers(calls[0].init?.headers).get("authorization")).toBe("Bearer tok");
        await deps.dispatch?.("abc", "idle");
        const post = calls.at(-1);
        expect(post?.url).toBe("https://api.github.com/repos/o/r/actions/workflows/story-slices.yml/dispatches");
        expect(new Headers(post?.init?.headers).get("authorization")).toBe("Bearer ghs_dispatch");
        expect(JSON.parse(String(post?.init?.body))).toEqual({
            ref: "master",
            inputs: { sha: "abc", mode: "idle", post: "true" },
        });
    });
});

describe("the collector cycle", () => {
    it("records its runner sample and decision every cycle, and dispatches nothing without a quiet half hour", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const dispatched: string[] = [];
        let reads = 0;
        const report = await collect({
            store,
            now: NOW,
            gh: new GitHub(async () => "ghs_test", fake.fetch),
            fetch: fake.fetch,
            awsCosts: async () => [],
            rates: rates as unknown as Rates,
            limits: { linux_windows: SLAS.runnerLimits.linux_windows, macos: SLAS.runnerLimits.macos },
            org: "graphty-org",
            repo: "graphty-org/graphty-monorepo",
            slices: {
                cfg,
                readStore: async () => {
                    reads++;
                    return { lastSlicedSha: null, oldestAt: null };
                },
                dispatch: async (sha, mode) => {
                    dispatched.push(`${mode} ${sha}`);
                },
            },
        });
        expect(report.errors).toEqual({});
        // One sample is not a quiet half hour.
        expect(report.slice).toEqual({ action: "none", reason: "not-quiet", dispatched: false });
        expect(reads).toBe(0);
        expect(dispatched).toEqual([]);
        const state = JSON.parse((await getCursor(store, "slices")) ?? "{}");
        expect(state.samples).toHaveLength(1);
        expect(state.samples[0].at).toBe(NOW);
    });

    it("counts a story-slices run still going as in flight, so no second run waits in its concurrency group", async () => {
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        const slice = {
            ...masterRuns()[1],
            id: 41000000001,
            path: ".github/workflows/story-slices.yml",
            name: "Story slices",
            display_title: "Story slices: idle abc",
            event: "workflow_dispatch",
            status: "in_progress",
            conclusion: null,
        } as GhRun;
        fake.fetch = async (url, init) => {
            const u = new URL(url);
            if (
                /\/repos\/graphty-org\/graphty-monorepo\/actions\/runs$/.test(u.pathname) &&
                u.searchParams.get("status") === "queued"
            )
                return new Response(JSON.stringify({ total_count: 1, workflow_runs: [slice] }), { status: 200 });
            return base(url, init);
        };
        const report = await collect({
            store: new MemoryStore(),
            now: NOW,
            gh: new GitHub(async () => "ghs_test", fake.fetch),
            fetch: fake.fetch,
            awsCosts: async () => [],
            rates: rates as unknown as Rates,
            limits: { linux_windows: SLAS.runnerLimits.linux_windows, macos: SLAS.runnerLimits.macos },
            org: "graphty-org",
            repo: "graphty-org/graphty-monorepo",
            slices: { cfg, readStore: async () => ({ lastSlicedSha: null, oldestAt: null }) },
        });
        expect(report.slice).toEqual({ action: "none", reason: "in-flight", dispatched: false });
    });
});

describe("master's newest green build", () => {
    const run = (head_sha: string, status: string, conclusion: string | null) =>
        ({ ...masterRuns()[1], head_sha, status, conclusion }) as GhRun;
    it("skips a newer red, cancelled or running build", () => {
        expect(
            newestGreen([
                run("a", "in_progress", null),
                run("b", "completed", "failure"),
                run("c", "completed", "cancelled"),
                run("d", "completed", "success"),
                run("e", "completed", "success"),
            ]),
        ).toEqual({ sha: "d" });
        expect(newestGreen([run("b", "completed", "failure")])).toBeUndefined();
    });
});
