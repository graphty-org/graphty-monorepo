// Tests of tools/live.sh: the registry, a merge that goes live and restarts the tool's servers, and
// the refusals that leave the live copy and its servers untouched (failed tests, a conflict, an
// uncommitted change). A throwaway origin and checkout, with a fake servherd that logs its calls.
//
//   node tools/live.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const dir = mkdtempSync(join(tmpdir(), "live-sh-"));
const main = join(dir, "main");
const live = join(main, ".worktrees/t-live");
const calls = join(dir, "calls");
const env = { ...isolatedGitEnv(), PATH: `${join(dir, "bin")}:${process.env.PATH}` };

const git = (cwd, ...args) => {
    const r = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
const liveSh = (...args) =>
    spawnSync("bash", [join(main, "tools/live.sh"), ...args], { cwd: main, env, encoding: "utf8" });
const restarts = () => (existsSync(calls) ? readFileSync(calls, "utf8") : "");
// A branch on origin, one commit off master writing `files`.
const branch = (name, files) => {
    git(main, "checkout", "-q", "-b", name, "origin/master");
    for (const [f, text] of Object.entries(files)) writeFileSync(join(main, f), text);
    git(main, "add", ".");
    git(main, "commit", "-q", "-m", name);
    git(main, "push", "-q", "origin", name);
    git(main, "checkout", "-q", "master");
};

before(() => {
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "bin/servherd"), `#!/bin/sh\necho "$*" >> ${calls}\n`, { mode: 0o755 });
    git(dir, "init", "-q", "--bare", "-b", "master", "origin.git");
    git(dir, "clone", "-q", join(dir, "origin.git"), "main");
    mkdirSync(join(main, "tools"));
    copyFileSync(new URL("./live.sh", import.meta.url), join(main, "tools/live.sh"));
    writeFileSync(
        join(main, "tools/live-tools.json"),
        JSON.stringify({
            t: { worktree: ".worktrees/t-live", servers: ["s1", "s2"], test: "! grep -q broken state.txt" },
        }),
    );
    writeFileSync(join(main, "state.txt"), "ok\n");
    writeFileSync(join(main, ".gitignore"), ".worktrees/\ntmp/\n");
    git(main, "add", ".");
    git(main, "commit", "-q", "-m", "base");
    git(main, "push", "-q", "origin", "master");
    git(main, "worktree", "add", "-q", "-b", "t-live", live, "master");
    // The live copy carries a local-only commit, as live copies do.
    writeFileSync(join(live, "local.txt"), "local\n");
    git(live, "add", ".");
    git(live, "commit", "-q", "-m", "local fix");
    branch("good", { "a.txt": "a\n" });
    branch("bad", { "state.txt": "broken\n" });
    branch("conflict", { "local.txt": "theirs\n" });
});
after(() => rmSync(dir, { recursive: true, force: true }));

describe("tools/live.sh", () => {
    it("lists the registry and refuses a tool it does not have", () => {
        const list = liveSh("--list");
        assert.equal(list.status, 0, list.stderr);
        assert.match(list.stdout, /^t\t\.worktrees\/t-live\ts1,s2$/m);
        const r = liveSh("nope", "good");
        assert.equal(r.status, 1);
        assert.match(r.stderr, /no valid entry "nope"/);
    });

    it("refuses failed tests: the live copy keeps its commit and no server restarts", () => {
        const head = git(live, "rev-parse", "HEAD");
        const r = liveSh("t", "bad");
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(r.stderr, /tests failed/);
        assert.equal(git(live, "rev-parse", "HEAD"), head);
        assert.equal(restarts(), "");
    });

    it("stops on a conflict, names the file and changes nothing", () => {
        const head = git(live, "rev-parse", "HEAD");
        const r = liveSh("t", "conflict");
        assert.equal(r.status, 2, r.stdout + r.stderr);
        assert.match(r.stderr, /^ {2}local\.txt$/m);
        assert.equal(git(live, "rev-parse", "HEAD"), head);
        assert.equal(git(live, "status", "--porcelain"), "");
        assert.equal(restarts(), "");
        assert.equal(git(main, "worktree", "list", "--porcelain").match(/^worktree /gm).length, 2, "scratch removed");
    });

    it("refuses a live copy with uncommitted changes", () => {
        writeFileSync(join(live, "state.txt"), "edited\n");
        try {
            const r = liveSh("t", "good");
            assert.equal(r.status, 1);
            assert.match(r.stderr, /uncommitted changes/);
        } finally {
            git(live, "checkout", "--", "state.txt");
        }
    });

    it("merges a passing branch into the live copy, keeps its local commits and restarts each server", () => {
        const r = liveSh("t", "good");
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.ok(existsSync(join(live, "a.txt")), "the branch is live");
        assert.ok(existsSync(join(live, "local.txt")), "the local commit is kept");
        assert.equal(git(live, "log", "-1", "--format=%s"), "Merge remote-tracking branch 'origin/good' into t-live");
        assert.equal(git(live, "rev-list", "--count", "--merges", "HEAD"), "1", "a merge, not a rebase");
        assert.equal(restarts(), "restart s1\nrestart s2\n");
        const again = liveSh("t", "good");
        assert.equal(again.status, 0);
        assert.match(again.stdout, /already has good/);
        assert.equal(restarts(), "restart s1\nrestart s2\n", "nothing restarts when nothing changed");
    });
});
