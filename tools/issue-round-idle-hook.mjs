#!/usr/bin/env node
// Claude Code Stop hook, registered in .claude/settings.json: keeps the issue-round session from ending a turn while
// fix jobs are startable and the machine has room for them. On 2026-11-16 the session spent an hour on pipeline
// plumbing and started almost no jobs while ten were startable and test slots were free.
//
// It blocks only when all hold: the stop is not already a continuation from a Stop hook (stop_hook_active); the
// session is the one in tmp/issue-round/last-round, written under 75 minutes ago; the verdict the session's own last
// `node tools/issue-groups.mjs idle` wrote (tmp/issue-round/idle.json) is under 10 minutes old, names this session and
// says idle; and this hook has not blocked this session in the last 10 minutes. It reads the cached verdict instead of
// running `idle`, whose GitHub reads take about 10 seconds. Any failure exits 0 silently (allow).
//
//   echo '{"session_id":"..."}' | node tools/issue-round-idle-hook.mjs
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRESH_MS = 75 * 60 * 1000;
const VERDICT_MS = 10 * 60 * 1000;
const QUIET_MS = 10 * 60 * 1000;

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
    const last = join(dir, "last-round");
    if (now - statSync(last).mtimeMs >= FRESH_MS) return "";
    if (readFileSync(last, "utf8").trim().split(/\s+/)[1] !== session) return "";
    const v = JSON.parse(readFileSync(join(dir, "idle.json"), "utf8"));
    if (v.idle !== true || v.session !== session || !Number.isFinite(v.at) || now - v.at >= VERDICT_MS) return "";
    const stateFile = join(dir, "idle-hook.json");
    let state = {};
    try {
        state = JSON.parse(readFileSync(stateFile, "utf8"));
    } catch {
        // first block
    }
    if (now - (state[session] ?? 0) < QUIET_MS) return "";
    writeFileSync(stateFile, `${JSON.stringify({ [session]: now })}\n`);
    return JSON.stringify({
        decision: "block",
        reason:
            `issue-round is idle: ${v.startable} jobs startable, ${v.running} running, test slots free. ` +
            "Start jobs now (issue-round step 1, 'Refill per job'), then end the reply with the line from " +
            "`node tools/issue-groups.mjs idle`.",
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
        process.stdout.write(respond(JSON.parse(readFileSync(0, "utf8")), root));
    } catch {
        // Allow on any failure.
    }
}
