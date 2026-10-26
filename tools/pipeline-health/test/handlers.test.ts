import { createHash } from "node:crypto";

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ssmSend = vi.fn();
const docSend = vi.fn();
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

const event = (rawPath: string, extra: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}) =>
    ({
        rawPath,
        headers: {},
        pathParameters: { kind: rawPath.split("/").pop() },
        requestContext: { authorizer: { jwt: { claims: { ref: "refs/heads/master" }, scopes: [] } } },
        isBase64Encoded: false,
        ...extra,
    }) as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

describe("read", () => {
    it("answers /v1/health and no_data elsewhere", async () => {
        const { handler } = await import("../src/handlers/read.ts");
        const ok = await handler(event("/v1/health"));
        expect(ok.statusCode).toBe(200);
        expect(JSON.parse(ok.body!)).toMatchObject({ ok: true });
        const page = await handler(event("/v1/page/master"));
        expect(page.statusCode).toBe(503);
        expect(JSON.parse(page.body!)).toEqual({ code: "no_data" });
    });
});

describe("collector", () => {
    it("writes the heartbeat item", async () => {
        process.env.TABLE_NAME = "graphty-health";
        const { handler } = await import("../src/handlers/collector.ts");
        docSend.mockResolvedValue({});
        const { lastRun } = await handler();
        expect(docSend.mock.calls[0][0].input).toEqual({
            TableName: "graphty-health",
            Item: { pk: "META", sk: "collector", lastRun },
        });
    });
});

describe("ingest", () => {
    beforeEach(() => {
        vi.resetModules();
        ssmSend.mockReset();
    });

    it("refuses a body over 1 MB", async () => {
        const { handler } = await import("../src/handlers/ingest.ts");
        const res = await handler(event("/v1/ingest/runs", { body: "x".repeat(1_000_001) }));
        expect(res.statusCode).toBe(413);
    });

    it("answers not_implemented for an authorized CI write", async () => {
        const { handler } = await import("../src/handlers/ingest.ts");
        const res = await handler(event("/v1/ingest/runs", { body: "{}" }));
        expect(res.statusCode).toBe(501);
        expect(JSON.parse(res.body!)).toEqual({ code: "not_implemented" });
    });

    it("checks the local token against its SHA-256 in SSM", async () => {
        const hash = createHash("sha256").update("s3cret").digest("hex");
        ssmSend.mockResolvedValue({ Parameter: { Value: hash } });
        const { handler } = await import("../src/handlers/ingest.ts");
        const good = await handler(event("/v1/local/runs", { headers: { authorization: "Bearer s3cret" } }));
        expect(good.statusCode).toBe(501);
        const bad = await handler(event("/v1/local/runs", { headers: { authorization: "Bearer nope" } }));
        expect(bad.statusCode).toBe(401);
        const none = await handler(event("/v1/local/runs"));
        expect(none.statusCode).toBe(401);
        expect(ssmSend).toHaveBeenCalledTimes(1);
    });

    it("refuses local writes when the parameter is missing, and retries the lookup", async () => {
        ssmSend.mockRejectedValueOnce(new Error("ParameterNotFound"));
        const { handler } = await import("../src/handlers/ingest.ts");
        const res = await handler(event("/v1/local/runs", { headers: { authorization: "Bearer x" } }));
        expect(res.statusCode).toBe(401);
        ssmSend.mockResolvedValueOnce({ Parameter: { Value: createHash("sha256").update("x").digest("hex") } });
        const again = await handler(event("/v1/local/runs", { headers: { authorization: "Bearer x" } }));
        expect(again.statusCode).toBe(501);
    });
});
