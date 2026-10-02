/**
 * The launcher (design section 3.1): the stdio MCP server Claude Code starts from `.mcp.json`. It
 * answers `initialize` and `tools/list` at once from a static tool list, finds or starts the one
 * daemon of the repository in the background (`ensureDaemon`), and forwards every `tools/call` to
 * that daemon over HTTP. stdout carries JSON-RPC lines only; anything else goes to stderr.
 *
 * The daemon always runs the default branch's copy of the package, archived into
 * `<root>/.githerd/versions/<version>-<hash8>/`, so a worktree's unmerged code never becomes the
 * shared daemon. It is started through servherd under the name `githerd`; because servherd 1.1
 * starts every process with pm2's autorestart off, the launcher re-creates the pm2 process with
 * autorestart on after every `start`.
 */

import { execFile, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
    appendFileSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";

import { DEFAULTS, defaultBranch, repoRoot, resolveConfig } from "./config.mjs";
import { createMcpServer } from "./mcp.mjs";
import { createNotifier } from "./notify.mjs";
import { identify, sameProcess } from "./proc.mjs";
import { sessionTools } from "./tools.mjs";
import { PACKAGE_DIR, readVersion } from "./version.mjs";

/** The /health protocol major this launcher speaks (the daemon's `PROTOCOL`). */
const PROTOCOL = 1;
/** The name every githerd daemon reports in /health, and the default servherd name. */
const NAME = "githerd";
/** How long a `tools/call` waits for the daemon. */
const CALL_WAIT_MS = 45_000;
/** How long a started daemon has to report the expected code hash. */
const HEALTH_WAIT_MS = 30_000;
const HEALTH_POLL_MS = 250;
/** A lock with no owner.json is stale after this long. */
const LOCK_STALE_MS = 60_000;
/** At most one restart for a wedged loop, and one start of code that failed to start, per this long. */
const RESTART_EVERY_MS = 15 * 60_000;
const HEARTBEAT_MS = 60_000;
const HEARTBEAT_JITTER_MS = 10_000;
/** Every git, servherd and pm2 call is killed after this long. */
const EXEC_TIMEOUT_MS = 60_000;
/** Version directories kept besides the one in use. */
const KEEP_VERSIONS = 3;

/**
 * Everything `ensureDaemon` works from.
 * @typedef {object} LauncherContext
 * @property {string} root the repository's main checkout
 * @property {string} name the daemon's servherd name, `githerd` unless set
 * @property {string} stateDir `<root>/.githerd` unless set
 * @property {Record<string, string | undefined>} env the environment the launcher passes on
 * @property {import("./config.mjs").Config | null} config the config; null when invalid
 * @property {string[]} servherd the servherd command
 * @property {string[]} pm2 the pm2 command
 * @property {string} pkgDir the package's path in the repository, for example `githerd`
 * @property {() => Date} now the clock
 * @property {number} healthWaitMs how long a started daemon has to answer
 */

/**
 * Runs a command without a shell, with git prompts off and a timeout.
 * @param {string[]} argv the command and its arguments
 * @param {{cwd: string, env: Record<string, string | undefined>}} options where and with what
 * @returns {Promise<string>} stdout; rejects with stderr (or stdout) on a non-zero exit
 */
function run(argv, { cwd, env }) {
    return new Promise((resolve, reject) => {
        execFile(
            argv[0],
            argv.slice(1),
            { cwd, env: { ...env, GIT_TERMINAL_PROMPT: "0" }, timeout: EXEC_TIMEOUT_MS, killSignal: "SIGKILL" },
            (err, stdout, stderr) => {
                if (err) {
                    const detail = String(stderr).trim() || String(stdout).trim() || err.message;
                    reject(new Error(`${basename(argv[0])} ${argv.slice(1, 3).join(" ")}: ${detail}`));
                } else resolve(String(stdout));
            },
        );
    });
}

/**
 * The pm2 command that manages servherd's processes: `GITHERD_PM2` (a JSON array) when set,
 * otherwise the pm2 servherd itself depends on.
 * @param {string[]} servherd the servherd command
 * @param {Record<string, string | undefined>} env the environment
 * @returns {string[]} the pm2 command
 */
export function pm2Command(servherd, env) {
    if (env.GITHERD_PM2) return JSON.parse(env.GITHERD_PM2);
    const last = servherd[servherd.length - 1];
    if (servherd[0] === "npx") return ["npx", "-y", "-p", last, "pm2"];
    try {
        return [process.execPath, createRequire(last).resolve("pm2/bin/pm2")];
    } catch {
        return ["pm2"];
    }
}

/**
 * Builds the launcher's context for a working directory.
 * @param {{cwd?: string, env?: Record<string, string | undefined>, now?: () => Date,
 *   pkgDir?: string, healthWaitMs?: number, name?: string, stateDir?: string}} [options] where the
 *   launcher runs; `name` defaults to `GITHERD_NAME` or `githerd` (a separate daemon, for the
 *   development daemon and the smoke test), `stateDir` to `<root>/.githerd`
 * @returns {{kind: "outside"} | {kind: "unconfigured", root: string, reason: string}
 *   | {kind: "ready", ctx: LauncherContext, problem: string | null}} outside a repository, not
 *   configured, or ready; `problem` names an invalid config, which the daemon reports in turn
 */
export function launcherContext({
    cwd = process.cwd(),
    env = process.env,
    now = () => new Date(),
    pkgDir,
    healthWaitMs = HEALTH_WAIT_MS,
    name = env.GITHERD_NAME || NAME,
    stateDir,
} = {}) {
    let root;
    try {
        root = repoRoot(cwd);
    } catch {
        return { kind: "outside" };
    }
    /** @type {import("./config.mjs").Config | null} */
    let config = null;
    let problem = null;
    try {
        const resolved = resolveConfig(root, env);
        if (resolved.configured === false) return { kind: "unconfigured", root, reason: resolved.reason };
        config = resolved.config;
    } catch (err) {
        problem = err.message;
    }
    const servherd = config?.servherdCommand ?? DEFAULTS.servherdCommand;
    return {
        kind: "ready",
        problem,
        ctx: {
            root,
            name,
            stateDir: stateDir ?? join(root, ".githerd"),
            env,
            config,
            servherd,
            pm2: pm2Command(servherd, env),
            pkgDir: pkgDir ?? ownPkgDir(),
            now,
            healthWaitMs,
        },
    };
}

/**
 * This package's path inside its repository, from the launcher's own location.
 * @returns {string} for example `githerd`
 */
function ownPkgDir() {
    try {
        const prefix = repoPrefix(PACKAGE_DIR);
        if (prefix) return prefix;
    } catch {
        // not inside a work tree: an archived copy
    }
    return basename(PACKAGE_DIR.replace(/\/$/, ""));
}

/**
 * `git rev-parse --show-prefix` without the trailing slash.
 * @param {string} dir a directory inside a work tree
 * @returns {string} the prefix
 */
function repoPrefix(dir) {
    return execFileSync("git", ["rev-parse", "--show-prefix"], { cwd: dir, encoding: "utf8" })
        .trim()
        .replace(/\/$/, "");
}

/**
 * Appends one line to `launcher.log`.
 * @param {LauncherContext} ctx the context
 * @param {"info" | "error"} level the level
 * @param {string} text the line
 */
function logLine(ctx, level, text) {
    mkdirSync(ctx.stateDir, { recursive: true });
    appendFileSync(join(ctx.stateDir, "launcher.log"), `${ctx.now().toISOString()} ${level} ${text}\n`);
}

/**
 * Reads a JSON file.
 * @param {string} path the file
 * @returns {any} its contents, or null when missing or unreadable
 */
function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return null;
    }
}

