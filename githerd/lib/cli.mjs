/**
 * The githerd command line (design section 12). It finds the repository's daemon through
 * `daemon.json` in the state directory and talks to it over HTTP; the commands that only read
 * (`ledger`, `runs`, `run`) read the state directory directly, so they work while the daemon is
 * down.
 *
 * Exit codes: 0 done, 1 failed (daemon not reachable, nothing found, a doctor check failed), 2 a
 * usage error or a refused request.
 */

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { repoRoot } from "./config.mjs";
import { notifyCommandProblem } from "./daemon.mjs";
import { ensureDaemon, launcherContext, ours, pm2Options, probe, servherd, targetCode, waitFor } from "./launcher.mjs";
import { createNotifier } from "./notify.mjs";
import { sameProcess } from "./proc.mjs";
import { defaultStateDir, readLedger, STATE_SCHEMA } from "./store.mjs";
import { PACKAGE_DIR, readVersion } from "./version.mjs";

const USAGE = `usage: githerd <command>
  status [--json]                          the daemon's status text
  ledger [--since 1d] [--target pr:704] [--kind run-end]
                                           ledger entries, one JSON line each
  runs [--last 10]                         recent judgment runs
  run <id>                                 one run's record and files
  mode dry-run|paused|clear                lower the mode locally, or remove the override
  ack <key>                                clear an escalation
  veto <proposal id>                       stop a pending proposal
  ensure                                   find or start the daemon, then exit
  restart                                  servherd restart githerd
  dev                                      run this working tree as the githerd-dev daemon
  doctor [--send-test]                     check everything githerd depends on
  version                                  the version
Environment: GITHERD_CONFIG (config file), GITHERD_STATE_DIR (state directory; .githerd-dev for
the development daemon).`;

/** The signing check gives up after this long: a signer waiting for a passphrase never returns. */
const SIGN_TIMEOUT_MS = 10_000;
/** Every other command the doctor runs gives up after this long. */
const EXEC_TIMEOUT_MS = 60_000;
/** The servherd name of `githerd dev`, and its state directory in the worktree. */
const DEV_NAME = "githerd-dev";
const DEV_STATE = ".githerd-dev";
/** The commands that work on a repository. */
const COMMANDS = ["status", "ack", "veto", "ledger", "runs", "run", "mode", "ensure", "restart", "dev", "doctor"];
/** The modes `githerd mode` can set; raising to acting is a config change on the default branch. */
const LOWER_MODES = ["dry-run", "paused"];

/**
 * @typedef {object} CliOptions
 * @property {string} [cwd] where the command runs
 * @property {Record<string, string | undefined>} [env] the environment
 * @property {(line: string) => void} [out] standard output, one line per call
 * @property {(line: string) => void} [err] standard error, one line per call
 * @property {() => Date} [now] the clock
 * @property {number} [signTimeoutMs] the doctor's signing timeout
 * @property {number} [healthWaitMs] how long `ensure` and `dev` wait for a started daemon
 */

/**
 * Runs one command, without a shell, in its own process group so a timeout kills everything it
 * started (a signer that hangs is a grandchild of git).
 * @param {string[]} argv the command
 * @param {{cwd: string, env: Record<string, string | undefined>, timeoutMs?: number}} options where,
 *   with what environment, and how long before the group is killed
 * @returns {Promise<{code: number | null, stdout: string, stderr: string, timedOut: boolean,
 *   missing: boolean}>} the result; `missing` when the program does not exist
 */
function exec(argv, { cwd, env, timeoutMs = EXEC_TIMEOUT_MS }) {
    return new Promise((done) => {
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let finished = false;
        const child = spawn(argv[0], argv.slice(1), { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
        const timer = setTimeout(() => {
            timedOut = true;
            try {
                process.kill(-(/** @type {number} */ (child.pid)), "SIGKILL");
            } catch {
                // already gone
            }
        }, timeoutMs);
        const finish = (/** @type {number | null} */ code, missing = false) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            done({ code, stdout, stderr, timedOut, missing });
        };
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.on("error", (e) => {
            stderr += /** @type {Error} */ (e).message;
            finish(null, /** @type {any} */ (e).code === "ENOENT");
        });
        child.on("close", (code) => finish(code));
    });
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
 * Posts JSON to the daemon.
 * @param {number} port the daemon's port
 * @param {string} path the endpoint
 * @param {unknown} body the request
 * @returns {Promise<any>} the parsed answer
 */
async function post(port, path, body) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(EXEC_TIMEOUT_MS),
    });
    return res.json();
}

