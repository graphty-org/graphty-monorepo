import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ciBudgets from "../../../ci-budgets.json" with { type: "json" };
import { FOLD_VERSION, METRICS } from "../src/model/metrics.ts";
import { setCursor } from "../src/model/raw.ts";
import { MemoryStore } from "../src/model/store.ts";

const ssmSend = vi.fn();
const docSend = vi.fn();
let mem = new MemoryStore();
vi.mock("@aws-sdk/client-ssm", () => ({
    SSMClient: class {
        send = ssmSend;
    },
    GetParameterCommand: class {
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    },
}));
vi.mock("@aws-sdk/lib-dynamodb", () => ({
    DynamoDBDocumentClient: { from: () => ({ send: docSend }) },
    PutCommand: class {
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    },
}));
vi.mock("../src/dynamo.ts", () => ({ dynamoStore: () => mem }));

const TOKEN = "s3cret";
const NOW = Date.UTC(2026, 9, 26, 1, 2, 3);

const CI_CLAIMS = {
    repository_owner: "graphty-org",
    repository: "graphty-org/graphty-monorepo",
    repository_id: "1122477634",
    event_name: "pull_request",
    run_id: "500",
    run_attempt: "1",
    sha: "abc",
    ref: "refs/pull/1/merge",
    job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/ci.yml@refs/pull/1/merge",
};

const event = (
    rawPath: string,
    body: unknown,
    { claims = CI_CLAIMS as Record<string, string>, auth }: { claims?: Record<string, string>; auth?: string } = {},
) =>
    ({
        rawPath,
        headers: auth ? { authorization: `Bearer ${auth}` } : {},
        pathParameters: { kind: rawPath.split("/").pop() },
        requestContext: { authorizer: { jwt: { claims, scopes: [] } } },
        body: typeof body === "string" ? body : JSON.stringify(body),
        isBase64Encoded: false,
    }) as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

const invocation = (over: Record<string, unknown> = {}) => ({
    id: "500.1.graphty-element-browser-3",
    sha: "abc",
    tree: "t",
    variant: "graphty-element-browser-3",
    inputs: "-",
    env: "ci",
    try: 1,
    startedAt: NOW - 600_000,
    secs: 300,
    outcome: "failed",
    files: [["a.test.ts", 3, 1, 0, 1200]],
    failures: [{ file: "a.test.ts", name: "draws", message: "expected 1\n at x" }],
    ...over,
});

async function ingest() {
    return (await import("../src/handlers/ingest.ts")).handler;
}

beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    mem = new MemoryStore();
    ssmSend.mockReset();
    ssmSend.mockResolvedValue({ Parameter: { Value: createHash("sha256").update(TOKEN).digest("hex") } });
});

