// The collector Lambda's handler with the AWS SDK mocked: today's live state, no GitHub App in SSM.
import { beforeEach, describe, expect, it, vi } from "vitest";

const ssmSend = vi.fn();
const docSend = vi.fn();
const ceSend = vi.fn();
const command = (name: string) =>
    class {
        name = name;
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    };
vi.mock("@aws-sdk/client-ssm", () => ({
    SSMClient: class {
        send = ssmSend;
    },
    GetParametersCommand: command("GetParameters"),
}));
vi.mock("@aws-sdk/client-cost-explorer", () => ({
    CostExplorerClient: class {
        send = ceSend;
    },
    GetCostAndUsageCommand: command("GetCostAndUsage"),
}));
vi.mock("@aws-sdk/lib-dynamodb", () => ({
    DynamoDBDocumentClient: { from: () => ({ send: docSend }) },
    GetCommand: command("Get"),
    PutCommand: command("Put"),
    QueryCommand: command("Query"),
    UpdateCommand: command("Update"),
    BatchWriteCommand: command("BatchWrite"),
}));

describe("collector handler", () => {
    beforeEach(() => {
        vi.resetModules();
        ssmSend
            .mockReset()
            .mockResolvedValue({ Parameters: [], InvalidParameters: ["/graphty-health/github-app/app-id"] });
        docSend.mockReset().mockResolvedValue({});
        ceSend
            .mockReset()
            .mockResolvedValue({
                ResultsByTime: [{ TimePeriod: { Start: "2026-10-01" }, Total: { UnblendedCost: { Amount: "0.5" } } }],
            });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ created_at: "2026-10-25T23:00:00Z" }), { status: 200 })),
        );
    });

    it("writes the heartbeat, then runs the not-set-up path without calling GitHub", async () => {
        process.env.TABLE_NAME = "graphty-health";
        const { handler } = await import("../../src/handlers/collector.ts");
        const r = await handler();
        expect(r.github).toBe("not set up");
        expect(r.errors).toEqual({});
        expect(docSend.mock.calls[0][0].input).toEqual({
            TableName: "graphty-health",
            Item: { pk: "META", sk: "collector", lastRun: r.lastRun },
        });
        const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
        expect(urls.every((u) => !u.includes("api.github.com"))).toBe(true);
        expect(ssmSend.mock.calls[0][0].input).toMatchObject({ WithDecryption: true });
        // Writes go to the one table only.
        for (const [cmd] of docSend.mock.calls) {
            const input = cmd.input as { TableName?: string; RequestItems?: Record<string, unknown> };
            expect(input.TableName ?? Object.keys(input.RequestItems ?? {})[0]).toBe("graphty-health");
        }
    });
});
