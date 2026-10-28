/**
 * Tests for the mode createDualServer reports, with the MCP interface enabled.
 *
 * MCP talks over stdio, which blocks in a test, so its transport and server are
 * replaced with ones whose connect does nothing.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
    StdioServerTransport: vi.fn(),
}));

vi.mock("../../src/mcp/mcp-server.js", () => ({
    createMcpServer: vi.fn(() => ({
        connect: vi.fn(() => Promise.resolve()),
        close: vi.fn(() => Promise.resolve()),
    })),
}));

import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";

describe("createDualServer mode with MCP enabled", () => {
    let dualServer: DualServerResult | undefined;

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
            dualServer = undefined;
        }
    });

    it("reports mcp-only when the HTTP server only receives logs", async () => {
        dualServer = await createDualServer({
            httpPort: 7960,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            logReceiveOnly: true,
            quiet: true,
        });

        expect(dualServer.storage.getServerConfig()?.mode).toBe("mcp-only");
    });

    it("reports dual when the HTTP server serves everything", async () => {
        dualServer = await createDualServer({
            httpPort: 7965,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            logReceiveOnly: false,
            quiet: true,
        });

        expect(dualServer.storage.getServerConfig()?.mode).toBe("dual");
    });
});