describe("ingest: who may write", () => {
    it("refuses a body over 1 MB", async () => {
        const res = await (await ingest())(event("/v1/invocations", "x".repeat(1_000_001)));
        expect(res.statusCode).toBe(413);
    });

    it("refuses a token from another owner, repository or workflow", async () => {
        const h = await ingest();
        for (const over of [
            { repository_owner: "evil" },
            { repository: "graphty-org/other", repository_id: "1" },
            { repository_id: "1" },
            {
                event_name: "push",
                ref: "refs/heads/master",
                job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/evil.yml@refs/heads/master",
            },
            {
                event_name: "push",
                ref: "refs/heads/feature",
                job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/ci.yml@refs/heads/feature",
            },
        ]) {
            const res = await h(event("/v1/invocations", invocation(), { claims: { ...CI_CLAIMS, ...over } }));
            expect(res.statusCode, JSON.stringify(over)).toBe(403);
        }
        expect(mem.items.size).toBe(0);
    });

    it("refuses an id of another run and a pull request writing another commit", async () => {
        const h = await ingest();
        expect((await h(event("/v1/invocations", invocation({ id: "499.1.x" })))).statusCode).toBe(403);
        expect((await h(event("/v1/invocations", invocation({ sha: "def" })))).statusCode).toBe(403);
    });

    it("takes verdicts only from master's release.yml", async () => {
        const h = await ingest();
        const body = { sha: "abc", state: "red" };
        expect((await h(event("/v1/verdicts", body))).statusCode).toBe(403);
        const release = {
            ...CI_CLAIMS,
            event_name: "workflow_dispatch",
            ref: "refs/heads/master",
            job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/release.yml@refs/heads/master",
        };
        const res = await h(event("/v1/verdicts", body, { claims: release }));
        expect(res.statusCode).toBe(200);
    });

    it("records each verdict as red, green-clean and, for a green run, whether it met an unapproved picture", async () => {
        const h = await ingest();
        const release = {
            ...CI_CLAIMS,
            event_name: "workflow_dispatch",
            ref: "refs/heads/master",
            job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/release.yml@refs/heads/master",
        };
        const values = () =>
            Object.fromEntries(
                [...mem.items.values()].filter((i) => i.kind === "obs").map((i) => [String(i.id), i.value]),
            );
        await h(event("/v1/verdicts", { sha: "a1", state: "green-images" }, { claims: release }));
        await h(event("/v1/verdicts", { sha: "b2", state: "red" }, { claims: release }));
        await h(event("/v1/verdicts", { sha: "c3", state: "green-clean" }, { claims: release }));
        expect(values()).toEqual({
            "master.full_run_failed#a1": 0,
            "release.green_clean#a1": 0,
            "release.slot_unreviewed#a1": 1,
            "master.full_run_failed#b2": 1,
            "release.green_clean#b2": 0,
            "master.full_run_failed#c3": 0,
            "release.green_clean#c3": 1,
            "release.slot_unreviewed#c3": 0,
        });
    });

    it("checks the local token against its SHA-256 in SSM", async () => {
        const h = await ingest();
        const body = { rows: [{ id: "local.push.abc.1", at: NOW, exit: 0 }] };
        expect((await h(event("/v1/local/push-runs", body, { auth: TOKEN }))).statusCode).toBe(200);
        expect((await h(event("/v1/local/push-runs", body, { auth: "forged" }))).statusCode).toBe(401);
        expect((await h(event("/v1/local/push-runs", body))).statusCode).toBe(401);
        expect(ssmSend).toHaveBeenCalledTimes(1);
    });

    it("refuses local writes when the parameter is missing, and retries the lookup", async () => {
        ssmSend.mockReset();
        ssmSend.mockRejectedValueOnce(new Error("ParameterNotFound"));
        const h = await ingest();
        const body = { rows: [] };
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(401);
        ssmSend.mockResolvedValueOnce({ Parameter: { Value: createHash("sha256").update(TOKEN).digest("hex") } });
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(200);
    });

    it("refuses a local row whose id is not local", async () => {
        const h = await ingest();
        const res = await h(event("/v1/local/waits", { rows: [{ id: "500.1.x", end: NOW, ms: 5 }] }, { auth: TOKEN }));
        expect(res.statusCode).toBe(403);
    });
});

describe("ingest: benchmarks", () => {
    // ci.yml's Performance Benchmarks job in a full run: release.yml calls it on master.
    const full = (run: string) => ({
        ...CI_CLAIMS,
        event_name: "workflow_dispatch",
        run_id: run,
        ref: "refs/heads/master",
        job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/ci.yml@refs/heads/master",
    });
    // tools/results/post-benchmarks.mjs's body
    const body = (ms: number) => ({
        source: "algorithms",
        unit: "ms",
        sha: "abc",
        rows: [{ name: "PageRank n=1000", value: ms }],
    });

    it("keeps each benchmark's results, one per run, and refuses a pull request's", async () => {
        const h = await ingest();
        expect((await h(event("/v1/benchmarks", body(4)))).statusCode).toBe(403);
        expect((await h(event("/v1/benchmarks", body(4), { claims: full("600") }))).statusCode).toBe(200);
        expect((await h(event("/v1/benchmarks", body(5), { claims: full("601") }))).statusCode).toBe(200);
        // a retried post of run 601 replaces its own result
        expect((await h(event("/v1/benchmarks", body(6), { claims: full("601") }))).statusCode).toBe(200);
        const item = await mem.get({ pk: "BENCH", sk: "algorithms: PageRank n=1000" });
        expect(item?.points).toEqual([
            { at: NOW, v: 4, run: 600, sha: "abc" },
            { at: NOW, v: 6, run: 601, sha: "abc" },
        ]);
        expect(
            (
                await h(
                    event("/v1/benchmarks", { ...body(1), rows: [{ name: "x", value: -1 }] }, { claims: full("602") }),
                )
            ).statusCode,
        ).toBe(400);
    });
});

