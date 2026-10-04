/**
 * The launcher (design section 3.1): the stdio MCP server Claude Code starts from `.mcp.json`. It
 * answers `initialize` and `tools/list` at once with the eleven tools of design section 6, finds or
 * starts the one daemon of the repository in the background (`ensureDaemon`), and forwards every
 * `tools/call` to that daemon over HTTP, after checking its arguments, with the session it serves
 * (`identifySession`) and the tool protocol in `params._meta.githerd`. stdout carries JSON-RPC lines only; anything else goes to stderr.
 *
 * The daemon always runs the default branch's copy of the package, archived into
 * `~/.githerd/<checkout name>/versions/<version>-<hash8>/` with `current` pointing at it, so a
 * worktree's unmerged code never becomes the shared daemon. Every start path (this launcher, the
 * MCP server's once-a-minute check, `githerd ensure`, the command `githerd install` prints) gives
 * servherd the same name, the same working directory (the state directory) and the same command
 * line, so servherd, which identifies a server by working directory plus name, always finds the one
 * entry (design section 9.4). servherd's `--autorestart` makes pm2 bring back a crashed daemon.
 *
 * The command starts the daemon under `env -i`: pm2 hands every process it starts the environment
 * of the session that first started pm2 (stale `CLAUDE*` variables among it). The daemon reads its
 * environment from `daemon-env.json` in the state directory instead, an allow-list written by the
 * first start or by `githerd install`; secrets in it (the notify command's keys) never appear on a
 * command line, which every process on the machine can read.
 *
 * A restart is allowed only when `alive` is older than 60 s and the daemon's lock names a process
 * that is gone, and only by the holder of `restart.lock`.
 */

import { execFile, execFileSync, spawn } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import {
    appendFileSync,
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";

import { DEFAULTS, defaultBranch, repoRoot, resolveConfig } from "./config.mjs";
import { createMcpServer, forwardingTools, identifySession } from "./mcp.mjs";
import { createNotifier, lastTyped, lastTypedAt } from "./notify.mjs";
import { identify, sameProcess } from "./proc.mjs";
import {
    currentDir,
    currentHash,
    gateTree,
    reapGating,
    readSelfUpdate,
    realGates,
    updateGate,
    writeGating,
    writeSelfUpdate,
} from "./self-update.mjs";
import { defaultStateDir, readLiveness } from "./store.mjs";
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
/** The daemon rewrites `alive` every 10 s; older than this, and with its lock holder gone, it is down. */
const ALIVE_STALE_MS = 60_000;
/** At most one start of code that failed to start per this long. */
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
 * @property {string} stateDir `~/.githerd/<checkout name>` unless set
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
    const last = servherd.at(-1) ?? "";
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
 *   development daemon and the smoke test), `stateDir` to `~/.githerd/<checkout name>`
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
            stateDir: stateDir ?? defaultStateDir(root, env.HOME),
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
 * This package's path inside its repository, from the launcher's own location; an archived copy
 * (`versions/<version>-<hash8>/`) names it in its `version.json`.
 * @returns {string} for example `githerd`
 */
function ownPkgDir() {
    try {
        const prefix = repoPrefix(PACKAGE_DIR);
        if (prefix) return prefix;
    } catch {
        // not inside a work tree: an archived copy
    }
    return readJson(join(PACKAGE_DIR, "version.json"))?.pkgDir ?? basename(PACKAGE_DIR.replace(/\/$/, ""));
}

/**
 * `git rev-parse --show-prefix` without the trailing slash.
 * @param {string} dir a directory inside a work tree
 * @returns {string} the prefix
 */
function repoPrefix(dir) {
    const prefix = execFileSync(
        "git", // NOSONAR(S4036): the owner's git from his own PATH, as tools/ runs it
        ["rev-parse", "--show-prefix"],
        { cwd: dir, encoding: "utf8" },
    );
    return prefix.trim().replace(/\/$/, "");
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
    if (branch === null) {
        throw new Error(
            "cannot find the default branch: origin/HEAD is not set and the remote did not answer (git remote set-head origin -a)",
        );
    }
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
            const archive = spawn(
                "git", // NOSONAR(S4036): the owner's git from his own PATH, as tools/ runs it
                ["archive", `origin/${target.branch}:${ctx.pkgDir}`],
                { cwd: ctx.root, env, stdio: ["ignore", "pipe", "pipe"] },
            );
            const tar = spawn(
                "tar", // NOSONAR(S4036): the system's tar from the owner's PATH, as tools/ runs it
                ["-x", "-C", tmp],
                { stdio: ["pipe", "ignore", "pipe"] },
            );
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
            `${JSON.stringify({ version: target.version, codeHash: target.hash, pkgDir: ctx.pkgDir })}\n`,
        );
        rmSync(dir, { recursive: true, force: true });
        renameSync(tmp, dir);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
    // ponytail: keeps the newest copies by mtime; track the copies runs use once runs exist. The
    // running copy and the one an adoption would roll back to are never removed.
    const keep = new Set([dir, currentDir(ctx.stateDir), readSelfUpdate(ctx.stateDir).adopting?.previous]);
    const old = readdirSync(versions)
        .map((name) => join(versions, name))
        .filter((path) => !keep.has(path) && !keep.has(basename(path)))
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

