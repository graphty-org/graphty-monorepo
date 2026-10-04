#!/usr/bin/env node
/**
 * The PreToolUse hook of a judgment run (design section 9.4). Claude Code runs it before every
 * Bash, Edit and Write call with the call as JSON on stdin; exit 0 allows the call and exit 2
 * denies it, with the reason on stderr, which Claude Code shows the run.
 *
 * It reads `$GITHERD_RUN_DIR/guard.json`, written by the runner: `{kind, root, protectedPaths}`,
 * where `root` is the run's working directory. Every denial is appended to
 * `$GITHERD_RUN_DIR/denials.jsonl`. Any error -- malformed input, a missing variable, an unreadable
 * file -- denies. It makes no network calls.
 *
 * The guard is defense in depth, not the boundary: runs hold no credential, and the actor checks
 * everything before it leaves the machine. The guard turns the common mistakes into clear denials.
 */

import { appendFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { baseName, splitCommands } from "../lib/shellwords.mjs";
import { checkOutgoing } from "../lib/text.mjs";

/** @typedef {import("../lib/shellwords.mjs").SimpleCommand} SimpleCommand */
/** @typedef {{kind: string, root: string, protectedPaths: string[]}} GuardConfig */

/** git subcommands a run never uses. */
const GIT_DENIED = new Set(["push", "stash", "reset", "switch", "restore", "clean", "rebase"]);

/** Programs a run never starts: remote access, privilege, and anything that outlives the run. */
const PROGRAM_DENIED = {
    gh: "the GitHub CLI is not available to runs; use the githerd tools",
    hub: "the GitHub CLI is not available to runs; use the githerd tools",
    ssh: "runs have no remote access",
    scp: "runs have no remote access",
    sftp: "runs have no remote access",
    sudo: "runs never use sudo",
    su: "runs never use sudo",
    servherd: "runs never start servers",
    pm2: "runs never start servers",
    nohup: "runs never start detached processes",
    setsid: "runs never start detached processes",
    disown: "runs never start detached processes",
    screen: "runs never start detached processes",
    tmux: "runs never start detached processes",
    storybook: "runs never start servers",
};

/** githerd CLI commands that start, restart or reconfigure a daemon through servherd. */
const GITHERD_SERVICE = new Set(["install", "ensure", "restart", "dev"]);

/**
 * The githerd CLI command a call runs (`githerd <verb>`, `githerd.mjs <verb>` or
 * `node [options] .../githerd.mjs <verb>`), or null when it is not the githerd CLI.
 * @param {string} name the program's base name
 * @param {string[]} args its arguments
 * @returns {string | null} the verb
 */
function githerdVerb(name, args) {
    let rest = args;
    if (name === "node") {
        const script = args.findIndex((a) => !a.startsWith("-"));
        if (script === -1 || baseName(args[script]) !== "githerd.mjs") return null;
        rest = args.slice(script + 1);
    } else if (name !== "githerd" && name !== "githerd.mjs") return null;
    return rest.find((a) => !a.startsWith("-")) ?? null;
}

/** A package script that starts a server or a watcher. */
const SERVER_SCRIPT = /(^dev)|(storybook)|((^|:)(dev|serve|preview|start|watch)(:|$))/;

/** Package-manager options that take the next word as their value. */
const PM_VALUE_OPTIONS = new Set(["-C", "--dir", "--prefix", "--filter", "-F", "--workspace", "--cwd"]);

/** git global options that take the next word as their value. */
const GIT_VALUE_OPTIONS = new Set([
    "-C",
    "-c",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--super-prefix",
    "--config-env",
]);

class Denied extends Error {}

/**
 * Denies the call.
 * @param {string} reason why
 * @returns {never} always throws
 */
function deny(reason) {
    throw new Denied(reason);
}

/**
 * Whether a path, relative to the run's root, is under a protected path. An entry ending in `/` is
 * a directory; any other entry is one file.
 * @param {string} rel the path relative to the root
 * @param {string[]} list the protected paths
 * @returns {boolean} true when protected
 */
function isProtected(rel, list) {
    const p = rel.split("\\").join("/");
    return list.some((entry) => (entry.endsWith("/") ? p === entry.slice(0, -1) || p.startsWith(entry) : p === entry));
}

/**
 * The git directory of a working tree: `.git` itself, or the directory a worktree's `.git` file
 * names.
 * @param {string} root the working tree
 * @returns {string} the git directory
 */
function gitDir(root) {
    const dotGit = join(root, ".git");
    if (statSync(dotGit).isDirectory()) return dotGit;
    const target = readFileSync(dotGit, "utf8")
        .replace(/^gitdir:\s*/, "")
        .trim();
    return isAbsolute(target) ? target : resolve(root, target);
}

/**
 * Checks one simple command.
 * @param {SimpleCommand} cmd the command
 * @param {GuardConfig} config the run's guard settings
 * @param {string} cwd the run's current directory
 */
function checkCommand(cmd, config, cwd) {
    if (cmd.background) deny("runs never start background processes (a command ending in &)");
    const name = baseName(cmd.argv[0]).replace(/(.)@[^/]*$/, "$1"); // NOSONAR(S5852): one command word, a few dozen characters
    const args = cmd.argv.slice(1);
    if (PROGRAM_DENIED[name]) deny(`${name}: ${PROGRAM_DENIED[name]}`);
    const verb = githerdVerb(name, args);
    if (verb && GITHERD_SERVICE.has(verb)) deny(`githerd ${verb}: runs never start servers`);
    if ((name === "curl" || name === "wget") && args.some((a) => /github\.com/i.test(a))) {
        deny(`${name} to GitHub: runs never call GitHub directly; use the githerd tools`);
    }
    if (name === "git") checkGit(cmd, args, config, cwd);
    else if (name === "npx" || name === "pnpx" || name === "bunx") checkInner(args, config, cwd, cmd);
    else if (name === "npm" || name === "pnpm" || name === "yarn") checkPackageManager(cmd, args, config, cwd);
    else if (name === "nx") checkNx(args);
    else if ((name === "vite" || name === "vitepress") && !args.includes("build")) {
        deny(`${name}: runs never start servers`);
    } else if (name === "find") {
        args.forEach((a, k) => {
            if (a === "-exec" || a === "-execdir" || a === "-ok") {
                const end = args.findIndex((b, m) => m > k && (b === ";" || b === "+"));
                checkCommand({ ...cmd, argv: args.slice(k + 1, end === -1 ? undefined : end) }, config, cwd);
            }
        });
    }
}

/**
 * Checks the command that `npx`, `pnpm exec` and the like run, after their own options.
 * @param {string[]} args the words after the launcher
 * @param {GuardConfig} config the run's guard settings
 * @param {string} cwd the current directory
 * @param {SimpleCommand} cmd the launching command
 */
function checkInner(args, config, cwd, cmd) {
    let k = 0;
    while (k < args.length && args[k].startsWith("-")) {
        if (args[k] === "-c" || args[k] === "--call") {
            for (const inner of splitCommands(args[k + 1] ?? "")) checkCommand(inner, config, cwd);
            return;
        }
        k += args[k] === "-p" || args[k] === "--package" ? 2 : 1;
    }
    if (k < args.length) checkCommand({ ...cmd, argv: args.slice(k) }, config, cwd);
}

/**
 * npm, pnpm and yarn: no publishing, no server scripts, and what `exec` or `dlx` runs.
 * @param {SimpleCommand} cmd the command
 * @param {string[]} args its arguments
 * @param {GuardConfig} config the run's guard settings
 * @param {string} cwd the current directory
 */
function checkPackageManager(cmd, args, config, cwd) {
    let k = 0;
    while (k < args.length && args[k].startsWith("-")) k += PM_VALUE_OPTIONS.has(args[k]) ? 2 : 1;
    const sub = args[k];
    if (sub === undefined) return;
    if (sub === "publish" || args.includes("publish")) deny("runs never publish packages");
    if (sub === "exec" || sub === "dlx" || sub === "x") {
        checkInner(args.slice(k + 1), config, cwd, cmd);
        return;
    }
    const script =
        sub === "run" || sub === "run-script" || sub === "rs" ? args.slice(k + 1).find((a) => !a.startsWith("-")) : sub;
    if (script !== undefined && SERVER_SCRIPT.test(script)) deny(`${script}: runs never start servers or watchers`);
    if (baseName(cmd.argv[0]) !== "npm" && script === sub) checkInner(args.slice(k), config, cwd, cmd);
}

/**
 * nx: no releases, no server targets.
 * @param {string[]} args the arguments
 */
function checkNx(args) {
    const words = args.filter((a) => !a.startsWith("-"));
    if (words[0] === "release") deny("runs never release");
    const targets = [];
    if (words[0] === "run") targets.push(...words.slice(1).map((w) => w.split(":")[1] ?? ""));
    else if (words[0] !== "run-many" && words[0] !== "affected") targets.push(words[0] ?? "");
    args.forEach((a, k) => {
        if (a === "-t" || a === "--target" || a === "--targets") targets.push(...(args[k + 1] ?? "").split(","));
        else if (/^--targets?=/.test(a)) targets.push(...a.split("=")[1].split(","));
    });
    const server = targets.find((t) => /^(dev|storybook|serve|preview)/.test(t));
    if (server) deny(`nx ${server}: runs never start servers`);
}

/**
 * Checks a git command.
 * @param {SimpleCommand} cmd the command
 * @param {string[]} args the words after `git`
 * @param {GuardConfig} config the run's guard settings
 * @param {string} cwd the current directory
 */
function checkGit(cmd, args, config, cwd) {
    if (cmd.assign.some((a) => a.startsWith("GIT_CONFIG"))) deny("git: GIT_CONFIG variables are not allowed in runs");
    const { k, dir, settings } = gitOptions(args, cwd);
    for (const setting of settings) checkGitSetting(setting);
    const sub = args[k];
    const rest = args.slice(k + 1);
    if (sub === undefined) return;
    if (GIT_DENIED.has(sub)) deny(`git ${sub}: runs never use git ${sub}`);
    if (sub.startsWith("credential")) deny("git credential: runs have no credentials");
    if (sub === "config") rest.forEach((r) => checkGitSetting(`${r}=`));
    if (sub === "checkout") checkCheckout(rest, config, dir);
    if (rest.includes("--no-gpg-sign")) deny(`git ${sub} --no-gpg-sign: every commit is signed`);
    if (sub === "commit" || sub === "merge") checkGitMessage(cmd, sub, rest, dir);
}

/**
 * Reads git's global options: the directory `-C` moves to and the settings `-c` and
 * `--config-env` give.
 * @param {string[]} args the words after `git`
 * @param {string} cwd the current directory
 * @returns {{k: number, dir: string, settings: string[]}} the subcommand's index, the directory and
 *   the settings
 */
function gitOptions(args, cwd) {
    let k = 0;
    let dir = cwd;
    /** @type {string[]} */
    const settings = [];
    while (k < args.length && args[k].startsWith("-")) {
        const a = args[k];
        if (a === "-C") dir = resolve(dir, args[k + 1] ?? "");
        if (a === "-c" || a === "--config-env") settings.push(args[k + 1] ?? "");
        if (a.startsWith("--config-env=")) settings.push(a.slice("--config-env=".length));
        k += GIT_VALUE_OPTIONS.has(a) ? 2 : 1;
    }
    return { k, dir, settings };
}

/**
 * Checks the message of a commit or merge, from its arguments, a `-F` file and standard input.
 * @param {SimpleCommand} cmd the command
 * @param {string} sub `commit` or `merge`
 * @param {string[]} rest the words after the subcommand
 * @param {string} dir the directory git runs in
 */
function checkGitMessage(cmd, sub, rest, dir) {
    const texts = [...rest, ...cmd.input];
    rest.forEach((r, m) => {
        const file = r === "-F" || r === "--file" ? rest[m + 1] : /^(-F|--file=)(.+)/.exec(r)?.[2];
        if (file !== undefined && file !== "-") texts.push(readFileSync(resolve(dir, file), "utf8"));
    });
    const reasons = checkOutgoing(texts.join("\n"), {});
    if (reasons.length > 0) deny(`git ${sub}: the message ${reasons.join(", ")}`);
}

/**
 * A git setting given on the command line or to `git config`: no aliases, no credential helpers,
 * no turning signing off.
 * @param {string} setting `key=value`
 */
function checkGitSetting(setting) {
    const eq = setting.indexOf("=");
    const key = (eq === -1 ? setting : setting.slice(0, eq)).toLowerCase();
    const value = eq === -1 ? "true" : setting.slice(eq + 1).toLowerCase();
    if (key.startsWith("alias.")) deny("git aliases are not allowed in runs");
    if (key.startsWith("credential")) deny("git credential settings are not allowed in runs");
    if ((key === "commit.gpgsign" || key === "tag.gpgsign") && !["", "true", "yes", "on", "1"].includes(value)) {
        deny(`${key}=${value}: every commit is signed`);
    }
}

/**
 * `git checkout` is denied in every form except taking protected paths from the other side of a
 * merge in a pr-conflict run: `git checkout MERGE_HEAD -- <protected paths>` while a merge is in
 * progress.
 * @param {string[]} rest the words after `checkout`
 * @param {GuardConfig} config the run's guard settings
 * @param {string} dir the directory git runs in
 */
function checkCheckout(rest, config, dir) {
    const why = "git checkout: runs never use git checkout";
    if (config.kind !== "pr-conflict" || rest[0] !== "MERGE_HEAD" || rest[1] !== "--" || rest.length < 3) deny(why);
    if (!existsSync(join(gitDir(config.root), "MERGE_HEAD"))) deny(`${why} outside a merge`);
    for (const p of rest.slice(2)) {
        if (!isProtected(relative(config.root, resolve(dir, p)), config.protectedPaths)) {
            deny(`${why} except for protected paths during a merge (${p} is not protected)`);
        }
    }
}

/**
 * Decides one tool call.
 * @param {any} input the PreToolUse input
 * @param {GuardConfig} config the run's guard settings
 */
function check(input, config) {
    const tool = input.tool_name;
    const params = input.tool_input;
    if (typeof tool !== "string" || params === null || typeof params !== "object")
        throw new Error("malformed hook input");
    const cwd = typeof input.cwd === "string" ? input.cwd : config.root;
    if (tool === "Bash") {
        if (typeof params.command !== "string") throw new Error("Bash input without a command");
        for (const cmd of splitCommands(params.command)) checkCommand(cmd, config, cwd);
    } else if (tool === "Edit" || tool === "Write" || tool === "MultiEdit" || tool === "NotebookEdit") {
        checkFileTool(tool, params, config, cwd);
    }
}

/**
 * Checks a file-editing tool call: only files inside the working tree, never git, hook or
 * protected files.
 * @param {string} tool the tool name
 * @param {any} params the tool input
 * @param {GuardConfig} config the run's guard settings
 * @param {string} cwd the current directory
 */
function checkFileTool(tool, params, config, cwd) {
    const file = params.file_path ?? params.notebook_path;
    if (typeof file !== "string") throw new Error(`${tool} input without a file path`);
    const rel = relative(config.root, resolve(cwd, file));
    // The file tools are not sandboxed: outside the working tree they could reach githerd's
    // state, the main checkout's git config or the owner's settings.
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
        deny(`${tool} ${file}: runs edit only files inside their working tree`);
    }
    // git and its hooks run with the daemon's privileges as well as the run's.
    if (isProtected(rel, [".git", ".git/", ".husky/"])) deny(`${tool} ${rel}: runs never edit git or hook files`);
    if (isProtected(rel, config.protectedPaths)) deny(`${tool} ${rel}: protected paths are never edited by runs`);
}

