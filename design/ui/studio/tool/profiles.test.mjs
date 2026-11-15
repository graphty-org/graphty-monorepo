// node --test design/ui/studio/tool/profiles.test.mjs
// A browser profile left by a process that was killed (no close ran) is removed by the next sweep;
// a live owner's profile and a folder not named by a pid are kept.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { profileOf, sweepProfiles } from "./profiles.mjs";

test("a dead owner's profile is swept, a live one's is kept", () => {
    const root = mkdtempSync(join(tmpdir(), "profiles-test-"));
    try {
        // a pid that has exited: a finished child's
        const dead = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], {
            encoding: "utf8",
        }).stdout;
        const gone = profileOf(root, "warm", dead);
        const mine = profileOf(root, "graphty-real-abc");
        const other = join(root, "not-a-profile");
        for (const d of [gone, mine, other]) mkdirSync(join(d, "Default"), { recursive: true });
        assert.deepEqual(sweepProfiles(root), [`warm-${dead}`]);
        assert.equal(existsSync(gone), false);
        assert.equal(existsSync(mine), true);
        assert.equal(existsSync(other), true);
        assert.deepEqual(sweepProfiles(join(root, "missing")), []);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