/**
 * The code the shared daemon must run: the default branch's copy of the package.
 * @param {LauncherContext} ctx the context
 * @returns {Promise<{branch: string, hash: string, version: string}>} the target
 */
export async function targetCode(ctx) {
    const branch = defaultBranch(ctx.root);
    if (branch === null) throw new Error("origin/HEAD is not set: cannot find the default branch");
    const opts = { cwd: ctx.root, env: ctx.env };
    let hash;
    try {
        hash = (await run(["git", "rev-parse", `origin/${branch}:${ctx.pkgDir}`], opts)).trim();
    } catch {
        throw new Error(`${ctx.pkgDir}/ is not on origin/${branch}`);
    }
    const pkg = JSON.parse(await run(["git", "show", `origin/${branch}:${ctx.pkgDir}/package.json`], opts));
    return { branch, hash, version: pkg.version };
}

/**
 * Archives the target into `versions/<version>-<hash8>/` (temporary name, then rename) with its
 * version.json, and prunes the older copies.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the code
 * @returns {Promise<string>} the copy's directory
 */
async function materialize(ctx, target) {
    const versions = join(ctx.stateDir, "versions");
    const dir = join(versions, `${target.version}-${target.hash.slice(0, 8)}`);
    if (readJson(join(dir, "version.json"))?.codeHash === target.hash) return dir;
    const tmp = `${dir}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
    mkdirSync(tmp, { recursive: true });
    try {
        await new Promise((resolve, reject) => {
            const env = { ...ctx.env, GIT_TERMINAL_PROMPT: "0" };
            const archive = spawn("git", ["archive", `origin/${target.branch}:${ctx.pkgDir}`], {
                cwd: ctx.root,
                env,
                stdio: ["ignore", "pipe", "pipe"],
            });
            const tar = spawn("tar", ["-x", "-C", tmp], { stdio: ["pipe", "ignore", "pipe"] });
            archive.stdout.pipe(tar.stdin);
            let stderr = "";
            archive.stderr.on("data", (d) => (stderr += d));
            tar.stderr.on("data", (d) => (stderr += d));
            const exit = (/** @type {import("node:child_process").ChildProcess} */ child) =>
                new Promise((done, fail) => {
                    child.on("error", fail);
                    child.on("close", done);
                });
            Promise.all([exit(archive), exit(tar)]).then(
                ([a, t]) =>
                    a === 0 && t === 0 ? resolve(undefined) : reject(new Error(`git archive failed: ${stderr.trim()}`)),
                reject,
            );
        });
        writeFileSync(
            join(tmp, "version.json"),
            `${JSON.stringify({ version: target.version, codeHash: target.hash })}\n`,
        );
        rmSync(dir, { recursive: true, force: true });
        renameSync(tmp, dir);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
    // ponytail: keeps the newest copies by mtime; track the copies runs use once runs exist
    const old = readdirSync(versions)
        .map((name) => join(versions, name))
        .filter((path) => path !== dir)
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
        .slice(KEEP_VERSIONS - 1);
    for (const path of old) rmSync(path, { recursive: true, force: true });
    return dir;
}

/**
 * Asks the daemon `daemon.json` names for its health, with a 1 second timeout.
 * @param {LauncherContext} ctx the context
 * @returns {Promise<{record: any, health: any, error: string | null}>} the record, and the health
 *   answer or why there is none
 */
export async function probe(ctx) {
    const record = readJson(join(ctx.stateDir, "daemon.json"));
    if (!record?.port) return { record, health: null, error: "no daemon.json" };
    try {
        const res = await fetch(`http://127.0.0.1:${record.port}/health`, { signal: AbortSignal.timeout(1000) });
        return { record, health: await res.json(), error: null };
    } catch (err) {
        return { record, health: null, error: `no answer from /health: ${err.cause?.code ?? err.message}` };
    }
}