/**
 * Appends a denial to the run's `denials.jsonl`. A run directory that cannot be written still
 * denies.
 * @param {string | undefined} runDir the run directory
 * @param {any} input the hook input, if it parsed
 * @param {string} reason why
 */
function record(runDir, input, reason) {
    try {
        const params = input?.tool_input ?? {};
        const line = {
            at: new Date().toISOString(),
            tool: input?.tool_name ?? null,
            input: params.command ?? params.file_path ?? params.notebook_path ?? null,
            reason,
        };
        appendFileSync(join(runDir, "denials.jsonl"), `${JSON.stringify(line)}\n`);
    } catch {
        // Nothing else to do: the call is denied either way.
    }
}

let input;
const runDir = process.env.GITHERD_RUN_DIR;
try {
    input = JSON.parse(readFileSync(0, "utf8"));
    if (!runDir) throw new Error("GITHERD_RUN_DIR is not set");
    const config = JSON.parse(readFileSync(join(runDir, "guard.json"), "utf8"));
    if (typeof config.kind !== "string" || typeof config.root !== "string" || !Array.isArray(config.protectedPaths)) {
        throw new TypeError("guard.json is malformed");
    }
    check(input, { ...config, root: resolve(config.root) });
    process.exit(0);
} catch (err) {
    const reason = err instanceof Denied ? err.message : `githerd guard error, denied: ${err?.message ?? err}`;
    record(runDir, input, reason);
    process.stderr.write(`${reason}\n`);
    process.exit(2);
}
