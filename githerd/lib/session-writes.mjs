/**
 * GitHub writes made from Claude sessions (design 5.6 and 10.1): every session in the repository,
 * the owner's and the workers', runs the project's PreToolUse hook on Bash, which logs each `gh`
 * write it is about to run to `session-writes.jsonl` in the state directory. The daemon reads the
 * log before it counts an owner-account comment, reopen or label change as the owner's own input:
 * an agent writes with the owner's account too, and its words are not his.
 */

import { appendFileSync, closeSync, openSync, readSync, statSync } from "node:fs";
import { join } from "node:path";

import { baseName, splitCommands } from "./shellwords.mjs";

/**
 * The log, in the state directory.
 * ponytail: appended forever and read only from its tail; rotate it when its size matters.
 */
export const SESSION_WRITES = "session-writes.jsonl";
/** How much of the log is read: the newest entries are the ones that can match. */
const TAIL_BYTES = 256 * 1024;
/** An event this long after a logged write, or a minute before it, is that write. */
const AFTER_MS = 10 * 60_000;
const BEFORE_MS = 60_000;

/** gh commands that write to an issue or a pull request, by group. */
const WRITES = /** @type {Record<string, Set<string>>} */ ({
    issue: new Set(["comment", "edit", "close", "reopen", "create", "delete", "lock", "unlock", "transfer"]),
    pr: new Set(["comment", "edit", "close", "reopen", "create", "review", "ready", "merge", "lock", "unlock"]),
});

/** `gh api` options that make it a write. */
const API_WRITE = /^(-f|-F|--field|--raw-field|--input)$|^(-f|-F)./;

/**
 * The issue and pull request numbers a command names: plain or `#` numbers, and the numbers in
 * `issues/<n>`, `pulls/<n>` and `pull/<n>` paths and URLs.
 * @param {string[]} args the words after `gh`
 * @returns {number[]} the numbers
 */
function numbersIn(args) {
    const out = new Set();
    for (const a of args) {
        const plain = /^#?(\d+)$/.exec(a);
        if (plain) out.add(Number(plain[1]));
        for (const m of a.matchAll(/(?:issues|pulls?)\/(\d+)/g)) out.add(Number(m[1]));
    }
    return [...out].sort((x, y) => x - y);
}

/**
 * The gh writes a Bash command line makes, as the numbers each names; null when it makes none.
 * @param {string} command the command line
 * @returns {number[][] | null} one list per write (empty when the write names no number, such as a
 *   comment on the current branch's pull request)
 */
export function ghWrites(command) {
    let cmds;
    try {
        cmds = splitCommands(command);
    } catch {
        // A line the parser cannot read may still write: count it, naming every number in it.
        return /\bgh\b/.test(command) ? [numbersIn(command.split(/\s+/))] : null;
    }
    const writes = [];
    for (const { argv } of cmds) {
        const at = argv.findIndex((w) => baseName(w) === "gh");
        if (at < 0) continue;
        const args = argv.slice(at + 1);
        const [group, verb] = args;
        const method = args.findIndex((a) => a === "-X" || a === "--method");
        const api =
            group === "api" &&
            (args.some((a) => API_WRITE.test(a) || /^--method=(?!GET)/i.test(a)) ||
                (method >= 0 && !/^GET$/i.test(args[method + 1] ?? "")));
        if (api || WRITES[group]?.has(verb)) writes.push(numbersIn(args));
    }
    return writes.length ? writes : null;
}

/**
 * Logs the gh writes of a Bash call (the PreToolUse hook). Never throws.
 * @param {string} stateDir the state directory
 * @param {any} input the hook input
 * @param {string | null} job the worker's job, null in an owner session
 * @param {Date} now the clock
 */
export function logSessionWrites(stateDir, input, job, now) {
    if (input?.tool_name !== "Bash" || typeof input.tool_input?.command !== "string") return;
    const writes = ghWrites(input.tool_input.command);
    if (!writes) return;
    const session = typeof input.session_id === "string" ? input.session_id : null;
    const lines = writes.map((numbers) => JSON.stringify({ at: now.toISOString(), session, job, numbers }));
    try {
        appendFileSync(join(stateDir, SESSION_WRITES), `${lines.join("\n")}\n`);
    } catch {
        // a log that cannot be written loses the line; the event then counts as the owner's
    }
}

/**
 * The number at the end of a target such as `issue:123` or `#123`.
 * @param {string} target the target
 * @returns {number} the number, or NaN when the target does not end in one
 */
function targetNumber(target) {
    let i = target.length;
    while (i > 0 && target[i - 1] >= "0" && target[i - 1] <= "9") i--;
    return i < target.length ? Number(target.slice(i)) : Number.NaN;
}

/**
 * Whether an owner-account event on GitHub was a session's write: a logged write naming its number
 * (or no number) from a minute after it to 10 minutes before it.
 * @param {string} stateDir the state directory
 * @returns {(target: string, at: string) => boolean} the check, for `issue:<n>`, `pr:<n>` or `#<n>`
 */
export function sessionWriteCheck(stateDir) {
    return (target, at) => {
        const n = targetNumber(target);
        const t = Date.parse(at);
        return readLog(stateDir).some((w) => {
            const d = t - Date.parse(w.at);
            return d <= AFTER_MS && d >= -BEFORE_MS && (!w.numbers?.length || w.numbers.includes(n));
        });
    };
}

/**
 * The newest entries of the log.
 * @param {string} stateDir the state directory
 * @returns {{at: string, numbers?: number[]}[]} the entries
 */
function readLog(stateDir) {
    const path = join(stateDir, SESSION_WRITES);
    let text = "";
    try {
        const { size } = statSync(path);
        const length = Math.min(size, TAIL_BYTES);
        const buf = Buffer.alloc(length);
        const fd = openSync(path, "r");
        try {
            readSync(fd, buf, 0, length, size - length);
        } finally {
            closeSync(fd);
        }
        text = buf.toString("utf8");
    } catch {
        return [];
    }
    return text.split("\n").flatMap((line) => {
        try {
            return [JSON.parse(line)];
        } catch {
            return [];
        }
    });
}
