#!/usr/bin/env node
/**
 * The worker guard (design section 10.1). A worker's generated settings run it as
 * `node githerd-guard.mjs <job directory>` for these hook events:
 *
 * - PreToolUse on Bash, Edit, Write, MultiEdit, NotebookEdit and Agent: exit 0 allows the call;
 *   exit 2 refuses it, with the reason and the allowed alternative on stderr, which Claude Code
 *   shows the worker.
 * - PostToolUse on Agent, SubagentStart and SubagentStop: keep the count of running subagents.
 *   These always exit 0.
 *
 * Files in the job directory (`~/.githerd/<repo>/jobs/<id>/`):
 *
 * - `guard.json`, written by the daemon: `{root, repo, ownerItems, subagents?, browsers?}`. `root`
 *   is the job's worktree, `repo` is `owner/name`, `ownerItems` the issue and pull request numbers
 *   with an open owner item. Missing or malformed, every PreToolUse call is refused (the checks
 *   that need the daemon's facts fail closed).
 * - `writes.jsonl`: one line per allowed `gh` write, `{at, verb, item, repo}`, which the daemon
 *   reads to tell a worker's writes from the owner's.
 * - `refusals.jsonl`: one line per refusal.
 * - `agents.json`: the ids of the session's running subagents.
 *
 * It makes no network call and never needs the daemon to answer.
 */

