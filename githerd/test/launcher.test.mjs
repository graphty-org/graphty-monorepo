import { spawn } from "node:child_process";
import {
    chmodSync,
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { ensureDaemon, launcherContext, pm2Command, runLauncher } from "../lib/launcher.mjs";
import { bootId } from "../lib/proc.mjs";
import { PACKAGE_DIR } from "../lib/version.mjs";

const FAKE_SERVHERD = fileURLToPath(new URL("helpers/fake-servherd.mjs", import.meta.url));
const FAKE_NOTIFY = fileURLToPath(new URL("helpers/fake-notify.mjs", import.meta.url));
const LAUNCHER_BIN = fileURLToPath(new URL("../bin/githerd-mcp.mjs", import.meta.url));

/** @type {string} */
let dir;
/** @type {string} the main checkout */
let root;
/** @type {string} */
let fake;
/** @type {Record<string, string | undefined>} */
let env;
/** @type {import("node:child_process").ChildProcess[]} */
let launchers;
/** @type {import("node:http").Server[]} */
let servers;

beforeAll(() => isolateGit());

/**
 * Whether a process is alive (a zombie is not).
 * @param {number} pid the process
 * @returns {boolean} true when alive
 */
function alive(pid) {
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return stat.slice(stat.lastIndexOf(")") + 2)[0] !== "Z";
    } catch {
        return false;
    }
}

/**
 * Waits for a condition, checking every 50 ms.
 * @param {() => unknown} check returns truthy when done
 * @param {string} what for the failure message
 * @param {number} [ms] the limit
 * @returns {Promise<any>} the check's value
 */
async function until(check, what, ms = 15_000) {
    const end = Date.now() + ms;
    for (;;) {
        const value = await check();
        if (value) return value;
        if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
        await new Promise((r) => setTimeout(r, 50));
    }
}

/**
 * The fake servherd's recorded invocations.
 * @returns {{pid: number, argv: string[], cwd: string}[]} the calls
 */
function calls() {
    const file = join(fake, "calls.jsonl");
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
}

const starts = () => calls().filter((c) => c.argv.includes("start") && c.argv[0] !== "pm2");
const registry = () => JSON.parse(readFileSync(join(fake, "registry.json"), "utf8"));
const daemonFile = () => JSON.parse(readFileSync(join(root, ".githerd", "daemon.json"), "utf8"));

/**
 * Writes the package into the main checkout and pushes it to origin.
 * @param {string} message the commit message
 * @param {(pkg: string) => void} [change] edits the copy before the commit
 */
function pushPackage(message, change) {
    const pkg = join(root, "githerd");
    for (const part of ["bin", "lib", "package.json"])
        cpSync(join(PACKAGE_DIR, part), join(pkg, part), { recursive: true });
    change?.(pkg);
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", message);
    git(root, "push", "-q", "origin", "master");
}

/**
 * The context the launcher builds in `cwd`, with test settings.
 * @param {object} [options] overrides
 * @param {string} [options.cwd] where
 * @param {() => Date} [options.now] the clock
 * @param {number} [options.healthWaitMs] the start wait
 * @returns {import("../lib/launcher.mjs").LauncherContext} the context
 */
function context({ cwd = root, now, healthWaitMs = 15_000 } = {}) {
    const found = launcherContext({ cwd, env, pkgDir: "githerd", healthWaitMs, ...(now ? { now } : {}) });
    if (found.kind !== "ready") throw new Error(`launcher not ready: ${found.kind}`);
    return found.ctx;
}

/**
 * The /health answer of the daemon `daemon.json` names.
 * @returns {Promise<any>} the answer
 */
async function health() {
    const res = await fetch(`http://127.0.0.1:${daemonFile().port}/health`);
    return res.json();
}

/**
 * Writes the config the launcher and the daemon read through GITHERD_CONFIG.
 * @param {Record<string, unknown>} [overrides] fields to change
 */
function writeConfig(overrides = {}) {
    const config = {
        repo: "o/r",
        lanes: { ci: { workflow: "ci.yml", gating: "required" } },
        pollSeconds: 60,
        servherdCommand: [process.execPath, FAKE_SERVHERD],
        notify: { command: null },
        ...overrides,
    };
    writeFileSync(/** @type {string} */ (env.GITHERD_CONFIG), JSON.stringify(config));
}

