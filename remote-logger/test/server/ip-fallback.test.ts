/**
 * Tests for IP address fallback behavior in dual-server.
 *
 * These tests verify that when internalIpV4Sync() returns undefined,
 * the server falls back to 127.0.0.1 and warns the user appropriately.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock internal-ip module to control internalIpV4Sync behavior
vi.mock("internal-ip", () => ({
    internalIpV4Sync: vi.fn(),
}));

// Import after mocking
import { internalIpV4Sync } from "internal-ip";
import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";

const mockedInternalIpV4Sync = vi.mocked(internalIpV4Sync);

describe("IP address fallback", () => {
    let dualServer: DualServerResult | undefined;
    const basePort = 8500;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
            dualServer = undefined;
        }
    });

    it("should use detected internal IP when available", async () => {
        mockedInternalIpV4Sync.mockReturnValue("192.168.1.100");

        dualServer = await createDualServer({
            httpPort: basePort,
            httpHost: "0.0.0.0",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        const config = dualServer.storage.getServerConfig();
        expect(config?.httpEndpoint).toContain("192.168.1.100");
    });

    it("should fallback to 127.0.0.1 when internal IP unavailable", async () => {
        mockedInternalIpV4Sync.mockReturnValue(undefined);

        dualServer = await createDualServer({
            httpPort: basePort + 1,
            httpHost: "0.0.0.0",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        const config = dualServer.storage.getServerConfig();
        expect(config?.httpEndpoint).toContain("127.0.0.1");
    });

    it("should warn user when falling back to localhost-only", async () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mockedInternalIpV4Sync.mockReturnValue(undefined);

        dualServer = await createDualServer({
            httpPort: basePort + 2,
            httpHost: "0.0.0.0",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: false, // Enable logging to see warning
        });

        // Should have warned about LAN IP not being detected
        expect(consoleWarnSpy).toHaveBeenCalled();
        const warnCalls = consoleWarnSpy.mock.calls.flat().join(" ");
        expect(warnCalls).toContain("LAN IP");

        consoleWarnSpy.mockRestore();
    });

    it("should not warn when quiet mode is enabled", async () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mockedInternalIpV4Sync.mockReturnValue(undefined);

        dualServer = await createDualServer({
            httpPort: basePort + 3,
            httpHost: "0.0.0.0",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true, // Suppress warnings
        });

        // Should NOT have warned in quiet mode
        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });

    it("should use specified host when not 0.0.0.0", async () => {
        // Reset mock to ensure it's not affecting this test
        mockedInternalIpV4Sync.mockReturnValue("192.168.1.100");

        dualServer = await createDualServer({
            httpPort: basePort + 4,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        const config = dualServer.storage.getServerConfig();
        expect(config?.httpEndpoint).toContain("127.0.0.1");
        // internalIpV4Sync should not be called when host is explicitly set
        // Actually, it may still be called but the result should not be used
        // The important thing is the endpoint uses the specified host
    });

    it("should not call internalIpV4Sync when host is not 0.0.0.0", async () => {
        mockedInternalIpV4Sync.mockClear();

        dualServer = await createDualServer({
            httpPort: basePort + 5,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        // When host is explicitly set, we should not try to detect internal IP
        expect(mockedInternalIpV4Sync).not.toHaveBeenCalled();
    });

    it("should call internalIpV4Sync when host is 0.0.0.0", async () => {
        mockedInternalIpV4Sync.mockClear();
        mockedInternalIpV4Sync.mockReturnValue("10.0.0.5");

        dualServer = await createDualServer({
            httpPort: basePort + 6,
            httpHost: "0.0.0.0",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        // When host is 0.0.0.0, we should try to detect internal IP
        expect(mockedInternalIpV4Sync).toHaveBeenCalled();
    });
});