/**
 * Whether a health answer belongs to this repository's daemon and speaks our protocol.
 * @param {LauncherContext} ctx the context
 * @param {any} health the /health answer
 * @returns {boolean} true when it is ours
 */
export const ours = (ctx, health) => health?.name === NAME && health.root === ctx.root && health.protocol === PROTOCOL;

/**
 * Whether the daemon's loop is ticking: its last tick is younger than 3 poll intervals plus 60 s.
 * `lastPollOkAt` is never consulted; a GitHub outage is not a daemon fault.
 * @param {LauncherContext} ctx the context
 * @param {any} health the /health answer
 * @returns {boolean} true when the loop is alive
 */
function ticking(ctx, health) {
    const pollMs = (ctx.config?.pollSeconds ?? DEFAULTS.pollSeconds) * 1000;
    const tick = Date.parse(health.loopTickAt ?? health.startedAt);
    return ctx.now().getTime() - tick < 3 * pollMs + 60_000;
}

/**
 * Takes the start lock: `mkdir`, then owner.json with this process's identity. A stale lock (its
 * owner is gone, or it has no owner.json and is older than 60 s) is stolen by renaming it, which
 * only one launcher can win.
 * @param {LauncherContext} ctx the context
 * @returns {boolean} true when this launcher holds the lock
 */
