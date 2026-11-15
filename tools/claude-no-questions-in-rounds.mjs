#!/usr/bin/env node
// Claude Code PreToolUse hook (AskUserQuestion), registered in .claude/settings.json: refuses a
// question to the owner from a session that runs issue-round or pipeline-round. A question blocks
// the session until he answers, and while it waits no round runs: on the night of 2026-11-15 one
// question about a single line of wording stopped the issue loop for hours. A round session
// recognises itself by its id in tmp/issue-round/last-round or tmp/pipeline-round/last-round,
// written less than 75 minutes ago (the same window the skills use to tell a loop is running).
// Any failure exits 0 silently (allow).
//
//   echo '{"tool_name":"AskUserQuestion","session_id":"..."}' | node tools/claude-no-questions-in-rounds.mjs
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROUNDS = ["issue-round", "pipeline-round"];
const FRESH_MS = 75 * 60 * 1000;

/**
 * Whether a session wrote one of the rounds' last-round files recently.
 * @param root - The main checkout.
 * @param session - The session id from the hook input.
 * @param now - The current time in milliseconds.
 * @returns True when the session runs a round.
 */
export function runsRound(root, session, now) {
    if (!session) {
        return false;
    }
    return ROUNDS.some((round) => {
        const file = join(root, "tmp", round, "last-round");
        try {
            return now - statSync(file).mtimeMs < FRESH_MS && readFileSync(file, "utf8").includes(session);
        } catch {
            return false;
        }
    });
}

/**
 * The hook's stdout for one input: a PreToolUse deny, or "" to allow.
 * @param input - The hook input.
 * @param root - The main checkout.
 * @param now - The current time in milliseconds.
 * @returns The JSON to print, or "".
 */
export function respond(input, root, now = Date.now()) {
    if (input?.tool_name !== "AskUserQuestion" || !runsRound(root, input.session_id, now)) {
        return "";
    }
    return JSON.stringify({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
                "This session runs issue-round or pipeline-round, and a question would stop the loop until the owner " +
                "answers. Decide a two-way door yourself and state it in one line. For an owner-only item, park it " +
                "(auto-merge off, or label needs-decision with the question as a comment), end the reply with one " +
                "ACTION NEEDED line, and keep the round going. See 'Never block on the owner' in " +
                ".claude/skills/pipeline-round/shared.md.",
        },
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