/**
 * Splits arguments into positionals and `--flag value` pairs (`--json` and `--send-test` take no
 * value).
 * @param {string[]} args the arguments after the command
 * @returns {{positional: string[], flags: Record<string, string | true>}} the parts
 */
function parseArgs(args) {
    /** @type {string[]} */
    const positional = [];
    /** @type {Record<string, string | true>} */
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (!a.startsWith("--")) positional.push(a);
        else if (a === "--json" || a === "--send-test") flags[a.slice(2)] = true;
        else flags[a.slice(2)] = args[++i] ?? "";
    }
    return { positional, flags };
}

/**
 * Parses `--since`: a duration back from now (`30m`, `12h`, `1d`) or a date.
 * @param {string} value the flag's value
 * @param {Date} now the current time
 * @returns {Date | null} the time, or null when unreadable
 */
export function parseSince(value, now) {
    const m = /^(\d+)([mhd])$/.exec(value);
    if (m) return new Date(now.getTime() - Number(m[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]);
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t);
}

/**
 * The environment of a live daemon process, read from /proc, so the doctor's signing check runs
 * the way the daemon would (pm2 starts it without the shell's GPG_TTY or agent variables).
 * @param {any} record `daemon.json`
 * @returns {Record<string, string> | null} its environment, or null when it is not running
 */
function daemonEnv(record) {
    if (!record || !Number.isInteger(record.pid) || !sameProcess(record)) return null;
    try {
        const text = readFileSync(`/proc/${record.pid}/environ`, "utf8");
        return Object.fromEntries(
            text
                .split("\0")
                .filter(Boolean)
                .map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]),
        );
    } catch {
        return null;
    }
}

/**
 * Runs the githerd command line.
 * @param {string[]} argv the arguments after `githerd`
 * @param {CliOptions} [options] where and how
 * @returns {Promise<number>} the exit code
 */
