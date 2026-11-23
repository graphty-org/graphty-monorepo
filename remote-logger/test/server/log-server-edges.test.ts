/**
 * Log server paths the main suite leaves out: terminal formatting of each level, error
 * reporting in non-quiet mode, the request-level 500 guard, requests without a Host header,
 * HTTPS request handling, and the CLI entry point. Every server binds an ephemeral port.
 */
import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import type { AddressInfo } from "node:net";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    clearLogs,
    createLogServer,
    getLogStorage,
    HELP_TEXT,
    main,
    parseArgs,
    setLogStorage,
    setProxy,
    startLogServer,
} from "../../src/server/log-server.js";
import { type LogEntry, LogStorage } from "../../src/server/log-storage.js";
import { generateSelfSignedCert } from "../../src/server/self-signed-cert.js";

interface Reply {
    status: number;
    body: string;
}

/**
 * Wait for a server to listen and return its port.
 * @param server - The server, already told to listen
 * @returns The bound port
 */
async function listening(server: http.Server | https.Server): Promise<number> {
    if (!server.listening) {
        await new Promise<void>((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
        });
    }
    return (server.address() as AddressInfo).port;
}

/**
 * Send one request with full control over headers.
 * @param options - http.request options
 * @param body - Optional request body
 * @param transport - http or https
 * @returns Status and body
 */
async function send(
    options: http.RequestOptions & https.RequestOptions,
    body?: string,
    transport: typeof http | typeof https = http,
): Promise<Reply> {
    return new Promise((resolve, reject) => {
        const req = transport.request({ host: "127.0.0.1", ...options }, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c: Buffer) => chunks.push(c));
            res.on("end", () => {
                resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
            });
            res.on("error", reject);
        });
        req.on("error", reject);
        req.end(body);
    });
}

/**
 * Send an HTTP/1.0 GET with no Host header (Node's server refuses that only for HTTP/1.1).
 * @param port - Server port
 * @param urlPath - Request path
 * @returns Status and body
 */
async function getWithoutHost(port: number, urlPath: string): Promise<Reply> {
    return new Promise((resolve, reject) => {
        const socket = net.connect(port, "127.0.0.1", () => {
            socket.write(`GET ${urlPath} HTTP/1.0\r\n\r\n`);
        });
        const chunks: Buffer[] = [];
        socket.on("data", (c: Buffer) => chunks.push(c));
        socket.on("error", reject);
        socket.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            const split = raw.indexOf("\r\n\r\n");
            resolve({ status: Number(raw.split(" ")[1]), body: raw.slice(split + 4) });
        });
    });
}

async function postLog(port: number, payload: unknown): Promise<Reply> {
    return send(
        { port, path: "/log", method: "POST", headers: { "Content-Type": "application/json" } },
        JSON.stringify(payload),
    );
}

async function close(server: http.Server | https.Server): Promise<void> {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
}

