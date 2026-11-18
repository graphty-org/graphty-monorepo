#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash), registered in .claude/settings.json: refuses a git command that
// writes individual files back from git or settles a conflict by taking one side -- `git checkout
// --ours|--theirs <file>`, `git checkout [<ref>] -- <file>`, `git checkout <ref> <file>`, `git checkout
// .`, `git checkout -p`, `git restore`, `git checkout-index` and `git show <ref>:<file> > <file>`
// (#8889). Agents' rules forbid all of them: a conflict is settled by editing the file so it keeps both
// intents, and a generated or record file by rerunning its generator or test after the merge. Whole-branch
// checkouts (`git checkout <branch>`, `-b`, `--detach`, `git switch`) stay allowed. The hook runs only in
// Claude Code sessions, so the owner's own shell is untouched. Any failure exits 0 silently (allow).
//
//   echo '{"tool_name":"Bash","tool_input":{"command":"git checkout --ours a.ts"}}' | node tools/claude-no-file-checkout.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// git options before the subcommand that take a separate argument
const GIT_OPTION_WITH_ARG = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace"]);
// git checkout options that take a separate argument
const CHECKOUT_OPTION_WITH_ARG = new Set(["-b", "-B", "--orphan", "--conflict", "--pathspec-from-file"]);

/**
 * The subcommand of one command's words and the words after it, or null when it is not git.
 * @param words - One command's words.
 * @returns The subcommand and its arguments, or null.
 */
function gitCommand(words) {
    if (words[0] !== "git") {
        return null;
    }
    let at = 1;
    while (words[at]?.startsWith("-")) {
        at += GIT_OPTION_WITH_ARG.has(words[at]) ? 2 : 1;
    }
    return words[at] ? { name: words[at], args: words.slice(at + 1) } : null;
}

/**
 * Why a `git checkout` argument list writes individual files, or null for a whole-branch checkout.
 * @param args - The words after `checkout`.
 * @returns A short description, or null.
 */
function checkoutOfFiles(args) {
    if (args.some((arg) => arg === "--ours" || arg === "--theirs")) {
        return "git checkout --ours/--theirs takes one side of a conflict";
    }
    if (args.includes("--") || args.some((arg) => arg.startsWith("--pathspec-from-file"))) {
        return "git checkout -- <file> writes files back from git";
    }
    if (args.some((arg) => arg === "-p" || arg === "--patch")) {
        return "git checkout --patch writes files back from git";
    }
    const positional = [];
    for (let at = 0; at < args.length; at++) {
        if (CHECKOUT_OPTION_WITH_ARG.has(args[at])) {
            at++;
        } else if (!args[at].startsWith("-")) {
            positional.push(args[at]);
        }
    }
    // `-b <new> <start>` names a start point, not a file
    const branchStart = args.some((arg) => CHECKOUT_OPTION_WITH_ARG.has(arg)) ? 1 : 0;
    if (positional.length > 1 + branchStart || positional.includes(".")) {
        return "git checkout <ref> <file> writes files back from git";
    }
    return null;
}

/**
 * Whether a `git show <ref>:<path>` is redirected onto that same path.
 * @param args - The words after `show`.
 * @param segment - The whole command text, for its redirect.
 * @returns True when the blob overwrites its own file.
 */
function showOverFile(args, segment) {
    const target = />\s*(\S+)/.exec(segment)?.[1];
    if (!target) {
        return false;
    }
    const clean = target.replace(/^\.\//, "");
    return args.some((arg) => {
        const path = /^[^:\s>]*:(?:[0-3]:)?(.+)$/.exec(arg)?.[1]?.replace(/^\.\//, "");
        return (
            path !== undefined &&
            path !== "" &&
            (path === clean || path.endsWith(`/${clean}`) || clean.endsWith(`/${path}`))
        );
    });
}

/**
 * Why a Bash call writes individual files back from git, or null when it does not.
 * @param input - The hook's input: tool_name and tool_input.
 * @returns A short description, or null.
 */
export function fileCheckoutIn(input) {
    const { tool_name: tool, tool_input: args } = input ?? {};
    const command = args?.command;
    if (tool !== "Bash" || typeof command !== "string") {
        return null;
    }
    // `>` stays inside a segment so `git show a:b > b` keeps its redirect
    for (const segment of command.split(/&&|\|\||[;&|\n(){}]/)) {
        const words = segment
            .split(">")[0]
            .trim()
            .split(/\s+/)
            .map((word) => word.replaceAll(/["']/g, ""));
        while (["do", "then", "else", "!"].includes(words[0])) {
            words.shift();
        }
        const git = gitCommand(words);
        if (!git) {
            continue;
        }
        if (git.name === "checkout") {
            const why = checkoutOfFiles(git.args);
            if (why) {
                return why;
            }
        } else if (git.name === "restore") {
            return "git restore writes files back from git";
        } else if (git.name === "checkout-index") {
            return "git checkout-index writes files back from the index";
        } else if (git.name === "show" && showOverFile(git.args, segment)) {
            return "git show <ref>:<file> > <file> writes a file back from git";
        }
    }
    return null;
}

/**
 * The hook's stdout for one input: a PreToolUse deny, or "" to allow.
 * @param input - The hook's input.
 * @returns The JSON decision, or "".
 */
export function respond(input) {
    const why = fileCheckoutIn(input);
    if (!why) {
        return "";
    }
    return JSON.stringify({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
                `Refused: ${why}. Never check out, restore or take one side of individual files. Settle a ` +
                "conflict by editing the file so it keeps both intents; for a generated or record file, rerun " +
                "its generator or test after the merge. If a run rewrote a tracked file you did not mean to " +
                "change, leave it uncommitted and say so in your report. Whole-branch checkouts " +
                "(git checkout <branch>, git switch) are allowed.",
        },
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.stdout.write(respond(JSON.parse(readFileSync(0, "utf8"))));
    } catch {
        // Never block a command because the hook itself failed.
    }
    process.exit(0);
}
