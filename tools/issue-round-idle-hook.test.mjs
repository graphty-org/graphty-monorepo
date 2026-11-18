// Tests of tools/issue-round-idle-hook.mjs: the Stop hook blocks the issue-round session once per 10 minutes when its
// own fresh idle verdict says idle, and allows every other case, including bad input and missing files.
//
//   node --test tools/issue-round-idle-hook.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { respond } from "./issue-round-idle-hook.mjs";

const HOOK = new URL("./issue-round-idle-hook.mjs", import.meta.url).pathname;
const S = "a552a998-f11f-4df6-bd4f-5058df2b3afe";
const MIN = 60_000;

function checkout({ session = S, roundAge = 1, verdict = {} } = {}) {
    const root = mkdtempSync(join(tmpdir(), "idle-hook-"));
    const dir = join(root, "tmp", "issue-round");
    mkdirSync(dir, { recursive: true });
    const last = join(dir, "last-round");
    writeFileSync(last, `2026-11-16T15:00:00Z ${session}\n`);
    const at = (Date.now() - roundAge * MIN) / 1000;
    utimesSync(last, at, at);
    const v = { at: Date.now() - MIN, session, idle: true, startable: 10, running: 0, ...verdict };
    writeFileSync(join(dir, "idle.json"), JSON.stringify(v));
    return root;
}

describe("issue-round-idle-hook", () => {
    it("blocks the issue-round session when its fresh verdict says idle, then not again for 10 minutes", () => {
        const root = checkout();
        const out = JSON.parse(respond({ session_id: S }, root));
        assert.equal(out.decision, "block");
        assert.match(out.reason, /10 jobs startable, 0 running/);
        assert.equal(respond({ session_id: S }, root), "");
        assert.equal(respond({ session_id: S }, root, Date.now() + 11 * MIN), "", "the verdict is stale by then");
    });

    it("allows a continuation, another session, a stale round, a stale or busy verdict", () => {
        assert.equal(respond({ session_id: S, stop_hook_active: true }, checkout()), "");
        assert.equal(respond({ session_id: "other" }, checkout()), "");
        assert.equal(respond({ session_id: S }, checkout({ session: `${S}x` })), "");
        assert.equal(respond({ session_id: S }, checkout({ roundAge: 80 })), "");
        assert.equal(respond({ session_id: S }, checkout({ verdict: { at: Date.now() - 11 * MIN } })), "");
        assert.equal(respond({ session_id: S }, checkout({ verdict: { idle: false } })), "");
        assert.equal(respond({ session_id: S }, checkout({ verdict: { session: "other" } })), "");
        assert.equal(respond({}, checkout()), "");
    });

    it("allows on bad input or missing files as a command", () => {
        const root = mkdtempSync(join(tmpdir(), "idle-hook-"));
        for (const input of ["not json", JSON.stringify({ session_id: S })]) {
            const r = spawnSync(process.execPath, [HOOK], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
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
