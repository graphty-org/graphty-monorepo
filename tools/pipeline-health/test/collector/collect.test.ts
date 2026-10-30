import { describe, expect, it } from "vitest";
import rates from "../../config/rates.json" with { type: "json" };
import { collect, type Deps } from "../../src/collector/collect.js";
import { type Fetch, GitHub } from "../../src/collector/github.js";
import { quarantineReader, SLICE_STORE_PARAMS } from "../../src/collector/slices.js";
import type { GhJob, GhRun, Rates } from "../../src/collector/parse.js";
import { MIN, sourceKey, type ObservationItem } from "../../src/model/items.js";
import { getCursor } from "../../src/model/raw.js";
import { readSnapshot } from "../../src/model/snapshots.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { fakeGitHub, fixture, NOW } from "./fake-github.js";

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
        // The "now" lists: quarantine and CODEOWNERS from master, release lanes per attempt, release workflows.
        expect(await readSnapshot(store, "quarantine")).toEqual([
            { file: "a/x.test.ts", name: "t1", family: "a", issue: 9, since: undefined, expires: undefined },
        ]);
        expect(await readSnapshot(store, "codeowners")).toEqual(["/.github/", "/visual-review/"]);
        const rel = Object.values((await readSnapshot(store, "release")) ?? {});
        expect(rel.some((a) => a.tested && a.lanes?.t4 === "failed" && a.jobs?.t4?.redAt)).toBe(true);
        expect((await readSnapshot(store, "release-workflows"))?.map((w) => w.workflow)).toEqual([
            "release.yml",
            "promote.yml",
            "release-watch.yml",
        ]);
        expect(Array.isArray(await readSnapshot(store, "owner-wait"))).toBe(true);
        // The release channels (#4460): what channel/nightly holds; no deploy or promotion runs recorded.
        expect(await readSnapshot(store, "channels")).toEqual({
            canary: [],
            promotions: {},
            refs: { nightly: "a".repeat(40) },
        });
        expect(observed(store, "npm.tagged_missing")).toBeGreaterThan(0);
        expect(observed(store, "ci.jobs_running")).toBe(0);
        expect(observed(store, "ci.jobs_queued")).toBe(0);
        // Flaky tests (4.4): nothing seen flaky yet, so every "now" member reads 0 rather than no value.
        for (const m of ["flaky.no_issue", "flaky.blocked_prs", "flaky.blocked_oldest_ms", "flaky.net_change"])
            expect(observed(store, m), m).toBe(0);

        for (const s of ["collector", "release", "npm", "coverage", "billing"])
            expect((await store.get(sourceKey(s)))?.error, s).toBeUndefined();
        expect(await getCursor(store, "runs#graphty-org/graphty-monorepo")).toBe("2026-10-26T00:35:00Z");
        expect(JSON.parse((await getCursor(store, "open#graphty-org/graphty-monorepo"))!)).toContain(40238975833);
        expect(await getCursor(store, "cycle")).toBe(String(NOW));
    });

    it("reads the quarantine in force from the results store, not the emptied committed list", async () => {
        // 2026-10-30: tools/test-quarantine.json has been empty since the store took the quarantine over, so the
        // flaky page said nothing was quarantined while #5038 and #5039 were.
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const asked: string[] = [];
        const storeFetch: Fetch = async (url, init) => {
            asked.push(`${String(url)} ${new Headers(init?.headers).get("authorization")}`);
            return new Response(
                JSON.stringify({
                    quarantine: [
                        {
                            family: "graphty-element-lifecycle",
                            file: "test/autosave.test.ts",
                            name: "unmount and remount",
                            issue: 5038,
                            since: Date.parse("2026-10-30T12:21:00Z"),
                            expires: Date.parse("2026-11-13T12:21:00Z"),
                            passes: 0,
                        },
                    ],
                }),
            );
        };
        const readQuarantine = quarantineReader(
            { [SLICE_STORE_PARAMS.url]: "https://results.test/", [SLICE_STORE_PARAMS.token]: "tok" },
            storeFetch,
        );
        const report = await collect({ ...deps(store, fake), readQuarantine });
        expect(report.errors).toEqual({});
        expect(asked).toEqual(["https://results.test/v1/quarantine Bearer tok"]);
        expect(await readSnapshot(store, "quarantine")).toEqual([
            {
                file: "test/autosave.test.ts",
                name: "unmount and remount",
                family: "graphty-element-lifecycle",
                issue: 5038,
                since: "2026-10-30T12:21:00.000Z",
                expires: "2026-11-13T12:21:00.000Z",
            },
        ]);
        expect(await readSnapshot(store, "codeowners")).toEqual(["/.github/", "/visual-review/"]);
    });

    it("a 502 on one run's jobs skips that run only, keeps every other value, and reads it again next cycle", async () => {
        // 2026-10-27: one 502 on one run's jobs failed the whole cycle and grayed every member reading the collector.
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        let down = true;
        const JOBS = "/actions/runs/40249709094/jobs";
        const hits: string[] = [];
        fake.fetch = async (url, init) => {
            if (url.includes(JOBS)) hits.push(url);
            return down && url.includes(JOBS) ? new Response("{}", { status: 502 }) : base(url, init);
        };
        const report = await collect(deps(store, fake));
        expect(report.errors).toEqual({});
        expect(report.skipped).toEqual([
            "jobs of graphty-org/graphty-monorepo run 40249709094: GitHub repos/graphty-org/graphty-monorepo/actions/runs/40249709094/jobs: HTTP 502",
        ]);
        // Pages of 100 tried, then retried twice; then the same in pages of 50 and 10; then, past three failed
        // requests (an outage, src/collector/github.ts), one page of 1 without retries.
        expect(hits.map((u) => new URL(u).searchParams.get("per_page"))).toEqual([
            "100",
            "100",
            "100",
            "50",
            "50",
            "50",
            "10",
            "10",
            "10",
            "1",
        ]);
        expect(observed(store, "master.red_builds")).toBe(1);
        expect(observed(store, "release.lanes_red")).toBe(3);
        const src = await store.get(sourceKey("collector"));
        expect(src).toMatchObject({ lastOkAt: NOW, partial: expect.stringContaining("run 40249709094") });
        expect(src?.error).toBeUndefined();
        expect(JSON.parse((await getCursor(store, "open#graphty-org/graphty-monorepo"))!)).toContain(40249709094);
        expect(homes(store, "run").some((r) => String(r.pk).includes("40249709094"))).toBe(false);

        down = false;
        const next = await collect(deps(store, fake, NOW + 5 * MIN));
        expect(next.skipped).toEqual([]);
        expect(hits).toHaveLength(11);
        expect(homes(store, "run").some((r) => String(r.pk).includes("40249709094"))).toBe(true);
    });

    it("reads a re-run release attempt GitHub answers 502 for, and the attempt it replaced", async () => {
        // 2026-10-28: the 12:00 full run 40684344927 failed attempt 1 (LLM regression) and passed attempt 2. Its jobs
        // at per_page=100 answered 502 every time, and the runs list shows only attempt 2, so neither attempt was read.
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        const ID = 40119894804;
        const red = fixture<{ total_count: number; jobs: GhJob[] }>("jobs-release-tested-40119894804.json");
        const green = red.jobs.map((j) => (j.conclusion === "skipped" ? j : { ...j, conclusion: "success" }));
        const first: GhRun = {
            ...fixture<{ workflow_runs: GhRun[] }>("release-runs.json").workflow_runs.find((r) => r.id === ID)!,
            display_title: "Release (full)",
            run_attempt: 1,
        };
        const second: GhRun = {
            ...first,
            run_attempt: 2,
            conclusion: "success",
            run_started_at: "2026-10-24T20:00:00Z",
            updated_at: "2026-10-24T21:00:00Z",
        };
        const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
        fake.fetch = async (url, init) => {
            const u = new URL(url);
            const size = Number(u.searchParams.get("per_page"));
            const page = Number(u.searchParams.get("page"));
            if (u.pathname.endsWith("/actions/workflows/release.yml/runs"))
                return json({ total_count: 1, workflow_runs: [second] });
            if (u.pathname.endsWith(`/runs/${ID}/attempts/1`)) return json(first);
            if (u.pathname.endsWith(`/runs/${ID}/attempts/1/jobs`)) return json(red);
            if (u.pathname.endsWith(`/runs/${ID}/jobs`))
                return size === 100
                    ? new Response("{}", { status: 502 })
                    : json({ total_count: green.length, jobs: green.slice((page - 1) * size, page * size) });
            return base(url, init);
        };
        const report = await collect(deps(store, fake));
        expect(report.skipped.filter((s) => s.includes("release"))).toEqual([]);
        const seen = (await readSnapshot(store, "release")) ?? {};
        expect(seen[`${ID}.1`]).toMatchObject({ mode: "full", tested: true, ok: false, red: ["ci", "t4", "audit"] });
        expect(seen[`${ID}.2`]).toMatchObject({ mode: "full", tested: true, ok: true, red: [] });
        // The first attempt is the run item release.train_first_attempt counts.
        expect(homes(store, "run").filter((r) => String(r.pk).includes(String(ID)))).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ attempt: 1, conclusion: "failure", tested: true }),
                expect.objectContaining({ attempt: 2, conclusion: "success", tested: true }),
            ]),
        );
        // The newest tested attempt is the candidate: attempt 2, all green.
        expect(observed(store, "release.lanes_red")).toBe(0);
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

    it("does not rewrite unchanged items, so an hourly or daily reread marks no buckets dirty", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        await collect(deps(store, fake));
        for (const k of [...store.items.keys()])
            if (k.startsWith("DIRTY") || k.startsWith("CURSOR#hourly") || k.startsWith("CURSOR#daily"))
                store.items.delete(k);
        const again = await collect(deps(store, fake, NOW + 5 * MIN));
        const obsOnly = [...store.items.values()].filter((i) => i.pk === "DIRTY");
        // Only this cycle's observations (one 5-minute bucket) are new.
        expect(new Set(obsOnly.map((i) => i.sk)).size).toBe(1);
        expect(again.items).toBeLessThan(60);
    });

    it("records a failing part against its source and still finishes the cycle", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub();
        const report = await collect(deps(store, fake));
        expect(report.errors.coverage).toMatch(/coveralls: HTTP 500/);
        expect(await store.get(sourceKey("coverage"))).toMatchObject({ error: expect.stringMatching(/HTTP 500/) });
        expect((await store.get(sourceKey("collector")))?.lastOkAt).toBe(NOW);
    });

    it("a failing part other than the runs read errors its own source; the collector's age and error stay the runs read's", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        fake.fetch = async (url, init) =>
            new URL(url).pathname === "/graphql" && String(init?.body).includes("issues(")
                ? new Response("{}", { status: 502 })
                : base(url, init);
        const report = await collect(deps(store, fake));
        expect(report.errors.issues).toBeDefined();
        // The runs were read: the dashboard is not blind, so data.collector has nothing to page on.
        const collector = await store.get(sourceKey("collector"));
        expect(collector).toMatchObject({ lastOkAt: NOW });
        expect(collector?.error).toBeUndefined();
        expect(await store.get(sourceKey("collector-parts"))).toMatchObject({
            error: expect.stringMatching(/^issues: /),
        });
        expect((await store.get(sourceKey("collector-parts")))?.lastOkAt).toBeUndefined();
    });
});

