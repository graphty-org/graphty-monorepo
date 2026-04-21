import * as http from "http";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";
import { LogStorage } from "../../src/server/log-storage.js";
import { resetBrowserBundleCache } from "../../src/server/log-server.js";

function httpGet(port: number, path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: "127.0.0.1", port, path, method: "GET" },
            (res) => {
                let body = "";
                res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
                res.on("end", () => {
                    resolve({ status: res.statusCode!, headers: res.headers, body });
                });
            },
        );
        req.on("error", reject);
        req.end();
    });
}

describe("GET /remote-logger.js endpoint", () => {
    let dualServer: DualServerResult;
    let port: number;

    beforeEach(() => {
        resetBrowserBundleCache();
        port = 8500 + Math.floor(Math.random() * 50);
    });

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
        }
    });

    test("returns 200 with JavaScript content type", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/remote-logger.js");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toBe("application/javascript");
    });

    test("response contains server URL injection", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/remote-logger.js");

        expect(res.body).toContain(`window.__REMOTE_LOG_SERVER_URL__="http://127.0.0.1:${port}"`);
    });

    test("response contains the bundled RemoteLogClient code", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/remote-logger.js");

        expect(res.body).toContain("RemoteLogger");
    });

    test("has CORS and cache headers", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/remote-logger.js");

        expect(res.headers["access-control-allow-origin"]).toBe("*");
        expect(res.headers["cache-control"]).toBe("no-cache");
    });

    test("is available in logReceiveOnly mode (MCP-only)", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
            logReceiveOnly: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/remote-logger.js");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toBe("application/javascript");
    });

    test("other endpoints are blocked in logReceiveOnly mode", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
            logReceiveOnly: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/logs");

        expect(res.status).toBe(404);
    });

    test("handles query parameters in URL", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
        });
        port = dualServer.httpPort!;

        const res = await httpGet(port, "/remote-logger.js?ui=true");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toBe("application/javascript");
    });
});