/** The lock a start or upgrade of the daemon holds. */
const RESTART_LOCK = "restart.lock";
/** The lock the gating of a new version holds (design 9.8), apart from the restart lock. */
const GATE_LOCK = "gate.lock";

/**
 * Takes a lock of the state directory, the restart lock by default: `mkdir`, then owner.json with
 * this process's identity. A stale lock (its owner is gone, or it has no owner.json and is older
 * than 60 s) is removed only by the holder of `<lock>.steal`, which judges it again first: renaming
 * a lock judged stale a moment ago could remove a fresh lock another launcher took in between, and
 * then two launchers would start.
 * @param {LauncherContext} ctx the context
 * @param {string} [name] the lock directory's name
 * @returns {boolean} true when this process holds the lock
 */
function takeLock(ctx, name = RESTART_LOCK) {
    const lock = join(ctx.stateDir, name);
    mkdirSync(ctx.stateDir, { recursive: true });
    for (let attempt = 0; attempt < 2; attempt++) {
        if (makeLock(lock)) return true;
        if (!lockStale(ctx, lock)) continue; // released meanwhile, or not stale: the loop decides
        if (!removeStale(ctx, lock)) return false;
    }
    return false;
}

/**
 * Makes the restart lock directory with this process's owner.json.
 * @param {string} lock the lock directory
 * @returns {boolean} false when it already exists
 */
function makeLock(lock) {
    try {
        mkdirSync(lock);
    } catch (err) {
        if (err.code === "EEXIST") return false;
        throw err;
    }
    writeFileSync(join(lock, "owner.json"), `${JSON.stringify(identify(process.pid))}\n`);
    return true;
}

/**
 * Removes a stale restart lock while holding `restart.lock.steal`, judging it again first.
 * @param {LauncherContext} ctx the context
 * @param {string} lock the lock directory
 * @returns {boolean} false when another launcher holds the steal
 */
function removeStale(ctx, lock) {
    const steal = `${lock}.steal`;
    try {
        mkdirSync(steal);
    } catch (err) {
        if (err.code !== "EEXIST") throw err;
        // ponytail: a launcher killed while stealing leaves this behind; it is cleared after
        // 60 s like an ownerless lock, so a start waits at most that long.
        if (ctx.now().getTime() - mtimeOf(steal) > LOCK_STALE_MS) rmSync(steal, { recursive: true, force: true });
        return false;
    }
    try {
        if (lockStale(ctx, lock)) rmSync(lock, { recursive: true, force: true });
    } finally {
        rmSync(steal, { recursive: true, force: true });
    }
    return true;
}

/**
 * The modification time of a path, or 0 when it is gone.
 * @param {string} path the path
 * @returns {number} milliseconds since the epoch
 */
function mtimeOf(path) {
    try {
        return statSync(path).mtimeMs;
    } catch {
        return 0;
    }
}

/**
 * Whether the restart lock is stale: its owner is gone, or it has no owner.json and is older than
 * 60 s. A lock that no longer exists is not stale.
 * @param {LauncherContext} ctx the context
 * @param {string} lock the lock directory
 * @returns {boolean} true when the lock may be removed
 */
function lockStale(ctx, lock) {
    const owner = readJson(join(lock, "owner.json"));
    if (owner) return !sameProcess(owner);
    const mtime = mtimeOf(lock);
    return mtime > 0 && ctx.now().getTime() - mtime > LOCK_STALE_MS;
}

/**
 * Releases a lock of the state directory, the restart lock by default.
 * @param {LauncherContext} ctx the context
 * @param {string} [name] the lock directory's name
 */
function releaseLock(ctx, name = RESTART_LOCK) {
    rmSync(join(ctx.stateDir, name), { recursive: true, force: true });
}

/**
 * Whether a live process gates a new version now (it holds `gate.lock`).
 * @param {LauncherContext} ctx the context
 * @returns {boolean} true while the gate lock exists and is not stale
 */
export function gateLocked(ctx) {
    const lock = join(ctx.stateDir, GATE_LOCK);
    return existsSync(lock) && !lockStale(ctx, lock);
}

/**
 * Removes what a gating process that died left (design 9.8), when no live process gates: takes
 * the gate lock, reaps a leftover `gating` record, and releases it. The daemon calls this at its
 * start.
 * @param {LauncherContext} ctx the context
 * @returns {Promise<string[] | null>} what could not be removed; null when nothing was left or
 *   another process gates
 */