export async function runCli(argv, options = {}) {
    const {
        cwd = process.cwd(),
        env = process.env,
        out = (line) => process.stdout.write(`${line}\n`),
        err = (line) => process.stderr.write(`${line}\n`),
        now = () => new Date(),
        signTimeoutMs = SIGN_TIMEOUT_MS,
        healthWaitMs,
    } = options;
    const [command, ...rest] = argv;
    const { positional, flags } = parseArgs(rest);

    if (command === "version" || command === "--version") {
        const { version, codeHash } = readVersion();
        out(codeHash ? `${version} ${codeHash}` : version);
        return 0;
    }
    if (!command || command === "help" || command === "--help") {
        (command ? out : err)(USAGE);
        return command ? 0 : 2;
    }

    if (!COMMANDS.includes(command)) {
        err(USAGE);
        return 2;
    }
    let root;
    try {
        root = repoRoot(cwd);
    } catch (e) {
        err(`githerd: ${/** @type {Error} */ (e).message}`);
        return 2;
    }
    const stateDir = env.GITHERD_STATE_DIR ? resolve(cwd, env.GITHERD_STATE_DIR) : defaultStateDir(root, env.HOME);
    const ctxOptions = { cwd, env, now, stateDir, ...(healthWaitMs ? { healthWaitMs } : {}) };

    /**
     * The daemon's port, or null after saying why there is none.
     * @returns {Promise<number | null>} the port
     */
    const daemonPort = async () => {
        const { record, health, error } = await probe(/** @type {any} */ ({ stateDir }));
        if (health) return record.port;
        err(`githerd daemon not reachable: ${error}; run githerd ensure`);
        return null;
    };

    switch (command) {
        case "status": {
            const port = await daemonPort();
            if (port === null) return 1;
            const reply = await post(port, "/rpc", {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "githerd_status", arguments: flags.json ? { format: "json" } : {} },
            });
            const text = reply.result?.content?.[0]?.text ?? reply.error?.message ?? JSON.stringify(reply);
            (reply.result?.isError || reply.error ? err : out)(text);
            return reply.result?.isError || reply.error ? 1 : 0;
        }

        case "ack":
        case "veto": {
            const [target] = positional;
            if (!target) {
                err(`usage: githerd ${command} <${command === "ack" ? "key" : "proposal id"}>`);
                return 2;
            }
            const port = await daemonPort();
            if (port === null) return 1;
            const answer = await post(
                port,
                "/owner",
                command === "ack" ? { op: "ack", key: target } : { op: "veto", id: target },
            );
            (answer.ok ? out : err)(answer.text ?? answer.error);
            return answer.ok ? 0 : 1;
        }

        case "ledger": {
            let since;
            if (typeof flags.since === "string") {
                since = parseSince(flags.since, now());
                if (!since) {
                    err(`githerd ledger: --since takes 30m, 12h, 1d or a date, not "${flags.since}"`);
                    return 2;
                }
            }
            const entries = (await readLedger(stateDir, since ? { since } : {})).filter(
                (e) =>
                    (!flags.kind || e.kind === flags.kind) &&
                    (!flags.target ||
                        e.target === flags.target ||
                        (Array.isArray(e.targets) && e.targets.includes(flags.target))),
            );
            for (const e of entries) out(JSON.stringify(e));
            return 0;
        }

        case "runs": {
            const last = Number(flags.last ?? 10);
            if (!Number.isInteger(last) || last < 1) {
                err("githerd runs: --last takes a positive number");
                return 2;
            }
            const state = readJson(join(stateDir, "state.json")) ?? readJson(join(stateDir, "state.json.bak"));
            const runs = Object.entries(state?.runs ?? {})
                .sort(([, a], [, b]) => String(b.startedAt ?? "").localeCompare(String(a.startedAt ?? "")))
                .slice(0, last);
            if (runs.length === 0) out("no runs");
            for (const [id, r] of runs) {
                const cost = typeof r.cost === "number" ? `$${r.cost.toFixed(2)}` : "-";
                out([id, r.status ?? "-", r.kind ?? "-", r.target ?? "-", r.startedAt ?? "-", cost].join(" "));
            }
            return 0;
        }

        case "run": {
            const [id] = positional;
            if (!id || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
                err("usage: githerd run <id>");
                return 2;
            }
            const state = readJson(join(stateDir, "state.json")) ?? readJson(join(stateDir, "state.json.bak"));
            const record = state?.runs?.[id];
            const dir = join(stateDir, "runs", id);
            if (!record && !existsSync(dir)) {
                err(`no run ${id}`);
                return 1;
            }
            out(JSON.stringify({ id, ...record }, null, 2));
            if (existsSync(dir)) {
                out(`files in ${dir}: ${readdirSync(dir).sort().join(" ")}`);
                const result = join(dir, "result.json");
                if (existsSync(result)) out(`result.json: ${readFileSync(result, "utf8").trim()}`);
            }
            return 0;
        }

        case "mode": {
            const [mode] = positional;
            const file = join(stateDir, "override.json");
            if (mode === "acting") {
                err(
                    "githerd mode acting is refused: the mode is raised only by a githerd.config.json change merged to the default branch",
                );
                return 2;
            }
            if (mode === "clear") {
                rmSync(file, { force: true });
                out("mode override removed: githerd runs in the config's mode");
                return 0;
            }
            if (!LOWER_MODES.includes(mode)) {
                err("usage: githerd mode dry-run|paused|clear");
                return 2;
            }
            mkdirSync(stateDir, { recursive: true });
            writeFileSync(file, `${JSON.stringify({ mode, at: now().toISOString() })}\n`);
            out(`mode override: ${mode} (it can only lower the config's mode; githerd mode clear removes it)`);
            return 0;
        }

        case "ensure":
        case "restart":
        case "dev":
        case "doctor": {
            const dev = command === "dev";
            if (dev && !env.GITHERD_CONFIG) {
                err("githerd dev needs GITHERD_CONFIG: the development daemon never reads the default branch's config");
                return 2;
            }
            const devState = dev ? join(worktreeTop(cwd), DEV_STATE) : stateDir;
            const found = launcherContext({
                ...ctxOptions,
                ...(dev ? { name: DEV_NAME, stateDir: devState } : {}),
            });
            if (command === "doctor")
                return doctor(found, { ctxOptions, env, out, now, signTimeoutMs, sendTest: !!flags["send-test"] });
            if (found.kind === "outside") return 2;
            if (found.kind === "unconfigured") {
                err(found.reason);
                return 1;
            }
            const { ctx, problem } = found;
            if (problem) {
                err(`githerd: config: ${problem}`);
                return 1;
            }
            try {
                if (command === "ensure") {
                    const r = await ensureDaemon(ctx);
                    out(`${r.action} ${r.url}`);
                } else if (command === "restart") {
                    await servherd(ctx, ["restart", ctx.name]);
                    out(`restarted ${ctx.name}`);
                } else {
                    const before = (await probe(ctx)).record;
                    const data = await servherd(ctx, [
                        "start",
                        "-n",
                        DEV_NAME,
                        "-e",
                        "PORT={{port}}",
                        "-e",
                        `GITHERD_CONFIG=${resolve(cwd, /** @type {string} */ (env.GITHERD_CONFIG))}`,
                        "-e",
                        `GITHERD_STATE_DIR=${devState}`,
                        "-e",
                        "GITHERD_DEV=1",
                        ...(env.GITHERD_DEV_NOTIFY === "1" ? ["-e", "GITHERD_DEV_NOTIFY=1"] : []),
                        "--",
                        "node",
                        join(PACKAGE_DIR, "bin", "githerd-daemon.mjs"),
                    ]);
                    const { health, error } = await waitFor(
                        ctx,
                        (h) => ours(ctx, h) && (data.action === "existing" || h.pid !== before?.pid),
                    );
                    if (!health) throw new Error(`${DEV_NAME} did not answer: ${error}`);
                    out(
                        `${DEV_NAME} ${data.action} at http://127.0.0.1:${health.port} (${health.mode}); state in ${devState}`,
                    );
                    out(`use it with GITHERD_STATE_DIR=${devState} githerd status`);
                }
                return 0;
            } catch (e) {
                err(`githerd ${command}: ${/** @type {Error} */ (e).message}`);
                return 1;
            }
        }

        default:
            return 2;
    }
}

