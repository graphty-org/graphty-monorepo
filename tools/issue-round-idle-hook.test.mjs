// Tests of tools/issue-round-idle-hook.mjs: the Stop hook blocks the issue-round session once per 10 minutes when its
// own fresh idle verdict says idle or starved, or when it wrote no verdict in 35 minutes; blocks any session whose
// /loop record is 6 days old; logs its own errors; and allows every other case.
//
//   node --test tools/issue-round-idle-hook.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { hook, respond } from "./issue-round-idle-hook.mjs";

const HOOK = new URL("./issue-round-idle-hook.mjs", import.meta.url).pathname;
const S = "a552a998-f11f-4df6-bd4f-5058df2b3afe";
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

function checkout({ session = S, roundAge = 1, verdict = {}, noVerdict = false } = {}) {
    const root = mkdtempSync(join(tmpdir(), "idle-hook-"));
    const dir = join(root, "tmp", "issue-round");
    mkdirSync(dir, { recursive: true });
    const last = join(dir, "last-round");
    writeFileSync(last, `2026-11-16T15:00:00Z ${session}\n`);
    const at = (Date.now() - roundAge * MIN) / 1000;
    utimesSync(last, at, at);
    const line = "idle: running 0, stuck 0, slots free 4 of 4, load 1/32, startable 10 -- start jobs";
    const v = { at: Date.now() - MIN, session, idle: true, reason: "start jobs", line, ...verdict };
    if (!noVerdict) writeFileSync(join(dir, "idle.json"), JSON.stringify(v));
    return root;
}

const loopRecord = (root, round, rec) => {
    mkdirSync(join(root, "tmp", round), { recursive: true });
    writeFileSync(join(root, "tmp", round, "loop-created"), JSON.stringify(rec));
};

describe("issue-round-idle-hook", () => {
    it("blocks the issue-round session when its fresh verdict says idle, echoing the line, then not again for 10 minutes", () => {
        const root = checkout();
        const out = JSON.parse(respond({ session_id: S }, root));
        assert.equal(out.decision, "block");
        assert.match(out.reason, /startable 10 -- start jobs/);
        assert.equal(respond({ session_id: S }, root), "");
    });

    it("points a starved verdict at the Starved section", () => {
        const verdict = { reason: "starved: stuck 1 (#6673 45h)", line: "idle: ... -- starved: stuck 1 (#6673 45h)" };
        const out = JSON.parse(respond({ session_id: S }, checkout({ verdict })));
        assert.match(out.reason, /starved.*#6673.*'Starved'/);
    });

    it("blocks when the round wrote no verdict in 35 minutes, and allows a verdict 10 to 35 minutes old", () => {
        assert.match(
            JSON.parse(respond({ session_id: S }, checkout({ noVerdict: true }))).reason,
            /no idle verdict in 35 minutes/,
        );
        assert.equal(
            JSON.parse(respond({ session_id: S }, checkout({ verdict: { at: Date.now() - 2 * 60 * MIN } }))).decision,
            "block",
        );
        assert.equal(respond({ session_id: S }, checkout({ verdict: { at: Date.now() - 20 * MIN } })), "");
    });

    it("allows a continuation, another session, a stale round and a busy verdict", () => {
        assert.equal(respond({ session_id: S, stop_hook_active: true }, checkout()), "");
        assert.equal(respond({ session_id: "other" }, checkout()), "");
        assert.equal(respond({ session_id: S }, checkout({ session: `${S}x` })), "");
        assert.equal(respond({ session_id: S }, checkout({ roundAge: 80 })), "");
        assert.equal(respond({ session_id: S }, checkout({ verdict: { idle: false } })), "");
        assert.equal(respond({}, checkout()), "");
        const root = mkdtempSync(join(tmpdir(), "idle-hook-"));
        assert.equal(respond({ session_id: S }, root), "", "no round on this machine");
    });

    it("blocks the session whose loop record is 6 days old with the exact renewal, and no other session", () => {
        const root = checkout({ verdict: { idle: false } });
        const rec = {
            id: "90a45dcb",
            session_id: "loop-s",
            cron: "*/30 * * * *",
            prompt: "/issue-round",
            createdAt: new Date(Date.now() - 6 * DAY).toISOString(),
        };
        loopRecord(root, "issue-round", rec);
        const out = JSON.parse(respond({ session_id: "loop-s" }, root));
        assert.match(
            out.reason,
            /CronCreate with cron "\*\/30 \* \* \* \*" and prompt "\/issue-round", then CronDelete 90a45dcb/,
        );
        assert.equal(respond({ session_id: "someone-else" }, root), "");
        // a newer CronCreate (loop-record-hook.mjs rewrites the record) clears it
        loopRecord(root, "issue-round", { ...rec, id: "new1", createdAt: new Date().toISOString() });
        assert.equal(respond({ session_id: "loop-s" }, root, Date.now() + 11 * MIN), "");
        loopRecord(root, "issue-round", { ...rec, deleted: new Date().toISOString() });
        assert.equal(respond({ session_id: "loop-s" }, root, Date.now() + 22 * MIN), "", "a deleted loop is a pause");
    });

    it("logs an error and blocks the round session with it, and allows bad input", () => {
        const root = checkout();
        rmSync(join(root, "tmp", "issue-round", "idle.json"));
        mkdirSync(join(root, "tmp", "issue-round", "idle.json")); // reading it fails with EISDIR
        const out = JSON.parse(hook(JSON.stringify({ session_id: S }), root));
        assert.match(out.reason, /Stop hook failed/);
        assert.match(readFileSync(join(root, "tmp", "issue-round", "idle-hook.log"), "utf8"), /EISDIR/);
        assert.equal(hook(JSON.stringify({ session_id: "other" }), root), "");
        assert.equal(hook("not json", root), "");
    });

    it("runs as a command", () => {
        const empty = mkdtempSync(join(tmpdir(), "idle-hook-"));
        for (const input of ["not json", JSON.stringify({ session_id: S })]) {
            const r = spawnSync(process.execPath, [HOOK], {
                input,
                env: { ...process.env, CLAUDE_PROJECT_DIR: empty },
            });
            assert.equal(r.status, 0);
            assert.equal(r.stdout.toString(), "");
        }
        const r = spawnSync(process.execPath, [HOOK], {
            input: JSON.stringify({ session_id: S }),
            env: { ...process.env, CLAUDE_PROJECT_DIR: checkout() },
        });
        assert.equal(r.status, 0);
        assert.equal(JSON.parse(r.stdout.toString()).decision, "block");
    });
});