/**
 * Spawns the launcher binary.
 * @param {Record<string, string | undefined>} [extra] environment additions
 * @returns {{child: import("node:child_process").ChildProcess, out: () => string,
 *   send: (msg: object) => void, reply: (id: number) => Promise<any>}} the launcher
 */
function spawnLauncher(extra = {}) {
    const child = spawn(process.execPath, [LAUNCHER_BIN], {
        cwd: root,
        detached: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...env, ...extra },
    });
    launchers.push(child);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", () => {});
    return {
        child,
        out: () => out,
        send: (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`),
        reply: (id) =>
            until(
                () =>
                    out
                        .split("\n")
                        .filter(Boolean)
                        .map((l) => JSON.parse(l))
                        .find((m) => m.id === id),
                `reply ${id}`,
                30_000,
            ),
    };
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-launcher-"));
    root = join(dir, "main");
    fake = join(dir, "servherd");
    mkdirSync(fake);
    // A gh that is never reached: every call the daemon makes fails as a network error.
    const bin = join(dir, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "gh"), "#!/bin/sh\necho 'fake gh: offline' >&2\nexit 1\n");
    chmodSync(join(bin, "gh"), 0o755);
    env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHERD_CONFIG: join(dir, "githerd.config.json") };
    env.FAKE_SERVHERD_DIR = fake;
    env.GITHERD_PM2 = JSON.stringify([process.execPath, FAKE_SERVHERD, "pm2"]);
    delete env.GITHERD_URL;
    delete env.GITHERD_RUN_TOKEN;
    delete env.PM2_HOME;
    writeConfig();

    launchers = [];
    servers = [];
    mkdirSync(root);
    git(root, "init", "-q", "-b", "master");
    git(root, "config", "user.name", "Test");
    git(root, "config", "user.email", "test@example.com");
    git(dir, "init", "-q", "--bare", "remote.git");
    git(root, "remote", "add", "origin", join(dir, "remote.git"));
    pushPackage("first");
    git(root, "remote", "set-head", "origin", "master");
});

afterEach(async () => {
    for (const child of launchers) {
        try {
            process.kill(-(/** @type {number} */ (child.pid)), "SIGKILL");
        } catch {
            // already gone
        }
    }
    for (const server of servers) server.close();
    const pidsFile = join(fake, "pids.jsonl");
    const pids = existsSync(pidsFile) ? readFileSync(pidsFile, "utf8").trim().split("\n").map(Number) : [];
    for (const pid of pids) {
        for (const target of [-pid, pid]) {
            try {
                process.kill(target, "SIGKILL");
            } catch {
                // already gone
            }
        }
    }
    const all = [...pids, ...launchers.map((c) => /** @type {number} */ (c.pid))];
    await until(() => all.every((pid) => !alive(pid)), "every process to exit", 5000);
    expect(all.filter(alive)).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
});

describe("startup", () => {
    it("answers initialize while servherd is still starting the daemon", async () => {
        const launcher = spawnLauncher({ FAKE_SERVHERD_SLEEP_MS: "20000" });
        // The launcher has called servherd, which now sleeps for 20 s.
        await until(() => starts().length === 1, "the servherd start call");
        launcher.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
        launcher.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
        expect((await launcher.reply(1)).result.serverInfo.name).toBe("githerd");
        const tools = (await launcher.reply(2)).result.tools.map((/** @type {any} */ t) => t.name);
        expect(tools).toEqual([
            "githerd_status",
            "githerd_claim",
            "githerd_release",
            "githerd_report",
            "githerd_escalate",
            "githerd_resolve",
        ]);
        expect(existsSync(join(fake, "registry.json"))).toBe(false);
    });

    it("cold start archives the default branch's package and starts it with pm2 autorestart on", async () => {
        const result = await ensureDaemon(context());
        expect(result.action).toBe("started");

        const hash = git(root, "rev-parse", "origin/master:githerd");
        const version = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf8")).version;
        const copy = join(root, ".githerd", "versions", `${version}-${hash.slice(0, 8)}`);
        expect(JSON.parse(readFileSync(join(copy, "version.json"), "utf8"))).toEqual({ version, codeHash: hash });

        const [start] = starts();
        expect(start.cwd).toBe(root);
        expect(start.argv.slice(start.argv.indexOf("--") + 1)).toEqual([
            "node",
            join(copy, "bin", "githerd-daemon.mjs"),
        ]);
        expect(start.argv).toContain("PORT={{port}}");
        // The pm2 process servherd made was deleted and started again with autorestart on.
        const pm2 = calls()
            .filter((c) => c.argv[0] === "pm2")
            .map((c) => c.argv.slice(0, 2).join(" "));
        expect(pm2).toEqual(["pm2 delete", "pm2 start"]);
        // servherd's pm2, not a second one in ~/.pm2.
        for (const c of calls().filter((c) => c.argv[0] === "pm2")) {
            expect(c.pm2Home).toBe(join(homedir(), ".servherd", "pm2"));
        }
        expect(registry().githerd.autorestart).toBe(true);

        const h = await health();
        expect(h).toMatchObject({ name: "githerd", root, codeHash: hash, pid: registry().githerd.pid });
        expect(result.url).toBe(`http://127.0.0.1:${h.port}`);
    });

    it("reuses a warm daemon without calling servherd", async () => {
        await ensureDaemon(context());
        const before = calls().length;
        const again = await ensureDaemon(context());
        expect(again.action).toBe("warm");
        expect(calls()).toHaveLength(before);
    });

    it("does not restart for a stale lastPollOkAt alone", async () => {
        await ensureDaemon(context());
        const h = await health();
        // Every gh call fails: GitHub is "down", but the loop ticks.
        expect(h.lastPollOkAt).toBeNull();
        expect(h.loopTickAt).not.toBeNull();
        const before = calls().length;
        expect((await ensureDaemon(context())).action).toBe("warm");
        expect(calls()).toHaveLength(before);
    });

    it("never runs a worktree's local code", async () => {
        const wt = join(dir, "wt");
        git(root, "worktree", "add", "-q", "-b", "feature", wt);
        writeFileSync(join(wt, "githerd", "lib", "version.mjs"), "throw new Error('worktree code ran');\n");
        git(wt, "commit", "-q", "-am", "local change");

        const ctx = context({ cwd: wt });
        expect(ctx.root).toBe(root);
        await ensureDaemon(ctx);
        const [start] = starts();
        const daemon = start.argv[start.argv.length - 1];
        expect(daemon.startsWith(join(root, ".githerd", "versions"))).toBe(true);
        expect(readFileSync(join(daemon, "..", "..", "lib", "version.mjs"), "utf8")).toBe(
            readFileSync(join(PACKAGE_DIR, "lib", "version.mjs"), "utf8"),
        );
        expect((await health()).codeHash).toBe(git(root, "rev-parse", "origin/master:githerd"));
    });

    it("exits quietly outside a git repository", async () => {
        const outside = mkdtempSync(join(tmpdir(), "githerd-outside-"));
        /** @type {string[]} */
        const written = [];
        const input = new PassThrough();
        input.end(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })}\n`);
        const { ensured } = await runLauncher({ input, write: (l) => written.push(l), cwd: outside, env });
        expect(ensured).toBeNull();
        expect(written).toEqual([]);
        expect(calls()).toEqual([]);
        rmSync(outside, { recursive: true, force: true });
    });

    it("answers 'not configured' and starts nothing without a config", async () => {
        delete env.GITHERD_CONFIG;
        /** @type {string[]} */
        const written = [];
        const input = new PassThrough();
        input.end(
            `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "githerd_status" } })}\n`,
        );
        await runLauncher({ input, write: (l) => written.push(l), cwd: root, env });
        expect(JSON.parse(written[0]).result.content[0].text).toMatch(/githerd is not configured/);
        expect(calls()).toEqual([]);
    });
});

describe("the start lock", () => {
    it("five launchers against a stale lock make exactly one servherd start", async () => {
        const lock = join(root, ".githerd", "start.lock");
        mkdirSync(lock, { recursive: true });
        // A dead owner: no live process has this identity.
        writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: 999_999, startTime: "1", bootId: bootId() }));

        const five = Array.from({ length: 5 }, () => spawnLauncher());
        five.forEach((l, i) =>
            l.send({ jsonrpc: "2.0", id: i + 1, method: "tools/call", params: { name: "githerd_status" } }),
        );
        const replies = await Promise.all(five.map((l, i) => l.reply(i + 1)));
        for (const r of replies) expect(r.result.isError).toBeUndefined();
        expect(starts()).toHaveLength(1);
        expect(existsSync(lock)).toBe(false);
        expect(readdirSync(join(root, ".githerd")).filter((n) => n.startsWith("start.lock"))).toEqual([]);
    });

    it("does not steal a young lock with no owner.json, and steals an old one", async () => {
        const lock = join(root, ".githerd", "start.lock");
        mkdirSync(lock, { recursive: true });
        await expect(ensureDaemon(context({ healthWaitMs: 300 }))).rejects.toThrow(/another launcher/);
        expect(existsSync(lock)).toBe(true);
        expect(calls()).toEqual([]);

        const old = new Date(Date.now() - 61_000);
        utimesSync(lock, old, old);
        expect((await ensureDaemon(context())).action).toBe("started");
        expect(starts()).toHaveLength(1);
    });
});

describe("restarts and upgrades", () => {
    it("restarts a daemon whose loop is wedged, at most once per 15 minutes", async () => {
        await ensureDaemon(context());
        const first = (await health()).pid;
        // Two hours on, the daemon's last loop tick looks stale while it still answers.
        const later = () => new Date(Date.now() + 2 * 3600_000);
        const result = await ensureDaemon(context({ now: later }));
        expect(result.action).toBe("restarted");
        expect(calls().some((c) => c.argv.join(" ") === "--json restart githerd")).toBe(true);
        expect(starts()).toHaveLength(1);
        expect((await health()).pid).not.toBe(first);

        await expect(ensureDaemon(context({ now: later }))).rejects.toThrow(/less than 15 minutes/);
        expect(calls().filter((c) => c.argv.includes("restart"))).toHaveLength(1);
    });

    it("upgrades to a new hash on the default branch", async () => {
        await ensureDaemon(context());
        pushPackage("second", (pkg) => writeFileSync(join(pkg, "lib", "extra.mjs"), "export {};\n"));
        const hash = git(root, "rev-parse", "origin/master:githerd");
        const result = await ensureDaemon(context());
        expect(result.action).toBe("started");
        expect(starts()).toHaveLength(2);
        expect((await health()).codeHash).toBe(hash);
    });

    it("waits for runs in flight before an upgrade", async () => {
        // A daemon on old code that reports one run in flight.
        const server = createServer((req, res) => {
            res.end(
                JSON.stringify({
                    name: "githerd",
                    protocol: 1,
                    root,
                    codeHash: "0".repeat(40),
                    port: /** @type {any} */ (server.address()).port,
                    loopTickAt: new Date().toISOString(),
                    runsInFlight: 1,
                }),
            );
        });
        servers.push(server);
        await new Promise((r) => server.listen(0, "127.0.0.1", () => r(undefined)));
        const port = /** @type {any} */ (server.address()).port;
        mkdirSync(join(root, ".githerd"), { recursive: true });
        writeFileSync(join(root, ".githerd", "daemon.json"), JSON.stringify({ port }));

        const result = await ensureDaemon(context());
        expect(result).toEqual({ url: `http://127.0.0.1:${port}`, action: "waiting" });
        expect(calls()).toEqual([]);
    });

    it("logs and pages once when the daemon does not come up", async () => {
        pushPackage("broken daemon", (pkg) =>
            writeFileSync(join(pkg, "bin", "githerd-daemon.mjs"), "process.exit(1);\n"),
        );
        const notifyLog = join(dir, "notify.log");
        writeConfig({ notify: { command: [process.execPath, FAKE_NOTIFY, notifyLog, "ok", "{status}", "{message}"] } });
        await expect(ensureDaemon(context({ healthWaitMs: 1000 }))).rejects.toThrow(/failed to start/);
        const log = readFileSync(join(root, ".githerd", "launcher.log"), "utf8");
        expect(log).toMatch(/ error githerd daemon failed to start: /);
        const pages = readFileSync(notifyLog, "utf8")
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l).args);
        expect(pages).toHaveLength(1);
        expect(pages[0][0]).toBe("error");
        expect(pages[0][1]).toMatch(/^githerd daemon failed to start: /);
    });
});