/**
 * The top of the work tree holding `cwd`.
 * @param {string} cwd a directory inside it
 * @returns {string} the top
 */
function worktreeTop(cwd) {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" }).trim();
}

/**
 * Runs the checks of design section 12 and prints one line per check: `ok`, `warn` or `FAIL`.
 * @param {ReturnType<typeof launcherContext>} found the launcher's view of the repository
 * @param {{ctxOptions: Parameters<typeof launcherContext>[0], env: Record<string, string | undefined>,
 *   out: (line: string) => void, now: () => Date, signTimeoutMs: number, sendTest: boolean}} options
 *   how to run
 * @returns {Promise<number>} 1 when any check failed, else 0
 */
async function doctor(found, { ctxOptions, env, out, now, signTimeoutMs, sendTest }) {
    let failed = false;
    const report = (
        /** @type {"ok" | "warn" | "FAIL"} */ level,
        /** @type {string} */ name,
        /** @type {string} */ text,
    ) => {
        if (level === "FAIL") failed = true;
        out(`${level.padEnd(4)} ${name}: ${text}`);
    };
    const first = (/** @type {string} */ text) => text.trim().split("\n")[0] || "no output";

    // config
    if (found.kind === "outside") return 2;
    const root = found.kind === "ready" ? found.ctx.root : found.root;
    const ctx = found.kind === "ready" ? found.ctx : null;
    if (found.kind === "unconfigured") report("FAIL", "config", `${found.reason}; nothing starts until it is`);
    else if (found.kind === "ready" && found.problem) report("FAIL", "config", found.problem);
    else report("ok", "config", `${ctx?.config?.repo}, mode ${ctx?.config?.mode}`);
    const opts = { cwd: root, env };

    // gh auth and scopes
    const auth = await exec(["gh", "auth", "status"], opts);
    const ghPresent = !auth.missing;
    if (auth.missing) report("FAIL", "gh", "gh not found on PATH: githerd reads GitHub through gh");
    else if (auth.code !== 0) report("FAIL", "gh", `not logged in: ${first(auth.stderr + auth.stdout)}`);
    else {
        const scopes = /Token scopes:\s*(.*)/.exec(auth.stderr + auth.stdout)?.[1]?.trim();
        if (!scopes) report("warn", "gh", "logged in; token scopes not shown");
        else if (!/'repo'/.test(scopes)) report("FAIL", "gh", `the token lacks the repo scope (has ${scopes})`);
        else report("ok", "gh", `logged in, scopes ${scopes}`);
    }

    // servherd, the daemon, supervision and the notify command: only for a configured repository
    const record = ctx ? await serviceChecks(ctx, { env, now, sendTest, report, first }) : null;

    // a signed commit, in the daemon's environment when it is running
    const fromDaemon = daemonEnv(record);
    const signEnv = { ...(fromDaemon ?? env), GIT_TERMINAL_PROMPT: "0" };
    const where = fromDaemon ? "the daemon's environment" : "this shell's environment (no daemon running)";
    const tree = await exec(["git", "hash-object", "-t", "tree", "/dev/null"], { cwd: root, env: signEnv });
    const sign = await exec(["git", "commit-tree", "-S", "-m", "githerd doctor signing check", tree.stdout.trim()], {
        cwd: root,
        env: signEnv,
        timeoutMs: signTimeoutMs,
    });
    if (sign.timedOut) {
        report(
            "FAIL",
            "signing",
            `git commit-tree -S did not finish within ${signTimeoutMs / 1000} s in ${where}: the signer is waiting for a passphrase or pinentry`,
        );
    } else if (sign.code !== 0)
        report("FAIL", "signing", `git commit-tree -S failed in ${where}: ${first(sign.stderr)}`);
    else report("ok", "signing", `signed commit in ${where}`);

    // the state file
    const stateFile = join(ctx?.stateDir ?? /** @type {string} */ (ctxOptions?.stateDir), "state.json");
    if (!existsSync(stateFile)) report("warn", "state", `no ${stateFile} yet`);
    else {
        const saved = readJson(stateFile);
        if (!saved) report("FAIL", "state", `${stateFile} is unreadable; the daemon falls back to state.json.bak`);
        else if (saved.schema > STATE_SCHEMA) {
            report("FAIL", "state", `schema ${saved.schema} is newer than this githerd's ${STATE_SCHEMA}`);
        } else report("ok", "state", `schema ${saved.schema}`);
    }

    // a deploy key's private half in ~/.ssh
    if (ghPresent && ctx?.config?.repo) await deployKeyCheck(ctx.config.repo, { root, env, report });
    return failed ? 1 : 0;
}

