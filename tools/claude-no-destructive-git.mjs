#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash), registered in .claude/settings.json: refuses the git commands
// agents must never run (CLAUDE.md, .claude/skills/pipeline-round/shared.md "Subagent rules"),
// because in a worktree other agents share they throw away uncommitted work or copy commits:
//
//   git stash         except `stash list` and `stash show` (read-only)
//   git reset         every form; to unstage, use `git restore --staged <file>`
//   git restore       except `--staged`/`-S` without `--worktree`/`-W`: it changes only the index,
//                     never a file on disk, so no work is lost
//   git clean         except `-n`/`--dry-run`
//   git checkout      except creating a branch (`-b`, `-B`, `--orphan`) with no `--` paths; change
//                     branches with `git switch`
//   git cherry-pick, git rebase   except `--abort` and `--quit` (never copy, always merge)
//   git commit --amend            the post-commit hook has already pushed the commit: make a new one
//
// It reads every git call in the line, also after `-C <dir>`, `-c <k=v>` and the other global
// options, and inside `bash -c '...'`. Text that is only data -- a quoted commit message, a
// here-document fed to cat -- is not read (sanitize, shared with claude-no-foreground-wait.mjs).
// Everything else is allowed: add, commit, push, merge, switch, worktree, fetch, log, diff, status.
// Any failure exits 0 silently (allow).
//
//   echo '{"tool_name":"Bash","tool_input":{"command":"git stash"}}' | node tools/claude-no-destructive-git.mjs
import { deny, runHook, sanitize } from "./claude-no-foreground-wait.mjs";

// Global options that take the next word as their value.
const GLOBAL_WITH_ARG = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);

/**
 * Why one git call is refused, or null when it is allowed.
 * @param sub - The git subcommand.
 * @param args - The words after it.
 * @returns A short reason, or null.
 */
function refusal(sub, args) {
    const has = (...flags) => args.some((arg) => flags.includes(arg));
    switch (sub) {
        case "stash":
            return ["list", "show"].includes(args[0]) ? null : "git stash takes other agents' uncommitted work";
        case "reset":
            return "git reset discards or moves work; to unstage use git restore --staged <file>";
        case "restore":
            return has("--staged", "-S") && !has("--worktree", "-W")
                ? null
                : "git restore overwrites files on disk; only git restore --staged is allowed";
        case "clean":
            return has("-n", "--dry-run") ? null : "git clean deletes untracked files";
        case "checkout":
            return has("-b", "-B", "--orphan") && !has("--")
                ? null
                : "git checkout overwrites files; use git switch to change branches";
        case "cherry-pick":
        case "rebase":
            return has("--abort", "--quit") ? null : `git ${sub} copies commits; never copy, always merge`;
        case "commit":
            return has("--amend") ? "git commit --amend rewrites a pushed commit; make a new commit" : null;
        default:
            return null;
    }
}

/**
 * Why a Bash call runs a banned git command, or null when it does not.
 * @param input - The hook's input: tool_name and tool_input.
 * @returns A short reason, or null.
 */
export function gitRefusal(input) {
    const { tool_name: tool, tool_input: args } = input ?? {};
    if (tool !== "Bash" || typeof args?.command !== "string") {
        return null;
    }
    for (const part of sanitize(args.command).out.split(/[;&|(){}\n]|(?:^|\s)(?:then|do|else)\s/)) {
        const words = part.trim().split(/\s+/);
        let at = words.findIndex((word) => word.slice(word.lastIndexOf("/") + 1) === "git") + 1;
        if (at === 0) {
            continue;
        }
        while (words[at]?.startsWith("-")) {
            at += GLOBAL_WITH_ARG.has(words[at]) ? 2 : 1;
        }
        const reason = words[at] ? refusal(words[at], words.slice(at + 1)) : null;
        if (reason) {
            return reason;
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
    const reason = gitRefusal(input);
    if (!reason) {
        return "";
    }
    return deny(
        `Refused: ${reason}. Agents never stash, reset, restore, clean, check out files, cherry-pick, ` +
            "rebase or amend (CLAUDE.md). If a run rewrote a tracked file, leave it uncommitted and say so.",
    );
}

runHook(import.meta.url, respond);
