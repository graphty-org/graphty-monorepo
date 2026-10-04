/**
 * What a worker session starts with (design sections 7.1 and 7.2): its generated `settings.json`
 * and `mcp.json` under `jobs/<id>/`, its `env -i` environment, and the command line that puts them
 * together. Nothing here writes to `~/.claude`; the owner's user settings are only read, for the
 * git signing variables.
 *
 * The generated settings merge with the owner's user settings, and their deny rules win over his
 * allow-all (platform facts 10.1). The main checkout's `.claude/settings.local.json` applies in
 * every worktree too, so everything that matters is set here or on the command line.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The models a worker may run on; the same allow list as the config's (design section 2). */
const WORKER_MODELS = new Set(["claude-opus-5-5", "claude-fable-5"]);

/** Allowed for every worker, so these never raise a permission prompt (platform facts 10.1). */
const ALLOW = ["mcp__githerd__*", "Bash(gh pr create:*)", "Bash(gh pr edit:*)"];

/**
 * Tools a worker never has, and the paths it never edits. Path rules are `Edit(...)` rules, which
 * cover the Write tool too; `Write(...)` rules are ignored (platform facts 10). A plain path is
 * relative to the session's working directory, the job's worktree.
 */
const DENY = [
    "AskUserQuestion",
    "Workflow",
    "Edit(visual-baselines/**)",
    "Edit(githerd/**)",
    "Edit(.claude/**)",
    "Edit(.github/workflows/**)",
    "Edit(.husky/**)",
    "Edit(tools/prepush.sh)",
    "Edit(~/.githerd/**)",
];

/**
 * The owner's plugins that demand interaction with the user, turned off in workers: Discord would
 * bring the owner's chat messages into a worker, and superpowers' skills stop to ask the user
 * questions (design section 3.10).
 */
const INTERACTIVE_PLUGINS = ["discord@claude-plugins-official", "superpowers@claude-plugins-official"];

/** Variables passed through from the daemon's environment, when set. */
const PASSED = ["HOME", "USER", "LANG", "SSH_AUTH_SOCK"];

/** Seconds a hook may run; it gives the daemon 2 s and then spools (design section 4.10). */
const HOOK_TIMEOUT_S = 10;

/**
 * One permission rule: a tool name (an MCP server's tools as `mcp__<server>__*`), optionally with a
 * parenthesized specifier on one line.
 */
const RULE = /^[A-Za-z_][\w-]*\*?(?:\([^\n()]+\))?$/;

/** Marks the PATH line in the login shell's output, which its startup files may add lines to. */
const PATH_MARK = "@@githerd-path=";

/**
 * Checks one rule of the runtime allow overlay (`githerd answer <item> allow`).
 * @param {unknown} rule the rule
 * @returns {string} the rule
 * @throws {Error} when it is not a single permission rule in plain ASCII
 */
export function checkAllowRule(rule) {
    if (typeof rule !== "string" || !RULE.test(rule) || /[^\x20-\x7e]/.test(rule)) {
        throw new Error(`not a permission rule: ${JSON.stringify(rule)}`);
    }
    return rule;
}

/**
 * Single-quotes a word for a hook's shell command line.
 * @param {string} word the word
 * @returns {string} the quoted word
 */
function shellQuote(word) {
    return `'${word.replaceAll("'", QUOTE_IN_QUOTES)}'`;
}

/** A single quote inside a single-quoted shell word: close, escaped quote, reopen. */
const QUOTE_IN_QUOTES = String.raw`'\''`;

/**
 * A hook entry that runs one of the installed githerd scripts.
 * @param {string} script the script's absolute path
 * @param {string[]} args its arguments
 * @param {"open" | "closed"} missing what happens when githerd is not installed: `open` exits 0
 *   silently, `closed` refuses the tool call (exit 2) so a missing guard never allows anything
 * @returns {object} the hook entry
 */
function hookEntry(script, args, missing) {
    const absent = missing === "open" ? "exit 0" : "{ echo 'githerd guard is not installed' >&2; exit 2; }";
    const command = [`f=${shellQuote(script)}`, `[ -f "$f" ] || ${absent}`, ['exec node "$f"', ...args].join(" ")];
    return { type: "command", command: command.join("; "), timeout: HOOK_TIMEOUT_S };
}

