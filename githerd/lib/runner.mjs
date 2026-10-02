/**
 * Judgment runs (design section 9): the run directory, the isolated `claude -p` command, admission
 * against the day's budget, the stream checks while it runs, the timeout and process-group kill,
 * the outcome and the spend, and what happens to runs in flight across a restart.
 *
 * A run acts as no one. Its environment is an allowlist (no GitHub token, no notifier credential),
 * its git config has no credential helper, its tools are only the ones its kind needs, and a guard
 * hook checks every Bash, Edit and Write. Everything it wants to change leaves the machine only
 * through the daemon's tools.
 */

import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { accessSync, appendFileSync, constants, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, relative, resolve, isAbsolute } from "node:path";

import { escalate, releaseRun } from "./board.mjs";
import { bootId as currentBootId, identify, sameProcess } from "./proc.mjs";
import { RUN_KINDS } from "./prompts.mjs";
import { hashToken } from "./run-tools.mjs";
import { PACKAGE_DIR } from "./version.mjs";

/** Kinds that edit code in a githerd-owned worktree; every other kind is read-only. */
const CODE_EDITING = new Set(["master-red", "pr-fix", "pr-conflict", "backlog"]);

const EDIT_TOOLS = ["Read", "Edit", "Write", "Grep", "Glob", "Bash"];
const READ_TOOLS = ["Read", "Grep", "Glob"];
/** Pre-approved for every kind. Bash, Edit and Write stay with auto mode's classifier. */
const ALLOWED_TOOLS = "Read Grep Glob mcp__githerd";
/** Tools a read-only kind must never have, whatever its tool list says. */
const NEVER_READ_ONLY = new Set(["Bash", "Edit", "Write", "WebFetch"]);

/** SIGTERM first, then SIGKILL this long after. */
const KILL_GRACE_MS = 10_000;

/** Reads the guard denies to Bash (through the sandbox) and to the file tools. */
const SECRET_PATHS = [
    // gh, servherd and other tools keep their credentials under ~/.config.
    "~/.config",
    "~/.git-credentials",
    "~/.npmrc",
    "~/.claude.json",
    "~/.docker",
    "~/.ssh",
    "~/.claude/.credentials.json",
    "~/.bashrc",
    "~/.profile",
    // ponytail: the key material only; gpg itself must still read the public keyring to sign.
    "~/.gnupg/private-keys-v1.d",
];

/** The structured result every run must end with (`--json-schema`). */
const RESULT_SCHEMA = {
    type: "object",
    required: ["outcome", "summary"],
    properties: {
        outcome: { type: "string", enum: ["done", "partial", "nothing-to-do", "escalated", "failed"] },
        summary: { type: "string", maxLength: 600 },
        candidates: { type: "array", maxItems: 75, items: { type: "object" } },
        mechanism: { type: "string", maxLength: 600 },
        followUp: { type: "string", maxLength: 300 },
    },
};

/** What Claude Code's Bash sandbox needs on Linux. Without them it runs commands unsandboxed. */
const SANDBOX_COMMANDS = ["bwrap", "socat"];

/**
 * The sandbox commands missing from `path`. Claude Code only warns and runs Bash unsandboxed when
 * they are missing, so a code-editing run must not start then (design section 9.3).
 * @param {string | undefined} path the run's PATH
 * @returns {string[]} the missing commands; empty when the sandbox can run
 */
export function sandboxMissing(path) {
    const dirs = (path ?? "").split(delimiter).filter(Boolean);
    return SANDBOX_COMMANDS.filter(
        (cmd) =>
            !dirs.some((d) => {
                try {
                    accessSync(join(d, cmd), constants.X_OK);
                    return true;
                } catch {
                    return false;
                }
            }),
    );
}

/**
 * The built-in tools a kind gets (`--tools`, without `mcp__githerd`).
 * @param {string} kind the run kind
 * @returns {string[]} the tool names
 */
export function toolsFor(kind) {
    if (!RUN_KINDS.includes(kind)) throw new Error(`unknown run kind ${kind}`);
    return CODE_EDITING.has(kind) ? EDIT_TOOLS : READ_TOOLS;
}

