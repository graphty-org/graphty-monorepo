import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

    it("marks failures flaky when their shard passed", async () => {
        const h = await ingest();
        const fail = { invocation: "500.1.compact-mantine", failures: [{ file: "b.ts", name: "t", message: "x" }] };
        await h(event("/v1/failures", fail));
        const id = "R#test#500.1.compact-mantine#b.ts#t\u0000A#1";
        expect(mem.items.get(id)?.outcome).toBe("failed");
        const passed = invocation({ id: "500.1.compact-mantine", variant: "compact-mantine", outcome: "passed" });
        delete (passed as Record<string, unknown>).failures;
        await h(event("/v1/invocations", passed));
        expect(mem.items.get(id)?.outcome).toBe("flaky");
    });

    it("answers 429 past the daily write budget and writes nothing", async () => {
        const { quotaKey } = await import("../src/model/items.ts");
        mem.items.set(`${quotaKey(NOW).pk}\u0000-`, { ...quotaKey(NOW), rows: 300_000 });
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
        const done = await recomputeAll(mem, NOW);
        expect(done.pages).toBeGreaterThan(30);
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

describe("collector", () => {
    it("writes the heartbeat and recomputes", async () => {
        process.env.TABLE_NAME = "graphty-health";
        docSend.mockResolvedValue({});
        const { handler } = await import("../src/handlers/collector.ts");
        const { lastRun } = await handler();
        expect(docSend.mock.calls[0][0].input).toEqual({
            TableName: "graphty-health",
            Item: { pk: "META", sk: "collector", lastRun },
        });
        expect([...mem.items.keys()].some((k) => k.startsWith("PAGE#status"))).toBe(true);
    });
});
