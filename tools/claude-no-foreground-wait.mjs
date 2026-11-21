#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash), registered in .claude/settings.json: refuses a foreground
// Bash call that waits -- a while/until loop that sleeps, sleeps adding up to 30 seconds or more,
// `watch`, `gh run watch`, `gh pr checks --watch`, `tail -f`, `inotifywait`, and a `timeout` of 30
// seconds or more around a waiting command (tail, grep, bash -c, sh -c, a loop). A turn that waits over about 5 minutes loses
// its prompt cache, and the next turn pays to rebuild it. The same command with run_in_background
// is allowed: the session is notified when it ends. Any failure exits 0 silently (allow).
//
//   echo '{"tool_name":"Bash","tool_input":{"command":"sleep 300"}}' | node tools/claude-no-foreground-wait.mjs
import { deny, runHook } from "./claude-hook.mjs";

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

const SHELLS = new Set(["bash", "sh", "zsh", "dash", "ksh"]);
// Commands whose quoted arguments and here-documents are themselves run, so they stay commands.
const RUNS_QUOTED = new Set([...SHELLS, "eval", "ssh", "watch", "xargs", "su", "parallel"]);

/**
 * Whether the command being built at the end of some sanitized text runs its quoted arguments.
 * @param text - Sanitized text so far.
 * @returns True when a word of the current command is a shell, eval, ssh, watch or xargs.
 */
function runsQuoted(text) {
    const segment = text.slice(Math.max(...[";", "&", "|", "(", "{", "\n"].map((c) => text.lastIndexOf(c))) + 1);
    return segment
        .trim()
        .split(/\s+/)
        .some((word) => RUNS_QUOTED.has(word.slice(word.lastIndexOf("/") + 1)));
}

/**
 * The text a quoted argument leaves: its sanitized contents when the command runs it, else `''`.
 * @param scan - The scan state.
 * @param inner - The quoted text.
 * @returns What to append.
 */
function quoted(scan, inner) {
    return runsQuoted(scan.out) ? ` ${sanitize(inner).out} ` : "''";
}

/**
 * Reads a single-quoted string at scan.at.
 * @param scan - The scan state.
 */
function singleQuoted(scan) {
    const end = scan.text.indexOf("'", scan.at + 1);
    const close = end < 0 ? scan.text.length : end;
    scan.out += quoted(scan, scan.text.slice(scan.at + 1, close));
    scan.at = close + 1;
}

/**
 * Reads a double-quoted string at scan.at. A `$(...)` inside it is run, so it is kept.
 * @param scan - The scan state.
 */
function doubleQuoted(scan) {
    const { text } = scan;
    let inner = "";
    let run = "";
    scan.at++;
    while (scan.at < text.length && text[scan.at] !== '"') {
        if (text[scan.at] === "\\") {
            inner += text[scan.at + 1] ?? "";
            scan.at += 2;
        } else if (text.startsWith("$(", scan.at)) {
            const sub = sanitize(text, scan.at + 2, true);
            run += `; ${sub.out}\n`;
            inner += text.slice(scan.at, sub.end);
            scan.at = sub.end;
        } else {
            inner += text[scan.at++];
        }
    }
    scan.at++;
    const kept = quoted(scan, inner);
    scan.out += kept === "''" ? `''${run}` : kept;
}

/**
 * Reads a here-document operator at scan.at and queues its body, read at the next newline.
 * @param scan - The scan state.
 */
function heredocStart(scan) {
    const match = /^<<(-?)\s*(['"]?)([\w.-]+)\2/.exec(scan.text.slice(scan.at));
    if (!match) {
        scan.out += "<<";
        scan.at += 2;
        return;
    }
    scan.heredocs.push({ strip: match[1] === "-", delimiter: match[3], keep: runsQuoted(scan.out) });
    scan.out += "<<EOF";
    scan.at += match[0].length;
}

/**
 * Reads the queued here-document bodies after the newline at scan.at, keeping only those a shell runs.
 * @param scan - The scan state.
 */
function heredocBodies(scan) {
    const { text } = scan;
    scan.out += "\n";
    scan.at++;
    for (const doc of scan.heredocs.splice(0)) {
        let body = "";
        while (scan.at < text.length) {
            const newline = text.indexOf("\n", scan.at);
            const lineEnd = newline < 0 ? text.length : newline;
            const line = text.slice(scan.at, lineEnd);
            scan.at = lineEnd + 1;
            if ((doc.strip ? line.replace(/^\t+/, "") : line) === doc.delimiter) {
                break;
            }
            body += `${line}\n`;
        }
        if (doc.keep) {
            scan.out += sanitize(body).out;
        }
    }
}

/**
 * Reads one plain character at scan.at; a comment is skipped to its line end.
 * @param scan - The scan state.
 */
function plain(scan) {
    const c = scan.text[scan.at];
    if (c === "#" && /(?:^|\s)$/.test(scan.out)) {
        const end = scan.text.indexOf("\n", scan.at);
        scan.at = end < 0 ? scan.text.length : end;
        return;
    }
    if (c === "(") {
        scan.depth++;
    } else if (c === ")") {
        scan.depth--;
    }
    scan.out += c;
    scan.at++;
}

/**
 * Reads one token at scan.at.
 * @param scan - The scan state.
 */
function step(scan) {
    const { text, at } = scan;
    const c = text[at];
    if (c === "\\") {
        scan.out += text.slice(at, at + 2);
        scan.at += 2;
    } else if (c === "'") {
        singleQuoted(scan);
    } else if (c === '"') {
        doubleQuoted(scan);
    } else if (text.startsWith("<<<", at)) {
        scan.out += "<<<";
        scan.at += 3;
    } else if (text.startsWith("<<", at)) {
        heredocStart(scan);
    } else if (c === "\n" && scan.heredocs.length > 0) {
        heredocBodies(scan);
    } else {
        plain(scan);
    }
}

/**
 * A command line with the text that is only data removed -- the contents of quoted arguments and of
 * here-documents -- so a commit message or an issue body that names a waiting command is not read
 * as one. Quoted text and here-documents given to a shell, eval, ssh, watch or xargs are run, so
 * they are kept (sanitized in turn), and so is a command substitution inside double quotes.
 * @param text - The command line.
 * @param start - Where to start reading.
 * @param inParens - True inside `$(...)`: stop at its closing parenthesis.
 * @returns The sanitized text and the index after what was read.
 */
function sanitize(text, start = 0, inParens = false) {
    const scan = { text, at: start, out: "", depth: 0, heredocs: [] };
    while (scan.at < text.length) {
        if (inParens && text[scan.at] === ")" && scan.depth === 0) {
            return { out: scan.out, end: scan.at + 1 };
        }
        step(scan);
    }
    return { out: scan.out, end: scan.at };
}

/**
 * Why a Bash call is a foreground wait, or null when it is not.
 * @param input - The hook's input: tool_name and tool_input.
 * @returns A short description of the wait, or null.
 */
export function waitIn(input) {
    const { tool_name: tool, tool_input: args } = input ?? {};
    if (tool !== "Bash" || typeof args?.command !== "string" || args.run_in_background === true) {
        return null;
    }
    const command = sanitize(args.command).out;
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
    return deny(
        `Refused: this command waits in the foreground (${wait}). Waiting inside a turn drops the ` +
            "prompt cache. Run it with run_in_background: true (you are notified when it ends), or start " +
            "the push or run in the background and end the turn.",
    );
}

runHook(import.meta.url, respond);
