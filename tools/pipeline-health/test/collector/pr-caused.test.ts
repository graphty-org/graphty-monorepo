import { describe, expect, it } from "vitest";
import { GitHub } from "../../src/collector/github.js";
import { markPrCaused, touched } from "../../src/collector/pr-caused.js";
import { floorTo, rollKey, type RunItem, type TestItem } from "../../src/model/items.js";
import { METRICS } from "../../src/model/metrics.js";
import { putRaw } from "../../src/model/raw.js";
import { MemoryStore } from "../../src/model/store.js";

const NOW = Date.parse("2026-10-27T06:00:00Z");
const REPO = "graphty-org/graphty-monorepo";

const run = (runId: number, pr: number, extra: Partial<RunItem> = {}): RunItem => ({
    kind: "run",
    id: `${REPO}/${runId}`,
    attempt: 1,
    repo: REPO,
    runId,
    workflow: "ci.yml",
    event: "pull_request",
    branch: `fix/${pr}`,
    sha: "a".repeat(40),
    pr,
    status: "completed",
    conclusion: "failure",
    cause: "change",
    createdAt: NOW - 30 * 60_000,
    completedAt: NOW - 60_000,
    ...extra,
});

// A CI invocation id starts with the run id and attempt (ingest.ts ownId); files are repository paths.
const failed = (runId: number, file: string, name: string, attempt = 1): TestItem => ({
    kind: "test",
    id: `${runId}.${attempt}.graphty-element-browser-3#${file}#${name}`,
    attempt: 1,
    source: "ci",
    invocation: `${runId}.${attempt}.graphty-element-browser-3`,
    family: "graphty-element-browser",
    file,
    name,
    outcome: "failed",
    status: "fail",
    signature: "AssertionError: expected 2 to be 3",
    seenAt: NOW - 5 * 60_000,
});

/** A GitHub whose GraphQL answers each pull request's files, recording the queries. */
function filesGitHub(files: Record<number, string[]>) {
    const asked: string[] = [];
    const fetch = async (_url: string | URL | Request, init?: RequestInit) => {
        const { query } = JSON.parse(String(init?.body)) as { query: string };
        asked.push(query);
        const repository = Object.fromEntries(
            Object.entries(files).map(([n, f]) => [`p${n}`, { files: { nodes: f.map((path) => ({ path })) } }]),
        );
        return new Response(JSON.stringify({ data: { repository } }), { status: 200 });
    };
    return { gh: new GitHub(async () => "ghs_test", fetch as typeof globalThis.fetch), asked };
}

describe("touched", () => {
    it("is a changed test file, or a test in a package the change touched", () => {
        expect(touched("graphty-element/test/a.test.ts", ["graphty-element/test/a.test.ts"])).toBe(true);
        expect(touched("graphty-element/test/a.test.ts", ["graphty-element/src/Graph.ts"])).toBe(true);
        expect(touched("graphty-element/test/a.test.ts", ["layout/src/x.ts", "README.md"])).toBe(false);
        expect(touched("a.test.ts", ["b.ts"])).toBe(false);
    });
});

describe("markPrCaused", () => {
    it("marks a run red on a test in the package its change touched, in one GraphQL query", async () => {
        const store = new MemoryStore();
        await putRaw(
            store,
            [
                failed(101, "graphty-element/test/browser/node-style.test.ts", "applies the layer"),
                failed(102, "layout/test/forceatlas2.test.ts", "converges"), // pull request 2 changed only the app
            ],
            NOW,
        );
        const runs = [run(101, 1), run(102, 2), run(103, 3, { conclusion: "success", cause: undefined })];
        const { gh, asked } = filesGitHub({ 1: ["graphty-element/src/NodeStyle.ts"], 2: ["graphty/src/App.tsx"] });
        await markPrCaused(store, gh, REPO, runs, NOW);
        expect(runs.map((r) => r.prCaused)).toEqual([true, false, false]);
        expect(asked).toHaveLength(1);
    });

    it("leaves out flaky tests, shared failures and later attempts, without asking GitHub", async () => {
        const store = new MemoryStore();
        const file = "algorithms/test/dijkstra.test.ts";
        await putRaw(store, [failed(201, file, "is flaky"), failed(202, file, "only on attempt 2", 2)], NOW);
        const today = floorTo(NOW, "1d");
        const dims = { [JSON.stringify(["algorithms-default", file, "is flaky"])]: { n: 1, sum: 1 } };
        await store.put({
            ...rollKey("flaky.tests", "1d", today),
            metric: "flaky.tests",
            step: "1d",
            start: today,
            n: 1,
            sum: 1,
            dims,
        });
        const runs = [run(201, 4), run(202, 5), run(203, 6, { cause: "shared_check" })];
        const { gh, asked } = filesGitHub({});
        await markPrCaused(store, gh, REPO, runs, NOW);
        expect(runs.map((r) => r.prCaused)).toEqual([false, false, false]);
        expect(asked).toHaveLength(0);
    });

    it("judges no push, rerun, unfinished run or other workflow", async () => {
        const runs = [
            run(301, 7, { event: "push" }),
            run(302, 7, { attempt: 2 }),
            run(303, 7, { status: "in_progress", conclusion: undefined }),
            run(304, 7, { workflow: "hosts.yml" }),
        ];
        await markPrCaused(new MemoryStore(), filesGitHub({}).gh, REPO, runs, NOW);
        expect(runs.every((r) => r.prCaused === undefined)).toBe(true);
    });

    it("leaves runs unjudged when GitHub fails", async () => {
        const store = new MemoryStore();
        await putRaw(store, [failed(401, "graph-io/test/gml.test.ts", "parses")], NOW);
        const gh = new GitHub(async () => "ghs_test", (async () => new Response("", { status: 502 })) as typeof fetch);
        const runs = [run(401, 8)];
        await markPrCaused(store, gh, REPO, runs, NOW);
        expect(runs[0].prCaused).toBeUndefined();
    });
});

describe("pr.caused_failures metric", () => {
    it("counts judged runs only, red when caused", () => {
        const fold = METRICS.find((m) => m.id === "pr.caused_failures")!.from[0].fold as (r: RunItem) => unknown;
        expect(fold(run(1, 1, { prCaused: true }))).toEqual({ sum: 1 });
        expect(fold(run(1, 1, { prCaused: false }))).toEqual({ sum: 0 });
        expect(fold(run(1, 1))).toBeNull();
    });
});
