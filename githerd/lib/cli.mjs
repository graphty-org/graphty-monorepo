/**
 * The githerd command line (design section 11.2). It finds the repository's daemon through
 * `daemon.json` in the state directory and talks to it over HTTP; the commands that only read
 * (`status` and `board` when no daemon answers, `why`, `mode`, `ledger`) read the
 * state directory directly, so they work while the daemon is down.
 *
 * Exit codes: 0 done, 1 failed (daemon not reachable, nothing found, a doctor check failed), 2 a
 * usage error or a refused request.
 */

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { groupModes, modeText, renderBoard, whyText } from "./board-text.mjs";
import { originHead, repoRoot } from "./config.mjs";
import { notifyCommandProblem } from "./daemon.mjs";
import {
    daemonStartArgs,
    ensureDaemon,
    installCommand,
    launcherContext,
    loadDaemonEnv,
    ours,
    pm2Options,
    prepareCode,
    probe,
    servherd,
    targetCode,
    waitFor,
    writeDaemonEnv,
} from "./launcher.mjs";
import { UNCHECKED_STOPS } from "./hook.mjs";
import { TOOL_PROTOCOL } from "./mcp.mjs";
import { createNotifier } from "./notify.mjs";
import { pushQueueTickets, sameProcess } from "./proc.mjs";
import { runSelftest, selftestText } from "./selftest.mjs";
import { defaultStateDir, readLedger, readLiveness, replayLedger, STATE_SCHEMA } from "./store.mjs";
import { PACKAGE_DIR, readVersion } from "./version.mjs";
import { readSigningEnv } from "./worker-settings.mjs";

