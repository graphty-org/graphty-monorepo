// Tests of tools/claude-no-questions-in-rounds.mjs: a question from a session that ran a round in the last
// 75 minutes is denied; other sessions, stale rounds, other tools and bad input are allowed.
//
//   node --test tools/claude-no-questions-in-rounds.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { respond } from "./claude-no-questions-in-rounds.mjs";

const HOOK = new URL("./claude-no-questions-in-rounds.mjs", import.meta.url).pathname;
const SESSION = "a552a998-f11f-4df6-bd4f-5058df2b3afe";
const ask = (session_id) => ({ tool_name: "AskUserQuestion", session_id, tool_input: { questions: [] } });

function checkout(round, session, ageMinutes = 1) {
    const root = mkdtempSync(join(tmpdir(), "no-questions-"));
    const dir = join(root, "tmp", round);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "last-round");
    writeFileSync(file, `2026-11-15T15:00:00Z ${session}\n`);
    const at = (Date.now() - ageMinutes * 60 * 1000) / 1000;
    utimesSync(file, at, at);
    return root;
}

describe("claude-no-questions-in-rounds", () => {
    it("denies a question from a session running issue-round or pipeline-round", () => {
        for (const round of ["issue-round", "pipeline-round"]) {
            const out = JSON.parse(respond(ask(SESSION), checkout(round, SESSION)));
            assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
            assert.match(out.hookSpecificOutput.permissionDecisionReason, /ACTION NEEDED/);
        }
    });

    it("allows a question from another session, or after the round lapsed", () => {
        assert.equal(respond(ask("someone-else"), checkout("issue-round", SESSION)), "");
        assert.equal(respond(ask(SESSION), checkout("issue-round", SESSION, 80)), "");
        assert.equal(respond(ask(SESSION), mkdtempSync(join(tmpdir(), "no-questions-"))), "");
        assert.equal(respond(ask(undefined), checkout("issue-round", SESSION)), "");
    });

    it("allows every other tool", () => {
        const input = { tool_name: "Bash", session_id: SESSION, tool_input: { command: "ls" } };
        assert.equal(respond(input, checkout("issue-round", SESSION)), "");
    });

    it("denies through stdin and stays silent on bad input", () => {
        const root = checkout("issue-round", SESSION);
        const run = (input) =>
            spawnSync("node", [HOOK], { input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
        assert.match(run(JSON.stringify(ask(SESSION))).stdout, /"deny"/);
        const bad = run("not json");
        assert.equal(bad.status, 0);
        assert.equal(bad.stdout, "");
    });
});
