// Tests of tools/prepush-tests.mjs: a failed shard's whole log outlives the next run, which
// overwrites tmp/prepush-tests/<shard>.log. The runner is copied into a scratch git repository
// beside a one-shard test matrix and stubbed run-tests.sh and test-slots.mjs.
//
//   node --test tools/prepush-tests.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const RUNNER = new URL("./prepush-tests.mjs", import.meta.url).pathname;

function scratchRepo() {
    const dir = mkdtempSync(join(tmpdir(), "prepush-tests-"));
    mkdirSync(join(dir, "tools"));
    copyFileSync(RUNNER, join(dir, "tools/prepush-tests.mjs"));
    writeFileSync(
        join(dir, "tools/ci-test-matrix.mjs"),
        `export const SHARDS = [{ shard: "fake", package: "fake", "test-command": "cd fake && vitest run" }];\n`,
    );
    // The shard prints whatever tmp/fake-output holds and exits with the code in tmp/fake-exit.
    writeFileSync(join(dir, "tools/run-tests.sh"), `cat tmp/fake-output; exit "$(cat tmp/fake-exit)"\n`);
    writeFileSync(
        join(dir, "tools/test-slots.mjs"),
        `import { spawnSync } from "node:child_process";\n` +
            `process.exit(spawnSync(process.argv[2], process.argv.slice(3), { stdio: "inherit" }).status ?? 1);\n`,
    );
    mkdirSync(join(dir, "tmp"));
    execFileSync("git", ["init", "-q"], { cwd: dir });
    return dir;
}

function run(dir, output, exit) {
    writeFileSync(join(dir, "tmp/fake-output"), output);
    writeFileSync(join(dir, "tmp/fake-exit"), String(exit));
    return spawnSync(process.execPath, ["tools/prepush-tests.mjs", '["fake"]'], { cwd: dir, encoding: "utf8" });
}

describe("prepush-tests", () => {
    it("keeps a failed shard's test name and error past the next run", () => {
        const dir = scratchRepo();
        const first = run(dir, " FAIL  src/a.test.ts > draws the edge\nError: Test timed out in 5000ms.\n", 1);
        assert.equal(first.status, 1, first.stdout + first.stderr);
        const kept = /\[FAIL\] fake: its whole log is kept in (\S+)/.exec(first.stdout)?.[1];
        assert.ok(kept, first.stdout);
        assert.ok(kept.startsWith(join(dir, "tmp/push-gate-logs/")), kept);

        // The next push from the same worktree: it fails differently and overwrites tmp/prepush-tests/.
        const second = run(dir, " FAIL  src/b.test.ts > another test\nError: fetch failed\n", 1);
        assert.equal(second.status, 1);
        assert.match(readFileSync(join(dir, "tmp/prepush-tests/fake.log"), "utf8"), /fetch failed/);

        const firstLog = readFileSync(kept, "utf8");
        assert.match(firstLog, /FAIL {2}src\/a\.test\.ts > draws the edge/);
        assert.match(firstLog, /Test timed out in 5000ms/);
        assert.equal(readdirSync(join(dir, "tmp/push-gate-logs")).length, 2);
    });

    it("keeps nothing when every shard passes", () => {
        const dir = scratchRepo();
        const r = run(dir, " PASS  src/a.test.ts\n", 0);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.doesNotMatch(r.stdout, /kept in/);
    });
});