function takeLock(ctx) {
    const lock = join(ctx.stateDir, "start.lock");
    mkdirSync(ctx.stateDir, { recursive: true });
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            mkdirSync(lock);
            writeFileSync(join(lock, "owner.json"), `${JSON.stringify(identify(process.pid))}\n`);
            return true;
        } catch (err) {
            if (err.code !== "EEXIST") throw err;
        }
        const owner = readJson(join(lock, "owner.json"));
        let stale;
        if (owner) stale = !sameProcess(owner);
        else {
            let mtime;
            try {
                mtime = statSync(lock).mtimeMs;
            } catch {
                continue; // released meanwhile: try again
            }
            stale = ctx.now().getTime() - mtime > LOCK_STALE_MS;
        }
        if (!stale) return false;
        const moved = `${lock}.stale-${process.pid}-${randomBytes(4).toString("hex")}`;
        try {
            renameSync(lock, moved);
        } catch {
            return false; // another launcher won the steal
        }
        rmSync(moved, { recursive: true, force: true });
    }
    return false;
}

/**
 * Releases the start lock.
 * @param {LauncherContext} ctx the context
 */
function releaseLock(ctx) {
    rmSync(join(ctx.stateDir, "start.lock"), { recursive: true, force: true });
}

/**
 * Polls /health every 250 ms until `ready` accepts the answer.
 * @param {LauncherContext} ctx the context
 * @param {(health: any) => boolean} ready accepts a health answer
 * @returns {Promise<{health: any, error: string | null}>} the accepted answer, or the last reason
 *   there was none when the wait ran out
 */
export async function waitFor(ctx, ready) {
    const until = Date.now() + ctx.healthWaitMs;
    let last = "no answer";
    for (;;) {
        const { health, error } = await probe(ctx);
        if (health && ready(health)) return { health, error: null };
        last = error ?? `daemon reports code ${health?.codeHash}`;
        if (Date.now() >= until) return { health: null, error: last };
        await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
    }
}

/**
 * Runs servherd with `--json` and returns its `data`.
 * @param {LauncherContext} ctx the context
 * @param {string[]} args the arguments after `--json`
 * @returns {Promise<any>} the data servherd reported
 */
export async function servherd(ctx, args) {
    const out = await run([...ctx.servherd, "--json", ...args], { cwd: ctx.root, env: ctx.env });
    let parsed;
    try {
        parsed = JSON.parse(out.slice(out.indexOf("{")));
    } catch {
        throw new Error(`servherd ${args[0]}: unreadable output: ${out.trim().slice(0, 200)}`);
    }
    if (!parsed.success) throw new Error(`servherd ${args[0]}: ${parsed.error?.message ?? "failed"}`);
    return parsed.data;
}

/**
 * Where and how to run servherd's pm2. servherd keeps its pm2 in ~/.servherd/pm2 unless PM2_HOME
 * says otherwise; pm2's own default, ~/.pm2, would start a second pm2 that servherd never sees.
 * @param {LauncherContext} ctx the context
 * @returns {{cwd: string, env: Record<string, string | undefined>}} the options for `run`
 */
export function pm2Options(ctx) {
    return { cwd: ctx.root, env: { ...ctx.env, PM2_HOME: ctx.env.PM2_HOME || join(homedir(), ".servherd", "pm2") } };
}

/**
 * Re-creates the pm2 process servherd just started, with autorestart on and everything else the
 * same (servherd 1.1 has no option for it).
 * @param {LauncherContext} ctx the context
 * @param {any} server servherd's record of the server
 */
async function enableAutorestart(ctx, server) {
    const [script, ...args] = server.resolvedCommand.trim().split(/\s+/);
    const file = join(ctx.stateDir, `pm2-${ctx.name}.json`);
    const app = {
        name: server.pm2Name,
        script,
        args,
        cwd: server.cwd,
        env: { ...server.env, PORT: String(server.port) },
        autorestart: true,
        log_date_format: "YYYY-MM-DDTHH:mm:ss.SSSZ",
    };
    writeFileSync(file, `${JSON.stringify({ apps: [app] }, null, 2)}\n`);
    const opts = pm2Options(ctx);
    await run([...ctx.pm2, "delete", server.pm2Name], opts);
    await run([...ctx.pm2, "start", file], opts);
}

