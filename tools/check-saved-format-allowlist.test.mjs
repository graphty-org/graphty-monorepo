// Tests for tools/check-saved-format-allowlist.mjs on a real temporary repository.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { LIBRARY, LISTS, problems, REVOKED, SHIPPED } from "./check-saved-format-allowlist.mjs";
import { isolateGit } from "./isolated-git-env.mjs";

// the code under test runs git itself, so the whole process gets the isolated config
isolateGit();

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repo() {
    const dir = mkdtempSync(join(tmpdir(), "saved-format-allowlist-"));
    dirs.push(dir);
    const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "master");
    git("config", "user.name", "t");
    git("config", "user.email", "t@example.com");
    git("config", "commit.gpgsign", "false");
    const commit = (msg, files) => {
        for (const [f, text] of Object.entries(files)) {
            mkdirSync(dirname(join(dir, f)), { recursive: true });
            writeFileSync(join(dir, f), text);
        }
        git("add", "-A");
        git("commit", "-q", "-m", msg);
        return git("rev-parse", "HEAD");
    };
    commit("init", { [SHIPPED]: '["a"]\n', [REVOKED]: "[]\n" });
    return { dir, git, commit };
}

describe("shipped shader hashes", () => {
    it("refuses dropping a shipped hash without revoking it", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("fix: drop a", { [SHIPPED]: "[]\n" });
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /removes the shipped shader hash a/);
    });

    it("lets a branch drop a hash it added itself, which never shipped", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("feat: add b", { [SHIPPED]: '["a","b"]\n' });
        r.commit("fix: drop b", { [SHIPPED]: '["a"]\n' });
        assert.deepEqual(problems({ cwd: r.dir, base: "master" }), []);
        r.commit("fix: drop a", { [SHIPPED]: "[]\n" });
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /removes the shipped shader hash a/);
    });

    it("lets an exact revert of a master merge drop the hashes that merge added, and only those", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "preset");
        r.commit("feat: a preset", { [SHIPPED]: '["a","b"]\n' });
        r.git("switch", "-q", "master");
        r.git("merge", "-q", "--no-ff", "--no-edit", "preset");
        const merge = r.git("rev-parse", "HEAD");
        r.git("switch", "-q", "-c", "revert");
        r.git("revert", "--no-edit", "-m", "1", merge);
        assert.deepEqual(problems({ cwd: r.dir, base: "master" }), []);
        r.commit("fix: drop a too", { [SHIPPED]: "[]\n" });
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /removes the shipped shader hash a/);
    });
});

describe("the first lists", () => {
    const one = JSON.stringify({ exceptions: [{ kind: "palette", finding: "f", paths: [], catalogs: [], issue: 1 }] });
    const two = JSON.stringify({
        exceptions: [
            { kind: "palette", finding: "f", paths: [], catalogs: [], issue: 1 },
            { kind: "shape", finding: "g", paths: [], catalogs: [], issue: 2 },
        ],
    });

    it("lets the branch that first adds the lists start with exceptions", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("feat: the checks", { [LISTS]: `${one}\n` });
        assert.deepEqual(problems({ cwd: r.dir, base: "master" }), []);
    });

    it("needs the trailer once the lists are in the base", () => {
        const r = repo();
        r.commit("feat: the checks", { [LISTS]: `${one}\n` });
        r.git("switch", "-q", "-c", "b");
        r.commit("fix: another", { [LISTS]: `${two}\n` });
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /needs the owner/);
    });
});

describe("approval from a later commit", () => {
    // a branch whose first commit changes the shader-library snapshot, which needs the owner
    function branch() {
        const r = repo();
        r.commit("feat: the checks", { [LISTS]: "{}\n", [LIBRARY]: "[1]\n" });
        r.git("switch", "-q", "-c", "b");
        const sha = r.commit("fix: change the library", { [LIBRARY]: "[2]\n" });
        const approve = (value) =>
            r.git(
                "commit",
                "-q",
                "--allow-empty",
                "-m",
                "chore: approve",
                "-m",
                `Saved-Format-Exception-Approved: ${value}`,
            );
        return { ...r, sha, approve };
    }

    it("needs the owner without one", () => {
        const r = branch();
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /change the library: changes the shader-library/);
    });

    it("accepts a later commit naming it with a reason", () => {
        const r = branch();
        r.approve(`for ${r.sha.slice(0, 10)}: the outlines are gone`);
        assert.deepEqual(problems({ cwd: r.dir, base: "master" }), []);
    });

    it("refuses one naming a different commit", () => {
        const r = branch();
        const other = r.commit("fix: unrelated", { "x.txt": "x\n" });
        r.approve(`for ${other.slice(0, 10)}: the outlines are gone`);
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /needs the owner/);
    });

    it("refuses one with no reason", () => {
        const r = branch();
        r.approve(`for ${r.sha}`);
        assert.match(problems({ cwd: r.dir, base: "master" }).join(), /needs the owner/);
    });
});
