import { spawn } from "node:child_process";
import {
    chmodSync,
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    readlinkSync,
    rmSync,
    statSync,
    symlinkSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import {
    backgroundGating,
    daemonDown,
    ensureDaemon,
    installCommand,
    launcherContext,
    loadDaemonEnv,
    pm2Command,
    prepareUpdate,
    runLauncher,
    targetCode,
    sessionTypedAt,
    transcriptTyped,
    writeDaemonEnv,
} from "../lib/launcher.mjs";
import { TOOL_PROTOCOL, TOOLS } from "../lib/mcp.mjs";
import { bootId, identify } from "../lib/proc.mjs";
import { gateTree, readSelfUpdate, stopGating, writeSelfUpdate } from "../lib/self-update.mjs";
import { run } from "../lib/worktrees.mjs";
import { PACKAGE_DIR } from "../lib/version.mjs";

const FAKE_SERVHERD = fileURLToPath(new URL("helpers/fake-servherd.mjs", import.meta.url));
const FAKE_NOTIFY = fileURLToPath(new URL("helpers/fake-notify.mjs", import.meta.url));
const LAUNCHER_BIN = fileURLToPath(new URL("../bin/githerd-mcp.mjs", import.meta.url));
const CLI_BIN = fileURLToPath(new URL("../bin/githerd.mjs", import.meta.url));

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
 * The fake servherd's recorded invocations, every call but `pm2 jlist`: the launcher reads pm2's
 * list while it waits for a daemon it started, to notice one that exited (`startWatch`).
 * @returns {{pid: number, argv: string[], cwd: string}[]} the calls
 */
function calls() {
    const file = join(fake, "calls.jsonl");
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
        .filter((c) => !(c.argv[0] === "pm2" && c.argv[1] === "jlist"));
}

const starts = () => calls().filter((c) => c.argv[1] === "start");
const registry = () => JSON.parse(readFileSync(join(fake, "registry.json"), "utf8"));
/**
 * Every live process running the state directory's daemon.
 * @returns {number[]} their pids
 */
function daemonPids() {
    const script = join(stateDir(), "current", "bin", "githerd-daemon.mjs");
    return readdirSync("/proc")
        .filter((name) => /^\d+$/.test(name))
        .filter((pid) => {
            try {
                return readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").includes(script) && alive(Number(pid));
            } catch {
                return false; // gone meanwhile
            }
        })
        .map(Number);
}

/**
 * Writes a fresh `alive` for a daemon this test pretends is running.
 */
function pretendAlive() {
    mkdirSync(stateDir(), { recursive: true });
    writeFileSync(join(stateDir(), "alive"), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
}
/**
 * The checkout's state directory under the test's HOME.
 * @returns {string} the directory
 */
const stateDir = () => join(dir, "home", ".githerd", "main");
const daemonFile = () => JSON.parse(readFileSync(join(stateDir(), "daemon.json"), "utf8"));

/**
 * Gates the default branch's version with stand-in gates (the real ones run vitest and claude):
 * replay passes, protocol passes or fails, self-test passes.
 * @param {boolean} passes whether the protocol gate passes
 * @returns {Promise<string[]>} the gates that ran
 */
async function gateWith(passes) {
    const ran = [];
    /**
     * A stand-in gate that records it ran.
     * @param {string} name the gate
     * @param {boolean} ok its result
     * @returns {import("../lib/self-update.mjs").Gate} the gate
     */
    const gate = (name, ok) => ({
        name,
        run: async () => {
            ran.push(name);
            return { ok, detail: ok ? "fine" : "broken" };
        },
    });
    const ctx = context();
    await prepareUpdate(ctx, await targetCode(ctx), [
        gate("replay", true),
        gate("protocol", passes),
        gate("self-test", true),
    ]);
    return ran;
}

/**
 * Writes the package into the main checkout and pushes it to origin.
 * @param {string} message the commit message
 * @param {(pkg: string) => void} [change] edits the copy before the commit
 */
function pushPackage(message, change) {
    const pkg = join(root, "githerd");
    for (const part of ["bin", "lib", "package.json"])
        cpSync(join(PACKAGE_DIR, part), join(pkg, part), { recursive: true });
    // The shared daemon reads the default branch's config, never GITHERD_CONFIG.
    // The main checkout's installed dependencies, which an archived copy links to; never committed.
    writeFileSync(join(pkg, ".gitignore"), "node_modules\n");
    if (!existsSync(join(pkg, "node_modules")))
        symlinkSync(join(PACKAGE_DIR, "node_modules"), join(pkg, "node_modules"));
    cpSync(/** @type {string} */ (env.GITHERD_CONFIG), join(root, "githerd.config.json"));
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
 * Starts the daemon and waits out its first loop tick. That tick gates the default branch's version
 * when it differs from the daemon's own, with the real gates, holding the gate lock: a version
 * pushed before it finished would be the daemon's to gate, not the test's. The next tick is
 * `pollSeconds` (60) away, longer than any test.
 */
async function startDaemon() {
    await ensureDaemon(context());
    await until(async () => (await health()).nextPollAt, "the daemon's first loop tick");
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
 * @param {string} [cwd] where it runs
 * @returns {{child: import("node:child_process").ChildProcess, out: () => string,
 *   send: (msg: object) => void, reply: (id: number) => Promise<any>}} the launcher
 */
function spawnLauncher(extra = {}, cwd = root) {
    const child = spawn(process.execPath, [LAUNCHER_BIN], {
        cwd,
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
    delete env.PM2_HOME;
    delete env.GITHERD_STATE_DIR;
    env.HOME = join(dir, "home");
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
        expect(tools).toEqual(TOOLS.map((t) => t.name));
        expect(existsSync(join(fake, "registry.json"))).toBe(false);
    });

    it("cold start archives the default branch's package and starts it from the fixed directory under env -i", async () => {
        env.CLAUDE_STALE = "1";
        env.PUSHOVER_USER_KEY = "k3y";
        const result = await ensureDaemon(context());
        expect(result.action).toBe("started");

        const hash = git(root, "rev-parse", "origin/master:githerd");
        const version = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf8")).version;
        const copy = join(stateDir(), "versions", `${version}-${hash.slice(0, 8)}`);
        expect(JSON.parse(readFileSync(join(copy, "version.json"), "utf8"))).toEqual({
            version,
            codeHash: hash,
            pkgDir: "githerd",
        });
        expect(readlinkSync(join(stateDir(), "current"))).toBe(join("versions", `${version}-${hash.slice(0, 8)}`));

        const [start] = starts();
        expect(start.cwd).toBe(stateDir());
        expect(start.argv.slice(1, start.argv.indexOf("--"))).toEqual(["start", "-n", "githerd", "--autorestart"]);
        expect(start.argv.slice(start.argv.indexOf("--") + 1)).toEqual([
            "env",
            "-i",
            `GITHERD_ROOT=${root}`,
            `GITHERD_STATE_DIR=${stateDir()}`,
            "PORT={{port}}",
            process.execPath,
            join(stateDir(), "current", "bin", "githerd-daemon.mjs"),
        ]);
        // No pm2 re-creation: servherd's --autorestart is the supervision.
        expect(calls().filter((c) => c.argv[0] === "pm2")).toEqual([]);
        expect(registry().githerd.autorestart).toBe(true);

        // The daemon starts with only the command's variables; the rest comes from its file.
        const h = await health();
        expect(h).toMatchObject({ name: "githerd", root, codeHash: hash, pid: registry().githerd.pid });
        const environ = readFileSync(`/proc/${h.pid}/environ`, "utf8").split("\0").filter(Boolean);
        expect(environ.map((kv) => kv.split("=")[0]).sort()).toEqual(
            ["GITHERD_ROOT", "GITHERD_STATE_DIR", "PORT"].sort(),
        );
        const file = join(stateDir(), "daemon-env.json");
        expect(statSync(file).mode & 0o777).toBe(0o600);
        const saved = JSON.parse(readFileSync(file, "utf8"));
        expect(saved).toMatchObject({ HOME: env.HOME, PATH: env.PATH, PUSHOVER_USER_KEY: "k3y" });
        expect(Object.keys(saved).filter((k) => k.startsWith("CLAUDE") || k.startsWith("GITHERD"))).toEqual([]);
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
        // The daemon answers /health before its first loop tick: wait for that tick.
        await startDaemon();
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
        const daemon = join(stateDir(), "current", "bin", "githerd-daemon.mjs");
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
        git(root, "rm", "-q", "githerd.config.json");
        git(root, "commit", "-q", "-m", "no config");
        git(root, "push", "-q", "origin", "master");
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

describe("the restart lock", () => {
    it("five launchers against a stale lock make exactly one servherd start", async () => {
        const lock = join(stateDir(), "restart.lock");
        mkdirSync(lock, { recursive: true });
        // A dead owner: no live process has this identity.
        writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: 999_999, startTime: "1", bootId: bootId() }));

        const five = Array.from({ length: 5 }, () => spawnLauncher());
        five.forEach((l, i) =>
            l.send({ jsonrpc: "2.0", id: i + 1, method: "tools/call", params: { name: "githerd_status" } }),
        );
        const replies = await Promise.all(five.map((l, i) => l.reply(i + 1)));
        for (const r of replies) expect(r.result.isError, JSON.stringify(r.result)).toBeUndefined();
        expect(starts()).toHaveLength(1);
        expect(existsSync(lock)).toBe(false);
        expect(readdirSync(join(stateDir())).filter((n) => n.startsWith("restart.lock"))).toEqual([]);
    });

    it("does not steal a young lock with no owner.json, and steals an old one", async () => {
        const lock = join(stateDir(), "restart.lock");
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

describe("one daemon", () => {
    it("starts one daemon for concurrent launchers in three directories and githerd ensure", async () => {
        const wt = join(dir, "wt");
        git(root, "worktree", "add", "-q", "-b", "feature", wt);
        const cwds = [root, wt, join(root, "githerd", "lib")];
        const three = cwds.map((cwd) => spawnLauncher({}, cwd));
        const ensure = spawn(process.execPath, [CLI_BIN, "ensure"], {
            cwd: join(wt, "githerd"),
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
            env,
        });
        launchers.push(ensure);
        let ensureOut = "";
        ensure.stdout.on("data", (d) => (ensureOut += d));
        three.forEach((l) =>
            l.send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "githerd_status" } }),
        );
        const exited = new Promise((r) => ensure.once("exit", r));
        const replies = await Promise.all(three.map((l) => l.reply(1)));
        for (const r of replies) expect(r.result.isError, JSON.stringify(r.result)).toBeUndefined();
        expect(await exited).toBe(0);
        expect(ensureOut).toMatch(/^(started|warm|other-launcher) http:\/\/127\.0\.0\.1:\d+\n$/);

        expect(starts()).toHaveLength(1);
        expect(starts()[0].cwd).toBe(stateDir());
        expect(Object.keys(registry())).toEqual(["githerd"]);
        expect(daemonPids()).toEqual([(await health()).pid]);
    });

    it("finds the one servherd entry again when a start comes from another directory", async () => {
        await ensureDaemon(context());
        const wt = join(dir, "wt");
        git(root, "worktree", "add", "-q", "-b", "feature", wt);
        // A later start from elsewhere after the daemon died: still the same entry.
        process.kill(-(await health()).pid, "SIGKILL");
        const later = () => new Date(Date.now() + 61_000);
        expect((await ensureDaemon(context({ cwd: wt, now: later }))).action).toBe("started");
        expect(starts().map((c) => c.cwd)).toEqual([stateDir(), stateDir()]);
        expect(Object.keys(registry())).toEqual(["githerd"]);
        expect(daemonPids()).toHaveLength(1);
    });
});

describe("a development daemon", () => {
    it("is found through its state directory's daemon.json at every lookup, so a new port needs no reconnect", async () => {
        const servers = [0, 1].map(() =>
            createServer((_req, res) => res.end(JSON.stringify({ name: "githerd" }))).listen(0, "127.0.0.1"),
        );
        await Promise.all(servers.map((s) => new Promise((r) => s.once("listening", r))));
        const ports = servers.map((s) => /** @type {import("node:net").AddressInfo} */ (s.address()).port);
        const sd = join(dir, "dev");
        mkdirSync(sd, { recursive: true });
        const ctx = /** @type {any} */ ({ env: { GITHERD_DEV_STATE: sd } });
        try {
            for (const port of ports) {
                writeFileSync(join(sd, "daemon.json"), JSON.stringify({ port }));
                expect(await ensureDaemon(ctx)).toEqual({ url: `http://127.0.0.1:${port}`, action: "warm" });
            }
            rmSync(join(sd, "daemon.json"));
            await expect(ensureDaemon(ctx)).rejects.toThrow(/has no readable daemon.json/);
        } finally {
            for (const s of servers) s.close();
        }
    });
});

describe("install and the daemon's environment", () => {
    it("prints the servherd command a launcher would run, from the fixed directory", () => {
        const ctx = context();
        expect(installCommand(ctx)).toBe(
            `cd ${stateDir()} && ${process.execPath} ${FAKE_SERVHERD} start -n githerd --autorestart -- env -i ` +
                `GITHERD_ROOT=${root} GITHERD_STATE_DIR=${stateDir()} ` +
                `'PORT={{port}}' ${process.execPath} ${join(stateDir(), "current", "bin", "githerd-daemon.mjs")}`,
        );
    });

    it("keeps the file the owner wrote unless told to replace it, and loads only allow-listed unset variables", () => {
        const sd = join(dir, "sd");
        writeDaemonEnv(sd, {
            HOME: "/h",
            PUSHOVER_APP_TOKEN: "t",
            CLAUDECODE: "1",
            GITHERD_URL: "x",
            NX_CACHE_DIRECTORY: "/c",
        });
        writeDaemonEnv(sd, { HOME: "/worker" });
        expect(JSON.parse(readFileSync(join(sd, "daemon-env.json"), "utf8"))).toEqual({
            HOME: "/h",
            PUSHOVER_APP_TOKEN: "t",
        });
        // A replacing write from a shell without the notify keys keeps the old ones, and says so.
        expect(writeDaemonEnv(sd, { HOME: "/owner" }, { replace: true })).toEqual(["PUSHOVER_APP_TOKEN"]);
        expect(JSON.parse(readFileSync(join(sd, "daemon-env.json"), "utf8"))).toEqual({
            HOME: "/owner",
            PUSHOVER_APP_TOKEN: "t",
        });
        expect(writeDaemonEnv(sd, { HOME: "/owner", PUSHOVER_USER_KEY: "u" }, { replace: true })).toEqual([]);
        expect(JSON.parse(readFileSync(join(sd, "daemon-env.json"), "utf8"))).toEqual({
            HOME: "/owner",
            PUSHOVER_USER_KEY: "u",
        });

        writeFileSync(join(sd, "daemon-env.json"), JSON.stringify({ HOME: "/owner", PATH: "/p", CLAUDECODE: "1" }));
        /** @type {Record<string, string | undefined>} */
        const target = { PATH: "/kept" };
        loadDaemonEnv(sd, target);
        expect(target).toEqual({ PATH: "/kept", HOME: "/owner" });
        loadDaemonEnv(join(dir, "missing"), target);
        expect(target).toEqual({ PATH: "/kept", HOME: "/owner" });
    });

    it("keeps the old GIT_CONFIG_* signing group whole when the new environment has none of it", () => {
        const sd = join(dir, "sd");
        const signing = { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "gpg.format", GIT_CONFIG_VALUE_0: "ssh" };
        writeDaemonEnv(sd, { HOME: "/h", ...signing });
        expect(writeDaemonEnv(sd, { HOME: "/term" }, { replace: true }).sort()).toEqual(Object.keys(signing).sort());
        expect(JSON.parse(readFileSync(join(sd, "daemon-env.json"), "utf8"))).toEqual({ HOME: "/term", ...signing });
        // A new group replaces the old one; the two are never mixed.
        writeDaemonEnv(sd, { HOME: "/term", GIT_CONFIG_COUNT: "0" }, { replace: true });
        expect(JSON.parse(readFileSync(join(sd, "daemon-env.json"), "utf8"))).toEqual({
            HOME: "/term",
            GIT_CONFIG_COUNT: "0",
        });
    });

    it("gives servherd the same start command whether or not the caller set GITHERD_CONFIG", async () => {
        const withConfig = installCommand(context());
        const saved = env.GITHERD_CONFIG;
        delete env.GITHERD_CONFIG;
        const withoutConfig = context();
        env.GITHERD_CONFIG = saved;
        expect(installCommand(withoutConfig)).toBe(withConfig);

        await ensureDaemon(context());
        process.kill(-(await health()).pid, "SIGKILL");
        const later = () => new Date(Date.now() + 61_000);
        delete env.GITHERD_CONFIG;
        expect((await ensureDaemon(context({ now: later }))).action).toBe("started");
        const [first, second] = starts();
        expect(second.argv).toEqual(first.argv);
        expect(second.cwd).toBe(first.cwd);
    });

    it("names a servherd without --autorestart", async () => {
        const old = join(dir, "old-servherd.mjs");
        writeFileSync(old, "console.error(\"error: unknown option '--autorestart'\"); process.exit(1);\n");
        writeConfig({ servherdCommand: [process.execPath, old] });
        await expect(ensureDaemon(context())).rejects.toThrow(
            "this servherd has no --autorestart option; githerd needs servherd 1.2.0 or later",
        );
    });
});

describe("restarts and upgrades", () => {
    it("never restarts a daemon whose process lives, however old its alive file", async () => {
        await ensureDaemon(context());
        const first = (await health()).pid;
        const later = () => new Date(Date.now() + 2 * 3600_000);
        expect(daemonDown(context({ now: later }))).toBe(false);
        expect((await ensureDaemon(context({ now: later }))).action).toBe("warm");
        expect(calls().filter((c) => c.argv.includes("restart"))).toEqual([]);
        expect((await health()).pid).toBe(first);
    });

    it("errs, and starts nothing, while the daemon is alive but does not answer", async () => {
        pretendAlive();
        await expect(ensureDaemon(context({ healthWaitMs: 300 }))).rejects.toThrow(
            /the daemon is running but does not answer: no daemon.json/,
        );
        expect(calls()).toEqual([]);
    });

    it("never restarts a daemon in fatal mode, however old its loop tick, and reports why it is down", async () => {
        const hash = git(root, "rev-parse", "origin/master:githerd");
        const server = createServer((req, res) => {
            res.end(
                JSON.stringify({
                    name: "githerd",
                    protocol: 1,
                    root,
                    codeHash: hash,
                    port: /** @type {any} */ (server.address()).port,
                    loopTickAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
                    runsInFlight: 0,
                    fatal: "crash loop: 3 starts within 10 minutes; last exception: Error: boom",
                }),
            );
        });
        servers.push(server);
        await new Promise((r) => server.listen(0, "127.0.0.1", () => r(undefined)));
        const port = /** @type {any} */ (server.address()).port;
        pretendAlive();
        writeFileSync(join(stateDir(), "daemon.json"), JSON.stringify({ port, pid: process.pid }));

        expect(await ensureDaemon(context())).toEqual({
            url: `http://127.0.0.1:${port}`,
            action: "down",
            fatal: "crash loop: 3 starts within 10 minutes; last exception: Error: boom",
        });
        expect(calls()).toEqual([]);
    });

    it("upgrades to a new hash on the default branch only once its gates passed, by pointing current at it and restarting", async () => {
        await startDaemon();
        const first = (await health()).pid;
        pushPackage("second", (pkg) => writeFileSync(join(pkg, "lib", "extra.mjs"), "export {};\n"));
        const hash = git(root, "rev-parse", "origin/master:githerd");
        // Before its gates ran, the running version stays.
        expect((await ensureDaemon(context())).action).toBe("gating");
        expect(starts()).toHaveLength(1);
        const ran = await gateWith(true);
        expect(ran).toEqual(["replay", "protocol", "self-test"]);
        const result = await ensureDaemon(context());
        expect(result.action).toBe("upgraded");
        // The same command from the same directory: servherd keeps its one entry and restarts it.
        expect(starts()).toHaveLength(2);
        expect(new Set(starts().map((c) => c.argv.join(" "))).size).toBe(1);
        expect(calls().at(-1)?.argv).toEqual(["--json", "restart", "githerd"]);
        expect(Object.keys(registry())).toEqual(["githerd"]);
        expect(readlinkSync(join(stateDir(), "current"))).toContain(hash.slice(0, 8));
        const h = await health();
        expect(h.codeHash).toBe(hash);
        expect(h.pid).not.toBe(first);
    });

    it("refuses a version that fails a gate, keeps the running one, pages once and never gates it again", async () => {
        const notifyLog = join(dir, "notify.log");
        writeConfig({ notify: { command: [process.execPath, FAKE_NOTIFY, notifyLog, "ok", "{status}", "{message}"] } });
        await startDaemon();
        const first = await health();
        pushPackage("second", (pkg) => writeFileSync(join(pkg, "lib", "extra.mjs"), "export {};\n"));
        const hash = git(root, "rev-parse", "origin/master:githerd");
        expect(await gateWith(false)).toEqual(["replay", "protocol"]);
        expect(readSelfUpdate(stateDir()).gates[hash]).toMatchObject({
            passed: false,
            gate: "protocol",
            detail: "broken",
        });
        expect(await gateWith(true)).toEqual([]);
        expect((await ensureDaemon(context())).action).toBe("refused");
        expect(starts()).toHaveLength(1);
        expect((await health()).pid).toBe(first.pid);
        expect(readlinkSync(join(stateDir(), "current"))).toContain(first.codeHash.slice(0, 8));
        const pages = readFileSync(notifyLog, "utf8").trim().split("\n");
        expect(pages).toHaveLength(1);
        expect(JSON.parse(pages[0]).args[1]).toMatch(
            /^githerd update to 0\.1\.0-\w{8} REFUSED: protocol failed: broken; still running /,
        );
        expect(readFileSync(join(stateDir(), "launcher.log"), "utf8")).toMatch(
            / error update to .*: protocol FAILED: broken/,
        );
    });

    it("rolls back, loudly, a version that passed its gates but does not start", async () => {
        const notifyLog = join(dir, "notify.log");
        writeConfig({ notify: { command: [process.execPath, FAKE_NOTIFY, notifyLog, "ok", "{status}", "{message}"] } });
        await startDaemon();
        const first = await health();
        pushPackage("broken daemon", (pkg) =>
            writeFileSync(join(pkg, "bin", "githerd-daemon.mjs"), "process.exit(1);\n"),
        );
        const broken = git(root, "rev-parse", "origin/master:githerd");
        await gateWith(true);
        const result = await ensureDaemon(context({ healthWaitMs: 3000 }));
        expect(result.action).toBe("rolled-back");
        const h = await health();
        expect(h.codeHash).toBe(first.codeHash);
        expect(h.pid).not.toBe(first.pid);
        expect(readlinkSync(join(stateDir(), "current"))).toContain(first.codeHash.slice(0, 8));
        expect(readSelfUpdate(stateDir())).toMatchObject({
            adopting: null,
            gates: { [broken]: { passed: false, gate: "start" } },
        });
        // Loud: a page and an error line; and the broken version is never tried again.
        const pages = readFileSync(notifyLog, "utf8")
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l).args);
        expect(pages).toHaveLength(1);
        expect(pages[0][0]).toBe("error");
        expect(pages[0][1]).toMatch(/^githerd ROLLED BACK from \w{8} to 0\.1\.0-\w{8}: did not answer: /);
        expect(readFileSync(join(stateDir(), "launcher.log"), "utf8")).toMatch(/ error githerd ROLLED BACK from /);
        expect((await ensureDaemon(context())).action).toBe("refused");
        expect((await health()).pid).toBe(h.pid);
    });

    it("gates the successor of a daemon in fatal mode itself, and leaves the daemon down when it fails", async () => {
        await startDaemon();
        pushPackage("second", (pkg) => writeFileSync(join(pkg, "lib", "extra.mjs"), "export {};\n"));
        const hash = git(root, "rev-parse", "origin/master:githerd");
        const server = createServer((req, res) => {
            res.end(
                JSON.stringify({
                    name: "githerd",
                    protocol: 1,
                    root,
                    codeHash: "0".repeat(40),
                    port: /** @type {any} */ (server.address()).port,
                    runsInFlight: 0,
                    fatal: "crash loop",
                }),
            );
        });
        servers.push(server);
        await new Promise((r) => server.listen(0, "127.0.0.1", () => r(undefined)));
        const port = /** @type {any} */ (server.address()).port;
        pretendAlive();
        writeFileSync(join(stateDir(), "daemon.json"), JSON.stringify({ port, pid: process.pid }));
        const before = starts().length;
        // The gates run in the background, outside the restart lock: the answer comes at once, and
        // a second restarter meanwhile gets it too instead of waiting on the lock.
        expect(await ensureDaemon(context())).toEqual({
            url: `http://127.0.0.1:${port}`,
            action: "down",
            fatal: "crash loop",
        });
        expect(existsSync(join(stateDir(), "restart.lock"))).toBe(false);
        expect((await ensureDaemon(context())).action).toBe("down");
        // The real gates: the test checkout carries no tests, so the replay gate fails at once.
        await backgroundGating();
        expect(existsSync(join(stateDir(), "gate.lock"))).toBe(false);
        expect(readSelfUpdate(stateDir()).gates[hash]).toMatchObject({
            passed: false,
            gate: "replay",
            detail: expect.stringMatching(/No test files found/),
        });
        expect(starts()).toHaveLength(before);
    });

    describe("a gate that does not finish", () => {
        /** @type {number[]} */
        let groups = [];
        afterEach(() => {
            for (const g of groups) {
                try {
                    process.kill(-g, "SIGKILL");
                } catch {
                    // gone, as it should be
                }
            }
            groups = [];
        });

        /**
         * A stand-in replay gate that checks out its worktree and runs a long child in it, as the
         * real one runs vitest there.
         * @param {any} ctx the launcher context
         * @param {(pgid: number) => void} started told the child's process group
         * @returns {import("../lib/self-update.mjs").Gate} the gate
         */
        const sleeper = (ctx, started) => ({
            name: "replay",
            run: async ({ commit, onSpawn }) => {
                const tree = gateTree(ctx.stateDir, commit);
                git(root, "worktree", "add", "-q", "--detach", tree, commit);
                const r = await run("sleep", ["300"], {
                    cwd: tree,
                    timeoutMs: 600_000,
                    onSpawn: (pgid) => {
                        groups.push(pgid);
                        onSpawn?.(pgid);
                        started(pgid);
                    },
                });
                return { ok: r.code === 0, detail: "slept" };
            },
        });
        const gateTrees = () =>
            existsSync(join(stateDir(), "gate-trees")) ? readdirSync(join(stateDir(), "gate-trees")) : [];
        const listed = () => git(root, "worktree", "list", "--porcelain").includes("gate-trees");

        it("is stopped by its gater with no child process, gate worktree or verdict left", async () => {
            await startDaemon();
            pushPackage("second", (pkg) => writeFileSync(join(pkg, "lib", "extra.mjs"), "export {};\n"));
            const ctx = context();
            const target = await targetCode(ctx);
            const spawned = Promise.withResolvers();
            const abort = new AbortController();
            const running = prepareUpdate(ctx, target, [sleeper(ctx, spawned.resolve)], { signal: abort.signal });
            const pgid = await spawned.promise;
            expect(readSelfUpdate(stateDir()).gating).toMatchObject({ hash: target.hash, pgid });
            // A second gater meanwhile gets no verdict and runs nothing.
            expect(await prepareUpdate(context(), target, [])).toEqual({ action: "gating" });
            const reaped = [];
            const left = await stopGating({
                root: ctx.root,
                stateDir: ctx.stateDir,
                pkgDir: ctx.pkgDir,
                env: ctx.env,
                abort,
                running,
                selftest: async () => {
                    reaped.push("self-test");
                    return null;
                },
            });
            expect(left).toEqual([]);
            expect(await running).toEqual({ action: "gating" });
            expect(identify(pgid)).toBeNull();
            expect([gateTrees(), listed(), reaped]).toEqual([[], false, ["self-test"]]);
            expect(readSelfUpdate(stateDir())).toMatchObject({ gating: null, gates: {} });
            expect(existsSync(join(stateDir(), "gate.lock"))).toBe(false);
        });

        it("left by a gater that died is removed before the next gating, superseded trees too", async () => {
            await startDaemon();
            pushPackage("second", (pkg) => writeFileSync(join(pkg, "lib", "extra.mjs"), "export {};\n"));
            const ctx = context();
            const target = await targetCode(ctx);
            // What a killed gater leaves: its child, its worktree and an older commit's, its record
            // and its lock, whose owner is gone.
            const orphan = spawn("sleep", ["300"], { detached: true, stdio: "ignore" });
            const pgid = /** @type {number} */ (orphan.pid);
            groups.push(pgid);
            const old = git(root, "rev-parse", "origin/master~1");
            for (const c of [old, git(root, "rev-parse", "origin/master")]) {
                git(root, "worktree", "add", "-q", "--detach", gateTree(ctx.stateDir, c), c);
            }
            const saved = readSelfUpdate(stateDir());
            writeSelfUpdate(stateDir(), {
                ...saved,
                gating: { hash: target.hash, pgid, leader: identify(pgid), tree: gateTree(ctx.stateDir, old) },
            });
            mkdirSync(join(stateDir(), "gate.lock"));
            writeFileSync(
                join(stateDir(), "gate.lock", "owner.json"),
                JSON.stringify({ pid: 999_999_999, startTime: "1", bootId: bootId() }),
            );
            const tmux = process.env.TMUX_TMPDIR;
            process.env.TMUX_TMPDIR = mkdtempSync(join(tmpdir(), "githerd-tmux-"));
            try {
                const ran = [];
                const record = await prepareUpdate(ctx, target, [
                    {
                        name: "replay",
                        run: async () => {
                            ran.push({ trees: gateTrees(), orphan: identify(pgid) });
                            return { ok: true, detail: "fine" };
                        },
                    },
                ]);
                expect(record).toMatchObject({ passed: true });
                expect(ran).toEqual([{ trees: [], orphan: null }]);
            } finally {
                rmSync(/** @type {string} */ (process.env.TMUX_TMPDIR), { recursive: true, force: true });
                if (tmux === undefined) delete process.env.TMUX_TMPDIR;
                else process.env.TMUX_TMPDIR = tmux;
            }
            expect(listed()).toBe(false);
            expect(readSelfUpdate(stateDir()).gating).toBeNull();
        });
    });

    it("never prunes the running version, however many newer copies were archived", async () => {
        await startDaemon();
        const running = readlinkSync(join(stateDir(), "current"));
        for (let i = 0; i < 4; i++) {
            pushPackage(`version ${i}`, (pkg) =>
                writeFileSync(join(pkg, "lib", "extra.mjs"), `export const n = ${i};\n`),
            );
            await prepareUpdate(context(), await targetCode(context()), []);
        }
        expect(existsSync(join(stateDir(), running, "version.json"))).toBe(true);
        // The three newest, and the running one beside them.
        expect(readdirSync(join(stateDir(), "versions"))).toHaveLength(4);
    });

    it("logs and pages once when the daemon does not come up, and retries only after 15 minutes", async () => {
        pushPackage("broken daemon", (pkg) =>
            writeFileSync(join(pkg, "bin", "githerd-daemon.mjs"), "process.exit(1);\n"),
        );
        const notifyLog = join(dir, "notify.log");
        writeConfig({ notify: { command: [process.execPath, FAKE_NOTIFY, notifyLog, "ok", "{status}", "{message}"] } });
        // three heartbeats in a row, then one 16 minutes later
        for (let i = 0; i < 3; i++) {
            await expect(ensureDaemon(context({ healthWaitMs: 1000 }))).rejects.toThrow(/failed to start/);
        }
        expect(starts()).toHaveLength(1);
        const later = () => new Date(Date.now() + 16 * 60_000);
        await expect(ensureDaemon(context({ healthWaitMs: 1000, now: later }))).rejects.toThrow(/failed to start/);
        expect(starts()).toHaveLength(2);
        const log = readFileSync(join(stateDir(), "launcher.log"), "utf8");
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
    it("brings a killed daemon back once its alive file is a minute old, and not before", async () => {
        let skew = 0;
        const input = new PassThrough();
        const running = runLauncher({
            input,
            write: () => {},
            cwd: root,
            env,
            now: () => new Date(Date.now() + skew),
            ppid: 4242,
            pkgDir: "githerd",
            heartbeatMs: 100,
            jitterMs: 0,
            log: () => {},
        });
        await until(() => existsSync(join(stateDir(), "daemon.json")) && starts().length === 1, "the cold start");
        const first = await until(async () => (await health().catch(() => null))?.pid, "the first daemon");
        // The heartbeat registered the session with the daemon.
        await until(() => {
            try {
                const { sessions } = JSON.parse(readFileSync(join(stateDir(), "state.json"), "utf8"));
                return Object.keys(sessions ?? {}).includes("main-4242");
            } catch {
                return false; // not written yet
            }
        }, "the heartbeat");

        process.kill(-first, "SIGKILL");
        await until(() => !alive(first), "the daemon to die");
        // alive is younger than 60 s: no restarter may start it yet.
        expect(daemonDown(context())).toBe(false);
        skew = 61_000;
        const second = await until(async () => {
            const h = await health().catch(() => null);
            return h && h.pid !== first ? h.pid : null;
        }, "the daemon to come back");
        expect(second).not.toBe(first);
        expect(starts()).toHaveLength(2);
        input.end();
        await running;
    });

    it("serves the eleven tools to the daemon, which refuses another tool protocol with no change", async () => {
        const input = new PassThrough();
        /** @type {any[]} */
        const replies = [];
        // The SessionStart hook's record for the session's claude process (here, this process).
        mkdirSync(join(stateDir(), "sessions"), { recursive: true });
        writeFileSync(
            join(stateDir(), "sessions", `${process.pid}.json`),
            JSON.stringify({ pid: process.pid, startTime: identify(process.pid)?.startTime, sessionId: "sess-e2e" }),
        );
        const running = runLauncher({
            input,
            write: (line) => replies.push(JSON.parse(line)),
            cwd: root,
            env,
            ppid: process.pid,
            pkgDir: "githerd",
            heartbeatMs: 60_000,
            jitterMs: 0,
            log: () => {},
        });
        const reply = (/** @type {number} */ id) =>
            until(() => replies.find((r) => r.id === id), `reply ${id}`, 30_000);
        const call = (/** @type {number} */ id, /** @type {string} */ name, /** @type {object} */ args) =>
            input.write(
                `${JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } })}\n`,
            );
        await until(async () => (await health().catch(() => null))?.pid, "the daemon");

        call(1, "githerd_next", {});
        const next = JSON.parse((await reply(1)).result.content[0].text);
        expect(next).toMatchObject({ job: null, offered: [], snapshot: { version: expect.any(Number) } });
        // Arguments the schema refuses never reach the daemon.
        call(2, "githerd_expect", { job: "issue-1", minutes: 999, reason: "x" });
        expect((await reply(2)).result).toMatchObject({ isError: true });
        expect((await reply(2)).result.content[0].text).toMatch(/^invalid arguments/);
        // A call the daemon refuses comes back as a tool error, not a transport failure. The owner
        // typed into this session a moment ago, so the record gets as far as its arguments.
        const projects = join(env.HOME, ".claude", "projects", root.replaceAll(/[^A-Za-z0-9]/g, "-"));
        mkdirSync(projects, { recursive: true });
        writeFileSync(
            join(projects, "sess-e2e.jsonl"),
            `${JSON.stringify({ type: "user", timestamp: new Date().toISOString(), message: { content: "order x" } })}\n`,
        );
        call(3, "githerd_record", { kind: "order", text: "x" });
        expect((await reply(3)).result).toMatchObject({ isError: true });
        expect((await reply(3)).result.content[0].text).toBe("an order lists its issues");

        const before = readFileSync(join(stateDir(), "state.json"), "utf8");
        const res = await fetch(`http://127.0.0.1:${daemonFile().port}/rpc`, {
            method: "POST",
            headers: { "x-githerd-session": "sess-e2e" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 4,
                method: "tools/call",
                params: {
                    name: "githerd_expect",
                    arguments: { job: "issue-1", minutes: 5, reason: "x" },
                    _meta: { githerd: { protocol: TOOL_PROTOCOL + 1, session: "sess-e2e" } },
                },
            }),
        });
        const refused = (await res.json()).result;
        expect(refused.isError).toBe(true);
        expect(refused.content[0].text).toMatch(/^protocol mismatch: .*nothing was done/);
        expect(readFileSync(join(stateDir(), "state.json"), "utf8")).toBe(before);
        input.end();
        await running;
    });

    it("says why a daemon that exits at start exited, from the end of its error log", async () => {
        pushPackage("broken daemon", (pkg) =>
            writeFileSync(
                join(pkg, "bin", "githerd-daemon.mjs"),
                'console.error("cannot open the store"); process.exit(1);\n',
            ),
        );
        await expect(ensureDaemon(context())).rejects.toThrow(
            /^githerd daemon failed to start: the daemon process \d+ exited; pm2 says stopped; its log ends: cannot open the store /,
        );
    });

    it("reports a daemon that does not start as a tool error, with why", async () => {
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
        expect(reply.result.content[0].text).toMatch(
            /^githerd daemon not reachable: (?:no daemon after 0\.3 s|githerd daemon failed to start: the daemon process \d+ exited)/,
        );
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

describe("tools that follow the daemon", () => {
    /**
     * A fake daemon at GITHERD_URL serving `defs()` as its tool list and echoing each call it gets.
     * @param {() => any[]} defs its tool list, read at each `tools/list`
     * @returns {Promise<{url: string, calls: any[], lists: () => number}>} its URL, the calls it
     *   received and how many times its list was read
     */
    async function fakeDaemon(defs) {
        /** @type {any[]} */
        const received = [];
        let lists = 0;
        const server = createServer((req, res) => {
            if (req.url === "/health") return res.end(JSON.stringify({ name: "githerd" }));
            if (req.url === "/heartbeat") return res.end("{}");
            let text = "";
            req.on("data", (d) => (text += d));
            req.on("end", () => {
                const msg = JSON.parse(text);
                if (msg.method === "tools/list") lists += 1;
                if (msg.method === "tools/list")
                    return res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { tools: defs() } }));
                received.push(msg.params);
                const refused = msg.params.arguments.outcome === "bogus";
                const content = [
                    { type: "text", text: refused ? "daemon refuses bogus" : `ok ${msg.params.arguments.outcome}` },
                ];
                res.end(
                    JSON.stringify({
                        jsonrpc: "2.0",
                        id: msg.id,
                        result: { content, ...(refused ? { isError: true } : {}) },
                    }),
                );
            });
        }).listen(0, "127.0.0.1");
        servers.push(server);
        await new Promise((r) => server.once("listening", r));
        const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());
        return { url: `http://127.0.0.1:${port}`, calls: received, lists: () => lists };
    }

    /**
     * The built-in tools with one more `githerd_done` outcome.
     * @param {string} extra the new outcome
     * @returns {any[]} the tool list
     */
    function withOutcome(extra) {
        const defs = structuredClone(TOOLS).map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
        }));
        defs.find((t) => t.name === "githerd_done").inputSchema.properties.outcome.enum.push(extra);
        return defs;
    }

    /**
     * Starts the launcher in-process against `url`.
     * @param {string | undefined} url the daemon, or undefined for none
     * @param {number} [heartbeatMs] the heartbeat interval
     * @returns {{input: PassThrough, written: any[], running: Promise<any>, reply: (id: number) => Promise<any>,
     *   send: (msg: object) => void, notices: () => any[]}} the launcher
     */
    function launch(url, heartbeatMs = 60_000) {
        /** @type {any[]} */
        const written = [];
        const input = new PassThrough();
        const running = runLauncher({
            input,
            write: (l) => written.push(JSON.parse(l)),
            cwd: root,
            env: { ...env, GITHERD_URL: url ?? "http://127.0.0.1:1" },
            pkgDir: "githerd",
            heartbeatMs,
            jitterMs: 0,
            callWaitMs: url ? 5000 : 300,
            log: () => {},
        });
        return {
            input,
            written,
            running,
            send: (msg) => input.write(`${JSON.stringify(msg)}\n`),
            reply: (id) => until(() => written.find((m) => m.id === id), `reply ${id}`),
            notices: () => written.filter((m) => m.method === "notifications/tools/list_changed"),
        };
    }

    const done = (/** @type {number} */ id, /** @type {string} */ outcome) => ({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "githerd_done", arguments: { job: "issue-1", outcome, findings: "f", defects: [] } },
    });

    it("accepts an enum value the daemon gained without a restart, and passes the daemon's refusal through", async () => {
        let defs = withOutcome("deferred");
        const daemon = await fakeDaemon(() => defs);
        const l = launch(daemon.url);
        l.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
        expect((await l.reply(1)).result.capabilities.tools).toEqual({ listChanged: true });
        defs = withOutcome("postponed");
        l.send(done(2, "postponed"));
        expect((await l.reply(2)).result.content[0].text).toBe("ok postponed");
        l.send({ jsonrpc: "2.0", id: 3, method: "tools/list" });
        const listed = (await l.reply(3)).result.tools.find((/** @type {any} */ t) => t.name === "githerd_done");
        expect(listed.inputSchema.properties.outcome.enum).toContain("postponed");
        // Valid locally, so it is forwarded, and the daemon's refusal is what comes back.
        defs = withOutcome("bogus");
        l.send(done(4, "bogus"));
        expect((await l.reply(4)).result).toEqual({
            content: [{ type: "text", text: "daemon refuses bogus" }],
            isError: true,
        });
        // Refused by both: still the local refusal, never forwarded.
        l.send(done(5, "nonsense"));
        expect((await l.reply(5)).result.content[0].text).toMatch(/^invalid arguments: arguments\.outcome/);
        expect(daemon.calls.map((c) => c.arguments.outcome)).toEqual(["postponed", "bogus"]);
        l.input.end();
        await l.running;
    });

    it("sends list_changed once when the daemon's tools change, and not otherwise", async () => {
        let defs = TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
        const daemon = await fakeDaemon(() => defs);
        const l = launch(daemon.url, 50);
        l.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
        await l.reply(1);
        // Several re-reads of the same list: no notice.
        await until(() => daemon.lists() >= 3, "three re-reads");
        expect(l.notices()).toHaveLength(0);
        defs = withOutcome("postponed");
        await until(() => l.notices().length === 1, "one list_changed");
        const seen = daemon.lists();
        await until(() => daemon.lists() >= seen + 3, "three more re-reads");
        expect(l.notices()).toHaveLength(1);
        l.input.end();
        await l.running;
    });

    it("answers with the built-in list while no daemon answers", async () => {
        const l = launch(undefined);
        l.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
        expect((await l.reply(1)).result.tools.map((/** @type {any} */ t) => t.name)).toEqual(TOOLS.map((t) => t.name));
        l.input.end();
        await l.running;
        expect(l.notices()).toHaveLength(0);
    });
});

