// The stdio MCP server .mcp.json runs for "sonarqube": a small proxy to the one shared SonarQube MCP server
// (server.mjs, under servherd), so a session costs a node process instead of its own Java server. It forwards
// each JSON-RPC line from stdin as a Streamable HTTP POST with the caller's SonarQube token, and writes every
// message of the reply (plain JSON or an event stream) to stdout.
// ponytail: no server-to-client GET stream and no re-initialize after the shared server restarts; the
// SonarQube tools are plain request/response, and a restart is picked up by restarting the session's MCP.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { loadConfig } from "../sonar/api.mjs";

import { mainCheckout, sseMessages } from "./lib.mjs";

const root = mainCheckout();
const urlFile = join(root, "tmp/sonarqube-mcp/url");
const cfg = loadConfig(root);
const token = cfg.adminToken ?? cfg.token;
if (!token) {
    console.error("sonarqube-mcp shim: no SONAR_TOKEN in the environment or the repository's .env");
    process.exit(1);
}

let url;
try {
    url = readFileSync(urlFile, "utf8").trim();
} catch {
    console.error(
        `sonarqube-mcp shim: the shared server is not running (no ${urlFile}); start it through servherd: ` +
            'name "sonarqube-mcp", cwd the main checkout, command "node tools/sonarqube-mcp/server.mjs", env PORT={{port}}',
    );
    process.exit(1);
}

let sessionId;
let protocolVersion;

const send = (msg) => process.stdout.write(`${typeof msg === "string" ? msg : JSON.stringify(msg)}\n`);

async function forward(line) {
    let msg;
    try {
        msg = JSON.parse(line);
    } catch {
        return;
    }
    const headers = {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${token}`,
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
        ...(protocolVersion ? { "mcp-protocol-version": protocolVersion } : {}),
    };
    try {
        const res = await fetch(url, { method: "POST", headers, body: line });
        sessionId = res.headers.get("mcp-session-id") ?? sessionId;
        const body = await res.text();
        if (!res.ok && res.status !== 202) throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
        const replies = (res.headers.get("content-type") ?? "").includes("text/event-stream")
            ? sseMessages(body)
            : [body].filter((b) => b.trim().length > 0);
        for (const reply of replies) {
            if (msg.method === "initialize") protocolVersion = JSON.parse(reply).result?.protocolVersion;
            send(reply);
        }
    } catch (err) {
        console.error(`sonarqube-mcp shim: ${url}: ${err.message}`);
        if (msg.id !== undefined) send({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: err.message } });
    }
}

createInterface({ input: process.stdin }).on("line", (line) => void forward(line));
