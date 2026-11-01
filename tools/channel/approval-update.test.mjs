// Tests of approval-update.mjs on scratch repositories: a held candidate approved, fixed forward and approved again.
// Run: node tools/channel/approval-update.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { isolatedGitEnv } from "../isolated-git-env.mjs";
import { approvalUpdate } from "./approval-update.mjs";
import { baselinesTreeCheck } from "./baselines-tree.mjs";

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/**
 * Master with a held candidate H0 whose first approval merged, a fix forward H on H0 (merged into master too), and
 * the owner's second approval of H on branch approve-2: H plus an accept commit and the signed approval file.
 * The fix renders b.png as before the first approval, so the second approval keeps b.png as H has it.
 * @returns the repository's helpers and commits
 */
function held() {
    const dir = mkdtempSync(join(tmpdir(), "approval-update-"));
    dirs.push(dir);
    const env = isolatedGitEnv();
    const run = (args, opts = {}) => {
        try {
            return execFileSync("git", args, {
                cwd: dir,
                env,
                encoding: "utf8",
                input: opts.input,
                stdio: [opts.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
            }).trim();
        } catch (error) {
            if (opts.allowExit1 && error.status === 1 && error.stdout) return error.stdout.trim();
            throw error;
        }
    };
    const git = (...args) => run(args);
    const commit = (files, message) => {
        for (const [f, text] of Object.entries(files)) {
            if (text === null) {
                git("rm", "-q", f);
                continue;
            }
            mkdirSync(dirname(join(dir, f)), { recursive: true });
            writeFileSync(join(dir, f), text);
        }
        git("add", "-A");
        git("commit", "-qm", message);
        return git("rev-parse", "HEAD");
    };
    const approve = (branch, from, files) => {
        git("checkout", "-q", "-b", branch, from);
        commit(files, `test(workspace): approve visual baselines at ${from.slice(0, 12)}`);
        const tree = git("rev-parse", "HEAD:visual-baselines");
        commit({ [`visual-review-approvals/${tree}.json`]: "{}" }, "test(workspace): sign it");
        return git("rev-parse", "HEAD");
    };
    const mergeInto = (target, branch) => {
        git("checkout", "-q", target);
        git("merge", "-q", "--no-ff", "-m", `merge ${branch}`, branch);
    };

    git("init", "-q", "-b", "master");
    commit({ "visual-baselines/a.png": "a1", "visual-baselines/b.png": "b1", "src.txt": "1" }, "start");
    const h0 = commit({ "src.txt": "2" }, "the held candidate");
    approve("approve-1", h0, {
        "visual-baselines/a.png": "a2",
        "visual-baselines/b.png": "b2",
        "visual-baselines/reviews/1.json": "r1",
    });
    git("checkout", "-q", "-b", "fix", h0);
    const h = commit({ "src.txt": "3" }, "the fix");
    mergeInto("master", "fix");
    mergeInto("master", "approve-1");
    const p = approve("approve-2", h, { "visual-baselines/a.png": "a2", "visual-baselines/reviews/2.json": "r2" });
    return { git, run, commit, mergeInto, h, p };
}

const update = (r, branch = "approve-2") => approvalUpdate(r.run, { master: "master", head: branch, branch });

describe("approvalUpdate", () => {
    it("merges master into a second approval of a fixed-forward hold, keeping its signed baselines tree", () => {
        const r = held();
        const out = update(r);
        assert.equal(out.ok, true, out.why);
        assert.equal(
            r.git("rev-parse", `${out.commit}:visual-baselines`),
            r.git("rev-parse", `${r.p}:visual-baselines`),
        );
        assert.equal(r.git("rev-parse", `${out.commit}^1`), r.p);
        assert.equal(r.git("rev-parse", `${out.commit}^2`), r.git("rev-parse", "master"));
        // master's other files and both approval files come along
        assert.equal(r.git("show", `${out.commit}:src.txt`), "3");
        assert.equal(
            r.git("ls-tree", "--name-only", `${out.commit}`, "visual-review-approvals/").split("\n").length,
            2,
        );
        // the pull request run's merge now leaves master with exactly the signed tree
        r.git("checkout", "-q", "--detach", "master");
        r.git("merge", "-q", "--no-ff", "-m", "pull request run", out.commit);
        const check = baselinesTreeCheck(r.git);
        assert.equal(check.ok, true, check.why);
    });

    it("has nothing to do when master's baselines have not moved", () => {
        const r = held();
        // measured against the candidate itself, whose baselines are the approval's merge base's
        const out = approvalUpdate(r.run, { master: r.h, head: "approve-2", branch: "approve-2" });
        assert.equal(out.ok, true, out.why);
        assert.equal(out.commit, null);
        assert.match(out.why, /nothing to do/);
    });

    it("refuses when master's baselines moved for another reason than an earlier approval of the hold", () => {
        const r = held();
        r.git("checkout", "-q", "master");
        r.commit({ "visual-baselines/d.png": "d1" }, "feat: a feature's new baseline");
        const out = update(r);
        assert.equal(out.ok, false);
        assert.equal(out.commit, null);
        assert.match(out.why, /not an approval of an earlier head/);
    });

    it("refuses a branch whose baselines tree carries no approval file", () => {
        const r = held();
        r.git("checkout", "-q", "approve-2");
        r.commit({ "visual-baselines/a.png": "a3" }, "an unsigned change");
        const out = update(r);
        assert.equal(out.ok, false);
        assert.match(out.why, /has not signed/);
    });

    it("refuses a branch with no accept commit", () => {
        const r = held();
        r.git("checkout", "-q", "-b", "feature", "master");
        r.commit({ "src.txt": "4" }, "feat: code");
        const out = update(r, "feature");
        assert.equal(out.ok, false);
        assert.match(out.why, /no accept commit/);
    });

    it("refuses a merge that conflicts outside the baselines", () => {
        const r = held();
        r.git("checkout", "-q", "approve-2");
        r.commit({ "src.txt": "branch" }, "test(workspace): a stray code change");
        r.git("checkout", "-q", "master");
        r.commit({ "src.txt": "master" }, "feat: code");
        const out = update(r);
        assert.equal(out.ok, false);
        assert.match(out.why, /conflicts outside visual-baselines\/: src\.txt/);
    });
});