describe("pm2Command", () => {
    it("finds pm2 next to servherd", () => {
        expect(pm2Command(["npx", "-y", "servherd"], {})).toEqual(["npx", "-y", "-p", "servherd", "pm2"]);
        expect(pm2Command(["npx", "-y", "servherd@^1.2.0"], {})).toEqual(["npx", "-y", "-p", "servherd@^1.2.0", "pm2"]);
        expect(pm2Command(["x"], { GITHERD_PM2: '["a","b"]' })).toEqual(["a", "b"]);
        expect(pm2Command(["/nowhere/servherd.js"], {})).toEqual(["pm2"]);
    });
});

describe("transcriptTyped", () => {
    it("reads the newest prompt the owner typed from that session's own transcript", () => {
        const home = mkdtempSync(join(tmpdir(), "githerd-home-"));
        try {
            const cwd = "/work/my.repo";
            expect(transcriptTyped(cwd, home, "s1")).toBeNull();
            const projects = join(home, ".claude", "projects", "-work-my-repo");
            mkdirSync(projects, { recursive: true });
            const line = (/** @type {object} */ r) => JSON.stringify(r);
            writeFileSync(
                join(projects, "s1.jsonl"),
                [
                    line({ type: "user", timestamp: "2026-10-03T10:00:00Z", message: { content: "order 5 then 6" } }),
                    line({
                        type: "user",
                        timestamp: "2026-10-03T10:01:00Z",
                        origin: { kind: "human" },
                        message: { content: [{ type: "text", text: "and hold layout" }] },
                    }),
                    line({
                        type: "user",
                        timestamp: "2026-10-03T10:02:00Z",
                        message: { content: "<task-notification>" },
                    }),
                ].join("\n"),
            );
            writeFileSync(
                join(projects, "s2.jsonl"),
                line({ type: "user", timestamp: "2026-10-03T11:00:00Z", message: { content: "another session" } }),
            );
            expect(transcriptTyped(cwd, home, "s1")).toEqual({ at: "2026-10-03T10:01:00Z", text: "and hold layout" });
            expect(transcriptTyped(cwd, home, "../s2")).toBeNull();
        } finally {
            rmSync(home, { recursive: true, force: true });
        }
    });
});

