#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash), registered in .claude/settings.json: refuses a foreground
// Bash call that waits -- a while/until loop that sleeps, sleeps adding up to 30 seconds or more,
// `watch`, `gh run watch`, `gh pr checks --watch`, `tail -f`, `inotifywait`, and a `timeout` of 30
// seconds or more around a waiting command (tail, grep, bash -c, sh -c, a loop). A turn that waits over about 5 minutes loses
// its prompt cache, and the next turn pays to rebuild it. The same command with run_in_background
// is allowed: the session is notified when it ends. Any failure exits 0 silently (allow).
//
//   echo '{"tool_name":"Bash","tool_input":{"command":"sleep 300"}}' | node tools/claude-no-foreground-wait.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const UNIT = { s: 1, m: 60, h: 3600, d: 86400 };
const LIMIT = 30;

/**
 * Seconds a `sleep` argument list asks for (`sleep 1m 30s` is 90; `infinity` is Infinity).
 * @param args - The text after `sleep `.
 * @returns The total in seconds.
 */
function seconds(args) {
    if (args.startsWith("inf")) {
        return Infinity;
    }
    let total = 0;
    for (const token of args.trim().split(/\s+/)) {
        const match = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(token);
        if (!match) {
            break;
        }
        total += Number(match[1]) * UNIT[match[2] || "s"];
    }
    return total;
}

const TIMEOUT_OPTION_WITH_ARG = new Set(["-s", "-k", "--signal", "--kill-after"]);
const WAITING_UNDER_TIMEOUT = new Set(["tail", "grep", "until", "while", "inotifywait"]);

/**
 * Whether one command's words follow a file: `tail` with -f, -F, --follow or a short-flag group
 * holding f or F (`-fn0`).
 * @param words - One command's words.
 * @returns True for a following tail.
 */
function followsLog(words) {
    const at = words.indexOf("tail");
    return at >= 0 && words.slice(at + 1).some((word) => /^(?:-[A-Za-z]*[fF]|--follow\b)/.test(word));
}

/**
 * The command a `timeout` runs and its limit in seconds, or null when the words are not a timeout.
 * @param words - One command's words.
 * @returns The limit and the command's words, or null.
 */
function underTimeout(words) {
    if (words[0] !== "timeout") {
        return null;
    }
    let at = 1;
    while (words[at]?.startsWith("-")) {
        at += TIMEOUT_OPTION_WITH_ARG.has(words[at]) ? 2 : 1;
    }
    return { limit: seconds(words[at] ?? ""), command: words.slice(at + 1) };
}

/**
 * Whether one command is a timeout of 30 s or more around a waiting command. A timeout around real
 * work (a test run, a build) waits once and is allowed.
 * @param words - One command's words.
 * @returns True for a long timeout around a wait.
 */
function timedWait(words) {
    const timed = underTimeout(words);
    if (!timed || timed.limit < LIMIT) {
        return false;
    }
    const [name, flag] = timed.command;
    return (
        WAITING_UNDER_TIMEOUT.has(name) ||
        (["bash", "sh"].includes(name) && /^-[a-z]+$/.test(flag ?? "") && flag.includes("c"))
    );
}

/**
 * Why a Bash call is a foreground wait, or null when it is not.
 * @param input - The hook's input: tool_name and tool_input.
 * @returns A short description of the wait, or null.
 */
export function waitIn(input) {
    const { tool_name: tool, tool_input: args } = input ?? {};
    const command = args?.command;
    if (tool !== "Bash" || typeof command !== "string" || args.run_in_background === true) {
        return null;
    }
    if (/\b(?:until|while)\b[\s\S]*\bsleep\b/.test(command)) {
        return "a loop that sleeps";
    }
    if (/\bgh\s+run\s+watch\b/.test(command) || /\bgh\s+pr\s+checks\b[^;&|\n]*--watch\b/.test(command)) {
        return "a gh watch";
    }
    const commandWords = command.split(/[;&|({\n]/).map((part) => part.trim().split(/\s+/));
    if (
        commandWords.some(
            (words) => words[0] === "watch" || (["do", "then", "else"].includes(words[0]) && words[1] === "watch"),
        )
    ) {
        return "watch";
    }
    if (commandWords.some(followsLog)) {
        return "follows a log (tail -f)";
    }
    if (commandWords.some((words) => words.includes("inotifywait"))) {
        return "inotifywait";
    }
    if (commandWords.some(timedWait)) {
        return "a timeout of 30 s or more around a waiting command";
    }
    let total = 0;
    for (const [, sleepArgs] of command.matchAll(/\bsleep\s+([^;&|\n)]*)/g)) {
        total += seconds(sleepArgs);
    }
    return total >= LIMIT ? `sleeps of ${total} s` : null;
}

/**
 * The hook's stdout for one input: a PreToolUse deny, or "" to allow.
 * @param input - The hook's input.
 * @returns The JSON decision, or "".
 */
export function respond(input) {
    const wait = waitIn(input);
    if (!wait) {
        return "";
    }
    return JSON.stringify({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
                `Refused: this command waits in the foreground (${wait}). Waiting inside a turn drops the ` +
                "prompt cache. Run it with run_in_background: true (you are notified when it ends), or start " +
                "the push or run in the background and end the turn.",
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