/**
 * The doctor's checks of a configured repository: servherd answers, the daemon runs the default
 * branch's code, pm2 restarts it on a crash, and the notify command can run.
 * @param {import("./launcher.mjs").LauncherContext} ctx the launcher's context
 * @param {{env: Record<string, string | undefined>, now: () => Date, sendTest: boolean,
 *   report: (level: "ok" | "warn" | "FAIL", name: string, text: string) => void,
 *   first: (text: string) => string}} options how to run and report
 * @returns {Promise<any>} `daemon.json`, or null
 */
async function serviceChecks(ctx, { env, now, sendTest, report, first }) {
    const opts = { cwd: ctx.root, env };
    // servherd
    const list = await exec([...ctx.servherd, "--json", "list"], opts);
    /** @type {any} */
    let servers = null;
    try {
        const parsed = JSON.parse(list.stdout.slice(list.stdout.indexOf("{")));
        if (parsed.success) servers = parsed.data.servers;
    } catch {
        // reported below
    }
    if (!servers) report("FAIL", "servherd", `not reachable: ${first(list.stderr || list.stdout)}`);
    else {
        const entry = servers.find((/** @type {any} */ s) => s.server?.name === ctx.name);
        report("ok", "servherd", `${servers.length} servers; ${ctx.name} ${entry ? entry.status : "not registered"}`);
    }

    // the daemon and its code
    const { record, health, error } = await probe(ctx);
    if (!health) report("FAIL", "daemon", `not reachable: ${error}; run githerd ensure`);
    else {
        let target = null;
        try {
            target = await targetCode(ctx);
        } catch (e) {
            report("warn", "code", /** @type {Error} */ (e).message);
        }
        const running = `daemon pid ${health.pid}, mode ${health.mode}, code ${String(health.codeHash).slice(0, 8)}`;
        if (!target) report("ok", "daemon", running);
        else if (health.codeHash === target.hash) report("ok", "daemon", `${running}, same as origin/${target.branch}`);
        else {
            report(
                "warn",
                "daemon",
                `${running}; origin/${target.branch} has ${target.hash.slice(0, 8)}, and the next launcher start upgrades it`,
            );
        }
    }

    // supervision: pm2 autorestart on the daemon's process
    const pm2Name = `servherd-${ctx.name}`;
    const jlist = await exec([...ctx.pm2, "jlist"], pm2Options(ctx));
    let apps = null;
    try {
        apps = JSON.parse(jlist.stdout.slice(jlist.stdout.indexOf("[")));
    } catch {
        // reported below
    }
    const app = apps?.find((/** @type {any} */ a) => a.name === pm2Name);
    if (!apps) report("FAIL", "supervision", `cannot list pm2 processes: ${first(jlist.stderr || jlist.stdout)}`);
    else if (!app) report("FAIL", "supervision", `no pm2 process ${pm2Name}; run githerd ensure`);
    else if (app.pm2_env?.autorestart !== true) {
        report(
            "FAIL",
            "supervision",
            `pm2 autorestart is off for ${pm2Name}: a crash stays down until a session opens`,
        );
    } else report("ok", "supervision", `pm2 autorestart on for ${pm2Name} (${app.pm2_env.status})`);

    // the notify command
    const notify = ctx.config?.notify ?? { command: null, maxPerHour: 6 };
    const problem = notifyCommandProblem(notify.command, env);
    if (notify.command === null) report("warn", "notify", "notify.command is null: pages only go to the ledger");
    else if (problem) report("FAIL", "notify", problem);
    else if (!sendTest) report("ok", "notify", `${notify.command[0]} is executable (--send-test sends a page)`);
    else {
        /** @type {any} */
        const state = {};
        const notifier = createNotifier({ notify, state, ledger: () => {}, now });
        notifier.send({ key: "doctor-test", status: "info", message: "githerd doctor: test page", bypass: true });
        await notifier.flush();
        if (state.notify.lastError) report("FAIL", "notify", `the test page failed: ${state.notify.lastError}`);
        else report("ok", "notify", "test page sent");
    }

    return record;
}