type Fake = ReturnType<typeof fakeGitHub>;

/** The open pull requests answer with only as many as `branches`, headed by them (the recorded runs' others closed). */
function withOpenBranches(fake: Fake, branches: string[]): Fake {
    const recorded = fake.fetch;
    fake.fetch = async (url, init) => {
        const res = await recorded(url, init);
        if (!url.endsWith("/graphql") || !String(init?.body).includes("pullRequests")) return res;
        const body = (await res.json()) as { data: { repository: { open: { nodes: { headRefName?: string }[] } } } };
        const open = body.data.repository.open;
        open.nodes = open.nodes.slice(0, branches.length).map((p, i) => ({ ...p, headRefName: branches[i] }));
        return new Response(JSON.stringify(body), { headers: res.headers });
    };
    return fake;
}

/** Adds the recorded ghost: "Lint PR Title" queued since 02:58Z on #3940, which merged at 03:29Z. */
function withGhost(fake: Fake): Fake {
    const recorded = fake.fetch;
    const ghost = fixture<GhRun>("run-ghost-40441556963.json");
    fake.fetch = async (url, init) => {
        const u = new URL(url);
        if (/\/actions\/runs\/40441556963\/jobs$/.test(u.pathname))
            return Response.json(fixture("jobs-ghost-40441556963.json"));
        if (/monorepo\/actions\/runs$/.test(u.pathname) && u.searchParams.get("status") === "queued")
            return Response.json({ total_count: 1, workflow_runs: [ghost] });
        return recorded(url, init);
    };
    return fake;
}