describe("log server edge paths", () => {
    let server: http.Server | https.Server | null = null;
    const originalStorage = getLogStorage();

    beforeEach(() => {
        clearLogs();
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        setLogStorage(originalStorage);
        if (server) {
            await close(server);
            server = null;
        }
    });

    async function start(quiet: boolean): Promise<number> {
        server = startLogServer({ port: 0, host: "127.0.0.1", quiet });
        return listening(server);
    }

    test("prints each log level with its own terminal label", async () => {
        const out = vi.spyOn(console, "log").mockImplementation(() => undefined);
        const port = await start(false);
        const levels = ["ERROR", "WARN", "WARNING", "INFO", "DEBUG", "TRACE", "LOG", "CUSTOM"];

        const reply = await postLog(port, {
            sessionId: "levels-1",
            logs: levels.map((level) => ({ time: new Date().toISOString(), level, message: `msg-${level}` })),
        });
        expect(reply.status).toBe(200);

        const line = (level: string): string =>
            out.mock.calls.map((c) => String(c[0])).find((l) => l.endsWith(`msg-${level}`)) ?? "";
        expect(line("ERROR")).toContain(" ERROR ");
        expect(line("WARN")).toContain(" WARN  ");
        expect(line("WARNING")).toContain(" WARN  ");
        expect(line("INFO")).toContain(" INFO  ");
        expect(line("DEBUG")).toContain(" DEBUG ");
        expect(line("TRACE")).toContain(" TRACE ");
        expect(line("LOG")).toContain(" LOG   ");
        expect(line("CUSTOM")).toContain(" LOG   ");
    });

    test("reports an invalid batch on the terminal when not quiet", async () => {
        const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        const port = await start(false);

        const reply = await postLog(port, { sessionId: 42, logs: "nope" });

        expect(reply.status).toBe(400);
        expect((JSON.parse(reply.body) as { error: string }).error).toBe("Invalid log batch");
        expect(err.mock.calls.some((c) => c[0] === "Invalid log batch:")).toBe(true);
    });

    test("answers 400 with the storage's message when storing fails", async () => {
        class FullStorage extends LogStorage {
            override addLogs(): void {
                throw new Error("storage is full");
            }
        }
        setLogStorage(new FullStorage());
        const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        const port = await start(false);

        const reply = await postLog(port, {
            sessionId: "full-1",
            logs: [{ time: new Date().toISOString(), level: "INFO", message: "x" } satisfies LogEntry],
        });

        expect(reply.status).toBe(400);
        expect(JSON.parse(reply.body)).toEqual({ error: "storage is full" });
        expect(err.mock.calls.some((c) => c[0] === "Error storing log batch:")).toBe(true);
    });

    test("serves the browser bundle again from its cache, and without a Host header", async () => {
        const port = await start(true);

        const first = await send({ port, path: "/remote-logger.js", method: "GET" });
        const second = await getWithoutHost(port, "/remote-logger.js");

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(first.body).toContain(`window.__REMOTE_LOG_SERVER_URL__="http://127.0.0.1:${port}"`);
        // No Host header: the server falls back to its configured host
        expect(second.body.startsWith('window.__REMOTE_LOG_SERVER_URL__="http://127.0.0.1:')).toBe(true);
        expect(second.body.slice(second.body.indexOf("\n"))).toBe(first.body.slice(first.body.indexOf("\n")));
    });

    test("GET /logs/recent?errors=true returns only errors", async () => {
        const port = await start(true);
        await postLog(port, {
            sessionId: "recent-1",
            logs: [
                { time: new Date().toISOString(), level: "INFO", message: "fine" },
                { time: new Date().toISOString(), level: "ERROR", message: "bad" },
            ],
        });

        const reply = await send({ port, path: "/logs/recent?errors=true", method: "GET" });
        const data = JSON.parse(reply.body) as { total: number; logs: { message: string }[] };

        expect(data.total).toBe(1);
        expect(data.logs.map((l) => l.message)).toEqual(["bad"]);
    });

    test("refuses a viewer route from an opaque origin", async () => {
        const port = await start(true);
        const reply = await send({ port, path: "/logs", method: "GET", headers: { Origin: "null" } });
        expect(reply.status).toBe(403);
    });

    test("answers 500 instead of crashing when a route throws", async () => {
        const hosts: string[] = [];
        setProxy({
            handleRequest: (_req, _res, _target, _protocol, requestHost) => {
                hosts.push(requestHost);
                throw new Error("proxy exploded");
            },
            close: () => undefined,
        });
        const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        const port = await start(false);

        const reply = await getWithoutHost(port, "/proxy/http%3A%2F%2Fexample.com%2F");

        expect(reply.status).toBe(500);
        expect(JSON.parse(reply.body)).toEqual({ error: "Internal server error" });
        expect(err.mock.calls.some((c) => c[0] === "Error handling request:")).toBe(true);
        // Without a Host header the proxy is told the server's own host
        expect(hosts).toHaveLength(1);
        expect(hosts[0].startsWith("127.0.0.1:")).toBe(true);
    });

    test("ends the response when a route throws after sending headers", async () => {
        setProxy({
            handleRequest: (_req, res) => {
                res.writeHead(202, { "Content-Type": "text/plain" });
                res.write("partial");
                throw new Error("late failure");
            },
            close: () => undefined,
        });
        const port = await start(true);

        const reply = await send({ port, path: "/proxy/http%3A%2F%2Fexample.com%2F", method: "GET" });

        expect(reply.status).toBe(202);
        expect(reply.body).toBe("partial");
    });

    describe("HTTPS", () => {
        let dir: string;
        let certPath: string;
        let keyPath: string;

        beforeEach(async () => {
            dir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-logger-cert-"));
            certPath = path.join(dir, "cert.pem");
            keyPath = path.join(dir, "key.pem");
            const { cert, key } = await generateSelfSignedCert("127.0.0.1");
            fs.writeFileSync(certPath, cert);
            fs.writeFileSync(keyPath, key);
        });

        afterEach(() => {
            fs.rmSync(dir, { recursive: true, force: true });
        });

        test("startLogServer answers requests over HTTPS", async () => {
            server = startLogServer({ port: 0, host: "127.0.0.1", quiet: true, certPath, keyPath });
            const port = await listening(server);

            const reply = await send(
                { port, path: "/health", method: "GET", rejectUnauthorized: false },
                undefined,
                https,
            );

            expect(reply.status).toBe(200);
            expect((JSON.parse(reply.body) as { status?: string }).status).toBeDefined();
        });

        test("createLogServer names the certificate it uses when not quiet", async () => {
            const out = vi.spyOn(console, "log").mockImplementation(() => undefined);
            const created = createLogServer({
                port: 0,
                host: "127.0.0.1",
                storage: new LogStorage(),
                quiet: false,
                certPath,
                keyPath,
            });
            ({ server } = created);
            server.listen(0, "127.0.0.1");
            const port = await listening(server);

            const reply = await send(
                { port, path: "/health", method: "GET", rejectUnauthorized: false },
                undefined,
                https,
            );

            expect(reply.status).toBe(200);
            expect(out.mock.calls.some((c) => String(c[0]).includes(`Using SSL certificates from: ${certPath}`))).toBe(
                true,
            );
        });
    });
});

describe("command line", () => {
    const originalArgv = process.argv;

    afterEach(() => {
        process.argv = originalArgv;
        vi.restoreAllMocks();
    });

    test("--mcp is the old spelling of --mcp-only", () => {
        expect(parseArgs(["--mcp"], {})).toEqual({ options: { mcpOnly: true }, showHelp: false });
    });

    function stubExit(): void {
        vi.spyOn(process, "exit").mockImplementation((code) => {
            throw new Error(`exit ${String(code)}`);
        });
    }

    test("main prints the help text and exits 0 for --help", async () => {
        stubExit();
        const out = vi.spyOn(console, "log").mockImplementation(() => undefined);
        process.argv = ["node", "remote-log-server", "--help"];

        await expect(main()).rejects.toThrow("exit 0");
        expect(out).toHaveBeenCalledWith(HELP_TEXT);
    });

    test("main prints the parse error and exits 1 for an unknown option", async () => {
        stubExit();
        const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
        process.argv = ["node", "remote-log-server", "--bogus"];

        await expect(main()).rejects.toThrow("exit 1");
        expect(err).toHaveBeenCalledWith("Unknown option: --bogus");
    });
});
