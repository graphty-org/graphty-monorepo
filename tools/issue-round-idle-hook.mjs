#!/usr/bin/env node
// Claude Code Stop hook, registered in .claude/settings.json: keeps a round session from ending a turn while it should
// be acting. On 2026-11-16 the issue-round session spent an hour on pipeline plumbing with ten jobs startable; on
// 2026-11-17 it reported "0 jobs, nothing startable" for about 15 hours while dead claims starved the queue.
//
// It blocks, at most once per 10 minutes per session and never on a stop that is already a Stop hook's continuation:
//   - any session whose /loop record (tmp/issue-round/loop-created or tmp/pipeline-round/loop-created, written by
//     tools/loop-record-hook.mjs) names it and is 6 days old or more: a loop expires at 7 days with no warning, so the
//     reason gives the exact CronCreate to run and the CronDelete after it. A new CronCreate clears it.
//   - the issue-round session (tmp/issue-round/last-round, under 75 minutes old) when its own verdict
//     (tmp/issue-round/idle.json, written by `node tools/issue-groups.mjs idle`) is under 10 minutes old and says idle:
//     jobs are startable, or the round is starved by a sink it can clear (issue-round SKILL.md, "Starved").
//   - the issue-round session when it has written no verdict in 35 minutes: it stopped running the idle step.
// It reads the cached verdict instead of running `idle`, whose GitHub reads take about 10 seconds. Bad input or a
// session that is not a round's is allowed; any other error is appended to tmp/issue-round/idle-hook.log, and for the
// round session it blocks with the error, so a broken hook is seen instead of silently allowing every stop.
//
//   echo '{"session_id":"..."}' | node tools/issue-round-idle-hook.mjs
import { appendFileSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRESH_MS = 75 * 60 * 1000;
const VERDICT_MS = 10 * 60 * 1000;
const NO_VERDICT_MS = 35 * 60 * 1000;
const QUIET_MS = 10 * 60 * 1000;
const RENEW_MS = 6 * 24 * 60 * 60 * 1000;
const ROUNDS = ["issue-round", "pipeline-round"];

const readJson = (path) => {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
        throw error;
    }
};

/**
 * The renewal block for a session whose loop is about to expire, or null.
 * @param root the main checkout
 * @param session the session id
 * @param now ms
 * @returns the block reason, or null
 */
export function loopReason(root, session, now) {
    for (const round of ROUNDS) {
        const rec = readJson(join(root, "tmp", round, "loop-created"));
        if (!rec || rec.session_id !== session || rec.deleted) continue;
        const age = now - Date.parse(rec.createdAt);
        if (Number.isNaN(age) || age < RENEW_MS) continue;
        return (
            `the ${round} /loop job ${rec.id} was created ${rec.createdAt} and expires 7 days after that with no ` +
            `warning. Renew it now: CronCreate with cron ${JSON.stringify(rec.cron)} and prompt ` +
            `${JSON.stringify(rec.prompt)}, then CronDelete ${rec.id}.`
        );
    }
    return null;
}

/**
 * The idle block reason for the issue-round session, or null.
 * @param dir tmp/issue-round
 * @param session the session id
 * @param now ms
 * @returns the reason, or null
 */
function idleReason(dir, session, now) {
    let lastAt;
    try {
        lastAt = statSync(join(dir, "last-round")).mtimeMs;
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
    if (now - lastAt >= FRESH_MS) return null;
    if (readFileSync(join(dir, "last-round"), "utf8").trim().split(/\s+/)[1] !== session) return null;
    const v = readJson(join(dir, "idle.json"));
    if (!v || v.session !== session || !Number.isFinite(v.at) || now - v.at >= NO_VERDICT_MS) {
        return (
            "issue-round wrote no idle verdict in 35 minutes. Run `node tools/issue-groups.mjs idle` and act on " +
            "its line (exit 1: start jobs, or clear each sink of a 'starved' line by issue-round SKILL.md, 'Starved')."
        );
    }
    if (now - v.at >= VERDICT_MS || v.idle !== true) return null;
    if (String(v.reason).startsWith("starved"))
        return `issue-round is starved: ${v.line}. Clear each sink now (issue-round SKILL.md, 'Starved'), then run \`node tools/issue-groups.mjs idle\` again.`;
    return (
        `issue-round is idle: ${v.line}. Start jobs now (issue-round step 1, 'Refill per job'), then end the reply ` +
        "with the line from `node tools/issue-groups.mjs idle`."
    );
}

/**
 * The hook's stdout for one input: a Stop block, or "" to allow. Records a block in tmp/issue-round/idle-hook.json.
 * @param input - The hook input.
 * @param root - The main checkout.
 * @param now - The current time in milliseconds.
 * @returns The JSON to print, or "".
 */
export function respond(input, root, now = Date.now()) {
    const session = input?.session_id;
    if (!session || input.stop_hook_active) return "";
    const dir = join(root, "tmp", "issue-round");
    const reason = loopReason(root, session, now) ?? idleReason(dir, session, now);
    if (!reason) return "";
    const stateFile = join(dir, "idle-hook.json");
    const state = readJson(stateFile) ?? {};
    if (now - (state[session] ?? 0) < QUIET_MS) return "";
    writeFileSync(stateFile, `${JSON.stringify({ ...state, [session]: now })}\n`);
    return JSON.stringify({ decision: "block", reason });
}

/**
 * Runs the hook on one input, logging an error instead of hiding it.
 * @param text the hook's stdin
 * @param root the main checkout
 * @param now ms
 * @returns the stdout
 */
export function hook(text, root, now = Date.now()) {
    let input;
    try {
        input = JSON.parse(text);
    } catch {
        return ""; // not a hook input
    }
    try {
        return respond(input, root, now);
    } catch (error) {
        const line = `${new Date(now).toISOString()} ${input?.session_id ?? "-"} ${String(error.stack ?? error)
            .split("\n")
            .slice(0, 2)
            .join(" | ")}\n`;
        try {
            appendFileSync(join(root, "tmp", "issue-round", "idle-hook.log"), line);
        } catch {
            // no log directory: nothing else to do
        }
        let round = null;
        try {
            round = readFileSync(join(root, "tmp", "issue-round", "last-round"), "utf8")
                .trim()
                .split(/\s+/)[1];
        } catch {
            // not a round machine
        }
        if (!input?.session_id || input.stop_hook_active || round !== input.session_id) return "";
        return JSON.stringify({
            decision: "block",
            reason: `the issue-round Stop hook failed (${line.trim()}); fix tools/issue-round-idle-hook.mjs, then run \`node tools/issue-groups.mjs idle\`.`,
        });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
    let text = "";
    try {
        text = readFileSync(0, "utf8");
    } catch {
        // no stdin: allow
    }
    process.stdout.write(hook(text, root));
}