/**
 * Warns when a private key in `~/.ssh` belongs to one of the repository's deploy keys: the
 * release deploy key bypasses every ruleset (design section 14).
 * @param {string} repo `owner/name`
 * @param {{root: string, env: Record<string, string | undefined>,
 *   report: (level: "ok" | "warn" | "FAIL", name: string, text: string) => void}} options where to
 *   run and how to report
 */
async function deployKeyCheck(repo, { root, env, report }) {
    const res = await exec(["gh", "api", `repos/${repo}/keys`], { cwd: root, env });
    /** @type {any[] | null} */
    let keys = null;
    try {
        keys = JSON.parse(res.stdout);
    } catch {
        // reported below
    }
    if (res.code !== 0 || !Array.isArray(keys)) {
        report("warn", "deploy keys", `cannot list ${repo}'s deploy keys: ${res.stderr.trim().split("\n")[0]}`);
        return;
    }
    const blob = (/** @type {string} */ pub) => pub.trim().split(/\s+/)[1];
    const deploy = new Map(keys.map((k) => [blob(k.key), k.title]));
    const ssh = join(env.HOME ?? homedir(), ".ssh");
    let names = [];
    try {
        names = readdirSync(ssh);
    } catch {
        // no ~/.ssh
    }
    for (const name of names) {
        const file = join(ssh, name);
        let text;
        try {
            text = readFileSync(file, "utf8");
        } catch {
            continue;
        }
        if (!text.includes("PRIVATE KEY")) continue;
        let pub = readText(`${file}.pub`);
        if (pub === null) {
            const derived = await exec(["ssh-keygen", "-y", "-P", "", "-f", file], {
                cwd: root,
                env,
                timeoutMs: 10_000,
            });
            pub = derived.code === 0 ? derived.stdout : null;
        }
        if (pub !== null && deploy.has(blob(pub))) {
            report(
                "warn",
                "deploy keys",
                `${file} is the private key of deploy key "${deploy.get(blob(pub))}", which bypasses the master ruleset`,
            );
            return;
        }
    }
    report("ok", "deploy keys", `no private key in ${ssh} matches one of ${keys.length} deploy keys`);
}

/**
 * Reads a text file.
 * @param {string} path the file
 * @returns {string | null} its text, or null when missing
 */
function readText(path) {
    try {
        return readFileSync(path, "utf8");
    } catch {
        return null;
    }
}