/**
 * Pages the owner once through the configured notify command.
 * @param {LauncherContext} ctx the context
 * @param {string} message the page
 */
async function page(ctx, message) {
    const notify = ctx.config?.notify ?? DEFAULTS.notify;
    if (!notify.command) return;
    const notifier = createNotifier({ notify, state: {}, ledger: () => {}, now: ctx.now });
    notifier.send({ key: "launcher", status: "error", message, bypass: true });
    await notifier.flush();
}

/**
 * Finds the repository's daemon, or starts, upgrades or restarts it (design section 3.1).
 * @param {LauncherContext} ctx the context
 * @returns {Promise<{url: string, action: "warm" | "waiting" | "started" | "restarted" | "other-launcher" | "run"}>}
 *   the daemon's URL and what was done; `waiting` means an upgrade waits for runs in flight
 */
export async function ensureDaemon(ctx) {
    if (ctx.env.GITHERD_URL) return { url: ctx.env.GITHERD_URL, action: "run" };
    const target = await targetCode(ctx);
    const url = (/** @type {any} */ h) => `http://127.0.0.1:${h.port}`;

    const warm = await probe(ctx);
    if (ours(ctx, warm.health)) {
        if (warm.health.codeHash === target.hash && ticking(ctx, warm.health))
            return { url: url(warm.health), action: "warm" };
        if (warm.health.codeHash !== target.hash && warm.health.runsInFlight > 0)
            return { url: url(warm.health), action: "waiting" };
    }

    if (!takeLock(ctx)) {
        const { health, error } = await waitFor(ctx, (h) => ours(ctx, h) && h.codeHash === target.hash);
        if (!health) throw new Error(`another launcher is starting the daemon: ${error}`);
        return { url: url(health), action: "other-launcher" };
    }
    try {
        const { record, health } = await probe(ctx);
        if (ours(ctx, health) && health.codeHash === target.hash && ticking(ctx, health))
            return { url: url(health), action: "warm" };

        // A start that failed is not retried for 15 minutes, and pages once per code hash.
        const failFile = join(ctx.stateDir, "start-failed.json");
        const failed = readJson(failFile);
        const failedBefore = failed?.codeHash === target.hash;
        if (failedBefore && ctx.now().getTime() - Date.parse(failed.at) < RESTART_EVERY_MS) {
            throw new Error(`${failed.reason} (at ${failed.at}; next try 15 minutes after that)`);
        }

        const live = record && sameProcess(record) ? record : null;
        /** @type {"started" | "restarted"} */
        let action;
        if (live && record.codeHash === target.hash) {
            // Online with the right code, but its loop is wedged or it does not answer.
            const restartFile = join(ctx.stateDir, "last-restart.json");
            const last = Date.parse(readJson(restartFile)?.at ?? "");
            if (ctx.now().getTime() - last < RESTART_EVERY_MS) {
                throw new Error(`daemon pid ${record.pid} is wedged; restarted less than 15 minutes ago`);
            }
            writeFileSync(restartFile, `${JSON.stringify({ at: ctx.now().toISOString(), pid: record.pid })}\n`);
            logLine(ctx, "info", `restarting wedged daemon pid ${record.pid}`);
            await servherd(ctx, ["restart", ctx.name]);
            action = "restarted";
        } else {
            const dir = await materialize(ctx, target);
            const env = ["-e", "PORT={{port}}"];
            if (ctx.env.GITHERD_CONFIG) env.push("-e", `GITHERD_CONFIG=${ctx.env.GITHERD_CONFIG}`);
            if (ctx.stateDir !== join(ctx.root, ".githerd")) env.push("-e", `GITHERD_STATE_DIR=${ctx.stateDir}`);
            const daemon = join(dir, "bin", "githerd-daemon.mjs");
            const data = await servherd(ctx, ["start", "-n", ctx.name, ...env, "--", "node", daemon]);
            if (data.action !== "existing") await enableAutorestart(ctx, data.server);
            logLine(ctx, "info", `servherd ${data.action} ${ctx.name} at ${target.version}-${target.hash.slice(0, 8)}`);
            action = "started";
        }
        const { health: up, error } = await waitFor(
            ctx,
            (h) => ours(ctx, h) && h.codeHash === target.hash && h.pid !== live?.pid,
        );
        if (!up) {
            const reason = `githerd daemon failed to start: ${error}`;
            logLine(ctx, "error", reason);
            const at = ctx.now().toISOString();
            writeFileSync(failFile, `${JSON.stringify({ codeHash: target.hash, at, reason })}\n`);
            if (!failedBefore) await page(ctx, reason);
            throw new Error(reason);
        }
        rmSync(failFile, { force: true });
        return { url: url(up), action };
    } finally {
        releaseLock(ctx);
    }
}