/**
 * A worker's `settings.json` (design section 7.2).
 * @param {{stateDir: string, jobDir: string, overlay?: string[]}} options githerd's state
 *   directory (absolute), whose `current/` holds the installed githerd, the job's directory, which
 *   the guard reads its `guard.json` from and writes its logs to, and the runtime allow overlay
 * @returns {object} the settings
 */
export function workerSettings({ stateDir, jobDir, overlay = [] }) {
    const bin = join(stateDir, "current", "bin");
    const hook = (/** @type {string} */ event) => [hookEntry(join(bin, "githerd-hook.mjs"), [event], "open")];
    const guardArgs = [shellQuote(jobDir)];
    const guard = [hookEntry(join(bin, "githerd-guard.mjs"), guardArgs, "closed")];
    // Counting subagents in and out must not fail closed: exit 2 at SubagentStop would keep a
    // subagent from stopping.
    const count = [hookEntry(join(bin, "githerd-guard.mjs"), guardArgs, "open")];
    return {
        permissions: { allow: [...new Set([...ALLOW, ...overlay.map(checkAllowRule)])], deny: DENY },
        enabledPlugins: Object.fromEntries(INTERACTIVE_PLUGINS.map((p) => [p, false])),
        promptSuggestionEnabled: false,
        // The project's `.mcp.json` registers githerd for owner sessions; unapproved, it opens a
        // "New MCP server found" dialog in every fresh worktree. Workers get theirs from mcp.json.
        disabledMcpjsonServers: ["githerd"],
        hooks: {
            SessionStart: [{ hooks: hook("SessionStart") }],
            UserPromptSubmit: [{ hooks: hook("UserPromptSubmit") }],
            Stop: [{ hooks: hook("Stop") }],
            StopFailure: [{ hooks: hook("StopFailure") }],
            Notification: [{ matcher: "permission_prompt", hooks: hook("Notification") }],
            PreToolUse: [{ matcher: "Bash|Edit|Write|MultiEdit|NotebookEdit|Agent", hooks: guard }],
            // The guard counts subagents in and out by id (design section 10.1).
            PostToolUse: [{ hooks: hook("PostToolUse") }, { matcher: "Agent", hooks: count }],
            SubagentStart: [{ hooks: count }],
            SubagentStop: [{ hooks: count }],
        },
    };
}

/**
 * A worker's `mcp.json`: only the installed githerd MCP server. The worker's environment
 * (`GITHERD_JOB`) tells the server which job it serves.
 * @param {{stateDir: string}} options githerd's state directory (absolute)
 * @returns {object} the MCP configuration
 */
function workerMcp({ stateDir }) {
    return {
        mcpServers: { githerd: { command: "node", args: [join(stateDir, "current", "bin", "githerd-mcp.mjs")] } },
    };
}

/**
 * Writes a job's generated files, `settings.json` and `mcp.json`, into its directory.
 * @param {string} jobDir `jobs/<id>/` under the state directory
 * @param {{stateDir: string, overlay?: string[]}} options as for {@link workerSettings}
 * @returns {{settings: string, mcp: string}} the files' paths
 */
export function writeJobFiles(jobDir, options) {
    mkdirSync(jobDir, { recursive: true });
    const files = { settings: join(jobDir, "settings.json"), mcp: join(jobDir, "mcp.json") };
    writeFileSync(files.settings, `${JSON.stringify(workerSettings({ ...options, jobDir }), null, 4)}\n`);
    writeFileSync(files.mcp, `${JSON.stringify(workerMcp(options), null, 4)}\n`);
    return files;
}

/**
 * The git signing variables the owner's user settings set for every Claude session
 * (`GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_n`, `GIT_CONFIG_VALUE_n`). Without them git signs with his
 * gpg key, whose pinentry cannot run without a terminal (platform facts 8.6).
 * @param {any} userSettings the parsed `~/.claude/settings.json`
 * @returns {Record<string, string>} the variables; empty when the settings set none
 * @throws {Error} when the count or one of its pairs is malformed
 */
export function signingEnv(userSettings) {
    const env = userSettings?.env ?? {};
    if (env.GIT_CONFIG_COUNT === undefined) return {};
    const count = Number(env.GIT_CONFIG_COUNT);
    if (!Number.isInteger(count) || count < 0 || count > 100) {
        throw new Error(`GIT_CONFIG_COUNT is not a small count: ${JSON.stringify(env.GIT_CONFIG_COUNT)}`);
    }
    /** @type {Record<string, string>} */
    const out = { GIT_CONFIG_COUNT: String(count) };
    for (let n = 0; n < count; n++) {
        for (const name of [`GIT_CONFIG_KEY_${n}`, `GIT_CONFIG_VALUE_${n}`]) {
            if (typeof env[name] !== "string") throw new Error(`${name} is missing from the user settings`);
            out[name] = env[name];
        }
    }
    return out;
}

