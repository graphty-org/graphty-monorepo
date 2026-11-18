// Tests of tools/workspace-sync.mjs on temporary git repositories: a clean merge of master lands even beside a dirty
// file it does not touch, a conflicting one lands nothing and leaves no merge in progress, and a tool copied out of the
// checkout still finds the main checkout's data.
//
//   node --test tools/workspace-sync.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { syncWorkspace } from "./workspace-sync.mjs";

const NOW = Date.parse("2026-11-17T21:00:00Z");
const git = (cwd, ...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
// test repositories only: no signing key, no global hooks
const local = (cwd) => {
    for (const [k, v] of [
        ["user.name", "t"],
        ["user.email", "t@example.com"],
        ["commit.gpgsign", "false"],
        ["core.hooksPath", "/dev/null"],
    ])
        git(cwd, "config", k, v);
};
const commit = (cwd, file, text, msg) => {
    writeFileSync(join(cwd, file), text);
    git(cwd, "add", file);
    git(cwd, "commit", "-q", "-m", msg);
};

// origin (bare) with master; a clone as the main checkout; a second clone that pushes master forward
function repos() {
    const base = mkdtempSync(join(tmpdir(), "ws-sync-"));
    const origin = join(base, "origin.git");
    git(base, "init", "-q", "--bare", "-b", "master", origin);
    const seed = join(base, "seed");
    git(base, "clone", "-q", origin, seed);
    local(seed);
    commit(seed, "a.txt", "a\n", "a");
    commit(seed, "b.txt", "b\n", "b");
    git(seed, "push", "-q", "origin", "HEAD:master");
    const main = join(base, "main");
    git(base, "clone", "-q", origin, main);
    local(main);
    return { seed, main };
}

describe("workspace-sync", () => {
    it("merges master beside a dirty file the merge does not touch and reports behind 0", () => {
        const { seed, main } = repos();
        commit(seed, "a.txt", "a2\n", "a2");
        git(seed, "push", "-q", "origin", "HEAD:master");
        writeFileSync(join(main, "b.txt"), "dirty\n");
        const r = syncWorkspace(main, { now: NOW });
        assert.equal(r.behind, 0, r.line);
        assert.equal(r.conflict, false);
        assert.equal(r.error, null);
        assert.equal(readFileSync(join(main, "a.txt"), "utf8"), "a2\n");
        assert.equal(readFileSync(join(main, "b.txt"), "utf8"), "dirty\n", "the dirty file is left alone");
        assert.equal(JSON.parse(readFileSync(join(main, "tmp", "workspace-sync.json"), "utf8")).behind, 0);
    });

    it("merges nothing on a conflict, leaves no MERGE_HEAD and reports conflict", () => {
        const { seed, main } = repos();
        commit(seed, "a.txt", "theirs\n", "theirs");
        git(seed, "push", "-q", "origin", "HEAD:master");
        commit(main, "a.txt", "ours\n", "ours");
        const head = git(main, "rev-parse", "HEAD");
        const r = syncWorkspace(main, { now: NOW });
        assert.equal(r.conflict, true, r.line);
        assert.equal(r.behind, 1);
        assert.equal(r.ahead, 1);
        assert.equal(git(main, "rev-parse", "HEAD"), head);
        assert.equal(existsSync(join(main, ".git", "MERGE_HEAD")), false);
        assert.match(r.line, /CONFLICTS with master/);
        const again = syncWorkspace(main, { now: NOW + 3_600_000 });
        assert.equal(again.behindSince, r.at, "the behind clock keeps its start");
    });

    it("never merges into a branch other than master", () => {
        const { seed, main } = repos();
        commit(seed, "a.txt", "a2\n", "a2");
        git(seed, "push", "-q", "origin", "HEAD:master");
        git(main, "checkout", "-q", "-b", "feature");
        const r = syncWorkspace(main, { now: NOW });
        assert.equal(r.behind, 1);
        assert.match(r.error, /on feature, not master/);
    });

    it("resolves the data directory of a copied tool to the main checkout's tmp/issue-round", () => {
        const { main } = repos();
        const tools = fileURLToPath(new URL(".", import.meta.url));
        const copy = join(main, "tmp", "issue-round", "ig-master", "tools");
        mkdirSync(copy, { recursive: true });
        for (const f of ["issue-queue.mjs", "test-slots.mjs", "wait-log.mjs"]) cpSync(join(tools, f), join(copy, f));
        const out = execFileSync(
            process.execPath,
            [
                "--input-type=module",
                "-e",
                `import { roundDir } from ${JSON.stringify(join(copy, "issue-queue.mjs"))}; console.log(roundDir());`,
            ],
            { encoding: "utf8" },
        ).trim();
        assert.equal(out, join(main, "tmp", "issue-round"));
    });
});
