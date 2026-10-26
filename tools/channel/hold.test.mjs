// Tests of the held nightly candidate's records (hold.mjs).
// Run: node tools/channel/hold.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { HOLD_TITLE, holdIssue } from "./hold.mjs";

describe("holdIssue", () => {
    it("names the commit by 12 characters and says how the hold ends", () => {
        const { title, body } = holdIssue({ sha: "a".repeat(40), state: "red", what: "T4 GPU", run: "https://run" });
        assert.equal(title, `${HOLD_TITLE} ${"a".repeat(12)}`);
        assert.match(body, /ended red \(T4 GPU\) after its one same-commit re-run: https:\/\/run/);
        assert.match(body, /fixed forward on a branch made from the candidate's head/);
        assert.match(body, /-f mode=abandon/);
    });
});

describe("start", () => {
    it("opens the issue, and fails the job when the store cannot record the hold", () => {
        const dir = mkdtempSync(join(tmpdir(), "hold-"));
        const log = join(dir, "calls.log");
        writeFileSync(join(dir, "gh"), `#!/bin/bash\necho "$*" >> "${log}"\necho https://github.com/o/r/issues/31\n`, {
            mode: 0o755,
        });
        const r = spawnSync(process.execPath, ["tools/channel/hold.mjs", "start"], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                RESULTS_URL: "",
                GITHUB_OUTPUT: "",
                SHA: "b".repeat(40),
                STATE: "green-images",
                WHAT: "2 screenshots differ",
                RUN_URL: "https://run",
            },
        });
        assert.match(
            readFileSync(log, "utf8"),
            /^issue create --title Nightly held on bbbbbbbbbbbb --label bug --label priority:high/m,
        );
        assert.notEqual(r.status, 0, "a hold the store did not record is no hold");
        assert.match(r.stderr, /POST \/v1\/hold failed/);
    });
});
