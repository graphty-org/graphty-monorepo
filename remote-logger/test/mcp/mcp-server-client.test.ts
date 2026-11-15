/**
 * Calls every registered MCP tool through a real MCP client connected over an in-memory
 * transport, so the tool callbacks in createMcpServer are exercised the way Claude Code
 * reaches them (protocol, argument validation, JSON text content).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createMcpServer } from "../../src/mcp/mcp-server.js";
import { LogStorage } from "../../src/server/log-storage.js";

describe("MCP server over a client connection", () => {
    let storage: LogStorage;
    let client: Client;

    beforeEach(async () => {
        storage = new LogStorage();
        const server = createMcpServer(storage);
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        client = new Client({ name: "test-client", version: "1.0.0" });
        await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    });

    afterEach(async () => {
        await client.close();
        storage.clear();
    });

    async function call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
        const result = await client.callTool({ name, arguments: args });
        const content = result.content as { type: string; text: string }[];
        expect(content[0].type).toBe("text");
        return JSON.parse(content[0].text) as Record<string, unknown>;
    }

    async function receiveSample(): Promise<void> {
        await call("logs_receive", {
            sessionId: "proj-a-1",
            logs: [
                { time: "2026-01-01T00:00:00.000Z", level: "INFO", message: "hello world" },
                { time: "2026-01-01T00:00:01.000Z", level: "ERROR", message: "it broke" },
            ],
        });
    }

    test("lists all nine tools to the client", async () => {
        const { tools } = await client.listTools();
        expect(tools.map((t) => t.name).sort()).toEqual([
            "logs_clear",
            "logs_get_all",
            "logs_get_errors",
            "logs_get_file_path",
            "logs_get_recent",
            "logs_list_sessions",
            "logs_receive",
            "logs_search",
            "logs_status",
        ]);
    });

    test("logs_receive stores logs that logs_get_recent, logs_get_all and logs_get_errors return", async () => {
        const received = await call("logs_receive", {
            sessionId: "proj-a-1",
            logs: [
                { time: "2026-01-01T00:00:00.000Z", level: "INFO", message: "hello world" },
                { time: "2026-01-01T00:00:01.000Z", level: "ERROR", message: "it broke" },
            ],
        });
        expect(received).toEqual({ success: true, count: 2, sessionId: "proj-a-1" });

        const recent = await call("logs_get_recent", { count: 10 });
        expect(recent.count).toBe(2);
        expect((recent.logs as { message: string }[]).map((l) => l.message)).toEqual(["hello world", "it broke"]);

        const all = await call("logs_get_all");
        expect(all.sessionCount).toBe(1);
        expect(all.totalLogs).toBe(2);

        const errors = await call("logs_get_errors");
        expect(errors.count).toBe(1);
        expect((errors.errors as { message: string }[])[0].message).toBe("it broke");
    });

    test("a later batch fills in worktree path and page URL the session did not have", async () => {
        await receiveSample();
        expect(storage.getSessionMetadata("proj-a-1")?.worktreePath).toBeUndefined();

        await call("logs_receive", {
            sessionId: "proj-a-1",
            worktreePath: "/work/proj-a",
            pageUrl: "http://localhost/page",
            logs: [{ time: "2026-01-01T00:00:02.000Z", level: "INFO", message: "later" }],
        });

        const meta = storage.getSessionMetadata("proj-a-1");
        expect(meta?.worktreePath).toBe("/work/proj-a");
        expect(meta?.pageUrl).toBe("http://localhost/page");
    });

    test("logs_list_sessions and logs_status report the stored session", async () => {
        await receiveSample();

        const sessions = await call("logs_list_sessions", { hasErrors: true });
        expect(sessions.count).toBe(1);
        expect((sessions.sessions as { sessionId: string }[])[0].sessionId).toBe("proj-a-1");

        const status = await call("logs_status");
        expect(status.sessionCount).toBe(1);
        expect(status.totalLogs).toBe(2);
        expect(status.memoryUsage).toEqual(
            expect.objectContaining({
                heapUsed: expect.any(Number) as number,
                heapTotal: expect.any(Number) as number,
                rss: expect.any(Number) as number,
            }),
        );
    });

    test("logs_search finds by substring and logs_clear removes only when confirmed", async () => {
        await receiveSample();

        const search = await call("logs_search", { query: "BROKE" });
        expect(search.count).toBe(1);

        const refused = await call("logs_clear", {});
        expect(refused.success).toBe(false);
        expect(storage.getLogs().length).toBe(2);

        const cleared = await call("logs_clear", { confirm: true });
        // cleared counts sessions, not log entries
        expect(cleared).toEqual(expect.objectContaining({ success: true, cleared: 1 }));
        expect(storage.getLogs().length).toBe(0);
    });

    test("logs_get_file_path names the JSONL file for a project marker", async () => {
        const result = await call("logs_get_file_path", { projectMarker: "proj-a" });
        expect(result.path).toMatch(/proj-a.*\.jsonl$/);
        expect(typeof result.exists).toBe("boolean");
    });
});
