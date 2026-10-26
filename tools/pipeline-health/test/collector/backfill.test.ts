// The four-week backfill against recorded GitHub responses (no network): paging, the cursor, the throttle, the
// stops, the needs: wait rule, and the run and test-history indexes it and ingest write.
import { describe, expect, it } from "vitest";
import { backfill, PRS_CURSOR, type BackfillOptions } from "../../src/collector/backfill.js";
import { GitHub } from "../../src/collector/github.js";
import { toJobItem, type GhJob, type GhRun } from "../../src/collector/parse.js";
import { runDrill, testHistory } from "../../src/model/drill.js";
import { DAY, MIN, sourceKey, type ShardRunItem, type SourceItem, type TestItem } from "../../src/model/items.js";
import { getCursor, putRaw, recordSource } from "../../src/model/raw.js";
import { MemoryStore } from "../../src/model/store.js";
import { fakeGitHub, fixture, NOW } from "./fake-github.js";

const REPO = "graphty-org/graphty-monorepo";
const master = fixture<GhRun>("run-master-40239928447.json");
const masterJobs = fixture<{ jobs: GhJob[] }>("jobs-master-40239928447.json").jobs;

/** Seven runs on 2026-10-25 (a closed day) and two on 2026-10-26 (today), each with the recorded master jobs. */
function history(): GhRun[] {
    const at = (day: string, i: number) => `${day}T${String(10 + i).padStart(2, "0")}:00:00Z`;
    return [
        ...Array.from({ length: 7 }, (_, i) => ({ ...master, id: 1000 + i, created_at: at("2026-10-25", i) })),
        ...Array.from({ length: 2 }, (_, i) => ({ ...master, id: 2000 + i, created_at: at("2026-10-26", 0) })),
    ];
}

/** The collector's fake, with the runs list answered by day and page, and jobs renumbered per run. */
function fake(opts: { remaining?: number } = {}) {
    const base = fakeGitHub();
    const runs = history();
    const f = {
        urls: [] as string[],
        fetch: async (url: string, init?: RequestInit): Promise<Response> => {
            f.urls.push(url);
            const u = new URL(url);
            const headers = {
                "content-type": "application/json",
                "x-ratelimit-remaining": String(opts.remaining ?? 4000),
                "x-ratelimit-limit": "5000",
            };
            const reply = (body: unknown) => new Response(JSON.stringify(body), { headers });
            if (/\/actions\/runs$/.test(u.pathname) && u.searchParams.get("created")) {
                const day = runs.filter((r) => r.created_at.startsWith(u.searchParams.get("created")!));
                const per = Number(u.searchParams.get("per_page"));
                const page = Number(u.searchParams.get("page"));
                return reply({ total_count: day.length, workflow_runs: day.slice((page - 1) * per, page * per) });
            }
            const jobs = /\/actions\/runs\/(\d+)\/jobs$/.exec(u.pathname);
            if (jobs && Number(jobs[1]) < 40_000) {
                const id = Number(jobs[1]);
                const list = masterJobs.map((j, k) => ({ ...j, id: id * 100 + k, run_id: id }));
                return reply({ total_count: list.length, jobs: list });
            }
            return base.fetch(url, init);
        },
    };
    return f;
}

/** A clock that only moves when the backfill sleeps (or a test moves it). */
function clock() {
    const c = { t: NOW, slept: 0, now: () => c.t, sleep: async (ms: number) => void ((c.t += ms), (c.slept += ms)) };
    return c;
}

function options(store: MemoryStore, f: ReturnType<typeof fake>, c = clock()): BackfillOptions & { gh: GitHub } {
    return {
        store,
        gh: new GitHub(async () => "t", f.fetch),
        repos: [REPO],
        repo: REPO,
        days: 2,
        perHour: 3_600_000,
        perPage: 3,
        now: NOW,
        clock: c.now,
        sleep: c.sleep,
    };
}

const homes = (store: MemoryStore, kind: string) =>
    [...store.items.values()].filter((i) => i.pk.startsWith(`R#${kind}#`));
const listCalls = (urls: string[]) => urls.filter((u) => /actions\/runs\?created=/.test(u));

