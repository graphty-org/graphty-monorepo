// The one shared SonarQube MCP server for this machine, run under servherd (tools/README.md, "SonarQube MCP").
// It runs SonarSource's sonarqube-mcp-server jar in its HTTP transport on 127.0.0.1:$PORT and writes its URL to
// tmp/sonarqube-mcp/url in the main checkout, where every session's stdio shim (shim.mjs, run by .mcp.json) finds
// it. Each request carries the caller's own `Authorization: Bearer` header (the server's TOKEN auth mode).

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { loadConfig } from "../sonar/api.mjs";

import { mainCheckout } from "./lib.mjs";

const port = process.env.PORT;
if (!port) {
    console.error("sonarqube-mcp: PORT is not set; start it through servherd, which sets PORT");
    process.exit(1);
}
const root = mainCheckout();
const cfg = loadConfig(root);
if (!cfg.host) {
    console.error("sonarqube-mcp: SONAR_HOST_URL is not set (environment or .env)");
    process.exit(1);
}
const home = process.env.SONARQUBE_MCP_HOME ?? join(homedir(), ".local/share/sonarqube-mcp");
const java = cfg.java ?? "java";

const child = spawn(java, ["-jar", join(home, "sonarqube-mcp-server.jar")], {
    stdio: ["ignore", "inherit", "inherit"],
    env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        SONARQUBE_URL: cfg.host,
        STORAGE_PATH: join(home, "storage"),
        SONARQUBE_TRANSPORT: "http",
        SONARQUBE_HTTP_HOST: "127.0.0.1",
        SONARQUBE_HTTP_PORT: port,
        // Only so the server downloads the analyzers analyze_code_snippet needs; requests still authenticate
        // with their own Bearer header.
        ...(cfg.adminToken ? { SONARQUBE_TOKEN: cfg.adminToken } : {}),
    },
});

const urlFile = join(root, "tmp/sonarqube-mcp/url");
mkdirSync(join(root, "tmp/sonarqube-mcp"), { recursive: true });
writeFileSync(urlFile, `http://127.0.0.1:${port}/mcp\n`);

const stop = () => child.kill("SIGTERM");
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code, signal) => {
    rmSync(urlFile, { force: true });
    process.exit(code ?? (signal ? 1 : 0));
});
