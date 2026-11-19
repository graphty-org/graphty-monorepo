// Tests of tools/loop-record-hook.mjs: a CronCreate for a round records its /loop job, a CronDelete marks it deleted.
//
//   node --test tools/loop-record-hook.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { record } from "./loop-record-hook.mjs";

const HOOK = new URL("./loop-record-hook.mjs", import.meta.url).pathname;
const NOW = Date.parse("2026-11-17T21:15:00Z");
const created = (prompt, id = "90a45dcb", session = "s1") => ({
    session_id: session,
    tool_name: "CronCreate",
    tool_input: { cron: "*/30 * * * *", prompt },
    tool_response: `Scheduled recurring job ${id} (Every 30 minutes). Next run: Nov 17 1:45pm. Session-only`,
});
const read = (root, round) => JSON.parse(readFileSync(join(root, "tmp", round, "loop-created"), "utf8"));

describe("loop-record-hook", () => {
    it("records a CronCreate for /issue-round with its id, session, cron and prompt", () => {
        const root = mkdtempSync(join(tmpdir(), "loop-rec-"));
        record(created("/issue-round"), root, NOW);
        assert.deepEqual(read(root, "issue-round"), {
            id: "90a45dcb",
            session_id: "s1",
            cron: "*/30 * * * *",
            prompt: "/issue-round",
            createdAt: "2026-11-17T21:15:00.000Z",
        });
    });

    it("keeps the one-client loop under pipeline-round, ignores other prompts and one-shot jobs", () => {
        const root = mkdtempSync(join(tmpdir(), "loop-rec-"));
        record(created("run /pipeline-round, then /issue-round"), root, NOW);
        assert.equal(read(root, "pipeline-round").prompt, "run /pipeline-round, then /issue-round");
        assert.equal(existsSync(join(root, "tmp", "issue-round", "loop-created")), false);
        assert.equal(record(created("check the deploy"), root, NOW), null);
        const once = { ...created("/issue-round"), tool_response: "Scheduled one-shot job abc (at 3pm)" };
        assert.equal(record(once, root, NOW), null);
    });

    it("marks the record deleted on a CronDelete of its id only", () => {
        const root = mkdtempSync(join(tmpdir(), "loop-rec-"));
        record(created("/issue-round"), root, NOW);
        record({ tool_name: "CronDelete", tool_input: { id: "other" } }, root, NOW);
        assert.equal(read(root, "issue-round").deleted, undefined);
        record({ tool_name: "CronDelete", tool_input: { id: "90a45dcb" } }, root, NOW);
        assert.equal(read(root, "issue-round").deleted, "2026-11-17T21:15:00.000Z");
        record(created("/issue-round", "new1"), root, NOW + 1000);
        assert.equal(read(root, "issue-round").deleted, undefined, "a new CronCreate replaces it");
    });

    it("runs as a command and never fails the tool", () => {
        const root = mkdtempSync(join(tmpdir(), "loop-rec-"));
        const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
        assert.equal(spawnSync(process.execPath, [HOOK], { input: "not json", env }).status, 0);
        const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(created("/issue-round")), env });
        assert.equal(r.status, 0);
        assert.equal(read(root, "issue-round").id, "90a45dcb");
    });
});
