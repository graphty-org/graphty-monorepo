#!/usr/bin/env node
// Claude Code PostToolUse hook on CronCreate and CronDelete, registered in .claude/settings.json: records a round's
// /loop job, so tools/issue-round-idle-hook.mjs can tell its session to renew it before CronCreate's 7-day expiry (the
// 2026-10-31 loop ran its last round on 2026-11-07 and nobody noticed for four days). The record used to be written
// by hand in a prose step and was wrong: one named a deleted job, another was 30 minutes off.
//
// A CronCreate whose result says "Scheduled recurring job <id>" and whose prompt names a round writes
// tmp/<round>/loop-created as { id, session_id, cron, prompt, createdAt }; a prompt naming both rounds is the one-client
// loop, kept under tmp/pipeline-round/. A CronDelete of a recorded id marks that record deleted. Any failure allows.
//
//   echo '{"tool_name":"CronCreate",...}' | node tools/loop-record-hook.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROUNDS = ["pipeline-round", "issue-round"];

const roundOf = (prompt) => ROUNDS.find((r) => String(prompt ?? "").includes(r)) ?? null;

/**
 * Applies one hook input to the loop records.
 * @param input the PostToolUse input
 * @param root the main checkout
 * @param now ms
 * @returns the path written, or null
 */
export function record(input, root, now = Date.now()) {
    const { tool_name: tool, tool_input: args = {}, tool_response: response, session_id: session } = input ?? {};
    if (tool === "CronCreate") {
        const text = typeof response === "string" ? response : JSON.stringify(response ?? "");
        const id = /Scheduled recurring job ([\w-]+)/.exec(text)?.[1];
        const round = roundOf(args.prompt);
        if (!id || !round || !session) return null;
        const dir = join(root, "tmp", round);
        mkdirSync(dir, { recursive: true });
        const rec = {
            id,
            session_id: session,
            cron: args.cron,
            prompt: args.prompt,
            createdAt: new Date(now).toISOString(),
        };
        writeFileSync(join(dir, "loop-created"), `${JSON.stringify(rec)}\n`);
        return join(dir, "loop-created");
    }
    if (tool === "CronDelete" && args.id) {
        for (const round of ROUNDS) {
            const path = join(root, "tmp", round, "loop-created");
            let rec;
            try {
                rec = JSON.parse(readFileSync(path, "utf8"));
            } catch {
                continue; // missing, or the old one-line format
            }
            if (rec.id !== args.id) continue;
            writeFileSync(path, `${JSON.stringify({ ...rec, deleted: new Date(now).toISOString() })}\n`);
            return path;
        }
    }
    return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        record(JSON.parse(readFileSync(0, "utf8")), process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
    } catch {
        // a record hook never stops the tool
    }
}