import {
    appendFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { baseName, splitCommands } from "../lib/shellwords.mjs";
import { checkOutgoing } from "../lib/text.mjs";

/** @typedef {import("../lib/shellwords.mjs").SimpleCommand} SimpleCommand */

/**
 * @typedef {object} GuardConfig
 * @property {string} root the job's worktree
 * @property {string} repo `owner/name`
 * @property {number[]} ownerItems issues and pull requests with an open owner item
 * @property {number} subagents concurrent subagents allowed
 * @property {number} browsers Chromium trees allowed machine-wide
 */

/**
 * What one Bash call is checked against.
 * @typedef {object} Context
 * @property {GuardConfig} config the job's guard settings
 * @property {string | null} dir the directory the command runs in; null when a `cd` made it unknown
 * @property {{verb: string, item: number | null, repo: string}[]} writes collects allowed `gh` writes
 */

const SUBAGENTS = 2;
const BROWSERS = 4;

/** Paths under the worktree that workers never edit (design 7.2); a trailing `/` is a directory. */
const DENIED_PATHS = [".git", ".git/", "visual-baselines/", "githerd/", ".claude/", ".github/workflows/", ".husky/"];
const DENIED_FILES = new Set(["tools/prepush.sh"]);

/** Labels only the owner and the daemon set. */
const OWNER_LABEL = /^(needs-decision|hold|intermittent|githerd:.*)$/;

class Refused extends Error {}

/**
 * Refuses the call.
 * @param {string} reason what is refused and what to do instead
 * @returns {never} always throws
 */
function refuse(reason) {
    throw new Refused(reason);
}

// ---------------------------------------------------------------------------------------------
// Bash
// ---------------------------------------------------------------------------------------------

/**
 * Checks a Bash command line, following `cd` from one simple command to the next.
 * @param {string} command the command line
 * @param {Context} ctx the context; `dir` starts at the session's directory
 */
function checkBash(command, ctx) {
    for (const cmd of splitCommands(command)) {
        const name = baseName(cmd.argv[0]);
        if (name === "cd" || name === "pushd") {
            ctx.dir = cdTarget(cmd.argv.slice(1), ctx.dir);
            continue;
        }
        let dir = ctx.dir;
        for (const d of cmd.chdir) dir = moveTo(dir, d);
        checkCommand(cmd, { ...ctx, dir });
    }
}

/**
 * Where `cd` goes.
 * @param {string[]} args its arguments
 * @param {string | null} dir where it starts
 * @returns {string | null} the new directory, or null when it depends on run-time text
 */
function cdTarget(args, dir) {
    const target = args.find((a) => !a.startsWith("-") || a === "-");
    return moveTo(dir, target ?? "~");
}

/**
 * Resolves a directory word.
 * @param {string | null} dir the current directory
 * @param {string} word the word
 * @returns {string | null} the directory, or null when it cannot be known
 */
function moveTo(dir, word) {
    if (word === "-" || /[$`*?]/.test(word)) return null;
    if (word === "~" || word.startsWith("~/")) return join(homedir(), word.slice(1));
    if (isAbsolute(word)) return resolve(word);
    return dir === null ? null : resolve(dir, word);
}

/**
 * Checks one simple command.
 * @param {SimpleCommand} cmd the command
 * @param {Context} ctx the context
 */
function checkCommand(cmd, ctx) {
    const name = baseName(cmd.argv[0]).replace(/(.)@[^/]*$/, "$1"); // NOSONAR(S5852): one command word, a few dozen characters
    const args = cmd.argv.slice(1);
    if (launchesBrowser(name, args)) checkBrowserCap(ctx.config);
    if (name === "git") checkGit(cmd, args, ctx);
    else if (name === "gh") checkGh(args, ctx);
    else if (name === "curl" || name === "wget") checkCurl(name, args);
    else if (name === "npx" || name === "pnpx" || name === "bunx") checkInner(args, cmd, ctx);
    else if (name === "npm" || name === "pnpm" || name === "yarn") checkPackageManager(cmd, args, ctx);
    else if (name === "nx" && args.find((a) => !a.startsWith("-")) === "release") refuse(RELEASE);
    else if (name === "find") checkFindExec(cmd, args, ctx);
    else {
        checkReviewTool(name, args);
        checkOwnerCommand(name, args);
    }
}

const RELEASE = "releases and publishing happen only in CI from master: merge the change and release.yml publishes it";

/**
 * curl and wget may read the web but not GitHub, whose writes go through `gh`, which the guard
 * reads, nor the daemon on this machine, whose owner commands a worker must not send.
 * @param {string} name the program
 * @param {string[]} args its arguments
 */
function checkCurl(name, args) {
    if (args.some((a) => /github\.com/i.test(a))) refuse(`${name} to GitHub: use gh, which the guard can check`);
    if (args.some((a) => /(^|[/@])(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?)([:/]|$)/i.test(a))) {
        refuse(`${name} to this machine: talk to githerd only through its tools`);
    }
}

/**
 * Checks what `find -exec` runs.
 * @param {SimpleCommand} cmd the find command
 * @param {string[]} args its arguments
 * @param {Context} ctx the context
 */
function checkFindExec(cmd, args, ctx) {
    args.forEach((a, k) => {
        if (a === "-exec" || a === "-execdir" || a === "-ok") {
            const end = args.findIndex((b, m) => m > k && (b === ";" || b === "+"));
            checkCommand({ ...cmd, argv: args.slice(k + 1, end === -1 ? undefined : end) }, ctx);
        }
    });
}

/**
 * Checks the command that `npx`, `pnpm exec` and the like run, after their own options.
 * @param {string[]} args the words after the launcher
 * @param {SimpleCommand} cmd the launching command
 * @param {Context} ctx the context
 */
function checkInner(args, cmd, ctx) {
    let k = 0;
    while (k < args.length && args[k].startsWith("-")) {
        if (args[k] === "-c" || args[k] === "--call") {
            checkBash(args[k + 1] ?? "", { ...ctx });
            return;
        }
        k += args[k] === "-p" || args[k] === "--package" ? 2 : 1;
    }
    if (k < args.length) checkCommand({ ...cmd, argv: args.slice(k) }, ctx);
}

/** Package-manager options that take the next word as their value. */
const PM_VALUE_OPTIONS = new Set(["-C", "--dir", "--prefix", "--filter", "-F", "--workspace", "--cwd"]);

/** A package script that runs browser tests. */
const BROWSER_SCRIPT = /^test.*(browser|storybook|visual|interactions|e2e|playwright)/;

/**
 * npm, pnpm and yarn: no publishing; check what `exec` or `dlx` runs; browser test scripts count
 * against the browser cap.
 * @param {SimpleCommand} cmd the command
 * @param {string[]} args its arguments
 * @param {Context} ctx the context
 */
function checkPackageManager(cmd, args, ctx) {
    let k = 0;
    while (k < args.length && args[k].startsWith("-")) k += PM_VALUE_OPTIONS.has(args[k]) ? 2 : 1;
    const sub = args[k];
    if (sub === undefined) return;
    if (sub === "publish" || args.includes("publish")) refuse(RELEASE);
    if (sub === "exec" || sub === "dlx" || sub === "x") {
        checkInner(args.slice(k + 1), cmd, ctx);
        return;
    }
    const script =
        sub === "run" || sub === "run-script" || sub === "rs" ? args.slice(k + 1).find((a) => !a.startsWith("-")) : sub;
    if (script !== undefined && BROWSER_SCRIPT.test(script)) checkBrowserCap(ctx.config);
    if (baseName(cmd.argv[0]) !== "npm" && script === sub) checkInner(args.slice(k), cmd, ctx);
}

/**
 * The review tool's accept and finish are the owner's (design 10.1).
 * @param {string} name the program
 * @param {string[]} args its arguments
 */
function checkReviewTool(name, args) {
    let rest = args;
    if (name === "node") {
        const script = args.findIndex((a) => !a.startsWith("-"));
        if (script === -1 || !args[script].endsWith("visual-review/trusted/cli.mjs")) return;
        rest = args.slice(script + 1);
    } else if (name !== "visual-review") return;
    const verb = rest.find((a) => !a.startsWith("-"));
    if (verb === "accept" || verb === "finish") {
        refuse(`visual-review ${verb}: only the owner accepts visual changes; list them for him in githerd_done`);
    }
}

/** The githerd CLI's commands that are the owner's to run. */
const OWNER_COMMANDS = new Set(["answer", "order", "policy", "ack", "veto", "mode"]);

/**
 * The githerd CLI's owner commands (`answer`, `order`, `policy`, `ack`, `veto`, `mode`) are the
 * owner's, however the CLI is reached: `githerd` on the PATH or `node .../githerd.mjs`.
 * @param {string} name the program
 * @param {string[]} args its arguments
 */
function checkOwnerCommand(name, args) {
    let rest = args;
    if (name === "node") {
        const script = args.findIndex((a) => !a.startsWith("-"));
        if (script === -1 || baseName(args[script]) !== "githerd.mjs") return;
        rest = args.slice(script + 1);
    } else if (name !== "githerd" && name !== "githerd.mjs") return;
    const verb = rest.find((a) => !a.startsWith("-"));
    if (verb !== undefined && OWNER_COMMANDS.has(verb)) {
        refuse(`githerd ${verb} is the owner's: ask him through githerd_ask_owner`);
    }
}

// ---------------------------------------------------------------------------------------------
// Browsers
// ---------------------------------------------------------------------------------------------

/** Programs that start a browser. */
const BROWSER_PROGRAMS = new Set([
    "chromium",
    "chromium-browser",
    "chrome",
    "google-chrome",
    "google-chrome-stable",
    "headless_shell",
    "test-storybook",
]);

/** Vitest projects that run in a browser. */
const BROWSER_PROJECTS = /^(browser|storybook|interactions|xr|llm-regression)/;

/**
 * Whether a command starts a browser. A heuristic: the browsers themselves, Playwright,
 * Storybook's test runner, and test runs that name a browser project.
 * @param {string} name the program
 * @param {string[]} args its arguments
 * @returns {boolean} true when it does
 */
export function launchesBrowser(name, args) {
    if (BROWSER_PROGRAMS.has(name)) return true;
    if (name === "playwright") return !["install", "install-deps", "--version", "-V"].includes(args[0] ?? "");
    return args.some(
        (a, k) =>
            /^--browser(\.|=|$)/.test(a) ||
            BROWSER_PROJECTS.test(/^--project=(.*)$/.exec(a)?.[1] ?? "") ||
            (a === "--project" && BROWSER_PROJECTS.test(args[k + 1] ?? "")),
    );
}

/** Process names of Chromium's processes (`comm`, cut to 15 characters). */
const CHROMIUM = /^(chrome|chromium|chromium-browse|headless_shell)$/;

/**
 * Counts Chromium process trees on the machine: Chromium processes whose parent is not one.
 * @param {string} [procRoot] the proc file system
 * @returns {number} the number of trees
 */
export function countBrowserTrees(procRoot = "/proc") {
    /** @type {Map<string, {comm: string, ppid: string}>} */
    const procs = new Map();
    for (const pid of readdirSync(procRoot)) {
        if (!/^\d+$/.test(pid)) continue;
        try {
            const m = /^\d+ \((.*)\) \S+ (\d+)/s.exec(readFileSync(join(procRoot, pid, "stat"), "utf8"));
            if (m) procs.set(pid, { comm: m[1], ppid: m[2] });
        } catch {
            // The process ended while the list was read.
        }
    }
    const chromium = (/** @type {string} */ pid) => CHROMIUM.test(procs.get(pid)?.comm ?? "");
    return [...procs].filter(([pid, p]) => chromium(pid) && !chromium(p.ppid)).length;
}

/**
 * Refuses a browser launch at the machine cap.
 * @param {GuardConfig} config the job's guard settings
 */
function checkBrowserCap(config) {
    const trees = countBrowserTrees();
    if (trees >= config.browsers) {
        refuse(
            `browsers: ${trees} Chromium trees are running and the machine allows ${config.browsers}; ` +
                "run the tests that need no browser now, or declare a wait with githerd_expect and try again later",
        );
    }
}

// ---------------------------------------------------------------------------------------------
// git
// ---------------------------------------------------------------------------------------------

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

/** git subcommands that never change anything. */
const GIT_READS = new Set([
    "status",
    "log",
    "show",
    "diff",
    "blame",
    "annotate",
    "grep",
    "ls-files",
    "ls-tree",
    "ls-remote",
    "rev-parse",
    "rev-list",
    "describe",
    "cat-file",
    "merge-base",
    "shortlog",
    "name-rev",
    "for-each-ref",
    "show-ref",
    "show-branch",
    "whatchanged",
    "version",
    "help",
    "check-ignore",
    "check-attr",
    "var",
    "count-objects",
    "diff-tree",
    "diff-files",
    "diff-index",
    "range-diff",
    "cherry",
    "verify-commit",
    "verify-tag",
]);

/** git subcommands refused outright, with what to do instead. */
const GIT_REFUSED = {
    push: "call githerd_push with the job, the branch and the local HEAD",
    "send-pack": "call githerd_push with the job, the branch and the local HEAD",
    "http-push": "call githerd_push with the job, the branch and the local HEAD",
    "receive-pack": "call githerd_push with the job, the branch and the local HEAD",
    stash: "commit the work in progress on the branch instead",
    reset: "make a new commit (git revert) or a new branch at the commit you want (git switch -c)",
    clean: "delete the files you mean with rm",
    rebase: "merge master into the branch (git merge origin/master)",
};

/** `git remote` forms that change the remotes. */
const REMOTE_WRITES = new Set(["add", "remove", "rm", "rename", "set-url", "set-head", "set-branches", "prune"]);

/**
 * Checks a git command.
 * @param {SimpleCommand} cmd the command
 * @param {string[]} args the words after `git`
 * @param {Context} ctx the context
 */
function checkGit(cmd, args, ctx) {
    if (cmd.assign.some((a) => /^(GIT_(CONFIG|DIR|WORK_TREE|COMMON_DIR|INDEX_FILE)|HUSKY=)/.test(a))) {
        refuse("git: set no GIT_ or HUSKY variables on a git command; run git in the job's worktree as it is");
    }
    const { k, dir, settings, elsewhere } = gitOptions(args, ctx.dir);
    for (const setting of settings) checkGitSetting(setting);
    const sub = args[k];
    if (sub === undefined) return;
    const rest = args.slice(k + 1);
    if (GIT_REFUSED[sub]) refuse(`git ${sub}: ${GIT_REFUSED[sub]}`);
    // Any word "push": `-P <prefix>` puts a word before the subcommand.
    if (sub === "subtree" && rest.includes("push")) refuse(`git subtree push: ${GIT_REFUSED.push}`);
    checkGitSubcommand(sub, rest);
    if (isGitRead(sub, rest)) return;
    if (elsewhere) refuse(`git ${sub} with --git-dir or --work-tree: run git writes in the job's worktree`);
    if (dir === null) refuse(`git ${sub}: the guard cannot tell which directory a cd moved to; cd to a plain path`);
    if (outside(ctx.config.root, dir)) {
        refuse(`git ${sub} in ${dir}: git writes stay in the job's worktree ${ctx.config.root}`);
    }
    if (sub === "commit" || sub === "merge") checkGitMessage(cmd, sub, rest, dir);
}

/**
 * The per-subcommand refusals.
 * @param {string} sub the subcommand
 * @param {string[]} rest the words after it
 */
function checkGitSubcommand(sub, rest) {
    if (sub.startsWith("credential")) refuse("git credential: workers never handle credentials");
    if (rest.includes("--no-verify") || (sub === "commit" && rest.some((r) => /^-[^-mFcCt]*n/.test(r)))) {
        refuse(`git ${sub} --no-verify: the hooks always run; fix what they report`);
    }
    if (rest.includes("--no-gpg-sign")) refuse(`git ${sub} --no-gpg-sign: every commit is signed`);
    if (sub === "checkout") checkCheckout(rest);
    if (sub === "restore" && !(rest.includes("--staged") && !rest.some((r) => r === "-W" || r === "--worktree"))) {
        refuse("git restore: discarding changes is not allowed; make a new commit that changes the files back");
    }
    if (sub === "switch" && rest.some((r) => r === "-f" || r === "--force" || r === "--discard-changes")) {
        refuse("git switch --discard-changes: commit the changes first, then switch");
    }
    if (sub === "remote" && REMOTE_WRITES.has(rest.find((r) => !r.startsWith("-")) ?? "")) {
        refuse("git remote: the remotes are fixed; githerd_push pushes the branch for you");
    }
    if (sub === "config" && !isConfigRead(rest)) {
        refuse("git config: settings are shared by every worktree; give a setting to one command with git -c");
    }
}

/**
 * `git checkout` only creates a branch (`-b`, `-B`) or detaches; switching is `git switch`, and
 * checking out files is refused (design 10.1).
 * @param {string[]} rest the words after `checkout`
 */
function checkCheckout(rest) {
    const creates = rest[0] === "-b" || rest[0] === "-B" || rest[0] === "--detach";
    if (!creates || rest.includes("--")) {
        refuse(
            "git checkout: use git switch <branch> or git switch -c <new branch>; " +
                "restoring files is not allowed (make a new commit that changes them back)",
        );
    }
}

/**
 * Whether `git config` only reads.
 * @param {string[]} rest the words after `config`
 * @returns {boolean} true for a read
 */
function isConfigRead(rest) {
    const reads = new Set(["--get", "--get-all", "--get-regexp", "--list", "-l", "get", "list", "--show-origin"]);
    if (rest.some((r) => reads.has(r))) return true;
    return rest.filter((r) => !r.startsWith("-")).length === 1 && !rest.includes("--unset");
}

/**
 * Whether a git command only reads.
 * @param {string} sub the subcommand
 * @param {string[]} rest the words after it
 * @returns {boolean} true for a read
 */
function isGitRead(sub, rest) {
    if (GIT_READS.has(sub)) return true;
    const words = rest.filter((r) => !r.startsWith("-"));
    if (sub === "branch" || sub === "tag") return words.length === 0 || rest.includes("--list") || rest.includes("-l");
    if (sub === "worktree") return words[0] === "list";
    if (sub === "remote") return words.length === 0 || words[0] === "show" || words[0] === "get-url";
    if (sub === "reflog") return words.length === 0 || words[0] === "show";
    if (sub === "config") return isConfigRead(rest);
    return false;
}

/**
 * Reads git's global options.
 * @param {string[]} args the words after `git`
 * @param {string | null} cwd the current directory
 * @returns {{k: number, dir: string | null, settings: string[], elsewhere: boolean}} the
 *   subcommand's index, the directory `-C` moves to, the `-c` settings, and whether `--git-dir` or
 *   `--work-tree` points git somewhere else
 */
function gitOptions(args, cwd) {
    let k = 0;
    let dir = cwd;
    let elsewhere = false;
    /** @type {string[]} */
    const settings = [];
    while (k < args.length && args[k].startsWith("-")) {
        const a = args[k];
        if (a === "-C") dir = moveTo(dir, args[k + 1] ?? "");
        if (a === "-c" || a === "--config-env") settings.push(args[k + 1] ?? "");
        if (a.startsWith("--config-env=")) settings.push(a.slice("--config-env=".length));
        if (/^--(git-dir|work-tree)/.test(a)) elsewhere = true;
        k += GIT_VALUE_OPTIONS.has(a) ? 2 : 1;
    }
    return { k, dir, settings, elsewhere };
}

/**
 * A setting given with `-c`: no aliases (they hide the subcommand), no credential helpers, no
 * hooks path, no turning signing off.
 * @param {string} setting `key=value`
 */
function checkGitSetting(setting) {
    const eq = setting.indexOf("=");
    const key = (eq === -1 ? setting : setting.slice(0, eq)).toLowerCase();
    const value = eq === -1 ? "true" : setting.slice(eq + 1).toLowerCase();
    if (key.startsWith("alias.")) refuse("git aliases are not allowed: spell the command out");
    if (key.startsWith("credential")) refuse("git credential settings are not allowed");
    if (key === "core.hookspath") refuse("core.hooksPath: the hooks always run; fix what they report");
    if ((key === "commit.gpgsign" || key === "tag.gpgsign") && !["", "true", "yes", "on", "1"].includes(value)) {
        refuse(`${key}=${value}: every commit is signed`);
    }
}

/**
 * Checks the message of a commit or merge, from its arguments, a `-F` file and standard input:
 * no attribution lines, plain ASCII.
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
    if (reasons.length > 0) refuse(`git ${sub}: the message ${reasons.join(", ")}`);
}

/**
 * Whether a path is outside a directory.
 * @param {string} root the directory
 * @param {string} path an absolute path
 * @returns {boolean} true when outside
 */
function outside(root, path) {
    const rel = relative(root, path);
    return rel === ".." || rel.startsWith("../") || isAbsolute(rel);
}

// ---------------------------------------------------------------------------------------------
// gh
// ---------------------------------------------------------------------------------------------

/** gh options that take the next word as their value. */
const GH_VALUE_OPTIONS = new Set(
    (
        "-R --repo -b --body -F --body-file -t --title -l --label -a --assignee -m --milestone -p --project " +
        "-B --base -H --head -q --jq --json --template -X --method -f --field --raw-field --header --input " +
        "--add-label --remove-label --add-assignee --remove-assignee --add-reviewer --remove-reviewer " +
        "--add-project --remove-project -r --reviewer --reason -L --limit -s --state -S --search -A --author " +
        "-c --comment -j --job --workflow -u --user --env -o --org --hostname --cache"
    ).split(" "),
);

/** gh commands that write, by group. */
const GH_WRITES = {
    issue: "create comment edit close reopen delete transfer pin unpin lock unlock develop",
    pr: "create comment edit review merge close reopen ready update-branch lock unlock",
    label: "create edit delete clone",
    release: "create edit delete upload delete-asset",
    repo: "create fork edit delete rename archive unarchive sync",
    run: "rerun cancel delete",
    workflow: "run enable disable",
    secret: "set delete remove",
    variable: "set delete",
    cache: "delete",
};

/** gh commands refused outright, with what to do instead. */
const GH_REFUSED = {
    "pr merge": "Mergify merges once githerd/merge is green; there is nothing to do",
    "pr update-branch": "the daemon updates branches; githerd_push merges master for you when it is needed",
    "pr close": "the daemon closes pull requests; report it with githerd_done outcome not-needed",
    "pr reopen": "ask the owner with githerd_ask_owner",
    "issue close": "the daemon closes issues after a grace period; report it in githerd_done",
    "issue reopen": "ask the owner with githerd_ask_owner",
    "run rerun": "ask for a re-run with githerd_rerun",
    "workflow run": "ask for a run with githerd_rerun",
};

/**
 * Splits gh arguments into positional words and option values.
 * @param {string[]} args the words after `gh`
 * @returns {{words: string[], opts: Map<string, string[]>}} the positional words and every value
 *   of every option (`--x=y` included); a flag with no value maps to `[""]`
 */
function ghParse(args) {
    const words = [];
    /** @type {Map<string, string[]>} */
    const opts = new Map();
    const add = (/** @type {string} */ o, /** @type {string} */ v) => opts.set(o, [...(opts.get(o) ?? []), v]);
    let k = 0;
    while (k < args.length) {
        const a = args[k];
        const eq = a.indexOf("=");
        const takesValue = GH_VALUE_OPTIONS.has(a);
        if (a.startsWith("--") && eq !== -1) add(a.slice(0, eq), a.slice(eq + 1));
        else if (takesValue) add(a, args[k + 1] ?? "");
        else if (a.startsWith("-") && a.length > 1) add(a, "");
        else words.push(a);
        k += takesValue ? 2 : 1;
    }
    return { words, opts };
}

/**
 * Every value given to any of some options.
 * @param {Map<string, string[]>} opts the parsed options
 * @param {...string} names option spellings
 * @returns {string[]} the values
 */
function optValues(opts, ...names) {
    return names.flatMap((n) => opts.get(n) ?? []);
}

/**
 * Checks a gh command and logs it when it writes.
 * @param {string[]} args the words after `gh`
 * @param {Context} ctx the context
 */
function checkGh(args, ctx) {
    const { words, opts } = ghParse(args);
    const [group = "", verb = "", ...pos] = words;
    checkCommentReads(opts);
    if (group === "api") {
        checkGhApi(verb, opts, ctx);
        return;
    }
    const command = `${group} ${verb}`;
    if (GH_REFUSED[command]) refuse(`gh ${command}: ${GH_REFUSED[command]}`);
    if (!(GH_WRITES[group] ?? "").split(" ").includes(verb)) return;
    const repo = optValues(opts, "-R", "--repo")[0] ?? (group === "repo" ? (pos[0] ?? "") : ctx.config.repo);
    checkGhOwners(command, [repo, ...pos.filter((w) => /github\.com\//.test(w))], ctx);
    if (command === "pr edit" && optValues(opts, "-B", "--base").length > 0) {
        refuse("gh pr edit --base: the daemon retargets pull requests");
    }
    checkLabels(group, verb, pos, opts);
    const item = itemNumber(pos[0]);
    if (["issue comment", "pr comment", "pr review"].includes(command)) checkComment(command, item, ctx);
    ctx.writes.push({ verb: command, item, repo });
}

/**
 * Refuses a write to a repository outside the configured one's owner. A repository with no owner
 * part (`gh repo create name`) is the gh login's own.
 * @param {string} command the gh command
 * @param {string[]} names repositories and URLs the command names
 * @param {Context} ctx the context
 */
function checkGhOwners(command, names, ctx) {
    const org = ctx.config.repo.split("/")[0].toLowerCase();
    for (const name of names) {
        const owner = /github\.com\/([^/]+)/.exec(name)?.[1] ?? (name.includes("/") ? name.split("/")[0] : "");
        if (owner.toLowerCase() !== org) refuse(`gh ${command} ${name}: workers write only to ${org} repositories`);
    }
}

/**
 * The comment-reading forms of gh: workers read GitHub text only through githerd_read.
 * @param {Map<string, string[]>} opts the parsed options
 */
function checkCommentReads(opts) {
    const fields = optValues(opts, "--json").flatMap((v) => v.split(","));
    if (opts.has("--comments") || fields.some((f) => /^(comments|reviews|latestReviews)$/.test(f.trim()))) {
        refuse("gh comments and reviews: read them with githerd_read, which shows only the owner's");
    }
}

/**
 * Refuses the labels only the owner and the daemon set.
 * @param {string} group the gh group
 * @param {string} verb the gh verb
 * @param {string[]} pos the positional words after them
 * @param {Map<string, string[]>} opts the parsed options
 */
function checkLabels(group, verb, pos, opts) {
    const labels =
        group === "label"
            ? pos.slice(0, 1)
            : optValues(opts, "-l", "--label", "--add-label", "--remove-label").flatMap((v) => v.split(","));
    const owned = labels.find((l) => OWNER_LABEL.test(l.trim()));
    if (owned) refuse(`gh ${group} ${verb} ${owned}: that label belongs to the owner and githerd`);
}

/**
 * A comment goes only to an item with no open owner item, named by number.
 * @param {string} command the gh command
 * @param {number | null} item the issue or pull request
 * @param {Context} ctx the context
 */
function checkComment(command, item, ctx) {
    if (item === null) refuse(`gh ${command}: name the issue or pull request number`);
    if (ctx.config.ownerItems.includes(item)) {
        refuse(`gh ${command} ${item}: it has an open question for the owner; add to it with githerd_ask_owner`);
    }
}

/**
 * The issue or pull request number a word names: `12`, `#12` or a URL.
 * @param {string | undefined} word the word
 * @returns {number | null} the number
 */
function itemNumber(word) {
    const m = /^#?(\d+)$/.exec(word ?? "") ?? /\/(?:issues|pull|pulls)\/(\d+)/.exec(word ?? "");
    return m ? Number(m[1]) : null;
}

/**
 * REST paths workers never write to, with what to do instead.
 * @type {[RegExp, string][]}
 */
const API_REFUSED = [
    [/\/statuses\//, "commit statuses are githerd's"],
    [/\/pulls\/\d+\/merge$|\/merges$|\/merge-upstream$/, "Mergify merges once githerd/merge is green"],
    [/\/update-branch$/, "the daemon updates branches"],
    [/\/(rerun|rerun-failed-jobs|dispatches)$/, "ask for a run with githerd_rerun"],
    [/\/git\/refs|\/contents\//, "call githerd_push to change the branch"],
    [/\/rulesets|\/protection/, "rulesets and branch protection are the owner's"],
];

/**
 * Checks `gh api`.
 * @param {string} endpoint the path or `graphql`
 * @param {Map<string, string[]>} opts the parsed options
 * @param {Context} ctx the context
 */
function checkGhApi(endpoint, opts, ctx) {
    const path = endpoint.replace(/^https:\/\/api\.github\.com/, "").replace(/^\/?/, "/");
    const fields = optValues(opts, "-f", "-F", "--field", "--raw-field");
    const fieldsGiven = fields.length > 0 || opts.has("--input");
    const method = (optValues(opts, "-X", "--method")[0] ?? (fieldsGiven ? "POST" : "GET")).toUpperCase();
    if (path === "/graphql") {
        checkGraphql(fields);
        return;
    }
    if (method === "GET") {
        if (/\/(comments|reviews|timeline)(\/|$)/.test(path)) {
            refuse("gh api comments and reviews: read them with githerd_read, which shows only the owner's");
        }
        return;
    }
    const owner = /^\/repos\/([^/]+)\//.exec(path)?.[1];
    const org = ctx.config.repo.split("/")[0];
    if (owner && owner !== "{owner}" && owner.toLowerCase() !== org.toLowerCase()) {
        refuse(`gh api ${method} ${path}: workers write only to ${org} repositories`);
    }
    for (const [re, why] of API_REFUSED) if (re.test(path)) refuse(`gh api ${method} ${path}: ${why}`);
    checkApiFields(method, path, fields);
    const item = itemNumber(/\/(?:issues|pulls)\/\d+/.exec(path)?.[0]);
    if (/\/(issues|pulls)\/\d+\/(comments|reviews)$/.test(path)) {
        checkComment(`api ${method} ${path}`, item, ctx);
    } else if (/\/comments\/\d+$/.test(path)) {
        refuse(`gh api ${method} ${path}: edit comments with gh issue comment --edit-last`);
    }
    ctx.writes.push({ verb: `api ${method} ${path}`, item, repo: ctx.config.repo });
}

/**
 * Field-level refusals of a REST write: closing, reopening, retargeting, owner labels.
 * @param {string} method the HTTP method
 * @param {string} path the path
 * @param {string[]} fields the `key=value` fields
 */
function checkApiFields(method, path, fields) {
    const keys = new Set(fields.map((f) => f.split("=")[0].replace(/\[\]$/, "")));
    if (/\/(issues|pulls)\/\d+$/.test(path) && keys.has("state")) {
        refuse(`gh api ${method} ${path} state: the daemon closes and reopens; report it in githerd_done`);
    }
    if (/\/pulls\/\d+$/.test(path) && keys.has("base")) {
        refuse(`gh api ${method} ${path} base: the daemon retargets`);
    }
    const label = /\/labels\/([^/]+)$/.exec(path)?.[1];
    const names = fields.filter((f) => /^(labels|name)(\[\])?=/.test(f)).map((f) => f.slice(f.indexOf("=") + 1));
    const owned = [decodeURIComponent(label ?? ""), ...names].find((l) => OWNER_LABEL.test(l));
    if (owned) refuse(`gh api ${method} ${path}: the label ${owned} belongs to the owner and githerd`);
}

/**
 * GraphQL: comment and review reads go through githerd_read; mutations are refused, because the
 * guard cannot tell what a node id names.
 * @param {string[]} fields the fields, `query=...` among them
 */
function checkGraphql(fields) {
    const query = fields.filter((f) => f.startsWith("query=")).join("\n");
    if (/\bmutation\b/.test(query)) refuse("gh api graphql mutations: use the gh command for the write");
    if (/\b(comments|reviews|reviewThreads|latestReviews|timelineItems)\b/.test(query)) {
        refuse("gh api graphql comments and reviews: read them with githerd_read, which shows only the owner's");
    }
}

// ---------------------------------------------------------------------------------------------
// Edit, Write and Agent
// ---------------------------------------------------------------------------------------------

/**
 * Edit and Write: only files inside the job's worktree, never the denied paths of design 7.2.
 * @param {string} tool the tool name
 * @param {any} params the tool input
 * @param {GuardConfig} config the job's guard settings
 * @param {string} cwd the session's directory
 */
function checkFileTool(tool, params, config, cwd) {
    const file = params.file_path ?? params.notebook_path;
    if (typeof file !== "string") throw new TypeError(`${tool} input without a file path`);
    const path = resolve(cwd, file);
    if (outside(config.root, path)) {
        refuse(
            `${tool} ${file}: edit only files inside the job's worktree ${config.root}; scratch files go in its tmp/`,
        );
    }
    const rel = relative(config.root, path).split("\\").join("/");
    const denied =
        DENIED_FILES.has(rel) ||
        DENIED_PATHS.some((p) => (p.endsWith("/") ? rel === p.slice(0, -1) || rel.startsWith(p) : rel === p));
    if (denied) {
        refuse(`${tool} ${rel}: workers never change this path; if the job needs it, ask with githerd_ask_owner`);
    }
}

/**
 * A file or directory name made from a hook's id: anything but letters, digits, `-` and `_` becomes
 * `_`, so an id can never name a path outside the agents directory.
 * @param {string} id the id
 * @returns {string} the name
 */
const safeName = (id) => id.replaceAll(/[^A-Za-z0-9_-]/g, "_");

/**
 * The directory holding one marker file per running subagent of a session. The SessionStart hook
 * removes the job's `agents/` at startup and resume, so agents that died with an earlier process
 * are not counted (a resume keeps the session id).
 * @param {string} jobDir the job directory
 * @param {string} session the session id
 * @returns {string} the directory
 */
const agentsDir = (jobDir, session) => join(jobDir, "agents", safeName(session));

/**
 * The running subagents of a session: one marker file each, so two hooks running at once never
 * lose each other's update.
 * @param {string} jobDir the job directory
 * @param {string} session the session id
 * @returns {string[]} their marker names
 */
function readAgents(jobDir, session) {
    try {
        return readdirSync(agentsDir(jobDir, session)).filter((n) => !n.endsWith(STOPPED));
    } catch {
        return [];
    }
}

/** The suffix of a stopped agent's tombstone. */
const STOPPED = ".stopped";

/**
 * Counts a subagent in or out. In at SubagentStart, or at PostToolUse of an Agent call that went to
 * the background (`isAsync`); a foreground call's PostToolUse comes after the agent has already
 * stopped, so it never counts. Out at SubagentStop, which leaves a tombstone so a later
 * PostToolUse for the same id does not count it in again; a stop with no recorded start (Claude
 * Code's hidden agents) changes nothing else.
 * @param {string} jobDir the job directory
 * @param {any} input the hook input
 */
function trackAgent(jobDir, input) {
    const session = String(input.session_id ?? "");
    const event = input.hook_event_name;
    if (event === "PostToolUse" && input.tool_response?.isAsync !== true) return;
    const id = event === "PostToolUse" ? input.tool_response?.agentId : input.agent_id;
    if (typeof id !== "string" || id === "") return;
    const dir = agentsDir(jobDir, session);
    const marker = join(dir, safeName(id));
    mkdirSync(dir, { recursive: true });
    if (event === "SubagentStop") {
        rmSync(marker, { force: true });
        writeFileSync(`${marker}${STOPPED}`, "");
    } else if (!existsSync(`${marker}${STOPPED}`)) {
        writeFileSync(marker, "");
    }
}

/**
 * Agent: at most `subagents` running at once.
 * @param {string} jobDir the job directory
 * @param {any} input the hook input
 * @param {GuardConfig} config the job's guard settings
 */
function checkAgent(jobDir, input, config) {
    const running = readAgents(jobDir, String(input.session_id ?? "")).length;
    if (running >= config.subagents) {
        refuse(
            `Agent: at most ${config.subagents} subagents may run at once and ${running} are running; ` +
                "wait for one to finish, or do this part yourself",
        );
    }
}

// ---------------------------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------------------------

/**
 * Reads and validates `guard.json`.
 * @param {string} jobDir the job directory
 * @returns {GuardConfig} the settings
 */
function readConfig(jobDir) {
    const raw = JSON.parse(readFileSync(join(jobDir, "guard.json"), "utf8"));
    const ok =
        typeof raw.root === "string" &&
        isAbsolute(raw.root) &&
        typeof raw.repo === "string" &&
        /^[^/\s]+\/[^/\s]+$/.test(raw.repo) &&
        Array.isArray(raw.ownerItems) &&
        raw.ownerItems.every(Number.isInteger);
    if (!ok) throw new TypeError("guard.json is malformed");
    return {
        root: resolve(raw.root),
        repo: raw.repo,
        ownerItems: raw.ownerItems,
        subagents: Number.isInteger(raw.subagents) ? raw.subagents : SUBAGENTS,
        browsers: Number.isInteger(raw.browsers) ? raw.browsers : BROWSERS,
    };
}

/**
 * Decides one PreToolUse call.
 * @param {string} jobDir the job directory
 * @param {any} input the hook input
 * @returns {Context["writes"]} the gh writes it allows
 */
function decide(jobDir, input) {
    const config = readConfig(jobDir);
    const tool = input.tool_name;
    const params = input.tool_input;
    if (typeof tool !== "string" || params === null || typeof params !== "object") {
        throw new TypeError("malformed hook input");
    }
    const cwd = typeof input.cwd === "string" && isAbsolute(input.cwd) ? input.cwd : config.root;
    /** @type {Context} */
    const ctx = { config, dir: cwd, writes: [] };
    if (tool === "Bash") {
        if (typeof params.command !== "string") throw new TypeError("Bash input without a command");
        checkBash(params.command, ctx);
    } else if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
        checkFileTool(tool, params, config, cwd);
    } else if (tool === "Agent") {
        checkAgent(jobDir, input, config);
    }
    return ctx.writes;
}

/**
 * Appends JSON lines to a file in the job directory; a directory that cannot be written loses
 * the lines and nothing else.
 * @param {string | undefined} jobDir the job directory
 * @param {string} name the file
 * @param {object[]} lines the lines
 */
function append(jobDir, name, lines) {
    if (!jobDir || lines.length === 0) return;
    try {
        appendFileSync(join(jobDir, name), lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
    } catch {
        // The decision stands either way.
    }
}

/**
 * Runs the hook on stdin.
 * @returns {number} the exit code
 */
function main() {
    const jobDir = process.argv[2];
    let input;
    try {
        input = JSON.parse(readFileSync(0, "utf8"));
    } catch (err) {
        process.stderr.write(`githerd guard error, refused: ${err?.message ?? err}\n`);
        return 2;
    }
    if (input?.hook_event_name !== "PreToolUse") {
        try {
            if (jobDir) trackAgent(jobDir, input);
        } catch {
            // A count that could not be written is lost; never block a stop over it.
        }
        return 0;
    }
    const at = new Date().toISOString();
    try {
        if (!jobDir) throw new Error("no job directory argument");
        const writes = decide(jobDir, input);
        append(
            jobDir,
            "writes.jsonl",
            writes.map((w) => ({ at, ...w })),
        );
        return 0;
    } catch (err) {
        const reason =
            err instanceof Refused ? `githerd: ${err.message}` : `githerd guard error, refused: ${err?.message ?? err}`;
        const params = input?.tool_input ?? {};
        const what = params.command ?? params.file_path ?? params.notebook_path ?? params.description ?? null;
        append(jobDir, "refusals.jsonl", [{ at, tool: input?.tool_name ?? null, input: what, reason }]);
        process.stderr.write(`${reason}\n`);
        return 2;
    }
}

// Compared by real path: the hook runs it as `<state>/current/bin/githerd-guard.mjs`, and `current`
// is a symlink, so `argv[1]` names the link while `import.meta.url` names the file. Compared as
// given, the guard never ran and every call was allowed.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
