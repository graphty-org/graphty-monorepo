import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runHook, sessionStartLine, statusLine } from "../lib/hook.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const HOOK = fileURLToPath(new URL("../bin/githerd-hook.mjs", import.meta.url));

/** @type {string} */
let dir;
/** @type {string} a git repository with no daemon of its own */
let repo;
/** @type {import("node:http").Server | null} */
let server;

const STATUS = {
    banner: "PHONE ALERTS BROKEN since 10-03 10:00: exit 1",
    githerd: { mode: "dry-run" },
    master: { verdict: "red", since: "2026-10-03T09:00:00Z" },
    owner: [{ key: "a" }, { key: "b" }],
    prs: [{ number: 1 }],
};

/**
 * Starts a fake daemon and writes its `daemon.json` into `stateDir`.
 * @param {string} stateDir the state directory
 * @param {(body: any) => [number, unknown]} answer the reply to `/rpc`
 * @returns {Promise<string[]>} the session headers of the `/rpc` calls, filled as they arrive
 */
async function fakeDaemon(stateDir, answer) {
    /** @type {string[]} */
    const sessions = [];
    server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            if (req.url === "/health") return res.end(JSON.stringify({ name: "githerd" }));
            sessions.push(String(req.headers["x-githerd-session"]));
            const [status, reply] = answer(JSON.parse(body));
            res.writeHead(status, { "content-type": "application/json" });
            res.end(typeof reply === "string" ? reply : JSON.stringify(reply));
        });
    });
    await new Promise((done) => server?.listen(0, "127.0.0.1", () => done(undefined)));
    mkdirSync(stateDir, { recursive: true });
    const port = /** @type {import("node:net").AddressInfo} */ (server.address()).port;
    writeFileSync(join(stateDir, "daemon.json"), JSON.stringify({ port }));
    return sessions;
}

/**
 * A daemon reply carrying `githerd_status` text.
 * @param {string} text the tool's text
 * @param {boolean} [isError] whether the tool failed
 * @returns {[number, unknown]} the reply
 */
const toolReply = (text, isError = false) => [
    200,
    { jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text }], ...(isError ? { isError } : {}) } },
];

beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "githerd-hook-")));
    repo = join(dir, "work", "repo");
    mkdirSync(repo, { recursive: true });
    execFileSync("git", ["init", "-q", repo], { env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" } });
    server = null;
});

afterEach(async () => {
    if (server) await new Promise((done) => server?.close(() => done(undefined)));
    rmSync(dir, { recursive: true, force: true });
});

describe("statusLine", () => {
    it("puts the banner first, then master, the owner's list, pull requests and the mode", () => {
        expect(statusLine(STATUS)).toBe(
            "githerd: PHONE ALERTS BROKEN since 10-03 10:00: exit 1; master red since 2026-10-03T09:00:00Z; " +
                "2 waiting on the owner; 1 open pull requests; mode dry-run",
        );
    });

    it("says unknown for what the daemon did not report", () => {
        expect(statusLine({})).toBe(
            "githerd: master unknown; 0 waiting on the owner; 0 open pull requests; mode unknown",
        );
    });
});