/**
 * The static tools a session sees before the daemon answers: the six session tools' names,
 * descriptions and schemas. Their calls are forwarded, never run here.
 * @returns {import("./mcp.mjs").Tool[]} the tools
 */
function staticTools() {
    return sessionTools(/** @type {any} */ ({ caller: {} })).map((t) => ({
        ...t,
        handler: () => {
            throw new Error("forwarded to the daemon");
        },
    }));
}

/**
 * Runs the launcher on a pair of streams until the input ends.
 * @param {object} options the streams and the context
 * @param {NodeJS.ReadableStream} options.input JSON-RPC lines from the client
 * @param {(line: string) => void} options.write writes one line to the client
 * @param {string} [options.cwd] the session's working directory
 * @param {Record<string, string | undefined>} [options.env] the environment
 * @param {number} [options.ppid] the session's process (the `claude` that started this)
 * @param {() => Date} [options.now] the clock
 * @param {string} [options.pkgDir] the package's path in the repository
 * @param {number} [options.heartbeatMs] the heartbeat interval
 * @param {number} [options.jitterMs] the largest delay before a heartbeat's ensure
 * @param {number} [options.callWaitMs] how long a tool call waits for the daemon
 * @param {number} [options.healthWaitMs] how long a started daemon has to answer
 * @param {(line: string) => void} [options.log] diagnostics; stderr by default
 * @returns {Promise<{ensured: Promise<unknown> | null}>} resolves when the input ends; `ensured`
 *   is the startup ensure (null outside a repository), for tests
 */