const USAGE = `usage: githerd <command>
  status [section] [--json]                the board; read from state.json when the daemon is down
  board                                    the board, redrawn when the state file changes
  why <item>                               the records and ledger lines that put an item in its state
  mode                                     each write group's mode and its ledger coverage
  ledger [--since 1d] [--target pr:704] [--kind error,fatal]
                                           ledger entries, one JSON line each
  mode dry-run|paused|clear                lower the mode locally, or remove the override
  ack <key>                                clear an escalation
  veto <issue:N|pr:N>                      never let githerd close this issue or pull request
  answer <item> <words>                    answer an owner item ("not yet" keeps it open)
  order <N...> <words>                     record an order: these issues, in this order
  policy [freeze-merges | park-gate <lane> | hold-package <name>] <words>
                                           record a policy: a switch, or free text for every worker
  policy end <id>                          end a policy
  attach                                   attach to githerd's tmux server, one window per worker
  pause | resume                           stop / restart every worker start and doorbell
  workers <n> | workers --stop             set the working sessions (0 keeps only the urgent slot);
                                           --stop ends every worker without charging an attempt
  keep <window> [--with-job]               hand a worker's window to you; the job continues in a
                                           new window, or goes with it
  release <job>                            give githerd back a job you stopped or kept
  install                                  prepare the daemon's code and environment, and print
                                           the servherd command that starts it
  ensure                                   find or start the daemon, then exit
  restart                                  servherd restart githerd
  dev [--stop]                             run this working tree as the githerd-dev daemon; --stop
                                           stops it and removes it from servherd
  doctor [--send-test]                     check everything githerd depends on
  selftest                                 run the platform self-test: one worker on its own tmux
                                           server, through every behavior githerd relies on
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
/** The modes `githerd mode` can set; raising to acting is a config change on the default branch. */
const LOWER_MODES = new Set(["dry-run", "paused"]);

/**
 * @typedef {object} CliOptions
 * @property {string} [cwd] where the command runs
 * @property {Record<string, string | undefined>} [env] the environment
 * @property {(line: string) => void} [out] standard output, one line per call
 * @property {(line: string) => void} [err] standard error, one line per call
 * @property {() => Date} [now] the clock
 * @property {number} [signTimeoutMs] the doctor's signing timeout
 * @property {number} [healthWaitMs] how long `ensure` and `dev` wait for a started daemon
 * @property {AbortSignal} [signal] ends `githerd board` (otherwise SIGINT does)
 * @property {typeof runSelftest} [selftest] runs the self-test (tests replace it)
 * @property {boolean} [tty] a person's terminal is attached; default whether standard input is one
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
 * Who runs this command, for the daemon's presence record (design 11.3): `agent` inside Claude
 * Code (any `CLAUDECODE` or `CLAUDE_*` variable in the environment), else `owner`. A worker also
 * names its job (`GITHERD_JOB`), so the daemon refuses it the owner's commands. `x-githerd-tty`
 * says a person's terminal is attached: the daemon takes the owner's words (answer, order, policy,
 * veto, ack) only from his own terminal, never from an agent's Bash tool.
 * @param {Record<string, string | undefined>} env the environment
 * @param {boolean} tty a person's terminal is attached
 * @returns {Record<string, string>} the headers
 */
function callerHeader(env, tty) {
    const agent = Object.keys(env).some((k) => k === "CLAUDECODE" || k.startsWith("CLAUDE_"));
    return {
        "x-githerd-caller": agent ? "agent" : "owner",
        ...(tty && !agent ? { "x-githerd-tty": "1" } : {}),
        ...(env.GITHERD_JOB ? { "x-githerd-job": env.GITHERD_JOB } : {}),
    };
}

/**
 * Posts JSON to the daemon.
 * @param {number} port the daemon's port
 * @param {string} path the endpoint
 * @param {unknown} body the request
 * @param {Record<string, string>} [headers] extra headers: the caller, for an owner command
 * @returns {Promise<any>} the parsed answer
 */
async function post(port, path, body, headers = {}) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(EXEC_TIMEOUT_MS),
    });
    return res.json();
}

/**
 * Splits arguments into positionals and `--flag value` pairs (`--json`, `--send-test`, `--stop` and
 * `--with-job` take no value).
 * @param {string[]} args the arguments after the command
 * @returns {{positional: string[], flags: Record<string, string | true>}} the parts
 */
function parseArgs(args) {
    /** @type {string[]} */
    const positional = [];
    /** @type {Record<string, string | true>} */
    const flags = {};
    const rest = [...args];
    for (let a = rest.shift(); a !== undefined; a = rest.shift()) {
        if (!a.startsWith("--")) positional.push(a);
        else if (["--json", "--send-test", "--stop", "--with-job"].includes(a)) flags[a.slice(2)] = true;
        else flags[a.slice(2)] = rest.shift() ?? "";
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
 * The environment of a live daemon process, so the doctor's signing check runs the way the daemon
 * would: what it was started with (read from /proc), plus what it loads from `daemon-env.json`.
 * @param {any} record `daemon.json`
 * @param {string} stateDir the state directory
 * @returns {Record<string, string | undefined> | null} its environment, or null when it is not running
 */
function daemonEnv(record, stateDir) {
    if (!record || !Number.isInteger(record.pid) || !sameProcess(record)) return null;
    let env;
    try {
        const text = readFileSync(`/proc/${record.pid}/environ`, "utf8");
        env = Object.fromEntries(
            text
                .split("\0")
                .filter(Boolean)
                .map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]),
        );
    } catch {
        return null;
    }
    loadDaemonEnv(stateDir, env);
    return env;
}

/**
 * @typedef {object} Command what a command handler runs with
 * @property {string} name the command
 * @property {string[]} positional its positional arguments
 * @property {Record<string, string | true>} flags its flags
 * @property {string} cwd where it runs
 * @property {Record<string, string | undefined>} env the environment
 * @property {(line: string) => void} out standard output
 * @property {(line: string) => void} err standard error
 * @property {() => Date} now the clock
 * @property {string} root the main checkout
 * @property {string} stateDir the repository's state directory
 * @property {Parameters<typeof launcherContext>[0]} ctxOptions what the launcher needs
 * @property {number} signTimeoutMs the doctor's signing timeout
 * @property {AbortSignal} [signal] ends `githerd board`
 * @property {typeof runSelftest} selftest runs the self-test
 * @property {boolean} tty a person's terminal is attached
 */

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
        signal,
        selftest = runSelftest,
        tty = Boolean(process.stdin.isTTY),
    } = options;
    const [command, ...rest] = argv;

    if (command === "version" || command === "--version") {
        const { version, codeHash } = readVersion();
        out(codeHash ? `${version} ${codeHash}` : version);
        return 0;
    }
    if (!command || command === "help" || command === "--help") {
        (command ? out : err)(USAGE);
        return command ? 0 : 2;
    }
    const handler = Object.hasOwn(HANDLERS, command) ? HANDLERS[command] : null;
    if (!handler) {
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
    return handler({
        name: command,
        ...parseArgs(rest),
        cwd,
        root,
        env,
        out,
        err,
        now,
        stateDir,
        ctxOptions,
        signTimeoutMs,
        signal,
        selftest,
        tty,
    });
}

/**
 * The daemon's port, or null after saying why there is none.
 * @param {Command} c the command
 * @returns {Promise<number | null>} the port
 */
async function daemonPort(c) {
    const { record, health, error } = await probe(/** @type {any} */ ({ stateDir: c.stateDir }));
    if (health) return record.port;
    c.err(`githerd daemon not reachable: ${error}; run githerd ensure`);
    return null;
}

/**
 * `status [section] [--json]`: the board once.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdStatus(c) {
    const board = await boardText(c.stateDir, {
        root: c.root,
        section: c.positional[0],
        json: c.flags.json === true,
        now: c.now(),
        headers: callerHeader(c.env, c.tty),
    });
    (board.ok ? c.out : c.err)(board.text);
    return board.ok ? 0 : 1;
}

/**
 * `board`: the board, redrawn when the state changes, until the signal or SIGINT.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdBoard(c) {
    const draw = async () => {
        const board = await boardText(c.stateDir, { root: c.root, now: c.now() });
        c.out(`\x1b[2J\x1b[H${board.text}`);
    };
    await draw();
    await redrawUntil(c.stateDir, draw, c.signal);
    return 0;
}

/**
 * `why <item>`: the records and ledger lines that put an item in its state.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdWhy(c) {
    const [item] = c.positional;
    if (!item) {
        c.err("usage: githerd why <item>");
        return 2;
    }
    const ledger = await readLedger(c.stateDir, { since: new Date(0) });
    const text = whyText(item, await offlineState(c.stateDir), ledger, c.now());
    if (text === null) {
        c.err(`nothing in state.json or the ledger names ${item}`);
        return 1;
    }
    c.out(text);
    return 0;
}

/**
 * `ack <key>` and `veto <issue:N|pr:N>`: the owner's answers, through the daemon.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdOwner(c) {
    const [target] = c.positional;
    const ack = c.name === "ack";
    if (!target) {
        c.err(`usage: githerd ${c.name} <${ack ? "key" : "issue:N|pr:N"}>`);
        return 2;
    }
    const port = await daemonPort(c);
    if (port === null) return 1;
    const answer = await post(
        port,
        "/owner",
        ack ? { op: "ack", key: target } : { op: "veto", id: target },
        callerHeader(c.env, c.tty),
    );
    (answer.ok ? c.out : c.err)(answer.text ?? answer.error);
    return answer.ok ? 0 : 1;
}

/** The policy switches that name a lane, service or package. */
const VALUE_SWITCHES = new Set(["park-gate", "hold-package"]);

/**
 * `order <N...> <words>` as `POST /owner` takes it; null when it lacks issues or words.
 * @param {string[]} args the positional arguments
 * @returns {Record<string, unknown> | null} the command
 */
function orderCommand(args) {
    const at = args.findIndex((a) => !/^#?\d+$/.test(a));
    if (at < 1) return null;
    return {
        op: "order",
        issues: args.slice(0, at).map((a) => Number(a.replace("#", ""))),
        text: args.slice(at).join(" "),
    };
}

/**
 * `policy [switch [value]] <words>` or `policy end <id>` as `POST /owner` takes it; null when
 * incomplete.
 * @param {string[]} args the positional arguments
 * @returns {Record<string, unknown> | null} the command
 */
function policyCommand(args) {
    if (args[0] === "end") return args[1] ? { op: "policy-end", id: args[1] } : null;
    if (VALUE_SWITCHES.has(args[0])) {
        return args.length > 2
            ? { op: "policy", switch: args[0], value: args[1], text: args.slice(2).join(" ") }
            : null;
    }
    const sw = args[0] === "freeze-merges" ? args[0] : undefined;
    const words = args.slice(sw ? 1 : 0);
    return words.length ? { op: "policy", switch: sw, text: words.join(" ") } : null;
}

/**
 * The owner-layer command a CLI line asks for: `answer`, `order` or `policy`, as `POST /owner`
 * takes it; null when the line is incomplete.
 * @param {string} name the command
 * @param {string[]} args its positional arguments
 * @returns {Record<string, unknown> | null} the command
 */
function recordCommand(name, args) {
    if (name === "order") return orderCommand(args);
    if (name === "policy") return policyCommand(args);
    return args.length > 1 ? { op: "answer", item: args[0], text: args.slice(1).join(" ") } : null;
}

/**
 * `answer`, `order` and `policy`: what the owner says, recorded through the daemon (design 5.6, 5.7).
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdRecord(c) {
    const cmd = recordCommand(c.name, c.positional);
    if (!cmd) {
        c.err(
            `usage: ${USAGE.split("\n")
                .find((l) => l.startsWith(`  ${c.name} `))
                ?.trim()}`,
        );
        return 2;
    }
    const port = await daemonPort(c);
    if (port === null) return 1;
    const answer = await post(port, "/owner", cmd, callerHeader(c.env, c.tty));
    (answer.ok ? c.out : c.err)(answer.text ?? answer.error);
    return answer.ok ? 0 : 1;
}

/**
 * `pause`, `resume`, `workers <n>|--stop`, `keep <window> [--with-job]` and `release <job>`: the
 * owner's control of the workers (design 7.6), as `POST /owner` takes them.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdControl(c) {
    const [arg] = c.positional;
    /** @type {Record<string, unknown> | null} */
    let cmd = { op: c.name };
    if (c.name === "workers")
        cmd = c.flags.stop ? { op: "workers", stop: true } : arg ? { op: "workers", slots: Number(arg) } : null;
    else if (c.name === "keep") cmd = arg ? { op: "keep", window: arg, withJob: Boolean(c.flags["with-job"]) } : null;
    else if (c.name === "release") cmd = arg ? { op: "release", job: arg } : null;
    if (!cmd) {
        c.err(
            `usage: ${USAGE.split("\n")
                .find((l) => l.trimStart().startsWith(c.name))
                ?.trim()}`,
        );
        return 2;
    }
    const port = await daemonPort(c);
    if (port === null) return 1;
    const answer = await post(port, "/owner", cmd, callerHeader(c.env, c.tty));
    (answer.ok ? c.out : c.err)(answer.text ?? answer.error);
    return answer.ok ? 0 : 1;
}

/**
 * `attach`: githerd's tmux server, where every worker has a window (design 7.6). Typing into a
 * worker's window steers it.
 * @param {Command} c the command
 * @returns {Promise<number>} tmux's exit code
 */
async function cmdAttach(c) {
    const r = spawnSync(
        "tmux", // NOSONAR(S4036): the owner's tmux from his own PATH, as tools/ runs git
        ["-L", "githerd", "attach", "-t", "githerd"],
        { stdio: "inherit", env: c.env },
    );
    if (r.error) {
        c.err(`githerd attach: ${r.error.message}`);
        return 1;
    }
    return r.status ?? 1;
}

/**
 * Whether a ledger entry names a target.
 * @param {any} e the entry
 * @param {string | true | undefined} target the `--target` flag
 * @returns {boolean} true when there is no target or the entry names it
 */
function namesTarget(e, target) {
    if (!target) return true;
    return e.target === target || (Array.isArray(e.targets) && e.targets.includes(target));
}

/**
 * `ledger [--since] [--target] [--kind a,b]`: ledger entries, one JSON line each. A kind githerd
 * never writes is refused: filtering on it would print nothing and look like a clean ledger.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdLedger(c) {
    const { flags } = c;
    const kinds = typeof flags.kind === "string" ? flags.kind.split(",") : null;
    const unknown = kinds?.filter((k) => !writtenKinds().has(k)) ?? [];
    if (unknown.length) {
        c.err(`githerd ledger: githerd writes no entry of kind ${unknown.join(", ")}`);
        return 2;
    }
    let since;
    if (typeof flags.since === "string") {
        since = parseSince(flags.since, c.now());
        if (!since) {
            c.err(`githerd ledger: --since takes 30m, 12h, 1d or a date, not "${flags.since}"`);
            return 2;
        }
    }
    const entries = await readLedger(c.stateDir, since ? { since } : {});
    for (const e of entries) {
        if ((!kinds || kinds.includes(e.kind)) && namesTarget(e, flags.target)) c.out(JSON.stringify(e));
    }
    return 0;
}

/**
 * Every `kind: "..."` githerd's code names: the ledger kinds it writes, read from its own source so
 * the list never falls behind.
 * @returns {Set<string>} the kinds
 */
function writtenKinds() {
    const dirs = [join(PACKAGE_DIR, "lib"), join(PACKAGE_DIR, "lib", "actor")];
    const text = dirs.flatMap((d) =>
        readdirSync(d)
            .filter((f) => f.endsWith(".mjs"))
            .map((f) => readFileSync(join(d, f), "utf8")),
    );
    return new Set(text.flatMap((t) => [...t.matchAll(/kind: "([a-z-]+)"/g)].map((m) => m[1])));
}

/**
 * `mode`: each write group's mode and its ledger coverage. `mode dry-run|paused|clear`: lower the
 * mode locally, or remove the override.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdMode(c) {
    const [mode] = c.positional;
    const file = join(c.stateDir, "override.json");
    if (mode === undefined) return showModes(c, file);
    if (c.env.GITHERD_JOB) {
        c.err("githerd mode is the owner's: a worker cannot change githerd's mode");
        return 2;
    }
    if (mode === "acting") {
        c.err(
            "githerd mode acting is refused: the mode is raised only by a githerd.config.json change merged to the default branch",
        );
        return 2;
    }
    if (mode === "clear") {
        rmSync(file, { force: true });
        c.out("mode override removed: githerd runs in the config's mode");
        return 0;
    }
    if (!LOWER_MODES.has(mode)) {
        c.err("usage: githerd mode dry-run|paused|clear");
        return 2;
    }
    mkdirSync(c.stateDir, { recursive: true });
    writeFileSync(file, `${JSON.stringify({ mode, at: c.now().toISOString() })}\n`);
    c.out(`mode override: ${mode} (it can only lower the config's mode; githerd mode clear removes it)`);
    return 0;
}

/**
 * Prints each write group's mode and its ledger coverage.
 * @param {Command} c the command
 * @param {string} file the override file
 * @returns {Promise<number>} the exit code
 */
async function showModes(c, file) {
    const found = launcherContext(c.ctxOptions);
    const config = found.kind === "ready" ? found.ctx.config : null;
    if (!config) {
        let why = "no config";
        if (found.kind === "unconfigured") why = found.reason;
        else if (found.kind === "ready" && found.problem) why = found.problem;
        c.err(`githerd mode: ${why}`);
        return 1;
    }
    const override = readJson(file)?.mode ?? null;
    c.out(modeText(groupModes(config, override), await readLedger(c.stateDir, { since: new Date(0) })));
    return 0;
}

/**
 * `install`, `ensure`, `restart`, `dev` and `doctor`: the commands that need the launcher's context.
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code
 */
async function cmdService(c) {
    if (c.name !== "doctor" && c.env.GITHERD_JOB) {
        c.err(`githerd ${c.name}: workers never start or change githerd`);
        return 2;
    }
    const dev = c.name === "dev";
    if (dev && !c.env.GITHERD_CONFIG) {
        c.err("githerd dev needs GITHERD_CONFIG: the development daemon never reads the default branch's config");
        return 2;
    }
    const devState = dev ? join(worktreeTop(c.cwd), DEV_STATE) : c.stateDir;
    const found = launcherContext({ ...c.ctxOptions, ...(dev ? { name: DEV_NAME, stateDir: devState } : {}) });
    if (c.name === "doctor") return doctor(found, c);
    if (found.kind === "outside") return 2;
    if (found.kind === "unconfigured") {
        c.err(found.reason);
        return 1;
    }
    if (found.problem) {
        c.err(`githerd: config: ${found.problem}`);
        return 1;
    }
    try {
        await SERVICE[c.name](found.ctx, c, devState);
        return 0;
    } catch (e) {
        c.err(`githerd ${c.name}: ${/** @type {Error} */ (e).message}`);
        return 1;
    }
}

/**
 * Runs this working tree as the `githerd-dev` daemon, with its state in the worktree. It starts the
 * way the shared daemon does (`env -i`, the environment from `daemon-env.json`, `--autorestart`,
 * the state directory as working directory), so a soak of it tests that start path.
 * @param {import("./launcher.mjs").LauncherContext} ctx the launcher's context
 * @param {Command} c the command
 * @param {string} devState the development state directory
 */
async function startDev(ctx, c, devState) {
    const before = (await probe(ctx)).record;
    writeDaemonEnv(devState, ctx.env);
    const args = daemonStartArgs({
        name: DEV_NAME,
        root: ctx.root,
        stateDir: devState,
        script: join(PACKAGE_DIR, "bin", "githerd-daemon.mjs"),
        extra: [
            `GITHERD_CONFIG=${resolve(c.cwd, /** @type {string} */ (c.env.GITHERD_CONFIG))}`,
            "GITHERD_DEV=1",
            ...(c.env.GITHERD_DEV_NOTIFY === "1" ? ["GITHERD_DEV_NOTIFY=1"] : []),
        ],
    });
    const data = await servherd(ctx, args, devState);
    const { health, error } = await waitFor(
        ctx,
        (h) => ours(ctx, h) && (data.action === "existing" || h.pid !== before?.pid),
    );
    if (!health) throw new Error(`${DEV_NAME} did not answer: ${error}`);
    c.out(`${DEV_NAME} ${data.action} at http://127.0.0.1:${health.port} (${health.mode}); state in ${devState}`);
    c.out(`use it with GITHERD_STATE_DIR=${devState} githerd status`);
}

/**
 * Whether a variable is one of the git signing variables.
 * @param {string} name the variable
 * @returns {boolean} true for GIT_CONFIG_COUNT, _KEY_n and _VALUE_n
 */
const isSigning = (name) => /^GIT_CONFIG_(COUNT$|KEY_|VALUE_)/.test(name);

/**
 * The environment `install` copies, with the signing variables: this shell's when it has them
 * (a Claude session gets them from the owner's user settings), else the user settings' own, so an
 * install from a plain terminal does not lose the daemon its signing.
 * @param {Record<string, string | undefined>} env this shell's environment
 * @returns {{env: Record<string, string | undefined>, from: string | null}} the environment, and
 *   where its signing variables came from when not from this shell
 */
function withSigning(env) {
    if (Object.entries(env).some(([k, v]) => v !== undefined && isSigning(k))) return { env, from: null };
    let signing = {};
    try {
        signing = readSigningEnv(env.HOME ?? homedir());
    } catch {
        // malformed user settings: no signing variables from there; the warning says so
    }
    return Object.keys(signing).length
        ? { env: { ...env, ...signing }, from: "~/.claude/settings.json" }
        : { env, from: null };
}

/** @type {Record<string, (ctx: import("./launcher.mjs").LauncherContext, c: Command, devState: string) => Promise<void>>} */
const SERVICE = {
    install: async (ctx, c) => {
        await prepareCode(ctx, await targetCode(ctx));
        const signing = withSigning(ctx.env);
        const carried = writeDaemonEnv(ctx.stateDir, signing.env, { replace: true });
        if (carried.length) c.out(`kept from the old daemon-env.json, unset here: ${carried.join(" ")}`);
        if (signing.from) c.out(`signing variables from ${signing.from}`);
        const signs = Object.entries(signing.env).some(([k, v]) => v !== undefined && isSigning(k));
        if (!signs && !carried.some(isSigning)) {
            c.err(
                "warning: no GIT_CONFIG_* signing variables here, in ~/.claude/settings.json or in the old " +
                    "daemon-env.json: the daemon's own commits would sign with the gpg key, whose pinentry " +
                    "cannot run without a terminal. Run githerd install from one of your Claude sessions, " +
                    "or from a shell that exports them.",
            );
        }
        c.out(installCommand(ctx));
    },
    ensure: async (ctx, c) => {
        const r = await ensureDaemon(ctx);
        c.out(r.fatal ? `${r.action} ${r.url}: githerd is DOWN: ${r.fatal}` : `${r.action} ${r.url}`);
    },
    restart: async (ctx, c) => {
        await servherd(ctx, ["restart", ctx.name]);
        c.out(`restarted ${ctx.name}`);
    },
    dev: async (ctx, c, devState) => {
        if (!c.flags.stop) return startDev(ctx, c, devState);
        // `remove` stops it first; `-f` skips the confirmation that hangs without a terminal.
        await servherd(ctx, ["remove", "-f", DEV_NAME], devState);
        c.out(`${DEV_NAME} stopped and removed from servherd; its state stays in ${devState}`);
    },
};

/** Every command that works on a repository, and its handler. */
/** @type {Record<string, (c: Command) => Promise<number>>} */
const HANDLERS = {
    status: cmdStatus,
    board: cmdBoard,
    why: cmdWhy,
    ack: cmdOwner,
    veto: cmdOwner,
    answer: cmdRecord,
    order: cmdRecord,
    policy: cmdRecord,
    attach: cmdAttach,
    pause: cmdControl,
    resume: cmdControl,
    workers: cmdControl,
    keep: cmdControl,
    release: cmdControl,
    ledger: cmdLedger,
    mode: cmdMode,
    install: cmdService,
    ensure: cmdService,
    restart: cmdService,
    dev: cmdService,
    doctor: cmdService,
    selftest: cmdSelftest,
};

/**
 * `selftest`: the platform self-test with the configured repository and model (design 11.4).
 * @param {Command} c the command
 * @returns {Promise<number>} the exit code: 0 passed, 1 failed, 2 no usable config
 */
async function cmdSelftest(c) {
    if (c.env.GITHERD_JOB) {
        c.err("githerd selftest: workers never start or change githerd");
        return 2;
    }
    const found = launcherContext(c.ctxOptions);
    const config = found.kind === "ready" ? found.ctx.config : null;
    if (!config) {
        const why =
            found.kind === "unconfigured" ? found.reason : (found.kind === "ready" && found.problem) || "no config";
        c.err(`githerd selftest: ${why}`);
        return 2;
    }
    const result = await c.selftest({
        root: c.root,
        stateDir: c.stateDir,
        repo: config.repo,
        model: config.workers.model,
        env: c.env,
        log: (line) => c.out(`... ${line}`),
    });
    for (const line of selftestText(result)) c.out(line);
    return result.passed ? 0 : 1;
}

/**
 * The state as the files hold it: `state.json`, else `state.json.bak`, else rebuilt from the
 * ledger. Read only: unlike the daemon's load, nothing is renamed or removed.
 * @param {string} stateDir the state directory
 * @returns {Promise<any>} the state, `{}` when there is none
 */
async function offlineState(stateDir) {
    return (
        readJson(join(stateDir, "state.json")) ??
        readJson(join(stateDir, "state.json.bak")) ??
        (await replayLedger(stateDir)) ??
        {}
    );
}

/**
 * The board: the daemon's answer when it answers, else rendered from the state directory with a
 * line saying the daemon is down.
 * @param {string} stateDir the state directory
 * @param {{root: string, section?: string, json?: boolean, now: Date, headers?: Record<string, string>}} options
 *   the main checkout (for the pre-push lock), one section, JSON, the clock, and the caller
 *   header (`status` sends it; the board's redraws do not, so an open board never counts as the
 *   owner's presence)
 * @returns {Promise<{ok: boolean, text: string}>} the text, and whether it is an answer or an error
 */
async function boardText(stateDir, { root, section, json = false, now, headers = {} }) {
    const { record, health, error } = await probe(/** @type {any} */ ({ stateDir }));
    if (health) {
        const reply = await post(
            record.port,
            "/rpc",
            {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "githerd_status",
                    arguments: { ...(json ? { format: "json" } : {}), ...(section ? { section } : {}) },
                    _meta: { githerd: { protocol: TOOL_PROTOCOL } },
                },
            },
            headers,
        );
        const failed = Boolean(reply.result?.isError || reply.error);
        return { ok: !failed, text: reply.result?.content?.[0]?.text ?? reply.error?.message ?? JSON.stringify(reply) };
    }
    const state = await offlineState(stateDir);
    let written = "never";
    try {
        written = `${Math.round((now.getTime() - statSync(join(stateDir, "state.json")).mtimeMs) / 1000)} s ago`;
    } catch {
        // no state.json
    }
    const view = {
        state,
        liveness: readLiveness(stateDir),
        pushQueue: pushQueueTickets(root),
        down: `${error}; state.json written ${written}`,
        health: {
            stopGatesFailedOpen: (readText(join(stateDir, UNCHECKED_STOPS)) ?? "").split("\n").filter(Boolean).length,
        },
    };
    if (json) return { ok: true, text: JSON.stringify(view, null, 2) };
    try {
        return { ok: true, text: renderBoard(view, now, section) };
    } catch (e) {
        return { ok: false, text: `githerd status: ${/** @type {Error} */ (e).message}` };
    }
}

/**
 * Calls `draw` whenever a file the board reads changes, until `signal` aborts or SIGINT arrives.
 * Changes that arrive while a draw runs are folded into one more draw.
 * @param {string} stateDir the state directory
 * @param {() => Promise<void>} draw redraws the board
 * @param {AbortSignal} [signal] ends the loop
 * @returns {Promise<void>} resolves when the loop ends
 */
async function redrawUntil(stateDir, draw, signal) {
    mkdirSync(stateDir, { recursive: true });
    let running = Promise.resolve();
    let queued = false;
    const watcher = watch(stateDir, (_event, name) => {
        if (!["state.json", "FATAL", "progress", "daemon.json"].includes(String(name)) || queued) return;
        queued = true;
        running = running.then(() => {
            queued = false;
            return draw();
        });
    });
    /**
     * Ends the wait; replaced once the wait begins.
     * @type {() => void}
     */
    let stop = () => {};
    await new Promise((done) => {
        stop = () => done(undefined);
        if (signal?.aborted) return stop();
        signal?.addEventListener("abort", stop, { once: true });
        process.once("SIGINT", stop);
    });
    process.removeListener("SIGINT", stop);
    watcher.close();
    await running;
}

/**
 * The top of the work tree holding `cwd`.
 * @param {string} cwd a directory inside it
 * @returns {string} the top
 */
function worktreeTop(cwd) {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" }).trim(); // NOSONAR(S4036): the owner's git from his PATH, as in tools/
}

/**
 * @typedef {(level: "ok" | "warn" | "FAIL", name: string, text: string) => void} Report prints one
 *   doctor line
 * @typedef {{cwd: string, env: Record<string, string | undefined>}} ExecPlace where a check runs
 * @typedef {{env: Record<string, string | undefined>, now: () => Date, sendTest: boolean, report: Report}}
 *   ServiceOptions how the service checks run and report
 */

/**
 * The first line of a command's output.
 * @param {string} text the output
 * @returns {string} its first line, or `no output`
 */
function firstLine(text) {
    return text.trim().split("\n")[0] || "no output";
}

/**
 * Runs the checks of design section 12 and prints one line per check: `ok`, `warn` or `FAIL`.
 * @param {ReturnType<typeof launcherContext>} found the launcher's view of the repository
 * @param {Command} c the command
 * @returns {Promise<number>} 1 when any check failed, else 0
 */
async function doctor(found, c) {
    if (found.kind === "outside") return 2;
    let failed = false;
    /**
     * Prints one line and remembers a failure.
     * @type {Report}
     */
    const report = (level, name, text) => {
        if (level === "FAIL") failed = true;
        c.out(`${level.padEnd(4)} ${name}: ${text}`);
    };
    const root = found.kind === "ready" ? found.ctx.root : found.root;
    const ctx = found.kind === "ready" ? found.ctx : null;
    if (found.kind === "unconfigured") report("FAIL", "config", `${found.reason}; nothing starts until it is`);
    else if (found.problem) report("FAIL", "config", found.problem);
    else report("ok", "config", `${ctx?.config?.repo}, mode ${ctx?.config?.mode}`);
    if (!originHead(root)) {
        report(
            "warn",
            "origin/HEAD",
            "not set, so githerd asks the remote for the default branch; set it once with: git remote set-head origin -a",
        );
    }
    const place = { cwd: root, env: c.env };
    const ghPresent = await ghCheck(place, report);
    // servherd, the daemon, supervision and the notify command: only for a configured repository
    const sendTest = Boolean(c.flags["send-test"]);
    const record = ctx ? await serviceChecks(ctx, { env: c.env, now: c.now, sendTest, report }) : null;
    await signingCheck(place, daemonEnv(record, ctx?.stateDir ?? c.stateDir), c.signTimeoutMs, report);
    stateCheck(join(ctx?.stateDir ?? c.stateDir, "state.json"), report);
    if (ghPresent && ctx?.config?.repo) await deployKeyCheck(ctx.config.repo, { root, env: c.env, report });
    return failed ? 1 : 0;
}

/**
 * gh is installed, logged in, and its token has the repo scope.
 * @param {ExecPlace} place where to run
 * @param {Report} report how to report
 * @returns {Promise<boolean>} whether gh is installed
 */
async function ghCheck(place, report) {
    const auth = await exec(["gh", "auth", "status"], place);
    if (auth.missing) {
        report("FAIL", "gh", "gh not found on PATH: githerd reads GitHub through gh");
        return false;
    }
    const text = auth.stderr + auth.stdout;
    const scopes = /Token scopes:\s*(.*)/.exec(text)?.[1]?.trim();
    if (auth.code !== 0) report("FAIL", "gh", `not logged in: ${firstLine(text)}`);
    else if (!scopes) report("warn", "gh", "logged in; token scopes not shown");
    else if (scopes.includes("'repo'")) report("ok", "gh", `logged in, scopes ${scopes}`);
    else report("FAIL", "gh", `the token lacks the repo scope (has ${scopes})`);
    return true;
}

/**
 * A signed commit object can be made, in the daemon's environment when it is running.
 * @param {ExecPlace} place where to run
 * @param {Record<string, string> | null} fromDaemon the daemon's environment, or null
 * @param {number} timeoutMs how long the signer gets
 * @param {Report} report how to report
 */
async function signingCheck(place, fromDaemon, timeoutMs, report) {
    const env = { ...(fromDaemon ?? place.env), GIT_TERMINAL_PROMPT: "0" };
    const where = fromDaemon ? "the daemon's environment" : "this shell's environment (no daemon running)";
    const tree = await exec(["git", "hash-object", "-t", "tree", "/dev/null"], { cwd: place.cwd, env });
    const sign = await exec(["git", "commit-tree", "-S", "-m", "githerd doctor signing check", tree.stdout.trim()], {
        cwd: place.cwd,
        env,
        timeoutMs,
    });
    if (sign.timedOut) {
        report(
            "FAIL",
            "signing",
            `git commit-tree -S did not finish within ${timeoutMs / 1000} s in ${where}: the signer is waiting for a passphrase or pinentry`,
        );
    } else if (sign.code === 0) report("ok", "signing", `signed commit in ${where}`);
    else report("FAIL", "signing", `git commit-tree -S failed in ${where}: ${firstLine(sign.stderr)}`);
}

/**
 * The state file is readable and of a schema this code reads.
 * @param {string} stateFile the file
 * @param {Report} report how to report
 */
function stateCheck(stateFile, report) {
    if (!existsSync(stateFile)) {
        report("warn", "state", `no ${stateFile} yet`);
        return;
    }
    const saved = readJson(stateFile);
    if (!saved) report("FAIL", "state", `${stateFile} is unreadable; the daemon falls back to state.json.bak`);
    else if (saved.schema > STATE_SCHEMA)
        report("FAIL", "state", `schema ${saved.schema} is newer than this githerd's ${STATE_SCHEMA}`);
    else report("ok", "state", `schema ${saved.schema}`);
}

/**
 * Parses the JSON that starts at the first `start` character of a command's output.
 * @param {string} text the output
 * @param {string} start `{` or `[`
 * @returns {any} the value, or null when there is none
 */
function jsonFrom(text, start) {
    try {
        return JSON.parse(text.slice(text.indexOf(start)));
    } catch {
        return null;
    }
}

/**
 * The doctor's checks of a configured repository: servherd answers, the daemon runs the default
 * branch's code, pm2 restarts it on a crash, and the notify command can run.
 * @param {import("./launcher.mjs").LauncherContext} ctx the launcher's context
 * @param {ServiceOptions} options how to run and report
 * @returns {Promise<any>} `daemon.json`, or null
 */
async function serviceChecks(ctx, { env, now, sendTest, report }) {
    const list = await exec([...ctx.servherd, "--json", "list"], { cwd: ctx.root, env });
    const parsed = jsonFrom(list.stdout, "{");
    const servers = parsed?.success ? parsed.data.servers : null;
    if (servers) {
        const entry = servers.find((/** @type {any} */ s) => s.server?.name === ctx.name);
        report("ok", "servherd", `${servers.length} servers; ${ctx.name} ${entry ? entry.status : "not registered"}`);
    } else report("FAIL", "servherd", `not reachable: ${firstLine(list.stderr || list.stdout)}`);
    const probed = await probe(ctx);
    await daemonCheck(ctx, probed, report);
    await supervisionCheck(ctx, report);
    await notifyCheck(ctx, { env, now, sendTest, report });
    return probed.record;
}

/**
 * The daemon answers and runs the default branch's code.
 * @param {import("./launcher.mjs").LauncherContext} ctx the launcher's context
 * @param {{health: any, error: string | null}} probed the daemon's health answer, or why there is none
 * @param {Report} report how to report
 */
async function daemonCheck(ctx, { health, error }, report) {
    if (!health) {
        report("FAIL", "daemon", `not reachable: ${error}; run githerd ensure`);
        return;
    }
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
        const upgrade = `origin/${target.branch} has ${target.hash.slice(0, 8)}, and the next launcher start upgrades it`;
        report("warn", "daemon", `${running}; ${upgrade}`);
    }
}

