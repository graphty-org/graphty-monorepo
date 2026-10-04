/**
 * The launcher (design section 3.1): the stdio MCP server Claude Code starts from `.mcp.json`. It
 * answers `initialize` and `tools/list` at once from a static tool list, finds or starts the one
 * daemon of the repository in the background (`ensureDaemon`), and forwards every `tools/call` to
 * that daemon over HTTP. stdout carries JSON-RPC lines only; anything else goes to stderr.
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
import { randomBytes } from "node:crypto";
import {
    appendFileSync,
    mkdirSync,
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
import { createMcpServer } from "./mcp.mjs";
import { createNotifier } from "./notify.mjs";
import { identify, sameProcess } from "./proc.mjs";
import { defaultStateDir, readLiveness } from "./store.mjs";
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
 * Takes the restart lock: `mkdir`, then owner.json with this process's identity. A stale lock (its
 * owner is gone, or it has no owner.json and is older than 60 s) is removed only by the holder of
 * `restart.lock.steal`, which judges it again first: renaming a lock judged stale a moment ago could
 * remove a fresh lock another launcher took in between, and then two launchers would start.
 * @param {LauncherContext} ctx the context
 * @returns {boolean} true when this launcher holds the lock
 */
function takeLock(ctx) {
    const lock = join(ctx.stateDir, "restart.lock");
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
 * Releases the restart lock.
 * @param {LauncherContext} ctx the context
 */
function releaseLock(ctx) {
    rmSync(join(ctx.stateDir, "restart.lock"), { recursive: true, force: true });
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
            throw new Error("this servherd has no --autorestart option; githerd needs a servherd release that has it");
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

/**
 * Writes `daemon-env.json` (owner-only) from the allow-listed variables of `env`: when it is
 * missing, or always with `replace` (`githerd install`). A start from a worker, whose environment
 * lacks the notify keys, never overwrites the file the owner's shell wrote.
 * @param {string} stateDir the state directory
 * @param {Record<string, string | undefined>} env the environment to copy from
 * @param {{replace?: boolean}} [options] overwrite an existing file
 */
export function writeDaemonEnv(stateDir, env, { replace = false } = {}) {
    const file = join(stateDir, DAEMON_ENV_FILE);
    if (!replace && readJson(file)) return;
    const kept = Object.fromEntries(Object.entries(env).filter(([k, v]) => typeof v === "string" && keptForDaemon(k)));
    mkdirSync(stateDir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(kept, null, 2)}\n`, { mode: 0o600 });
    renameSync(tmp, file);
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
 * The servherd arguments that start the daemon. They are the same from every start path, and so is
 * the working directory (`servherd(ctx, startArgs(ctx), ctx.stateDir)`), so servherd always finds
 * its one entry: a second working directory or a changed command would make a second server, or
 * restart the first.
 * @param {LauncherContext} ctx the context
 * @returns {string[]} the arguments after servherd's `--json`
 */
function startArgs(ctx) {
    const config = ctx.env.GITHERD_CONFIG ? [`GITHERD_CONFIG=${ctx.env.GITHERD_CONFIG}`] : [];
    return [
        "start",
        "-n",
        ctx.name,
        "--autorestart",
        "--",
        "env",
        "-i",
        `GITHERD_ROOT=${ctx.root}`,
        `GITHERD_STATE_DIR=${ctx.stateDir}`,
        ...config,
        "PORT={{port}}",
        "node",
        join(ctx.stateDir, "current", "bin", "githerd-daemon.mjs"),
    ];
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
    const dir = await materialize(ctx, target);
    const link = join(ctx.stateDir, "current");
    const tmp = `${link}.${process.pid}.tmp`;
    rmSync(tmp, { force: true });
    symlinkSync(join("versions", basename(dir)), tmp);
    renameSync(tmp, link);
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
 * @returns {Promise<{url: string, action: "warm" | "down" | "waiting" | "started" | "upgraded" | "other-launcher" | "run",
 *   fatal?: string}>} the daemon's URL and what was done; `waiting` means an upgrade waits for runs
 *   in flight; `down` means the daemon is up in fatal mode, with its reason in `fatal`: never
 *   restarted for that, since only a change of its cause may end fatal mode (design 9.6)
 */
export async function ensureDaemon(ctx) {
    if (ctx.env.GITHERD_URL) return { url: ctx.env.GITHERD_URL, action: "run" };
    const target = await targetCode(ctx);
    const up = await upAnswer(ctx, target, true);
    if (up) return up;
    if (!takeLock(ctx)) {
        const { health, error } = await waitFor(ctx, (h) => ours(ctx, h) && h.codeHash === target.hash);
        if (!health) throw new Error(`another launcher is starting the daemon: ${error}`);
        return { url: daemonUrl(health), action: "other-launcher" };
    }
    try {
        return (await upAnswer(ctx, target, false)) ?? (await startOrUpgrade(ctx, target));
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
 * code, `waiting` on older code with runs in flight (only outside the restart lock). A daemon that
 * is up but does not answer /health within the wait is an error, never a restart.
 * @param {LauncherContext} ctx the context
 * @param {{hash: string}} target the code the daemon should run
 * @param {boolean} mayWait whether an upgrade may wait for runs in flight
 * @returns {Promise<{url: string, action: "warm" | "down" | "waiting", fatal?: string} | null>} the
 *   answer, or null when the daemon is down or must be upgraded
 */
async function upAnswer(ctx, target, mayWait) {
    if (daemonDown(ctx)) return null;
    const { health, error } = await waitFor(ctx, (h) => ours(ctx, h));
    if (!health) throw new Error(`the daemon is running but does not answer: ${error}`);
    const url = daemonUrl(health);
    if (health.codeHash !== target.hash) return mayWait && health.runsInFlight > 0 ? { url, action: "waiting" } : null;
    if (health.fatal) return { url, action: "down", fatal: health.fatal };
    return { url, action: "warm" };
}

/**
 * Starts the daemon on the target code, or restarts a running one on older code, and waits for it
 * to answer. A start that failed is not retried for 15 minutes, and pages once per code hash.
 * Called holding the restart lock.
 * @param {LauncherContext} ctx the context
 * @param {{hash: string, version: string, branch: string}} target the code to run
 * @returns {Promise<{url: string, action: "started" | "upgraded"}>} the daemon and what was done
 */
async function startOrUpgrade(ctx, target) {
    const failFile = join(ctx.stateDir, "start-failed.json");
    const failed = readJson(failFile);
    const failedBefore = failed?.codeHash === target.hash;
    if (failedBefore && ctx.now().getTime() - Date.parse(failed.at) < RESTART_EVERY_MS) {
        throw new Error(`${failed.reason} (at ${failed.at}; next try 15 minutes after that)`);
    }
    const action = daemonDown(ctx) ? "started" : "upgraded";
    const before = readLiveness(ctx.stateDir).lock;
    await prepareCode(ctx, target);
    writeDaemonEnv(ctx.stateDir, ctx.env);
    const data = await servherd(ctx, startArgs(ctx), ctx.stateDir);
    // servherd keeps an unchanged server that is online: a daemon on older code, or a process that
    // is not answering as the daemon.
    if (data.action === "existing") await servherd(ctx, ["restart", ctx.name]);
    logLine(ctx, "info", `${action} ${ctx.name} at ${target.version}-${target.hash.slice(0, 8)}`);
    const { health: up, error } = await waitFor(
        ctx,
        (h) => ours(ctx, h) && h.codeHash === target.hash && h.pid !== before?.pid,
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
    return { url: daemonUrl(up), action };
}

/**
 * The static tools a session sees before the daemon answers: the seven session tools' names,
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
    const { version } = readVersion();
    const serverInfo = { name: NAME, version };
    if (env.GITHERD_URL) {
        await forwardRun({ input, write, env, serverInfo, session: `${basename(worktreeTop(cwd) ?? cwd)}-${ppid}` });
        return { ensured: null };
    }
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

    // Once a minute: a local look at `alive` and the daemon's lock decides a restart (design 9.4);
    // the heartbeat only tells the daemon this session lives.
    const beat = setInterval(async () => {
        if (upgradeWaiting || daemonDown(ctx)) {
            const jitter = Math.random() * jitterMs; // NOSONAR(S2245): spreads restarts; not a secret
            setTimeout(() => void ensure().catch(() => {}), jitter).unref();
            return;
        }
        try {
            const target = daemonUrl ?? (await ensure());
            await fetch(`${target}/heartbeat`, {
                method: "POST",
                headers,
                body: JSON.stringify({ session, cwd, branch: currentBranch(cwd) }),
                signal: AbortSignal.timeout(5000),
            });
        } catch {
            daemonUrl = null;
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
 * A judgment run's launcher: it talks only to the daemon that started the run. The run's tools
 * depend on its kind and token, so `tools/list` goes to the daemon as well as `tools/call`; no
 * config, servherd or heartbeat is involved.
 * @param {object} options the streams, the environment, the server info and the session name
 * @param {NodeJS.ReadableStream} options.input JSON-RPC lines from the client
 * @param {(line: string) => void} options.write writes one line to the client
 * @param {Record<string, string | undefined>} options.env `GITHERD_URL` and `GITHERD_RUN_TOKEN`
 * @param {{name: string, version: string}} options.serverInfo answered to `initialize`
 * @param {string} options.session the `x-githerd-session` header
 * @returns {Promise<void>} resolves when the input ends
 */
async function forwardRun({ input, write, env, serverInfo, session }) {
    const local = createMcpServer({ serverInfo, tools: () => [] });
    const headers = {
        "content-type": "application/json",
        "x-githerd-session": session,
        ...(env.GITHERD_RUN_TOKEN ? { authorization: `Bearer ${env.GITHERD_RUN_TOKEN}` } : {}),
    };
    await lines(input, async (line) => {
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            msg = null;
        }
        const remote = (msg?.method === "tools/list" || msg?.method === "tools/call") && Object.hasOwn(msg, "id");
        let reply;
        if (!remote) reply = await local.handle(line);
        else {
            try {
                const res = await fetch(`${env.GITHERD_URL}/rpc`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(msg),
                    signal: AbortSignal.timeout(CALL_WAIT_MS),
                });
                reply = await res.json();
            } catch (err) {
                const reason = /** @type {any} */ (err).cause?.code ?? /** @type {Error} */ (err).message;
                reply = {
                    jsonrpc: "2.0",
                    id: msg.id,
                    error: { code: -32603, message: `githerd daemon not reachable: ${reason}` },
                };
            }
        }
        if (reply) write(JSON.stringify(reply));
    });
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