describe("ingest: what it stores", () => {
    it("stores a shard run and its failures, and a retried post replaces them", async () => {
        const h = await ingest();
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(200);
        const keys = () => [...mem.items.values()].filter((i) => i.pk.startsWith("R#")).map((i) => i.pk);
        expect(keys().sort()).toEqual([
            "R#shard_run#500.1.graphty-element-browser-3",
            "R#test#500.1.graphty-element-browser-3#a.test.ts#draws",
        ]);
        const before = mem.items.size;
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(200);
        expect(mem.items.size).toBe(before);
        const run = mem.items.get("R#shard_run#500.1.graphty-element-browser-3\u0000A#1");
        expect(run).toMatchObject({ family: "graphty-element-browser", bin: true, source: "ci" });
        expect([...mem.items.values()].some((i) => i.pk === "DIRTY")).toBe(true);
    });

    it("does not count a Story tests capture (the shots shape) as a pull request bin", async () => {
        const h = await ingest();
        const body = invocation({
            id: "500.1.graphty-storybook-shots",
            variant: "graphty-storybook-shots|flags=off|shots",
        });
        expect((await h(event("/v1/invocations", body))).statusCode).toBe(200);
        const run = mem.items.get("R#shard_run#500.1.graphty-storybook-shots\u0000A#1");
        expect(run).toMatchObject({ bin: false, source: "ci" });
    });

    it("answers 400 when DynamoDB refuses a row's content, so the local collector splits and skips it", async () => {
        const h = await ingest();
        const refused = Object.assign(new Error("Item size has exceeded the maximum allowed size"), {
            name: "ValidationException",
        });
        vi.spyOn(mem, "get").mockRejectedValue(refused);
        const res = await h(event("/v1/invocations", invocation()));
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(String(res.body)).code).toBe("row_refused");
        vi.spyOn(mem, "get").mockRejectedValue(new Error("ProvisionedThroughputExceededException"));
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(500);
        // Our own bug (a key that does not match the schema) is not the row's fault: 500, retried.
        const schema = Object.assign(new Error("The provided key element does not match the schema"), {
            name: "ValidationException",
        });
        vi.spyOn(mem, "get").mockRejectedValue(schema);
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(500);
        // An expression over its size limit is our own update's fault too: 500.
        const expr = Object.assign(new Error("Expression size has exceeded the maximum allowed size"), {
            name: "ValidationException",
        });
        vi.spyOn(mem, "get").mockRejectedValue(expr);
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(500);
    });

    it("refuses an oversized row before charging the quota or writing anything", async () => {
        const h = await ingest();
        const longName = { failures: [{ file: "a.test.ts", name: "x".repeat(3000), message: "m" }] };
        const res = await h(event("/v1/invocations", invocation(longName)));
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(String(res.body)).code).toBe("row_refused");
        // An id under the size check but over the 1024-byte sort key of its copies is refused too.
        const midName = { failures: [{ file: "a.test.ts", name: "y".repeat(1000), message: "m" }] };
        expect((await h(event("/v1/invocations", invocation(midName)))).statusCode).toBe(400);
        const files = Array.from({ length: 4000 }, (_, i) => [`${"f".repeat(80)}${i}.test.ts`, 1, 1, 0, 1]);
        expect((await h(event("/v1/invocations", invocation({ files })))).statusCode).toBe(400);
        expect(mem.items.size).toBe(0);
    });

    it("refuses a row with a fractional try as content (400), not as an outage", async () => {
        const h = await ingest();
        const res = await h(event("/v1/invocations", { ...invocation(), try: 1.5 }));
        expect(res.statusCode).toBe(400);
        expect(mem.items.size).toBe(0);
    });

    it("takes durations from the site repositories and only durations", async () => {
        const h = await ingest();
        const site = {
            repository_owner: "graphty-org",
            repository: "graphty-org/graphty-nightly",
            repository_id: "1433424324",
            event_name: "push",
            run_id: "700",
            run_attempt: "1",
            ref: "refs/heads/main",
            job_workflow_ref: "graphty-org/graphty-nightly/.github/workflows/deploy.yml@refs/heads/main",
        };
        const rows = [{ workflow: "deploy.yml", job: "deploy", ms: 9000, runId: 700, attempt: 1 }];
        const res = await h(event("/v1/durations", { rows }, { claims: site }));
        expect(res.statusCode).toBe(200);
        expect([...mem.items.values()].find((i) => i.kind === "step")?.repo).toBe("graphty-org/graphty-nightly");
        // A site deploy's timings never make ci-results look fresh.
        const sources = [...mem.items.values()].map((i) => i.source).filter(Boolean);
        expect(sources).toContain("site");
        expect(sources).not.toContain("ci-results");
        expect((await h(event("/v1/invocations", invocation(), { claims: site }))).statusCode).toBe(403);
        // A repository claiming a site repository's id under another name is refused.
        const fake = { ...site, repository: "graphty-org/evil" };
        expect((await h(event("/v1/durations", { rows }, { claims: fake }))).statusCode).toBe(403);
        // Only the default branch deploys: a pull request's or another branch's workflow is refused.
        const pr = { ...site, event_name: "pull_request", ref: "refs/pull/3/merge" };
        expect((await h(event("/v1/durations", { rows }, { claims: pr }))).statusCode).toBe(403);
        const branch = { ...site, ref: "refs/heads/feature" };
        expect((await h(event("/v1/durations", { rows }, { claims: branch }))).statusCode).toBe(403);
        // Only deploy.yml: another default-branch workflow (pull_request_target, workflow_run) is refused.
        const other = {
            ...site,
            job_workflow_ref: "graphty-org/graphty-nightly/.github/workflows/triage.yml@refs/heads/main",
        };
        expect((await h(event("/v1/durations", { rows }, { claims: other }))).statusCode).toBe(403);
    });

    it("records the site deploy-pages.yml built, from that workflow on master only", async () => {
        const h = await ingest();
        const pages = {
            ...CI_CLAIMS,
            event_name: "workflow_run",
            ref: "refs/heads/master",
            job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/deploy-pages.yml@refs/heads/master",
        };
        const sha = "a".repeat(40);
        expect((await h(event("/v1/sites", { sha }, { claims: pages }))).statusCode).toBe(200);
        expect(mem.items.get(`SITE\u0000${sha}`)).toMatchObject({ sha, builtAt: NOW, runId: 500 });
        expect((await h(event("/v1/sites", { sha: "nope" }, { claims: pages }))).statusCode).toBe(400);
        expect((await h(event("/v1/sites", { sha }))).statusCode).toBe(403);
        expect((await h(event("/v1/invocations", invocation(), { claims: pages }))).statusCode).toBe(403);
    });

    it("judges a stored full-run shard by its ci-budgets.json budget, and a pull request bin not at all", async () => {
        const h = await ingest();
        const full = {
            ...CI_CLAIMS,
            event_name: "workflow_call",
            ref: "refs/heads/master",
            job_workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/release.yml@refs/heads/master",
        };
        const passed = invocation({ outcome: "passed" });
        delete (passed as Record<string, unknown>).failures;
        expect((await h(event("/v1/invocations", passed, { claims: full }))).statusCode).toBe(200);
        await h(event("/v1/invocations", invocation({ id: "500.1.x" })));
        const fold = METRICS.find((m) => m.id === "ci.full_shard_time")!.from[0].fold as (i: unknown) => unknown;
        const budgetMs = ciBudgets.budgets["job:ci.yml:Test (*)"].minutes * 60_000;
        const stored = mem.items.get("R#shard_run#500.1.graphty-element-browser-3\u0000A#1");
        expect(stored).toMatchObject({ full: true });
        expect(fold(stored)).toMatchObject({ sum: budgetMs });
        expect(fold(mem.items.get("R#shard_run#500.1.x\u0000A#1"))).toBeNull();
    });

    it("marks failures flaky when the CI writer says so, whatever the shard's outcome", async () => {
        const h = await ingest();
        // tools/results/run-group.mjs posts test-quarantine.mjs's flaky verdict for try 1, before or after its record.
        const body = {
            invocation: "500.1.test.compact-mantine-2.1",
            flaky: true,
            family: "compact-mantine",
            sha: "abc",
            failures: [{ file: "c.ts", name: "u", message: "boom" }],
        };
        expect((await h(event("/v1/failures", body))).statusCode).toBe(200);
        const id = "R#test#500.1.test.compact-mantine-2.1#c.ts#u\u0000A#1";
        expect(mem.items.get(id)).toMatchObject({
            outcome: "flaky",
            source: "ci",
            family: "compact-mantine",
            file: "c.ts",
            name: "u",
        });
        // try 1's own record, a failed run with the same failure, never turns it back to failed
        const try1 = invocation({
            id: "500.1.test.compact-mantine-2.1",
            variant: "compact-mantine",
            failures: body.failures,
        });
        await h(event("/v1/invocations", try1));
        expect(mem.items.get(id)?.outcome).toBe("flaky");
    });

    it("marks failures flaky when their shard passed", async () => {
        const h = await ingest();
        // As the CI writers send them: each try under its own id, `<base>.<try>`; try 1 failed, try 2 passed.
        const fail = {
            invocation: "500.1.test.compact-mantine.1",
            failures: [{ file: "b.ts", name: "t", message: "x" }],
        };
        await h(event("/v1/failures", fail));
        const id = "R#test#500.1.test.compact-mantine.1#b.ts#t\u0000A#1";
        expect(mem.items.get(id)?.outcome).toBe("failed");
        const passed = invocation({
            id: "500.1.test.compact-mantine.2",
            try: 2,
            variant: "compact-mantine",
            outcome: "passed",
        });
        // As tools/results/run-group.mjs sends a passing run: an empty failures list.
        (passed as Record<string, unknown>).failures = [];
        await h(event("/v1/invocations", passed));
        expect(mem.items.get(id)).toMatchObject({ outcome: "flaky", family: "compact-mantine" });
        // Try 1's own record, arriving after try 2's, never turns it back to failed.
        const try1 = invocation({
            id: "500.1.test.compact-mantine.1",
            variant: "compact-mantine",
            failures: fail.failures,
        });
        expect((await h(event("/v1/invocations", try1))).statusCode).toBe(200);
        expect(mem.items.get(id)?.outcome).toBe("flaky");
    });

    it("keeps a dependency-bump pull request's failures out of the flaky readings (#4147)", async () => {
        const h = await ingest();
        const flakyFolds = ["flaky.tests", "flaky.rate"].map(
            (m) =>
                METRICS.find((d) => d.id === m)!.from.find((f) => f.kind === "test")!.fold as (i: unknown) => unknown,
        );
        for (const [head_ref, n, bump] of [
            ["dependabot/npm_and_yarn/vite-8.1.6", "601", true],
            ["chore/deps-refresh-graphty-v1", "602", true],
            ["fix/1234-topic", "603", false],
        ] as const) {
            const claims = { ...CI_CLAIMS, head_ref, run_id: n };
            // try 1 failed, try 2 passed: flaky by the shard's own retry.
            await h(event("/v1/invocations", invocation({ id: `${n}.1.layout.1`, variant: "layout" }), { claims }));
            const passed = invocation({ id: `${n}.1.layout.2`, try: 2, variant: "layout", outcome: "passed" });
            (passed as Record<string, unknown>).failures = [];
            await h(event("/v1/invocations", passed, { claims }));
            const test = mem.items.get(`R#test#${n}.1.layout.1#a.test.ts#draws\u0000A#1`);
            expect(test?.outcome).toBe("flaky");
            expect(test?.bump, head_ref).toBe(bump ? true : undefined);
            for (const fold of flakyFolds) expect(fold(test) === null, head_ref).toBe(bump);
        }
    });

    it("marks an earlier try's failure flaky when the passing try lists another failure", async () => {
        const h = await ingest();
        const fail = {
            invocation: "500.1.test.layout.1",
            failures: [
                { file: "a.ts", name: "flaky", message: "x" },
                { file: "q.ts", name: "quarantined", message: "x" },
            ],
        };
        await h(event("/v1/failures", fail));
        const passed = invocation({
            id: "500.1.test.layout.2",
            try: 2,
            variant: "layout",
            outcome: "passed",
        });
        (passed as Record<string, unknown>).failures = [{ file: "q.ts", name: "quarantined", message: "x" }];
        await h(event("/v1/invocations", passed));
        expect(mem.items.get("R#test#500.1.test.layout.1#a.ts#flaky\u0000A#1")?.outcome).toBe("flaky");
    });

    it("finds a failing try's failures from its invocation post alone, when the failures post was lost", async () => {
        const h = await ingest();
        const try1 = invocation({
            id: "500.1.test.layout.1",
            variant: "layout",
            failures: [{ file: "a.ts", name: "t", message: "x" }],
        });
        await h(event("/v1/invocations", try1));
        const passed = invocation({ id: "500.1.test.layout.2", try: 2, variant: "layout", outcome: "passed" });
        (passed as Record<string, unknown>).failures = [];
        await h(event("/v1/invocations", passed));
        expect(mem.items.get("R#test#500.1.test.layout.1#a.ts#t\u0000A#1")?.outcome).toBe("flaky");
    });

    it("stores a test listed twice in one post with one write", async () => {
        const h = await ingest();
        const twice = [1, 2].map(() => ({ file: "a.ts", name: "same", message: "x" }));
        const transact = vi.spyOn(mem, "transact");
        const post = invocation({ id: "500.1.test.layout.1", variant: "layout", failures: twice });
        expect((await h(event("/v1/invocations", post))).statusCode).toBe(200);
        expect(transact).toHaveBeenCalledTimes(1);
    });

    it("reads each failure of a failing try once, not once more to check for a flaky verdict", async () => {
        const h = await ingest();
        const failures = Array.from({ length: 40 }, (_, i) => ({ file: "a.ts", name: `t${i}`, message: "x" }));
        const get = vi.spyOn(mem, "get");
        await h(event("/v1/invocations", invocation({ id: "500.1.test.layout.1", variant: "layout", failures })));
        const testReads = get.mock.calls.filter(([k]) => k.pk.startsWith("R#test#")).length;
        get.mockRestore();
        expect(testReads).toBe(40);
    });

    it("caps a failing try by its rows, not its bookkeeping copies, and stores the rest when one test write fails", async () => {
        const h = await ingest();
        const failures = Array.from({ length: 3000 }, (_, i) => ({ file: "a.ts", name: `t${i}`, message: "x" }));
        const big = invocation({ id: "500.1.test.layout.1", variant: "layout", failures });
        expect((await h(event("/v1/invocations", big))).statusCode).toBe(200);
        mem = new MemoryStore();
        vi.resetModules();
        const h2 = await ingest();
        vi.spyOn(mem, "transact").mockRejectedValueOnce(new Error("throttled"));
        const two = invocation({ id: "500.1.test.layout.1", variant: "layout", failures: failures.slice(0, 2) });
        expect((await h2(event("/v1/invocations", two))).statusCode).toBe(500);
        expect(mem.items.get("R#shard_run#500.1.test.layout.1\u0000A#1")).toBeDefined();
        expect([...mem.items.keys()].some((k) => k.startsWith("DIRTY"))).toBe(true);
        expect([...mem.items.values()].filter((i) => i.pk.startsWith("R#test#"))).toHaveLength(1);
        // Its failures are remembered for a passing retry even though one test write failed.
        expect(await mem.query("INVTESTS#500.1.test.layout.1")).toHaveLength(2);
    });

    it("keeps flaky when try 1 and try 2 arrive at the same moment, in every row of the test", async () => {
        for (const order of [0, 1]) {
            mem = new MemoryStore();
            vi.resetModules();
            const h = await ingest();
            const fail = { invocation: "500.1.test.layout.1", failures: [{ file: "a.ts", name: "t", message: "x" }] };
            await h(event("/v1/failures", fail));
            const try1 = invocation({ id: "500.1.test.layout.1", variant: "layout", failures: fail.failures });
            const try2 = invocation({ id: "500.1.test.layout.2", try: 2, variant: "layout", outcome: "passed" });
            (try2 as Record<string, unknown>).failures = [];
            const posts = [event("/v1/invocations", try1), event("/v1/invocations", try2)];
            if (order) posts.reverse();
            await Promise.all(posts.map((e) => h(e)));
            // A late failures post for try 1 does not turn it back either.
            await h(event("/v1/failures", fail));
            const rows = [...mem.items.values()].filter(
                (i) => i.id === "500.1.test.layout.1#a.ts#t" && !i.pk.startsWith("INVTESTS#"),
            );
            expect(rows.length).toBeGreaterThan(1);
            expect(rows.map((r) => r.outcome)).toEqual(rows.map(() => "flaky"));
        }
    });

    it("answers 429 past the daily write budget and writes nothing", async () => {
        const { DAILY_ROW_LIMIT, quotaKey } = await import("../src/model/items.ts");
        mem.items.set(`${quotaKey(NOW).pk}\u0000-`, { ...quotaKey(NOW), rows: DAILY_ROW_LIMIT });
        const res = await (await ingest())(event("/v1/invocations", invocation()));
        expect(res.statusCode).toBe(429);
        expect([...mem.items.keys()].filter((k) => k.startsWith("R#"))).toEqual([]);
    });

    it("refuses more than 5000 rows", async () => {
        const rows = Array.from({ length: 5001 }, (_, i) => ({ id: `local.wait.x.${i}`, end: NOW, ms: 1 }));
        const res = await (await ingest())(event("/v1/local/waits", { rows }, { auth: TOKEN }));
        expect(res.statusCode).toBe(413);
    });
});