/**
 * pm2 restarts the daemon's process on a crash.
 * @param {import("./launcher.mjs").LauncherContext} ctx the launcher's context
 * @param {Report} report how to report
 */
async function supervisionCheck(ctx, report) {
    const pm2Name = `servherd-${ctx.name}`;
    const jlist = await exec([...ctx.pm2, "jlist"], pm2Options(ctx));
    const apps = jsonFrom(jlist.stdout, "[");
    const app = apps?.find((/** @type {any} */ a) => a.name === pm2Name);
    if (!apps) report("FAIL", "supervision", `cannot list pm2 processes: ${firstLine(jlist.stderr || jlist.stdout)}`);
    else if (!app) report("FAIL", "supervision", `no pm2 process ${pm2Name}; run githerd ensure`);
    else if (app.pm2_env?.autorestart === true)
        report("ok", "supervision", `pm2 autorestart on for ${pm2Name} (${app.pm2_env.status})`);
    else
        report(
            "FAIL",
            "supervision",
            `pm2 autorestart is off for ${pm2Name}: a crash stays down until a session opens`,
        );
}

/**
 * The notify command can run, and with `--send-test` a page goes out.
 * @param {import("./launcher.mjs").LauncherContext} ctx the launcher's context
 * @param {ServiceOptions} options how to run and report
 */
