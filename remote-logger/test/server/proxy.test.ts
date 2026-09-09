import * as http from "http";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";
import { injectScript, isValidProxyTarget } from "../../src/server/proxy.js";

function httpGet(
    port: number,
    path: string,
    headers?: Record<string, string>,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: "127.0.0.1", port, path, method: "GET", headers },
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

// Target test server that serves various content types
function createTargetServer(): Promise<{ server: http.Server; port: number }> {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const url = req.url ?? "/";

            if (url === "/" || url === "/index.html") {
                res.writeHead(200, {
                    "Content-Type": "text/html",
                    "Content-Security-Policy": "default-src 'self'",
                });
                res.end("<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>");
                return;
            }

            if (url === "/with-integrity") {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end('<html><head><script src="app.js" integrity="sha256-abc123"></script></head><body></body></html>');
                return;
            }

            if (url === "/style.css") {
                res.writeHead(200, { "Content-Type": "text/css" });
                res.end("body { color: red; }");
                return;
            }

            if (url === "/api/data") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ key: "value" }));
                return;
            }

            if (url === "/redirect") {
                res.writeHead(302, { "Location": "http://127.0.0.1:" + (server.address() as { port: number }).port + "/index.html" });
                res.end();
                return;
            }

            if (url === "/set-cookie") {
                res.writeHead(200, {
                    "Content-Type": "text/html",
                    "Set-Cookie": ["session=abc; Domain=example.com; Path=/", "token=xyz; Path=/"],
                });
                res.end("<html><body>cookies</body></html>");
                return;
            }

            if (url === "/echo-headers") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(req.headers));
                return;
            }

            res.writeHead(404);
            res.end("Not found");
        });

        server.listen(0, "127.0.0.1", () => {
            const port = (server.address() as { port: number }).port;
            resolve({ server, port });
        });
    });
}

describe("Reverse proxy", () => {
    let dualServer: DualServerResult;
    let proxyPort: number;
    let target: { server: http.Server; port: number };

    beforeEach(async () => {
        target = await createTargetServer();
        const port = 8950 + Math.floor(Math.random() * 20);
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
        });
        proxyPort = dualServer.httpPort!;
    });

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
        }
        if (target) {
            await new Promise<void>((resolve) => { target.server.close(() => { resolve(); }); });
        }
    });

    test("proxies HTML and injects remote-logger script", async () => {
        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/`);

        expect(res.status).toBe(200);
        expect(res.body).toContain("<h1>Hello</h1>");
        expect(res.body).toContain("remote-logger.js");
        expect(res.body).toContain("<base href=");
    });

    test("injects base tag for absolute path rewriting", async () => {
        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/`);

        expect(res.body).toContain(`<base href="/proxy/http://127.0.0.1:${target.port}/">`);
    });

    test("strips CSP headers from proxied responses", async () => {
        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/`);

        expect(res.headers["content-security-policy"]).toBeUndefined();
    });

    test("strips integrity attributes from script tags", async () => {
        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/with-integrity`);

        expect(res.body).not.toContain("integrity=");
        expect(res.body).toContain('src="app.js"');
    });

    test("passes non-HTML responses through unmodified", async () => {
        const cssRes = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/style.css`);

        expect(cssRes.status).toBe(200);
        expect(cssRes.body).toBe("body { color: red; }");
        expect(cssRes.body).not.toContain("remote-logger");
    });

    test("passes JSON API responses through unmodified", async () => {
        const jsonRes = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/api/data`);

        expect(jsonRes.status).toBe(200);
        expect(JSON.parse(jsonRes.body)).toEqual({ key: "value" });
    });

    test("rewrites Location headers on redirects", async () => {
        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/redirect`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain("/proxy/");
        expect(res.headers.location).toContain("/index.html");
    });

    test("rewrites Set-Cookie Domain attributes", async () => {
        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/set-cookie`);

        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();
        expect(Array.isArray(cookies)).toBe(true);
        for (const cookie of cookies!) {
            expect(cookie.toLowerCase()).not.toContain("domain=example.com");
        }
    });

    test("returns 400 for invalid target URLs", async () => {
        const res = await httpGet(proxyPort, "/proxy/not-a-url");

        expect(res.status).toBe(400);
        expect(res.body).toContain("Invalid target URL");
    });

    test("returns 400 for ftp:// URLs", async () => {
        const res = await httpGet(proxyPort, "/proxy/ftp://example.com/file");

        expect(res.status).toBe(400);
    });

    test("returns 502 for unreachable targets", async () => {
        const res = await httpGet(proxyPort, "/proxy/http://127.0.0.1:1/unreachable");

        expect(res.status).toBe(502);
        expect(res.body).toContain("Bad Gateway");
    });

    test("is available in logReceiveOnly mode", async () => {
        await dualServer.shutdown();

        const port = 8970 + Math.floor(Math.random() * 15);
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            mcpEnabled: false,
            quiet: true,
            logReceiveOnly: true,
        });
        proxyPort = dualServer.httpPort!;

        const res = await httpGet(proxyPort, `/proxy/http://127.0.0.1:${target.port}/`);

        expect(res.status).toBe(200);
        expect(res.body).toContain("remote-logger.js");
    });

    test("overrides User-Agent with standard Chrome UA", async () => {
        const res = await httpGet(
            proxyPort,
            `/proxy/http://127.0.0.1:${target.port}/echo-headers`,
            { "User-Agent": "TestBot/1.0" },
        );

        expect(res.status).toBe(200);
        const headers = JSON.parse(res.body);
        expect(headers["user-agent"]).toContain("Chrome");
        expect(headers["user-agent"]).not.toContain("TestBot");
    });
});

describe("injectScript", () => {
    test("injects before </head>", () => {
        const html = "<html><head><title>Test</title></head><body></body></html>";
        const result = injectScript(html, "/remote-logger.js", "/proxy/http://example.com/");

        expect(result).toContain('<base href="/proxy/http://example.com/">');
        expect(result).toContain('<script src="/remote-logger.js"></script>');
        expect(result.indexOf("<base")).toBeLessThan(result.indexOf("</head>"));
    });

    test("falls back to </body> when no </head>", () => {
        const html = "<html><body><p>Hi</p></body></html>";
        const result = injectScript(html, "/remote-logger.js", "/proxy/http://example.com/");

        expect(result).toContain("remote-logger.js");
        expect(result.indexOf("<base")).toBeLessThan(result.indexOf("</body>"));
    });

    test("appends when neither </head> nor </body>", () => {
        const html = "<p>Just a fragment</p>";
        const result = injectScript(html, "/remote-logger.js", "/proxy/http://example.com/");

        expect(result).toContain("remote-logger.js");
        expect(result).toContain("<base");
    });

    test("strips integrity attributes", () => {
        const html = '<script src="app.js" integrity="sha256-abc"></script>';
        const result = injectScript(html, "/remote-logger.js", "/proxy/http://example.com/");

        expect(result).not.toContain("integrity=");
        expect(result).toContain('src="app.js"');
    });
});

describe("isValidProxyTarget", () => {
    test("accepts http URLs", () => {
        expect(isValidProxyTarget("http://example.com")).toBe(true);
    });

    test("accepts https URLs", () => {
        expect(isValidProxyTarget("https://example.com/path")).toBe(true);
    });

    test("rejects ftp URLs", () => {
        expect(isValidProxyTarget("ftp://example.com")).toBe(false);
    });

    test("rejects invalid URLs", () => {
        expect(isValidProxyTarget("not-a-url")).toBe(false);
    });

    test("rejects empty strings", () => {
        expect(isValidProxyTarget("")).toBe(false);
    });
});
