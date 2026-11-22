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
    { claims = CI_CLAIMS, auth }: { claims?: Record<string, string>; auth?: string } = {},
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

    it("refuses local writes when the parameter is missing or blank, and retries the lookup", async () => {
        const hash = { Parameter: { Value: createHash("sha256").update(TOKEN).digest("hex") } };
        ssmSend.mockReset();
        ssmSend.mockRejectedValueOnce(Object.assign(new Error("gone"), { name: "ParameterNotFound" }));
        ssmSend.mockResolvedValueOnce({ Parameter: { Value: "  " } });
        ssmSend.mockResolvedValueOnce(hash);
        const h = await ingest();
        const body = { rows: [] };
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(401);
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(401);
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(200);
        expect(ssmSend).toHaveBeenCalledTimes(3);
    });

    it("answers 500, not 401, when SSM fails, and reads SSM again next time", async () => {
        ssmSend.mockRejectedValueOnce(Object.assign(new Error("slow down"), { name: "ThrottlingException" }));
        const h = await ingest();
        const body = { rows: [] };
        const res = await h(event("/v1/local/waits", body, { auth: TOKEN }));
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(String(res.body))).toEqual({ code: "internal" });
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(200);
    });

    it("re-reads the hash after five minutes, so a rotated token reaches a warm container", async () => {
        const h = await ingest();
        const body = { rows: [] };
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(200);
        ssmSend.mockResolvedValue({ Parameter: { Value: createHash("sha256").update("rotated").digest("hex") } });
        vi.setSystemTime(NOW + 5 * 60_000 - 1);
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(200);
        vi.setSystemTime(NOW + 5 * 60_000);
        expect((await h(event("/v1/local/waits", body, { auth: TOKEN }))).statusCode).toBe(401);
        expect((await h(event("/v1/local/waits", body, { auth: "rotated" }))).statusCode).toBe(200);
        expect(ssmSend).toHaveBeenCalledTimes(2);
    });

    it("records a grouping-ledger reading as observations, under its own source", async () => {
        const h = await ingest();
        const row = {
            id: "local.grouping.2026-11-16T19:41:04.377Z",
            at: NOW - 60_000,
            issuesPerMergedPr: 1.09,
            multiFixShare: 0.155,
            releasedShare: 0.003,
            ready: 16,
            combinable: 0,
            combinableBranches: 0,
        };
        expect((await h(event("/v1/local/grouping", { rows: [row] }, { auth: TOKEN }))).statusCode).toBe(200);
        const values = Object.fromEntries(
            [...mem.items.values()].filter((i) => i.kind === "obs").map((i) => [String(i.metric), i.value]),
        );
        expect(values).toEqual({
            "issues.per_merged_pr": 1.09,
            "issues.multi_issue_share": 0.155,
            "issues.group_released_share": 0.003,
            "issues.groups_ready": 16,
            "issues.groups_combinable": 0,
            "issues.groups_combinable_branches": 0,
        });
        expect([...mem.items.values()].some((i) => i.pk === "META#source#grouping-ledger")).toBe(true);
        const bad = { ...row, ready: "16" };
        expect((await h(event("/v1/local/grouping", { rows: [bad] }, { auth: TOKEN }))).statusCode).toBe(400);
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
        machine: "AMD EPYC 7763 64-Core Processor",
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
            { at: NOW, v: 4, run: 600, sha: "abc", machine: "AMD EPYC 7763 64-Core Processor" },
            { at: NOW, v: 6, run: 601, sha: "abc", machine: "AMD EPYC 7763 64-Core Processor" },
        ]);
        expect(
            (
                await h(
                    event("/v1/benchmarks", { ...body(1), rows: [{ name: "x", value: -1 }] }, { claims: full("602") }),
                )
            ).statusCode,
        ).toBe(400);
        // a row may name its input, kept on its point
        const seeded = { ...body(7), rows: [{ name: "PageRank n=1000", value: 7, input: "3fa2c1d0e9b8" }] };
        expect((await h(event("/v1/benchmarks", seeded, { claims: full("603") }))).statusCode).toBe(200);
        const after = await mem.get({ pk: "BENCH", sk: "algorithms: PageRank n=1000" });
        expect((after?.points as { input?: string }[]).at(-1)?.input).toBe("3fa2c1d0e9b8");
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
        // Taken and checked, but no step row stored: nothing reads one (#6813). The answer is the results service's.
        expect(JSON.parse(res.body as string)).toEqual({ stored: 1, kind: "deploy", trend: [], lastSeen: {} });
        expect([...mem.items.values()].some((i) => i.kind === "step")).toBe(false);
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
        for (const [headRef, n, bump] of [
            ["dependabot/npm_and_yarn/vite-8.1.6", "601", true],
            ["chore/deps-refresh-graphty-v1", "602", true],
            ["fix/1234-topic", "603", false],
        ] as const) {
            const claims = { ...CI_CLAIMS, head_ref: headRef, run_id: n };
            // try 1 failed, try 2 passed: flaky by the shard's own retry.
            await h(event("/v1/invocations", invocation({ id: `${n}.1.layout.1`, variant: "layout" }), { claims }));
            const passed = invocation({ id: `${n}.1.layout.2`, try: 2, variant: "layout", outcome: "passed" });
            (passed as Record<string, unknown>).failures = [];
            await h(event("/v1/invocations", passed, { claims }));
            const test = mem.items.get(`R#test#${n}.1.layout.1#a.test.ts#draws\u0000A#1`);
            expect(test?.outcome).toBe("flaky");
            expect(test?.bump, headRef).toBe(bump ? true : undefined);
            for (const fold of flakyFolds) {
                expect(fold(test) === null, headRef).toBe(bump);
            }
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
            if (order) {
                posts.reverse();
            }
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
        await recomputeAll(mem, NOW, { getSecret: vi.fn(() => Promise.resolve(undefined)), fetch: vi.fn() });
        const { handler: read } = await import("../src/handlers/read.ts");
        const page = JSON.parse((await read(event("/v1/page/local", "", {}))).body!);
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
        const getSecret = vi.fn(() => Promise.resolve(undefined));
        const done = await recomputeAll(mem, NOW, { getSecret, fetch: vi.fn() });
        expect(done.pages).toBeGreaterThan(30);
        // sendAlerts ran on the cycle's evaluation: it asked for the Pushover secrets and found none.
        expect(getSecret).toHaveBeenCalledWith("/graphty-health/pushover/app-token");
        expect(done.alerts.state).toBe("not set up");
        expect([...mem.items.values()].some((i) => i.pk === "DIRTY")).toBe(false);

        const { handler: read } = await import("../src/handlers/read.ts");
        const res = await read(event("/v1/page/local", "", {}));
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
        });
        expect(canon.statusCode).toBe(200);
        expect(JSON.parse(canon.body!)).toEqual(page);
        const { readViewJson } = await import("../src/views/index.ts");
        expect(await readViewJson(mem, { kind: "page", page: "local-runs", range: "1h" })).toEqual(page);

        const gz = await read({ ...event("/v1/status", "", {}), headers: { "accept-encoding": "gzip, br" } });
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

    it("routes Issues at 28d by default, 1h to 7d or all, and refuses its page any other range", async () => {
        const { routeOf } = await import("../src/handlers/read.ts");
        expect(routeOf("/v1/page/issues", {})).toEqual({ kind: "page", page: "issues", range: "28d" });
        expect(routeOf("/v1/page/issues", { range: "all" })).toEqual({ kind: "page", page: "issues", range: "all" });
        expect(routeOf("/v1/page/issues", { range: "1h" })).toEqual({ kind: "page", page: "issues", range: "1h" });
        expect(routeOf("/v1/page/issues", { range: "24h" })).toEqual({ status: 400, code: "bad_range" });
        expect(routeOf("/v1/page/costs", {})).toEqual({ kind: "page", page: "costs", range: "7d" });
        expect(routeOf("/v1/page/master", { range: "all" })).toEqual({ status: 400, code: "bad_range" });
        expect(routeOf("/v1/page/overview", {})).toEqual({ kind: "page", page: "overview", range: "1h" });
        expect(routeOf("/v1/page/overview/x", {})).toEqual({ status: 404, code: "unknown_section" });
    });

    it("answers no_data before the first recompute, and 4xx for unknown routes", async () => {
        const { handler: read } = await import("../src/handlers/read.ts");
        const none = await read(event("/v1/page/master", "", {}));
        expect(none.statusCode).toBe(503);
        expect(JSON.parse(none.body!)).toEqual({ code: "no_data" });
        expect((await read(event("/v1/page/nope", "", {}) as never)).statusCode).toBe(404);
        expect(
            (await read({ ...event("/v1/page/master", "", {}), queryStringParameters: { range: "9d" } })).statusCode,
        ).toBe(400);
        expect((await read(event("/v1/health", "", {}) as never)).statusCode).toBe(200);
    });
});