describe("the session proxy", () => {
    it("brings a killed daemon back after a failed heartbeat", async () => {
        const input = new PassThrough();
        const running = runLauncher({
            input,
            write: () => {},
            cwd: root,
            env,
            ppid: 4242,
            pkgDir: "githerd",
            heartbeatMs: 100,
            jitterMs: 0,
            log: () => {},
        });
        await until(() => existsSync(join(root, ".githerd", "daemon.json")) && starts().length === 1, "the cold start");
        const first = await until(async () => (await health().catch(() => null))?.pid, "the first daemon");
        // The heartbeat registered the session with the daemon.
        await until(() => {
            try {
                const { sessions } = JSON.parse(readFileSync(join(root, ".githerd", "state.json"), "utf8"));
                return Object.keys(sessions ?? {}).includes("main-4242");
            } catch {
                return false; // not written yet
            }
        }, "the heartbeat");

        process.kill(-first, "SIGKILL");
        await until(() => !alive(first), "the daemon to die");
        const second = await until(async () => {
            const h = await health().catch(() => null);
            return h && h.pid !== first ? h.pid : null;
        }, "the daemon to come back");
        expect(second).not.toBe(first);
        expect(starts()).toHaveLength(2);
        input.end();
        await running;
    });

    it("forwards to GITHERD_URL with the run token and never calls servherd", async () => {
        /** @type {any[]} */
        const seen = [];
        const server = createServer((req, res) => {
            let body = "";
            req.on("data", (d) => (body += d));
            req.on("end", () => {
                seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body) });
                const msg = JSON.parse(body);
                res.end(
                    JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "ok" }] } }),
                );
            });
        });
        servers.push(server);
        await new Promise((r) => server.listen(0, "127.0.0.1", () => r(undefined)));
        const url = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
        env.GITHERD_URL = url;
        env.GITHERD_RUN_TOKEN = "t0ken";

        /** @type {string[]} */
        const written = [];
        const input = new PassThrough();
        const running = runLauncher({
            input,
            write: (l) => written.push(l),
            cwd: root,
            env,
            ppid: 7,
            pkgDir: "githerd",
        });
        input.end(
            `${JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "githerd_status" } })}\n`,
        );
        await running;
        expect(JSON.parse(written[0]).result.content[0].text).toBe("ok");
        expect(seen[0].url).toBe("/rpc");
        expect(seen[0].headers.authorization).toBe("Bearer t0ken");
        expect(seen[0].headers["x-githerd-session"]).toBe("main-7");
        expect(await ensureDaemon(context())).toEqual({ url, action: "run" });
        expect(calls()).toEqual([]);
    });

    it("reports an unreachable daemon as a tool error after the wait", async () => {
        pushPackage("broken daemon", (pkg) =>
            writeFileSync(join(pkg, "bin", "githerd-daemon.mjs"), "process.exit(1);\n"),
        );
        /** @type {string[]} */
        const written = [];
        const input = new PassThrough();
        const running = runLauncher({
            input,
            write: (l) => written.push(l),
            cwd: root,
            env,
            pkgDir: "githerd",
            callWaitMs: 300,
            healthWaitMs: 2000,
            log: () => {},
        });
        input.end(
            `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "githerd_status" } })}\n`,
        );
        const { ensured } = await running;
        await ensured;
        const reply = JSON.parse(written[0]);
        expect(reply.result.isError).toBe(true);
        expect(reply.result.content[0].text).toMatch(/^githerd daemon not reachable: no daemon after 0.3 s/);
    });

    it("writes only JSON-RPC lines to stdout", async () => {
        const launcher = spawnLauncher();
        launcher.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
        launcher.send({ jsonrpc: "2.0", method: "notifications/initialized" });
        launcher.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
        launcher.send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "githerd_status" } });
        const status = await launcher.reply(3);
        expect(status.result.isError).toBeUndefined();
        expect(status.result.content[0].text).toMatch(/master/i);
        launcher.child.stdin?.end();
        await new Promise((r) => launcher.child.once("exit", r));
        const lines = launcher.out().split("\n").filter(Boolean);
        expect(lines).toHaveLength(3);
        for (const line of lines) expect(JSON.parse(line).jsonrpc).toBe("2.0");
    });
});

describe("pm2Command", () => {
    it("finds pm2 next to servherd", () => {
        expect(pm2Command(["npx", "-y", "servherd"], {})).toEqual(["npx", "-y", "-p", "servherd", "pm2"]);
        expect(pm2Command(["x"], { GITHERD_PM2: '["a","b"]' })).toEqual(["a", "b"]);
        expect(pm2Command(["/nowhere/servherd.js"], {})).toEqual(["pm2"]);
    });
});