describe("recompute and read", () => {
    it("serves a test slot's hold as a local run and local shard time, by what ran", async () => {
        const h = await ingest();
        const held = {
            id: "local.held.test-slot-held.2026-10-29T16:05:38.542Z.1233520",
            at: NOW - 60_000,
            startedAt: NOW - 3 * 60_000,
            exit: 1,
            what: "graphty-element",
        };
        expect((await h(event("/v1/local/push-runs", { rows: [held] }, { auth: TOKEN }))).statusCode).toBe(200);
        const bad = { ...held, id: "local.held.x", what: "a b/../c" };
        expect((await h(event("/v1/local/push-runs", { rows: [bad] }, { auth: TOKEN }))).statusCode).toBe(400);

        const { recomputeAll } = await import("../src/recompute.ts");
        await setCursor(mem, "fold-version", FOLD_VERSION, NOW);
        await recomputeAll(mem, NOW, { getSecret: vi.fn(async () => undefined), fetch: vi.fn() });
        const { handler: read } = await import("../src/handlers/read.ts");
        const page = JSON.parse((await read(event("/v1/page/local", "", {}) as never)).body!);
        const runs = page.sections.find((s: { id: string }) => s.id === "runs");
        expect(runs.groups[0].items[0]).toMatchObject({ label: { t: "name", v: "graphty-element" }, n: 1 });
        const time = page.sections.find((s: { id: string }) => s.id === "shard-time");
        expect(time.groups[0].items[0]).toMatchObject({ label: { t: "name", v: "graphty-element" } });
        expect(page.members.find((m: { id: string }) => m.id === "local-runs.shard_time").n).toBe(1);
        expect(page.members.find((m: { id: string }) => m.id === "local-runs.local_vs_ci").n).toBe(1);
    });

    it("serves a local post on /v1/page/local after the next recompute", async () => {
        const h = await ingest();
        const rows = [
            { ...invocation({ id: "local.1-2-layout", variant: "layout", outcome: "passed" }), failures: undefined },
        ];
        expect((await h(event("/v1/local/invocations", { rows }, { auth: TOKEN }))).statusCode).toBe(200);
        await h(
            event(
                "/v1/local/push-runs",
                { rows: [{ id: "local.push.abc.1", at: NOW - 60_000, exit: 1 }] },
                { auth: TOKEN },
            ),
        );
        await h(
            event(
                "/v1/local/waits",
                { rows: [{ id: "local.wait.test-slot.1.9", end: NOW - 60_000, ms: 90_000 }] },
                { auth: TOKEN },
            ),
        );

        const { recomputeAll } = await import("../src/recompute.ts");
        // A table already folded at this version: the cycle's only marks are the post's.
        await setCursor(mem, "fold-version", FOLD_VERSION, NOW);
        const getSecret = vi.fn(async () => undefined);
        const done = await recomputeAll(mem, NOW, { getSecret, fetch: vi.fn() });
        expect(done.pages).toBeGreaterThan(30);
        // sendAlerts ran on the cycle's evaluation: it asked for the Pushover secrets and found none.
        expect(getSecret).toHaveBeenCalledWith("/graphty-health/pushover/app-token");
        expect(done.alerts.state).toBe("not set up");
        expect([...mem.items.values()].some((i) => i.pk === "DIRTY")).toBe(false);

        const { handler: read } = await import("../src/handlers/read.ts");
        const res = await read(event("/v1/page/local", "", {}) as never);
        expect(res.statusCode).toBe(200);
        expect(res.headers?.["cache-control"]).toBe("public, max-age=60");
        const page = JSON.parse(res.body!);
        expect(page).toMatchObject({ page: "local-runs", range: "1h", generated: new Date(NOW).toISOString() });
        const time = page.members.find((m: { id: string }) => m.id === "local-runs.shard_time");
        expect(time.value).toMatchObject({ unit: "min" });
        expect(time.n).toBe(1);
        const waits = page.members.find((m: { id: string }) => m.id === "local-runs.slot_waits");
        expect(waits.n).toBe(1);
        const runs = page.sections.find((s: { id: string }) => s.id === "runs");
        expect(runs.kind).toBe("bars");
        expect(runs.groups[0].items[0]).toMatchObject({ label: { t: "name", v: "gate" }, n: 1 });

        // The canonical route and an explicit range serve the same views item.
        const canon = await read({
            ...event("/v1/page/local-runs", "", {}),
            queryStringParameters: { range: "1h" },
        } as never);
        expect(canon.statusCode).toBe(200);
        expect(JSON.parse(canon.body!)).toEqual(page);
        const { readViewJson } = await import("../src/views/index.ts");
        expect(await readViewJson(mem, { kind: "page", page: "local-runs", range: "1h" })).toEqual(page);

        const gz = await read({ ...event("/v1/status", "", {}), headers: { "accept-encoding": "gzip, br" } } as never);
        expect(gz.headers?.["content-encoding"]).toBe("gzip");
        const status = JSON.parse(gunzipSync(Buffer.from(gz.body!, "base64")).toString("utf8"));
        expect(status.categories.map((c: { id: string }) => c.id)).toEqual([
            "master",
            "pull-requests",
            "ci",
            "flaky",
            "releases",
            "costs",
            "data-sources",
        ]);
    });

    it("answers no_data before the first recompute, and 4xx for unknown routes", async () => {
        const { handler: read } = await import("../src/handlers/read.ts");
        const none = await read(event("/v1/page/master", "", {}) as never);
        expect(none.statusCode).toBe(503);
        expect(JSON.parse(none.body!)).toEqual({ code: "no_data" });
        expect((await read(event("/v1/page/nope", "", {}) as never)).statusCode).toBe(404);
        expect(
            (await read({ ...event("/v1/page/master", "", {}), queryStringParameters: { range: "9d" } } as never))
                .statusCode,
        ).toBe(400);
        expect((await read(event("/v1/health", "", {}) as never)).statusCode).toBe(200);
    });
});

