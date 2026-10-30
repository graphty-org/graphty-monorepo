// The four-week backfill against recorded GitHub responses (no network): paging, the cursor, the throttle, the
// stops, the needs: wait rule, and the run and test-history indexes it and ingest write.
import { describe, expect, it } from "vitest";
import { backfill, FLAKY_CURSOR, PRS_CURSOR, runsCursor, type BackfillOptions } from "../../src/collector/backfill.js";
import { GitHub } from "../../src/collector/github.js";
import {
    flakyTestItem,
    toJobItem,
    toRunItem,
    workflowFile,
    type GhJob,
    type GhRun,
} from "../../src/collector/parse.js";
import { runDrill, testHistory } from "../../src/model/drill.js";
import {
    DAY,
    homeKey,
    MIN,
    sourceKey,
    type ShardRunItem,
    type SourceItem,
    type TestItem,
} from "../../src/model/items.js";
import { getCursor, putRaw, recordSource, setCursor } from "../../src/model/raw.js";
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

/** A check suite's check runs and annotations, as FLAKY_SUITE_QUERY answers them. */
type Suite = {
    checkRuns: {
        nodes: {
            databaseId: number;
            name: string;
            completedAt: string;
            annotations: { nodes: { message: string }[] };
        }[];
    };
};

/** The collector's fake, with the runs list answered by day and page, jobs renumbered per run, and `suites` by node id. */
function fake(
    opts: {
        remaining?: number;
        runs?: GhRun[];
        suites?: Record<string, Suite>;
        jobs?: Record<number, GhJob[]>;
        /** Runs GitHub lists for one query. */
        listed?: number;
    } = {},
) {
    const base = fakeGitHub();
    const runs = opts.runs ?? history();
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
            const listing = /\/actions\/(?:workflows\/([^/]+)\/)?runs$/.exec(u.pathname);
            if (listing && u.searchParams.get("created")) {
                // A day ("2026-10-25") or a range ("a..b"), newest first; past `listed` runs a page comes back empty.
                // A workflow's list (actions/workflows/<file>/runs) holds only that workflow's runs.
                const created = u.searchParams.get("created")!;
                const [from, to] = created.split("..");
                const day = runs
                    .filter((r) => !listing[1] || workflowFile(r.path) === listing[1])
                    .filter((r) => (to ? r.created_at >= from && r.created_at <= to : r.created_at.startsWith(created)))
                    .toSorted((a, b) => b.created_at.localeCompare(a.created_at));
                const per = Number(u.searchParams.get("per_page"));
                const page = Number(u.searchParams.get("page"));
                const shown = day.slice(0, opts.listed ?? Infinity);
                return reply({ total_count: day.length, workflow_runs: shown.slice((page - 1) * per, page * per) });
            }
            const ids =
                opts.suites &&
                (JSON.parse(String(init?.body ?? "{}")) as { variables?: { ids?: string[] } }).variables?.ids;
            if (u.pathname === "/graphql" && ids) {
                return reply({ data: { nodes: ids.map((id) => opts.suites![id] ?? null) } });
            }
            const jobs = /\/actions\/runs\/(\d+)\/jobs$/.exec(u.pathname);
            if (jobs && opts.jobs?.[Number(jobs[1])]) return reply({ jobs: opts.jobs[Number(jobs[1])] });
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
// The runs phase's list calls (pages of 3); the flaky phase lists pages of 100.
const listCalls = (urls: string[]) => urls.filter((u) => /actions\/runs\?created=.*per_page=3&/.test(u));

describe("backfill", () => {
    it("pages each day from yesterday back, records the next older page, and loads pull requests and issues once", async () => {
        const store = new MemoryStore();
        const f = fake();
        const r = await backfill(options(store, f));
        // Today's two runs are the live collector's: the backfill starts at yesterday.
        expect(r).toMatchObject({ done: true, runs: 7 });
        expect(homes(store, "run")).toHaveLength(7);
        expect(homes(store, "job")).toHaveLength(7 * masterJobs.length);
        expect(homes(store, "pr").length).toBeGreaterThan(0);
        expect(homes(store, "issue").length).toBeGreaterThan(0);
        // 2026-10-25: 7 runs in pages of 3 (3, 3, 1). 2026-10-24: one empty page.
        expect(
            listCalls(f.urls).map(
                (u) => new URL(u).searchParams.get("created") + "/" + new URL(u).searchParams.get("page"),
            ),
        ).toEqual(["2026-10-25/1", "2026-10-25/2", "2026-10-25/3", "2026-10-24/1"]);
        // Past the range's first day: done.
        expect(JSON.parse((await getCursor(store, runsCursor(REPO)))!)).toEqual({ day: "2026-10-23", page: 1 });
        expect(await getCursor(store, FLAKY_CURSOR)).toBe("2026-10-23");
        expect(await getCursor(store, PRS_CURSOR)).toBe("done");
        expect([...store.items.values()].some((i) => i.pk === "DIRTY")).toBe(true);

        // A second run loads nothing.
        const g = fake();
        await backfill({ ...options(store, g), gh: new GitHub(async () => "t", g.fetch) });
        expect(g.urls.filter((u) => !u.endsWith("/access_tokens"))).toEqual([]);
        expect(homes(store, "run")).toHaveLength(7);
    });

    it("repairs only the given days' runs of the given workflows, whatever the cursors say", async () => {
        // 2026-10-09 to 10-15 each had over 1,000 runs; the first backfill read each day in one query, GitHub listed
        // only the newest 1,000, and the cursor moved on, so 18 of the month's paid LLM steps were never loaded.
        const store = new MemoryStore();
        const release = (id: number, i: number) => ({
            ...master,
            id,
            path: ".github/workflows/release.yml",
            created_at: `2026-10-25T0${i}:00:00Z`,
        });
        const f = fake({ runs: [...history(), release(3000, 1), release(3001, 2)] });
        await setCursor(store, runsCursor(REPO), JSON.stringify({ day: "2026-09-01", page: 1 }), NOW);
        const r = await backfill({
            ...options(store, f),
            repair: { days: ["2026-10-25"], workflows: ["release.yml"] },
        });
        expect(r).toMatchObject({ done: true, runs: 2 });
        expect(
            homes(store, "run")
                .map((i) => i.pk)
                .sort(),
        ).toEqual([`R#run#${REPO}/3000`, `R#run#${REPO}/3001`]);
        expect(f.urls.every((u) => !u.includes("/actions/runs?") && !u.endsWith("/graphql"))).toBe(true);
        expect(JSON.parse((await getCursor(store, runsCursor(REPO)))!)).toEqual({ day: "2026-09-01", page: 1 });
        expect(await getCursor(store, PRS_CURSOR)).toBeUndefined();
    });

    it("a repair stopped at its deadline continues where it stopped, and once done reads nothing", async () => {
        // 2026-10-29: every invocation of a repair started again at its first day and workflow, re-read the same 419
        // runs until its deadline, and spent the day's write budget writing them over and over.
        const release = (id: number, day: string, i: number) => ({
            ...master,
            id,
            path: ".github/workflows/release.yml",
            created_at: `${day}T0${i}:00:00Z`,
        });
        const runs = [
            ...[0, 1, 2, 3].map((i) => release(3000 + i, "2026-10-24", i)),
            ...[0, 1].map((i) => release(3100 + i, "2026-10-25", i)),
        ];
        const repair = { days: ["2026-10-24", "2026-10-25"], workflows: ["release.yml"] };
        const store = new MemoryStore();
        const c = clock();
        // 1 s a call: 2026-10-24's first page (a list and 3 runs' jobs) is written; the deadline falls in its second.
        const first = await backfill({
            ...options(store, fake({ runs }), c),
            perHour: 3600,
            deadline: NOW + 4_000,
            repair,
        });
        expect(first).toMatchObject({ done: false, stopped: "deadline", runs: 3 });

        const g = fake({ runs });
        const second = await backfill({ ...options(store, g), repair });
        expect(second).toMatchObject({ done: true, runs: 3 });
        const listed = g.urls.filter((u) => u.includes("/workflows/release.yml/runs?"));
        expect(
            listed.map((u) => `${new URL(u).searchParams.get("created")}/${new URL(u).searchParams.get("page")}`),
        ).toEqual(["2026-10-24/2", "2026-10-25/1"]);
        expect(homes(store, "run")).toHaveLength(6);

        const h = fake({ runs });
        expect(await backfill({ ...options(store, h), repair })).toMatchObject({ done: true, runs: 0 });
        expect(h.urls).toEqual([]);
        // A different repair starts from its own beginning.
        const k = fake({ runs });
        expect(
            await backfill({ ...options(store, k), repair: { days: ["2026-10-25"], workflows: ["release.yml"] } }),
        ).toMatchObject({ done: true, runs: 2 });
    });

    it("stops at the days the earlier oldest-first backfill loaded (its cursor's day, reloaded whole)", async () => {
        const store = new MemoryStore();
        await setCursor(store, `backfill#${REPO}`, JSON.stringify({ day: "2026-10-25", page: 2 }), NOW);
        const f = fake();
        expect((await backfill({ ...options(store, f), days: 5 })).done).toBe(true);
        expect(listCalls(f.urls).map((u) => new URL(u).searchParams.get("created"))).toEqual([
            "2026-10-25",
            "2026-10-25",
            "2026-10-25",
        ]);
    });

    it("a write budget stop after one day has loaded the most recent day, not the oldest", async () => {
        const at = (day: string, i: number) => `${day}T${String(10 + i).padStart(2, "0")}:00:00Z`;
        const runs = [
            ...history(),
            ...Array.from({ length: 3 }, (_, i) => ({ ...master, id: 3000 + i, created_at: at("2026-10-24", i) })),
        ];
        const store = new MemoryStore();
        const perRun = 1 + masterJobs.length;
        const r = await backfill({ ...options(store, fake({ runs })), perPage: 25, rowLimit: 7 * perRun });
        expect(r).toMatchObject({ done: false, stopped: "write_budget", runs: 7 });
        const ids = homes(store, "run").map((i) => Number(/(\d+)$/.exec(i.pk)![1]));
        expect(ids.sort()).toEqual([1000, 1001, 1002, 1003, 1004, 1005, 1006]);
        expect(JSON.parse((await getCursor(store, runsCursor(REPO)))!)).toEqual({ day: "2026-10-24", page: 1 });
    });

    it("reads a day with more runs than GitHub lists an hour at a time, so its oldest runs are not lost", async () => {
        // 2026-10-12 had 1,945 runs; GitHub listed the newest 1,000 and the T4 jobs of the morning's trains were lost.
        // Here GitHub lists 4 runs a query and the closed day has 7, one an hour from 10:00.
        const store = new MemoryStore();
        const f = fake({ listed: 4 });
        const r = await backfill({ ...options(store, f), listedRuns: 4 });
        expect(r.done).toBe(true);
        expect(
            homes(store, "run")
                .map((i) => Number(/(\d+)$/.exec(i.pk)![1]))
                .sort(),
        ).toEqual([1000, 1001, 1002, 1003, 1004, 1005, 1006]);
        const created = listCalls(f.urls).map((u) => new URL(u).searchParams.get("created")!);
        expect(created[0]).toBe("2026-10-25");
        expect(created).toContain("2026-10-25T10:00:00Z..2026-10-25T10:59:59Z");
        expect(created).toContain("2026-10-25T16:00:00Z..2026-10-25T16:59:59Z");
        expect(JSON.parse((await getCursor(store, runsCursor(REPO)))!)).toEqual({ day: "2026-10-23", page: 1 });
    });

    it("continues an hour-at-a-time day from the hour in its cursor", async () => {
        const store = new MemoryStore();
        await setCursor(store, runsCursor(REPO), JSON.stringify({ day: "2026-10-25", page: 1, hour: 12 }), NOW);
        const f = fake({ listed: 4 });
        expect((await backfill({ ...options(store, f), listedRuns: 4 })).done).toBe(true);
        // 10:00 to 12:00: runs 1000 to 1002; the later hours were loaded before the stop.
        expect(
            homes(store, "run")
                .map((i) => Number(/(\d+)$/.exec(i.pk)![1]))
                .sort(),
        ).toEqual([1000, 1001, 1002]);
        expect(new URL(listCalls(f.urls)[0]).searchParams.get("created")).toBe(
            "2026-10-25T12:00:00Z..2026-10-25T12:59:59Z",
        );
    });

    it("keeps what the live collector stored on a run or job it re-reads (cause, cancelClass, hang)", async () => {
        const store = new MemoryStore();
        const run = history()[0];
        const job = { ...masterJobs[0], id: run.id * 100, run_id: run.id };
        const live = [
            toRunItem(run, REPO, { cause: "flaky", cancelClass: "superseded" }),
            toJobItem(job, REPO, workflowFile(run.path), true),
        ];
        await putRaw(store, live, NOW);
        expect((await backfill(options(store, fake()))).done).toBe(true);
        expect(await store.get(homeKey(live[0]))).toMatchObject({ cause: "flaky", cancelClass: "superseded" });
        expect(await store.get(homeKey(live[1]))).toMatchObject({ hang: true });
    });

    it("moves the collector's history start back to its first day once done, also when re-run after finishing", async () => {
        const firstAt = async (s: MemoryStore) => ((await s.get(sourceKey("collector"))) as SourceItem).firstAt;
        const start = Math.floor((NOW - 2 * DAY) / DAY) * DAY;
        const store = new MemoryStore();
        await recordSource(store, "collector", NOW, { ok: true });
        const c = clock();
        const stopped = await backfill({ ...options(store, fake(), c), perHour: 3600, deadline: NOW + 11_000 });
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
        // Each call costs 1 s on this clock (perHour 3600). The flaky phase makes 5 (a list and a query for each of
        // 2026-10-26 and 2026-10-25, a list for 2026-10-24); 2026-10-25's first page of runs 4; the deadline falls in
        // its second page.
        const o = { ...options(store, f, c), perHour: 3600, deadline: NOW + 11_000 };
        const first = await backfill(o);
        expect(first).toMatchObject({ done: false, stopped: "deadline" });
        expect(JSON.parse((await getCursor(store, runsCursor(REPO)))!)).toEqual({ day: "2026-10-25", page: 2 });

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
        expect(await getCursor(store, runsCursor(REPO))).toBeUndefined();
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

describe("the flaky-history phase", () => {
    type Rec = { runs: GhRun[]; suites: Record<string, Suite> };
    const rec = fixture<Rec>("flaky-annotations.json");
    // The recorded runs: two ci.yml runs of 2026-10-25 with real [FLAKY] lines, and one of 2026-10-24 whose only
    // [FLAKY] lines come from the tool tests in its Checks job (fixtures of test-quarantine.mjs, not CI shards).
    const flakyRows = (s: MemoryStore) =>
        [...s.items.values()].filter((i) => i.pk.startsWith("R#test#")) as unknown as (TestItem & {
            pk: string;
            sk: string;
        })[];
    const opts = (store: MemoryStore, f: ReturnType<typeof fake>) => ({ ...options(store, f), days: 3 });

    it("writes each flaky test of a test shard's check run as the live feed's row, and nothing else", async () => {
        const store = new MemoryStore();
        const r = await backfill(opts(store, fake({ runs: rec.runs, suites: rec.suites })));
        expect(r.flaky).toBe(3);
        const rows = flakyRows(store).map(({ pk: _pk, sk: _sk, ...t }) => t as unknown as TestItem);
        const byId = new Map(rows.map((t) => [t.id, t]));
        // tools/results/client.mjs postFlaky(): invocation `<run>.<attempt>.<GITHUB_JOB>.<shard>.1`, family the shard's
        expect(
            byId.get(
                "40233504823.1.test.graphty-2.1#graphty/src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx#src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx",
            ),
        ).toMatchObject({
            kind: "test",
            id: "40233504823.1.test.graphty-2.1#graphty/src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx#src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx",
            attempt: 1,
            source: "ci",
            invocation: "40233504823.1.test.graphty-2.1",
            family: "graphty",
            file: "graphty/src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx",
            name: "src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx",
            outcome: "flaky",
            status: "fail",
            signature: "",
            seenAt: expect.any(Number),
        });
        // The story-tests job takes screenshots: its family is `<family>-shots` (run-group.mjs groupFamily()).
        expect(rows.filter((t) => t.invocation.includes(".story-tests.graphty-storybook."))).toHaveLength(2);
        expect(rows.every((t) => t.family !== "graphty-storybook")).toBe(true);
        // The Checks jobs' tool-test lines are not CI shards.
        expect(rows.some((t) => t.file === "graphty/src/a.test.tsx")).toBe(false);
        expect(await getCursor(store, FLAKY_CURSOR)).toBe("2026-10-22");
    });

    it("leaves a row the live feed already wrote as it is, and counts only new ones", async () => {
        const first = new MemoryStore();
        await backfill(opts(first, fake({ runs: rec.runs, suites: rec.suites })));
        const { pk: _pk, sk: _sk, wid: _w, ...one } = flakyRows(first)[0] as unknown as Record<string, unknown>;
        const item = { ...one, signature: "expected 1 to be 2" } as unknown as TestItem;

        const store = new MemoryStore();
        await putRaw(store, [item], NOW);
        const r = await backfill(opts(store, fake({ runs: rec.runs, suites: rec.suites })));
        expect(r.flaky).toBe(2);
        expect(flakyRows(store)).toHaveLength(3);
        expect(await store.get(homeKey(item))).toMatchObject({ signature: "expected 1 to be 2" });
    });

    it("gives a re-run's check run the attempt of its job", async () => {
        const run = { ...rec.runs[0], run_attempt: 2 };
        const jobs = [{ ...masterJobs[0], id: 121291879466, run_id: run.id, run_attempt: 2 }];
        const store = new MemoryStore();
        await backfill(opts(store, fake({ runs: [run], suites: rec.suites, jobs: { [run.id]: jobs } })));
        expect(flakyRows(store).map((t) => t.invocation)).toContain("40233504823.2.test.graphty-2.1");
    });

    it("a write budget stop after one day has loaded the most recent day's flaky tests", async () => {
        const [a, b] = rec.runs;
        // b moved to 2026-10-26 (today), a stays on 2026-10-25: today holds one detection, yesterday two.
        const runs = [{ ...b, created_at: "2026-10-26T00:10:00Z" }, a];
        const store = new MemoryStore();
        const r = await backfill({ ...opts(store, fake({ runs, suites: rec.suites })), rowLimit: 2 });
        // Today's one detection is written; yesterday's two do not fit the budget of 2 rows.
        expect(r).toMatchObject({ stopped: "write_budget", flaky: 1 });
        expect(flakyRows(store).every((t) => t.invocation.startsWith(String(b.id)))).toBe(true);
        expect(await getCursor(store, FLAKY_CURSOR)).toBe("2026-10-25");
    });
});

describe("flakyTestItem", () => {
    const run = 1;
    it("reads every line that means failed on try 1 and passed on the retry", () => {
        // tools/results/run-group.mjs prJudge()'s rewordings of test-quarantine.mjs's [FLAKY] line
        for (const m of [
            "[FLAKY-UNRELATED] layout: layout/test/a.test.ts > d > t failed and passed; this pull request did not touch it. Base check: gh workflow run base-check.yml",
            "[QUARANTINED] layout: layout/test/a.test.ts > d > t failed and passed; issue #12",
        ])
            expect(flakyTestItem(m, "Test (small-node)", run, 1, 0)).toMatchObject({
                file: "layout/test/a.test.ts",
                name: "d > t",
                family: "layout",
                invocation: "1.1.test.layout.1",
            });
    });

    it("skips a test that failed both times, other annotations and jobs that are no test shard", () => {
        const flaky = "[FLAKY] x-1: a.test.ts > t failed and passed on the same inputs, so it does not fail the shard";
        expect(
            flakyTestItem("[QUARANTINED] x-1: a.test.ts > t failed again; issue #3", "Test (x-1)", run, 1, 0),
        ).toBeUndefined();
        expect(
            flakyTestItem(
                "[KNOWN] x-1: a.test.ts > t fails the same way on master abc, issue #3",
                "Test (x-1)",
                run,
                1,
                0,
            ),
        ).toBeUndefined();
        expect(flakyTestItem(flaky, "Checks", run, 1, 0)).toBeUndefined();
        expect(flakyTestItem(flaky, "Verify / Test (x-1)", run, 1, 0)).toMatchObject({
            family: "x",
            invocation: "1.1.test.x-1.1",
        });
        expect(flakyTestItem(flaky, "Restricted CPU (x-1)", run, 1, 0)).toMatchObject({
            invocation: "1.1.stress.x-1.1",
        });
    });
});
