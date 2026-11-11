// Tests for tools/check-saved-format-allowlist.mjs on a real temporary repository.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { problems, REVOKED, SHIPPED } from "./check-saved-format-allowlist.mjs";
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