describe("runner job counts", () => {
    const PR_RUN_BRANCH = "ci/3418-design-studio-master-wait";

    it("writes ci.jobs_running and ci.jobs_queued from the jobs of unfinished runs", async () => {
        const store = new MemoryStore();
        const fake = withOpenBranches(fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" }), [PR_RUN_BRANCH]);
        const recorded = fake.fetch;
        // The in-progress pull request run with two jobs running and three queued (one on machine.dev, which is
        // outside GitHub's limit and so not counted).
        fake.fetch = async (url, init) => {
            const res = await recorded(url, init);
            if (!/\/actions\/runs\/40238975833\/jobs$/.test(new URL(url).pathname)) return res;
            const body = (await res.json()) as { total_count: number; jobs: Record<string, unknown>[] };
            const status = ["in_progress", "in_progress", "queued", "queued", "queued"];
            body.jobs = body.jobs.map((j, i) => ({
                ...j,
                ...(i < status.length ? { status: status[i], conclusion: null, completed_at: null } : {}),
                ...(i < status.length ? { labels: [i === 4 ? "machine.dev" : "ubuntu-latest"] } : {}),
            }));
            return new Response(JSON.stringify(body), { headers: res.headers });
        };
        await collect(deps(store, fake));
        expect(observed(store, "ci.jobs_running")).toBe(2);
        expect(observed(store, "ci.jobs_queued")).toBe(2);
        // The runners page's count: only Linux and Windows jobs queued for a runner over 2 minutes.
        expect(observed(store, "ci.jobs_waiting_runner")).toBe(2);
    });

    it("leaves out a queued run whose pull request is no longer open", async () => {
        const now = Date.parse("2026-10-27T20:49:00Z");
        const ghostAt = Date.parse("2026-10-27T02:58:55Z");
        const run = async (open: string[], ghost = true) => {
            const store = new MemoryStore();
            const fake = withOpenBranches(fakeGitHub(), open);
            await collect(deps(store, ghost ? withGhost(fake) : fake, now));
            return {
                queued: observed(store, "ci.jobs_queued", now),
                longest: observed(store, "ci.longest_queued_ms", now),
            };
        };
        // No pull request of the recorded runs is open: none of them waits on a runner.
        const without = await run([], false);
        expect(without).toEqual({ queued: 0, longest: 0 });
        // #3940 merged: its branch heads no open pull request, so the ghost changes nothing.
        expect(await run([])).toEqual(without);
        // While #3940 was open, the same job was a real wait.
        expect(await run(["fix/3938-master-builds-finish"])).toEqual({
            queued: without.queued! + 1,
            longest: now - ghostAt,
        });
    });
});

describe("collector deploy trigger", () => {
    const TREE = "a".repeat(40);
    const HEAD = "b".repeat(40);
    /** GitHub that answers only the deploy query, with master's tools/pipeline-health tree `tree()`. */
    const gh = (tree: () => string) =>
        new GitHub(
            async () => "ghs_test",
            async (url, init) => {
                const body = String(init?.body ?? "");
                if (url.endsWith("/graphql") && body.includes("master:tools/pipeline-health"))
                    return Response.json({ data: { repository: { tree: { oid: tree() }, head: { oid: HEAD } } } });
                return new Response("{}", { status: 500 });
            },
        );
    const builds = (opts: { status?: string; fail?: boolean } = {}) => {
        const started: string[] = [];
        return {
            started,
            start: async (commit: string) => {
                if (opts.fail) throw new Error("AccessDenied");
                started.push(commit);
                return `graphty-health-deploy:${started.length}`;
            },
            status: async () => opts.status ?? "SUCCEEDED",
        };
    };
    const run = (store: MemoryStore, g: GitHub, b: ReturnType<typeof builds>, now = NOW) =>
        collect({ ...deps(store, fakeGitHub(), now, false), gh: g, deploy: b });

    it("starts a build when only ci-budgets.json changed", async () => {
        const store = new MemoryStore();
        let budgets = "d".repeat(40);
        const answer = () =>
            new GitHub(
                async () => "ghs_test",
                async () =>
                    Response.json({
                        data: { repository: { tree: { oid: TREE }, budgets: { oid: budgets }, head: { oid: HEAD } } },
                    }),
            );
        const b = builds();
        await run(store, answer(), b);
        await run(store, answer(), b, NOW + 5 * MIN);
        expect(b.started).toEqual([HEAD]);
        budgets = "e".repeat(40);
        await run(store, answer(), b, NOW + 10 * MIN);
        expect(b.started).toEqual([HEAD, HEAD]);
    });

    it("starts a build at master's head when the tree changed, and not again while it is unchanged", async () => {
        const store = new MemoryStore();
        let tree = TREE;
        const b = builds();
        const first = await run(
            store,
            gh(() => tree),
            b,
        );
        expect(first.errors.deploy).toBeUndefined();
        expect(b.started).toEqual([HEAD]);
        expect(JSON.parse((await getCursor(store, "deploy")) ?? "{}")).toMatchObject({ tree: TREE });
        await run(
            store,
            gh(() => tree),
            b,
            NOW + 5 * MIN,
        );
        expect(b.started).toEqual([HEAD]);
        tree = "c".repeat(40);
        await run(
            store,
            gh(() => tree),
            b,
            NOW + 10 * MIN,
        );
        expect(b.started).toEqual([HEAD, HEAD]);
        expect(await store.get(sourceKey("deploy"))).toMatchObject({ lastOkAt: NOW + 10 * MIN });
    });

    it("does not start while the last build is still in progress", async () => {
        const store = new MemoryStore();
        await run(
            store,
            gh(() => TREE),
            builds(),
        );
        const b = builds({ status: "IN_PROGRESS" });
        await run(
            store,
            gh(() => "d".repeat(40)),
            b,
            NOW + 5 * MIN,
        );
        expect(b.started).toEqual([]);
    });

    it("records a StartBuild failure against the deploy source without failing the cycle", async () => {
        const store = new MemoryStore();
        const report = await run(
            store,
            gh(() => TREE),
            builds({ fail: true }),
        );
        expect(report.errors.deploy).toContain("AccessDenied");
        expect(await getCursor(store, "deploy")).toBeUndefined();
        expect(JSON.stringify(await store.get(sourceKey("deploy")))).toContain("AccessDenied");
    });

    it("retries a failed build of the same tree, then leaves the deploy source in error", async () => {
        const store = new MemoryStore();
        await run(
            store,
            gh(() => TREE),
            builds(),
        );
        const b = builds({ status: "FAILED" });
        const errors: (string | undefined)[] = [];
        for (let i = 1; i <= 3; i++)
            errors.push(
                (
                    await run(
                        store,
                        gh(() => TREE),
                        b,
                        NOW + i * 5 * MIN,
                    )
                ).errors.deploy,
            );
        expect(b.started).toEqual([HEAD, HEAD]);
        expect(errors[0]).toContain("attempt 2 started");
        expect(errors[2]).toContain("after 3 attempts");
        expect(JSON.stringify(await store.get(sourceKey("deploy")))).toContain("FAILED");
    });

    it("never starts again a build someone stopped, and reports the deploy source as failed", async () => {
        const store = new MemoryStore();
        await run(
            store,
            gh(() => TREE),
            builds(),
        );
        const b = builds({ status: "STOPPED" });
        const r = await run(
            store,
            gh(() => TREE),
            b,
            NOW + 5 * MIN,
        );
        expect(b.started).toEqual([]);
        expect(r.errors.deploy).toContain("STOPPED");
    });
});

describe("a merged pull request's last run", () => {
    it("is recorded for its pull request by a later cycle when the pull requests part failed (#3652)", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        let prsDown = true;
        // Run 40238975833 finished on a merged pull request: GitHub lists no pull request for it.
        const gql = fixture<{ data: { repository: { recent: { nodes: Record<string, unknown>[] } } } }>("gql-pr.json");
        const merged = gql.data.repository.recent.nodes.find((n) => n.mergedAt)!;
        gql.data.repository.recent.nodes.unshift({
            ...merged,
            number: 3600,
            headRefName: "ci/3418-design-studio-master-wait",
            headRefOid: "5a2ebfac75cc6510846149d8cc07b65d83f0ba0b",
            mergedAt: "2026-10-26T00:36:00Z",
            updatedAt: "2026-10-26T00:36:00Z",
        });
        fake.fetch = async (url, init) => {
            const u = new URL(url);
            if (u.searchParams.get("status") === "in_progress")
                return new Response(JSON.stringify({ total_count: 0, workflow_runs: [] }), { status: 200 });
            if (u.pathname === "/graphql" && String(init?.body).includes("pullRequests")) {
                if (prsDown) return new Response("{}", { status: 502 });
                return new Response(JSON.stringify(gql), { status: 200 });
            }
            return base(url, init);
        };
        const first = await collect(deps(store, fake));
        expect(first.errors["pull requests"]).toBeDefined();
        prsDown = false;
        await collect(deps(store, fake, NOW + 5 * MIN));
        const rec = await store.get({ pk: "PRRUNS#graphty-org/graphty-monorepo#3600", sk: "-" });
        expect(Object.keys((rec?.runs as object | undefined) ?? {})).toEqual(["40238975833.1"]);
    });

    it("is found by its commit when its pull request merged before the pull requests window (#3652)", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        const lookups: string[] = [];
        fake.fetch = async (url, init) => {
            const u = new URL(url);
            if (u.searchParams.get("status") === "in_progress")
                return new Response(JSON.stringify({ total_count: 0, workflow_runs: [] }), { status: 200 });
            if (u.pathname.endsWith("/commits/5a2ebfac75cc6510846149d8cc07b65d83f0ba0b/pulls")) {
                lookups.push(url);
                return new Response(
                    JSON.stringify([
                        { number: 3599, merged_at: "2026-10-26T00:10:00Z", head: { ref: "stacked/on-top" } },
                        {
                            number: 3601,
                            merged_at: "2026-10-26T00:20:00Z",
                            head: { ref: "ci/3418-design-studio-master-wait" },
                        },
                    ]),
                    {
                        status: 200,
                    },
                );
            }
            return base(url, init);
        };
        await collect(deps(store, fake));
        await collect(deps(store, fake, NOW + 5 * MIN));
        const rec = await store.get({ pk: "PRRUNS#graphty-org/graphty-monorepo#3601", sk: "-" });
        expect(Object.keys((rec?.runs as object | undefined) ?? {})).toEqual(["40238975833.1"]);
        expect(lookups).toHaveLength(1);
    });

    it("never fails the pull requests part on a failing commit lookup, and does not repeat a 422 (#3652)", async () => {
        const store = new MemoryStore();
        const fake = fakeGitHub({ coveralls: "2026-10-25T23:00:00Z" });
        const base = fake.fetch;
        let lookups = 0;
        fake.fetch = async (url, init) => {
            const u = new URL(url);
            if (u.searchParams.get("status") === "in_progress")
                return new Response(JSON.stringify({ total_count: 0, workflow_runs: [] }), { status: 200 });
            if (u.pathname.endsWith("/pulls") && u.pathname.includes("/commits/")) {
                lookups++;
                return new Response(JSON.stringify({ message: "No commit found for SHA" }), { status: 422 });
            }
            return base(url, init);
        };
        await collect(deps(store, fake));
        const second = await collect(deps(store, fake, NOW + 5 * MIN));
        await collect(deps(store, fake, NOW + 10 * MIN));
        expect(second.errors["pull requests"]).toBeUndefined();
        expect(lookups).toBe(1);
    });
});