export async function runLauncher({
    input,
    write,
    cwd = process.cwd(),
    env = process.env,
    ppid = process.ppid,
    now = () => new Date(),
    pkgDir,
    heartbeatMs = HEARTBEAT_MS,
    jitterMs = HEARTBEAT_JITTER_MS,
    callWaitMs = CALL_WAIT_MS,
    healthWaitMs,
    log = (line) => process.stderr.write(`githerd-mcp: ${line}\n`),
}) {
    const found = launcherContext({ cwd, env, now, pkgDir, healthWaitMs });
    if (found.kind === "outside") return { ensured: null };
    const { version } = readVersion();
    const serverInfo = { name: NAME, version };

    if (found.kind === "unconfigured") {
        const reason = found.reason;
        const local = createMcpServer({
            serverInfo,
            tools: () => [
                {
                    name: "githerd_status",
                    description: "githerd's state for this repository.",
                    inputSchema: { type: "object", properties: {} },
                    handler: () => reason,
                },
            ],
        });
        await lines(input, async (line) => {
            const reply = await local.handle(line);
            if (reply) write(JSON.stringify(reply));
        });
        return { ensured: null };
    }

    const { ctx, problem } = found;
    if (problem) log(`config: ${problem}`);
    const session = `${basename(worktreeTop(cwd) ?? cwd)}-${ppid}`;
    const headers = {
        "content-type": "application/json",
        "x-githerd-session": session,
        ...(env.GITHERD_RUN_TOKEN ? { authorization: `Bearer ${env.GITHERD_RUN_TOKEN}` } : {}),
    };

    /** @type {Promise<string> | null} */
    let inflight = null;
    /** @type {string | null} */
    let daemonUrl = null;
    let upgradeWaiting = false;
    /**
     * Runs one `ensureDaemon` at a time.
     * @returns {Promise<string>} the daemon's URL
     */
    const ensure = () => {
        inflight ??= ensureDaemon(ctx)
            .then((r) => {
                daemonUrl = r.url;
                upgradeWaiting = r.action === "waiting";
                return r.url;
            })
            .catch((err) => {
                log(`ensureDaemon: ${err.message}`);
                throw err;
            })
            .finally(() => {
                inflight = null;
            });
        return inflight;
    };
    const ensured = ensure().catch(() => {});

    const local = createMcpServer({ serverInfo, tools: staticTools });

    /**
     * Forwards one `tools/call`, waiting up to `callWaitMs` for the daemon.
     * @param {any} msg the request
     * @returns {Promise<unknown>} the reply
     */
    async function forward(msg) {
        const notReachable = (/** @type {string} */ reason) => ({
            jsonrpc: "2.0",
            id: msg.id,
            result: { content: [{ type: "text", text: `githerd daemon not reachable: ${reason}` }], isError: true },
        });
        let target;
        try {
            /** @type {NodeJS.Timeout | undefined} */
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`no daemon after ${callWaitMs / 1000} s`)), callWaitMs);
            });
            target = await Promise.race([inflight ?? (daemonUrl ? Promise.resolve(daemonUrl) : ensure()), timeout]);
            clearTimeout(timer);
        } catch (err) {
            return notReachable(err.message);
        }
        try {
            const res = await fetch(`${target}/rpc`, {
                method: "POST",
                headers,
                body: JSON.stringify(msg),
                signal: AbortSignal.timeout(callWaitMs),
            });
            return await res.json();
        } catch (err) {
            daemonUrl = null;
            void ensure().catch(() => {});
            return notReachable(err.cause?.code ?? err.message);
        }
    }

    const beat = setInterval(async () => {
        if (env.GITHERD_URL) return;
        if (upgradeWaiting) void ensure().catch(() => {});
        try {
            const target = daemonUrl ?? "http://127.0.0.1:1";
            await fetch(`${target}/heartbeat`, {
                method: "POST",
                headers,
                body: JSON.stringify({ session, cwd, branch: currentBranch(cwd) }),
                signal: AbortSignal.timeout(5000),
            });
        } catch {
            daemonUrl = null;
            setTimeout(() => void ensure().catch(() => {}), Math.random() * jitterMs).unref();
        }
    }, heartbeatMs);
    beat.unref();

    await lines(input, async (line) => {
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            msg = null;
        }
        const reply =
            msg?.method === "tools/call" && Object.hasOwn(msg, "id") ? await forward(msg) : await local.handle(line);
        if (reply) write(JSON.stringify(reply));
    });
    clearInterval(beat);
    return { ensured };
}

/**
 * Calls `handle` for every non-empty line of `input`, without waiting for one before reading the
 * next, and resolves when the input has ended and every call has finished.
 * @param {NodeJS.ReadableStream} input the stream
 * @param {(line: string) => Promise<void>} handle the line handler
 * @returns {Promise<void>} resolves at the end
 */
async function lines(input, handle) {
    const pending = new Set();
    for await (const line of createInterface({ input, crlfDelay: Infinity })) {
        if (!line.trim()) continue;
        const p = handle(line).catch((err) => process.stderr.write(`githerd-mcp: ${err.message}\n`));
        pending.add(p);
        void p.finally(() => pending.delete(p));
    }
    await Promise.all(pending);
}

/**
 * The top of the work tree holding `cwd`.
 * @param {string} cwd a directory
 * @returns {string | null} the top, or null
 */
function worktreeTop(cwd) {
    try {
        return gitSync(cwd, "rev-parse", "--show-toplevel");
    } catch {
        return null;
    }
}

/**
 * The branch checked out at `cwd`.
 * @param {string} cwd a directory
 * @returns {string | null} the branch, or null
 */
function currentBranch(cwd) {
    try {
        return gitSync(cwd, "rev-parse", "--abbrev-ref", "HEAD");
    } catch {
        return null;
    }
}

/**
 * Runs git synchronously.
 * @param {string} cwd where
 * @param {...string} args the arguments
 * @returns {string} trimmed stdout
 */
function gitSync(cwd, ...args) {
    return execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10_000,
    }).trim();
}