/**
 * A kind's caps: `runs.caps[kind] ?? runs.caps.default`.
 * @param {any} config the normalized config
 * @param {string} kind the run kind
 * @returns {{turns: number, budgetUsd: number, timeoutMinutes: number}} the caps
 */
function capsFor(config, kind) {
    return config.runs.caps[kind] ?? config.runs.caps.default;
}

/**
 * The command line of design section 9.3, after the `claude` command itself.
 * @param {{kind: string, config: any, runDir: string, prompt: string}} run the run
 * @returns {string[]} the arguments
 */
export function runArgv({ kind, config, runDir, prompt }) {
    const caps = capsFor(config, kind);
    return [
        "-p",
        prompt,
        "--model",
        config.runs.model[kind] ?? config.runs.model.default,
        "--permission-mode",
        "auto",
        "--permission-prompts",
        "none",
        "--output-format",
        "stream-json",
        "--verbose",
        "--max-turns",
        String(caps.turns),
        "--max-budget-usd",
        String(caps.budgetUsd),
        // The schema itself: claude parses this argument as JSON, not as a path.
        "--json-schema",
        JSON.stringify(RESULT_SCHEMA),
        "--strict-mcp-config",
        "--mcp-config",
        join(runDir, "mcp.json"),
        "--setting-sources",
        "project,local",
        "--settings",
        join(runDir, "settings.json"),
        "--tools",
        [...toolsFor(kind), "mcp__githerd"].join(" "),
        "--allowedTools",
        ALLOWED_TOOLS,
    ];
}

/**
 * The run's environment: an allowlist, never the daemon's. No GitHub token, no notifier
 * credential, no inherited `GITHERD_*`.
 * @param {Record<string, string | undefined>} env the daemon's environment
 * @param {{gitconfig: string, npmrc: string, run: Record<string, string>}} extra the run git
 *   config, the empty npm user config and the run's own `GITHERD_*` variables
 * @returns {Record<string, string>} the child environment
 */
export function runEnv(env, { gitconfig, npmrc, run }) {
    /** @type {Record<string, string>} */
    const out = {};
    for (const name of ["PATH", "HOME", "LANG", "TERM", "TMPDIR", "GNUPGHOME", "GPG_TTY"]) {
        if (env[name] !== undefined) out[name] = /** @type {string} */ (env[name]);
    }
    out.GIT_CONFIG_GLOBAL = gitconfig;
    // npm and pnpm never load the owner's ~/.npmrc, which holds the publish token.
    out.NPM_CONFIG_USERCONFIG = npmrc;
    for (const [name, value] of Object.entries(run)) {
        if (!name.startsWith("GITHERD_")) throw new Error(`${name}: a run gets only GITHERD_* variables`);
        out[name] = value;
    }
    return out;
}

/**
 * The run's `settings.json`: the guard on Bash, Edit and Write; for code-editing kinds the Bash
 * sandbox; deny rules for the secret paths; attribution and auto-memory off.
 * @param {{kind: string, guard: string[], gpgAgentSocket?: string | null, stateDir?: string | null}} options
 *   the kind, the guard's command, the gpg-agent socket a sandboxed commit may use, and githerd's
 *   state directory (absolute)
 * @returns {object} the settings
 */
export function runSettings({ kind, guard, gpgAgentSocket = null, stateDir = null }) {
    const deny = SECRET_PATHS.flatMap((p) => [`Read(${p}/**)`, `Read(${p})`, `Edit(${p}/**)`, `Edit(${p})`]);
    // The repository's .env files hold API keys; another run's mcp.json holds its run token.
    // A leading `//` makes a rule path absolute.
    deny.push("Read(**/.env*)");
    if (stateDir) deny.push(`Read(/${stateDir}/runs/*/mcp.json)`, `Edit(/${stateDir}/**)`);
    /** @type {any} */
    const settings = {
        hooks: {
            PreToolUse: [
                { matcher: "Bash|Edit|Write", hooks: [{ type: "command", command: guard.map(quote).join(" ") }] },
            ],
        },
        permissions: { deny },
        includeCoAuthoredBy: false,
        attribution: { commit: "", pr: "" },
        autoMemoryEnabled: false,
    };
    if (CODE_EDITING.has(kind)) {
        settings.permissions.allow = ["WebFetch(domain:registry.npmjs.org)"];
        settings.sandbox = {
            enabled: true,
            allowUnsandboxedCommands: false,
            network: { allowUnixSockets: gpgAgentSocket ? [gpgAgentSocket] : [] },
        };
    }
    return settings;
}

