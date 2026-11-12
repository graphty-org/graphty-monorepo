/**
 * Who may reach the server and what a request may make it do: the proxy refuses private
 * targets, cross-origin pages cannot read or fire the viewer and proxy routes, a project
 * marker cannot name a path outside the log directory, and a malformed /proxy/ URL is a 400.
 */

import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";
import { JsonlWriter } from "../../src/server/jsonl-writer.js";
import { assertSafeMarker } from "../../src/server/marker-utils.js";
import { isPrivateAddress } from "../../src/server/proxy.js";

interface Reply {
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
}

function request(
    port: number,
    method: string,
    requestPath: string,
    headers: Record<string, string> = {},
    body?: string,
): Promise<Reply> {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: "127.0.0.1", port, path: requestPath, method, headers }, (res) => {
            let text = "";
            res.on("data", (chunk: Buffer) => {
                text += chunk.toString();
            });
            res.on("end", () => {
                resolve({ status: res.statusCode!, headers: res.headers, body: text });
            });
        });
        req.on("error", reject);
        req.end(body);
    });
}

describe("remote-logger server hardening", () => {
    let server: DualServerResult;
    let port: number;
    let logDir: string;
    let writer: JsonlWriter;

    beforeEach(async () => {
        logDir = fs.mkdtempSync(path.join(os.tmpdir(), "rl-hardening-"));
        writer = new JsonlWriter(path.join(logDir, "logs"));
        server = await createDualServer({
            httpPort: 0,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
            jsonlWriter: writer,
        });
        port = server.httpPort!;
    });

    afterEach(async () => {
        await server.shutdown();
        await writer.close();
        fs.rmSync(logDir, { recursive: true, force: true });
    });

    test("a malformed percent escape in /proxy/ is a 400 and the server keeps running", async () => {
        const res = await request(port, "GET", "/proxy/%E0%A4%A");
        expect(res.status).toBe(400);
        expect(res.body).toContain("malformed percent-encoding");

        const health = await request(port, "GET", "/health");
        expect(health.status).toBe(200);
    });

    test("the proxy refuses literal loopback, private and metadata addresses by default", async () => {
        for (const target of [
            "http://127.0.0.1:1/",
            "http://10.0.0.1/",
            "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]:1/",
            "http://2130706433/",
        ]) {
            const res = await request(port, "GET", `/proxy/${target}`);
            expect(res.status, target).toBe(403);
            expect(res.body).toContain("--proxy-allow-private");
        }
    });

    test("the proxy refuses a host name that resolves to loopback", async () => {
        const res = await request(port, "GET", "/proxy/http://localhost:1/");
        expect(res.status).toBe(502);
        expect(res.body).toContain("Refusing to proxy localhost");
    });

    test("only the browser routes carry the wildcard CORS header", async () => {
        const log = await request(port, "OPTIONS", "/log");
        expect(log.headers["access-control-allow-origin"]).toBe("*");

        for (const route of ["/logs", "/logs/recent", "/logs/errors", "/proxy/http://example.invalid/"]) {
            const res = await request(port, "GET", route);
            expect(res.headers["access-control-allow-origin"], route).toBeUndefined();
        }
    });

    test("a cross-origin page cannot clear or read the logs, or drive the proxy", async () => {
        const evil = { Origin: "https://evil.example" };
        expect((await request(port, "POST", "/logs/clear", evil)).status).toBe(403);
        expect((await request(port, "GET", "/logs", evil)).status).toBe(403);
        expect((await request(port, "GET", "/proxy/https://example.invalid/", evil)).status).toBe(403);

        // The server's own pages (and tools that send no Origin) still can
        const own = { Origin: `http://127.0.0.1:${port}` };
        expect((await request(port, "POST", "/logs/clear", own)).status).toBe(200);
        expect((await request(port, "POST", "/logs/clear")).status).toBe(200);

        // And any page may still send logs
        const sent = await request(
            port,
            "POST",
            "/log",
            { ...evil, "Content-Type": "application/json" },
            JSON.stringify({ sessionId: "app-1704067200000-abc", logs: [{ time: "t", level: "INFO", message: "m" }] }),
        );
        expect(sent.status).toBe(200);
    });

    test.each([
        ["an explicit projectMarker", { sessionId: "s", projectMarker: "../../escaped" }],
        ["a marker taken from the session id", { sessionId: "../../escaped-1704067200000-abc" }],
    ])("POST /log refuses %s that leaves the log directory", async (_name, batch) => {
        const res = await request(
            port,
            "POST",
            "/log",
            { "Content-Type": "application/json" },
            JSON.stringify({ ...batch, logs: [{ time: "t", level: "INFO", message: "m" }] }),
        );
        expect(res.status).toBe(400);
        expect(res.body).toContain("Invalid project marker");
        await writer.flush();
        expect(fs.existsSync(path.join(logDir, "logs", "..", "..", "escaped"))).toBe(false);
        expect(fs.readdirSync(logDir)).toEqual([]);
    });
});

describe("isPrivateAddress", () => {
    test("matches private ranges, including IPv4-mapped IPv6, and not public addresses", () => {
        for (const a of [
            "127.0.0.1",
            "10.1.2.3",
            "172.16.0.1",
            "192.168.0.1",
            "169.254.169.254",
            "0.0.0.0",
            "::1",
            "fd00::1",
            "fe80::1",
            "::ffff:127.0.0.1",
        ]) {
            expect(isPrivateAddress(a), a).toBe(true);
        }
        for (const a of ["8.8.8.8", "172.32.0.1", "2606:4700::1111", "example.com"]) {
            expect(isPrivateAddress(a), a).toBe(false);
        }
    });
});

describe("assertSafeMarker", () => {
    test("accepts one directory name and refuses anything that could leave it", () => {
        for (const m of ["graphty-element", "7156-remote-logger-hardening", "My Project", "a.b_c"]) {
            expect(() => {
                assertSafeMarker(m);
            }).not.toThrow();
        }
        for (const m of ["", ".", "..", "../x", "a/b", "a\\b", "a\0b", "x".repeat(256), 42]) {
            expect(() => {
                assertSafeMarker(m);
            }).toThrow("Invalid project marker");
        }
    });
});