describe("sessionTypedAt", () => {
    it("reads the owner's last typed message from the newest transcript of the session's directory", () => {
        const home = mkdtempSync(join(tmpdir(), "githerd-home-"));
        try {
            const cwd = "/work/my.repo";
            expect(sessionTypedAt(cwd, home)).toBeNull();
            const projects = join(home, ".claude", "projects", "-work-my-repo");
            mkdirSync(projects, { recursive: true });
            const line = (/** @type {object} */ r) => JSON.stringify(r);
            writeFileSync(
                join(projects, "old.jsonl"),
                line({ type: "user", timestamp: "2026-10-03T09:00:00Z", message: { content: "old" } }),
            );
            utimesSync(join(projects, "old.jsonl"), 1, 1);
            writeFileSync(
                join(projects, "new.jsonl"),
                [
                    line({ type: "user", timestamp: "2026-10-03T10:00:00Z", message: { content: "fix it" } }),
                    line({
                        type: "user",
                        timestamp: "2026-10-03T10:05:00Z",
                        message: { content: "<task-notification>" },
                    }),
                    line({ type: "assistant", timestamp: "2026-10-03T10:06:00Z" }),
                ].join("\n"),
            );
            expect(sessionTypedAt(cwd, home)).toBe("2026-10-03T10:00:00Z");
        } finally {
            rmSync(home, { recursive: true, force: true });
        }
    });
});