/**
 * Single-quotes a word for the hook's shell command line.
 * @param {string} word the word
 * @returns {string} the quoted word
 */
function quote(word) {
    return /^[\w./=:@-]+$/.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`;
}

/**
 * Writes `.githerd/run-gitconfig`: the owner's name, email and signing key, signed commits, and
 * no credential helper (the empty value clears any inherited one).
 * @param {string} stateDir the .githerd directory
 * @param {{name: string, email: string, signingKey: string | null}} owner the identity
 * @returns {string} the file's path
 */
export function writeRunGitconfig(stateDir, { name, email, signingKey }) {
    const file = join(stateDir, "run-gitconfig");
    const lines = ["[user]", `\tname = ${name}`, `\temail = ${email}`];
    if (signingKey) lines.push(`\tsigningkey = ${signingKey}`);
    lines.push("[commit]", "\tgpgsign = true", "[credential]", "\thelper =", "");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(file, lines.join("\n"));
    return file;
}

/**
 * The owner's git identity as the main checkout sees it.
 * @param {string} root the repository
 * @returns {{name: string, email: string, signingKey: string | null}} the identity
 */
export function ownerIdentity(root) {
    const get = (key) => {
        try {
            return execFileSync("git", ["config", "--get", key], { cwd: root, encoding: "utf8" }).trim() || null;
        } catch {
            return null;
        }
    };
    const name = get("user.name");
    const email = get("user.email");
    if (!name || !email) throw new Error("git user.name and user.email must be set for run commits");
    return { name, email, signingKey: get("user.signingkey") };
}

/**
 * Checks the stream's `system`/`init` line (design section 9.6, step 1).
 * @param {any} init the parsed line
 * @param {string} kind the run kind
 * @returns {string | null} why it does not match, or null when it does
 */
export function checkInit(init, kind) {
    if (init.permissionMode !== "auto") return `permission mode ${init.permissionMode}`;
    const servers = init.mcp_servers ?? [];
    if (servers.length !== 1 || servers[0].name !== "githerd" || servers[0].status !== "connected") {
        return `MCP servers ${JSON.stringify(servers.map((s) => `${s.name}:${s.status}`))}`;
    }
    // StructuredOutput is how claude returns the --json-schema result; every run has it.
    const tools = (init.tools ?? []).filter((t) => !t.startsWith("mcp__") && t !== "StructuredOutput");
    const foreign = (init.tools ?? []).filter((t) => t.startsWith("mcp__") && !t.startsWith("mcp__githerd__"));
    const want = toolsFor(kind);
    if (foreign.length) return `tools from other MCP servers: ${foreign.join(" ")}`;
    if (!CODE_EDITING.has(kind) && tools.some((t) => NEVER_READ_ONLY.has(t)))
        return `read-only kind has ${tools.join(" ")}`;
    if (tools.length !== want.length || want.some((t) => !tools.includes(t))) {
        return `tools ${tools.join(" ")}, expected ${want.join(" ")}`;
    }
    return null;
}

/**
 * Whether a stream line asks for background work (`run_in_background: true` on any tool call).
 * @param {any} line the parsed line
 * @returns {boolean} true when it does
 */
function backgrounds(line) {
    if (line.type !== "assistant") return false;
    const content = line.message?.content;
    return Array.isArray(content) && content.some((c) => c?.type === "tool_use" && c.input?.run_in_background === true);
}

/**
 * The run's status and outcome from what the runner saw (design section 9.6, step 3).
 * @param {{killed: string | null, result: any}} seen why the runner killed it, and the result line
 * @returns {{status: "ended" | "failed" | "interrupted", outcome: string}} the classification
 */
export function classify({ killed, result }) {
    if (killed === "interrupted") return { status: "interrupted", outcome: "interrupted" };
    if (killed) return { status: "failed", outcome: killed };
    if (!result) return { status: "failed", outcome: "no-result" };
    if (result.is_error || String(result.subtype ?? "").startsWith("error")) {
        return { status: "failed", outcome: result.subtype && result.subtype !== "success" ? result.subtype : "error" };
    }
    const outcome = result.structured_output?.outcome;
    if (!RESULT_SCHEMA.properties.outcome.enum.includes(outcome))
        return { status: "failed", outcome: "no-structured-output" };
    return { status: outcome === "failed" ? "failed" : "ended", outcome };
}

/**
 * Whether a run counts against its target's attempt limits. `interrupted` and `lost` runs did not
 * fail, so they do not.
 * @param {{status: string}} run the run record
 * @returns {boolean} true when it consumes an attempt
 */
export function consumesAttempt(run) {
    return run.status !== "interrupted" && run.status !== "lost" && run.status !== "running";
}

const isRetriage = (kind) => kind.startsWith("retriage-");

/**
 * Whether a run of `kind` may start now (design section 9.1): fewer than `runs.maxConcurrent`
 * running, and the day's spend plus every running run's budget plus this one's within the limit.
 * The limit is the day's budget for master-red and the day's budget minus one master-red budget
 * for every other kind, so one master-red run always fits. Re-triage kinds draw on their own
 * weekly budget and skip the daily check.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {string} mode the effective mode
 * @param {string} kind the run kind
 * @param {Date} now the current time
 * @returns {{ok: true} | {ok: false, reason: string}} the answer
 */
export function admit(state, config, mode, kind, now) {
    if (mode === "paused") return { ok: false, reason: "paused" };
    const running = Object.values(state.runs ?? {}).filter((r) => r.status === "running");
    if (running.length >= config.runs.maxConcurrent) return { ok: false, reason: `${running.length} runs running` };
    if (isRetriage(kind)) return { ok: true };
    const daily = mode === "acting" ? config.runs.dailyBudgetUsd : config.runs.dryRunDailyBudgetUsd;
    const reserve = capsFor(config, "master-red").budgetUsd;
    // A day budget too small for a master-red run reserves nothing: master-red can never fit.
    const limit = kind === "master-red" || reserve >= daily ? daily : daily - reserve;
    const committed =
        (state.spend?.[now.toISOString().slice(0, 10)] ?? 0) +
        running.filter((r) => !isRetriage(r.kind)).reduce((sum, r) => sum + (r.budgetUsd ?? 0), 0);
    const budget = capsFor(config, kind).budgetUsd;
    if (committed + budget > limit + 1e-9) {
        return { ok: false, reason: `$${committed.toFixed(2)} committed + $${budget} exceeds $${limit} today` };
    }
    return { ok: true };
}

/**
 * Sends SIGTERM to a process group, then SIGKILL `graceMs` later if it is still there.
 * @param {number} pgid the group
 * @param {number} graceMs the grace period
 */
function killGroup(pgid, graceMs) {
    if (!signal(pgid, "SIGTERM")) return;
    setTimeout(() => signal(pgid, "SIGKILL"), graceMs).unref();
}

/**
 * Signals a process group.
 * @param {number} pgid the group
 * @param {NodeJS.Signals} sig the signal
 * @returns {boolean} false when the group is gone
 */
function signal(pgid, sig) {
    try {
        process.kill(-pgid, sig);
        return true;
    } catch {
        return false;
    }
}

/**
 * Settles the runs a previous daemon left `running` (design section 5.8). After a reboot (the
 * boot id changed) they are `lost` and nothing is killed. Otherwise a run whose process identity
 * still matches is killed by process group, and every one is `interrupted`. Neither consumes an
 * attempt; their claims are released. Each is charged its full budget on the day it started, as a
 * run with no result line is (design section 9.6), so a daemon that restarts in a loop cannot spend
 * past the day's or the re-triage budget.
 * @param {any} state the daemon state
 * @param {{now: Date, bootId?: string, killGraceMs?: number}} options the clock and the current
 *   boot id
 * @returns {{lost: string[], interrupted: string[], killed: string[]}} what happened to each run
 */
export function recoverRuns(state, { now, bootId = currentBootId(), killGraceMs = KILL_GRACE_MS }) {
    const out = { lost: [], interrupted: [], killed: [] };
    for (const [id, run] of Object.entries(state.runs ?? {})) {
        if (run.status !== "running") continue;
        if (!run.process || run.process.bootId !== bootId) {
            run.status = "lost";
            out.lost.push(id);
        } else {
            if (sameProcess(run.process, { cmdlineIncludes: id })) {
                killGroup(run.process.pid, killGraceMs);
                out.killed.push(id);
            }
            run.status = "interrupted";
            out.interrupted.push(id);
        }
        run.outcome = run.status;
        run.endedAt = now.toISOString();
        run.costUsd = run.budgetUsd ?? 0;
        charge(state, run.kind ?? "", String(run.startedAt ?? run.endedAt).slice(0, 10), run.costUsd);
        releaseRun(state, id);
    }
    return out;
}

/**
 * Adds a run's cost to the day's spend: `spendRetriage` for re-triage kinds, `spend` otherwise.
 * @param {any} state the daemon state
 * @param {string} kind the run kind
 * @param {string} day `YYYY-MM-DD`
 * @param {number} usd the cost
 */
function charge(state, kind, day, usd) {
    const bucket = isRetriage(kind) ? "spendRetriage" : "spend";
    state[bucket] ??= {};
    state[bucket][day] = Math.round(((state[bucket][day] ?? 0) + usd) * 1e6) / 1e6;
}

/**
 * Whether `path` is `dir` or inside it.
 * @param {string} dir the directory
 * @param {string} path the path
 * @returns {boolean} true when inside
 */
function inside(dir, path) {
    const rel = relative(dir, path);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * @typedef {object} RunRequest
 * @property {string} kind the run kind
 * @property {string} event what started it
 * @property {string} target the target, for example `pr:704` or `master`
 * @property {string} prompt the prompt text (`buildPrompt`)
 * @property {string} [cwd] the githerd-owned worktree of a code-editing kind; read-only kinds work
 *   in `runs/<id>/work/`
 * @property {number} [timeoutMs] overrides the kind's `timeoutMinutes`
 * @property {string[]} [batch] further `issue:N` / `pr:N` targets the run's write tools may touch
 * @property {string} [greenSha] the verified green SHA the run was given
 * @property {string} [incident] the open incident, for a master-red run
 * @property {{dir: string, branch: string, pushBranch: string, base: string, prBranch?: string | null}} [worktree]
 *   the githerd-owned worktree (`createWorktree`), which `githerd_finish_branch` pushes from
 */

/**
 * Creates the runner of one daemon.
 * @param {object} options what it runs with
 * @param {string} options.stateDir the .githerd directory
 * @param {any} options.state the live daemon state (`runs`, `spend`, `spendRetriage`, claims and
 *   escalations are written here)
 * @param {() => any} options.config the current normalized config
 * @param {() => string} options.mode the current effective mode
 * @param {string} options.daemonUrl the daemon's URL, for the run's MCP launcher
 * @param {string} options.gitconfig the run git config file (`writeRunGitconfig`)
 * @param {string[]} [options.claude] the claude command
 * @param {string} [options.packageDir] the githerd copy whose launcher and guard runs use
 * @param {Record<string, string | undefined>} [options.env] the daemon's environment
 * @param {string | null} [options.gpgAgentSocket] the gpg-agent socket sandboxed commits may use
 * @param {(args: string[]) => Promise<any>} [options.servherd] runs servherd with `--json` and
 *   returns its data; without it the leftover check is skipped
 * @param {(entry: any) => Promise<void> | void} [options.ledger] appends a ledger line
 * @param {() => Promise<void> | void} [options.save] persists the state
 * @param {(level: string, text: string) => void} [options.log] the daemon log
 * @param {() => Date} [options.now] the clock
 * @param {number} [options.killGraceMs] SIGTERM to SIGKILL delay
 * @param {() => string[]} [options.sandboxMissing] the sandbox commands this machine lacks; a
 *   code-editing run is refused while any is missing
 * @returns {{start: (req: RunRequest) => {ok: false, reason: string} | {ok: true, id: string,
 *   done: Promise<any>}, shutdown: () => Promise<void>, inFlight: () => string[]}} the runner
 */
export function createRunner({
    stateDir,
    state,
    config,
    mode,
    daemonUrl,
    gitconfig,
    claude = ["claude"],
    packageDir = PACKAGE_DIR,
    env = process.env,
    gpgAgentSocket = join(homedir(), ".gnupg", "S.gpg-agent"),
    servherd,
    ledger = () => {},
    save = () => {},
    log = () => {},
    now = () => new Date(),
    killGraceMs = KILL_GRACE_MS,
    sandboxMissing: missingSandbox = () => sandboxMissing(env.PATH),
}) {
    /** @type {Map<string, {kill: (why: string) => void, interrupt: () => void, done: Promise<any>}>} */
    const live = new Map();
    const npmrc = join(stateDir, "run-npmrc");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(npmrc, "");

    /**
     * A fresh run id, `run-YYYYMMDD-NNNN-xx`.
     * @param {Date} at the current time
     * @returns {string} the id
     */
    function newId(at) {
        const day = at.toISOString().slice(0, 10).replaceAll("-", "");
        const n = Object.keys(state.runs).filter((id) => id.startsWith(`run-${day}-`)).length + 1;
        return `run-${day}-${String(n).padStart(4, "0")}-${randomBytes(1).toString("hex")}`;
    }

    /**
     * Admits, prepares and spawns a run. Admission and the `running` record happen before anything
     * asynchronous, so two runs admitted together are both counted.
     * @param {RunRequest} req the run
     * @returns {{ok: false, reason: string} | {ok: true, id: string, done: Promise<any>}} the answer;
     *   `done` resolves with the final run record
     */
    function start(req) {
        const cfg = config();
        const at = now();
        state.runs ??= {};
        if (CODE_EDITING.has(req.kind)) {
            const missing = missingSandbox();
            if (missing.length) {
                return {
                    ok: false,
                    reason: `code-editing runs are off: no Bash sandbox (${missing.join(", ")} not installed)`,
                };
            }
        }
        const admitted = admit(state, cfg, mode(), req.kind, at);
        if (!admitted.ok) return /** @type {{ok: false, reason: string}} */ (admitted);
        const caps = capsFor(cfg, req.kind);
        const id = newId(at);
        const runDir = join(stateDir, "runs", id);
        const cwd = CODE_EDITING.has(req.kind) ? req.cwd : join(runDir, "work");
        if (!cwd) throw new Error(`${req.kind} runs need a worktree`);
        mkdirSync(join(runDir, "work"), { recursive: true });
        const token = randomBytes(32).toString("hex");

        writeFileSync(
            join(runDir, "mcp.json"),
            JSON.stringify(
                {
                    mcpServers: {
                        githerd: {
                            command: process.execPath,
                            args: [join(packageDir, "bin", "githerd-mcp.mjs")],
                            env: { GITHERD_URL: daemonUrl, GITHERD_RUN_ID: id, GITHERD_RUN_TOKEN: token },
                        },
                    },
                },
                null,
                2,
            ),
        );
        const guard = [process.execPath, join(packageDir, "bin", "githerd-guard.mjs")];
        writeFileSync(
            join(runDir, "settings.json"),
            JSON.stringify(
                runSettings({ kind: req.kind, guard, gpgAgentSocket, stateDir: resolve(stateDir) }),
                null,
                2,
            ),
        );
        writeFileSync(join(runDir, "result.schema.json"), JSON.stringify(RESULT_SCHEMA, null, 2));
        writeFileSync(join(runDir, "prompt.md"), req.prompt);
        // The guard hook reads this file and nothing else from githerd.
        writeFileSync(
            join(runDir, "guard.json"),
            JSON.stringify({ kind: req.kind, root: cwd, protectedPaths: cfg.protectedPaths }, null, 2),
        );
        const childEnv = runEnv(env, {
            gitconfig,
            npmrc,
            run: { GITHERD_RUN_ID: id, GITHERD_RUN_DIR: runDir, GITHERD_RUN_KIND: req.kind },
        });
        writeFileSync(join(runDir, "env.json"), JSON.stringify(childEnv, null, 2));

        const argv = [...claude, ...runArgv({ kind: req.kind, config: cfg, runDir, prompt: req.prompt })];
        const child = spawn(argv[0], argv.slice(1), {
            cwd,
            env: childEnv,
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        const record = {
            id,
            kind: req.kind,
            event: req.event,
            target: req.target,
            cwd,
            startedAt: at.toISOString(),
            endedAt: null,
            process: child.pid ? identify(child.pid) : null,
            status: "running",
            outcome: null,
            numTurns: null,
            costUsd: null,
            budgetUsd: caps.budgetUsd,
            denials: [],
            structured: null,
            sessionId: null,
            tokenHash: hashToken(token),
            batch: req.batch ?? [],
            greenSha: req.greenSha ?? null,
            incident: req.incident ?? null,
            worktree: req.worktree ?? null,
        };
        state.runs[id] = record;
        void ledger({ kind: "run-start", run: id, runKind: req.kind, event: req.event, target: req.target });

        /** @type {string | null} */
        let killed = null;
        let initSeen = false;
        /** @type {any} */
        let result = null;
        const kill = (/** @type {string} */ why) => {
            if (killed || !child.pid) return;
            killed = why;
            killGroup(child.pid, killGraceMs);
        };
        const timer = setTimeout(() => kill("timeout"), req.timeoutMs ?? caps.timeoutMinutes * 60_000);
        timer.unref();

        const streamFile = join(runDir, "stream.jsonl");
        let pending = "";
        const onLine = (/** @type {string} */ text) => {
            let line;
            try {
                line = JSON.parse(text);
            } catch {
                return;
            }
            if (line.type === "system" && line.subtype === "init") {
                initSeen = true;
                const why = checkInit(line, req.kind);
                if (why) {
                    log("error", `${id}: init mismatch: ${why}`);
                    kill("init-mismatch");
                }
                record.sessionId = line.session_id ?? null;
            } else if (backgrounds(line)) {
                kill("backgrounded");
            } else if (line.type === "result") {
                if (!initSeen) kill("init-mismatch");
                result = line;
            }
        };
        child.stdout.on("data", (chunk) => {
            appendFileSync(streamFile, chunk);
            pending += chunk;
            const lines = pending.split("\n");
            pending = /** @type {string} */ (lines.pop());
            for (const l of lines) if (l.trim()) onLine(l);
        });
        child.stderr.on("data", (chunk) => {
            appendFileSync(streamFile, chunk);
            // Claude Code's own word that Bash will run unsandboxed.
            if (CODE_EDITING.has(req.kind) && String(chunk).includes("Sandbox disabled")) kill("sandbox-disabled");
        });

        const done = new Promise((resolve) => {
            child.on("error", (err) => {
                log("error", `${id}: spawn failed: ${err.message}`);
                resolve(undefined);
            });
            child.on("exit", () => {
                // Anything the run left behind in its group goes with it.
                if (child.pid) signal(child.pid, "SIGKILL");
            });
            child.on("close", () => resolve(undefined));
        }).then(() => finish());

        /**
         * The shutdown path: kills the run and records it `interrupted` at once, charged its full
         * budget, without waiting for the process to close. `finish` then leaves the record alone.
         */
        function interrupt() {
            kill("interrupted");
            clearTimeout(timer);
            const end = now();
            Object.assign(record, {
                status: "interrupted",
                outcome: "interrupted",
                endedAt: end.toISOString(),
                costUsd: caps.budgetUsd,
            });
            charge(state, req.kind, end.toISOString().slice(0, 10), record.costUsd);
            releaseRun(state, id);
            live.delete(id);
            void ledger({
                kind: "run-end",
                run: id,
                outcome: "interrupted",
                status: "interrupted",
                cost: record.costUsd,
            });
        }

        /**
         * Records the run's end: outcome, spend, denials, escalations, result.json and the ledger.
         * @returns {Promise<any>} the record
         */
        async function finish() {
            clearTimeout(timer);
            if (record.status !== "running") return record;
            if (pending.trim()) onLine(pending);
            const end = now();
            const { status, outcome } = classify({ killed, result });
            record.status = status;
            record.outcome = outcome;
            record.endedAt = end.toISOString();
            record.numTurns = result?.num_turns ?? null;
            record.sessionId = result?.session_id ?? record.sessionId;
            record.structured = result?.structured_output ?? null;
            record.costUsd = typeof result?.total_cost_usd === "number" ? result.total_cost_usd : caps.budgetUsd;
            charge(state, req.kind, end.toISOString().slice(0, 10), record.costUsd);

            const guarded = readJsonLines(join(runDir, "denials.jsonl"));
            record.denials = [
                ...(result?.permission_denials ?? []).map((d) => ({ source: "permission", ...d })),
                ...guarded.map((d) => ({ source: "guard", ...d })),
            ];
            const caller = { daemon: true };
            if (record.denials.length) {
                escalate(
                    state,
                    {
                        key: `denied:${id}`,
                        kind: "denied",
                        target: req.target,
                        summary: `${req.kind} run ${id} on ${req.target} was denied ${record.denials.length} tool call(s)`,
                        detail: JSON.stringify(record.denials).slice(0, 2000),
                    },
                    caller,
                    end,
                );
            }
            if (status === "failed") {
                escalate(
                    state,
                    {
                        key: `run-failed:${id}`,
                        kind: "run-failed",
                        target: req.target,
                        summary: `${req.kind} run ${id} on ${req.target} failed: ${outcome}`,
                    },
                    caller,
                    end,
                );
            }
            releaseRun(state, id);
            await leftovers(cwd);
            const shown = { ...record };
            delete shown.tokenHash;
            writeFileSync(join(runDir, "result.json"), JSON.stringify(shown, null, 2));
            live.delete(id);
            await ledger({
                kind: "run-end",
                run: id,
                outcome,
                status,
                cost: record.costUsd,
                denials: record.denials.length,
                summary: typeof record.structured?.summary === "string" ? record.structured.summary : null,
                untrusted: true,
            });
            await save();
            return record;
        }

        live.set(id, { kill, interrupt, done });
        void save();
        return { ok: true, id, done };
    }

    /**
     * Removes any servherd entry whose cwd is inside the run's working directory. Runs are told not
     * to start servers and the guard denies it, so this should never find one.
     * @param {string} cwd the run's working directory
     * @returns {Promise<void>}
     */
    async function leftovers(cwd) {
        if (!servherd) return;
        try {
            const data = await servherd(["list"]);
            for (const { server } of data?.servers ?? []) {
                if (server?.cwd && inside(cwd, server.cwd)) {
                    log("error", `servherd server ${server.name} was left by a run in ${cwd}; removing it`);
                    await ledger({ kind: "error", op: "servherd-leftover", name: server.name, cwd: server.cwd });
                    // -f skips servherd's confirmation prompt, which would hang a daemon with no terminal.
                    await servherd(["remove", server.name, "-f"]);
                }
            }
        } catch (err) {
            log("error", `servherd leftover check: ${err.message}`);
        }
    }

    /**
     * Sends SIGTERM to every run in flight and records it `interrupted` (it consumes no attempt),
     * without waiting for the processes to close: the daemon must save and exit within 1.5 s
     * (design section 3.2). A process that outlives the daemon is killed by the next one's
     * `recoverRuns`.
     * @returns {Promise<void>} resolves once every run is recorded
     */
    async function shutdown() {
        for (const r of [...live.values()]) r.interrupt();
    }

    return { start, shutdown, inFlight: () => [...live.keys()] };
}

/**
 * Reads a JSON-lines file, skipping unparseable lines.
 * @param {string} file the file
 * @returns {any[]} the entries; none when the file is missing
 */
function readJsonLines(file) {
    let text;
    try {
        text = readFileSync(file, "utf8");
    } catch {
        return [];
    }
    return text
        .split("\n")
        .filter(Boolean)
        .flatMap((l) => {
            try {
                return [JSON.parse(l)];
            } catch {
                return [{ raw: l.slice(0, 500) }];
            }
        });
}
