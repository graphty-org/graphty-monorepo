#!/usr/bin/env node
// tools/lfs-pull-retry.sh retries a failed `git lfs pull` and still fails after the last try.
// A fake `git` first on PATH fails a set number of times, counting its calls in a file.
// Run: node tools/lfs-pull-retry.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("lfs-pull-retry.sh", import.meta.url));
const dirs = [];
after(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/**
 * Runs the script with a fake git that fails its first `failures` calls.
 * @param failures how many calls fail before one succeeds
 * @returns the run's status, stderr and the argument lines git was called with
 */
function run(failures) {
    const dir = mkdtempSync(join(tmpdir(), "lfs-pull-retry-"));
    dirs.push(dir);
    const calls = join(dir, "calls");
    writeFileSync(calls, "");
    writeFileSync(
        join(dir, "git"),
        `#!/bin/sh
echo "$*" >> '${calls}'
n=$(wc -l < '${calls}')
if [ "$n" -le ${failures} ]; then echo "batch response: Fatal error: Server error HTTP 502" >&2; exit 2; fi
exit 0
`,
    );
    chmodSync(join(dir, "git"), 0o755);
    const r = spawnSync("bash", [SCRIPT, "--include", "visual-fonts/**"], {
        encoding: "utf8",
        env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}`, LFS_PULL_RETRY_DELAYS: "0 0" },
    });
    return { status: r.status, stderr: r.stderr, calls: readFileSync(calls, "utf8").trim().split("\n") };
}

describe("lfs-pull-retry.sh", () => {
    it("succeeds on the third try after two failures", () => {
        const r = run(2);
        assert.equal(r.status, 0, r.stderr);
        assert.deepEqual(r.calls, Array(3).fill("lfs pull --include visual-fonts/**"));
        assert.match(r.stderr, /try 1 of 3/);
        assert.match(r.stderr, /try 2 of 3/);
    });

    it("does not retry a pull that succeeds", () => {
        const r = run(0);
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.calls.length, 1);
    });

    it("fails with git's status after three failures", () => {
        const r = run(99);
        assert.equal(r.status, 2);
        assert.equal(r.calls.length, 3);
        assert.match(r.stderr, /try 3 of 3/);
    });
});