describe("drill-down routes", () => {
    it("answers /v1/test-history from what ingest stored, and /v1/run/<id> from the run index", async () => {
        const h = await ingest();
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(200);
        const { handler: read } = await import("../src/handlers/read.ts");
        const get = async (rawPath: string, q: Record<string, string>) =>
            read({ ...event(rawPath, "", {}), queryStringParameters: q } as never);
        const res = await get("/v1/test-history", { file: "a.test.ts", test: "draws", range: "7d" });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body as string)).toMatchObject({
            file: "a.test.ts",
            family: "graphty-element-browser",
            events: [{ kind: "pr", run: 500, attempt: 1, sha: "abc", outcome: "failed" }],
        });
        expect((await get("/v1/test-history", {})).statusCode).toBe(400);
        expect((await get("/v1/test-history", { file: "a.test.ts", range: "1h" })).statusCode).toBe(400);
        expect((await get("/v1/test-history", { file: "none.test.ts" })).statusCode).toBe(503);

        expect((await get("/v1/run/123", {})).statusCode).toBe(503);
        const { putRaw } = await import("../src/model/raw.ts");
        const at = NOW - 600_000;
        await putRaw(
            mem,
            [
                {
                    kind: "run",
                    id: "o/r/123",
                    attempt: 1,
                    repo: "o/r",
                    runId: 123,
                    workflow: "ci.yml",
                    event: "push",
                    branch: "master",
                    sha: "abc",
                    status: "completed",
                    conclusion: "failure",
                    createdAt: at,
                },
                {
                    kind: "job",
                    id: "o/r/9",
                    attempt: 1,
                    repo: "o/r",
                    runId: 123,
                    workflow: "ci.yml",
                    name: "Build",
                    pool: "linux_windows",
                    status: "completed",
                    conclusion: "failure",
                    createdAt: at,
                    startedAt: at + 1000,
                    completedAt: at + 2000,
                },
            ],
            NOW,
        );
        const run = await get("/v1/run/123", {});
        expect(run.statusCode).toBe(200);
        expect(JSON.parse(run.body as string)).toMatchObject({
            id: 123,
            conclusion: "failure",
            jobs: [
                {
                    name: "Build",
                    conclusion: "failure",
                    started: new Date(at + 1000).toISOString().replace(".000", ""),
                },
            ],
        });
    });
});

// The collector handler's tests are in test/collector/handler.test.ts.
