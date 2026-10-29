// Tests of the approval tree check (baselines-tree.mjs) on scratch repositories.
// Run: node tools/channel/baselines-tree.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { baselinesTreeCheck } from "./baselines-tree.mjs";

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/**
 * A scratch repository: master with one baseline, and helpers to commit and merge as a pull request run checks out.
 * @returns the repository's helpers
 */
function repo() {
    const dir = mkdtempSync(join(tmpdir(), "baselines-tree-"));
    dirs.push(dir);
    const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
    const git = (...args) =>
        execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], {
            cwd: dir,
            env,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
    const commit = (files, message) => {
        for (const [f, text] of Object.entries(files)) {
            mkdirSync(dirname(join(dir, f)), { recursive: true });
            writeFileSync(join(dir, f), text);
        }
        git("add", "-A");
        git("commit", "-qm", message);
        return git("rev-parse", "HEAD");
    };
    git("init", "-q", "-b", "master");
    commit({ "visual-baselines/a/s.png": "v1", "src.txt": "1" }, "start");
    const branch = (name, from = "master") => git("checkout", "-q", "-b", name, from);
    // the merge commit a pull request run checks out: HEAD^1 master, HEAD^2 the head
    const mergeRun = (head) => {
        git("checkout", "-q", "--detach", "master");
        git("merge", "-q", "--no-ff", "-m", "merge", head);
    };
    return { git, commit, branch, mergeRun };
}

describe("baselinesTreeCheck", () => {
    it("passes a commit that is not a merge", () => {
        const r = repo();
        assert.equal(baselinesTreeCheck(r.git).ok, true);
    });

    it("passes a pull request that does not change the baselines while master's did", () => {
        const r = repo();
        r.branch("feat");
        r.commit({ "src.txt": "2" }, "code");
        r.git("checkout", "-q", "master");
        r.commit({ "visual-baselines/a/s.png": "v2" }, "an approval merged");
        r.mergeRun("feat");
        const out = baselinesTreeCheck(r.git);
        assert.equal(out.ok, true, out.why);
        assert.match(out.why, /does not change/);
    });

    it("passes an approval whose baselines master has not changed since", () => {
        const r = repo();
        r.branch("visual/approve-rolling-x");
        r.commit({ "visual-baselines/a/s.png": "v2" }, "accept");
        r.git("checkout", "-q", "master");
        r.commit({ "src.txt": "2" }, "a code merge");
        r.mergeRun("visual/approve-rolling-x");
        const out = baselinesTreeCheck(r.git);
        assert.equal(out.ok, true, out.why);
    });

    it("fails an approval whose merge would leave master with a baselines tree the head does not carry", () => {
        const r = repo();
        r.branch("visual/approve-rolling-x");
        r.commit({ "visual-baselines/a/s.png": "v2" }, "accept");
        r.git("checkout", "-q", "master");
        r.commit({ "visual-baselines/b/t.png": "w2" }, "another approval merged");
        r.mergeRun("visual/approve-rolling-x");
        const out = baselinesTreeCheck(r.git);
        assert.equal(out.ok, false);
        assert.match(out.why, /cli\.mjs update <pr>/);
    });
});