describe("drill-down routes", () => {
    it("serves a hotspot's /flaky/test link at /v1/page/flaky/test, with each event's run, job, commit and pictures", async () => {
        const h = await ingest();
        const id = "500.1.stories.graphty-element-stories-2.1";
        const first = "a".repeat(64);
        const second = "b".repeat(64);
        const post = {
            invocation: id,
            flaky: true,
            family: "graphty-element-stories",
            failures: [
                {
                    file: "s.stories.ts",
                    name: "Zoomed",
                    message: "visual-review: z.png is unstable",
                    pictures: [first, second],
                },
            ],
        };
        expect((await h(event("/v1/failures", post))).statusCode).toBe(200);
        const { putRaw } = await import("../src/model/raw.ts");
        await putRaw(
            mem,
            [
                {
                    kind: "run",
                    id: "graphty-org/graphty-monorepo/500",
                    attempt: 1,
                    repo: "graphty-org/graphty-monorepo",
                    runId: 500,
                    workflow: "ci.yml",
                    event: "pull_request",
                    branch: "b",
                    sha: "abc",
                    pr: 9,
                    status: "completed",
                    conclusion: "success",
                    createdAt: NOW - 600_000,
                },
            ] as never,
            NOW,
        );
        const { handler: read } = await import("../src/handlers/read.ts");
        const get = async (q: Record<string, string>) =>
            read({ ...event("/v1/page/flaky/test", "", {}), queryStringParameters: q });
        const res = await get({ file: "s.stories.ts", test: "Zoomed" });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body as string)).toMatchObject({
            range: "7d",
            file: "s.stories.ts",
            test: "Zoomed",
            family: "graphty-element-stories",
            events: [
                {
                    kind: "pr",
                    pr: 9,
                    run: 500,
                    attempt: 1,
                    job: "stories",
                    shard: "graphty-element-stories-2",
                    sha: "abc",
                    outcome: "flaky",
                    signature: "visual-review: z.png is unstable",
                    pictures: [first, second],
                },
            ],
        });
        // An unknown test is a clear empty result, not unknown_section.
        const unknown = await get({ file: "s.stories.ts", test: "Nope" });
        expect(unknown.statusCode).toBe(200);
        expect(JSON.parse(unknown.body as string)).toMatchObject({ test: "Nope", family: null, events: [] });
        expect((await get({})).statusCode).toBe(400);
        // Picture hashes are two sha256 or refused.
        const bad = { ...post, failures: [{ ...post.failures[0], pictures: ["x"] }] };
        expect((await h(event("/v1/failures", bad))).statusCode).toBe(400);
    });

    it("answers /v1/test-history from what ingest stored, and /v1/run/<id> from the run index", async () => {
        const h = await ingest();
        expect((await h(event("/v1/invocations", invocation()))).statusCode).toBe(200);
        const { handler: read } = await import("../src/handlers/read.ts");
        const get = async (rawPath: string, q: Record<string, string>) =>
            read({ ...event(rawPath, "", {}), queryStringParameters: q });
        const res = await get("/v1/test-history", { file: "a.test.ts", test: "draws", range: "7d" });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body as string)).toMatchObject({
            file: "a.test.ts",
            family: "graphty-element-browser",
            events: [{ kind: "pr", run: 500, attempt: 1, sha: "abc", outcome: "failed" }],
        });
        expect((await get("/v1/test-history", {})).statusCode).toBe(400);
        expect((await get("/v1/test-history", { file: "a.test.ts", range: "1h" })).statusCode).toBe(400);
        const long = await get("/v1/test-history", { file: "a.test.ts", test: "x".repeat(513) });
        expect([long.statusCode, JSON.parse(long.body as string)]).toEqual([400, { code: "bad_field", field: "test" }]);
        expect((await get("/v1/test-history", { file: "x".repeat(513) })).statusCode).toBe(400);
        // An unknown test answers an empty history, never no_data or unknown_section.
        const none = await get("/v1/test-history", { file: "none.test.ts" });
        expect(none.statusCode).toBe(200);
        expect(JSON.parse(none.body as string)).toMatchObject({ file: "none.test.ts", family: null, events: [] });

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

