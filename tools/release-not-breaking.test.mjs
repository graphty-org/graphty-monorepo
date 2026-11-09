// Tests of tools/release-not-breaking.mjs: the shape of release-not-breaking.json and reading it from a ref.
//
//   node --test tools/release-not-breaking.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { problems, ruledNotBreaking } from "./release-not-breaking.mjs";

const SHA = "b".repeat(40);
const entry = (over) => ({
    commit: SHA,
    project: "graphty-element",
    reason: "owner: experimental",
    since: "2026-11-09",
    ...over,
});

describe("problems", () => {
    it("accepts the empty list and a complete entry", () => {
        assert.deepEqual(problems({ notBreaking: [] }), []);
        assert.deepEqual(problems({ notBreaking: [entry()] }), []);
    });

    it("rejects a file without a list, and every incomplete field", () => {
        assert.equal(problems({}).length, 1);
        assert.equal(problems(null).length, 1);
        assert.deepEqual(
            problems({ notBreaking: [entry({ commit: "805bb30", project: "", reason: " ", since: "today" })] }),
            [
                "notBreaking[0].commit: must be a full 40-character commit id",
                "notBreaking[0].project: must be an nx project name",
                "notBreaking[0].reason: must be the owner's ruling and why",
                "notBreaking[0].since: must be a YYYY-MM-DD date",
            ],
        );
    });
});

describe("ruledNotBreaking", () => {
    it("reads the list at a ref, and none from a ref without the file", () => {
        const dir = mkdtempSync(join(tmpdir(), "not-breaking-"));
        const env = isolatedGitEnv();
        const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" }).trim();
        try {
            git("init", "-q", "-b", "master");
            writeFileSync(join(dir, "a.txt"), "a\n");
            git("add", ".");
            git("commit", "-q", "--no-gpg-sign", "-m", "chore: start");
            assert.deepEqual([...ruledNotBreaking("master", dir)], []);
            writeFileSync(join(dir, "release-not-breaking.json"), JSON.stringify({ notBreaking: [entry()] }));
            git("add", ".");
            git("commit", "-q", "--no-gpg-sign", "-m", "chore: rule");
            assert.deepEqual([...ruledNotBreaking("master", dir)], [SHA]);
            assert.deepEqual([...ruledNotBreaking("master~1", dir)], []);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