describe("backfill", () => {
    it("pages each day, records the next page of closed days only, and loads pull requests and issues once", async () => {
        const store = new MemoryStore();
        const f = fake();
        const r = await backfill(options(store, f));
        expect(r).toMatchObject({ done: true, runs: 9 });
        expect(homes(store, "run")).toHaveLength(9);
        expect(homes(store, "job")).toHaveLength(9 * masterJobs.length);
        expect(homes(store, "pr").length).toBeGreaterThan(0);
        expect(homes(store, "issue").length).toBeGreaterThan(0);
        // 2026-10-24: one empty page. 2026-10-25: 7 runs in pages of 3 (3, 3, 1). 2026-10-26: 2 runs, one page.
        expect(
            listCalls(f.urls).map(
                (u) => new URL(u).searchParams.get("created") + "/" + new URL(u).searchParams.get("page"),
            ),
        ).toEqual(["2026-10-24/1", "2026-10-25/1", "2026-10-25/2", "2026-10-25/3", "2026-10-26/1"]);
        // Today is never recorded as done, so the cursor stops at it.
        expect(JSON.parse((await getCursor(store, `backfill#${REPO}`))!)).toEqual({ day: "2026-10-26", page: 1 });
        expect(await getCursor(store, PRS_CURSOR)).toBe("done");
        expect([...store.items.values()].some((i) => i.pk === "DIRTY")).toBe(true);

        // A second run reloads only today and skips the pull requests and issues.
        const g = fake();
        await backfill({ ...options(store, g), gh: new GitHub(async () => "t", g.fetch) });
        expect(listCalls(g.urls).every((u) => u.includes("created=2026-10-26"))).toBe(true);
        expect(g.urls.some((u) => u.endsWith("/graphql"))).toBe(false);
        expect(homes(store, "run")).toHaveLength(9);
    });

    it("moves the collector's history start back to its first day once done, also when re-run after finishing", async () => {
        const firstAt = async (s: MemoryStore) => ((await s.get(sourceKey("collector"))) as SourceItem).firstAt;
        const start = Math.floor((NOW - 2 * DAY) / DAY) * DAY;
        const store = new MemoryStore();
        await recordSource(store, "collector", NOW, { ok: true });
        const c = clock();
        const stopped = await backfill({ ...options(store, fake(), c), perHour: 3600, deadline: NOW + 7_000 });
        expect(stopped.done).toBe(false);
        expect(await firstAt(store)).toBe(NOW);
        expect((await backfill(options(store, fake()))).done).toBe(true);
        expect(await firstAt(store)).toBe(start);

        // A backfill that finished before this rule existed: cursors at done, firstAt still the first live write.
        await store.put({ ...sourceKey("collector"), source: "collector", firstAt: NOW, lastAt: NOW });
        expect((await backfill(options(store, fake()))).done).toBe(true);
        expect(await firstAt(store)).toBe(start);
    });

    it("stops at its deadline and a second invocation continues from the cursor to the same result", async () => {
        const whole = new MemoryStore();
        await backfill(options(whole, fake()));

        const store = new MemoryStore();
        const c = clock();
        const f = fake();
        // Each call costs 1 s on this clock (perHour 3600); the deadline falls inside 2026-10-25's second page.
        const o = { ...options(store, f, c), perHour: 3600, deadline: NOW + 7_000 };
        const first = await backfill(o);
        expect(first).toMatchObject({ done: false, stopped: "deadline" });
        expect(JSON.parse((await getCursor(store, `backfill#${REPO}`))!)).toEqual({ day: "2026-10-25", page: 2 });

        const g = fake();
        const second = await backfill({ ...o, gh: new GitHub(async () => "t", g.fetch), deadline: undefined });
        expect(second.done).toBe(true);
        expect(new URL(listCalls(g.urls)[0]).searchParams.get("page")).toBe("2");
        expect(new URL(listCalls(g.urls)[0]).searchParams.get("created")).toBe("2026-10-25");
        const keys = (s: MemoryStore) =>
            [...s.items.keys()].filter((k) => !k.startsWith("CURSOR#") && !k.startsWith("QUOTA#")).sort();
        expect(keys(store)).toEqual(keys(whole));
    });

    it("spaces its requests to the hourly budget", async () => {
        const c = clock();
        const o = { ...options(new MemoryStore(), fake(), c), perHour: 1200 };
        const r = await backfill(o);
        // 3 s a request: the clock has moved (calls - 1) * 3 s, since the first call goes at once.
        expect(c.slept).toBe((r.calls - 1) * 3000);
    });

    it("stops while the App's hour is below a quarter, and past its share of the daily write budget", async () => {
        const low = await backfill(options(new MemoryStore(), fake({ remaining: 1000 })));
        // The first response reports 1000 of 5000 left; the next call is refused before it is made.
        expect(low).toMatchObject({ done: false, stopped: "rate", calls: 1 });

        const store = new MemoryStore();
        const r = await backfill({ ...options(store, fake()), rowLimit: 10 });
        expect(r).toMatchObject({ done: false, stopped: "write_budget", items: 0 });
        expect(homes(store, "run")).toHaveLength(0);
        expect(await getCursor(store, `backfill#${REPO}`)).toBe(JSON.stringify({ day: "2026-10-25", page: 1 }));
    });
});