describe("results service routes (#3607)", () => {
    const master = (runId: string, workflow = "release.yml") => ({
        ...CI_CLAIMS,
        event_name: "schedule",
        run_id: runId,
        ref: "refs/heads/master",
        job_workflow_ref: `graphty-org/graphty-monorepo/.github/workflows/${workflow}@refs/heads/master`,
    });
    const read = async (path: string, query: Record<string, string>) => {
        const h = (await import("../src/handlers/results.ts")).handler;
        const res = await h({ rawPath: path, rawQueryString: new URLSearchParams(query).toString() } as never);
        return { status: res.statusCode, body: JSON.parse(String(res.body)) };
    };
    const VARIANT = "layout|flags=off";
    const BASE = "b".repeat(40);
    const fail = { file: "a.test.ts", name: "draws", message: "expected 1\n at x" };

    it("answers a variant's per-file medians, its failed files and a pass on the same inputs", async () => {
        const h = await ingest();
        for (let i = 0; i < 11; i++) {
            const run = invocation({
                id: `500.1.layout.${i}`,
                variant: VARIANT,
                inputs: "k1",
                outcome: i === 10 ? "failed" : "passed",
                startedAt: NOW - (20 - i) * 60_000,
                files: [["a.test.ts", 1, 0, 0, 100 * (i + 1)]],
                failures: i === 10 ? [fail] : [],
            });
            expect((await h(event("/v1/invocations", run))).statusCode).toBe(200);
        }
        const keyed = await read("/v1/plan", { variants: VARIANT, inputs: "k1" });
        expect(keyed.status).toBe(200);
        // the newest 9 runs of the file: 300 ms to 1,100 ms
        expect(keyed.body.variants[VARIANT]).toEqual({
            passedWithInputs: "500.1.layout.9",
            order: ["a.test.ts"],
            fileMs: { "a.test.ts": 700 },
        });
        // the placeholder inputs key reuses nothing (#7269)
        const placeholder = await read("/v1/plan", { variants: VARIANT, inputs: "-" });
        expect(placeholder.body.variants[VARIANT].passedWithInputs).toBeNull();
        const byFile = await read("/v1/plan", { files: "a.test.ts,b.test.ts" });
        expect(byFile.body.order).toEqual(["a.test.ts"]);
        expect(byFile.body.fileMs).toEqual({ "a.test.ts": 700 });
        expect((await read("/v1/plan", { variants: VARIANT, inputs: "" })).status).toBe(400);
    });

    it("excuses master's failures on the base and in the newest full run, never a changed file", async () => {
        const h = await ingest();
        const failed = (id: string, sha: string, startedAt: number) =>
            invocation({ id, sha, variant: VARIANT, inputs: "k", startedAt, failures: [fail] });
        expect(
            (await h(event("/v1/invocations", failed("600.1.a.1", BASE, NOW - 9000), { claims: master("600") })))
                .statusCode,
        ).toBe(200);
        const newest = "c".repeat(40);
        await h(event("/v1/invocations", failed("601.1.a.1", newest, NOW - 1000), { claims: master("601") }));
        const plan = await read("/v1/plan", { base: BASE, variants: VARIANT, inputs: "-" });
        expect(plan.body.failingOnBase.map((r: { sha: string }) => r.sha).sort()).toEqual([BASE, newest]);
        expect(plan.body.failingOnBase[0]).toMatchObject({
            variant: VARIANT,
            file: "a.test.ts",
            name: "draws",
            issue: null,
        });
        const changed = await read("/v1/plan", { base: BASE, variants: VARIANT, inputs: "-", files: "a.test.ts" });
        expect(changed.body.failingOnBase).toEqual([]);
    });

    it("quarantines a test two master runs disagree on, links its issue and lets it leave after 20 passes", async () => {
        const h = await ingest();
        const sha = "d".repeat(40);
        const run = (id: string, failures: unknown[], startedAt = NOW - 5000) =>
            invocation({
                id,
                sha,
                variant: VARIANT,
                inputs: "k",
                startedAt,
                outcome: failures.length ? "failed" : "passed",
                failures,
            });
        await h(event("/v1/invocations", run("700.1.a.1", [fail]), { claims: master("700") }));
        await h(event("/v1/invocations", run("701.1.a.1", []), { claims: master("701") }));
        let plan = await read("/v1/plan", { variants: VARIANT, inputs: "-" });
        expect(plan.body.quarantine).toEqual([
            {
                family: "layout",
                file: "a.test.ts",
                name: "draws",
                issue: null,
                expires: NOW + 14 * 86_400_000,
                passes: 0,
            },
        ]);
        const signature = "s1";
        const issue = { signature, number: 42, kind: "flaky", family: "layout", file: "a.test.ts", name: "draws" };
        expect((await h(event("/v1/issues", issue, { claims: master("702") }))).statusCode).toBe(200);
        plan = await read("/v1/plan", { variants: VARIANT, inputs: "-" });
        expect(plan.body.quarantine[0].issue).toBe(42);
        for (let i = 0; i < 20; i++) {
            const id = `${800 + i}.1.a.1`;
            await h(
                event(
                    "/v1/invocations",
                    { ...run(id, [], NOW + i), sha: "e".repeat(40) },
                    { claims: master(String(800 + i)) },
                ),
            );
        }
        plan = await read("/v1/plan", { variants: VARIANT, inputs: "-" });
        expect(plan.body.quarantine).toEqual([]);
        // only master's runs file issues
        expect((await h(event("/v1/issues", issue))).statusCode).toBe(403);
    });

    it("answers a nightly's record for promote.yml, a re-run's hashes replacing its run's", async () => {
        const h = await ingest();
        const sha = "f".repeat(40);
        const move = { channel: "nightly", sha, siteSha256: "1".repeat(64), channelSha256: "2".repeat(64) };
        expect((await read("/v1/site", { sha })).status).toBe(404);
        expect(
            (await h(event("/v1/channel-moves", move, { claims: master("900", "nightly-site.yml") }))).statusCode,
        ).toBe(200);
        const rerun = { ...move, channelSha256: "3".repeat(64) };
        const again = await h(event("/v1/channel-moves", rerun, { claims: master("900", "nightly-site.yml") }));
        expect(JSON.parse(String(again.body))).toEqual({ stored: true, replaced: true });
        // a verdict the dashboard does not chart is still the record's
        await h(event("/v1/verdicts", { sha, state: "approved" }, { claims: master("901") }));
        const site = await read("/v1/site", { sha });
        expect(site).toEqual({
            status: 200,
            body: {
                sha,
                versionCommit: null,
                siteSha256: move.siteSha256,
                channelSha256: rerun.channelSha256,
                movedAt: NOW,
                verdict: "approved",
            },
        });
        expect((await h(event("/v1/channel-moves", move))).statusCode).toBe(403);
        expect((await read("/v1/site", { sha: "abc" })).status).toBe(400);
    });

    const answer = (res: { statusCode?: number; body?: unknown }) => ({
        status: res.statusCode,
        body: JSON.parse(String(res.body)),
    });
    const send = async (method: string, path: string, body: unknown, claims: Record<string, string> = CI_CLAIMS) => {
        const e = event(path, body, { claims });
        const h = await ingest();
        return answer(await h({ ...e, requestContext: { ...e.requestContext, http: { method } } } as never));
    };

    it("answers a run's failed tests for its bisect, with those master saw fail before the last green site", async () => {
        const h = await ingest();
        const good = "1".repeat(40);
        // master failed the test 2 days before the green commit's site, then a full run failed it again
        await h(
            event(
                "/v1/invocations",
                invocation({ id: "600.1.a.1", sha: BASE, startedAt: NOW - 3 * 86_400_000, failures: [fail] }),
                { claims: master("600") },
            ),
        );
        vi.setSystemTime(NOW - 86_400_000);
        expect((await send("POST", "/v1/sites", { sha: good }, master("601", "deploy-pages.yml"))).body).toEqual({
            stored: true,
            sha: good,
        });
        vi.setSystemTime(NOW);
        const other = { file: "b.test.ts", name: "loads", message: "boom" };
        const run = invocation({ id: "700.1.test.layout-2.1", sha: "2".repeat(40), failures: [fail] });
        expect((await h(event("/v1/invocations", run, { claims: master("700") }))).statusCode).toBe(200);
        // a failure event before its record names the same run
        const posted = await send(
            "POST",
            "/v1/failures",
            { invocation: "700.1.test.layout-3.1", ...other },
            master("700"),
        );
        expect(posted.body).toEqual({ stored: 1 });
        const failures = await read("/v1/failures", { run: "700", good });
        expect(failures.body).toEqual({
            tests: [
                { shard: "layout-2", file: "a.test.ts", name: "draws" },
                { shard: "layout-3", file: "b.test.ts", name: "loads" },
            ],
            failedBefore: ["layout-2: a.test.ts > draws"],
        });
        expect((await read("/v1/failures", { run: "700" })).body.failedBefore).toEqual([]);
        expect((await read("/v1/failures", { run: "x" })).status).toBe(400);
    });

    it("answers the candidate pick and release state from sites, verdicts, nightly moves and the hold", async () => {
        const [a, b, c] = ["a", "b", "c"].map((x) => x.repeat(40));
        const deploy = master("800", "deploy-pages.yml");
        for (const [i, sha] of [a, b, c].entries()) {
            vi.setSystemTime(NOW + i * 1000);
            await send("POST", "/v1/sites", { sha }, deploy);
        }
        // a re-post keeps the first build
        expect((await send("POST", "/v1/sites", { sha: a }, deploy)).body.stored).toBe(false);
        vi.setSystemTime(NOW + 5000);
        await send("POST", "/v1/verdicts", { sha: a, state: "green-clean" }, master("801"));
        const move = { channel: "nightly", sha: a, siteSha256: "1".repeat(64), channelSha256: "2".repeat(64) };
        await send("POST", "/v1/channel-moves", move, master("802", "nightly-site.yml"));
        vi.setSystemTime(NOW + 6000);
        await send("POST", "/v1/verdicts", { sha: b, state: "green-images" }, master("803"));
        vi.setSystemTime(NOW + 10_000);
        const candidate = await read("/v1/candidate", {});
        expect(candidate.body).toMatchObject({
            candidate: { sha: c, builtAt: NOW + 2000 },
            judged: null,
            sites: [c, b, a],
            hold: null,
        });
        expect(candidate.body.recent.map((v: { sha: string; runId: number }) => [v.sha, v.runId])).toEqual([
            [b, 803],
            [a, 801],
        ]);
        let state = await read("/v1/release-state", {});
        expect(state.body).toMatchObject({
            nightly: { sha: a, movedAt: NOW + 5000 },
            red: null,
            offered: { sha: b, state: "green-images", builtAt: NOW + 1000 },
            canary: { sha: c },
            ageNightlyMs: 10_000 - 1000,
            blocking: "unjudged",
            hold: null,
        });
        // one hold at a time; a clear naming another hold clears nothing
        const release = master("804");
        expect((await send("POST", "/v1/hold", { base: b, head: c, issue: 9 }, release)).body).toEqual({ held: true });
        expect((await send("POST", "/v1/hold", { base: c, head: c }, release)).status).toBe(409);
        // the same base moves the hold (a fix forward), replacing it whole
        expect((await send("POST", "/v1/hold", { base: b, head: c, issue: 9 }, release)).body).toEqual({ held: true });
        state = await read("/v1/release-state", {});
        expect(state.body).toMatchObject({ blocking: "held", offered: null, hold: { base: b, head: c, issue: 9 } });
        const abandon = master("805", "nightly-abandon.yml");
        expect((await send("POST", "/v1/hold", { base: b, head: c }, abandon)).status).toBe(403);
        expect((await send("POST", "/v1/hold", { clear: true }, abandon)).status).toBe(400);
        expect((await send("POST", "/v1/hold", { clear: true, base: a, head: c }, abandon)).body).toEqual({
            cleared: false,
        });
        expect((await send("POST", "/v1/hold", { clear: true, base: b, head: c }, abandon)).body).toEqual({
            cleared: true,
        });
        expect((await read("/v1/candidate", {})).body.hold).toBeNull();
        expect((await send("POST", "/v1/hold", { clear: true }, release)).body).toEqual({ cleared: false });
        expect((await send("POST", "/v1/hold", { base: b, head: c }, master("806", "ci.yml"))).status).toBe(403);
    });

    it("dispatches a base check once per base, file and variant, and lets its holder give it back", async () => {
        const ask = { base: "abcdef1", file: "a.test.ts", variant: VARIANT, pr: 12 };
        expect((await send("POST", "/v1/base-checks", ask)).body).toEqual({ dispatch: true });
        // the holder's re-send is answered true again; another run's ask false
        expect((await send("POST", "/v1/base-checks", ask)).body).toEqual({ dispatch: true });
        const other = { ...CI_CLAIMS, run_id: "501" };
        expect((await send("POST", "/v1/base-checks", ask, other)).body).toEqual({ dispatch: false });
        expect((await send("DELETE", "/v1/base-checks", ask, other)).body).toEqual({ released: false });
        expect((await send("DELETE", "/v1/base-checks", ask)).body).toEqual({ released: true });
        expect((await send("POST", "/v1/base-checks", ask, other)).body).toEqual({ dispatch: true });
        expect((await send("POST", "/v1/base-checks", { ...ask, base: "xyz" })).status).toBe(400);
        expect((await send("POST", "/v1/base-checks", ask, master("900"))).status).toBe(403);
    });

    it("answers master's duration trend, last samples and medians, and a pull request's trend empty", async () => {
        const rowsOf = (run: number, ms: number) => [
            { runId: run, attempt: 1, workflow: "ci.yml", job: "build", ms, sha: `s${run}`, startedAt: NOW + run },
            { runId: run, attempt: 1, workflow: "ci.yml", job: "build", step: "lint", ms: 1000, startedAt: NOW + run },
            {
                runId: run,
                attempt: 1,
                workflow: "ci.yml",
                job: "x",
                ms: 1,
                startedAt: NOW + run,
                conclusion: "cancelled",
            },
        ];
        const push = (run: number) => ({
            ...master(String(run), "ci.yml"),
            event_name: "push",
            workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/ci.yml@refs/heads/master",
        });
        let last: { body: Record<string, unknown> } = { body: {} };
        for (let run = 1; run <= 15; run++) {
            // 10 runs of 100 s, then 5 of 300 s: over 1.3 x and 60 s slower
            last = await send("POST", "/v1/durations", { rows: rowsOf(run, run <= 10 ? 100_000 : 300_000) }, push(run));
        }
        expect(last.body).toMatchObject({ stored: 3, kind: "master" });
        expect(last.body.trend).toEqual([
            { key: "job:ci.yml:build", kind: "master", recent: 300, earlier: 100, alarm: true, range: "s10..s11" },
            { key: "step:ci.yml:build:lint", kind: "master", recent: 1, earlier: 1, alarm: false, range: null },
        ]);
        expect(last.body.lastSeen).toEqual({
            "job:ci.yml:build": { runId: 15, sha: "s15", at: NOW + 15, runsSince: 0 },
            "step:ci.yml:build:lint": { runId: 15, sha: null, at: NOW + 15, runsSince: 0 },
        });
        const medians = await read("/v1/durations/medians", { workflows: "ci.yml", kind: "master", n: "3" });
        expect(medians.body).toEqual({ "job:ci.yml:build": 300, "step:ci.yml:build:lint": 1 });
        expect((await read("/v1/durations/medians", { workflows: "" })).status).toBe(400);
        const pr = [{ runId: 500, attempt: 1, workflow: "ci.yml", job: "build", ms: 5, startedAt: NOW }];
        expect((await send("POST", "/v1/durations", { rows: pr })).body).toEqual({
            stored: 1,
            kind: "pr",
            trend: [],
            lastSeen: {},
        });
        expect((await send("POST", "/v1/durations", { rows: [{ ...pr[0], runId: 9 }] })).status).toBe(403);
    });

    it("keeps a test duration history master writes and anyone reads", async () => {
        const history = { "p\u0000a.test.ts\u0000draws": [12, 15] };
        const path = "/v1/durations/tests/test-durations-layout-1";
        expect((await read(path, {})).body).toEqual({});
        expect((await send("PUT", path, history, master("900"))).body).toEqual({ stored: true });
        expect((await read(path, {})).body).toEqual(history);
        expect((await send("PUT", path, history)).status).toBe(403);
        expect((await send("PUT", "/v1/durations/tests/a%20b", history, master("900"))).status).toBe(400);
    });

    it("answers each story's newest capture, its first unapproved render, the units and their reach", async () => {
        const slices = (run: string, attempt = "1") => ({ ...master(run, "story-slices.yml"), run_attempt: attempt });
        const tree = "7".repeat(40);
        const post = (sha: string, status: string, run: string, attempt?: string) =>
            send(
                "POST",
                "/v1/story-captures",
                {
                    sha,
                    baselinesTree: tree,
                    artifact: `shots-${run}`,
                    captures: [{ project: "graphty", story: "Panel", mode: "dark", status, hash: run }],
                    units: [{ project: "graphty", unit: "panels" }],
                    notified: status === "new" ? ["queue"] : [],
                },
                slices(run, attempt),
            );
        const [s1, s2, s3] = ["1", "2", "3"].map((x) => x.repeat(40));
        expect((await post(s1, "unchanged", "10")).body).toEqual({ stored: 1 });
        await post(s2, "changed", "11");
        await post(s3, "new", "12");
        // a late re-run of an older slice hides no newer render, and a re-post stores nothing
        await post(s1, "unchanged", "10", "2");
        expect((await post(s3, "new", "12")).body).toEqual({ stored: 0 });
        const got = await read("/v1/story-captures", {});
        expect(got.body.captures).toEqual([
            {
                project: "graphty",
                story: "Panel",
                mode: "dark",
                sha: s3,
                baselinesTree: tree,
                runId: 12,
                attempt: 1,
                artifact: "shots-12",
                status: "new",
                hash: "12",
                baselineHash: null,
                at: NOW,
                firstUnapprovedSha: s2,
            },
        ]);
        expect(got.body.summary).toEqual({
            stories: 1,
            lastSliced: { sha: s3, at: NOW },
            oldestNewestAt: NOW,
            statuses: { new: 1 },
            queue: 1,
        });
        expect(got.body.notified).toEqual({ queue: NOW, slot: null });
        expect(got.body.units).toEqual([{ project: "graphty", unit: "panels", sha: s3, at: NOW }]);
        expect((await post(s1, "bogus", "13")).status).toBe(400);
        expect((await send("POST", "/v1/story-captures", {}, master("14"))).status).toBe(403);

        const build = {
            ...master("20", "ci.yml"),
            event_name: "push",
            sha: s1,
            workflow_ref: "graphty-org/graphty-monorepo/.github/workflows/ci.yml@refs/heads/master",
        };
        expect((await send("POST", "/v1/story-reach", { sha: s1, units: ["panels", "graph"] }, build)).body).toEqual({
            stored: 2,
        });
        expect((await send("POST", "/v1/story-reach", { sha: s2, units: ["x"] }, build)).status).toBe(403);
        expect((await read("/v1/story-reach", { shas: `${s1},${s2}` })).body).toEqual({
            reach: [
                { sha: s1, unit: "graph" },
                { sha: s1, unit: "panels" },
            ],
        });
        expect((await read("/v1/story-reach", { shas: "" })).status).toBe(400);
    });

    it("answers the whole quarantine and the issues a master run's family tracks", async () => {
        const sha = "9".repeat(40);
        const run = (id: string, failures: unknown[]) =>
            invocation({
                id,
                sha,
                variant: VARIANT,
                inputs: "k",
                outcome: failures.length ? "failed" : "passed",
                failures,
            });
        const h = await ingest();
        await h(event("/v1/invocations", run("700.1.a.1", [fail]), { claims: master("700") }));
        const proved = answer(await h(event("/v1/invocations", run("701.1.a.1", []), { claims: master("701") })));
        expect(proved.body).toMatchObject({ stored: true, kind: "full", tracked: [] });
        expect(proved.body.flaky).toHaveLength(1);
        const issue = { signature: "s", number: 7, kind: "flaky", family: "layout", file: "a.test.ts", name: "draws" };
        await h(event("/v1/issues", issue, { claims: master("702") }));
        const again = answer(await h(event("/v1/invocations", run("703.1.a.1", []), { claims: master("703") })));
        expect(again.body).toMatchObject({ flaky: [], tracked: [7] });
        expect((await read("/v1/quarantine", {})).body.quarantine).toEqual([
            expect.objectContaining({ family: "layout", file: "a.test.ts", issue: 7, since: NOW }),
        ]);
        expect((await read("/v1/nowhere", {})).status).toBe(404);
    });
});