describe("sessionStartLine", () => {
    it("asks the daemon for its status as the session that started", async () => {
        const stateDir = join(dir, "state");
        /** @type {any[]} */
        const asked = [];
        const sessions = await fakeDaemon(stateDir, (body) => {
            asked.push(body.params);
            return toolReply(JSON.stringify(STATUS));
        });
        const line = await sessionStartLine({ cwd: repo, session: "s-1", env: { GITHERD_STATE_DIR: stateDir } });
        expect(line).toBe(statusLine(STATUS));
        expect(asked).toEqual([{ name: "githerd_status", arguments: { format: "json" } }]);
        expect(sessions).toEqual(["s-1"]);
    });

    it("says why when no daemon answers, from the default state directory", async () => {
        const line = await sessionStartLine({ cwd: repo, env: { HOME: dir } });
        expect(line).toBe("githerd: daemon not reachable (no daemon.json); run githerd ensure");
    });

    it("says why when the status call fails or the daemon breaks off", async () => {
        const stateDir = join(dir, "state");
        let reply = toolReply("unknown section", true);
        await fakeDaemon(stateDir, () => reply);
        const env = { GITHERD_STATE_DIR: stateDir };
        expect(await sessionStartLine({ cwd: repo, env })).toBe(
            "githerd: the daemon could not give its status: unknown section",
        );
        reply = [500, { jsonrpc: "2.0", id: 1, error: { message: "boom" } }];
        expect(await sessionStartLine({ cwd: repo, env })).toBe("githerd: the daemon could not give its status: boom");
        reply = [200, { jsonrpc: "2.0", id: 1, result: {} }];
        expect(await sessionStartLine({ cwd: repo, env })).toBe("githerd: the daemon could not give its status: 200");
        reply = [200, "not json"];
        expect(await sessionStartLine({ cwd: repo, env })).toMatch(/^githerd: no usable answer from the daemon \(/);
    });

    it("is silent outside a git repository", async () => {
        expect(await sessionStartLine({ cwd: dir, env: { HOME: dir } })).toBeNull();
    });
});

describe("runHook", () => {
    it("prints the line to the person and the session for SessionStart, nothing for other events", async () => {
        const out = await runHook("SessionStart", JSON.stringify({ cwd: repo, session_id: "s" }), {
            cwd: dir,
            env: { HOME: dir },
        });
        const line = "githerd: daemon not reachable (no daemon.json); run githerd ensure";
        expect(JSON.parse(/** @type {string} */ (out))).toEqual({
            systemMessage: line,
            hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: line },
        });
        expect(await runHook("Stop", "{}", { cwd: repo, env: { HOME: dir } })).toBeNull();
        // Without input it uses its own directory; outside a repository it prints nothing.
        expect(await runHook("SessionStart", "", { cwd: dir, env: { HOME: dir } })).toBeNull();
    });
});

describe("bin/githerd-hook.mjs", () => {
    it("prints the hook's JSON for SessionStart and nothing for other events, exiting 0 either way", () => {
        const run = (/** @type {string} */ event) =>
            spawnSync(process.execPath, [HOOK, event], {
                cwd: repo,
                input: JSON.stringify({ cwd: repo }),
                encoding: "utf8",
                env: { PATH: process.env.PATH, HOME: dir },
            });
        const start = run("SessionStart");
        expect(start.status).toBe(0);
        expect(JSON.parse(start.stdout).systemMessage).toMatch(/^githerd: daemon not reachable/);
        expect(run("Stop")).toMatchObject({ status: 0, stdout: "" });
    });
});

describe("the committed project settings", () => {
    const settings = JSON.parse(readFileSync(join(REPO, ".claude", "settings.json"), "utf8"));
    const [entry] = settings.hooks.SessionStart;
    const command = entry.hooks[0].command;

    /**
     * Runs the registered SessionStart command as Claude Code does, with `home` as HOME. It runs
     * asynchronously, so a fake daemon in this process can answer it.
     * @param {string} home the home directory
     * @returns {Promise<{status: number | null, stdout: string, stderr: string}>} the result
     */
    async function runCommand(home) {
        const child = spawn("sh", ["-c", command], { cwd: repo, env: { PATH: process.env.PATH, HOME: home } });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (c) => (stdout += c));
        child.stderr.on("data", (c) => (stderr += c));
        child.stdin.end(JSON.stringify({ cwd: repo, session_id: "s", source: "startup" }));
        const [status] = await once(child, "exit");
        return { status, stdout, stderr };
    }

    it("registers the SessionStart hook for new sessions only", () => {
        expect(entry.matcher).toBe("startup");
        expect(command).toContain("$HOME/.githerd/graphty-monorepo/current/bin/githerd-hook.mjs");
    });

    it("prints the status line when githerd is installed", async () => {
        mkdirSync(join(dir, ".githerd", "graphty-monorepo"), { recursive: true });
        symlinkSync(PKG, join(dir, ".githerd", "graphty-monorepo", "current"));
        await fakeDaemon(join(dir, ".githerd", "repo"), () => toolReply(JSON.stringify(STATUS)));
        const r = await runCommand(dir);
        expect(r.status).toBe(0);
        expect(JSON.parse(r.stdout).systemMessage).toBe(statusLine(STATUS));
    });

    it("does nothing, and exits 0, when githerd is not installed", async () => {
        const r = await runCommand(dir);
        expect(r).toMatchObject({ status: 0, stdout: "", stderr: "" });
    });

    it("starts the MCP server from the installed copy", () => {
        const mcp = JSON.parse(readFileSync(join(REPO, ".mcp.json"), "utf8"));
        expect(mcp.mcpServers.githerd).toEqual({
            command: "node",
            args: ["${HOME}/.githerd/graphty-monorepo/current/bin/githerd-mcp.mjs"],
        });
    });
});
