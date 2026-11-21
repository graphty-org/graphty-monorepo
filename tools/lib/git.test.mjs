// Tests of tools/lib/git.mjs: git throws on failure, gitOrNull answers null, gitRun keeps the code and both streams.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { git, gitOrNull, gitRun } from "./git.mjs";

test("git throws on failure, gitOrNull answers null, gitRun keeps the code", () => {
    const dir = mkdtempSync(join(tmpdir(), "lib-git-"));
    try {
        git(["init", "-q"], { cwd: dir });
        assert.equal(git(["rev-parse", "--is-inside-work-tree"], { cwd: dir }), "true");
        assert.equal(git(["rev-parse", "--is-inside-work-tree"], { cwd: dir, trim: false }), "true\n");
        assert.throws(
            () => git(["rev-parse", "--verify", "HEAD"], { cwd: dir, stdio: "pipe" }),
            (e) => e.status === 128,
        );
        assert.equal(gitOrNull(["rev-parse", "-q", "--verify", "HEAD"], { cwd: dir }), null);
        const r = gitRun(["rev-parse", "--verify", "HEAD"], { cwd: dir });
        assert.equal(r.code, 128);
        assert.match(r.err, /single revision/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