/**
 * Reads the signing variables from the owner's user settings.
 * @param {string} home the owner's home directory
 * @returns {Record<string, string>} the variables; empty when the file or the variables are absent
 */
export function readSigningEnv(home) {
    let text;
    try {
        text = readFileSync(join(home, ".claude", "settings.json"), "utf8");
    } catch (err) {
        if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") return {};
        throw err;
    }
    return signingEnv(JSON.parse(text));
}

/**
 * The PATH of the owner's interactive login shell, under a clean environment. An interactive
 * shell, because the owner's `~/.bashrc` adds pnpm and the npm global directory only for
 * interactive shells; only the PATH line is taken, so nothing else the startup files export reaches
 * a worker.
 * @param {{shell: string, home: string, user?: string, lang?: string}} owner the login shell and
 *   the variables it starts with
 * @returns {string} the PATH
 * @throws {Error} when the shell prints no PATH
 */
export function loginPath({ shell, home, user = "", lang = "C.UTF-8" }) {
    const out = execFileSync(shell, ["-ilc", String.raw`printf '\n${PATH_MARK}%s\n' "$PATH"`], {
        env: { HOME: home, USER: user, LANG: lang, TERM: "dumb" },
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
        timeout: 10_000,
    });
    const line = out.split("\n").findLast((l) => l.startsWith(PATH_MARK));
    if (!line || line.length === PATH_MARK.length) throw new Error(`${shell} printed no PATH`);
    return line.slice(PATH_MARK.length);
}

/**
 * A worker's environment for `env -i` (design section 7.1): a few variables from the daemon's own,
 * the login PATH, the signing variables and the job's two, and nothing else, so the Pushover keys
 * and stale Claude variables servherd's pm2 carries never reach a worker (platform facts 7.2).
 * @param {{env: Record<string, string | undefined>, path: string, signing: Record<string, string>,
 *   job: string, nonce: string}} options the daemon's environment, the login PATH, the signing
 *   variables, the job id and its doorbell nonce
 * @returns {Record<string, string>} the environment
 */
export function workerEnv({ env, path, signing, job, nonce }) {
    /** @type {Record<string, string>} */
    const out = {};
    for (const name of PASSED) if (env[name] !== undefined) out[name] = /** @type {string} */ (env[name]);
    out.TERM = "xterm-256color";
    out.PATH = path;
    for (const [name, value] of Object.entries(signing)) {
        if (!/^GIT_CONFIG_(COUNT|KEY_\d+|VALUE_\d+)$/.test(name)) throw new Error(`${name} is not a signing variable`);
        out[name] = value;
    }
    out.GITHERD_JOB = job;
    out.GITHERD_NONCE = nonce;
    return out;
}

/**
 * The worker's command line, from `env -i` to the launch prompt (design section 7.1); tmux runs it
 * as the window's command.
 * @param {{env: Record<string, string>, model: string, job: string, jobDir: string, prompt: string,
 *   resume?: string | null}} options the environment from {@link workerEnv}, the model, the job id,
 *   its directory with the generated files, the launch prompt, and the session a dead worker's next
 *   session resumes (design 7.7)
 * @returns {string[]} the argument vector
 * @throws {Error} when the model is not one a worker may use
 */
export function workerArgv({ env, model, job, jobDir, prompt, resume = null }) {
    if (!WORKER_MODELS.has(model)) throw new Error(`a worker runs on ${[...WORKER_MODELS].join(" or ")}, not ${model}`);
    return [
        "env",
        "-i",
        ...Object.entries(env).map(([name, value]) => `${name}=${value}`),
        "claude",
        "--model",
        model,
        "-n",
        `githerd-${job}`,
        "--permission-mode",
        "default",
        ...(resume ? ["--resume", resume] : []),
        "--settings",
        join(jobDir, "settings.json"),
        "--mcp-config",
        join(jobDir, "mcp.json"),
        // `--mcp-config` takes several files and would swallow the prompt as one; `--` ends it.
        "--",
        prompt,
    ];
}