export async function reapStaleGate(ctx) {
    if (!readSelfUpdate(ctx.stateDir).gating || !takeLock(ctx, GATE_LOCK)) return null;
    try {
        if (!readSelfUpdate(ctx.stateDir).gating) return null;
        const left = await reapGating({ root: ctx.root, stateDir: ctx.stateDir, pkgDir: ctx.pkgDir, env: ctx.env });
        const rest = left.length ? `; left: ${left.join("; ")}` : "";
        logLine(ctx, left.length ? "error" : "info", `removed an unfinished gate's leftovers${rest}`);
        return left;
    } finally {
        releaseLock(ctx, GATE_LOCK);
    }
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
    for (;;) {
        const { health, error } = await probe(ctx);
        if (health && ready(health)) return { health, error: null };
        const last = error ?? `daemon reports code ${health?.codeHash}`;
        if (Date.now() >= until) return { health: null, error: last };
        await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
    }
}

/**
 * Runs servherd with `--json` and returns its `data`.
 * @param {LauncherContext} ctx the context
 * @param {string[]} args the arguments after `--json`
 * @param {string} [cwd] where it runs, which servherd records as a new server's working directory
 * @returns {Promise<any>} the data servherd reported
 */
export async function servherd(ctx, args, cwd = ctx.root) {
    let out;
    try {
        out = await run([...ctx.servherd, "--json", ...args], { cwd, env: ctx.env });
    } catch (err) {
        if (err.message.includes("unknown option '--autorestart'")) {
            throw new Error("this servherd has no --autorestart option; githerd needs servherd 1.2.0 or later");
        }
        throw err;
    }
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
 * The variables the daemon keeps from the environment it was installed from: what git, gh, ssh
 * signing and the notify command need. No `CLAUDE*` variable, ever.
 */
const DAEMON_ENV_NAMES = new Set([
    "HOME",
    "USER",
    "LOGNAME",
    "LANG",
    "TZ",
    "PATH",
    "SHELL",
    "SSH_AUTH_SOCK",
    "XDG_CONFIG_HOME",
]);
const DAEMON_ENV_PREFIX = /^(LC_|PUSHOVER_|GIT_CONFIG_(COUNT$|KEY_|VALUE_))/;
const DAEMON_ENV_FILE = "daemon-env.json";

/**
 * Whether the daemon keeps a variable.
 * @param {string} name the variable
 * @returns {boolean} true when it is on the allow-list
 */
const keptForDaemon = (name) => DAEMON_ENV_NAMES.has(name) || DAEMON_ENV_PREFIX.test(name);

/** Variable groups a replacing write keeps from the old file when the new environment has none of them. */
const DAEMON_ENV_STICKY = [/^PUSHOVER_/, /^GIT_CONFIG_(COUNT$|KEY_|VALUE_)/];

/**
 * Writes `daemon-env.json` (owner-only) from the allow-listed variables of `env`: when it is
 * missing, or always with `replace` (`githerd install`). A start from a worker, whose environment
 * lacks the notify keys, never overwrites the file the owner's shell wrote. A replacing write from
 * an environment with no notify keys, or no `GIT_CONFIG_*` signing variables, keeps the old file's
 * (a terminal lacks the signing variables, which come from the owner's Claude settings), so the
 * daemon never silently loses its pages or its signing.
 * @param {string} stateDir the state directory
 * @param {Record<string, string | undefined>} env the environment to copy from
 * @param {{replace?: boolean}} [options] overwrite an existing file
 * @returns {string[]} the variables kept from the old file
 */
export function writeDaemonEnv(stateDir, env, { replace = false } = {}) {
    const file = join(stateDir, DAEMON_ENV_FILE);
    const old = readJson(file);
    if (!replace && old) return [];
    /** @type {Record<string, string>} */
    const kept = Object.fromEntries(Object.entries(env).filter(([k, v]) => typeof v === "string" && keptForDaemon(k)));
    const carried = [];
    for (const group of DAEMON_ENV_STICKY) {
        if (Object.keys(kept).some((k) => group.test(k))) continue;
        for (const [k, v] of Object.entries(old ?? {})) {
            if (group.test(k) && typeof v === "string") {
                kept[k] = v;
                carried.push(k);
            }
        }
    }
    mkdirSync(stateDir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(kept, null, 2)}\n`, { mode: 0o600 });
    renameSync(tmp, file);
    return carried;
}

/**
 * Sets the daemon's own environment from `daemon-env.json`: every allow-listed variable not
 * already set (the start command sets only `PORT` and the `GITHERD_*` variables).
 * @param {string} stateDir the state directory
 * @param {Record<string, string | undefined>} env the environment to fill, `process.env` in the daemon
 */
export function loadDaemonEnv(stateDir, env) {
    const saved = readJson(join(stateDir, DAEMON_ENV_FILE)) ?? {};
    for (const [k, v] of Object.entries(saved)) {
        if (typeof v === "string" && keptForDaemon(k)) env[k] ??= v;
    }
}

/**
 * The servherd arguments that start a daemon under `env -i` (design section 9.4): only the root,
 * the state directory, `extra` and the port on its command line; the rest of its environment comes
 * from `daemon-env.json` in the state directory.
 * @param {{name: string, root: string, stateDir: string, script: string, extra?: string[]}} what
 *   the servherd name, the repository, the state directory, the daemon script, and further
 *   `NAME=value` words (the development daemon's)
 * @returns {string[]} the arguments after servherd's `--json`
 */
export function daemonStartArgs({ name, root, stateDir, script, extra = [] }) {
    return [
        "start",
        "-n",
        name,
        "--autorestart",
        "--",
        "env",
        "-i",
        `GITHERD_ROOT=${root}`,
        `GITHERD_STATE_DIR=${stateDir}`,
        ...extra,
        "PORT={{port}}",
        "node",
        script,
    ];
}

/**
 * The servherd arguments that start the shared daemon. They are the same from every start path,
 * whatever the caller's environment (no `GITHERD_CONFIG`: the shared daemon always reads the
 * default branch's config), and so is the working directory
 * (`servherd(ctx, startArgs(ctx), ctx.stateDir)`), so servherd always finds its one entry: a
 * second working directory or a changed command would make a second server, or restart the first.
 * @param {LauncherContext} ctx the context
 * @returns {string[]} the arguments after servherd's `--json`
 */
function startArgs(ctx) {
    return daemonStartArgs({
        name: ctx.name,
        root: ctx.root,
        stateDir: ctx.stateDir,
        script: join(ctx.stateDir, "current", "bin", "githerd-daemon.mjs"),
    });
}

/**
 * Quotes one word for a POSIX shell.
 * @param {string} word the word
 * @returns {string} the word, quoted when it needs it
 */
function shellWord(word) {
    if (/^[\w@%+=:,./-]+$/.test(word)) return word;
    const escaped = word.replaceAll("'", String.raw`'\''`);
    return `'${escaped}'`;
}

/**
 * The command `githerd install` prints: servherd's start of the daemon, from its fixed directory.
 * @param {LauncherContext} ctx the context
 * @returns {string} one shell line
 */
export function installCommand(ctx) {
    return `cd ${shellWord(ctx.stateDir)} && ${[...ctx.servherd, ...startArgs(ctx)].map(shellWord).join(" ")}`;
}

/**
 * Archives the target and points `current` at it (a symbolic link replaced by a rename, so it is
 * never missing). The running daemon keeps its copy until it restarts.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the code
 */
export async function prepareCode(ctx, target) {
    pointCurrent(ctx, await materialize(ctx, target));
}

/**
 * Points `current` at a version directory: a symbolic link replaced by a rename, never missing.
 * @param {LauncherContext} ctx the context
 * @param {string} dir the version directory
 */
function pointCurrent(ctx, dir) {
    const link = join(ctx.stateDir, "current");
    const tmp = `${link}.${process.pid}.tmp`;
    rmSync(tmp, { force: true });
    symlinkSync(join("versions", basename(dir)), tmp);
    renameSync(tmp, link);
}

/**
 * A version's name in logs and pages: `<version>-<hash8>`.
 * @param {{version: string, hash: string}} target the version
 * @returns {string} the name
 */
const label = (target) => `${target.version}-${target.hash.slice(0, 8)}`;

/**
 * Gates a new version before it may run (design 9.8): archives it into `versions/`, then runs the
 * replay, protocol and self-test gates in order and records the verdict in `self-update.json`. A
 * refusal is logged and paged once (the verdict stops a second gating of the same hash); the
 * running version stays. The running daemon calls this after a master move under the package; a
 * restarter starts it in the background for a daemon in fatal mode, which cannot.
 *
 * Gating holds `gate.lock`, so one process gates at a time: a caller that cannot take it gets
 * `{action: "gating"}` and no verdict. The gate running now is recorded as `gating` (its process
 * group and worktree), so a gater that died is cleaned up by the next one before it gates. An
 * aborted gating (the daemon stopping) records no verdict.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the new version
 * @param {import("./self-update.mjs").Gate[]} [gates] the gates; the real three by default
 * @param {{signal?: AbortSignal}} [options] aborts the gating
 * @returns {Promise<import("./self-update.mjs").GateRecord | {action: "gating"}>} the verdict, or
 *   `gating` when another process gates or this one was aborted
 */
export async function prepareUpdate(ctx, target, gates, { signal } = {}) {
    const known = readSelfUpdate(ctx.stateDir).gates[target.hash];
    if (known) return known;
    if (!takeLock(ctx, GATE_LOCK)) return { action: "gating" };
    try {
        const saved = readSelfUpdate(ctx.stateDir);
        if (saved.gates[target.hash]) return saved.gates[target.hash];
        if (saved.gating) {
            await reapGating({ root: ctx.root, stateDir: ctx.stateDir, pkgDir: ctx.pkgDir, env: ctx.env });
        }
        return await gate(ctx, target, gates, signal);
    } finally {
        releaseLock(ctx, GATE_LOCK);
    }
}

/**
 * Runs the gates of one version, holding the gate lock, and records the verdict.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the new version
 * @param {import("./self-update.mjs").Gate[] | undefined} gates the gates; the real three by default
 * @param {AbortSignal | undefined} signal aborts the gating
 * @returns {Promise<import("./self-update.mjs").GateRecord | {action: "gating"}>} the verdict
 */
async function gate(ctx, target, gates, signal) {
    const opts = { cwd: ctx.root, env: ctx.env };
    const commit = (await run(["git", "rev-parse", `origin/${target.branch}`], opts)).trim();
    const tree = (await run(["git", "rev-parse", `${commit}:${ctx.pkgDir}`], opts)).trim();
    if (tree !== target.hash) throw new Error(`origin/${target.branch} moved on while gating ${label(target)}`);
    const previous = currentDir(ctx.stateDir);
    const dir = await materialize(ctx, target);
    const at = () => ctx.now().toISOString();
    /** @type {import("./self-update.mjs").Gating} */
    const gating = { hash: target.hash, pgid: null, leader: null, tree: gateTree(ctx.stateDir, commit) };
    writeGating(ctx.stateDir, gating);
    const onSpawn = (/** @type {number} */ pgid) => {
        writeGating(ctx.stateDir, { ...gating, pgid, leader: identify(pgid) });
    };
    /** @type {import("./self-update.mjs").GateRecord} */
    let record = { passed: true, at: at(), version: target.version };
    for (const g of gates ?? realGates({ root: ctx.root, pkgDir: ctx.pkgDir, stateDir: ctx.stateDir, env: ctx.env })) {
        const r = await g.run({ dir, previous, commit, onSpawn });
        // A stop kills the gate's child: its failure says nothing about the version.
        if (signal?.aborted) return { action: "gating" };
        logLine(
            ctx,
            r.ok ? "info" : "error",
            `update to ${label(target)}: ${g.name} ${r.ok ? "passed" : "FAILED"}: ${r.detail}`,
        );
        if (!r.ok) {
            record = { passed: false, at: at(), version: target.version, gate: g.name, detail: r.detail };
            break;
        }
    }
    const saved = readSelfUpdate(ctx.stateDir);
    writeSelfUpdate(ctx.stateDir, { ...saved, gates: { ...saved.gates, [target.hash]: record }, gating: null });
    if (!record.passed) {
        const running = previous ? basename(previous) : "nothing";
        await page(
            ctx,
            `githerd update to ${label(target)} REFUSED: ${record.gate} failed: ${record.detail}; still running ${running}`,
        );
    }
    return record;
}

/** @type {Promise<unknown> | null} a gating this process started in the background */
let background = null;

/**
 * Starts gating a version in the background, once per process at a time: a restarter does this
 * for a daemon in fatal mode, and answers at once instead of waiting up to 47 minutes.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the new version
 */
function gateInBackground(ctx, target) {
    background ??= prepareUpdate(ctx, target)
        .catch((err) => logLine(ctx, "error", `update to ${label(target)}: ${err.message}`))
        .finally(() => {
            background = null;
        });
}

/**
 * The gating this process started in the background, while it runs.
 * @returns {Promise<unknown> | null} it, or null
 */
export function backgroundGating() {
    return background;
}

/**
 * Points `current` at a version whose gates passed, recording the version it replaces until the new
 * one answers.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the version
 */
async function adopt(ctx, target) {
    const previous = /** @type {string} */ (currentDir(ctx.stateDir));
    const dir = await materialize(ctx, target);
    const saved = readSelfUpdate(ctx.stateDir);
    writeSelfUpdate(ctx.stateDir, {
        ...saved,
        adopting: { hash: target.hash, previous: basename(previous), at: ctx.now().toISOString() },
    });
    pointCurrent(ctx, dir);
    logLine(ctx, "info", `adopting ${label(target)} in place of ${basename(previous)}`);
}

/**
 * Ends an adoption once its version answers.
 * @param {LauncherContext} ctx the context
 * @param {string} hash the hash that answered
 */
function settleAdoption(ctx, hash) {
    const saved = readSelfUpdate(ctx.stateDir);
    if (saved.adopting?.hash !== hash) return;
    writeSelfUpdate(ctx.stateDir, { ...saved, adopting: null });
    logLine(ctx, "info", `adopted ${hash.slice(0, 8)}`);
}

/**
 * Rolls back an adopted version that did not start (design 9.8): `current` back to the version it
 * replaced, the new hash refused for good, a log line and a page, and the previous version
 * restarted. Called holding the restart lock.
 * @param {LauncherContext} ctx the context
 * @param {{hash: string, previous: string}} adopting the adoption that failed
 * @param {string} reason why the new version is taken for failed
 * @param {any} before the daemon lock's holder before the start
 * @returns {Promise<{url: string, action: "rolled-back"}>} the previous version's daemon
 * @throws when the previous version does not answer either
 */
async function rollBack(ctx, adopting, reason, before) {
    const previous = join(ctx.stateDir, "versions", adopting.previous);
    pointCurrent(ctx, previous);
    const saved = readSelfUpdate(ctx.stateDir);
    const at = ctx.now().toISOString();
    writeSelfUpdate(ctx.stateDir, {
        ...saved,
        gates: { ...saved.gates, [adopting.hash]: { passed: false, at, gate: "start", detail: reason } },
        adopting: null,
    });
    const line = `githerd ROLLED BACK from ${adopting.hash.slice(0, 8)} to ${adopting.previous}: ${reason}`;
    logLine(ctx, "error", line);
    await page(ctx, line);
    const hash = currentHash(ctx.stateDir);
    await servherd(ctx, ["restart", ctx.name]);
    const { health, error } = await waitFor(ctx, (h) => ours(ctx, h) && h.codeHash === hash && h.pid !== before?.pid);
    if (!health) throw new Error(`${line}; and ${adopting.previous} did not answer either: ${error}`);
    return { url: daemonUrl(health), action: "rolled-back" };
}

/**
 * Whether the daemon is down by the restart rule (design section 9.4): `alive` is missing or older
 * than 60 s, and the daemon's lock names no live process. A daemon whose loop is slow keeps `alive`
 * fresh, and one whose process lives is never restarted.
 * @param {LauncherContext} ctx the context
 * @returns {boolean} true when a restarter may start it
 */
export function daemonDown(ctx) {
    const { alive, lock } = readLiveness(ctx.stateDir);
    if (ctx.now().getTime() - Date.parse(alive?.at ?? "") < ALIVE_STALE_MS) return false;
    return !lock?.pid || !sameProcess(lock);
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
 * Finds the repository's daemon, or starts or upgrades it. Every restarter calls this: the MCP
 * server at a session's start and once a minute, every CLI call that needs the daemon, and
 * `githerd ensure`.
 * @param {LauncherContext} ctx the context
 * @returns {Promise<{url: string, action: "warm" | "down" | "gating" | "refused" | "started"
 *   | "upgraded" | "rolled-back" | "other-launcher", fatal?: string}>} the daemon's URL and
 *   what was done; `gating` that the default branch's version waits for its gates, `refused`
 *   that it failed them (the daemon keeps its version), `rolled-back` that it did not start and the previous version runs again; `down` means
 *   the daemon is up in fatal mode, with its reason in `fatal`: never restarted for that, since only
 *   a change of its cause may end fatal mode (design 9.6)
 */
export async function ensureDaemon(ctx) {
    const target = await targetCode(ctx);
    const up = await upAnswer(ctx, target);
    if (up) return up;
    if (!takeLock(ctx)) {
        const { health, error } = await waitFor(ctx, (h) => ours(ctx, h) && h.codeHash === target.hash);
        if (!health) throw new Error(`another launcher is starting the daemon: ${error}`);
        return { url: daemonUrl(health), action: "other-launcher" };
    }
    try {
        return (await upAnswer(ctx, target)) ?? (await startOrUpgrade(ctx, target));
    } finally {
        releaseLock(ctx);
    }
}

/**
 * A daemon's URL from its /health answer.
 * @param {any} health the answer
 * @returns {string} the URL
 */
const daemonUrl = (health) => `http://127.0.0.1:${health.port}`;

/**
 * What ensureDaemon answers about a daemon that is up: `down` in fatal mode, `warm` on the current
 * code, and on older code what `olderCode` says. A daemon that is up but does not answer /health
 * within the wait is an error, never a restart.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the code the daemon should run
 * @returns {Promise<{url: string, action: "warm" | "down" | "gating" | "refused", fatal?: string} | null>}
 *   the answer, or null when the daemon is down or must be upgraded
 */
async function upAnswer(ctx, target) {
    if (daemonDown(ctx)) return null;
    const { health, error } = await waitFor(ctx, (h) => ours(ctx, h));
    if (!health) throw new Error(`the daemon is running but does not answer: ${error}`);
    if (health.codeHash !== target.hash) return olderCode(ctx, target, health);
    settleAdoption(ctx, health.codeHash);
    const url = daemonUrl(health);
    if (health.fatal) return { url, action: "down", fatal: health.fatal };
    return { url, action: "warm" };
}

/**
 * What ensureDaemon answers about a daemon up on older code (design 9.8). The default branch's
 * version runs only once its gates passed: until then the daemon keeps its version (`gating`), and
 * for good once they failed (`refused`). A daemon in fatal mode cannot gate its successor, so the
 * restarter starts its gates in the background, under the gate lock and never inside the restart
 * lock, and answers `down` at once. A version that passed is adopted at once: workers live in tmux,
 * not in the daemon, so a restart ends none of them.
 * @param {LauncherContext} ctx the context
 * @param {{branch: string, hash: string, version: string}} target the default branch's version
 * @param {any} health the daemon's /health answer
 * @returns {Promise<{url: string, action: "down" | "gating" | "refused", fatal?: string} | null>}
 *   the answer, or null when the daemon must be upgraded (or gated, outside the lock)
 */
async function olderCode(ctx, target, health) {
    const url = daemonUrl(health);
    const down = health.fatal ? { url, action: /** @type {const} */ ("down"), fatal: health.fatal } : null;
    const gate = updateGate(ctx.stateDir, target.hash);
    if (gate === "pending" && !down) return { url, action: "gating" };
    if (gate === "pending") {
        gateInBackground(ctx, target);
        return down;
    }
    if (gate === "refused") return down ?? { url, action: "refused" };
    return null;
}

/**
 * Starts the daemon, or restarts a running one on older code, and waits for it to answer. It runs
 * the default branch's version when that passed its gates (design 9.8), or when nothing was ever
 * installed (the first start does what `githerd install` does); otherwise the version `current`
 * names, whose daemon gates the new one. An adopted version that does not answer is rolled back. A
 * start that failed otherwise is not retried for 15 minutes, and pages once per code hash. Called
 * holding the restart lock.
 * @param {LauncherContext} ctx the context
 * @param {{hash: string, version: string, branch: string}} target the default branch's version
 * @returns {Promise<{url: string, action: "started" | "upgraded" | "rolled-back"}>} the daemon and
 *   what was done
 */
async function startOrUpgrade(ctx, target) {
    const installed = currentHash(ctx.stateDir);
    const takeTarget = !installed || updateGate(ctx.stateDir, target.hash) === "passed";
    const hash = takeTarget ? target.hash : installed;
    const failFile = join(ctx.stateDir, "start-failed.json");
    const failed = readJson(failFile);
    const failedBefore = failed?.codeHash === hash;
    if (failedBefore && ctx.now().getTime() - Date.parse(failed.at) < RESTART_EVERY_MS) {
        throw new Error(`${failed.reason} (at ${failed.at}; next try 15 minutes after that)`);
    }
    const action = daemonDown(ctx) ? "started" : "upgraded";
    const before = readLiveness(ctx.stateDir).lock;
    if (!installed) await prepareCode(ctx, target);
    else if (takeTarget && installed !== target.hash) await adopt(ctx, target);
    writeDaemonEnv(ctx.stateDir, ctx.env);
    const data = await servherd(ctx, startArgs(ctx), ctx.stateDir);
    // servherd keeps an unchanged server that is online: a daemon on older code, or a process that
    // is not answering as the daemon.
    if (data.action === "existing") await servherd(ctx, ["restart", ctx.name]);
    logLine(ctx, "info", `${action} ${ctx.name} at ${basename(/** @type {string} */ (currentDir(ctx.stateDir)))}`);
    const { health: up, error } = await waitFor(
        ctx,
        (h) => ours(ctx, h) && h.codeHash === hash && h.pid !== before?.pid,
    );
    if (!up) {
        const adopting = readSelfUpdate(ctx.stateDir).adopting;
        if (adopting?.hash === hash) return rollBack(ctx, adopting, `did not answer: ${error}`, before);
        return startFailed(ctx, { hash, error, failFile, failedBefore });
    }
    settleAdoption(ctx, hash);
    rmSync(failFile, { force: true });
    return { url: daemonUrl(up), action };
}

/**
 * Records a start that failed: a log line, `start-failed.json` (no retry for 15 minutes) and one
 * page per code hash.
 * @param {LauncherContext} ctx the context
 * @param {{hash: string, error: string | null, failFile: string, failedBefore: boolean}} failure the
 *   code that did not answer, why, the record file, and whether it failed before
 * @returns {Promise<never>} always rejects with the reason
 */
async function startFailed(ctx, { hash, error, failFile, failedBefore }) {
    const reason = `githerd daemon failed to start: ${error}`;
    logLine(ctx, "error", reason);
    const at = ctx.now().toISOString();
    writeFileSync(failFile, `${JSON.stringify({ codeHash: hash, at, reason })}\n`);
    if (!failedBefore) await page(ctx, reason);
    throw new Error(reason);
}

/** How much of a transcript's end is read for the owner's last typed message. */
const TRANSCRIPT_TAIL = 256 * 1024;

/**
 * When the owner last typed into a Claude session working in `cwd`: the newest typed user record of
 * the newest transcript in the project directory Claude Code keeps for that cwd (its path with
 * every character other than a letter or a digit made `-`). The heartbeat sends it, so typing into
 * an interactive session counts as presence (design 11.3).
 * ponytail: the newest transcript of the cwd, not this session's own (the launcher does not know
 * its session id); any session the owner types into in that directory is presence all the same.
 * @param {string} cwd the session's working directory
 * @param {string} home the home directory holding `.claude/projects`
 * @returns {string | null} the time, or null when there is no transcript or no typed record
 */
export function sessionTypedAt(cwd, home) {
    const dir = join(home, ".claude", "projects", cwd.replaceAll(/[^A-Za-z0-9]/g, "-"));
    let newest = null;
    try {
        for (const name of readdirSync(dir)) {
            if (!name.endsWith(".jsonl")) continue;
            const { mtimeMs, size } = statSync(join(dir, name));
            if (!newest || mtimeMs > newest.mtimeMs) newest = { path: join(dir, name), mtimeMs, size };
        }
        if (!newest) return null;
        return lastTypedAt(tail(newest.path));
    } catch {
        return null;
    }
}

/**
 * The newest prompt the owner typed into one session, from that session's own transcript (the
 * last 256 KiB), for `githerd_record` (owner.mjs).
 * @param {string} cwd the session's working directory
 * @param {string} home the home directory
 * @param {string} session the session id
 * @returns {{at: string, text: string} | null} the prompt, or null when none can be read
 */
export function transcriptTyped(cwd, home, session) {
    if (!/^[\w-]+$/.test(session)) return null;
    const path = join(home, ".claude", "projects", cwd.replaceAll(/[^A-Za-z0-9]/g, "-"), `${session}.jsonl`);
    try {
        return lastTyped(tail(path));
    } catch {
        return null;
    }
}

/**
 * The last `TRANSCRIPT_TAIL` bytes of a file.
 * @param {string} path the file
 * @returns {string} the text
 */
function tail(path) {
    const { size } = statSync(path);
    const length = Math.min(size, TRANSCRIPT_TAIL);
    const buf = Buffer.alloc(length);
    const fd = openSync(path, "r");
    try {
        readSync(fd, buf, 0, length, size - length);
    } finally {
        closeSync(fd);
    }
    return buf.toString("utf8");
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
    const { version } = readVersion();
    const serverInfo = { name: NAME, version };
    const found = launcherContext({ cwd, env, now, pkgDir, healthWaitMs });
    if (found.kind === "outside") return { ensured: null };

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
                upgradeWaiting = r.action === "gating";
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

    // The eleven tools of design section 6, answered at once for `tools/list`. A call is checked
    // against its schema here, then forwarded with this session's identity and the tool protocol.
    const home = env.HOME ?? homedir();
    const tools = forwardingTools(
        forward,
        () => identifySession({ ppid, env, home, stateDir: ctx.stateDir }),
        (meta) => (meta.session ? transcriptTyped(cwd, home, meta.session) : null),
    );
    const local = createMcpServer({ serverInfo, tools: () => tools });

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
        // A known daemon answers at once, even while a restarter works: one in fatal mode still
        // explains its state.
        let target = daemonUrl;
        if (!target) {
            /** @type {NodeJS.Timeout | undefined} */
            let timer;
            try {
                const timeout = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`no daemon after ${callWaitMs / 1000} s`)), callWaitMs);
                });
                target = await Promise.race([inflight ?? ensure(), timeout]);
            } catch (err) {
                return notReachable(err.message);
            } finally {
                clearTimeout(timer);
            }
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

    // Once a minute: a local look at `alive` and the daemon's lock decides a restart (design 9.4);
    // the heartbeat only tells the daemon this session lives.
    const beat = setInterval(async () => {
        if (upgradeWaiting || daemonDown(ctx)) {
            const jitter = randomInt(Math.floor(jitterMs) + 1);
            setTimeout(() => void ensure().catch(() => {}), jitter).unref();
            return;
        }
        try {
            const target = daemonUrl ?? (await ensure());
            await fetch(`${target}/heartbeat`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    session,
                    cwd,
                    branch: currentBranch(cwd),
                    typedAt: sessionTypedAt(cwd, env.HOME ?? homedir()),
                }),
                signal: AbortSignal.timeout(5000),
            });
        } catch {
            daemonUrl = null;
        }
    }, heartbeatMs);
    beat.unref();

    await lines(input, async (line) => {
        const reply = await local.handle(line);
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
    const out = execFileSync(
        "git", // NOSONAR(S4036): the owner's git from his own PATH, as tools/ runs it
        args,
        { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10_000 },
    );
    return out.trim();
}