async function notifyCheck(ctx, { env, now, sendTest, report }) {
    const notify = ctx.config?.notify ?? { command: null, maxPerHour: 6 };
    const problem = notifyCommandProblem(notify.command, env);
    if (notify.command === null) report("warn", "notify", "notify.command is null: pages only go to the ledger");
    else if (problem) report("FAIL", "notify", problem);
    else if (sendTest) {
        /** @type {any} */
        const state = {};
        const notifier = createNotifier({ notify, state, ledger: () => {}, now });
        notifier.send({ key: "doctor-test", status: "info", message: "githerd doctor: test page", bypass: true });
        await notifier.flush();
        if (state.notify.lastError) report("FAIL", "notify", `the test page failed: ${state.notify.lastError}`);
        else report("ok", "notify", "test page sent");
    } else report("ok", "notify", `${notify.command[0]} is executable (--send-test sends a page)`);
}

/**
 * The public half of a private key file: its `.pub` beside it, else derived by ssh-keygen.
 * @param {string} file the private key
 * @param {ExecPlace} place where to run ssh-keygen
 * @returns {Promise<string | null>} the public key, or null when neither works
 */
async function publicHalf(file, place) {
    const pub = readText(`${file}.pub`);
    if (pub !== null) return pub;
    const derived = await exec(["ssh-keygen", "-y", "-P", "", "-f", file], { ...place, timeoutMs: 10_000 });
    return derived.code === 0 ? derived.stdout : null;
}

/**
 * Warns when a private key in `~/.ssh` belongs to one of the repository's deploy keys: the
 * release deploy key bypasses every ruleset (design section 14).
 * @param {string} repo `owner/name`
 * @param {{root: string, env: Record<string, string | undefined>, report: Report}} options where to
 *   run and how to report
 */
async function deployKeyCheck(repo, { root, env, report }) {
    const res = await exec(["gh", "api", `repos/${repo}/keys`], { cwd: root, env });
    const keys = res.code === 0 ? jsonFrom(res.stdout, "[") : null;
    if (!Array.isArray(keys)) {
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
        if (!readText(file)?.includes("PRIVATE KEY")) continue;
        const pub = await publicHalf(file, { cwd: root, env });
        if (pub !== null && deploy.has(blob(pub))) {
            const title = deploy.get(blob(pub));
            report(
                "warn",
                "deploy keys",
                `${file} is the private key of deploy key "${title}", which bypasses the master ruleset`,
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