describe("the needs: wait rule", () => {
    it("a job behind needs: is created when its last dependency finishes, so its wait is started - created", () => {
        const byName = new Map(masterJobs.map((j) => [j.name, j]));
        const build = byName.get("Build")!;
        const lint = byName.get("Lint")!;
        // Recorded ci.yml run 40239928447: Lint needs Build and was created the second Build completed.
        expect(lint.created_at).toBe(build.completed_at);
        expect(byName.get("All Checks Pass")!.created_at).toBe(byName.get("Checks")!.completed_at);
        const item = toJobItem(lint, REPO, "ci.yml");
        expect(item.startedAt! - item.createdAt).toBe(
            Date.parse("2026-10-25T23:00:37Z") - Date.parse("2026-10-25T22:38:45Z"),
        );
    });
});

describe("drill-down indexes", () => {
    it("indexes runs with their jobs, answering the newest attempt", async () => {
        const store = new MemoryStore();
        await backfill(options(store, fake()));
        const run = await runDrill(store, 1003, NOW);
        expect(run).toMatchObject({ id: 1003, repo: REPO, workflow: "ci.yml", attempt: 1, conclusion: "success" });
        expect(run!.jobs).toHaveLength(masterJobs.length);
        expect(run!.jobs[0]).toMatchObject({ name: "Build", created: "2026-10-25T22:23:00Z" });
        expect(await runDrill(store, 42, NOW)).toBeUndefined();
    });

    it("indexes failed and flaky tests by file and time, joined to their shard runs", async () => {
        const store = new MemoryStore();
        const shard: ShardRunItem = {
            kind: "shard_run",
            id: "500.2.layout",
            attempt: 1,
            source: "ci",
            variant: "layout",
            family: "layout",
            bin: true,
            full: false,
            pr: 77,
            sha: "abc",
            outcome: "failed",
            startedAt: NOW - 10 * MIN,
            endedAt: NOW - 5 * MIN,
            secs: 300,
            files: [],
        };
        const test = (name: string, seenAt: number): TestItem => ({
            kind: "test",
            id: `500.2.layout#a.test.ts#${name}`,
            attempt: 1,
            source: "ci",
            invocation: "500.2.layout",
            family: "layout",
            file: "a.test.ts",
            name,
            outcome: "failed",
            status: "fail",
            signature: "expected 1",
            seenAt,
        });
        await putRaw(store, [shard, test("draws", NOW - 5 * MIN), test("old", NOW - 10 * DAY)], NOW);
        const h = await testHistory(store, { file: "a.test.ts", range: "7d" }, NOW);
        expect(h!.events).toEqual([
            {
                at: new Date(NOW - 5 * MIN).toISOString().replace(".000", ""),
                kind: "pr",
                pr: 77,
                run: 500,
                attempt: 2,
                sha: "abc",
                outcome: "failed",
                signature: "expected 1",
            },
        ]);
        expect((await testHistory(store, { file: "a.test.ts", range: "28d" }, NOW))!.events).toHaveLength(2);
        expect(await testHistory(store, { file: "a.test.ts", test: "nope", range: "28d" }, NOW)).toBeUndefined();

        // A rewrite seen at another time moves its index item instead of leaving a second one.
        await putRaw(store, [{ ...test("draws", NOW - 4 * MIN), outcome: "flaky" }], NOW);
        const again = await testHistory(store, { file: "a.test.ts", test: "draws", range: "7d" }, NOW);
        expect(again!.events.map((e) => e.outcome)).toEqual(["flaky"]);
    });
});
